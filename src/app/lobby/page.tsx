/**
 * Lobby-Seite (Wizard-Edition)
 * 
 * Ein schrittweiser Prozess (1-4) für optimale Mobile-Nutzung.
 * 1. Spieler | 2. Modi | 3. Packs | 4. Einstellungen
 */
'use client';

import { useState, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import { PlayerCard } from '@/components/lobby/PlayerCard';
import { ModeSelector } from '@/components/lobby/ModeSelector';
import { PackSelector } from '@/components/lobby/PackSelector';
import { QRScannerModal } from '@/components/game/QRScannerModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { PHOMU_CONFIG } from '@/config/game-config';
import { AVAILABLE_PACKS } from '@/data/packs';
import type { Difficulty } from '@/config/game-config';
import type { TeamMode } from '@/types/player';

// ─── Konstanten ───────────────────────────────────────────────────

const EMOJI_AVATARS = ['🎵', '🎸', '🥁', '🎹', '🎺', '🎻', '🎤', '🎧', '🦁', '🐯', '🦊', '🦄', '👾', '🚀'];
const PLAYER_COLORS = ['#FF6B35', '#FFD166', '#06D6A0', '#118AB2', '#EF476F', '#9B5DE5', '#00BBF9'];

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
  { value: 120,  label: '2 Min.' },
];

const TEAM_MODE_OPTIONS: Array<{ value: TeamMode; label: string; description: string }> = [
  { value: 'individual', label: 'Jeder für sich',    description: 'Klassisch' },
  { value: 'fixed',      label: 'Teams',            description: 'Fest' },
  { value: 'shifting',   label: 'Mix-Teams',         description: 'Rotiert' },
];

// ─── Lobby-Seite ──────────────────────────────────────────────────

