/**
 * MusicPlayer (Robust Version)
 * 
 * Uses the YouTube IFrame Player API for advanced state tracking 
 * and reliable error detection (Region blocks, embed restrictions).
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';

interface MusicPlayerProps {
  youtubeLink: string;
  startSeconds?: number;
  /** Blendet Video per Blur aus (Timeline-Modus: Song unbekannt) */
  blurred?: boolean;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function MusicPlayer({ youtubeLink, startSeconds = 0, blurred = false }: MusicPlayerProps) {
  const { preferredPlayer, currentSongSource, skipBrokenSong } = useGameStore();

  const [playerState, setPlayerState] = useState<'loading' | 'playing' | 'error' | 'fallback'>('loading');
  const [muted, setMuted] = useState(false);
  const [videoRevealed, setVideoRevealed] = useState(false);
  const swipeStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      setVideoRevealed(v => !v);
    }
  }, []);

  const [activeDomain, setActiveDomain] = useState<'music.youtube.com' | 'www.youtube.com'>(
    preferredPlayer === 'music' ? 'music.youtube.com' : 'www.youtube.com'
  );

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoId = extractYouTubeId(youtubeLink);

  // 1. YouTube API Laden
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 2. Player Initialisieren / Re-Initialisieren bei Domain-Wechsel
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      // Alten Player aufräumen falls vorhanden
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        host: `https://${activeDomain}`,
        playerVars: {
          autoplay: 1,
          mute: muted ? 1 : 0,
          start: startSeconds,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            setPlayerState('playing');
            event.target.playVideo();
          },
          onError: (event: any) => {
            console.warn('❌ YouTube Player Error:', event.data, activeDomain);
            handleError();
          },
          onStateChange: (event: any) => {
            // Wenn der Player auf "Buffer" hängen bleibt (oft bei Restrictions)
            if (event.data === window.YT.PlayerState.UNSTARTED) {
              // Timeout für Load-Check
              setTimeout(() => {
                if (playerState === 'loading') handleError();
              }, 4000);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }
    };
  }, [videoId, activeDomain]); // Re-run when domain changes (fallback)

  const handleError = () => {
    if (activeDomain === 'music.youtube.com') {
      console.log('🔄 Fallback to Standard YouTube...');
      setActiveDomain('www.youtube.com');
      setPlayerState('fallback');
    } else {
      setPlayerState('error');
      // Auto-Skip for Random Draws after delay
      if (currentSongSource === 'random') {
        setTimeout(() => skipBrokenSong(), 3000);
      }
    }
  };

  if (!videoId) {
    return <div className="h-40 flex items-center justify-center opacity-30 border rounded-2xl italic">Kein Video verfügbar</div>;
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl transition-all border border-white/10">
      <div className="relative w-full aspect-video bg-black">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Blur-Overlay (Timeline-Modus) */}
        {blurred && !videoRevealed && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 select-none"
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.4)' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <span className="text-3xl">🎵</span>
            <div className="flex items-center gap-2 opacity-60">
              <span className="text-lg">←</span>
              <p className="text-[10px] font-black uppercase tracking-widest">Swipe zum Enthüllen</p>
              <span className="text-lg">→</span>
            </div>
          </div>
        )}
        {blurred && videoRevealed && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-3 select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 bg-black/40 px-3 py-1 rounded-full">
              Swipe zum Verbergen
            </p>
          </div>
        )}

        {/* Overlays / States */}
        {playerState === 'loading' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-[var(--color-accent)] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Lade Musik...</p>
          </div>
        )}

        {playerState === 'error' && (
          <div className="absolute inset-0 bg-red-500/20 backdrop-blur-xl flex flex-col items-center justify-center gap-4 z-20 text-center px-8">
            <span className="text-4xl">⚠️</span>
            <h3 className="font-black uppercase text-sm">Musik nicht verfügbar</h3>
            <p className="text-[10px] opacity-70 leading-relaxed max-w-xs">
              Dieses Video ist in deiner Region gesperrt oder wurde entfernt.
            </p>
            {currentSongSource === 'qr' ? (
              <button 
                onClick={() => skipBrokenSong()}
                className="mt-4 px-6 py-2 bg-white text-black rounded-lg font-black text-[10px] hover:scale-105 transition-all"
              >
                KARTE ÜBERSPRINGEN
              </button>
            ) : (
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-4 animate-pulse">
                Draw wird automatisch wiederholt...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="bg-[var(--color-bg-card)] px-5 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Player</span>
          <span className={`text-[10px] font-black ${activeDomain === 'music.youtube.com' ? 'text-green-400' : 'text-orange-400'}`}>
            {activeDomain === 'music.youtube.com' ? 'MUSIC MODE (YT)' : 'STANDARD MODE (YT)'}
          </span>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => setMuted(!muted)}
             className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${muted ? 'bg-white/10 opacity-40' : 'bg-green-500 text-white'}`}
           >
             {muted ? '🔈 MUTED' : '🔊 LIVE'}
           </button>
        </div>
      </footer>
    </div>
  );
}

function extractYouTubeId(raw: string): string | null {
  if (!raw || raw.startsWith('TODO')) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
  } catch {}
  return null;
}
