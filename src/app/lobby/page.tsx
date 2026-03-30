/**
 * Lobby-Seite
 *
 * Hier werden Spieler hinzugefügt, der Spielmodus konfiguriert und
 * das Spiel gestartet. Alle Einstellungen landen im Zustand-Store
 * und werden in localStorage persistiert.
 */
'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import { PlayerCard } from '@/components/lobby/PlayerCard';
import { ModeSelector } from '@/components/lobby/ModeSelector';
import { PHOMU_CONFIG } from '@/config/game-config';
import type { Difficulty } from '@/config/game-config';
import type { TeamMode } from '@/types/player';

// ─── Konstanten ───────────────────────────────────────────────────

/** Emoji-Auswahl für Spieler-Avatare */
const EMOJI_AVATARS = [
  '🎵', '🎸', '🥁', '🎹', '🎺', '🎻', '🎤', '🎧',
  '🦁', '🐯', '🦊', '🐺', '🦝', '🐸', '🐧', '🦄',
  '🌟', '🔥', '⚡', '🌈', '💎', '🍕', '🚀', '👾',
] as const;

/** Farb-Palette für Spieler */
const PLAYER_COLORS = [
  '#FF6B35', '#FFD166', '#06D6A0', '#118AB2', '#EF476F',
  '#A8DADC', '#F4A261', '#E9C46A', '#2A9D8F', '#E76F51',
  '#9B5DE5', '#F15BB5', '#00BBF9', '#00F5D4', '#FEE440',
] as const;

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty | 'all'; label: string }> = [
  { value: 'all',    label: 'Alle' },
  { value: 'easy',   label: 'Leicht' },
  { value: 'medium', label: 'Mittel' },
  { value: 'hard',   label: 'Schwer' },
];

const TIME_LIMIT_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'Kein Limit' },
  { value: 30,   label: '30 Sek.' },
  { value: 60,   label: '60 Sek.' },
  { value: 90,   label: '90 Sek.' },
  { value: 120,  label: '2 Min.' },
];

const TEAM_MODE_OPTIONS: Array<{ value: TeamMode; label: string; description: string }> = [
  { value: 'individual', label: 'Individual',    description: 'Jeder spielt für sich allein' },
  { value: 'fixed',      label: 'Feste Teams',   description: 'Teams bleiben die gesamte Partie' },
  { value: 'shifting',   label: 'Wechselteams',  description: 'Teams werden jede Runde neu gemischt' },
];

// ─── Hilfsfunktion ────────────────────────────────────────────────

/** Gibt den nächsten Index in einem Array zurück (zirkulär) */
function nextIndex<T>(arr: readonly T[], current: T): T {
  const idx = arr.indexOf(current);
  return arr[(idx + 1) % arr.length] ?? arr[0] ?? current;
}

// ─── Lobby-Seite ──────────────────────────────────────────────────

