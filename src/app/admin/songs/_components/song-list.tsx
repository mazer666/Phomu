'use client';

/**
 * The song list of the admin tool.
 *
 * WHAT: the filter bar (search, completeness, pack), the table of the songs
 * with a row per song and the badge that names the state of a song.
 *
 * WHY the list owns its filters: the filters are a view onto the list and
 * nothing else uses them. The page keeps the songs, the selection and the
 * save path; the list keeps the way the songs are looked at. The list is a
 * pure function of the songs it receives — it never changes a song.
 *
 * EXAMPLE: `SongList` receives the songs of the tool and the id of the
 * selected song, and reports a click on a row through `onSelect`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isSongComplete,
  type AdminSong,
  type FilterCompleteness,
  type FilterPack,
} from '@/app/admin/songs/_lib/admin-song-model';

/** The properties of the song list. */
interface SongListProps {
  /** The songs of the tool. */
  songs: AdminSong[];
  /** The id of the selected song, or null when no song is selected. */
  selectedId: string | null;
  /** Called with the id of the song whose row was clicked. */
  onSelect: (songId: string) => void;
}

/**
 * The song list of the admin tool.
 *
 * @param props - The songs, the selection and the callback of the selection.
 * @returns The filter bar, the table of the songs and the counter.
 */
export function SongList({ songs, selectedId, onSelect }: SongListProps) {
  const { t } = useTranslation();
  const [filterCompleteness, setFilterCompleteness] =
    useState<FilterCompleteness>('all');
  const [filterPack, setFilterPack] = useState<FilterPack>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <>
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
                  onSelect={() => onSelect(song.id)}
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
    </>
  );
}

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
        <span className={`text-xs ${hasLyrics ? 'text-green-600' : 'text-gray-400'}`}>
          {hasLyrics ? '✓' : '✗'} {t('admin.songs.lyricsLabel')}
        </span>
        {'  '}
        <span className={`text-xs ${hasYoutube ? 'text-green-600' : 'text-gray-400'}`}>
          {hasYoutube ? '✓' : '✗'} {t('admin.songs.youtubeShort')}
        </span>
      </td>
    </tr>
  );
}
