/**
 * The preview of the session in the lobby.
 *
 * WHAT: the summary of the choices of the lobby — the players, the modes,
 * the packs and the condition that ends the game.
 *
 * WHY the preview exists: the wizard of the lobby asks one question after
 * the other. In the landscape the second half of the screen would stay
 * empty, and the players would not see what their choices add up to until
 * the game has started.
 *
 * WHY the preview is a component of its own: the lobby page is a known
 * legacy file above the soft limit of the file size gate. The preview is a
 * view of its own and lives next to the other components of the lobby.
 */
'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameMode } from '@/config/game-config';
import { PHOMU_CONFIG } from '@/config/game-config';
import type { GameEndingCondition } from '@/types/game-state';
import { LOBBY_MODES } from './lobby-options';

// ─── Props ────────────────────────────────────────────────────────

interface LobbyPreviewProps {
  /** The number of the players. */
  playerCount: number;
  /** The chosen modes. */
  selectedModes: GameMode[];
  /** The chosen packs. */
  selectedPacks: string[];
  /** The condition that ends the game. */
  endingCondition: GameEndingCondition;
  /** The points that end the game. */
  targetPoints: number;
  /** The rounds that end the game. */
  targetRounds: number;
  /** The minutes that end the game. */
  targetTimeMinutes: number;
}

// ─── Komponente ───────────────────────────────────────────────────

export function LobbyPreview({
  playerCount,
  selectedModes,
  selectedPacks,
  endingCondition,
  targetPoints,
  targetRounds,
  targetTimeMinutes,
}: LobbyPreviewProps) {
  const { t } = useTranslation();

  // The names of the chosen modes — the same table the selector draws.
  const chosenModes = useMemo(
    () => LOBBY_MODES.filter((entry) => selectedModes.includes(entry.id)),
    [selectedModes]
  );

  // The names of the chosen packs — the packs carry their own name.
  const packNames = useMemo(
    () =>
      selectedPacks.map(
        (id) =>
          PHOMU_CONFIG.SONG_PACKS.find((pack) => pack.id === id)?.name ?? id
      ),
    [selectedPacks]
  );

  // The condition that ends the game, in words.
  const endingLabel = useMemo(() => {
    if (endingCondition === 'points') {
      return t('lobby.step4.pointsValue', { count: targetPoints });
    }
    if (endingCondition === 'rounds') {
      return t('lobby.step4.roundsValue', { count: targetRounds });
    }
    return targetTimeMinutes % 60 === 0
      ? t('lobby.step4.hoursValue', { count: targetTimeMinutes / 60 })
      : t('lobby.step4.minutesValue', { count: targetTimeMinutes });
  }, [endingCondition, targetPoints, targetRounds, targetTimeMinutes, t]);

  return (
    <div
      className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/40 p-5 space-y-5"
      data-testid="lobby-preview"
    >
      <h2 className="text-sm font-black uppercase tracking-widest opacity-60">
        {t('lobby.preview.title')}
      </h2>

      <dl className="space-y-4">
        {/* The players */}
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest opacity-40">
            {t('lobby.preview.playersLabel')}
          </dt>
          <dd className="text-lg font-black mt-0.5">
            {t('lobby.preview.playerCount', { count: playerCount })}
          </dd>
        </div>

        {/* The modes */}
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest opacity-40">
            {t('lobby.preview.modesLabel')}
          </dt>
          <dd className="mt-1 space-y-0.5">
            {chosenModes.length === 0 ? (
              <span className="text-sm opacity-50">
                {t('lobby.preview.noneSelected')}
              </span>
            ) : (
              chosenModes.map((entry) => (
                <p key={entry.id} className="text-sm font-bold">
                  {t(entry.titleKey)}
                </p>
              ))
            )}
          </dd>
        </div>

        {/* The packs */}
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest opacity-40">
            {t('lobby.preview.packsLabel')}
          </dt>
          <dd className="mt-1 space-y-0.5">
            {packNames.length === 0 ? (
              <span className="text-sm opacity-50">
                {t('lobby.preview.noneSelected')}
              </span>
            ) : (
              packNames.map((name) => (
                <p key={name} className="text-sm font-bold">
                  {name}
                </p>
              ))
            )}
          </dd>
        </div>

        {/* The condition that ends the game */}
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest opacity-40">
            {t('lobby.preview.endingLabel')}
          </dt>
          <dd className="text-lg font-black mt-0.5">{endingLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
