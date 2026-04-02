'use client';

/**
 * Admin-Tool: Song-Review & Delta-Export
 * Route: /admin/review
 *
 * Aufgaben:
 *  - Alle Songs aus allen Packs als übersichtliche Liste anzeigen
 *  - Songs inline bearbeiten (YouTube-Link, Schwierigkeit, Hints, …)
 *  - Änderungen in localStorage verfolgen
 *  - Delta-Export: nur geänderte Songs als JSON herunterladen
 *  - Vollexport: komplettes Pack als JSON herunterladen
 */

import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import type { PhomuSong } from '@/types/song';
import { ALL_SONGS } from '@/data/packs';

// ─── Typen ────────────────────────────────────────────────────────────────────

type Edits = Record<string, Partial<PhomuSong>>;
type SortField = 'year' | 'artist' | 'title' | 'pack';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'all' | 'complete' | 'incomplete' | 'stub' | 'modified';

// ─── Konstanten ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'phomu-review-edits';

// Songs added as stubs (empty hints, no YouTube) — these are the newly imported ones
function isStub(song: PhomuSong): boolean {
  return (
    (!song.links.youtube || song.links.youtube === '') &&
    song.hints.every((h) => h.trim() === '')
  );
}

function isComplete(song: PhomuSong): boolean {
  return !!(
    song.links.youtube &&
    !song.links.youtube.startsWith('TODO') &&
    song.hints.every((h) => h.trim() !== '') &&
    song.lyrics
  );
}

function hasYoutube(song: PhomuSong): boolean {
  return !!(song.links.youtube && !song.links.youtube.startsWith('TODO') && song.links.youtube !== '');
}

function hasHints(song: PhomuSong): boolean {
  return song.hints.every((h) => h.trim() !== '');
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadEdits(): Edits {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Edits) : {};
  } catch {
    return {};
  }
}

function saveEdits(edits: Edits): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch {
    /* ignore */
  }
}

// ─── Merge baseline + edits ───────────────────────────────────────────────────

function mergeSong(baseline: PhomuSong, edits: Edits): PhomuSong {
  const delta = edits[baseline.id];
  if (!delta) return baseline;
  return {
    ...baseline,
    ...delta,
    links: { ...baseline.links, ...(delta.links ?? {}) },
    hints: (delta.hints as PhomuSong['hints']) ?? baseline.hints,
  };
}

// ─── Unterkomponenten ─────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`}
      title={ok ? 'vorhanden' : 'fehlt'}
    />
  );
}

function Badge({
  children,
  color,
}: {
  children: ReactNode;
  color: 'green' | 'yellow' | 'blue' | 'gray' | 'orange';
}) {
  const cls = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-500',
    orange: 'bg-orange-100 text-orange-700',
  }[color];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

// ─── Inline-Editor für eine Zeile ─────────────────────────────────────────────

