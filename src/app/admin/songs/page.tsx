'use client';

/**
 * Admin tool: song management
 * Route: /admin/songs
 *
 * Here you can:
 *  - show songs from the global-hits.json
 *  - type/edit lyrics and YouTube links manually
 *  - save the data in localStorage
 *  - export as JSON
 *  - filter by pack and completeness
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhomuSong } from '@/types/song';
import { ALL_SONGS } from '@/data/songs';
import { SongEditor } from '@/components/admin/SongEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * In the admin tool we use PhomuSong, but lyrics may be null.
 * This version is stored locally and exported.
 */
type AdminSong = PhomuSong;

type FilterCompleteness = 'all' | 'complete' | 'incomplete';
type FilterPack = 'all' | string;

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'phomu-admin-songs';

/** Empty song template for a new form */
const EMPTY_SONG: AdminSong = {
  id: '',
  title: '',
  artist: '',
  year: new Date().getFullYear(),
  country: '',
  genre: '',
  difficulty: 'medium',
  mood: [],
  packs: ['Global Hits 1950-2026'],
  hints: ['', '', '', '', ''],
  hintEvidence: ['', '', '', '', ''],
  lyrics: null,
  isOneHitWonder: false,
  links: {
    youtube: '',
    spotify: '',
    spotifyFreePreview: '',
    amazonMusic: '',
    amazonPrimePreview: '',
  },
  supportedModes: [
    'timeline',
    'hint-master',
    'lyrics',
    'vibe-check',
    'cover-confusion',
    'survivor',
  ],
  isQRCompatible: true,
};

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Checks whether a song is complete (no null fields, all required fields present) */
function isSongComplete(song: AdminSong): boolean {
  if (!song.id || !song.title || !song.artist) return false;
  if (!song.links.youtube || song.links.youtube.startsWith('TODO:'))
    return false;
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
    .replace(
      /\b(feat\.?|ft\.?|featuring|remaster(ed)?|version|edit|radio mix|live)\b/g,
      ' '
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function duplicateKey(song: AdminSong): string {
  return `${normalizeText(song.artist)}::${normalizeText(song.title)}::${song.year}`;
}

function hasHintSpoiler(song: AdminSong): boolean {
  const tokens = new Set([
    ...normalizeText(song.title)
      .split(' ')
      .filter((t) => t.length >= 4),
    ...normalizeText(song.artist)
      .split(' ')
      .filter((t) => t.length >= 4),
  ]);

  return song.hints.some((hint) => {
    const h = normalizeText(hint);
    return [...tokens].some((token) => token && h.includes(token));
  });
}

function hasVerifiableHints(song: AdminSong): boolean {
  if (!song.hintEvidence || song.hintEvidence.length !== 5) return false;
  return song.hintEvidence.every(
    (url) => typeof url === 'string' && /^https?:\/\//.test(url)
  );
}

/** Loads songs from localStorage (if present), otherwise from the JSON */
function loadSongsFromStorage(): AdminSong[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AdminSong[];
    }
  } catch {
    // localStorage unavailable or corrupted → fall back to the JSON
  }
  // Type conversion: the JSON has lyrics: null, which our type allows
  return (ALL_SONGS as unknown as AdminSong[]) || [];
}

