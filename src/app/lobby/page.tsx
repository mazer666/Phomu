/**
 * Lobby-Seite (Wizard-Edition)
 * 
 * Ein schrittweiser Prozess (1-4) für optimale Mobile-Nutzung.
 * 1. Spieler | 2. Modi | 3. Packs | 4. Einstellungen
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';
import { PlayerCard } from '@/components/lobby/PlayerCard';
import { ModeSelector } from '@/components/lobby/ModeSelector';
import { PackSelector } from '@/components/lobby/PackSelector';
import { QRScannerModal } from '@/components/game/QRScannerModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { PHOMU_CONFIG } from '@/config/game-config';
import type { Difficulty } from '@/config/game-config';
import type { TeamMode } from '@/types/player';
import { parseQrIntent } from '@/utils/qr-intent';

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
  { value: 'individual', label: 'Einzeln',           description: 'Klassisch' },
  { value: 'fixed',      label: 'Teams',            description: 'Fest' },
  { value: 'shifting',   label: 'Mix-Teams',         description: 'Rotiert' },
];

const CURATED_TEAM_COLORS = [
  { name: 'Phomu Blue',   value: '#118AB2' },
  { name: 'Neon Purple',  value: '#9B5DE5' },
  { name: 'Emerald',      value: '#06D6A0' },
  { name: 'Sunset',       value: '#FF6B35' },
  { name: 'Cyber Pink',   value: '#EF476F' },
  { name: 'Gold Rush',    value: '#FFD166' },
];

// ─── Lobby-Seite ──────────────────────────────────────────────────

export default function LobbyPage() {
  const router = useRouter();
  const {
    players, teams, config,
    addPlayer, removePlayer, setConfig, initSession, startGame,
    initTeams, createTeam, removeTeam, assignPlayerToTeam,
  } = useGameStore();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [nameInput, setNameInput] = useState(`Spieler ${players.length + 1}`);

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);


  // ─── Hilfsfunktionen ────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (step === 1) return players.length >= PHOMU_CONFIG.MIN_PLAYERS;
    if (step === 2) return config.selectedModes.length > 0;
    if (step === 3) return config.selectedPacks.length > 0;
    return true;
  }, [step, players.length, config.selectedModes, config.selectedPacks]);

  const handleAddPlayer = useCallback(() => {
    if (!nameInput.trim()) return;
    if (players.length >= PHOMU_CONFIG.MAX_PLAYERS) return;

    // Auto-assign color and avatar based on current player count
    const avatar = EMOJI_AVATARS[players.length % EMOJI_AVATARS.length];
    const color = PLAYER_COLORS[players.length % PLAYER_COLORS.length];

    addPlayer(nameInput.trim(), avatar, color);
    
    // Auto-update name for the next addition
    const nextCount = players.length + 1;
    setNameInput(`Spieler ${nextCount + 1}`);
  }, [nameInput, players.length, addPlayer]);

  const handleTeamModeChange = useCallback((mode: TeamMode) => {
    setConfig({ teamMode: mode });
    if ((mode === 'fixed' || mode === 'shifting') && teams.length === 0) {
      initTeams(2);
    }
  }, [setConfig, initTeams, teams.length]);

  const handleStart = useCallback(() => {
    startGame();
    router.push('/game');
  }, [startGame, router]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  // ─── Render Schritte ───────────────────────────────────────────

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 overflow-x-hidden min-h-screen flex flex-col">

      {/* Header mit Progress — sticky so only content scrolls */}
      <div className="sticky top-0 z-20 bg-[var(--color-bg)] pt-4 md:pt-6 pb-4 flex flex-col gap-3">
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

      {/* Wizard Content Area — padding-bottom makes room for the fixed footer */}
      <div className="flex-1 pb-44 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              initial="enter"
              animate="center"
              exit="exit"
              variants={variants}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-6"
            >
              <div>
                  <h2 className="text-xl font-bold mb-2">Wer spielt mit?</h2>
                  <p className="text-sm opacity-60">Füge mindestens einen Spieler hinzu.</p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                    onFocus={(e) => e.target.select()}
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
              </motion.div>
            )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              initial="enter"
              animate="center"
              exit="exit"
              variants={variants}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-6"
            >
              <div>
                  <h2 className="text-xl font-bold mb-2">Wie wird gespielt?</h2>
                  <p className="text-sm opacity-60">Wähle die Spielmodi, die vorkommen sollen.</p>
                </div>
                <ModeSelector 
                  selectedModes={config.selectedModes}
                  onChange={(modes) => setConfig({ selectedModes: modes })}
                />
              </motion.div>
            )}

          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              initial="enter"
              animate="center"
              exit="exit"
              variants={variants}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-6"
            >
              <div>
                  <h2 className="text-xl font-bold mb-2">Was hören wir?</h2>
                  <p className="text-sm opacity-60">Wähle eines oder mehrere Song-Packs aus.</p>
                </div>
                <PackSelector 
                  selectedPacks={config.selectedPacks}
                  onChange={(packs) => setConfig({ selectedPacks: packs })}
                />
              </motion.div>
            )}

          {step === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              initial="enter"
              animate="center"
              exit="exit"
              variants={variants}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="space-y-8"
            >
              <div>
                  <h2 className="text-xl font-bold mb-2">Feinschlapf</h2>
                  <p className="text-sm opacity-60">Letzte Einstellungen vor dem Start.</p>
                </div>

                <div className="grid gap-6">
                  {/* Game Ending Condition */}
                  <div className="bg-[var(--color-bg-card)]/50 p-6 rounded-3xl border border-[var(--color-border)] space-y-6">
                    <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-black opacity-40 uppercase tracking-widest text-center">Spiel-Ende nach...</label>
                      <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-2xl">
                        {(['points', 'rounds', 'time'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setConfig({ endingCondition: mode })}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${config.endingCondition === mode ? 'bg-[var(--color-accent)] text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                          >
                            {mode === 'points' ? '🏆 Punkte' : mode === 'rounds' ? '🔄 Runden' : '⏱️ Zeit'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Presets based on mode */}
                    <div className="space-y-4">
                      {config.endingCondition === 'points' && (
                        <div className="grid grid-cols-4 gap-2">
                          {[50, 100, 200, 500].map(v => (
                            <button
                              key={v}
                              onClick={() => setConfig({ targetPoints: v, winCondition: v })}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all ${config.targetPoints === v ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 opacity-60'}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                      {config.endingCondition === 'rounds' && (
                        <div className="grid grid-cols-4 gap-2">
                          {[5, 10, 15, 20].map(v => (
                            <button
                              key={v}
                              onClick={() => setConfig({ targetRounds: v, roundsToPlay: v })}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all ${config.targetRounds === v ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 opacity-60'}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                      {config.endingCondition === 'time' && (
                        <div className="grid grid-cols-4 gap-2">
                          {[30, 60, 120, 240].map(v => (
                            <button
                              key={v}
                              onClick={() => setConfig({ targetTimeMinutes: v })}
                              className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${config.targetTimeMinutes === v ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-white/10 opacity-60'}`}
                            >
                              {v < 60 ? `${v}m` : `${v/60}h`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Manual Slider Section */}
                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Eigene Einstellung</span>
                          <span className="text-xl font-black text-[var(--color-accent)]">
                            {config.endingCondition === 'points' && `${config.targetPoints} Pkt.`}
                            {config.endingCondition === 'rounds' && `${config.targetRounds} Rnd.`}
                            {config.endingCondition === 'time' && (config.targetTimeMinutes < 60 ? `${config.targetTimeMinutes} Min.` : `${config.targetTimeMinutes / 60} Std.`)}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min={config.endingCondition === 'time' ? 30 : 5}
                          max={config.endingCondition === 'time' ? 240 : 500}
                          step={config.endingCondition === 'time' ? 30 : 5}
                          value={config.endingCondition === 'points' ? config.targetPoints : config.endingCondition === 'rounds' ? config.targetRounds : config.targetTimeMinutes}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (config.endingCondition === 'points') setConfig({ targetPoints: val, winCondition: val });
                            else if (config.endingCondition === 'rounds') setConfig({ targetRounds: val, roundsToPlay: val });
                            else setConfig({ targetTimeMinutes: val });
                          }}
                          className="w-full h-1.5 accent-[var(--color-accent)] bg-white/10 rounded-full cursor-pointer appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Difficulty & Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-40 uppercase ml-1">Schwierigkeit</label>
                      <select 
                        value={config.difficulty} 
                        onChange={(e) => setConfig({ difficulty: e.target.value as Difficulty | 'all' })}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 rounded-2xl focus:border-[var(--color-accent)] outline-none transition-all"
                      >
                        {DIFFICULTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-40 uppercase ml-1">Zeitlimit</label>
                      <select 
                        value={config.timeLimitSeconds ?? ''} 
                        onChange={(e) => setConfig({ timeLimitSeconds: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 rounded-2xl focus:border-[var(--color-accent)] outline-none transition-all"
                      >
                        {TIME_LIMIT_OPTIONS.map(o => <option key={o.value ?? 'null'} value={o.value ?? ''}>{o.label}</option>)}
                      </select>
                    </div>

                    <div className="bg-[var(--color-bg-card)] p-4 rounded-2xl border border-[var(--color-border)]">
                      <label className="flex items-center justify-between text-sm font-bold cursor-pointer group">
                        <div className="flex flex-col">
                          <span>QR-Karten Modus</span>
                          <span className="text-[9px] opacity-40 uppercase tracking-widest mt-1">Nur physische Karten</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={config.onlyQRCompatible ?? false}
                          onChange={(e) => setConfig({ onlyQRCompatible: e.target.checked })}
                          className="accent-[var(--color-accent)] w-6 h-6 rounded-lg overflow-hidden transition-all group-active:scale-90"
                        />
                      </label>
                    </div>

                    <div className="bg-[var(--color-bg-card)] p-4 rounded-2xl border border-[var(--color-border)]">
                      <label className="flex items-center justify-between text-sm font-bold cursor-pointer group">
                        <span>Zeitabzug</span>
                        <input
                          type="checkbox"
                          checked={config.timeDecayEnabled}
                          onChange={(e) => setConfig({ timeDecayEnabled: e.target.checked })}
                          className="accent-[var(--color-accent)] w-6 h-6 rounded-lg overflow-hidden transition-all group-active:scale-90"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Team Mode */}
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold opacity-40 uppercase mb-3 block ml-1">Team Modus</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {TEAM_MODE_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => handleTeamModeChange(o.value)}
                            className={`p-4 rounded-2xl border-2 text-xs font-bold transition-all text-left flex flex-col gap-1 ${config.teamMode === o.value ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'border-white/5 bg-white/5 opacity-60 hover:opacity-100'}`}
                          >
                            <span className="text-sm">{o.label}</span>
                            <span className="text-[9px] uppercase tracking-widest opacity-60">{o.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Team Configuration */}
                    {(config.teamMode === 'fixed' || config.teamMode === 'shifting') && teams.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {teams.map((team) => (
                            <div
                              key={team.id}
                              className="p-4 rounded-3xl border-2 space-y-3"
                              style={{ borderColor: team.color + '44', background: team.color + '10' }}
                            >
                              <div className="flex items-center justify-between">
                                <input 
                                  value={team.name}
                                  onChange={(e) => {
                                    const next = teams.map(t => t.id === team.id ? { ...t, name: e.target.value } : t);
                                    useGameStore.setState({ teams: next });
                                  }}
                                  className="bg-transparent font-black text-sm outline-none w-full"
                                  style={{ color: team.color }}
                                />
                                {teams.length > 2 && (
                                  <button
                                    onClick={() => removeTeam(team.id)}
                                    className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-xs opacity-40 hover:opacity-100 transition-opacity"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {CURATED_TEAM_COLORS.map(c => (
                                  <button
                                    key={c.value}
                                    onClick={() => {
                                      const next = teams.map(t => t.id === team.id ? { ...t, color: c.value } : t);
                                      useGameStore.setState({ teams: next });
                                    }}
                                    className={`w-4 h-4 rounded-full transition-all ${team.color === c.value ? 'scale-125 ring-2 ring-white border-2 border-black' : 'opacity-40 hover:opacity-100'}`}
                                    style={{ backgroundColor: c.value }}
                                  />
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                                {players.filter(p => p.teamId === team.id).map(p => (
                                  <span key={p.id} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5">
                                    {p.avatar} {p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {config.teamMode === 'fixed' && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase opacity-30 tracking-widest ml-1">Team-Zuweisung</h4>
                            <div className="grid gap-2">
                              {players.map(player => (
                                <div key={player.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl">
                                  <span className="text-xl">{player.avatar}</span>
                                  <span className="flex-1 text-xs font-bold">{player.name}</span>
                                  <div className="flex gap-1">
                                    {teams.map(team => (
                                      <button
                                        key={team.id}
                                        onClick={() => assignPlayerToTeam(player.id, player.teamId === team.id ? undefined : team.id)}
                                        className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all"
                                        style={{ 
                                          backgroundColor: player.teamId === team.id ? team.color : 'transparent',
                                          color: player.teamId === team.id ? '#fff' : team.color,
                                          border: `1px solid ${team.color}44`
                                        }}
                                      >
                                        {team.name.split(' ')[0]}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {teams.length < 4 && (
                          <button 
                            onClick={() => createTeam()}
                            className="w-full py-3 rounded-2xl border-2 border-dashed border-white/10 text-xs font-bold opacity-40 hover:opacity-100 hover:border-white/30 transition-all"
                          >
                            + Weiteres Team hinzufügen
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(text) => {
          const intent = parseQrIntent(text);
          if (intent.kind === 'player') {
            setNameInput(intent.name);
            handleAddPlayer();
            return;
          }
          if (intent.kind === 'pack') {
            const exists = PHOMU_CONFIG.SONG_PACKS.some((pack) => pack.id === intent.packId);
            if (!exists) return alert(`Pack nicht gefunden: ${intent.packId}`);
            if (!config.selectedPacks.includes(intent.packId)) {
              setConfig({ selectedPacks: [...config.selectedPacks, intent.packId] });
            }
            return;
          }
        }}
      />

      {/* Navigation Footer — fixed at viewport bottom */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-xl border-t border-white/5 pb-safe">
        <div className="max-w-2xl mx-auto px-4 md:px-8 pt-4 pb-8 flex flex-col gap-3">
          
          {step === 4 && players.length > 0 && (
            <button
              onClick={handleStart}
              className="w-full py-5 rounded-3xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] text-white text-xl font-black shadow-2xl shadow-[var(--color-accent)]/20 active:scale-95 transition-all"
            >
              🚀 JETZT STARTEN!
            </button>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => goTo(step - 1)}
                className="flex-1 py-4 rounded-2xl border-2 border-white/5 font-bold opacity-40 hover:opacity-100 hover:bg-white/5 transition-all"
              >
                Zurück
              </button>
            )}
            {step < 4 && (
              <button
                onClick={() => goTo(step + 1)}
                disabled={!canGoNext}
                className="flex-[2] py-4 rounded-2xl bg-white/10 border border-white/10 font-black disabled:opacity-20 transition-all flex items-center justify-center gap-2"
              >
                {canGoNext ? 'Weiter →' : 'Bitte wählen...'}
              </button>
            )}
          </div>

          <div className="flex justify-between items-center px-2">
            {players.length > 0 && step === 1 && (
              <button onClick={() => goTo(4)} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-[var(--color-accent)] transition-all">
                Schnell-Setup →
              </button>
            )}
            <button onClick={() => { initSession(); goTo(1); }} className="text-[10px] font-black uppercase tracking-widest opacity-20 hover:opacity-100 hover:text-red-500 transition-all ml-auto">
              Reset Lobby ↺
            </button>
          </div>
        </div>
      </footer>

    </main>
  );
}
