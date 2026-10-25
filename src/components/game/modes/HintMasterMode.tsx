/**
 * Hint-Master mode (refined phase 5)
 *
 * Shows up to 5 hints.
 * From hint 2 on, the music plays automatically (blurred).
 * No typing needed any more — the player clicks "solution" and decides.
 *
 * All visible texts come from `src/i18n/locales/parts/modes.{de,en}.json`.
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import { getSpicyColor } from '@/utils/feedback-messages';
import type { RoundQuestion, SongIdentity } from '@/core/types';
import { disclose, submit } from '@/core/session-service';
import { PHOMU_CONFIG } from '@/config/game-config';
import { MusicPlayer } from '../MusicPlayer';
import { useSpicyMessage } from '../useSpicyMessage';
import {
  CHEAT_PENALTY_HINT_MASTER_MUSIC,
  hintMasterPoints,
} from '@/utils/mode-rules';

interface HintMasterModeProps {
  question: RoundQuestion;
  onAnswer: (
    isCorrect: boolean,
    pointsAwarded: number,
    answeredInSeconds?: number
  ) => void;
}

export function HintMasterMode({ question, onAnswer }: HintMasterModeProps) {
  const { t, i18n } = useTranslation();
  const { config, awardPoints, turnOrder, currentTurnIndex } = useGameStore();
  const [shownHints, setShownHints] = useState(1);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [done, setDone] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [knewWhat, setKnewWhat] = useState<
    'both' | 'artist' | 'title' | 'none' | null
  >(null);
  const [cheatUsed, setCheatUsed] = useState(false);
  const [identity, setIdentity] = useState<SongIdentity | null>(null);

  const currentPlayerId = turnOrder[currentTurnIndex];
  const maxHints = question.hints.length;
  const points = hintMasterPoints(shownHints);
  const startSecs = question.media.startSeconds;
  const spicyMessage = useSpicyMessage(wasCorrect!, question.songId);

  // Number format of the active locale
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  const handleNextHint = useCallback(() => {
    if (shownHints < maxHints) {
      setShownHints((n) => n + 1);
      // From hint 2 on, the music plays automatically (blurred until the reveal)
      if (shownHints + 1 >= 2) setShowMusic(true);
    }
  }, [shownHints, maxHints]);

  const handleFinalDecision = async (knew: 'both' | 'artist' | 'title' | 'none') => {
    if (done) return;
    // The core evaluates the answer: the shell does not know the points of
    // the mode and does not have to keep the rules a second time.
    const result = await submit({ kind: 'hint-master', level: shownHints, knew });
    setWasCorrect(result.score.isCorrect);
    setKnewWhat(knew);
    setDone(true);
    onAnswer(result.score.isCorrect, result.score.pointsAwarded);
  };

  // The pilot may show the solution: the base releases the identity of the
  // song on an explicit command — the question never carries it.
  const handleShowSolution = async () => {
    setIdentity(await disclose());
    setIsRevealed(true);
  };

  const handleCheat = () => {
    if (showMusic || cheatUsed || isRevealed || !currentPlayerId) return;
    setShowMusic(true);
    setCheatUsed(true);
    // Immediate deduction of 2 points for the music cheat
    awardPoints(currentPlayerId, CHEAT_PENALTY_HINT_MASTER_MUSIC);
  };

  return (
    <div className="flex flex-col px-6 gap-6 pt-4 max-w-lg mx-auto min-h-[50vh]">
      {/* Task display */}
      {!isRevealed && !done && (
        <div className="text-center py-3 px-4 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 mb-1">
            {t('modes.hint-master.searchLabel')}
          </p>
          <p className="text-base font-black uppercase tracking-wide">
            {t('modes.hint-master.searchTarget')}
          </p>
        </div>
      )}

      {/* Header info */}
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <p className="text-[10px] font-black uppercase opacity-40">
            {t('modes.hint-master.levelLabel')}
          </p>
          <p className="text-xl font-black">
            {numberFormat.format(shownHints)}{' '}
            <span className="text-xs opacity-30">
              / {numberFormat.format(maxHints)}
            </span>
          </p>
        </div>
        <div className="text-right relative">
          <p className="text-[10px] font-black uppercase opacity-40">
            {t('modes.hint-master.pointsLabel')}
          </p>
          <p className="text-xl font-black text-[var(--color-accent)]">
            +{numberFormat.format(points)}
          </p>
          {cheatUsed && (
            <span
              className="absolute -top-1 -right-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-black shadow-lg pointer-events-none"
              style={{
                backgroundColor: '#ef4444',
                transform: 'rotate(-5deg)',
                boxShadow: '0 2px 10px rgba(239,68,68,0.7)',
              }}
            >
              {t('modes.hint-master.cheatBadge')}
            </span>
          )}
        </div>
      </div>

      {/* Music hint (triggered at 4 or 5 or upon manual reveal) */}
      <AnimatePresence>
        {(showMusic || isRevealed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div
              className={`p-4 border rounded-2xl space-y-3 transition-colors ${isRevealed ? 'bg-green-500/10 border-green-500/20' : 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{isRevealed ? '🎵' : '🔊'}</span>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${isRevealed ? 'text-green-500' : 'text-[var(--color-accent)]'}`}
                >
                  {isRevealed
                    ? t('modes.hint-master.officialSolution')
                    : t('modes.hint-master.audioHintActive')}
                </p>
              </div>
              <MusicPlayer
                key={`${shownHints}-${isRevealed}`}
                songId={question.songId}
                songPack={question.context.pack ?? undefined}
                youtubeLink={question.media.youtube}
                youtubeAlternatives={question.media.youtubeAlternatives}
                spotifyLink={question.media.spotify ?? undefined}
                spotifyFreePreview={question.media.spotifyFreePreview ?? undefined}
                amazonMusicLink={question.media.amazonMusic ?? undefined}
                amazonPrimePreview={question.media.amazonPrimePreview ?? undefined}
                startSeconds={startSecs}
                endSeconds={
                  isRevealed || shownHints === 5
                    ? startSecs + 180
                    : startSecs + 30
                }
                blurred={!isRevealed}
              />
              {!isRevealed && (
                <p className="text-[9px] opacity-50 italic text-center">
                  {shownHints === 5
                    ? t('modes.hint-master.levelFiveAudio')
                    : t('modes.hint-master.previewInfo')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint list */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {question.hints.slice(0, shownHints).map((hint, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl text-sm leading-relaxed border transition-all ${i === shownHints - 1 ? 'border-[var(--color-accent)] bg-white/5' : 'border-white/5 opacity-40'}`}
            >
              <span className="font-black opacity-20 mr-3 text-xs">
                0{i + 1}
              </span>
              {hint}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Navigation & actions */}
      <div className="mt-auto space-y-4 pb-10">
        {!isRevealed && (
          <div className="grid grid-cols-1 gap-3">
            {shownHints < maxHints && (
              <button
                onClick={handleNextHint}
                className="w-full py-4 rounded-2xl border-2 border-white/10 font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all outline-none"
              >
                {t('modes.hint-master.nextHint', {
                  points: numberFormat.format(
                    PHOMU_CONFIG.HINT_MASTER_POINTS[shownHints] ?? 1
                  ),
                })}
              </button>
            )}

            {/* Music cheat button (only at level 1, before the music starts automatically) */}
            {!showMusic && shownHints === 1 && !config.noCheatMode && (
              <button
                onClick={handleCheat}
                className="w-full py-2 rounded-xl border border-red-500/10 text-[9px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 hover:bg-red-500/5 text-red-500 transition-all mb-1"
              >
                {t('modes.hint-master.musicCheat')}
              </button>
            )}

            <button
              onClick={handleShowSolution}
              className="w-full py-5 rounded-3xl bg-[var(--color-accent)] font-black text-lg shadow-xl shadow-[var(--color-accent)]/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {t('modes.hint-master.showSolution')}
            </button>
          </div>
        )}

        {isRevealed && !done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6"
          >
            <div>
              <p className="text-[10px] font-black uppercase opacity-40 mb-2">
                {t('modes.hint-master.theAnswerWas')}
              </p>
              <h3 className="text-2xl font-black">{identity?.title}</h3>
              <p className="text-sm opacity-60">{identity?.artist}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold italic opacity-60">
                {t('modes.hint-master.whatDidYouKnow')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleFinalDecision('both')}
                  className="py-4 px-3 bg-green-500 rounded-2xl font-black text-white text-xs shadow-lg shadow-green-500/20 active:scale-95 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-lg">✅</span>
                  <span>{t('modes.hint-master.knewBoth')}</span>
                  <span className="text-[10px] opacity-70">
                    {t('modes.hint-master.pointsShort', {
                      points: numberFormat.format(points),
                    })}
                  </span>
                </button>
                <button
                  onClick={() => handleFinalDecision('artist')}
                  className="py-4 px-3 bg-yellow-500/80 rounded-2xl font-black text-white text-xs shadow-lg shadow-yellow-500/20 active:scale-95 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-lg">👤</span>
                  <span>{t('modes.hint-master.knewArtist')}</span>
                  <span className="text-[10px] opacity-70">
                    {t('modes.hint-master.pointsShort', {
                      points: numberFormat.format(Math.ceil(points / 2)),
                    })}
                  </span>
                </button>
                <button
                  onClick={() => handleFinalDecision('title')}
                  className="py-4 px-3 bg-yellow-500/80 rounded-2xl font-black text-white text-xs shadow-lg shadow-yellow-500/20 active:scale-95 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-lg">🎵</span>
                  <span>{t('modes.hint-master.knewTitle')}</span>
                  <span className="text-[10px] opacity-70">
                    {t('modes.hint-master.pointsShort', {
                      points: numberFormat.format(Math.ceil(points / 2)),
                    })}
                  </span>
                </button>
                <button
                  onClick={() => handleFinalDecision('none')}
                  className="py-4 px-3 bg-red-500 rounded-2xl font-black text-white text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-lg">❌</span>
                  <span>{t('modes.hint-master.knewNothing')}</span>
                  <span className="text-[10px] opacity-70">
                    {t('modes.hint-master.zeroPoints')}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={[
              'text-center p-5 rounded-3xl border space-y-2',
              wasCorrect
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/10',
            ].join(' ')}
          >
            <p
              className="text-lg font-black uppercase italic tracking-tighter"
              style={{ color: getSpicyColor(wasCorrect!, question.songId) }}
            >
              {spicyMessage}
            </p>
            <p className="text-xs font-bold opacity-60">
              {knewWhat === 'both'
                ? t('modes.hint-master.resultBoth')
                : knewWhat === 'artist'
                  ? t('modes.hint-master.resultArtist')
                  : knewWhat === 'title'
                    ? t('modes.hint-master.resultTitle')
                    : t('modes.hint-master.resultNothing')}
            </p>
            <p className="text-sm opacity-60">
              {identity?.title} &middot; {identity?.artist}
            </p>
            {knewWhat !== 'none' && (
              <p className="text-xs font-black text-[var(--color-accent)]">
                {t('modes.hint-master.pointsAwarded', {
                  points: numberFormat.format(
                    knewWhat === 'both' ? points : Math.ceil(points / 2)
                  ),
                })}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