export default function LobbyPage() {
  const router = useRouter();
  const { players, config, addPlayer, removePlayer, setConfig, initSession, startGame } = useGameStore();

  const [step, setStep] = useState(1);
  const [nameInput, setNameInput] = useState(`Spieler ${players.length + 1}`);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Update name input when players list changes (if not modified by user)
  useEffect(() => {
    if (nameInput.startsWith('Spieler ') || nameInput === '') {
      setNameInput(`Spieler ${players.length + 1}`);
    }
  }, [players.length]);

  // ─── Hilfsfunktionen ────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (step === 1) return players.length >= PHOMU_CONFIG.MIN_PLAYERS;
    if (step === 2) return config.selectedModes.length > 0;
    if (step === 3) return config.selectedPacks.length > 0;
    return true;
  }, [step, players.length, config]);

  const handleAddPlayer = useCallback(() => {
    if (!nameInput.trim()) return;
    if (players.length >= PHOMU_CONFIG.MAX_PLAYERS) return;

    // Auto-assign color and avatar based on current player count
    const avatar = EMOJI_AVATARS[players.length % EMOJI_AVATARS.length];
    const color = PLAYER_COLORS[players.length % PLAYER_COLORS.length];

    addPlayer(nameInput.trim(), avatar, color);
    // The useEffect will handle the next 'Spieler X' pre-fill
  }, [nameInput, players.length, addPlayer]);

  const handleStart = useCallback(() => {
    startGame();
    router.push('/game');
  }, [startGame, router]);

  // Framer Motion Animation Variants
  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  // ─── Render Schritte ───────────────────────────────────────────

  return (
    <main className="flex flex-col max-w-2xl mx-auto px-4 md:px-8" style={{ height: '100dvh' }}>

      {/* Header mit Progress */}
      <div className="pt-4 md:pt-8 pb-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">🕹️ Lobby</h1>
          <span className="text-sm font-bold opacity-30">Schritt {step} von 4</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[var(--color-accent)]"
            animate={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Wizard Content Area — scrollable */}
      <div className="flex-1 overflow-y-auto pb-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial="enter"
            animate="center"
            exit="exit"
            variants={variants}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-2">Wer spielt mit?</h2>
                  <p className="text-sm opacity-60">Füge mindestens einen Spieler hinzu.</p>
                </div>
                
                  <div className="flex gap-2">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                      placeholder="Name eingeben..."
                      className="flex-1 bg-white/10 border border-[var(--color-border)] rounded-2xl px-4 py-4 focus:outline-none focus:border-[var(--color-accent)] font-bold text-sm"
                    />
                    <Tooltip content="Spieler hinzufügen" position="top">
                      <button 
                        onClick={handleAddPlayer}
                        className="px-6 py-4 rounded-2xl bg-[var(--color-accent)] font-black shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
                      >
                        +
                      </button>
                    </Tooltip>
                    <Tooltip content="Phomu-Karte scannen" position="top">
                      <button 
                        onClick={() => setIsScannerOpen(true)}
                        className="px-5 py-4 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xl hover:bg-white/20 transition-all active:scale-95"
                      >
                        📸
                      </button>
                    </Tooltip>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {players.map((p) => (
                    <PlayerCard 
                      key={p.id} 
                      name={p.name} 
                      avatar={p.avatar} 
                      color={p.color} 
                      isPilot={p.isPilot}
                      onRemove={() => removePlayer(p.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-2">Wie wird gespielt?</h2>
                  <p className="text-sm opacity-60">Wähle die Spielmodi, die vorkommen sollen.</p>
                </div>
                <ModeSelector 
                  selectedModes={config.selectedModes}
                  onChange={(modes) => setConfig({ selectedModes: modes })}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-2">Was hören wir?</h2>
                  <p className="text-sm opacity-60">Wähle eines oder mehrere Song-Packs aus.</p>
                </div>
                <PackSelector 
                  selectedPacks={config.selectedPacks}
                  onChange={(packs) => setConfig({ selectedPacks: packs })}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-2">Feinschiff</h2>
                  <p className="text-sm opacity-60">Letzte Einstellungen vor dem Start.</p>
                </div>

                <div className="grid gap-6">
                  {/* Win Score */}
                  <div className="bg-[var(--color-bg-card)]/50 p-4 rounded-2xl border border-[var(--color-border)]">
                    <label className="text-sm font-bold opacity-60 block mb-2 uppercase tracking-wide">
                      Zielpunkte: <span className="text-[var(--color-accent)] text-lg">{config.winCondition}</span>
                    </label>
                    <input 
                      type="range" min={5} max={25} step={1}
                      value={config.winCondition}
                      onChange={(e) => setConfig({ winCondition: Number(e.target.value) })}
                      className="w-full h-2 accent-[var(--color-accent)] cursor-pointer"
                    />
                  </div>

                  {/* Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold opacity-40 uppercase mb-2 block">Schwierigkeit</label>
                      <select 
                        value={config.difficulty} 
                        onChange={(e) => setConfig({ difficulty: e.target.value as Difficulty | 'all' })}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 rounded-xl"
                      >
                        {DIFFICULTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold opacity-40 uppercase mb-2 block">Zeitlimit</label>
                      <select 
                        value={config.timeLimitSeconds ?? ''} 
                        onChange={(e) => setConfig({ timeLimitSeconds: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 rounded-xl"
                      >
                        {TIME_LIMIT_OPTIONS.map(o => <option key={o.value ?? 'null'} value={o.value ?? ''}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Team Mode */}
                  <div>
                    <label className="text-xs font-bold opacity-40 uppercase mb-2 block">Team Modus</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TEAM_MODE_OPTIONS.map(o => (
                        <button 
                          key={o.value}
                          onClick={() => setConfig({ teamMode: o.value })}
                          className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${config.teamMode === o.value ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 opacity-60'}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary / Replay Button if appropriate */}
                {players.length > 0 && step === 4 && (
                  <button 
                    onClick={handleStart}
                    className="w-full py-5 rounded-2xl bg-[var(--color-primary)] text-white text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
                  >
                    🚀 SPIEL STARTEN!
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(text) => {
          if (text.startsWith('@')) {
            setNameInput(text.substring(1));
            handleAddPlayer();
          } else {
            alert(`Gescannter Code: ${text}\n(Zukünftige Funktion: Song-Favoriten oder Deck-Import)`);
          }
        }}
      />

      {/* Navigation Footer — always visible at bottom */}
      <div className="shrink-0 pb-6 pt-3 flex flex-col gap-2 border-t border-white/5">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-4 rounded-xl border-2 border-[var(--color-border)] font-bold opacity-60 hover:opacity-100"
            >
              Zurück
            </button>
          )}
          {step < 4 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canGoNext}
              className="flex-[2] py-4 rounded-xl bg-white/10 border border-white/20 font-black disabled:opacity-20 flex items-center justify-center gap-2"
            >
              Weiter {canGoNext ? '→' : '(fehlt noch)'}
            </button>
          )}
        </div>

        {players.length > 0 && step === 1 && (
          <button
            onClick={() => setStep(4)}
            className="text-xs font-bold text-[var(--color-accent)] opacity-60 hover:opacity-100 transition-opacity text-center py-1"
          >
            Direkt zu den Einstellungen →
          </button>
        )}

        <button
          onClick={() => { initSession(); setStep(1); }}
          className="text-[10px] opacity-20 hover:opacity-60 transition-opacity text-center"
        >
          Lobby zurücksetzen
        </button>
      </div>

    </main>
  );
}
