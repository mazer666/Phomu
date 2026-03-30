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

import { useState, useEffect, useCallback } from 'react';
import type { PhomuSong } from '@/types/song';
import globalHitsRaw from '@/data/packs/global-hits.json';

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
  lyrics: null,
  isOneHitWonder: false,
  links: { youtube: '' },
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
  return globalHitsRaw.songs as unknown as AdminSong[];
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

// ─── Haupt-Bearbeitungsformular ───────────────────────────────────────────────

function SongEditor({
  song,
  onSave,
  onCancel,
}: {
  song: AdminSong;
  onSave: (updated: AdminSong) => void;
  onCancel: () => void;
}) {
  // Lokaler Zustand für alle Felder
  const [form, setForm] = useState<AdminSong>({ ...song });

  // Lyrics werden als Strings im Formular bearbeitet
  const [lyricsReal0, setLyricsReal0] = useState(song.lyrics?.real[0] ?? '');
  const [lyricsReal1, setLyricsReal1] = useState(song.lyrics?.real[1] ?? '');
  const [lyricsReal2, setLyricsReal2] = useState(song.lyrics?.real[2] ?? '');
  const [lyricsFake, setLyricsFake] = useState(song.lyrics?.fake ?? '');

  // Mood als kommagetrennte Eingabe
  const [moodInput, setMoodInput] = useState(song.mood.join(', '));

  /** Hint-Felder updaten */
  function updateHint(index: number, value: string) {
    const newHints = [...form.hints] as [string, string, string, string, string];
    newHints[index] = value;
    setForm((prev) => ({ ...prev, hints: newHints }));
  }

  /** Speichern: Formular-Daten zusammenbauen und weitergeben */
  function handleSave() {
    // Lyrics: null wenn alle Felder leer, sonst Objekt
    const hasLyrics =
      lyricsReal0.trim() || lyricsReal1.trim() || lyricsReal2.trim() || lyricsFake.trim();

    const lyrics: AdminSong['lyrics'] = hasLyrics
      ? {
          real: [lyricsReal0, lyricsReal1, lyricsReal2],
          fake: lyricsFake,
        }
      : null;

    // Mood: kommagetrennte Eingabe aufsplitten
    const mood = moodInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    onSave({ ...form, lyrics, mood });
  }

  // Eingabefeld-Hilfsfunktion
  function field(
    label: string,
    value: string | number,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; type?: string; required?: boolean }
  ) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
          {opts?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={opts?.type ?? 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={opts?.placeholder}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">
          ✏️ Song bearbeiten
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ✕ Schließen
        </button>
      </div>

      {/* Basis-Felder */}
      <div className="grid grid-cols-2 gap-3">
        {field('ID', form.id, (v) => setForm((p) => ({ ...p, id: v })), {
          placeholder: 'z.B. beatles-hey-jude-1968',
          required: true,
        })}
        {field('Titel', form.title, (v) => setForm((p) => ({ ...p, title: v })), {
          required: true,
        })}
        {field('Künstler', form.artist, (v) => setForm((p) => ({ ...p, artist: v })), {
          required: true,
        })}
        {field('Jahr', form.year, (v) => setForm((p) => ({ ...p, year: parseInt(v) || p.year })), {
          type: 'number',
          required: true,
        })}
        {field('Land (ISO)', form.country, (v) =>
          setForm((p) => ({ ...p, country: v.toUpperCase() })), {
          placeholder: 'z.B. DE, US, GB',
          required: true,
        })}
        {field('Genre', form.genre, (v) => setForm((p) => ({ ...p, genre: v })), {
          placeholder: 'z.B. Pop, Rock, R&B',
          required: true,
        })}
      </div>

      {/* Difficulty und OneHitWonder */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Schwierigkeit <span className="text-red-500">*</span>
          </label>
          <select
            value={form.difficulty}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                difficulty: e.target.value as 'easy' | 'medium' | 'hard',
              }))
            }
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="easy">easy – leicht erkennbar</option>
            <option value="medium">medium – bekannt aber nicht trivial</option>
            <option value="hard">hard – eher für Musikfans</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            One-Hit-Wonder?
          </label>
          <select
            value={form.isOneHitWonder ? 'true' : 'false'}
            onChange={(e) =>
              setForm((p) => ({ ...p, isOneHitWonder: e.target.value === 'true' }))
            }
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="false">Nein – hatte mehrere Hits</option>
            <option value="true">Ja – hauptsächlich dieser eine Hit</option>
          </select>
        </div>
      </div>

      {/* Mood */}
      {field(
        'Stimmungen (Mood)',
        moodInput,
        setMoodInput,
        { placeholder: 'z.B. Dance Floor, Heartbreak, Road Trip' }
      )}
      <p className="text-xs text-gray-400 -mt-4">
        Mehrere Stimmungen mit Komma trennen.
      </p>

      {/* Pack */}
      {field('Pack', form.pack, (v) => setForm((p) => ({ ...p, pack: v })), {
        required: true,
      })}

      {/* YouTube-Link */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          YouTube <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.links.youtube}
          onChange={(e) =>
            setForm((p) => ({ ...p, links: { ...p.links, youtube: e.target.value } }))
          }
          placeholder="11-stellige Video-ID, z.B. dQw4w9WgXcQ"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {form.links.youtube && !form.links.youtube.startsWith('TODO:') && (
          <a
            href={`https://www.youtube.com/watch?v=${form.links.youtube}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            ▶ YouTube öffnen
          </a>
        )}
      </div>

      {/* Hints */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">
          Hints (5 Stück, von schwierig → einfach) <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400">
          Hint 1 = 5 Punkte (schwierig/historisch) · Hint 5 = 1 Punkt (fast zu einfach)
        </p>
        {form.hints.map((hint, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs font-bold text-gray-400 mt-2 w-6 shrink-0">
              {i + 1}
            </span>
            <textarea
              value={hint}
              onChange={(e) => updateHint(i, e.target.value)}
              placeholder={`Hint ${i + 1}: ${i === 0 ? 'Historischer/obskurer Fakt' : i === 4 ? 'Fast zu einfach' : 'Musiktrivia'}`}
              rows={2}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        ))}
      </div>

      {/* Lyrics */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">
          Lyrics (Lyrics-Labyrinth-Modus)
        </label>
        <p className="text-xs text-gray-400">
          3 echte Zeilen aus dem Song + 1 erfundene Zeile (die KI-gefälschte). Leer lassen = später eintragen.
        </p>
        <div className="bg-green-50 rounded p-3 space-y-2">
          <p className="text-xs font-semibold text-green-700">Echte Zeilen (3 Stück)</p>
          {[
            [lyricsReal0, setLyricsReal0],
            [lyricsReal1, setLyricsReal1],
            [lyricsReal2, setLyricsReal2],
          ].map(([val, setter], i) => (
            <input
              key={i}
              type="text"
              value={val as string}
              onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
              placeholder={`Echte Zeile ${i + 1}`}
              className="w-full border border-green-200 bg-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          ))}
        </div>
        <div className="bg-red-50 rounded p-3">
          <p className="text-xs font-semibold text-red-700 mb-2">Gefälschte Zeile (1 Stück)</p>
          <input
            type="text"
            value={lyricsFake}
            onChange={(e) => setLyricsFake(e.target.value)}
            placeholder="Erfundene Zeile, die plausibel klingt aber falsch ist"
            className="w-full border border-red-200 bg-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      </div>

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          💾 Speichern
        </button>
        <button
          onClick={onCancel}
          className="px-4 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ─── Haupt-Seite ───────────────────────────────────────────────────────────────

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCompleteness, setFilterCompleteness] = useState<FilterCompleteness>('all');
  const [filterPack, setFilterPack] = useState<FilterPack>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  // Beim ersten Render: Songs aus localStorage oder JSON laden
  useEffect(() => {
    setSongs(loadSongsFromStorage());
  }, []);

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
        const next = prev.map((s) => (s.id === updated.id ? updated : s));
        // Wenn neuer Song (ID noch nicht vorhanden)
        if (!prev.find((s) => s.id === updated.id)) {
          next.push(updated);
        }
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

          {/* Rechte Spalte: Bearbeitungsformular */}
          <div className="w-[480px] shrink-0">
            {selectedSong ? (
              <SongEditor
                key={selectedSong.id}
                song={selectedSong}
                onSave={handleSave}
                onCancel={() => setSelectedId(null)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <p className="text-4xl mb-3">🎵</p>
                <p className="font-medium">Song aus der Liste auswählen</p>
                <p className="text-sm mt-1">
                  Klicke auf einen Song links, um ihn zu bearbeiten.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