function InlineEditor({
  song,
  onSave,
  onClose,
}: {
  song: PhomuSong;
  onSave: (id: string, delta: Partial<PhomuSong>) => void;
  onClose: () => void;
}) {
  const [youtube, setYoutube] = useState(song.links.youtube ?? '');
  const [difficulty, setDifficulty] = useState<PhomuSong['difficulty']>(song.difficulty);
  const [isOneHitWonder, setIsOneHitWonder] = useState(song.isOneHitWonder);
  const [country, setCountry] = useState(song.country);
  const [genre, setGenre] = useState(song.genre);
  const [hints, setHints] = useState<string[]>([...song.hints]);

  function handleSave() {
    const delta: Partial<PhomuSong> = {
      difficulty,
      isOneHitWonder,
      country,
      genre,
      links: { ...song.links, youtube },
      hints: hints as PhomuSong['hints'],
    };
    onSave(song.id, delta);
    onClose();
  }

  return (
    <tr className="bg-blue-50 border-b-2 border-blue-200">
      <td colSpan={8} className="px-4 py-4">
        <div className="grid grid-cols-2 gap-4 max-w-3xl">
          {/* YouTube */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              YouTube-ID / URL
            </label>
            <input
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="z. B. dQw4w9WgXcQ"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Land (ISO)
            </label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="US"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Genre */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Genre</label>
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Schwierigkeit
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as PhomuSong['difficulty'])}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          {/* OneHitWonder */}
          <div className="flex items-center gap-2 col-span-2">
            <input
              type="checkbox"
              id={`ohw-${song.id}`}
              checked={isOneHitWonder}
              onChange={(e) => setIsOneHitWonder(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor={`ohw-${song.id}`} className="text-sm text-gray-700">
              One-Hit-Wonder
            </label>
          </div>
          {/* Hints */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Hints (Level 1 = schwer → Level 5 = leicht)
            </label>
            <div className="space-y-1">
              {hints.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-6 shrink-0">L{i + 1}</span>
                  <input
                    value={h}
                    onChange={(e) => {
                      const next = [...hints];
                      next[i] = e.target.value;
                      setHints(next);
                    }}
                    placeholder={`Hint Ebene ${i + 1}`}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded font-semibold hover:bg-blue-700"
          >
            Speichern
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50"
          >
            Abbrechen
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Tabellenzeile ────────────────────────────────────────────────────────────

function SongRow({
  song,
  isModified,
  isEditing,
  onEdit,
  onSave,
  onClose,
  onClearEdit,
}: {
  song: PhomuSong;
  isModified: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (id: string, delta: Partial<PhomuSong>) => void;
  onClose: () => void;
  onClearEdit: () => void;
}) {
  const complete = isComplete(song);
  const yt = hasYoutube(song);
  const hints = hasHints(song);
  const stub = isStub(song);

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm ${
          isEditing ? 'bg-blue-50' : isModified ? 'bg-amber-50' : ''
        }`}
      >
        <td className="px-3 py-2 text-gray-500 tabular-nums">{song.year}</td>
        <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">
          {song.artist}
        </td>
        <td className="px-3 py-2 text-gray-700 max-w-[220px] truncate" title={song.title}>
          {song.title}
        </td>
        <td className="px-3 py-2 text-gray-500 text-xs max-w-[120px] truncate" title={song.pack}>
          {song.pack}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-2 items-center">
            <span title="YouTube"><StatusDot ok={yt} /></span>
            <span title="Hints"><StatusDot ok={hints} /></span>
            <span title="Lyrics"><StatusDot ok={song.lyrics !== null} /></span>
          </div>
        </td>
        <td className="px-3 py-2">
          {complete ? (
            <Badge color="green">Fertig</Badge>
          ) : stub ? (
            <Badge color="orange">Stub</Badge>
          ) : (
            <Badge color="yellow">Unvollst.</Badge>
          )}
          {isModified && (
            <span className="ml-1">
              <Badge color="blue">Geändert</Badge>
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="px-2 py-0.5 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
            >
              {isEditing ? 'Schließen' : 'Bearbeiten'}
            </button>
            {isModified && (
              <button
                onClick={onClearEdit}
                className="px-2 py-0.5 text-xs border border-gray-300 text-gray-500 rounded hover:bg-gray-50"
                title="Lokale Änderung zurücksetzen"
              >
                ×
              </button>
            )}
          </div>
        </td>
      </tr>
      {isEditing && (
        <InlineEditor song={song} onSave={onSave} onClose={onClose} />
      )}
    </>
  );
}

// ─── Haupt-Seite ───────────────────────────────────────────────────────────────

export default function AdminReviewPage() {
  const [edits, setEdits] = useState<Edits>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPack, setFilterPack] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // Load edits from localStorage on mount
  useEffect(() => {
    setEdits(loadEdits());
  }, []);

  // All available packs
  const availablePacks = useMemo(
    () => Array.from(new Set(ALL_SONGS.map((s) => s.pack))).sort(),
    []
  );

  // Merged songs (baseline + edits)
  const mergedSongs = useMemo(
    () => ALL_SONGS.map((s) => mergeSong(s, edits)),
    [edits]
  );

  // Filter + sort
  const displaySongs = useMemo(() => {
    let list = mergedSongs;

    if (filterPack !== 'all') list = list.filter((s) => s.pack === filterPack);

    if (filterStatus === 'complete') list = list.filter(isComplete);
    else if (filterStatus === 'incomplete') list = list.filter((s) => !isComplete(s));
    else if (filterStatus === 'stub') list = list.filter(isStub);
    else if (filterStatus === 'modified') list = list.filter((s) => !!edits[s.id]);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.id.includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'year') cmp = a.year - b.year;
      else if (sortField === 'artist') cmp = a.artist.localeCompare(b.artist);
      else if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'pack') cmp = a.pack.localeCompare(b.pack);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [mergedSongs, edits, filterPack, filterStatus, search, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const all = mergedSongs;
    return {
      total: all.length,
      complete: all.filter(isComplete).length,
      withYT: all.filter(hasYoutube).length,
      stubs: all.filter(isStub).length,
      modified: Object.keys(edits).length,
    };
  }, [mergedSongs, edits]);

  // Save edit
  const handleSave = useCallback((id: string, delta: Partial<PhomuSong>) => {
    setEdits((prev) => {
      const next = { ...prev, [id]: delta };
      saveEdits(next);
      return next;
    });
    setSavedMsg('Änderung gespeichert');
    setTimeout(() => setSavedMsg(''), 2500);
  }, []);

  // Clear single edit
  const handleClearEdit = useCallback((id: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      saveEdits(next);
      return next;
    });
  }, []);

  // Toggle sort
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="opacity-30">↕</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  // ─── Export: nur geänderte Songs ─────────────────────────────────────────────

  function handleExportDelta() {
    const changedIds = Object.keys(edits);
    if (changedIds.length === 0) {
      alert('Keine lokalen Änderungen vorhanden.');
      return;
    }

    // Group changed songs by pack
    const byPack: Record<string, PhomuSong[]> = {};
    mergedSongs.forEach((s) => {
      if (edits[s.id]) {
        if (!byPack[s.pack]) byPack[s.pack] = [];
        byPack[s.pack].push(s);
      }
    });

    const exportData = {
      meta: {
        exportType: 'delta',
        exportedAt: new Date().toISOString(),
        changedSongCount: changedIds.length,
        packs: Object.keys(byPack),
      },
      changes: Object.entries(byPack).map(([pack, songs]) => ({
        pack,
        songs,
      })),
    };

    // eslint-disable-next-line react-hooks/purity
    downloadJson(exportData, `phomu-delta-${Date.now()}.json`);
  }

  // ─── Export: vollständiges Pack ───────────────────────────────────────────────

  function handleExportPack(packName: string) {
    const songs = mergedSongs.filter((s) => s.pack === packName);
    const exportData = {
      meta: {
        pack: packName,
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        songCount: songs.length,
      },
      songs,
    };
    const filename = packName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-export.json';
    downloadJson(exportData, filename);
  }

  // ─── Export: alle Packs ────────────────────────────────────────────────────

  function handleExportAll() {
    const exportData = {
      meta: {
        exportType: 'full',
        exportedAt: new Date().toISOString(),
        songCount: mergedSongs.length,
      },
      songs: mergedSongs,
    };
    // eslint-disable-next-line react-hooks/purity
    downloadJson(exportData, `phomu-all-songs-${Date.now()}.json`);
  }

  function downloadJson(data: unknown, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Reset all edits
  function handleResetAll() {
    if (!confirm('Alle lokalen Änderungen verwerfen?')) return;
    setEdits({});
    saveEdits({});
    setSavedMsg('Alle Änderungen zurückgesetzt');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phomu Admin – Song-Review</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Songs prüfen, bearbeiten und Änderungen exportieren
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {savedMsg && (
              <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                {savedMsg}
              </span>
            )}
            {stats.modified > 0 && (
              <button
                onClick={handleResetAll}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                ↺ Reset ({stats.modified})
              </button>
            )}
            <button
              onClick={handleExportDelta}
              className={`px-3 py-1.5 text-sm rounded-lg font-semibold transition-colors ${
                stats.modified > 0
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Nur die lokal geänderten Songs exportieren"
            >
              ⬇ Delta ({stats.modified})
            </button>
            <button
              onClick={handleExportAll}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              title="Alle Songs aller Packs exportieren"
            >
              ⬇ Alle Songs
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Songs gesamt', value: stats.total, color: 'text-gray-900' },
            { label: 'Vollständig', value: `${stats.complete} / ${stats.total}`, color: 'text-green-700' },
            { label: 'YouTube OK', value: `${stats.withYT} / ${stats.total}`, color: 'text-blue-700' },
            { label: 'Stubs (leer)', value: stats.stubs, color: 'text-orange-600' },
            { label: 'Geändert', value: stats.modified, color: 'text-amber-700' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter-Bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="search"
            placeholder="Suche nach Titel, Artist, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">Alle Status</option>
            <option value="stub">Stubs (leer)</option>
            <option value="incomplete">Unvollständig</option>
            <option value="complete">Fertig</option>
            <option value="modified">Geändert (lokal)</option>
          </select>
          <select
            value={filterPack}
            onChange={(e) => setFilterPack(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[260px]"
          >
            <option value="all">Alle Packs</option>
            {availablePacks.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {filterPack !== 'all' && (
            <button
              onClick={() => handleExportPack(filterPack)}
              className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              title={`Komplettes Pack "${filterPack}" exportieren`}
            >
              ⬇ Pack exportieren
            </button>
          )}
        </div>

        {/* Tabelle */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('year')}
                >
                  Jahr <SortIcon field="year" />
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('artist')}
                >
                  Artist <SortIcon field="artist" />
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('title')}
                >
                  Titel <SortIcon field="title" />
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('pack')}
                >
                  Pack <SortIcon field="pack" />
                </th>
                <th className="px-3 py-2">
                  <span title="YouTube · Hints · Lyrics">YT·H·L</span>
                </th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {displaySongs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Keine Songs gefunden.
                  </td>
                </tr>
              ) : (
                displaySongs.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    isModified={!!edits[song.id]}
                    isEditing={editingId === song.id}
                    onEdit={() => setEditingId(editingId === song.id ? null : song.id)}
                    onSave={handleSave}
                    onClose={() => setEditingId(null)}
                    onClearEdit={() => handleClearEdit(song.id)}
                  />
                ))
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
            <span>
              {displaySongs.length} von {mergedSongs.length} Songs
            </span>
            <span className="flex gap-4">
              <span>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
                vorhanden
              </span>
              <span>
                <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />
                fehlt
              </span>
            </span>
          </div>
        </div>

        {/* Legende */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Badge color="orange">Stub</Badge> Neu hinzugefügt, noch leer
          </span>
          <span className="flex items-center gap-1">
            <Badge color="yellow">Unvollst.</Badge> Teilweise ausgefüllt
          </span>
          <span className="flex items-center gap-1">
            <Badge color="green">Fertig</Badge> YouTube + Hints + Lyrics vorhanden
          </span>
          <span className="flex items-center gap-1">
            <Badge color="blue">Geändert</Badge> Lokale Änderung (noch nicht im Repo)
          </span>
          <span className="ml-auto">
            <strong>Delta-Export</strong>: Nur lokal geänderte Songs → als JSON herunterladen →
            in Repo einfügen
          </span>
        </div>
      </div>
    </div>
  );
}
