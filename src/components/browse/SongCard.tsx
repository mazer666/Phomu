'use client';

/**
 * SongCard
 *
 * Zeigt alle öffentlichen Daten eines Songs als Karte an.
 * Wird auf der Browse-Seite (/browse) verwendet.
 *
 * Lyrics werden NICHT angezeigt (das wäre Spoiler!).
 */

import type { PhomuSong } from '@/types/song';

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Mapt Schwierigkeit auf ein Label + Farbe */
function difficultyStyle(difficulty: PhomuSong['difficulty']) {
  switch (difficulty) {
    case 'easy':
      return { label: 'Leicht', className: 'bg-green-100 text-green-800' };
    case 'medium':
      return { label: 'Mittel', className: 'bg-yellow-100 text-yellow-800' };
    case 'hard':
      return { label: 'Schwer', className: 'bg-red-100 text-red-800' };
  }
}

/** Gibt das Jahrzehnt eines Songs zurück, z.B. "80er" */
function getDecade(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  const short = decade % 100;
  return `${short}er`;
}

/** Erstellt die YouTube-URL aus ID oder vorhandener URL */
function buildYoutubeUrl(youtube: string): string | null {
  if (!youtube || youtube.startsWith('TODO:')) return null;
  if (youtube.includes('youtube.com') || youtube.includes('youtu.be')) {
    return youtube;
  }
  // Annahme: 11-stellige Video-ID
  return `https://www.youtube.com/watch?v=${youtube}`;
}

// ─── Komponente ───────────────────────────────────────────────────────────────

interface SongCardProps {
  song: PhomuSong;
  /** Ob die Hints aufgeklappt angezeigt werden sollen (Standard: false) */
  showHints?: boolean;
}

export function SongCard({ song, showHints = false }: SongCardProps) {
  const diff = difficultyStyle(song.difficulty);
  const youtubeUrl = buildYoutubeUrl(song.links.youtube);
  const decade = getDecade(song.year);
  const hasLyrics = song.lyrics !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Kopfzeile */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
              {song.title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{song.artist}</p>
          </div>

          {/* YouTube-Link */}
          {youtubeUrl ? (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
              title="Auf YouTube anhören"
              aria-label={`${song.title} auf YouTube`}
            >
              <span className="text-red-600 text-sm">▶</span>
            </a>
          ) : (
            <span
              className="shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
              title="Kein YouTube-Link vorhanden"
            >
              <span className="text-gray-400 text-sm">▶</span>
            </span>
          )}
        </div>

        {/* Metadaten-Zeile */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {/* Jahr */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            📅 {song.year}
          </span>

          {/* Jahrzehnt */}
          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {decade}
          </span>

          {/* Land */}
          <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
            🌍 {song.country}
          </span>

          {/* Genre */}
          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
            🎸 {song.genre}
          </span>

          {/* Schwierigkeit */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${diff.className}`}>
            {diff.label}
          </span>

          {/* One-Hit-Wonder */}
          {song.isOneHitWonder && (
            <span className="inline-flex items-center px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs font-semibold">
              ⭐ One-Hit-Wonder
            </span>
          )}
        </div>

        {/* Mood-Tags */}
        {song.mood.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {song.mood.map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hints (optional aufklappbar) */}
      {showHints && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Hints (5 → 1 Punkt)
          </p>
          {song.hints.map((hint, i) => (
            <div key={i} className="flex gap-2 text-xs text-gray-600">
              <span className="font-bold text-gray-400 shrink-0 w-4">{i + 1}</span>
              <span>{hint}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">{song.pack}</span>
        <div className="flex gap-2 text-xs">
          <span className={hasLyrics ? 'text-green-500' : 'text-gray-300'}>
            {hasLyrics ? '✓ Lyrics' : '○ Lyrics fehlen'}
          </span>
        </div>
      </div>
    </div>
  );
}
