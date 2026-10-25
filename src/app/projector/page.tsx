/**
 * Projector mode — /projector
 *
 * Spoiler-free projector view for large screens.
 * Shows: current mode, player scoreboard, active player, timer.
 * No artist, no title, no album art — nothing that gives the question away.
 *
 * Open this tab on the projector while the game runs on the phone.
 * Both read from the same state (localStorage via Zustand persist).
 *
 * All visible texts come from
 * `src/i18n/locales/parts/projector.{de,en}.json` and `modes.{de,en}.json`.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useGameStore } from '@/stores/game-store';

/** Emoji and colour per mode — pure design, no text. */
const MODE_META: Record<string, { emoji: string; color: string }> = {
  timeline: { emoji: '📅', color: '#22d3ee' },
  'hint-master': { emoji: '🕵️', color: '#c4b5fd' },
  lyrics: { emoji: '📝', color: '#fb923c' },
  'vibe-check': { emoji: '😎', color: '#34d399' },
  survivor: { emoji: '💀', color: '#f87171' },
  'cover-confusion': { emoji: '🎭', color: '#e879f9' },
};

const FALLBACK_META = { emoji: '🎵', color: '#fff' };

/** Name and short description of the active mode (static, spoiler-free). */
function getModeTexts(
  mode: string,
  t: TFunction
): { name: string; description: string } {
  switch (mode) {
    case 'timeline':
      return {
        name: t('modes.timeline.name'),
        description: t('modes.timeline.description'),
      };
    case 'hint-master':
      return {
        name: t('modes.hint-master.name'),
        description: t('modes.hint-master.description'),
      };
    case 'lyrics':
      return {
        name: t('modes.lyrics.name'),
        description: t('modes.lyrics.description'),
      };
    case 'vibe-check':
      return {
        name: t('modes.vibe-check.name'),
        description: t('modes.vibe-check.description'),
      };
    case 'survivor':
      return {
        name: t('modes.survivor.name'),
        description: t('modes.survivor.description'),
      };
    case 'cover-confusion':
      return {
        name: t('modes.cover-confusion.name'),
        description: t('modes.cover-confusion.description'),
      };
    default:
      return { name: mode, description: '' };
  }
}

/** Label of the current round phase. */
function getPhaseLabel(phase: string, t: TFunction): string {
  switch (phase) {
    case 'drawing':
      return t('projector.phase.drawing');
    case 'question':
      return t('projector.phase.question');
    case 'locked-in':
      return t('projector.phase.lockedIn');
    case 'reveal':
      return t('projector.phase.reveal');
    case 'scoring':
      return t('projector.phase.scoring');
    case 'gameover':
      return t('projector.phase.gameover');
    default:
      return phase;
  }
}

