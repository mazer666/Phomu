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
const PAGE_SIZE_OPTIONS = [8, 24, 48, 96, 'all'] as const;

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
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(24);


  // Reset page when filters change
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setCurrentPage(1);
    });
    return () => {
      cancelled = true;
    };
  }, [filters, sortBy, sortOrder, pageSize]);

  const genres = useMemo(() => getGenres(allSongs), [allSongs]);
  const decades = useMemo(() => getDecades(allSongs), [allSongs]);
  const moods = useMemo(() => {
    const allMoods = new Set<string>();
    allSongs.forEach(s => s.mood.forEach(m => allMoods.add(m)));
    return Array.from(allMoods).sort();
  }, [allSongs]);

  const filteredSongs = useMemo(() => {
    // Deduplizieren: gleicher Title+Artist nur einmal anzeigen
    const seen = new Set<string>();
    let result = allSongs.filter(s => {
      const key = `${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  // Paginated Songs
  const paginatedSongs = useMemo(() => {
    if (pageSize === 'all') return filteredSongs;
    const start = (currentPage - 1) * pageSize;
    return filteredSongs.slice(start, start + pageSize);
  }, [filteredSongs, currentPage, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredSongs.length / pageSize);

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
    setCurrentPage(1);
  };

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
                 className={`px-4 h-full rounded-2xl flex items-center justify-center gap-2 transition-all border text-[10px] font-black uppercase tracking-wider ${adminMode ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                 title="Admin Modus"
               >
                 <span>{adminMode ? '🔓' : '🔒'}</span>
                 <span>{adminMode ? 'Admin an' : 'Admin aus'}</span>
               </button>
               <button 
                 onClick={() => router.push('/lobby')}
                 className="px-6 h-full bg-white text-black rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
               >
                 Lobby
               </button>
               <button
                 onClick={() => setShowFilters(!showFilters)}
                 className="md:hidden w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl transition-all"
               >
                 {showFilters ? '✕' : '⌥'}
               </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1800px] mx-auto w-full flex flex-col md:flex-row p-4 md:p-8 gap-8 relative">
        {/* Sidebar */}
        <AnimatePresence>
          {(showFilters || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
            <motion.aside 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full md:w-72 shrink-0 space-y-10 overflow-hidden"
            >
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
                  onClick={() => setSortBy(s.id as 'year' | 'title' | 'artist')}
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
        </motion.aside>
        )}
      </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase">
                {filteredSongs.length} <span className="text-blue-500">Ergebnisse</span>
              </h2>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Kollektion: Standard Pack 2026</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${pageSize === size ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    {size === 'all' ? 'Alle' : size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination Bar */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 bg-white/5 p-3 rounded-[2rem] border border-white/5 backdrop-blur-md">
              <PaginationButton icon="|←" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="Anfang" />
              <PaginationButton icon="←" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Zurück" />
              
              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

              <div className="flex items-center gap-1">
                {/* Dynamische Seitenzahlen */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = currentPage;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-110' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

              <PaginationButton icon="→" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Weiter" />
              
              <div className="flex items-center gap-1 ml-2">
                 <button 
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 5))} 
                   disabled={currentPage > totalPages - 5}
                   className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all disabled:opacity-20"
                 >
                   +5
                 </button>
                 <button 
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 10))} 
                   disabled={currentPage > totalPages - 10}
                   className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all disabled:opacity-20"
                 >
                   +10
                 </button>
              </div>

              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
              
              <PaginationButton icon="→|" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Ende" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 pb-32">
            {adminMode && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setEditingSong({ 
                  id: `new-${Date.now()}`, title: '', artist: '', year: new Date().getFullYear(), country: 'DE', genre: 'Pop', 
                  difficulty: 'medium', mood: [], pack: 'Custom', hints: ['', '', '', '', ''], lyrics: null, 
                  hintEvidence: ['', '', '', '', ''],
                  isOneHitWonder: false, links: { youtube: '' }, supportedModes: ['timeline', 'hint-master', 'vibe-check', 'cover-confusion', 'survivor'], isQRCompatible: true
                })}
                className="aspect-[4/5] rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-white/20 hover:text-blue-400 hover:border-blue-400/50 hover:bg-blue-400/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-400/20 group-hover:scale-110 transition-all">
                  <span className="text-3xl">+</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Add New Masterpiece</p>
              </motion.button>
            )}
            
            {paginatedSongs.length === 0 ? (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-20">
                <span className="text-6xl mb-6">🏜️</span>
                <p className="text-xl font-black uppercase tracking-widest">Keine Songs gefunden</p>
                <p className="text-sm mt-2">Versuche es mit anderen Filtereinstellungen.</p>
              </div>
            ) : (
              paginatedSongs.map((song) => (
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

          {/* Pagination Bar (Bottom) */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 bg-white/5 p-3 rounded-[2rem] border border-white/5 backdrop-blur-md">
              <PaginationButton icon="|←" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="Anfang" />
              <PaginationButton icon="←" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Zurück" />

              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = currentPage;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-110' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />

              <PaginationButton icon="→" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Weiter" />

              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 5))} disabled={currentPage > totalPages - 5} className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all disabled:opacity-20">+5</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 10))} disabled={currentPage > totalPages - 10} className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all disabled:opacity-20">+10</button>
              </div>

              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
              <PaginationButton icon="→|" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Ende" />
            </div>
          )}
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
                key={editingSong.id}
                song={editingSong} 
                onSave={handleSaveSong} 
                onCancel={() => setEditingSong(null)}
                variant="inline"
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

function PaginationButton({ 
  icon, 
  onClick, 
  disabled, 
  title 
}: { 
  icon: string, 
  onClick: () => void, 
  disabled: boolean, 
  title: string 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black transition-all hover:bg-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
    >
      {icon}
    </button>
  );
}
