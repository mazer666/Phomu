/** Pack-aware Timeline: place a sleeve, lock the answer, then reveal the card. */
'use client';

import { GameAction } from '../GameAction';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoundQuestion, SongIdentity } from '@/core/types';
import { applyCheat, dropTimelineYear, submit } from '@/core/session-service';
import { useGameStore } from '@/stores/game-store';
import { useOrientation } from '@/hooks/useOrientation';
import { Icon } from '@/components/art/Icon';
import { MusicPlayer } from '../MusicPlayer';
import { TimelineHeader } from './TimelineHeader';
import { TimelineSlots, type TimelineAxis } from './TimelineSlots';
import {
  DECADE_HINT_FALLBACK_KEY,
  decadeOf,
  pickDecadeHintKey,
} from './timeline-hints';
import {
  TIMELINE_CHEAT_PENALTIES,
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
  onReroll?: () => void;
}

type RemovalState = 'none' | 'choosing' | 'done';

export function TimelineMode({
  question,
  onAnswer,
  onReveal,
  onReroll,
}: TimelineModeProps) {
  const { t, i18n } = useTranslation();
  const {
    timelineYears,
    addTimelineYear,
    removeTimelineYear,
    config,
    awardPoints,
    turnOrder,
    currentTurnIndex,
  } = useGameStore();

  const currentPlayerId = turnOrder[currentTurnIndex];

  // WHY the orientation: the portrait is a phone that is held upright, and
  // the years are read from top to bottom there. The landscape is a tablet
  // on the table — and a timeline that runs from left to right is the
  // picture everybody expects.
  const { isLandscape } = useOrientation();
  const axis: TimelineAxis = isLandscape ? 'horizontal' : 'vertical';

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

  // WHY the shell does not know the valid slots: they depend on the year of
  // the song, and the year of the song is the answer of the mode. The core
  // judges the placement and answers with the verdict — the shell learns
  // whether its placement was right, not which slots were right (C-1).

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
  // WHY the flag: a round can be revealed without an answer — the round
  // timed out, or the table skipped it. Then there is nothing to judge, and
  // the slot must not show a wrong placement and the year 0.
  const [hasAnswer, setHasAnswer] = useState(false);
  const [removalState, setRemovalState] = useState<RemovalState>('none');
  const [cheatActive, setCheatActive] = useState(false);
  const [cheatHint, setCheatHint] = useState<string>('');
  const [jokerUsed, setJokerUsed] = useState(false);
  const [jokerSlot, setJokerSlot] = useState<number | null>(null);

  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  const numSlots = timelineSlotCount(question.context.timelineYears.length);

  // After a correct answer: add the year + removal logic if applicable
  const handleReveal = useCallback(async () => {
    if (selectedSlot === null || isRevealed || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitFailed(false);
    try {
      const answeredInSeconds = timelineAnswerSeconds(
        Date.now() - questionStartedAt.current
      );

      // The core evaluates the answer: the year of the song is the answer of
      // the mode, and only the core knows it.
      const result = await submit(
        { kind: 'timeline', slot: selectedSlot },
        answeredInSeconds
      );
      setIsRevealed(true);
      const detail = result.feedback.detail;
      setHasAnswer(true);
      setIsCorrect(result.score.isCorrect);
      setIdentity(result.feedback.identity);
      setCorrectSlot(detail.slot ?? null);

      // Timeline: points based on complexity (cheats/joker were already deducted)
      onAnswer(
        result.score.isCorrect,
        result.score.pointsAwarded,
        answeredInSeconds
      );

      // The base decides what happens with the timeline; the pure layer turns
      // its decision into the steps the shell carries out.
      const outcome = resolveTimelineOutcome(result.score.isCorrect, detail);

      // WHY the year is added in every case: the core adds the year of a
      // correct answer to its timeline — the shell adds it to its own, so
      // that both timelines carry the same years. A timeline that differs
      // makes the core refuse the next answer.
      if (outcome.kind !== 'wrong' && outcome.kind !== 'no-year') {
        addTimelineYear(outcome.year);
      }
      if (outcome.kind === 'duplicate') {
        // Duplicate → remove it right away, no intervention needed
        // WHY no message to the core: the core removed the duplicate itself.
        removeTimelineYear(outcome.year);
      }
      if (outcome.kind === 'removal-offered') {
        // More than 10 years → the player may optionally remove one
        setRemovalState('choosing');
      }
    } catch {
      setSubmitFailed(true);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }, [selectedSlot, isRevealed, addTimelineYear, removeTimelineYear, onAnswer]);

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
    awardPoints(
      currentPlayerId,
      TIMELINE_CHEAT_PENALTIES['timeline-decade-hint']
    );
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
      if (
        isRevealed ||
        submitting.current ||
        (e.target instanceof HTMLElement &&
          e.target.closest('input,textarea,select,button'))
      )
        return;
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)
      )
        e.preventDefault();
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
    <div
      className={[
        'timeline-mode',
        // WHY the width: the landscape has the whole width of the phase
        // column for the timeline — a timeline that runs from left to right
        // needs it. The portrait keeps the narrow column of the phone.
        isLandscape ? 'is-landscape' : 'is-portrait',
      ].join(' ')}
    >
      {/* Musik Player */}
      {question.media.youtube && (
        <div className="timeline-media">
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
            // WHY the height: the landscape has half the height of the
            // portrait, and the player takes a sixteenth of the width — the
            // timeline would be pushed out of the screen.
            // WHY the height: the landscape has half the height of the
            // portrait, and the player takes a sixteenth of the width — the
            // timeline would be pushed out of the screen.
            className="timeline-player"
          />
        </div>
      )}

      {/* Header */}
      <div className="timeline-heading">
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
      </div>

      {/* Timeline */}
      <div className="timeline-board-area">
        <TimelineSlots
          timelineYears={question.context.timelineYears}
          selectedSlot={selectedSlot}
          jokerSlot={jokerSlot}
          correctSlot={correctSlot}
          isAnswerCorrect={isCorrect}
          isRevealed={isRevealed}
          hasAnswer={hasAnswer}
          identity={identity}
          axis={axis}
          onSelect={handleDrop}
        />
      </div>

      {/* Footer */}
      <footer className="timeline-action">
        {/* Optional: remove a year after a correct guess */}
        {removalState === 'choosing' && (
          <details className="timeline-removal">
            <summary>{t('modes.timeline.removePrompt')}</summary>
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
          </details>
        )}

        {removalState === 'done' && (
          <div className="shrink-0 bg-green-500/10 border border-green-500/30 rounded-2xl p-2 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-green-400">
              {t('modes.timeline.removed')}
            </p>
          </div>
        )}

        {submitFailed && (
          <p role="alert" className="text-sm">
            {t('game.error.revealFailed')}
          </p>
        )}
        <div className="timeline-action-row">
          <GameAction
            phase="question"
            compactLabel={
              isRevealed
                ? t('game.page.continueButton')
                : t('game.page.revealButton')
            }
          >
            <button
              disabled={isSubmitting || (!isRevealed && selectedSlot === null)}
              onClick={canProceed ? onReveal : handleReveal}
              className="phomu-primary-action"
            >
              {isRevealed ? t('modes.continue') : t('modes.timeline.reveal')}
            </button>
          </GameAction>
          {onReroll && (
            <button
              type="button"
              className="timeline-reroll"
              onClick={onReroll}
              title={t('game.question.reroll')}
              aria-label={t('game.question.reroll')}
            >
              <Icon name="dice" size={24} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );

  function handleDrop(slotIndex: number) {
    if (isRevealed || submitting.current) return;
    setSelectedSlot(slotIndex);
  }
}
