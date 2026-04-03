'use client';

/**
 * Einstellungen / Settings
 * 
 * Hier können Spieler:
 * - Ihren Namen, Avatar und Farbe ändern
 * - Den Spielfortschritt einsehen (XP)
 * - Das App-Theme wechseln
 * - YouTube Player Optionen anpassen
 */

import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game-store';
import { PHOMU_CONFIG } from '@/config/game-config';
import type { ThemeName } from '@/config/game-config';
import type { AIQueueStrategy, HintReleasePolicy, OverrideGovernance } from '@/types/game-state';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_AVATARS = ['🎵', '🎸', '🥁', '🎹', '🎺', '🎻', '🎤', '🎧', '🦁', '🐯', '🦊', '🦄', '👾', '🚀', '🕺', '💃', '✨', '🔥'];
const PLAYER_COLORS = ['#FF6B35', '#FFD166', '#06D6A0', '#118AB2', '#EF476F', '#9B5DE5', '#00BBF9', '#FF9F1C', '#2EC4B6'];

export default function SettingsPage() {
  const router = useRouter();
  const { 
    players, 
    totalXP,
    updatePlayer,
    preferredPlayer,
    setPreferredPlayer,
    musicEnabled,
    musicVolume,
    sfxEnabled,
    sfxVolume,
    setAudioSettings,
    resetProgress,
    config,
    setConfig,
  } = useGameStore();
  
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof document === 'undefined') return 'jackbox';
    const theme = document.documentElement.getAttribute('data-theme') as ThemeName | null;
    return theme ?? 'jackbox';
  });
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  // Level-Berechnung (rein informativ: alle 100 XP ein Level)
  const currentLevel = Math.floor(totalXP / 100) + 1;


  const handleThemeChange = (theme: ThemeName) => {
    document.documentElement.setAttribute('data-theme', theme);
    setCurrentTheme(theme);
    localStorage.setItem('phomu-theme', theme);
  };

  return (
    <main className="min-h-screen p-4 md:p-12 max-w-4xl mx-auto space-y-10 pb-32">
      <header className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md sticky top-4 z-50">
        <div>
          <h1 className="text-3xl font-black tracking-tight">⚙️ Einstellungen</h1>
          <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">Player Profile & Platform Config</p>
        </div>
        <button 
          onClick={() => router.back()}
          className="px-8 py-3 bg-[var(--color-accent)] text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--color-accent)]/20"
        >
          FERTIG
        </button>
      </header>

      {/* Profil-Statistiken */}
      <section className="bg-[var(--color-bg-card)] p-8 rounded-[40px] border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/10 blur-3xl -mr-16 -mt-16" />
        
        <div className="relative z-10 flex flex-col items-center gap-2">
           <div className="text-center group">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1 group-hover:opacity-100 transition-opacity">Lifetime Score</p>
             <h2 className="text-6xl font-black tracking-tighter">{totalXP.toLocaleString()} <span className="text-xl opacity-30">XP</span></h2>
           </div>
           <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Level {currentLevel}</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-10">
          <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Song Packs</p>
            <p className="text-2xl font-black">All Unlocked</p>
          </div>
          <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Songs Ready</p>
            <p className="text-2xl font-black">1.000+</p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Spieler-Individualisierung */}
        <section className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tight border-b border-white/5 pb-2">👥 Spieler Profile</h2>
          {players.length === 0 ? (
            <div className="bg-white/5 p-8 rounded-3xl border border-dashed border-white/10 text-center">
              <p className="text-sm opacity-40 italic">Keine Spieler in der Lobby vorhanden.</p>
              <button 
                onClick={() => router.push('/lobby')}
                className="mt-4 text-xs font-black text-[var(--color-accent)] underline"
              >
                JETZT SPIELER ANLEGEN
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {players.map((player) => (
                <div key={player.id} className="group relative">
                  <motion.div 
                    layout
                    className={`bg-white/5 p-4 rounded-2xl border transition-all ${editingPlayerId === player.id ? 'border-[var(--color-accent)] bg-white/10' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-4 border-black/20"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.avatar}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text"
                          value={player.name}
                          onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                          className="bg-transparent border-none p-0 font-black text-xl focus:ring-0 w-full"
                        />
                        <p className="text-[10px] opacity-30 uppercase font-black tracking-widest">ID: {player.id.slice(0, 8)}</p>
                      </div>
                      <button 
                        onClick={() => setEditingPlayerId(editingPlayerId === player.id ? null : player.id)}
                        className={`p-2 rounded-xl transition-all ${editingPlayerId === player.id ? 'bg-[var(--color-accent)] text-white' : 'bg-white/5 opacity-40 hover:opacity-100'}`}
                      >
                        {editingPlayerId === player.id ? 'OK' : '🎨'}
                      </button>
                    </div>

                    <AnimatePresence>
                      {editingPlayerId === player.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pt-4 space-y-4"
                        >
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase opacity-40">Avatar wählen</p>
                            <div className="flex flex-wrap gap-2">
                              {EMOJI_AVATARS.map(emoji => (
                                <button 
                                  key={emoji}
                                  onClick={() => updatePlayer(player.id, { avatar: emoji })}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/20 transition-all ${player.avatar === emoji ? 'ring-2 ring-[var(--color-accent)] scale-110 bg-white/10' : ''}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase opacity-40">Farbe wählen</p>
                            <div className="flex flex-wrap gap-2">
                              {PLAYER_COLORS.map(color => (
                                <button 
                                  key={color}
                                  onClick={() => updatePlayer(player.id, { color })}
                                  className={`w-8 h-8 rounded-lg border-2 border-black/20 transition-all ${player.color === color ? 'ring-2 ring-white scale-110' : ''}`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* App-Einstellungen */}
        <div className="space-y-10">
          <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight border-b border-white/5 pb-2">🎨 Erscheinen</h2>
            <div className="grid grid-cols-2 gap-3">
              {PHOMU_CONFIG.AVAILABLE_THEMES.map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${currentTheme === theme ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-lg' : 'border-white/5 bg-white/5 opacity-60 hover:opacity-100'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${theme === 'jackbox' ? 'bg-orange-500' : theme === 'spotify' ? 'bg-green-500' : theme === 'youtube' ? 'bg-red-600' : 'bg-white text-black'}`}>
                    {theme === 'jackbox' ? '🎉' : theme === 'spotify' ? '🎧' : theme === 'youtube' ? '📺' : '🖼️'}
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-black uppercase">{theme}</span>
                    <span className="block text-[9px] opacity-40 font-bold uppercase">{theme === 'jackbox' ? 'Party Vibes' : theme === 'spotify' ? 'Minimal Dark' : 'Modern Red'}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight border-b border-white/5 pb-2">🔊 Abspiel-Optionen</h2>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
              <p className="text-xs opacity-50 font-bold uppercase tracking-widest">YouTube Player Modus</p>
              <div className="flex bg-black/20 p-1 rounded-2xl">
                <button 
                  onClick={() => setPreferredPlayer('standard')}
                  className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${preferredPlayer === 'standard' ? 'bg-[var(--color-accent)] text-white shadow-xl' : 'opacity-40 hover:opacity-100'}`}
                >
                  STANDARD
                </button>
                <button 
                  onClick={() => setPreferredPlayer('music')}
                  className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${preferredPlayer === 'music' ? 'bg-[var(--color-accent)] text-white shadow-xl' : 'opacity-40 hover:opacity-100'}`}
                >
                  MUSIC MODE (BETA)
                </button>
              </div>
              <p className="text-[10px] italic opacity-40">
                {preferredPlayer === 'music' 
                  ? 'Hinweis: Music Mode sieht besser aus, ist aber restriktiver bei einigen Songs.' 
                  : 'Hinweis: Standard YouTube ist am zuverlässigsten für alle Songs.'}
              </p>

              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs opacity-60 font-bold uppercase tracking-widest">Hintergrundmusik</p>
                  <button
                    onClick={() => setAudioSettings({ musicEnabled: !musicEnabled })}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black ${musicEnabled ? 'bg-green-500/20 text-green-300' : 'bg-white/10 opacity-70'}`}
                  >
                    {musicEnabled ? 'AN' : 'AUS'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!musicEnabled}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => setAudioSettings({ musicVolume: Number(e.target.value) / 100 })}
                  className="w-full accent-[var(--color-accent)]"
                />

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs opacity-60 font-bold uppercase tracking-widest">Soundeffekte</p>
                  <button
                    onClick={() => setAudioSettings({ sfxEnabled: !sfxEnabled })}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black ${sfxEnabled ? 'bg-green-500/20 text-green-300' : 'bg-white/10 opacity-70'}`}
                  >
                    {sfxEnabled ? 'AN' : 'AUS'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!sfxEnabled}
                  value={Math.round(sfxVolume * 100)}
                  onChange={(e) => setAudioSettings({ sfxVolume: Number(e.target.value) / 100 })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
            </div>
          </section>


          <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight border-b border-white/5 pb-2">🧠 KI & Override Governance</h2>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
              <div>
                <p className="text-xs opacity-50 font-bold uppercase tracking-widest mb-2">Override Governance</p>
                <select
                  value={config.overrideGovernance}
                  onChange={(e) => setConfig({ overrideGovernance: e.target.value as OverrideGovernance })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-sm"
                >
                  <option value="host">Host (Default)</option>
                  <option value="co-host">Co-Host</option>
                  <option value="majority">Mehrheit</option>
                </select>
              </div>

              <div>
                <p className="text-xs opacity-50 font-bold uppercase tracking-widest mb-2">Hint Release Policy</p>
                <select
                  value={config.hintReleasePolicy}
                  onChange={(e) => setConfig({ hintReleasePolicy: e.target.value as HintReleasePolicy })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-sm"
                >
                  <option value="auto-publish">Auto Publish nach Checks</option>
                  <option value="manual-review">Manuelle Freigabe</option>
                </select>
              </div>

              <div>
                <p className="text-xs opacity-50 font-bold uppercase tracking-widest mb-2">AI Blocking Verhalten</p>
                <select
                  value={config.aiQueueStrategy}
                  onChange={(e) => setConfig({ aiQueueStrategy: e.target.value as AIQueueStrategy })}
                  className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-sm"
                >
                  <option value="queue-retry-pending">Queue + Retry + Pending</option>
                  <option value="fail-fast">Fail Fast</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight border-b border-white/5 pb-2 text-red-500/50">⚠️ Gefahrzone</h2>
            <button 
              onClick={() => {
                if(confirm('Möchtest du wirklich deinen gesamten Fortschritt (XP) löschen?')) {
                  resetProgress();
                  alert('Fortschritt wurde zurückgesetzt!');
                }
              }}
              className="w-full p-4 rounded-2xl border-2 border-red-500/20 bg-red-500/5 text-red-500 font-black hover:bg-red-500/10 transition-all uppercase text-xs tracking-widest"
            >
              XP Zurücksetzen
            </button>
          </section>
        </div>
      </div>

      {/* Info */}
      <footer className="pt-20 opacity-30 text-center space-y-2">
        <p className="text-xs font-black tracking-widest uppercase">PHOMU PLATFORM v1.5.1</p>
        <p className="text-[10px] uppercase font-bold text-[var(--color-accent)]">All Packs Enabled</p>
        <div className="flex justify-center gap-4 pt-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[9px] uppercase font-black">All Systems Functional</p>
        </div>
      </footer>
    </main>
  );
}