export default function ProjectorPage() {
  const { t, i18n } = useTranslation();
  const {
    players,
    teams,
    currentMode,
    currentRound,
    config,
    roundPhase,
    turnOrder,
    currentTurnIndex,
  } = useGameStore();

  const [tick, setTick] = useState(0);

  // Number format of the active locale
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  // Re-render every 2 seconds so that score changes from the phone arrive
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const modeMeta = MODE_META[currentMode] ?? FALLBACK_META;
  const modeTexts = getModeTexts(currentMode, t);

  const isTeamMode = teams.length > 0;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  const activePilot = players.find((p) => p.id === turnOrder[currentTurnIndex]);

  if (currentRound === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-8 p-12">
        <p className="text-[80px]">🕹️</p>
        <h1 className="text-4xl font-black uppercase tracking-widest opacity-60">
          {t('projector.noGameActive')}
        </h1>
        <p className="text-xl opacity-30 font-bold">
          {t('projector.noGameHint')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-black text-white overflow-hidden"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-12 py-6 border-b border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <span className="text-3xl font-black tracking-tighter opacity-60">
            PHOMU
          </span>
          <span className="text-xs font-black uppercase tracking-[0.3em] opacity-20 border border-white/10 px-2 py-1 rounded-lg">
            {t('projector.badge')}
          </span>
        </div>

        {/* Mode badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMode}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl border"
            style={{
              borderColor: `${modeMeta.color}40`,
              background: `${modeMeta.color}10`,
            }}
          >
            <span className="text-3xl">{modeMeta.emoji}</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                {t('projector.modeLabel')}
              </p>
              <p
                className="text-xl font-black"
                style={{ color: modeMeta.color }}
              >
                {modeTexts.name}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Round + phase */}
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">
            {t('projector.roundLabel')}
          </p>
          <p className="text-3xl font-black tabular-nums">
            {numberFormat.format(currentRound)}
            {config.endingCondition === 'rounds' && (
              <span className="text-lg opacity-30">
                {' '}
                / {numberFormat.format(config.targetRounds)}
              </span>
            )}
          </p>
          <p className="text-xs font-bold opacity-30 uppercase tracking-widest mt-0.5">
            {getPhaseLabel(roundPhase, t)}
          </p>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex gap-0">
        {/* Scoreboard */}
        <section className="flex-1 px-12 py-10 flex flex-col gap-4">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">
            {isTeamMode
              ? t('projector.teamScoreboard')
              : t('projector.playerScoreboard')}
          </p>

          {isTeamMode ? (
            <div className="space-y-3">
              {sortedTeams.map((team, rank) => (
                <motion.div
                  key={team.id}
                  layout
                  className="flex items-center gap-6 p-5 rounded-2xl"
                  style={{
                    background:
                      rank === 0 ? `${team.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${rank === 0 ? `${team.color}50` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="text-2xl font-black opacity-20 w-8 text-right tabular-nums">
                    {numberFormat.format(rank + 1)}
                  </span>
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="flex-1 text-2xl font-black">
                    {team.name}
                  </span>
                  <motion.span
                    key={team.score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-black tabular-nums"
                    style={{ color: rank === 0 ? team.color : 'white' }}
                  >
                    {numberFormat.format(team.score)}
                  </motion.span>
                  <span className="text-sm opacity-30 font-black">
                    {t('projector.pointsShort')}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlayers.map((player, rank) => (
                <motion.div
                  key={player.id}
                  layout
                  className="flex items-center gap-6 p-5 rounded-2xl"
                  style={{
                    background:
                      rank === 0
                        ? `${player.color}18`
                        : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${rank === 0 ? `${player.color}50` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span className="text-2xl font-black opacity-20 w-8 text-right tabular-nums">
                    {numberFormat.format(rank + 1)}
                  </span>
                  <span className="text-3xl">{player.avatar ?? '🎵'}</span>
                  <span
                    className="flex-1 text-2xl font-black truncate"
                    style={{ color: player.color }}
                  >
                    {player.name}
                  </span>
                  <motion.span
                    key={player.score}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="text-4xl font-black tabular-nums"
                    style={{ color: rank === 0 ? player.color : 'white' }}
                  >
                    {numberFormat.format(player.score)}
                  </motion.span>
                  <span className="text-sm opacity-30 font-black">
                    {t('projector.pointsShort')}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="w-px bg-white/5 my-8" />

        {/* Right panel: active player + spoiler-free mode info */}
        <section className="w-80 px-8 py-10 flex flex-col gap-8">
          {/* Active player / pioneer */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">
              {t('projector.currentPioneer')}
            </p>
            {activePilot ? (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                  style={{
                    backgroundColor: activePilot.color,
                    boxShadow: `0 0 20px ${activePilot.color}40`,
                  }}
                >
                  {activePilot.avatar ?? '👤'}
                </div>
                <div>
                  <p
                    className="font-black text-lg"
                    style={{ color: activePilot.color }}
                  >
                    {activePilot.name}
                  </p>
                  <p className="text-sm opacity-40 font-bold">
                    {numberFormat.format(activePilot.score)}{' '}
                    {t('projector.points')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="opacity-20 font-bold">—</p>
            )}
          </div>

          {/* Spoiler-free placeholder during the question */}
          {roundPhase === 'question' && (
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-3xl border p-8 text-center gap-4"
              style={{
                borderColor: `${modeMeta.color}30`,
                background: `${modeMeta.color}08`,
              }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: 'easeInOut',
                }}
                className="text-6xl"
              >
                {modeMeta.emoji}
              </motion.div>
              <p
                className="font-black text-lg uppercase tracking-widest"
                style={{ color: modeMeta.color }}
              >
                {modeTexts.name}
              </p>
              <p className="text-sm opacity-40 font-bold">
                {t('projector.questionRunning')}
              </p>
              {modeTexts.description && (
                <p className="text-xs opacity-40 font-bold leading-relaxed max-w-[16rem]">
                  {modeTexts.description}
                </p>
              )}
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: modeMeta.color }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      delay: i * 0.4,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Win-condition progress */}
          {config.endingCondition === 'points' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">
                {t('projector.goalLabel')}
              </p>
              <p className="font-black text-2xl">
                {numberFormat.format(config.targetPoints)}{' '}
                <span className="text-sm opacity-40">
                  {t('projector.points')}
                </span>
              </p>
              {/* Progress bar: leading player */}
              {sortedPlayers[0] && (
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: sortedPlayers[0].color }}
                    animate={{
                      width: `${Math.min(100, (sortedPlayers[0].score / config.targetPoints) * 100)}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="px-12 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
          {t('projector.footer')}
        </p>
        <p className="text-[10px] opacity-10 tabular-nums">
          {t('projector.syncCounter', { tick: numberFormat.format(tick) })}
        </p>
      </footer>
    </div>
  );
}
