'use client';

/**
 * SongEditor
 *
 * Shared component to edit song metadata, lyrics, and hints.
 * Used in the integrated Admin/Browser experience.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhomuSong } from '@/types/song';
import { Icon } from '@/components/art/Icon';

interface SongEditorProps {
  song: PhomuSong;
  onSave: (updated: PhomuSong) => void;
  onCancel: () => void;
  variant?: 'modal' | 'inline';
}

export function SongEditor({
  song,
  onSave,
  onCancel,
  variant = 'modal',
}: SongEditorProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PhomuSong>({ ...song });

  // Lyrics handling
  const [lyricsReal0, setLyricsReal0] = useState(song.lyrics?.real[0] ?? '');
  const [lyricsReal1, setLyricsReal1] = useState(song.lyrics?.real[1] ?? '');
  const [lyricsReal2, setLyricsReal2] = useState(song.lyrics?.real[2] ?? '');
  const [lyricsFake, setLyricsFake] = useState(song.lyrics?.fake ?? '');
  const [moodInput, setMoodInput] = useState(song.mood.join(', '));
  const [packsInput, setPacksInput] = useState(song.packs.join(', '));
  const [supportedModesInput, setSupportedModesInput] = useState(
    song.supportedModes.join(', ')
  );
  const [isQRCompatible, setIsQRCompatible] = useState(song.isQRCompatible);
  const [hintEvidenceInput, setHintEvidenceInput] = useState(
    (song.hintEvidence ?? ['', '', '', '', '']).join('\n')
  );

  function updateHint(index: number, value: string) {
    const newHints = [...form.hints] as [
      string,
      string,
      string,
      string,
      string,
    ];
    newHints[index] = value;
    setForm((prev) => ({ ...prev, hints: newHints }));
  }

  function handleSave() {
    const hasLyrics =
      lyricsReal0.trim() ||
      lyricsReal1.trim() ||
      lyricsReal2.trim() ||
      (typeof lyricsFake === 'string'
        ? lyricsFake.trim()
        : lyricsFake.length > 0);
    const lyrics = hasLyrics
      ? {
          real: [lyricsReal0, lyricsReal1, lyricsReal2] as [
            string,
            string,
            string,
          ],
          fake: lyricsFake,
        }
      : null;
    const mood = moodInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const packs = packsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const supportedModes = supportedModesInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const evidenceRows = hintEvidenceInput
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .slice(0, 5);
    const hintEvidence =
      evidenceRows.length === 5
        ? (evidenceRows as [string, string, string, string, string])
        : undefined;

    onSave({
      ...form,
      lyrics,
      mood,
      packs,
      supportedModes,
      isQRCompatible,
      hintEvidence,
    });
  }

  const containerClass =
    variant === 'modal'
      ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto'
      : 'w-full';

  const panelClass =
    variant === 'modal'
      ? 'bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6'
      : 'bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6';

  return (
    <div className={containerClass}>
      <div className={panelClass}>
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black text-gray-900">
            ✏️ {t('admin.editor.title')}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-900 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('admin.editor.fieldId')}
            value={form.id}
            onChange={(v) => setForm((p) => ({ ...p, id: v }))}
          />
          <Input
            label={t('admin.editor.fieldTitle')}
            value={form.title}
            onChange={(v) => setForm((p) => ({ ...p, title: v }))}
          />
          <Input
            label={t('admin.editor.fieldArtist')}
            value={form.artist}
            onChange={(v) => setForm((p) => ({ ...p, artist: v }))}
          />
          <Input
            label={t('admin.editor.fieldYear')}
            value={form.year}
            type="number"
            onChange={(v) =>
              setForm((p) => ({ ...p, year: parseInt(v) || p.year }))
            }
          />
          <Input
            label={t('admin.editor.fieldCountry')}
            value={form.country}
            onChange={(v) =>
              setForm((p) => ({ ...p, country: v.toUpperCase() }))
            }
          />
          <Input
            label={t('admin.editor.fieldGenre')}
            value={form.genre}
            onChange={(v) => setForm((p) => ({ ...p, genre: v }))}
          />
          <Input
            label={t('admin.editor.fieldYoutube')}
            value={form.links.youtube}
            onChange={(v) =>
              setForm((p) => ({ ...p, links: { ...p.links, youtube: v } }))
            }
          />
          <Input
            label={t('admin.editor.fieldSpotify')}
            value={form.links.spotify ?? ''}
            onChange={(v) =>
              setForm((p) => ({
                ...p,
                links: { ...p.links, spotify: v || undefined },
              }))
            }
          />
          <Input
            label={t('admin.editor.fieldSpotifyFree')}
            value={form.links.spotifyFreePreview ?? ''}
            onChange={(v) =>
              setForm((p) => ({
                ...p,
                links: { ...p.links, spotifyFreePreview: v || undefined },
              }))
            }
          />
          <Input
            label={t('admin.editor.fieldAmazonMusic')}
            value={form.links.amazonMusic ?? ''}
            onChange={(v) =>
              setForm((p) => ({
                ...p,
                links: { ...p.links, amazonMusic: v || undefined },
              }))
            }
          />
          <Input
            label={t('admin.editor.fieldAmazonPrime')}
            value={form.links.amazonPrimePreview ?? ''}
            onChange={(v) =>
              setForm((p) => ({
                ...p,
                links: { ...p.links, amazonPrimePreview: v || undefined },
              }))
            }
          />
          <Input
            label={t('admin.editor.fieldCover')}
            value={form.coverUrl ?? ''}
            onChange={(v) =>
              setForm((p) => ({ ...p, coverUrl: v || undefined }))
            }
          />
          <Input
            label={t('admin.editor.fieldPacks')}
            value={packsInput}
            onChange={setPacksInput}
            placeholder={t('admin.editor.packsPlaceholder')}
          />
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {t('admin.editor.hintsLabel')}
          </label>
          {form.hints.map((hint, i) => (
            <textarea
              key={i}
              value={hint}
              onChange={(e) => updateHint(i, e.target.value)}
              placeholder={t('admin.editor.hintPlaceholder', { level: i + 1 })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {t('admin.editor.lyricsLabel')}
          </label>
          <div className="grid gap-2">
            <input
              value={lyricsReal0}
              onChange={(e) => setLyricsReal0(e.target.value)}
              placeholder={t('admin.editor.lyricsRealPlaceholder', {
                index: 1,
              })}
              className="w-full p-2 border rounded-lg"
            />
            <input
              value={lyricsReal1}
              onChange={(e) => setLyricsReal1(e.target.value)}
              placeholder={t('admin.editor.lyricsRealPlaceholder', {
                index: 2,
              })}
              className="w-full p-2 border rounded-lg"
            />
            <input
              value={lyricsReal2}
              onChange={(e) => setLyricsReal2(e.target.value)}
              placeholder={t('admin.editor.lyricsRealPlaceholder', {
                index: 3,
              })}
              className="w-full p-2 border rounded-lg"
            />
            <input
              value={lyricsFake}
              onChange={(e) => setLyricsFake(e.target.value)}
              placeholder={t('admin.editor.lyricsFakePlaceholder')}
              className="w-full p-2 border border-red-200 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('admin.editor.supportedModesLabel')}
            value={supportedModesInput}
            onChange={setSupportedModesInput}
            placeholder="timeline, hint-master, ..."
          />
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
              {t('admin.editor.qrCompatibleLabel')}
            </label>
            <button
              onClick={() => setIsQRCompatible(!isQRCompatible)}
              className={`py-2 px-4 rounded-xl font-bold text-xs transition-all ${isQRCompatible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {isQRCompatible
                ? t('admin.editor.qrCompatibleOn')
                : t('admin.editor.qrCompatibleOff')}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
            {t('admin.editor.hintEvidenceLabel')}
          </label>
          <textarea
            value={hintEvidenceInput}
            onChange={(e) => setHintEvidenceInput(e.target.value)}
            placeholder="https://...\nhttps://...\nhttps://...\nhttps://...\nhttps://..."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg"
          >
            <Icon name="document" size={14} /> {t('common.save')}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
      />
    </div>
  );
}
