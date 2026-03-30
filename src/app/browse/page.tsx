'use client';

/**
 * Song-Browser
 * Route: /browse
 *
 * Zeigt alle Songs aus dem global-hits.json Pack.
 * Features:
 *  - Volltextsuche nach Titel / Artist
 *  - Filter nach Genre, Jahrzehnt, Schwierigkeit
 *  - Hints ein-/ausblenden
 *  - Statistik-Leiste oben
 */

import { useState, useMemo } from 'react';
import type { PhomuSong } from '@/types/song';
import { SongCard } from '@/components/browse/SongCard';
import globalHitsRaw from '@/data/packs/global-hits.json';

// ─── Daten laden ──────────────────────────────────────────────────────────────

// JSON hat lyrics: null, unser Typ erlaubt das jetzt
const ALL_SONGS = globalHitsRaw.songs as unknown as PhomuSong[];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Gibt das Jahrzehnt eines Songs zurück als Label, z.B. "1980er" */
function getDecadeLabel(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}er`;
}

/** Alle einzigartigen Jahrzehnte aus den Songs ermitteln, sortiert */
function getDecades(songs: PhomuSong[]): string[] {
  const decades = new Set(songs.map((s) => getDecadeLabel(s.year)));
  return Array.from(decades).sort();
}

/** Alle einzigartigen Genres, sortiert */
function getGenres(songs: PhomuSong[]): string[] {
  const genres = new Set(songs.map((s) => s.genre));
  return Array.from(genres).sort();
}

// ─── Filter-Zustand ───────────────────────────────────────────────────────────

interface BrowseFilters {
  search: string;
  genre: string;        // '' = alle
  decade: string;       // '' = alle
  difficulty: string;   // '' = alle
  onlyOneHitWonders: boolean;
  onlyWithLyrics: boolean;
}

const EMPTY_FILTERS: BrowseFilters = {
  search: '',
  genre: '',
  decade: '',
  difficulty: '',
  onlyOneHitWonders: false,
  onlyWithLyrics: false,
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function BrowsePage() {
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);
  const [showHints, setShowHints] = useState(false);
  const [sortBy, setSortBy] = useState<'year' | 'title' | 'artist'>('year');

  // Alle möglichen Filterwerte aus dem Datensatz berechnen
  const genres = useMemo(() => getGenres(ALL_SONGS), []);
  const decades = useMemo(() => getDecades(ALL_SONGS), []);

  // Gefilterte und sortierte Songs berechnen
  const filteredSongs = useMemo(() => {
    let result = ALL_SONGS;

    // Volltextsuche
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q)
      );
    }

    // Genre-Filter
    if (filters.genre) {
      result = result.filter((s) => s.genre === filters.genre);
    }

    // Jahrzehnt-Filter
    if (filters.decade) {
      result = result.filter((s) => getDecadeLabel(s.year) === filters.decade);
    }

    // Schwierigkeits-Filter
    if (filters.difficulty) {
      result = result.filter((s) => s.difficulty === filters.difficulty);
    }

    // One-Hit-Wonder-Filter
    if (filters.onlyOneHitWonders) {
      result = result.filter((s) => s.isOneHitWonder);
    }

    // Lyrics-Filter
    if (filters.onlyWithLyrics) {
      result = result.filter((s) => s.lyrics !== null);
    }

    // Sortierung
    return [...result].sort((a, b) => {
      if (sortBy === 'year') return a.year - b.year;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      return 0;
    });
  }, [filters, sortBy]);

  // Filter aktualisieren
  function updateFilter<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // Alle Filter zurücksetzen
  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const hasActiveFilters =
    filters.search ||
    filters.genre ||
    filters.decade ||
    filters.difficulty ||
    filters.onlyOneHitWonders ||
    filters.onlyWithLyrics;

  // Statistiken
  const stats = useMemo(() => ({
    total: ALL_SONGS.length,
    easy: ALL_SONGS.filter((s) => s.difficulty === 'easy').length,
    medium: ALL_SONGS.filter((s) => s.difficulty === 'medium').length,
    hard: ALL_SONGS.filter((s) => s.difficulty === 'hard').length,
    oneHitWonders: ALL_SONGS.filter((s) => s.isOneHitWonder).length,
    withLyrics: ALL_SONGS.filter((s) => s.lyrics !== null).length,
  }), []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">🎵 Song-Browser</h1>
          <p className="text-gray-500 mt-1">
            {ALL_SONGS.length} Songs · Pack: Global Hits 1950–2026
          </p>

          {/* Statistik-Zeile */}
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { label: 'Leicht', value: stats.easy, color: 'green' },
              { label: 'Mittel', value: stats.medium, color: 'yellow' },
              { label: 'Schwer', value: stats.hard, color: 'red' },
              { label: 'One-Hit-Wonders', value: stats.oneHitWonders, color: 'orange' },
              { label: 'Mit Lyrics', value: stats.withLyrics, color: 'blue' },
            ].map((stat) => (
              <span
                key={stat.label}
                className={`px-3 py-1 rounded-full text-xs font-semibold bg-${stat.color}-50 text-${stat.color}-700`}
              >
                {stat.label}: {stat.value}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filter-Leiste */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {/* Suche */}
            <input
              type="search"
              placeholder="Suche nach Titel, Artist, Genre..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Genre */}
            <select
              value={filters.genre}
              onChange={(e) => updateFilter('genre', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alle Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Jahrzehnt */}
            <select
              value={filters.decade}
              onChange={(e) => updateFilter('decade', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alle Jahrzehnte</option>
              {decades.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Schwierigkeit */}
            <select
              value={filters.difficulty}
              onChange={(e) => updateFilter('difficulty', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Alle Schwierigkeiten</option>
              <option value="easy">Leicht</option>
              <option value="medium">Mittel</option>
              <option value="hard">Schwer</option>
            </select>

            {/* Sortierung */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'year' | 'title' | 'artist')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="year">Sortiert nach Jahr</option>
              <option value="title">Sortiert nach Titel</option>
              <option value="artist">Sortiert nach Artist</option>
            </select>
          </div>

          {/* Zweite Zeile: Checkboxen + Optionen */}
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.onlyOneHitWonders}
                onChange={(e) => updateFilter('onlyOneHitWonders', e.target.checked)}
                className="rounded"
              />
              Nur One-Hit-Wonders
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.onlyWithLyrics}
                onChange={(e) => updateFilter('onlyWithLyrics', e.target.checked)}
                className="rounded"
              />
              Nur Songs mit Lyrics
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHints}
                onChange={(e) => setShowHints(e.target.checked)}
                className="rounded"
              />
              Hints anzeigen
            </label>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Ergebnis-Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {filteredSongs.length === ALL_SONGS.length
              ? `Alle ${ALL_SONGS.length} Songs`
              : `${filteredSongs.length} von ${ALL_SONGS.length} Songs`}
          </p>
        </div>

        {/* Song-Grid */}
        {filteredSongs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium text-gray-600">Keine Songs gefunden</p>
            <p className="text-sm mt-1">Versuche andere Suchbegriffe oder Filter.</p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSongs.map((song) => (
              <SongCard key={song.id} song={song} showHints={showHints} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