/** Saves songs in localStorage */
function saveSongsToStorage(songs: AdminSong[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {
    console.error('[Admin] Konnte nicht in localStorage speichern.');
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Badge: shows whether a song is complete or incomplete */
function CompletenessBadge({ complete }: { complete: boolean }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        complete
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {complete
        ? t('admin.songs.statusComplete')
        : t('admin.songs.statusIncomplete')}
    </span>
  );
}

/** A single row in the song overview */
function SongRow({
  song,
  isSelected,
  onSelect,
}: {
  song: AdminSong;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const complete = isSongComplete(song);
  const hasLyrics = song.lyrics !== null;
  const hasYoutube =
    !!song.links.youtube && !song.links.youtube.startsWith('TODO:');

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
      <td className="px-3 py-2 text-sm text-gray-500">
        {song.packs[0] || t('admin.songs.unassigned')}
      </td>
      <td className="px-3 py-2">
        <CompletenessBadge complete={complete} />
      </td>
      <td className="px-3 py-2">
        <span
          className={`text-xs ${hasLyrics ? 'text-green-600' : 'text-gray-400'}`}
        >
          {hasLyrics ? '✓' : '✗'} {t('admin.songs.lyricsLabel')}
        </span>
        {'  '}
        <span
          className={`text-xs ${hasYoutube ? 'text-green-600' : 'text-gray-400'}`}
        >
          {hasYoutube ? '✓' : '✗'} {t('admin.songs.youtubeShort')}
        </span>
      </td>
    </tr>
  );
}
// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminSongsPage() {
  const { t, i18n } = useTranslation();
  const [songs, setSongs] = useState<AdminSong[]>(() => loadSongsFromStorage());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCompleteness, setFilterCompleteness] =
    useState<FilterCompleteness>('all');
  const [filterPack, setFilterPack] = useState<FilterPack>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  // Determine all available packs from the songs
  const availablePacks = Array.from(new Set(songs.flatMap((s) => s.packs)));

  // Filtered song list
  const filteredSongs = songs.filter((song) => {
    if (filterPack !== 'all' && !song.packs.includes(filterPack)) return false;
    if (filterCompleteness === 'complete' && !isSongComplete(song))
      return false;
    if (filterCompleteness === 'incomplete' && isSongComplete(song))
      return false;
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

  // Save song (update in the list)
  const handleSave = useCallback(
    (updated: AdminSong) => {
      setSongs((prev) => {
        const isExisting = prev.some((s) => s.id === updated.id);
        const baseline = isExisting
          ? prev.filter((s) => s.id !== updated.id)
          : prev;

        // Duplicate policy A: globally strict
        const newKey = duplicateKey(updated);
        const duplicate = baseline.find(
          (s) => duplicateKey(s) === newKey || s.id === updated.id
        );
        if (duplicate) {
          alert(
            t('admin.songs.duplicateAlert', {
              artist: duplicate.artist,
              title: duplicate.title,
              year: duplicate.year,
            })
          );
          return prev;
        }

        // Hint quality gates
        if (hasHintSpoiler(updated)) {
          alert(t('admin.songs.spoilerBlocked'));
          return prev;
        }
        if (!hasVerifiableHints(updated)) {
          alert(t('admin.songs.evidenceBlocked'));
          return prev;
        }

        const next = [...baseline, updated];
        saveSongsToStorage(next);
        return next;
      });
      setSavedMessage(t('admin.songs.savedMessage', { title: updated.title }));
      setTimeout(() => setSavedMessage(''), 3000);
    },
    [t]
  );

  // JSON export: offer all songs as a download
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

  // Reset localStorage (to the JSON source data)
  function handleReset() {
    if (!confirm(t('admin.songs.resetConfirm'))) return;
    localStorage.removeItem(STORAGE_KEY);
    setSongs(ALL_SONGS as unknown as AdminSong[]);
    setSelectedId(null);
  }

  const selectedSong = songs.find((s) => s.id === selectedId) ?? null;
  const completeCount = songs.filter(isSongComplete).length;
  const withLyrics = songs.filter((s) => s.lyrics !== null).length;
  const withYoutube = songs.filter(
    (s) => s.links.youtube && !s.links.youtube.startsWith('TODO:')
  ).length;

  // Numbers are formatted for the active locale (Intl, active language)
  const numberFormat = new Intl.NumberFormat(i18n.language);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🎵 {t('admin.songs.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('admin.songs.subtitle')}
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
              {t('admin.songs.resetButton')}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              {t('admin.songs.exportButton')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Statistic cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              label: t('admin.songs.statTotal'),
              value: numberFormat.format(songs.length),
              color: 'blue',
            },
            {
              label: t('admin.songs.statComplete'),
              value: `${numberFormat.format(completeCount)} / ${numberFormat.format(songs.length)}`,
              color: 'green',
            },
            {
              label: t('admin.songs.statLyrics'),
              value: `${numberFormat.format(withLyrics)} / ${numberFormat.format(songs.length)}`,
              color: 'purple',
            },
            {
              label: t('admin.songs.statYoutube'),
              value: `${numberFormat.format(withYoutube)} / ${numberFormat.format(songs.length)}`,
              color: 'red',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Left column: list + filters */}
          <div className="flex-1 min-w-0">
            {/* Filter bar */}
            <div className="flex gap-3 mb-4">
              <input
                type="search"
                placeholder={t('admin.songs.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <select
                value={filterCompleteness}
                onChange={(e) =>
                  setFilterCompleteness(e.target.value as FilterCompleteness)
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">{t('common.all')}</option>
                <option value="incomplete">
                  {t('admin.songs.filterIncomplete')}
                </option>
                <option value="complete">
                  {t('admin.songs.filterComplete')}
                </option>
              </select>
              <select
                value={filterPack}
                onChange={(e) => setFilterPack(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">{t('admin.songs.filterAllPacks')}</option>
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
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                      {t('admin.songs.columnTitle')}
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                      {t('admin.songs.columnArtist')}
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                      {t('admin.songs.columnYear')}
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                      {t('admin.songs.columnPack')}
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                      {t('admin.songs.columnStatus')}
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase">
                      {t('admin.songs.columnDetails')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400 text-sm"
                      >
                        {t('admin.songs.noSongs')}
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
                {t('admin.songs.songCount', {
                  count: filteredSongs.length,
                  shown: filteredSongs.length,
                  total: songs.length,
                })}
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
                <p className="font-medium">{t('admin.songs.noSelection')}</p>
                <p className="text-sm mt-1">
                  {t('admin.songs.noSelectionHint')}
                </p>
                <button
                  onClick={() => {
                    const draftSong: AdminSong = {
                      ...EMPTY_SONG,
                      id: `draft-${Date.now()}`,
                      title: t('admin.songs.draftTitle'),
                    };
                    setSongs((prev) => [draftSong, ...prev]);
                    setSelectedId(draftSong.id);
                  }}
                  className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('admin.songs.createNew')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
