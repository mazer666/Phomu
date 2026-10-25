'use client';

/**
 * Admin tool: song review & delta export
 * Route: /admin/review
 *
 * Tasks:
 *  - Show all songs from all packs as a clear list
 *  - Edit songs inline (YouTube link, difficulty, hints, …)
 *  - Track changes in localStorage
 *  - Delta export: download only the changed songs as JSON
 *  - Full export: download the complete pack as JSON
 */

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { PhomuSong } from '@/types/song';
import { ALL_SONGS, AVAILABLE_PACKS } from '@/data/songs';

// ─── Types ────────────────────────────────────────────────────────────────────

type Edits = Record<string, Partial<PhomuSong>>;
type SortField = 'year' | 'artist' | 'title' | 'pack';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'all' | 'complete' | 'incomplete' | 'stub' | 'modified';

// ─── Constants ───────────────────────────────────────────────────────────────

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
  return !!(
    song.links.youtube &&
    !song.links.youtube.startsWith('TODO') &&
    song.links.youtube !== ''
  );
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

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`}
      title={ok ? t('admin.review.present') : t('admin.review.missing')}
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
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

// ─── Inline editor for a single row ─────────────────────────────────────────────

function InlineEditor({
  song,
  onSave,
  onClose,
}: {
  song: PhomuSong;
  onSave: (id: string, delta: Partial<PhomuSong>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [youtube, setYoutube] = useState(song.links.youtube ?? '');
  const [difficulty, setDifficulty] = useState<PhomuSong['difficulty']>(
    song.difficulty
  );
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
              {t('admin.review.fieldYoutube')}
            </label>
            <input
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder={t('admin.review.youtubePlaceholder')}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('admin.review.fieldCountry')}
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('admin.review.fieldGenre')}
            </label>
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('admin.review.fieldDifficulty')}
            </label>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as PhomuSong['difficulty'])
              }
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="easy">{t('admin.review.difficultyEasy')}</option>
              <option value="medium">
                {t('admin.review.difficultyMedium')}
              </option>
              <option value="hard">{t('admin.review.difficultyHard')}</option>
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
              {t('admin.review.fieldOneHitWonder')}
            </label>
          </div>
          {/* Hints */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {t('admin.review.fieldHints')}
            </label>
            <div className="space-y-1">
              {hints.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-6 shrink-0">
                    {t('admin.review.hintPlaceholder', { level: i + 1 })}
                  </span>
                  <input
                    value={h}
                    onChange={(e) => {
                      const next = [...hints];
                      next[i] = e.target.value;
                      setHints(next);
                    }}
                    placeholder={t('admin.review.hintPlaceholder', {
                      level: i + 1,
                    })}
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
            {t('common.save')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────

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
  const { t } = useTranslation();
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
        <td
          className="px-3 py-2 text-gray-700 max-w-[220px] truncate"
          title={song.title}
        >
          {song.title}
        </td>
        <td
          className="px-3 py-2 text-gray-500 text-xs max-w-[120px] truncate"
          title={song.packs.join(', ')}
        >
          {song.packs[0]}
          {song.packs.length > 1 &&
            ` ${t('admin.review.additionalPacks', { count: song.packs.length - 1 })}`}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-2 items-center">
            <span title={t('admin.review.columnYoutube')}>
              <StatusDot ok={yt} />
            </span>
            <span title={t('admin.review.columnHints')}>
              <StatusDot ok={hints} />
            </span>
            <span title={t('admin.review.columnLyrics')}>
              <StatusDot ok={song.lyrics !== null} />
            </span>
          </div>
        </td>
        <td className="px-3 py-2">
          {complete ? (
            <Badge color="green">{t('admin.review.statusComplete')}</Badge>
          ) : stub ? (
            <Badge color="orange">{t('admin.review.statusStub')}</Badge>
          ) : (
            <Badge color="yellow">{t('admin.review.statusIncomplete')}</Badge>
          )}
          {isModified && (
            <span className="ml-1">
              <Badge color="blue">{t('admin.review.statusModified')}</Badge>
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="px-2 py-0.5 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
            >
              {isEditing ? t('common.close') : t('admin.review.edit')}
            </button>
            {isModified && (
              <button
                onClick={onClearEdit}
                className="px-2 py-0.5 text-xs border border-gray-300 text-gray-500 rounded hover:bg-gray-50"
                title={t('admin.review.resetEditTitle')}
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminReviewPage() {
  const { t, i18n } = useTranslation();
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
  const availablePacks = useMemo(() => AVAILABLE_PACKS.sort(), []);

  // Merged songs (baseline + edits)
  const mergedSongs = useMemo(
    () => ALL_SONGS.map((s) => mergeSong(s, edits)),
    [edits]
  );

  // Filter + sort
  const displaySongs = useMemo(() => {
    let list = mergedSongs;

    if (filterPack !== 'all')
      list = list.filter((s) => s.packs.includes(filterPack));

    if (filterStatus === 'complete') list = list.filter(isComplete);
    else if (filterStatus === 'incomplete')
      list = list.filter((s) => !isComplete(s));
    else if (filterStatus === 'stub') list = list.filter(isStub);
    else if (filterStatus === 'modified')
      list = list.filter((s) => !!edits[s.id]);

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
      else if (sortField === 'pack')
        cmp = (a.packs[0] || '').localeCompare(b.packs[0] || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    mergedSongs,
    edits,
    filterPack,
    filterStatus,
    search,
    sortField,
    sortDir,
  ]);

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
  const handleSave = useCallback(
    (id: string, delta: Partial<PhomuSong>) => {
      setEdits((prev) => {
        const next = { ...prev, [id]: delta };
        saveEdits(next);
        return next;
      });
      setSavedMsg(t('admin.review.savedMessage'));
      setTimeout(() => setSavedMsg(''), 2500);
    },
    [t]
  );

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

  // ─── Export: only changed songs ─────────────────────────────────────────────

  function handleExportDelta() {
    const changedIds = Object.keys(edits);
    if (changedIds.length === 0) {
      alert(t('admin.review.noChangesAlert'));
      return;
    }

    // Group changed songs by pack
    const byPack: Record<string, PhomuSong[]> = {};
    mergedSongs.forEach((s) => {
      if (edits[s.id]) {
        // Delta export should probably go into all its packs or just a "review" pack.
        // For simplicity, we'll keep the first pack as the target for the delta.
        const targetPack = s.packs[0] || t('admin.review.unassigned');
        if (!byPack[targetPack]) byPack[targetPack] = [];
        byPack[targetPack].push(s);
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

  // ─── Export: complete pack ───────────────────────────────────────────────

  function handleExportPack(packName: string) {
    const songs = mergedSongs.filter((s) => s.packs.includes(packName));
    const exportData = {
      meta: {
        pack: packName,
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        songCount: songs.length,
      },
      songs,
    };
    const filename =
      packName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '-export.json';
    downloadJson(exportData, filename);
  }

  // ─── Export: all packs ────────────────────────────────────────────────────

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
    if (!confirm(t('admin.review.resetConfirm'))) return;
    setEdits({});
    saveEdits({});
    setSavedMsg(t('admin.review.resetMessage'));
    setTimeout(() => setSavedMsg(''), 2500);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  // Numbers are formatted for the active locale (Intl, active language)
  const numberFormat = new Intl.NumberFormat(i18n.language);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('admin.review.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('admin.review.subtitle')}
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
                {t('admin.review.resetButton', { count: stats.modified })}
              </button>
            )}
            <button
              onClick={handleExportDelta}
              className={`px-3 py-1.5 text-sm rounded-lg font-semibold transition-colors ${
                stats.modified > 0
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={t('admin.review.exportDeltaTitle')}
            >
              {t('admin.review.deltaButton', { count: stats.modified })}
            </button>
            <button
              onClick={handleExportAll}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              title={t('admin.review.exportAllTitle')}
            >
              {t('admin.review.exportAllButton')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            {
              label: t('admin.review.statTotal'),
              value: numberFormat.format(stats.total),
              color: 'text-gray-900',
            },
            {
              label: t('admin.review.statComplete'),
              value: `${numberFormat.format(stats.complete)} / ${numberFormat.format(stats.total)}`,
              color: 'text-green-700',
            },
            {
              label: t('admin.review.statYoutube'),
              value: `${numberFormat.format(stats.withYT)} / ${numberFormat.format(stats.total)}`,
              color: 'text-blue-700',
            },
            {
              label: t('admin.review.statStubs'),
              value: numberFormat.format(stats.stubs),
              color: 'text-orange-600',
            },
            {
              label: t('admin.review.statModified'),
              value: numberFormat.format(stats.modified),
              color: 'text-amber-700',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <p className="text-xs text-gray-500 uppercase font-semibold">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="search"
            placeholder={t('admin.review.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">{t('admin.review.filterAllStatus')}</option>
            <option value="stub">{t('admin.review.filterStub')}</option>
            <option value="incomplete">
              {t('admin.review.filterIncomplete')}
            </option>
            <option value="complete">{t('admin.review.filterComplete')}</option>
            <option value="modified">{t('admin.review.filterModified')}</option>
          </select>
          <select
            value={filterPack}
            onChange={(e) => setFilterPack(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[260px]"
          >
            <option value="all">{t('admin.review.filterAllPacks')}</option>
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
              title={t('admin.review.exportPackTitle', { pack: filterPack })}
            >
              {t('admin.review.exportPackButton')}
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
                  {t('admin.review.columnYear')} <SortIcon field="year" />
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('artist')}
                >
                  {t('admin.review.columnArtist')} <SortIcon field="artist" />
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('title')}
                >
                  {t('admin.review.columnTitle')} <SortIcon field="title" />
                </th>
                <th
                  className="px-3 py-2 cursor-pointer hover:text-gray-800 select-none"
                  onClick={() => handleSort('pack')}
                >
                  {t('admin.review.columnPack')} <SortIcon field="pack" />
                </th>
                <th className="px-3 py-2">
                  <span title={t('admin.review.columnYoutube')}>
                    {t('admin.review.columnMedia')}
                  </span>
                </th>
                <th className="px-3 py-2">{t('admin.review.columnStatus')}</th>
                <th className="px-3 py-2">{t('admin.review.columnAction')}</th>
              </tr>
            </thead>
            <tbody>
              {displaySongs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-400 text-sm"
                  >
                    {t('admin.review.noSongs')}
                  </td>
                </tr>
              ) : (
                displaySongs.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    isModified={!!edits[song.id]}
                    isEditing={editingId === song.id}
                    onEdit={() =>
                      setEditingId(editingId === song.id ? null : song.id)
                    }
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
              {t('admin.review.songCount', {
                count: displaySongs.length,
                shown: displaySongs.length,
                total: mergedSongs.length,
              })}
            </span>
            <span className="flex gap-4">
              <span>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
                {t('admin.review.present')}
              </span>
              <span>
                <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />
                {t('admin.review.missing')}
              </span>
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Badge color="orange">{t('admin.review.statusStub')}</Badge>{' '}
            {t('admin.review.legendStub')}
          </span>
          <span className="flex items-center gap-1">
            <Badge color="yellow">{t('admin.review.statusIncomplete')}</Badge>{' '}
            {t('admin.review.legendIncomplete')}
          </span>
          <span className="flex items-center gap-1">
            <Badge color="green">{t('admin.review.statusComplete')}</Badge>{' '}
            {t('admin.review.legendComplete')}
          </span>
          <span className="flex items-center gap-1">
            <Badge color="blue">{t('admin.review.statusModified')}</Badge>{' '}
            {t('admin.review.legendModified')}
          </span>
          <span className="ml-auto">
            <strong>{t('admin.review.legendExportLabel')}</strong>{' '}
            {t('admin.review.legendExport')}
          </span>
        </div>
      </div>
    </div>
  );
}
