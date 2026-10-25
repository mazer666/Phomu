'use client';

/**
 * The editor side of the admin tool.
 *
 * WHAT: the panel that shows the editor of the selected song, and the empty
 * state that offers to create a new song when nothing is selected.
 *
 * WHY the panel is a component of its own: the editor is the place where a
 * song is changed, the list is the place where a song is found. The panel
 * only shows one of the two states and reports the wish of the administrator
 * to the page — it never changes a song itself.
 *
 * EXAMPLE: `SongEditorPanel` receives the selected song, or null. With a song
 * it draws the editor, without one it draws the button that creates a draft.
 */
import { useTranslation } from 'react-i18next';
import { SongEditor } from '@/components/admin/SongEditor';
import { EMPTY_SONG, type AdminSong } from '@/app/admin/songs/_lib/admin-song-model';

/** The properties of the editor panel. */
interface SongEditorPanelProps {
  /** The selected song, or null when no song is selected. */
  song: AdminSong | null;
  /** Called with the song as the editor holds it. */
  onSave: (updated: AdminSong) => void;
  /** Called when the administrator leaves the editor. */
  onCancel: () => void;
  /** Called with the draft of a new song. */
  onCreate: (draft: AdminSong) => void;
}

/**
 * The editor side of the admin tool.
 *
 * @param props - The selected song and the callbacks of the panel.
 * @returns The editor of the selected song or the empty state.
 */
export function SongEditorPanel({
  song,
  onSave,
  onCancel,
  onCreate,
}: SongEditorPanelProps) {
  const { t } = useTranslation();

  if (song) {
    return (
      <SongEditor
        key={song.id}
        song={song}
        onSave={onSave}
        onCancel={onCancel}
        variant="inline"
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
      <p className="text-4xl mb-3">🎵</p>
      <p className="font-medium">{t('admin.songs.noSelection')}</p>
      <p className="text-sm mt-1">{t('admin.songs.noSelectionHint')}</p>
      <button
        onClick={() => {
          const draftSong: AdminSong = {
            ...EMPTY_SONG,
            id: `draft-${Date.now()}`,
            title: t('admin.songs.draftTitle'),
          };
          onCreate(draftSong);
        }}
        className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        {t('admin.songs.createNew')}
      </button>
    </div>
  );
}
