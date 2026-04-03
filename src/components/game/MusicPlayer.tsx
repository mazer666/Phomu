/**
 * MusicPlayer (Robust Version)
 * 
 * Uses the YouTube IFrame Player API for advanced state tracking 
 * and reliable error detection (Region blocks, embed restrictions).
 */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/game-store';

interface MusicPlayerProps {
  songId?: string;
  songTitle?: string;
  songArtist?: string;
  songPack?: string;
  youtubeLink: string;
  youtubeAlternatives?: string[];
  spotifyLink?: string;
  spotifyFreePreview?: string;
  amazonMusicLink?: string;
  amazonPrimePreview?: string;
  startSeconds?: number;
  /** Stoppt Wiedergabe automatisch nach dieser Sekunde (z.B. startSeconds + 30) */
  endSeconds?: number;
  /** Blendet Video per Blur aus (Timeline-Modus: Song unbekannt) */
  blurred?: boolean;
  className?: string;
}


interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  target: YTPlayerInstance;
  data: number;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (element: HTMLElement | string, options: Record<string, unknown>) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        ENDED: number;
      };
    };
  }
}

/**
 * Hilfsfunktion zum Extrahieren der YouTube Video-ID
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/|.*vi?\/))([^?&"'>]+)/);
  return match ? match[1] : url.length === 11 ? url : null;
}

function extractSpotifyTrackId(value?: string): string | null {
  if (!value) return null;
  if (value.startsWith('spotify:track:')) return value.replace('spotify:track:', '').trim() || null;
  const match = value.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractAmazonTrackId(url?: string): string | null {
  if (!url) return null;
  // Match ASIN in trackAsin=... or /albums/ASIN or /dp/ASIN
  const trackAsinMatch = url.match(/trackAsin=([a-zA-Z0-9]{10})/);
  if (trackAsinMatch) return trackAsinMatch[1];
  
  const albumsMatch = url.match(/\/albums\/([a-zA-Z0-9]{10})/);
  if (albumsMatch) return albumsMatch[1];

  const dpMatch = url.match(/\/dp\/([a-zA-Z0-9]{10})/);
  if (dpMatch) return dpMatch[1];

  return null;
}

export function MusicPlayer({
  songId,
  songTitle,
  songArtist,
  songPack,
  youtubeLink,
  youtubeAlternatives,
  spotifyLink,
  spotifyFreePreview,
  amazonMusicLink,
  amazonPrimePreview,
  startSeconds = 0,
  endSeconds,
  blurred = false,
  className = '',
}: MusicPlayerProps) {
  const { preferredPlayer, preferredMusicProvider, skipBrokenSong, musicEnabled, musicVolume } = useGameStore();

  const [playerState, setPlayerState] = useState<'loading' | 'playing' | 'error' | 'paused'>('loading');
  const [videoRevealed, setVideoRevealed] = useState(false);
  const [activeDomain, setActiveDomain] = useState<'music.youtube.com' | 'www.youtube.com'>(
    preferredPlayer === 'music' ? 'music.youtube.com' : 'www.youtube.com'
  );

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const endCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackQueue = useMemo(
    () =>
      [youtubeLink, ...(youtubeAlternatives ?? [])]
        .map((link) => extractYouTubeId(link))
        .filter((id): id is string => !!id),
    [youtubeLink, youtubeAlternatives]
  );
  const [videoIndex, setVideoIndex] = useState(0);
  const videoId = fallbackQueue[videoIndex] ?? null;
  const [key, setKey] = useState(0);

  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'sent' | 'rate-limited' | 'duplicate'>('idle');
  const skipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spotifyFreeAudioRef = useRef<HTMLAudioElement | null>(null);
  const amazonPrimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyTrackId = useMemo(() => extractSpotifyTrackId(spotifyLink), [spotifyLink]);
  const amazonTrackId = useMemo(() => extractAmazonTrackId(amazonMusicLink), [amazonMusicLink]);
  const useSpotifyPremium = preferredMusicProvider === 'spotify-premium' && !!spotifyTrackId;
  const useSpotifyFree = preferredMusicProvider === 'spotify-free' && !!spotifyFreePreview;
  const useAmazonPrime = preferredMusicProvider === 'amazon-music' && !!amazonPrimePreview;
  const useAmazonPremium = preferredMusicProvider === 'amazon-music-premium' && !!amazonTrackId;

  const handleReportMissing = useCallback(() => {
    if (typeof window === 'undefined' || !songId) return;
    const DEVICE_KEY = 'phomu-device-id';
    const REPORT_KEY = 'phomu-missing-report-state-v1';
    const HOUR_MS = 60 * 60 * 1000;
    const MAX_PER_HOUR = 5;

    const deviceId = localStorage.getItem(DEVICE_KEY) ?? crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, deviceId);

    const now = Date.now();
    const raw = localStorage.getItem(REPORT_KEY);
    const parsed = raw ? JSON.parse(raw) as { timestamps: number[]; songs: Record<string, number> } : { timestamps: [], songs: {} };
    const recent = parsed.timestamps.filter((ts) => now - ts < HOUR_MS);

    if (parsed.songs[songId]) {
      setReportStatus('duplicate');
      return;
    }

    if (recent.length >= MAX_PER_HOUR) {
      setReportStatus('rate-limited');
      return;
    }

    const region = (navigator.language.split('-')[1] ?? 'unknown').toUpperCase();
    const issuePayload = {
      songId,
      songTitle: songTitle ?? null,
      songArtist: songArtist ?? null,
      songPack: songPack ?? null,
      preferredMusicProvider,
      hasYoutube: !!youtubeLink,
      hasSpotify: !!spotifyLink,
      hasSpotifyFreePreview: !!spotifyFreePreview,
      hasAmazonMusic: !!amazonMusicLink,
      hasAmazonPrimePreview: !!amazonPrimePreview,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
      region,
      deviceId,
      timestamp: new Date(now).toISOString(),
    };

    const issueUrlBase = process.env.NEXT_PUBLIC_GITHUB_ISSUE_URL;
    if (issueUrlBase) {
      const issueUrl = new URL(issueUrlBase);
      issueUrl.searchParams.set('title', `[Missing Link] ${songArtist ?? 'Unknown Artist'} - ${songTitle ?? songId}`);
      issueUrl.searchParams.set('body', [
        '## Missing Playback Report (Auto-generated)',
        '',
        '```json',
        JSON.stringify(issuePayload, null, 2),
        '```',
      ].join('\n'));
      window.open(issueUrl.toString(), '_blank', 'noopener,noreferrer');
    } else {
      void navigator.clipboard?.writeText(JSON.stringify(issuePayload, null, 2));
    }

    localStorage.setItem(REPORT_KEY, JSON.stringify({
      timestamps: [...recent, now],
      songs: { ...parsed.songs, [songId]: now },
    }));
    setReportStatus('sent');
  }, [amazonMusicLink, amazonPrimePreview, preferredMusicProvider, songArtist, songId, songPack, songTitle, spotifyFreePreview, spotifyLink, youtubeLink]);

  const startAutoSkipCountdown = useCallback(() => {
    setAutoSkipCountdown(10);
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
    skipTimerRef.current = setInterval(() => {
      setAutoSkipCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (skipTimerRef.current) clearInterval(skipTimerRef.current);
          skipBrokenSong();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [skipBrokenSong]);

  const handleError = useCallback(() => {
    if (endCheckRef.current) clearInterval(endCheckRef.current);

    setVideoIndex((prev) => {
      const next = prev + 1;
      if (next < fallbackQueue.length) {
        console.warn(`⚠️ MusicPlayer fallback ${next + 1}/${fallbackQueue.length}`);
        setPlayerState('loading');
        setAutoSkipCountdown(null);
        setKey((k) => k + 1);
        return next;
      }

      console.warn('❌ MusicPlayer Error detected. No fallback left.');
      setPlayerState('error');
      startAutoSkipCountdown();
      return prev;
    });
  }, [fallbackQueue.length, startAutoSkipCountdown]);

  const toggleDomain = useCallback(() => {
    // Clear skip timer if toggling
    if (skipTimerRef.current) clearInterval(skipTimerRef.current);
    setAutoSkipCountdown(null);

    setActiveDomain(prev => prev === 'www.youtube.com' ? 'music.youtube.com' : 'www.youtube.com');
    setPlayerState('loading');
    setKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (useSpotifyPremium || useSpotifyFree || useAmazonPrime || !videoId || typeof window === 'undefined') return;

    const initPlayer = () => {
      if (!containerRef.current) return;
      
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          start: startSeconds,
          mute: 0,
          origin: window.location.origin,
          host: `https://${activeDomain}`
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            setPlayerState('playing');
            event.target.setVolume(Math.round(Math.max(0, Math.min(1, musicVolume)) * 100));
            if (!musicEnabled) {
              event.target.mute();
              event.target.pauseVideo();
              setPlayerState('paused');
              return;
            }
            event.target.unMute();
            event.target.playVideo();
            
            if (endSeconds) {
              if (endCheckRef.current) clearInterval(endCheckRef.current);
              endCheckRef.current = setInterval(() => {
                const currentTime = event.target.getCurrentTime();
                if (currentTime >= endSeconds) {
                  event.target.pauseVideo();
                  setPlayerState('paused');
                  if (endCheckRef.current) { clearInterval(endCheckRef.current); endCheckRef.current = null; }
                }
              }, 500);
            }
          },
          onError: (event: YTPlayerEvent) => {
            console.warn('❌ YouTube IFrame Error:', event.data);
            handleError();
          },
          onStateChange: (event: YTPlayerEvent) => {
            if (event.data === (window.YT?.PlayerState?.UNSTARTED ?? -1)) {
              // Timeout to check if it ever starts
              setTimeout(() => {
                if (playerState === 'loading' && playerRef.current?.getPlayerState() === (window.YT?.PlayerState?.UNSTARTED ?? -1)) {
                  handleError();
                }
              }, 6000); // 6s timeout on mobile
            }
          }
        }
      });
    };

    const loadApi = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    };

    loadApi();
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (endCheckRef.current) { clearInterval(endCheckRef.current); endCheckRef.current = null; }
      if (skipTimerRef.current) { clearInterval(skipTimerRef.current); skipTimerRef.current = null; }
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* noop */ }
      }
    };
  }, [videoId, activeDomain, startSeconds, endSeconds, handleError, playerState, musicEnabled, musicVolume, useSpotifyPremium, useSpotifyFree, useAmazonPrime, useAmazonPremium]);

  useEffect(() => {
    if (useSpotifyPremium || useSpotifyFree || useAmazonPrime) return;
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(Math.round(Math.max(0, Math.min(1, musicVolume)) * 100));
      if (musicEnabled) {
        playerRef.current.unMute();
        if (playerState !== 'playing') {
          playerRef.current.playVideo();
        }
      } else {
        playerRef.current.mute();
        playerRef.current.pauseVideo();
      }
    } catch {
      // noop (e.g. player not ready)
    }
  }, [musicEnabled, musicVolume, playerState, useSpotifyPremium, useSpotifyFree, useAmazonPrime, useAmazonPremium]);

  useEffect(() => {
    if (!useSpotifyFree || !spotifyFreeAudioRef.current) return;
    const audio = spotifyFreeAudioRef.current;
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    if (!musicEnabled) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => {
      // Autoplay can be blocked; user can still start via browser media controls.
    });
  }, [useSpotifyFree, musicEnabled, musicVolume, spotifyFreePreview]);

  useEffect(() => {
    if (!useAmazonPrime || !amazonPrimeAudioRef.current) return;
    const audio = amazonPrimeAudioRef.current;
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    if (!musicEnabled) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => {
      // Autoplay can be blocked; user can still start via browser media controls.
    });
  }, [useAmazonPrime, musicEnabled, musicVolume, amazonPrimePreview]);

  if (!videoId && !useSpotifyPremium && !useSpotifyFree && !useAmazonPrime && !useAmazonPremium) {
    return <div className="h-40 flex items-center justify-center opacity-30 border rounded-2xl italic">Kein Video verfügbar</div>;
  }

  return (
    <div className={`relative w-full aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl transition-all ${className}`}>
      {/* Target Player Wrapper */}
      <div className={`w-full h-full transition-all duration-1000 origin-center ${(!videoRevealed && blurred) ? 'opacity-50 blur-[60px] scale-125 pointer-events-none' : 'opacity-100 blur-none scale-100'}`}>
        <div 
          ref={containerRef} 
          key={key}
          className="w-full h-full"
        />
      </div>

      {/* Swipe Overlay */}
      <AnimatePresence>
        {blurred && !videoRevealed && playerState !== 'error' && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0c]/40 backdrop-blur-[60px]"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {playerState === 'loading' ? (
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-32 h-32 rounded-full border-2 border-white/10 flex items-center justify-center"
                >
                   <span className="text-4xl animate-pulse">💿</span>
                </motion.div>
              ) : (
                 <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-4xl">{playerState === 'playing' ? '🎵' : '⏸️'}</span>
                 </div>
              )}
            </div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-40 text-center space-y-2 select-none"
            >
              <h3 className="text-xl font-black uppercase tracking-widest text-white/80">Musik läuft</h3>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Swipe zum Aufdecken</p>
            </motion.div>

            {/* Premium Drag Handle */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 300 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x > 150) setVideoRevealed(true);
              }}
              className="absolute left-10 bottom-12 h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing group hover:bg-blue-400 transition-colors"
            >
              <span className="text-xl text-black">➔</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / Region Lock Overlay */}
      <AnimatePresence>
        {playerState === 'error' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#121215] p-6 text-center"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center mb-4 border border-red-500/30">
              <span className="text-3xl text-red-500">⚠️</span>
            </div>
            
            <h2 className="text-xl font-black uppercase tracking-tight mb-1 text-red-500">Gesperrt oder Fehler</h2>
            <p className="text-xs text-white/40 max-w-sm mb-6 leading-relaxed">
              Video nicht verfügbar. Neuer Song wird automatisch gezogen …
            </p>

            {fallbackQueue.length > 1 && (
              <p className="text-[10px] text-white/30 mb-3 uppercase tracking-widest">
                Fallbacks getestet: {Math.min(videoIndex + 1, fallbackQueue.length)} / {fallbackQueue.length}
              </p>
            )}

            {autoSkipCountdown !== null && (
              <div className="mb-6 px-4 py-1.5 bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full animate-pulse border border-red-400/20">
                Skip in {autoSkipCountdown}s
              </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => skipBrokenSong()}
                className="w-full bg-[var(--color-accent)] text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--color-accent)]/20"
              >
                JETZT ÜBERSPRINGEN
              </button>
              
              <button
                onClick={toggleDomain}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
              >
                Alternative Player ({activeDomain === 'www.youtube.com' ? 'Music' : 'Standard'})
              </button>

              <button
                onClick={handleReportMissing}
                disabled={!songId}
                className="w-full py-2.5 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest text-white/70 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                Report Missing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Hide Toggle (when revealed) */}
      {videoRevealed && blurred && (
        <button 
          onClick={() => setVideoRevealed(false)}
          className="absolute right-6 top-6 z-40 bg-black/40 hover:bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all"
        >
          Verbergen
        </button>
      )}

      {(preferredMusicProvider === 'spotify-free' || preferredMusicProvider === 'spotify-premium' || preferredMusicProvider === 'amazon-music' || preferredMusicProvider === 'amazon-music-premium') && (
        <div className="absolute left-4 bottom-4 z-40 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[9px] font-bold text-white/80">
          {preferredMusicProvider === 'spotify-free'
            ? 'Spotify Free: eingeschränkt (Preview). YouTube-Fallback aktiv.'
            : preferredMusicProvider === 'spotify-premium'
              ? 'Spotify: bei fehlender Premium-Wiedergabe wird YouTube genutzt.'
              : preferredMusicProvider === 'amazon-music'
                ? 'Amazon Prime: eingeschränkt (Preview). YouTube-Fallback aktiv.'
                : 'Amazon Music Premium: nutzt Full-Track Embed. Login bei Amazon nötig.'}
        </div>
      )}

      {useSpotifyPremium && spotifyTrackId && (
        <div className="absolute inset-0 z-50 bg-black p-3 sm:p-4">
          <iframe
            title="Spotify Premium Player"
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator`}
            width="100%"
            height="100%"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full h-full rounded-2xl border border-white/10"
          />
        </div>
      )}

      {useSpotifyFree && spotifyFreePreview && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
          <audio ref={spotifyFreeAudioRef} src={spotifyFreePreview} preload="auto" />
          <div className="text-center space-y-3">
            <p className="text-lg font-black uppercase tracking-widest text-white">Spotify Free Preview</p>
            <p className="text-xs text-white/60 max-w-md">
              Free ist auf kurze Preview-Clips begrenzt. Wenn kein Preview-Link hinterlegt ist, nutzt Phomu automatisch YouTube.
            </p>
          </div>
        </div>
      )}

      {useAmazonPrime && amazonPrimePreview && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
          <audio ref={amazonPrimeAudioRef} src={amazonPrimePreview} preload="auto" />
          <div className="text-center space-y-3">
            <p className="text-lg font-black uppercase tracking-widest text-white">Amazon Prime Preview</p>
            <p className="text-xs text-white/60 max-w-md">
              Prime ist auf kurze Preview-Clips begrenzt. Wenn kein Preview-Link hinterlegt ist, nutzt Phomu automatisch YouTube.
            </p>
            {amazonMusicLink && (
              <a
                href={amazonMusicLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 rounded-xl border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/10"
              >
                Bei Amazon öffnen
              </a>
            )}
          </div>
        </div>
      )}

      {useAmazonPremium && amazonTrackId && (
        <div className="absolute inset-0 z-50 bg-black p-3 sm:p-4">
          <iframe
            title="Amazon Music Premium Player"
            src={`https://music.amazon.com/embed/track/${amazonTrackId}?marketplaceId=A1PA6795UKMFR9&musicTerritory=DE`}
            width="100%"
            height="100%"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full h-full rounded-2xl border border-white/10"
          />
        </div>
      )}

      {reportStatus !== 'idle' && (
        <div className="absolute right-4 bottom-4 z-50 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold text-white/80">
          {reportStatus === 'sent' && 'Report erstellt'}
          {reportStatus === 'rate-limited' && 'Rate limit: max 5/h je Gerät'}
          {reportStatus === 'duplicate' && 'Für diesen Song bereits gemeldet'}
        </div>
      )}
    </div>
  );
}
