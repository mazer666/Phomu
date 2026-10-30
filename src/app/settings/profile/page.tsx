'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import { PlayerSticker, PLAYER_STICKER_KINDS } from '@/components/art/PlayerSticker';
import { Icon } from '@/components/art/Icon';

/**
 * The stickers the players choose from.
 *
 * WHY the kinds: the kind is stored with the player, and the picture is
 * drawn from the kind and the colour of the player.
 */
const EMOJI_AVATARS = PLAYER_STICKER_KINDS;
const PLAYER_COLORS = [
  '#FF6B35',
  '#FFD166',
  '#06D6A0',
  '#118AB2',
  '#EF476F',
  '#9B5DE5',
  '#00BBF9',
  '#FF9F1C',
  '#2EC4B6',
];

export default function SettingsProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { players, updatePlayer, currentRound } = useGameStore();
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const gameIsActive = currentRound > 0;

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <Header
        title={`${t('settings.profile.title')}`}
        onBack={() => router.push('/settings')}
        gameIsActive={gameIsActive}
        onBackToGame={() => router.push('/game')}
      />

      {players.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="opacity-60">{t('settings.profile.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-4 border-black/20"
                  style={{ backgroundColor: player.color }}
                >
                  <PlayerSticker kind={player.avatar} color={player.color} size={28} />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) =>
                      updatePlayer(player.id, { name: e.target.value })
                    }
                    className="bg-transparent border-none p-0 text-xl font-black w-full focus:ring-0"
                  />
                </div>
                <button
                  onClick={() =>
                    setEditingPlayerId((prev) =>
                      prev === player.id ? null : player.id
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-white/10 text-xs font-black"
                >
                  {editingPlayerId === player.id
                    ? t('settings.profile.done')
                    : t('settings.profile.edit')}
                </button>
              </div>

              {editingPlayerId === player.id && (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-50 mb-2">
                      {t('settings.profile.avatarLabel')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EMOJI_AVATARS.map((kind) => (
                        <button
                          key={kind}
                          onClick={() =>
                            updatePlayer(player.id, { avatar: kind })
                          }
                          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                          aria-label={kind}
                        >
                          <PlayerSticker
                            kind={kind}
                            color={player.color}
                            size={28}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-50 mb-2">
                      {t('settings.profile.colorLabel')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLAYER_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updatePlayer(player.id, { color })}
                          className={`w-8 h-8 rounded-lg border-2 border-black/20 ${player.color === color ? 'ring-2 ring-white' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Header({
  title,
  onBack,
  gameIsActive,
  onBackToGame,
}: {
  title: string;
  onBack: () => void;
  gameIsActive?: boolean;
  onBackToGame?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <header className="rounded-3xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-black">{title}</h1>
      <div className="flex gap-2">
        {gameIsActive && onBackToGame && (
          <button
            onClick={onBackToGame}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-black"
          >
            {t('settings.toGame')}
          </button>
        )}
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-white/15 text-white text-sm font-black hover:bg-white/5"
        >
          {t('settings.backToOverview')}
        </button>
      </div>
    </header>
  );
}
