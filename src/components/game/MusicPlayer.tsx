/** Provider playback, source fallback and deliberate reveal in a responsive dialog. */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/stores/game-store';
import {
  extractAmazonTrackId,
  extractSpotifyTrackId,
  extractYouTubeId,
  providerTrackUrl,
} from './music/media-links';
import {
  EMPTY_REPORT_STORAGE,
  HOUR_MS,
  MAX_REPORTS_PER_HOUR,
  buildMissingReportPayload,
  evaluateMissingReport,
  missingReportBody,
  missingReportTitle,
  type ReportStatus,
} from './music/missing-report';
import { Icon } from '@/components/art/Icon';
import { SwipeToShow } from './music/SwipeToShow';
import { MusicPlayerDialog } from './music/MusicPlayerDialog';
/**
 * The resolution of the Amazon Music links.
 *
 * WHY the re-export: the resolver is a pure function of the catalogue, and
 * the tests of the player address it under the name of the player. The
 * function itself lives in `music/media-links.ts`.
 */
export { extractAmazonTrackId };

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
  /** Stops playback automatically after this second (e.g. startSeconds + 30) */
  endSeconds?: number;
  /** Blurs the video out (timeline mode: song unknown) */
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
      Player: new (
        element: HTMLElement | string,
        options: Record<string, unknown>
      ) => YTPlayerInstance;
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
  const { t } = useTranslation();
  const {
    preferredPlayer,
    preferredMusicProvider,
    skipBrokenSong,
    musicEnabled,
    musicVolume,
  } = useGameStore();

  const [playerState, setPlayerState] = useState<
    'loading' | 'playing' | 'error' | 'paused'
  >('loading');
  const [videoRevealed, setVideoRevealed] = useState(false);
  const [activeDomain, setActiveDomain] = useState<
    'music.youtube.com' | 'www.youtube.com'
  >(preferredPlayer === 'music' ? 'music.youtube.com' : 'www.youtube.com');

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

  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(
    null
  );
  const [reportStatus, setReportStatus] = useState<ReportStatus>('idle');
  const skipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spotifyFreeAudioRef = useRef<HTMLAudioElement | null>(null);
  const amazonPrimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyTrackId = useMemo(
    () => extractSpotifyTrackId(spotifyLink),
    [spotifyLink]
  );
  const amazonTrackId = useMemo(
    () => extractAmazonTrackId(amazonMusicLink),
    [amazonMusicLink]
  );
  const useSpotifyPremium =
    preferredMusicProvider === 'spotify-premium' && !!spotifyTrackId;
  const useSpotifyFree =
    preferredMusicProvider === 'spotify-free' && !!spotifyFreePreview;
  const useAmazonPreview =
    preferredMusicProvider === 'amazon-music' && !amazonTrackId && !!amazonPrimePreview;
  const useAmazonEmbed =
    (preferredMusicProvider === 'amazon-music' || preferredMusicProvider === 'amazon-music-premium') && !!amazonTrackId;

  const handleReportMissing = useCallback(() => {
    if (typeof window === 'undefined' || !songId) return;
    const DEVICE_KEY = 'phomu-device-id';
    const REPORT_KEY = 'phomu-missing-report-state-v1';

    const deviceId = localStorage.getItem(DEVICE_KEY) ?? crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, deviceId);

    const now = Date.now();
    const raw = localStorage.getItem(REPORT_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as {
          timestamps: number[];
          songs: Record<string, number>;
        })
      : EMPTY_REPORT_STORAGE;

    const decision = evaluateMissingReport(parsed, songId, now);
    if (decision.kind === 'duplicate') {
      setReportStatus('duplicate');
      return;
    }
    if (decision.kind === 'rate-limited') {
      setReportStatus('rate-limited');
      return;
    }

    const region = (
      navigator.language.split('-')[1] ?? 'unknown'
    ).toUpperCase();
    const issuePayload = buildMissingReportPayload({
      songId,
      songTitle,
      songArtist,
      songPack,
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
      now,
    });

    const issueUrlBase = process.env.NEXT_PUBLIC_GITHUB_ISSUE_URL;
    if (issueUrlBase) {
      const issueUrl = new URL(issueUrlBase);
      issueUrl.searchParams.set('title', missingReportTitle(issuePayload));
      issueUrl.searchParams.set('body', missingReportBody(issuePayload));
      window.open(issueUrl.toString(), '_blank', 'noopener,noreferrer');
    } else {
      void navigator.clipboard?.writeText(
        JSON.stringify(issuePayload, null, 2)
      );
    }

    const recent = parsed.timestamps.filter((ts) => now - ts < HOUR_MS);
    localStorage.setItem(
      REPORT_KEY,
      JSON.stringify({
        timestamps: [...recent, now],
        songs: { ...parsed.songs, [songId]: now },
      })
    );
    setReportStatus('sent');
  }, [
    amazonMusicLink,
    amazonPrimePreview,
    preferredMusicProvider,
    songArtist,
    songId,
    songPack,
    songTitle,
    spotifyFreePreview,
    spotifyLink,
    youtubeLink,
  ]);

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
        console.warn(
          `⚠️ MusicPlayer fallback ${next + 1}/${fallbackQueue.length}`
        );
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

    setActiveDomain((prev) =>
      prev === 'www.youtube.com' ? 'music.youtube.com' : 'www.youtube.com'
    );
    setPlayerState('loading');
    setKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (
      useSpotifyPremium ||
      useSpotifyFree ||
      useAmazonPreview ||
      useAmazonEmbed ||
      !videoId ||
      typeof window === 'undefined'
    )
      return;

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
          host: `https://${activeDomain}`,
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            setPlayerState('playing');
            event.target.setVolume(
              Math.round(Math.max(0, Math.min(1, musicVolume)) * 100)
            );
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
                  if (endCheckRef.current) {
                    clearInterval(endCheckRef.current);
                    endCheckRef.current = null;
                  }
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
                if (
                  playerState === 'loading' &&
                  playerRef.current?.getPlayerState() ===
                    (window.YT?.PlayerState?.UNSTARTED ?? -1)
                ) {
                  handleError();
                }
              }, 6000); // 6s timeout on mobile
            }
          },
        },
      });
    };

    const loadApi = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
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
      if (endCheckRef.current) {
        clearInterval(endCheckRef.current);
        endCheckRef.current = null;
      }
      if (skipTimerRef.current) {
        clearInterval(skipTimerRef.current);
        skipTimerRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* noop */
        }
      }
    };
  }, [
    videoId,
    activeDomain,
    startSeconds,
    endSeconds,
    handleError,
    playerState,
    musicEnabled,
    musicVolume,
    useSpotifyPremium,
    useSpotifyFree,
    useAmazonPreview,
    useAmazonEmbed,
  ]);

  useEffect(() => {
    if (useSpotifyPremium || useSpotifyFree || useAmazonPreview || useAmazonEmbed) return;
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(
        Math.round(Math.max(0, Math.min(1, musicVolume)) * 100)
      );
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
  }, [
    musicEnabled,
    musicVolume,
    playerState,
    useSpotifyPremium,
    useSpotifyFree,
    useAmazonPreview,
    useAmazonEmbed,
  ]);

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
    if (!useAmazonPreview || !amazonPrimeAudioRef.current) return;
    const audio = amazonPrimeAudioRef.current;
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    if (!musicEnabled) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => {
      // Autoplay can be blocked; user can still start via browser media controls.
    });
  }, [useAmazonPreview, musicEnabled, musicVolume, amazonPrimePreview]);

  const concealed = blurred && !videoRevealed;
  const provider = useSpotifyPremium || useSpotifyFree ? 'Spotify'
    : useAmazonEmbed || useAmazonPreview
      ? (preferredMusicProvider === 'amazon-music-premium' ? 'Amazon Music Unlimited' : 'Amazon Music Prime')
      : 'YouTube';

  const providerUrl = providerTrackUrl(provider, spotifyTrackId, amazonTrackId, videoId);

  if (
    !videoId &&
    !useSpotifyPremium &&
    !useSpotifyFree &&
    !useAmazonPreview &&
    !useAmazonEmbed
  ) {
    return (
      <div className="h-40 flex items-center justify-center opacity-30 border rounded-2xl italic">
        {t('game.music.noVideo')}
      </div>
    );
  }

  return (
    <div
      className={`music-player-shell relative w-full aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl ${className}`}
    >
      <MusicPlayerDialog revealed={videoRevealed} onShow={() => setVideoRevealed(true)}
        onHide={() => setVideoRevealed(false)} provider={provider} providerUrl={providerUrl} concealed={concealed}>
      {/* Target Player Wrapper */}
      <div inert={concealed} aria-hidden={concealed}
        className={`w-full h-full transition-all duration-1000 origin-center ${!videoRevealed && blurred ? 'opacity-50 blur-[60px] scale-125 pointer-events-none' : 'opacity-100 blur-none scale-100'}`}
      >
        <div ref={containerRef} key={key} className="w-full h-full" />
      </div>

      {/* Error / Region Lock Overlay */}
      <AnimatePresence>
        {playerState === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#121215] p-6 text-center"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center mb-4 border border-red-500/30">
              <span className="text-3xl text-red-500"><Icon name="warning" size={20} /></span>
            </div>

            <h2 className="text-xl font-black uppercase tracking-tight mb-1 text-red-500">
              {t('game.music.lockedOrError')}
            </h2>
            <p className="text-xs text-white/40 max-w-sm mb-6 leading-relaxed">
              {t('game.music.videoUnavailable')}
            </p>

            {fallbackQueue.length > 1 && (
              <p className="text-[10px] text-white/30 mb-3 uppercase tracking-widest">
                {t('game.music.fallbacksTested', {
                  current: Math.min(videoIndex + 1, fallbackQueue.length),
                  total: fallbackQueue.length,
                })}
              </p>
            )}

            {autoSkipCountdown !== null && (
              <div className="mb-6 px-4 py-1.5 bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full animate-pulse border border-red-400/20">
                {t('game.music.skipIn', { seconds: autoSkipCountdown })}
              </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => skipBrokenSong()}
                className="w-full bg-[var(--color-accent)] text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--color-accent)]/20"
              >
                {t('game.music.skipNow')}
              </button>

              <button
                onClick={toggleDomain}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
              >
                {t('game.music.alternativePlayer', {
                  variant: t(
                    activeDomain === 'www.youtube.com'
                      ? 'game.music.playerVariantMusic'
                      : 'game.music.playerVariantStandard'
                  ),
                })}
              </button>

              <button
                onClick={handleReportMissing}
                disabled={!songId}
                className="w-full py-2.5 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest text-white/70 disabled:opacity-30 hover:bg-white/10 transition-colors min-h-[44px]"
              >
                {t('game.music.reportMissing')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(preferredMusicProvider === 'spotify-free' ||
        preferredMusicProvider === 'spotify-premium' ||
        preferredMusicProvider === 'amazon-music' ||
        preferredMusicProvider === 'amazon-music-premium') && (
        <div className="music-provider-badge absolute left-4 top-3 z-30 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[9px] font-bold text-white/80">
          {preferredMusicProvider === 'spotify-free'
            ? t('game.music.providerSpotifyFree')
            : preferredMusicProvider === 'spotify-premium'
              ? t('game.music.providerSpotifyPremium')
              : preferredMusicProvider === 'amazon-music'
                ? t('game.music.providerAmazonPrime')
                : t('game.music.providerAmazonPremium')}
        </div>
      )}

      {useSpotifyPremium && spotifyTrackId && (
        <div data-provider-player aria-hidden={concealed} inert={concealed}
          className={`music-provider-layer ${concealed ? 'is-concealed' : ''}`}>
          <iframe
            title={t('game.music.spotifyPremiumPlayerTitle')}
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator`}
            width="100%"
            height="100%"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="music-provider-iframe"
          />
        </div>
      )}

      {useSpotifyFree && spotifyFreePreview && (
        <div data-provider-player aria-hidden={concealed} inert={concealed}
          className={`music-provider-layer music-preview-layer ${concealed ? 'is-concealed' : ''}`}>
          <audio
            ref={spotifyFreeAudioRef}
            src={spotifyFreePreview}
            preload="auto"
          />
          <div className="text-center space-y-3">
            <p className="text-lg font-black uppercase tracking-widest text-white">
              {t('game.music.spotifyFreePreviewTitle')}
            </p>
            <p className="text-xs text-white/60 max-w-md">
              {t('game.music.spotifyFreePreviewHint')}
            </p>
          </div>
        </div>
      )}

      {useAmazonPreview && amazonPrimePreview && (
        <div data-provider-player aria-hidden={concealed} inert={concealed}
          className={`music-provider-layer music-preview-layer ${concealed ? 'is-concealed' : ''}`}>
          <audio
            ref={amazonPrimeAudioRef}
            src={amazonPrimePreview}
            preload="auto"
          />
          <div className="text-center space-y-3">
            <p className="text-lg font-black uppercase tracking-widest text-white">
              {t('game.music.amazonPrimePreviewTitle')}
            </p>
            <p className="text-xs text-white/60 max-w-md">
              {t('game.music.amazonPrimePreviewHint')}
            </p>
            {amazonMusicLink && (
              <a
                href={amazonMusicLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-1 rounded-xl border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/10"
              >
                {t('game.music.openAtAmazon')}
              </a>
            )}
          </div>
        </div>
      )}

      {useAmazonEmbed && amazonTrackId && (
        <div data-provider-player aria-hidden={concealed} inert={concealed}
          className={`music-provider-layer ${concealed ? 'is-concealed' : ''}`}>
          <iframe
            title={t('game.music.amazonPremiumPlayerTitle')}
            src={`https://music.amazon.com/embed/track/${amazonTrackId}?marketplaceId=A1PA6795UKMFR9&musicTerritory=DE`}
            width="100%"
            height="100%"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="music-provider-iframe"
          />
        </div>
      )}

      {reportStatus !== 'idle' && (
        <div className="absolute right-4 bottom-4 z-50 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold text-white/80">
          {reportStatus === 'sent' && t('game.music.reportSent')}
          {reportStatus === 'rate-limited' && t('game.music.reportRateLimited')}
          {reportStatus === 'duplicate' && t('game.music.reportDuplicate')}
        </div>
      )}
      </MusicPlayerDialog>
      {/* The fresh handle always starts at the left after hiding the player. */}
      {blurred && !videoRevealed && <SwipeToShow onReveal={() => setVideoRevealed(true)} />}
    </div>
  );
}
