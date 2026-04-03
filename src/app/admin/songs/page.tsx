'use client';

/**
 * Admin-Tool: Song-Verwaltung
 * Route: /admin/songs
 *
 * Hier kannst du:
 *  - Songs aus dem global-hits.json anzeigen
 *  - Lyrics und YouTube-Links manuell eintippen / bearbeiten
 *  - Daten in localStorage speichern
 *  - Als JSON exportieren
 *  - Nach Pack und Vollständigkeit filtern
 */

import { useState, useCallback } from 'react';
import type { PhomuSong } from '@/types/song';
import globalHitsRaw from '@/data/packs/global-hits.json';
import { SongEditor } from '@/components/admin/SongEditor';

// ─── Typen ────────────────────────────────────────────────────────────────────

/**
 * Im Admin-Tool verwenden wir PhomuSong, aber lyrics darf null sein.
 * Diese Version wird lokal gespeichert und exportiert.
 */
type AdminSong = PhomuSong;

type FilterCompleteness = 'all' | 'complete' | 'incomplete';
type FilterPack = 'all' | string;

// ─── Konstanten ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'phomu-admin-songs';

/** Leeres Song-Template für ein neues Formular */
const EMPTY_SONG: AdminSong = {
  id: '',
  title: '',
  artist: '',
  year: new Date().getFullYear(),
  country: '',
  genre: '',
  difficulty: 'medium',
  mood: [],
  pack: 'Global Hits 1950-2026',
  hints: ['', '', '', '', ''],
  hintEvidence: ['', '', '', '', ''],
  lyrics: null,
  isOneHitWonder: false,
  links: { youtube: '' },
  supportedModes: ['timeline', 'hint-master', 'vibe-check', 'cover-confusion', 'survivor'],
  isQRCompatible: true,
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Prüft ob ein Song vollständig ist (keine null-Felder, alle Pflichtfelder) */
function isSongComplete(song: AdminSong): boolean {
  if (!song.id || !song.title || !song.artist) return false;
  if (!song.links.youtube || song.links.youtube.startsWith('TODO:')) return false;
  if (!song.lyrics) return false;
  if (!song.hints.every((h) => h.trim() !== '')) return false;
  return true;
}


function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(feat\.?|ft\.?|featuring|remaster(ed)?|version|edit|radio mix|live)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function duplicateKey(song: AdminSong): string {
  return `${normalizeText(song.artist)}::${normalizeText(song.title)}::${song.year}`;
}

function hasHintSpoiler(song: AdminSong): boolean {
  const tokens = new Set([
    ...normalizeText(song.title).split(' ').filter((t) => t.length >= 4),
    ...normalizeText(song.artist).split(' ').filter((t) => t.length >= 4),
  ]);

  return song.hints.some((hint) => {
    const h = normalizeText(hint);
    return [...tokens].some((token) => token && h.includes(token));
  });
}

function hasVerifiableHints(song: AdminSong): boolean {
  if (!song.hintEvidence || song.hintEvidence.length !== 5) return false;
  return song.hintEvidence.every((url) => typeof url === 'string' && /^https?:\/\//.test(url));
}

/** Lädt Songs aus localStorage (falls vorhanden), sonst aus dem JSON */
function loadSongsFromStorage(): AdminSong[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AdminSong[];
    }
  } catch {
    // localStorage nicht verfügbar oder beschädigt → Fallback auf JSON
  }
  // Typkonvertierung: JSON hat lyrics: null, was unser Typ erlaubt
  return (globalHitsRaw.songs as unknown as AdminSong[]) || [];
}

