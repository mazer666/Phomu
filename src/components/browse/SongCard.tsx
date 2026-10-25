'use client';

/**
 * SongCard
 *
 * Zeigt alle öffentlichen Daten eines Songs als Karte an.
 * Wird auf der Browse-Seite (/browse) verwendet.
 *
 * Lyrics werden NICHT angezeigt (das wäre Spoiler!).
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { PhomuSong } from '@/types/song';

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Gibt das Jahrzehnt eines Songs als Zahl zurück, z. B. 1980 */
function getDecade(year: number): number {
  return Math.floor(year / 10) * 10;
}

/** Übersetzungsschlüssel der Schwierigkeitsstufen */
const DIFFICULTY_LABELS = {
  easy: 'browse.difficultyEasy',
  medium: 'browse.difficultyMedium',
  hard: 'browse.difficultyHard',
} as const;

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
  /** Admin-Modus aktiv? */
  isAdmin?: boolean;
  /** Callback zum Bearbeiten */
  onEdit?: (song: PhomuSong) => void;
  /** Callback zum sofortigen Spielen */
  onPlay?: (song: PhomuSong) => void;
}

export function SongCard({
  song,
  showHints = false,
  isAdmin = false,
  onEdit,
  onPlay,
}: SongCardProps) {
  const { t, i18n } = useTranslation();
  const youtubeUrl = buildYoutubeUrl(song.links.youtube);
  const decade = t('browse.decade', { decade: getDecade(song.year) });
  const hasLyrics = song.lyrics !== null;
  const [hovering, setHovering] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Hint-Level als zweistellige Zahl, lokalisiert formatiert */
  const hintLevelFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { minimumIntegerDigits: 2 }),
    [i18n.language]
  );

  const difficultyClass = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  }[song.difficulty];

  const difficultyLabel = DIFFICULTY_LABELS[song.difficulty];

  const handleMouseEnter = useCallback(() => {
    // Small delay to avoid accidental triggers when scrolling
    hoverTimerRef.current = setTimeout(() => setHovering(true), 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovering(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-[#1a1a1e] rounded-[2rem] shadow-2xl transition-all duration-500 overflow-hidden border border-white/5 flex flex-col h-full hover:border-blue-500/30 hover:shadow-blue-500/10"
      style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
    >
      {/* Invisible audio player on hover */}
      {hovering && song.links.youtube && (
        <iframe
          src={`https://www.youtube.com/embed/${song.links.youtube}?autoplay=1&start=${song.previewTimestamp?.start ?? 30}&controls=0&showinfo=0&modestbranding=1&rel=0&enablejsapi=1`}
          allow="autoplay"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
          tabIndex={-1}
          aria-hidden
        />
      )}
      {/* Cover Image Header */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-900">
        {song.coverUrl ? (
          <Image
            src={`/Phomu${song.coverUrl}`}
            alt={song.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <span className="text-5xl opacity-10 mb-4">🎵</span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
              {t('browse.noCover')}
            </p>
          </div>
        )}

        {/* Top-Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          <span
            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-lg ${difficultyClass}`}
          >
            {t(difficultyLabel)}
          </span>
          {song.isOneHitWonder && (
            <span className="bg-orange-500/80 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-orange-400/20">
              {t('browse.oneHitBadge')}
            </span>
          )}
        </div>

        {/* Floating Year Badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black border border-white/10">
            {song.year}
          </span>
        </div>

        {/* Action Buttons Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-4 backdrop-blur-[1px]">
          {onPlay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(song);
              }}
              className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group/btn"
              title={t('browse.playNowTitle')}
            >
              <span className="text-2xl group-hover:scale-125 transition-transform">
                ▶️
              </span>
            </button>
          )}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border border-red-500/50"
              title={t('browse.originalVideoTitle')}
            >
              <span className="text-lg">📺</span>
            </a>
          )}
          {isAdmin && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(song);
              }}
              className="w-12 h-12 bg-blue-600/90 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border border-blue-500/50"
              title={t('browse.editSongTitle')}
            >
              <span className="text-lg">✏️</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col bg-gradient-to-b from-[#1a1a1e] to-[#0f0f11]">
        <div className="mb-4">
          <h3 className="font-black text-white text-xl leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors uppercase tracking-tight">
            {song.title}
          </h3>
          <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mt-1">
            {song.artist}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-auto">
          <span className="text-[9px] font-black bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-white/60 uppercase tracking-widest">
            {decade}
          </span>
          <span className="text-[9px] font-black bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg text-blue-400 uppercase tracking-widest">
            {song.genre}
          </span>
          <span className="text-[9px] font-black bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-purple-400 uppercase tracking-widest">
            {song.country}
          </span>
        </div>

        {/* Moods */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {song.mood.map((m) => (
            <span
              key={m}
              className="text-[8px] font-black text-white/30 border border-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Indicators Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${hasLyrics ? 'text-green-500' : 'text-white/20'}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasLyrics ? 'bg-green-500 animate-pulse' : 'bg-white/10'}`}
            ></span>
            {t('browse.lyricsLabel')}
          </span>
          <span
            className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${song.isQRCompatible ? 'text-blue-500' : 'text-white/20'}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${song.isQRCompatible ? 'bg-blue-500' : 'bg-white/10'}`}
            ></span>
            {t('browse.qrLabel')}
          </span>
        </div>
      </div>

      {/* Hints Expansion */}
      {showHints && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-black/40 border-t border-white/5 p-6 space-y-3"
        >
          {song.hints.map((h, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-[9px] font-black text-white/10 w-4 pt-0.5">
                {hintLevelFormatter.format(song.hints.length - i)}
              </span>
              <p className="text-[11px] text-white/50 leading-relaxed italic">
                &quot;{h}&quot;
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
