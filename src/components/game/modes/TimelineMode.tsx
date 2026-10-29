/**
 * Timeline mode — shared, growing timeline
 *
 * Starts with 3 random years.
 * Correctly guessed → the year of the song is added.
 * From 10 years on: the player may remove one.
 *   - a duplicate arises → it is removed automatically
 *   - no duplicate → the player chooses
 *
 * All visible texts come from `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoundQuestion, SongIdentity } from '@/core/types';
import { applyCheat, dropTimelineYear, submit } from '@/core/session-service';
import { useGameStore } from '@/stores/game-store';
import { MusicPlayer } from '../MusicPlayer';
import { TimelineHeader } from './TimelineHeader';
import { TimelineSlots } from './TimelineSlots';
import {
  DECADE_HINT_FALLBACK_KEY,
  decadeOf,
  pickDecadeHintKey,
} from './timeline-hints';
import {
  TIMELINE_CHEAT_PENALTIES,
  describeTimelineSlot,
  isTimelineSlotCorrect,
  nextTimelineSlot,
  resolveTimelineOutcome,
  slotFromNumberKey,
  timelineAnswerSeconds,
  timelinePointBudget,
  timelineSlotCount,
} from './timeline-logic';

interface TimelineModeProps {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
  onReveal?: () => void;
}

type RemovalState = 'none' | 'choosing' | 'done';

export function TimelineMode({ question, onAnswer, onReveal }: TimelineModeProps) {
  const { t, i18n } = useTranslation();
  const {
    timelineYears,
    initTimeline,
    addTimelineYear,
    removeTimelineYear,
    config,
    awardPoints,
    turnOrder,
    currentTurnIndex,
  } = useGameStore();

  const currentPlayerId = turnOrder[currentTurnIndex];

  // Number formats of the active locale (years without a thousands separator)
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );
  const yearFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language, { useGrouping: false }),
    [i18n.language]
  );

  // WHY the timeline is not started here: the core owns the rule of the
  // timeline, and it builds the slots and the possible points of the round
  // from the timeline it knows. The years therefore have to reach the core
  // before the card is drawn — the hook of the core session does that
  // (`src/hooks/useCoreSession.ts`).

  // The slots come from the core: they depend on the year of the song, and
  // the year is the answer of the mode.
  const validSlotSet = useMemo(
    () => new Set(question.context.timelineSlots),
    [question.context.timelineSlots]
  );

  // The base owns the award; the shell shows the budget of the round.
  const points = timelinePointBudget(question.pointsPossible);

  const questionStartedAt = useRef<number>(Date.now());

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [question.songId]);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [identity, setIdentity] = useState<SongIdentity | null>(null);
  const [correctSlot, setCorrectSlot] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [removalState, setRemovalState] = useState<RemovalState>('none');
  const [cheatActive, setCheatActive] = useState(false);
  const [cheatHint, setCheatHint] = useState<string>('');
  const [jokerUsed, setJokerUsed] = useState(false);
  const [jokerSlot, setJokerSlot] = useState<number | null>(null);

  const numSlots = timelineSlotCount(timelineYears.length);

  // After a correct answer: add the year + removal logic if applicable
  const handleReveal = useCallback(async () => {
    if (selectedSlot === null || isRevealed) return;
    setIsRevealed(true);
    const answeredInSeconds = timelineAnswerSeconds(
      Date.now() - questionStartedAt.current
    );

    // The core evaluates the answer: the year of the song is the answer of
    // the mode, and only the core knows it.
    const result = await submit(
      { kind: 'timeline', slot: selectedSlot },
      answeredInSeconds
    );
    const detail = result.feedback.detail;
    setIsCorrect(result.score.isCorrect);
    setIdentity(result.feedback.identity);
    setCorrectSlot(detail.slot ?? null);

    // Timeline: points based on complexity (cheats/joker were already deducted)
    onAnswer(result.score.isCorrect, result.score.pointsAwarded, answeredInSeconds);

    // The base decides what happens with the timeline; the pure layer turns
    // its decision into the steps the shell carries out.
    const outcome = resolveTimelineOutcome(result.score.isCorrect, detail);

    if (outcome.kind === 'add-year' || outcome.kind === 'duplicate') {
      addTimelineYear(outcome.year);
    }
    if (outcome.kind === 'duplicate') {
      // Duplicate → remove it right away, no intervention needed
      removeTimelineYear(outcome.year);
    }
    if (outcome.kind === 'removal-offered') {
      // More than 10 years → the player may optionally remove one
      setRemovalState('choosing');
    }
  }, [
    selectedSlot,
    isRevealed,
    timelineYears,
    addTimelineYear,
    removeTimelineYear,
    onAnswer,
  ]);

  async function handleRemoveYear(year: number) {
    // WHY the core comes first: the core owns the timeline — it evaluates
    // the next answer against it. If it refuses the removal, the shell
    // keeps the year; otherwise the two timelines would drift apart.
    try {
      await dropTimelineYear(year);
    } catch (failure) {
      console.error('the year could not be removed from the timeline', failure);
      return;
    }
    removeTimelineYear(year);
    setRemovalState('done');
  }

  async function handleCheat() {
    if (cheatActive || isRevealed || !currentPlayerId) return;
    setCheatActive(true);
    // The base computes the decade: the year of the song is the answer of
    // the mode.
    const outcome = await applyCheat('timeline-decade-hint');
    if (outcome.decadeHint === null) {
      setCheatHint('');
    } else {
      const key = pickDecadeHintKey(outcome.decadeHint);
      setCheatHint(
        key === DECADE_HINT_FALLBACK_KEY
          ? t(key, { decade: decadeOf(outcome.decadeHint) })
          : t(key)
      );
    }
    // Immediate deduction of 2 points for the decade hint
    awardPoints(currentPlayerId, TIMELINE_CHEAT_PENALTIES['timeline-decade-hint']);
  }

  async function handleJoker() {
    if (jokerUsed || isRevealed || !currentPlayerId) return;
    // The base draws the slot: it knows which slots are correct.
    const outcome = await applyCheat('timeline-joker');
    const pick = outcome.jokerSlot;
    if (pick === null) return;
    setJokerSlot(pick);
    setJokerUsed(true);
    // Immediate deduction of 1 point for the joker
    awardPoints(currentPlayerId, TIMELINE_CHEAT_PENALTIES['timeline-joker']);
    // Clear selection if the joker removed the selected slot
    if (selectedSlot === pick) setSelectedSlot(null);
  }

  const canProceed = isRevealed;

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isRevealed) return;
      const slot = slotFromNumberKey(e.key, numSlots);
      if (slot !== null) setSelectedSlot(slot);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')
        setSelectedSlot((p) => nextTimelineSlot(p, numSlots, 'up'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight')
        setSelectedSlot((p) => nextTimelineSlot(p, numSlots, 'down'));
      if ((e.key === 'Enter' || e.key === ' ') && selectedSlot !== null)
        handleReveal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSlot, isRevealed, numSlots, handleReveal]);

  return (
    <div className="flex flex-col px-4 py-6 gap-5 max-w-xl mx-auto pb-44">
      {/* Modus-Banner */}
      <div className="w-full flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-4 py-2.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
          {t('modes.timeline.banner')}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400/60">
          {t('modes.timeline.stats', {
            count: timelineYears.length,
            points: numberFormat.format(points),
          })}
        </span>
      </div>

      {/* Musik Player */}
      {question.media.youtube && (
        <MusicPlayer
          songId={question.songId}
          songPack={question.context.pack ?? undefined}
          youtubeLink={question.media.youtube}
          youtubeAlternatives={question.media.youtubeAlternatives}
          spotifyLink={question.media.spotify ?? undefined}
          spotifyFreePreview={question.media.spotifyFreePreview ?? undefined}
          amazonMusicLink={question.media.amazonMusic ?? undefined}
          amazonPrimePreview={question.media.amazonPrimePreview ?? undefined}
          blurred={!isRevealed}
        />
      )}

      {/* Header */}
      <TimelineHeader
        isRevealed={isRevealed}
        isCorrect={isCorrect}
        songId={question.songId}
        cheatActive={cheatActive}
        cheatHint={cheatHint}
        jokerUsed={jokerUsed}
        numSlots={numSlots}
        noCheatMode={config.noCheatMode}
        points={points}
        onCheat={handleCheat}
        onJoker={handleJoker}
      />

      {/* Optional: remove a year after a correct guess */}
      {removalState === 'choosing' && (
        <div className="bg-[var(--color-bg-card)] border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-center opacity-60">
            {t('modes.timeline.removePrompt')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {timelineYears.map((year: number, i: number) => (
              <button
                key={`${year}-${i}`}
                onClick={() => handleRemoveYear(year)}
                className="px-4 py-2 rounded-xl border border-white/20 font-black text-sm hover:bg-red-500/20 hover:border-red-500/50 transition-all active:scale-95"
              >
                {yearFormat.format(year)}
              </button>
            ))}
          </div>
        </div>
      )}

      {removalState === 'done' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-green-400">
            {t('modes.timeline.removed')}
          </p>
        </div>
      )}

      {/* Timeline */}
      <TimelineSlots
        timelineYears={timelineYears}
        selectedSlot={selectedSlot}
        jokerSlot={jokerSlot}
        correctSlot={correctSlot}
        validSlotSet={validSlotSet}
        isRevealed={isRevealed}
        identity={identity}
        onSelect={handleDrop}
      />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-8 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent z-[60]">
        <div className="max-w-md mx-auto">
          <button
            disabled={selectedSlot === null}
            onClick={canProceed ? onReveal : handleReveal}
            className={[
              'w-full py-5 rounded-3xl font-black text-lg transition-all shadow-2xl',
              selectedSlot !== null
                ? 'bg-[var(--color-accent)] text-white scale-[1.02] shadow-[0_10px_40px_-10px_rgba(var(--color-accent-rgb),0.5)]'
                : 'bg-white/5 opacity-20 text-white/40 cursor-not-allowed',
            ].join(' ')}
          >
            {isRevealed ? t('modes.continue') : t('modes.timeline.reveal')}
          </button>
        </div>
      </footer>
    </div>
  );

  function handleDrop(slotIndex: number) {
    if (isRevealed) return;
    setSelectedSlot(slotIndex);
  }
}