/** Speichert Songs in localStorage */
function saveSongsToStorage(songs: AdminSong[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {
    console.error('[Admin] Konnte nicht in localStorage speichern.');
  }
}

// ─── Unterkomponenten ─────────────────────────────────────────────────────────

/** Badge: zeigt ob ein Song vollständig oder unvollständig ist */
function CompletenessBadge({ complete }: { complete: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        complete
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {complete ? '✓ Fertig' : '⚠ Unvollständig'}
    </span>
  );
}

/** Einzelne Zeile in der Song-Übersicht */
function SongRow({
  song,
  isSelected,
  onSelect,
}: {
  song: AdminSong;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const complete = isSongComplete(song);
  const hasLyrics = song.lyrics !== null;
  const hasYoutube = !!song.links.youtube && !song.links.youtube.startsWith('TODO:');

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors ${
        isSelected ? 'bg-blue-100' : ''
      }`}
    >
      <td className="px-3 py-2 text-sm font-medium text-gray-900 max-w-[200px] truncate">
        {song.title}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 max-w-[150px] truncate">
        {song.artist}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">{song.year}</td>
      <td className="px-3 py-2 text-sm text-gray-500">{song.pack}</td>
      <td className="px-3 py-2">
        <CompletenessBadge complete={complete} />
      </td>
      <td className="px-3 py-2">
        <span className={`text-xs ${hasLyrics ? 'text-green-600' : 'text-gray-400'}`}>
          {hasLyrics ? '✓' : '✗'} Lyrics
        </span>
        {'  '}
        <span className={`text-xs ${hasYoutube ? 'text-green-600' : 'text-gray-400'}`}>
          {hasYoutube ? '✓' : '✗'} YT
        </span>
      </td>
    </tr>
  );
}
// ─── Haupt-Seite ───────────────────────────────────────────────────────────────

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<AdminSong[]>(() => loadSongsFromStorage());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCompleteness, setFilterCompleteness] = useState<FilterCompleteness>('all');
  const [filterPack, setFilterPack] = useState<FilterPack>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedMessage, setSavedMessage] = useState('');


  // Alle verfügbaren Packs aus den Songs ermitteln
  const availablePacks = Array.from(new Set(songs.map((s) => s.pack)));

  // Gefilterte Song-Liste
  const filteredSongs = songs.filter((song) => {
    if (filterPack !== 'all' && song.pack !== filterPack) return false;
    if (filterCompleteness === 'complete' && !isSongComplete(song)) return false;
    if (filterCompleteness === 'incomplete' && isSongComplete(song)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Song speichern (Update in der Liste)
  const handleSave = useCallback(
    (updated: AdminSong) => {
      setSongs((prev) => {
        const isExisting = prev.some((s) => s.id === updated.id);
        const baseline = isExisting ? prev.filter((s) => s.id !== updated.id) : prev;

        // Duplicate Policy A: global strikt
        const newKey = duplicateKey(updated);
        const duplicate = baseline.find((s) => duplicateKey(s) === newKey || s.id === updated.id);
        if (duplicate) {
          alert(`Duplikat erkannt: ${duplicate.artist} – ${duplicate.title} (${duplicate.year})`);
          return prev;
        }

        // Hint Quality Gates
        if (hasHintSpoiler(updated)) {
          alert('Speichern blockiert: Hint enthält Spoiler (Titel/Artist-Token).');
          return prev;
        }
        if (!hasVerifiableHints(updated)) {
          alert('Speichern blockiert: Jeder Hint braucht eine prüfbare Evidenz-URL.');
          return prev;
        }

        const next = [...baseline, updated];
        saveSongsToStorage(next);
        return next;
      });
      setSavedMessage(`✓ "${updated.title}" gespeichert`);
      setTimeout(() => setSavedMessage(''), 3000);
    },
    []
  );

  // JSON-Export: alle Songs als Download anbieten
  function handleExport() {
    const exportData = {
      meta: {
        pack: 'Global Hits 1950-2026',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        songCount: songs.length,
      },
      songs,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'global-hits-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // localStorage zurücksetzen (auf JSON-Ursprungsdaten)
  function handleReset() {
    if (!confirm('Alle lokalen Änderungen verwerfen und vom Original-JSON laden?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setSongs(globalHitsRaw.songs as unknown as AdminSong[]);
    setSelectedId(null);
  }

  const selectedSong = songs.find((s) => s.id === selectedId) ?? null;
  const completeCount = songs.filter(isSongComplete).length;
  const withLyrics = songs.filter((s) => s.lyrics !== null).length;
  const withYoutube = songs.filter(
    (s) => s.links.youtube && !s.links.youtube.startsWith('TODO:')
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎵 Phomu Admin – Songs</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Lyrics und YouTube-Links manuell einpflegen
            </p>
          </div>
          <div className="flex gap-3">
            {savedMessage && (
              <span className="text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                {savedMessage}
              </span>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ↺ Reset
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              ⬇ JSON exportieren
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Statistik-Karten */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Songs gesamt', value: songs.length, color: 'blue' },
            { label: 'Vollständig', value: `${completeCount} / ${songs.length}`, color: 'green' },
            { label: 'Mit Lyrics', value: `${withLyrics} / ${songs.length}`, color: 'purple' },
            { label: 'YouTube OK', value: `${withYoutube} / ${songs.length}`, color: 'red' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Linke Spalte: Liste + Filter */}
          <div className="flex-1 min-w-0">
            {/* Filter-Leiste */}
            <div className="flex gap-3 mb-4">
              <input
                type="search"
                placeholder="Suche nach Titel, Artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <select
                value={filterCompleteness}
                onChange={(e) => setFilterCompleteness(e.target.value as FilterCompleteness)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">Alle</option>
                <option value="incomplete">Unvollständig</option>
                <option value="complete">Fertig</option>
              </select>
              <select
                value={filterPack}
                onChange={(e) => setFilterPack(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">Alle Packs</option>
                {availablePacks.map((pack) => (
                  <option key={pack} value={pack}>
                    {pack}
                  </option>
                ))}
              </select>
            </div>

            {/* Song-Tabelle */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Titel</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Artist</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Jahr</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Pack</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                        Keine Songs gefunden.
                      </td>
                    </tr>
                  ) : (
                    filteredSongs.map((song) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        isSelected={selectedId === song.id}
                        onSelect={() =>
                          setSelectedId(selectedId === song.id ? null : song.id)
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
                {filteredSongs.length} von {songs.length} Songs angezeigt
              </div>
            </div>
          </div>

          <div className="w-[480px] shrink-0">
            {selectedSong ? (
              <SongEditor
                key={selectedSong.id}
                song={selectedSong}
                onSave={handleSave}
                onCancel={() => setSelectedId(null)}
                variant="inline"
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <p className="text-4xl mb-3">🎵</p>
                <p className="font-medium">Kein Song ausgewählt</p>
                <p className="text-sm mt-1">
                  Wähle links einen Song aus oder lege einen neuen Song an.
                </p>
                <button
                  onClick={() => {
                    const draftSong: AdminSong = {
                      ...EMPTY_SONG,
                      id: `draft-${Date.now()}`,
                      title: 'Neuer Song',
                    };
                    setSongs((prev) => [draftSong, ...prev]);
                    setSelectedId(draftSong.id);
                  }}
                  className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  + Neuen Song starten
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
