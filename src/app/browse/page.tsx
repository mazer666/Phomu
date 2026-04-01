'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhomuSong } from '@/types/song';
import { SongCard } from '@/components/browse/SongCard';
import { SongEditor } from '@/components/admin/SongEditor';
import { useGameStore } from '@/stores/game-store';
import { ALL_SONGS as DATA_SONGS } from '@/data/packs';

// ─── Daten laden & Storage ──────────────────────────────────────────────────

const STORAGE_KEY = 'phomu-admin-songs';

/** Lädt Songs aus localStorage oder Fallback auf JSON */
function loadSongs(): PhomuSong[] {
  if (typeof window === 'undefined') return DATA_SONGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DATA_SONGS;
}

/** Speichert Songs in localStorage */
function saveSongsToStorage(songs: PhomuSong[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getDecadeLabel(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}er`;
}

function getDecades(songs: PhomuSong[]): string[] {
  const decades = new Set(songs.map((s) => getDecadeLabel(s.year)));
  return Array.from(decades).sort();
}

function getGenres(songs: PhomuSong[]): string[] {
  const genres = new Set(songs.map((s) => s.genre));
  return Array.from(genres).sort();
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function BrowsePage() {
  const router = useRouter();
  const startQuickGame = useGameStore((state) => state.startQuickGame);

  const [allSongs, setAllSongs] = useState<PhomuSong[]>(loadSongs);
  const [isLoaded, setIsLoaded] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [editingSong, setEditingSong] = useState<PhomuSong | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [sortBy, setSortBy] = useState<'year' | 'title' | 'artist'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState({
    search: '',
    genre: '',
    decade: '',
    difficulty: '',
    mood: '',
    onlyOneHitWonders: false,
    onlyWithLyrics: false,
    onlyQR: false,
  });

  // Initiales Laden
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const genres = useMemo(() => getGenres(allSongs), [allSongs]);
  const decades = useMemo(() => getDecades(allSongs), [allSongs]);
  const moods = useMemo(() => {
    const allMoods = new Set<string>();
    allSongs.forEach(s => s.mood.forEach(m => allMoods.add(m)));
    return Array.from(allMoods).sort();
  }, [allSongs]);

  const filteredSongs = useMemo(() => {
    let result = allSongs;
    const q = filters.search.toLowerCase().trim();
    
    if (q) {
      result = result.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.artist.toLowerCase().includes(q) || 
        s.genre.toLowerCase().includes(q)
      );
    }
    if (filters.genre) result = result.filter(s => s.genre === filters.genre);
    if (filters.decade) result = result.filter(s => getDecadeLabel(s.year) === filters.decade);
    if (filters.difficulty) result = result.filter(s => s.difficulty === filters.difficulty);
    if (filters.mood) result = result.filter(s => s.mood.includes(filters.mood));
    if (filters.onlyOneHitWonders) result = result.filter(s => s.isOneHitWonder);
    if (filters.onlyWithLyrics) result = result.filter(s => s.lyrics !== null);
    if (filters.onlyQR) result = result.filter(s => s.isQRCompatible);

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'year') cmp = a.year - b.year;
      else if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortBy === 'artist') cmp = a.artist.localeCompare(b.artist);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [allSongs, filters, sortBy, sortOrder]);

  const handleSaveSong = useCallback((updated: PhomuSong) => {
    setAllSongs(prev => {
      const isExisting = prev.some(s => s.id === updated.id);
      const next = isExisting ? prev.map(s => s.id === updated.id ? updated : s) : [...prev, updated];
      saveSongsToStorage(next);
      return next;
    });
    setEditingSong(null);
  }, []);

  const handlePlaySong = useCallback((song: PhomuSong) => {
    startQuickGame(song);
    router.push('/game');
  }, [startQuickGame, router]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      genre: '',
      decade: '',
      difficulty: '',
      mood: '',
      onlyOneHitWonders: false,
      onlyWithLyrics: false,
      onlyQR: false,
    });
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-2xl border-b border-white/5 py-4 px-8">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div 
              onClick={() => router.push('/')}
              className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="text-2xl">⚡</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                Bibliothek
                {adminMode && (
                  <motion.span 
                    animate={{ opacity: [1, 0.5, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-red-500 text-[9px] px-2 py-0.5 rounded-full"
                  >
                    ADMIN
                  </motion.span>
                )}
              </h1>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                Explore {allSongs.length} Masterpieces
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl flex items-center gap-3">
            <div className="relative flex-1 group">
              <input
                type="search"
                placeholder="Titel, Künstler oder Genre suchen..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity">🔍</span>
            </div>
            
            <div className="flex items-center gap-2 h-12">
               <button
                 onClick={() => setAdminMode(!adminMode)}
                 className={`w-12 h-full rounded-2xl flex items-center justify-center transition-all border ${adminMode ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                 title="Admin Modus"
               >
                 {adminMode ? '🔒' : '🔓'}
               </button>
               <button 
                 onClick={() => router.push('/lobby')}
                 className="px-6 h-full bg-white text-black rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
               >
                 Lobby
               </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1800px] mx-auto w-full flex flex-col md:flex-row p-8 gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-72 shrink-0 space-y-10">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Sortierung</h4>
              <button 
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="text-[10px] font-black text-blue-500 hover:underline"
              >
                {sortOrder === 'asc' ? 'AUFSTEIGEND' : 'ABSTEIGEND'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'year', label: '📅 Jahr', icon: 'YEAR' },
                { id: 'title', label: '🔤 Titel', icon: 'NAME' },
                { id: 'artist', label: '👤 Artist', icon: 'USER' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`flex items-center justify-between px-5 py-3.5 rounded-2xl text-[11px] font-black transition-all border ${sortBy === s.id ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  <span>{s.label}</span>
                  {sortBy === s.id && <span>✨</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-4">Filter-Optionen</h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Erscheinung</label>
                <select 
                  value={filters.decade} 
                  onChange={e => setFilters(p => ({ ...p, decade: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Alle Jahrzehnte</option>
                  {decades.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Stimmung</label>
                <select 
                  value={filters.mood} 
                  onChange={e => setFilters(p => ({ ...p, mood: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Jeder Vibe</option>
                  {moods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Genre</label>
                <select 
                  value={filters.genre} 
                  onChange={e => setFilters(p => ({ ...p, genre: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Alle Genres</option>
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="pt-6 flex flex-col gap-3">
              <FilterToggle label="QR-Kompatibel" active={filters.onlyQR} onClick={() => setFilters(p => ({ ...p, onlyQR: !p.onlyQR }))} />
              <FilterToggle label="One-Hit Wonders" active={filters.onlyOneHitWonders} onClick={() => setFilters(p => ({ ...p, onlyOneHitWonders: !p.onlyOneHitWonders }))} />
              <FilterToggle label="Mit Songtexten" active={filters.onlyWithLyrics} onClick={() => setFilters(p => ({ ...p, onlyWithLyrics: !p.onlyWithLyrics }))} />
              <FilterToggle label="Hints zeigen" active={showHints} onClick={() => setShowHints(!showHints)} />
            </div>

            <button
              onClick={handleResetFilters}
              className="w-full py-4 text-[10px] font-black text-white/20 hover:text-white transition-colors border-t border-white/5 pt-6"
            >
              ALLES ZURÜCKSETZEN ↺
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black uppercase">
              {filteredSongs.length} <span className="text-blue-500">Ergebnisse</span>
            </h2>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Kollektion</p>
              <p className="text-xs font-bold">Standard Pack 2026</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 pb-32">
            {adminMode && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setEditingSong({ 
                  id: `new-${Date.now()}`, title: '', artist: '', year: 2024, country: 'DE', genre: 'Pop', 
                  difficulty: 'medium', mood: [], pack: 'Custom', hints: ['', '', '', '', ''], lyrics: null, 
                  isOneHitWonder: false, links: { youtube: '' }, supportedModes: ['timeline'], isQRCompatible: true
                })}
                className="aspect-[4/5] rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-white/20 hover:text-blue-400 hover:border-blue-400/50 hover:bg-blue-400/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-400/20 group-hover:scale-110 transition-all">
                  <span className="text-3xl">+</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Add New Masterpiece</p>
              </motion.button>
            )}
            
            {filteredSongs.length === 0 ? (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-20">
                <span className="text-6xl mb-6"> Desert</span>
                <p className="text-xl font-black uppercase tracking-widest">Keine Songs gefunden</p>
                <p className="text-sm mt-2">Versuche es mit anderen Filtereinstellungen.</p>
              </div>
            ) : (
              filteredSongs.map((song) => (
                <SongCard 
                  key={song.id} 
                  song={song} 
                  showHints={showHints}
                  isAdmin={adminMode}
                  onEdit={setEditingSong}
                  onPlay={handlePlaySong}
                />
              ))
            )}
          </div>
        </main>
      </div>

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {editingSong && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-3xl bg-black/80"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#121215] rounded-[3rem] border border-white/10 shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <SongEditor 
                song={editingSong} 
                onSave={handleSaveSong} 
                onCancel={() => setEditingSong(null)} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${active ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${active ? 'border-blue-400 bg-blue-400 text-black shadow-lg shadow-blue-400/20' : 'border-white/10'}`}>
        {active && <span className="text-[10px] font-black">✓</span>}
      </div>
    </button>
  );
}
