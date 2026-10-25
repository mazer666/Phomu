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
 *
 * WHAT this file holds: the state of the tool — the songs, the selection and
 * the message of the last save — and the three actions of the header: save,
 * export and reset. The list lives in `_components/song-list.tsx`, the editor
 * in `_components/song-editor-panel.tsx`, the rules in
 * `_lib/admin-song-model.ts` and the overlay of the browser in
 * `_lib/admin-song-storage.ts`.
 *
 * WHY the split: the page had grown beyond the limit of the quality gate
 * (scripts/check-file-size.mjs). The gate is right — a page that carries the
 * list, the editor and the rules at the same time is a page that cannot be
 * read at a glance. The page now orchestrates; it does not draw the list and
 * it does not know the rules of a song.
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCatalogueRecords } from '@/hooks/useCatalogueRecords';
import { SongList } from '@/app/admin/songs/_components/song-list';
import { SongEditorPanel } from '@/app/admin/songs/_components/song-editor-panel';
import {
  duplicateKey,
  hasHintSpoiler,
  hasVerifiableHints,
  isSongComplete,
  type AdminSong,
} from '@/app/admin/songs/_lib/admin-song-model';
import {
  clearAdminSongs,
  loadSongsFromStorage,
  saveSongsToStorage,
} from '@/app/admin/songs/_lib/admin-song-storage';

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSongsPage() {
  const { t, i18n } = useTranslation();
  // The catalogue comes from the base: it is the answer key of the game and
  // it must not be part of the bundle (docs/qa/QA-02-SPOILER-FREENESS.md,
  // QA-SPO-001).
  const { records } = useCatalogueRecords();
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');

  // The list is filled when the records of the base arrive. The edits of the
  // browser win over the catalogue — they are the newer state.
  useEffect(() => {
    if (records.length === 0) return;
    setSongs(loadSongsFromStorage(records));
  }, [records]);

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
    clearAdminSongs();
    setSongs(records);
    setSelectedId(null);
  }

  // A new song enters the list as a draft; it is stored when it is saved.
  const handleCreate = useCallback((draft: AdminSong) => {
    setSongs((prev) => [draft, ...prev]);
    setSelectedId(draft.id);
  }, []);

  // The selection is a toggle: a second click on the song closes the editor.
  const handleSelect = useCallback((songId: string) => {
    setSelectedId((current) => (current === songId ? null : songId));
  }, []);

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
            <SongList
              songs={songs}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          <div className="w-[480px] shrink-0">
            <SongEditorPanel
              song={selectedSong}
              onSave={handleSave}
              onCancel={() => setSelectedId(null)}
              onCreate={handleCreate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