export default function LobbyPage() {
  const router = useRouter();
  const { players, config, addPlayer, removePlayer, setConfig, initSession, startGame } =
    useGameStore();

  // Lokaler State für das "Spieler hinzufügen"-Formular
  const [nameInput, setNameInput]         = useState('');
  const [nameError, setNameError]         = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(EMOJI_AVATARS[0]);
  const [selectedColor, setSelectedColor]   = useState<string>(PLAYER_COLORS[0]);

  // ─── Spieler hinzufügen ────────────────────────────────────────

  const handleAddPlayer = useCallback(() => {
    const name = nameInput.trim();
    if (!name) {
      setNameError('Bitte einen Namen eingeben.');
      return;
    }
    if (players.length >= PHOMU_CONFIG.MAX_PLAYERS) {
      setNameError(`Maximal ${PHOMU_CONFIG.MAX_PLAYERS} Spieler erlaubt.`);
      return;
    }

    addPlayer(name, selectedAvatar, selectedColor);
    setNameInput('');
    setNameError('');
    // Automatisch nächste Farbe und Avatar vorschlagen
    setSelectedColor(nextIndex(PLAYER_COLORS, selectedColor));
    setSelectedAvatar(nextIndex(EMOJI_AVATARS, selectedAvatar));
  }, [nameInput, players.length, selectedAvatar, selectedColor, addPlayer]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleAddPlayer();
    },
    [handleAddPlayer]
  );

  // ─── Spiel starten ─────────────────────────────────────────────

  const handleStartGame = useCallback(() => {
    if (players.length < PHOMU_CONFIG.MIN_PLAYERS) return;
    startGame();
    router.push('/game');
  }, [players.length, startGame, router]);

  const canStart = players.length >= PHOMU_CONFIG.MIN_PLAYERS;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto pb-24">

      {/* Seitenkopf */}
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-1">🎮 Lobby</h1>
        <p className="opacity-60">Konfiguriere dein Phomu-Spiel und füge Spieler hinzu.</p>
      </div>

      {/* ── 1. Spieler hinzufügen ──────────────────────────────── */}
      <Section title="Spieler hinzufügen">

        {/* Avatar-Auswahl */}
        <p className="text-xs opacity-50 mb-2 uppercase tracking-wider">Avatar</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EMOJI_AVATARS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setSelectedAvatar(emoji)}
              className={[
                'text-xl w-9 h-9 rounded-lg transition-all',
                selectedAvatar === emoji
                  ? 'ring-2 ring-[var(--color-accent)] bg-[var(--color-accent)]/20 scale-110'
                  : 'bg-white/10 hover:bg-white/20',
              ].join(' ')}
              aria-label={`Avatar ${emoji}`}
              aria-pressed={selectedAvatar === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Farb-Auswahl */}
        <p className="text-xs opacity-50 mb-2 uppercase tracking-wider">Farbe</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PLAYER_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={[
                'w-7 h-7 rounded-full transition-all',
                selectedColor === color
                  ? 'ring-2 ring-white scale-125'
                  : 'opacity-60 hover:opacity-100 hover:scale-110',
              ].join(' ')}
              style={{ backgroundColor: color }}
              aria-label={`Farbe auswählen`}
              aria-pressed={selectedColor === color}
            />
          ))}
        </div>

        {/* Namenseingabe */}
        <div className="flex gap-2">
          <input
            value={nameInput}
            onChange={(e) => { setNameInput(e.target.value); setNameError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="Spielername eingeben …"
            maxLength={20}
            className="flex-1 bg-white/10 border border-[var(--color-border)]
                       rounded-xl px-4 py-2.5 focus:outline-none
                       focus:border-[var(--color-accent)] transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddPlayer}
            disabled={players.length >= PHOMU_CONFIG.MAX_PLAYERS}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-accent)] font-bold
                       disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            + Hinzufügen
          </motion.button>
        </div>
        {nameError && (
          <p className="text-[var(--color-error)] text-sm mt-2">{nameError}</p>
        )}
      </Section>

      {/* ── 2. Spielerliste ────────────────────────────────────── */}
      {players.length > 0 && (
        <Section title={`Spieler (${players.length} / ${PHOMU_CONFIG.MAX_PLAYERS})`}>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  avatar={player.avatar}
                  color={player.color}
                  isPilot={player.isPilot}
                  onRemove={() => removePlayer(player.id)}
                />
              ))}
            </div>
          </AnimatePresence>
        </Section>
      )}

      {/* ── 3. Spielmodi ───────────────────────────────────────── */}
      <Section title="Spielmodi">
        <p className="text-sm opacity-60 mb-3">
          Wähle einen oder mehrere Modi — das Spiel wechselt zufällig zwischen
          den aktiven Modi.
        </p>
        <ModeSelector
          selectedModes={config.selectedModes}
          onChange={(modes) => setConfig({ selectedModes: modes })}
        />
      </Section>

      {/* ── 4. Pack & Einstellungen ────────────────────────────── */}
      <Section title="Pack & Einstellungen">

        {/* Song-Pack */}
        <label className="block text-sm font-semibold opacity-80 mb-1">
          Song-Pack
        </label>
        <select
          value={config.selectedPacks[0]}
          onChange={(e) => setConfig({ selectedPacks: [e.target.value] })}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)]
                     rounded-xl px-4 py-2.5 mb-5 focus:outline-none
                     focus:border-[var(--color-accent)] transition-colors"
        >
          {PHOMU_CONFIG.SONG_PACKS.map((pack) => (
            <option key={pack} value={pack}>{pack}</option>
          ))}
        </select>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Schwierigkeit */}
          <div>
            <label className="block text-sm font-semibold opacity-80 mb-1">
              Schwierigkeit
            </label>
            <select
              value={config.difficulty}
              onChange={(e) =>
                setConfig({ difficulty: e.target.value as Difficulty | 'all' })
              }
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)]
                         rounded-xl px-3 py-2.5 focus:outline-none
                         focus:border-[var(--color-accent)] transition-colors"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Gewinnscore */}
          <div>
            <label className="block text-sm font-semibold opacity-80 mb-1">
              Gewinnscore: <span className="text-[var(--color-accent)]">{config.winCondition}</span>
            </label>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={config.winCondition}
              onChange={(e) => setConfig({ winCondition: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)] mt-2"
            />
            <div className="flex justify-between text-xs opacity-40 mt-1">
              <span>3</span><span>30</span>
            </div>
          </div>

          {/* Zeitlimit */}
          <div>
            <label className="block text-sm font-semibold opacity-80 mb-1">
              Zeitlimit pro Runde
            </label>
            <select
              value={config.timeLimitSeconds ?? ''}
              onChange={(e) =>
                setConfig({
                  timeLimitSeconds: e.target.value !== '' ? Number(e.target.value) : null,
                })
              }
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)]
                         rounded-xl px-3 py-2.5 focus:outline-none
                         focus:border-[var(--color-accent)] transition-colors"
            >
              {TIME_LIMIT_OPTIONS.map((opt) => (
                <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </Section>

      {/* ── 5. Team-Modus ──────────────────────────────────────── */}
      <Section title="Team-Modus">
        <div className="flex flex-col sm:flex-row gap-3">
          {TEAM_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConfig({ teamMode: opt.value })}
              className={[
                'flex-1 p-3.5 rounded-xl border-2 text-left transition-colors',
                config.teamMode === opt.value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)]/50 hover:border-white/40',
              ].join(' ')}
              aria-pressed={config.teamMode === opt.value}
            >
              <p className="font-bold text-sm">{opt.label}</p>
              <p className="text-xs opacity-60 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Start-Button ───────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 mt-8">
        {!canStart && (
          <p className="text-sm opacity-50">
            Mindestens {PHOMU_CONFIG.MIN_PLAYERS} Spieler erforderlich
          </p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStartGame}
          disabled={!canStart}
          className="w-full max-w-sm py-4 rounded-2xl text-xl font-black
                     bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]
                     disabled:opacity-40 transition-colors shadow-lg"
        >
          🚀 Spiel starten!
        </motion.button>

        <button
          onClick={() => initSession()}
          className="text-sm opacity-40 hover:opacity-70 transition-opacity"
        >
          Lobby zurücksetzen
        </button>
      </div>

    </main>
  );
}

// ─── Hilfskomponente: Abschnitt ───────────────────────────────────

/** Visueller Abschnitt mit Titel-Akzentlinie */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span
          className="w-1 h-5 rounded-full shrink-0"
          style={{ backgroundColor: 'var(--color-accent)' }}
          aria-hidden
        />
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}
