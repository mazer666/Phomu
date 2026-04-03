/**
 * PHOMU - Central Game Configuration
 *
 * All game constants, defaults, and enums live here.
 * This is the single source of truth for game settings.
 * Import via: import { PHOMU_CONFIG } from '@/config/game-config';
 */

// ─── Enums & Types ───────────────────────────────────────────────

/** All available game modes */
export type GameMode =
  | 'timeline'       // Mode 1: Chronological Timeline (drag & drop)
  | 'hint-master'    // Mode 2: Hint-Master (5 levels, manual validation)
  | 'lyrics'         // Mode 3: Lyrics Labyrinth (fake lyric detection)
  | 'vibe-check'     // Mode 4: Vibe-Check (mood matching)
  | 'survivor'       // Mode 5: Survivor (one-hit-wonder detection)
  | 'cover-confusion'; // Mode 6: Cover Confusion (original artist detection)

export type MusicProvider =
  | 'youtube'         // Primary, free, everyone has access
  | 'spotify-free'    // 30-second preview via Web API
  | 'spotify-premium' // Full playback via Web Playback SDK
  | 'amazon-music'    // Standard: 30s Preview (Prime/Unlimited)
  | 'amazon-music-premium' // Experimental: Full playback via Embed
  | 'apple-music';    // Future: requires Apple Developer Account

/** Available UI themes */
export type ThemeName =
  | 'jackbox'     // Default: colorful, bold, party arcade
  | 'spotify'     // Dark, minimal, clean
  | 'youtube'     // Dark/red, modern
  | 'musicwall';  // White, tiles, album covers dominant

/** Team configuration options */
export type TeamMode =
  | 'individual'  // Every player for themselves
  | 'fixed'       // Fixed teams throughout the game
  | 'shifting';   // Teams randomized every round

/** Anti-cheat reveal method for the Pilot */
export type UnlockMethod = 'swipe' | 'blur' | 'none';

/** Supported UI languages */
export type Language = 'de' | 'en';

/** Song difficulty levels */
export type Difficulty = 'easy' | 'medium' | 'hard';

// ─── Configuration ───────────────────────────────────────────────

export const PHOMU_CONFIG = {
  // Game Defaults
  DEFAULT_WIN_SCORE: 10,
  MAX_PLAYERS: 24,
  MIN_PLAYERS: 1,
  DEFAULT_TEAM_MODE: 'individual' as TeamMode,

  // Rounds & Scoring Baseline (Phase 2)
  DEFAULT_ROUNDS_TO_PLAY: 10,
  MIN_ROUNDS_TO_PLAY: 10,
  MAX_ROUNDS_TO_PLAY: 30,
  DEFAULT_TIMELINE_MAX_POINTS: 5,
  DEFAULT_TIME_DECAY_ENABLED: false,
  DEFAULT_TIME_DECAY_GRACE_SECONDS: 5,
  DEFAULT_TIME_DECAY_STEP_SECONDS: 5,
  DEFAULT_TIME_DECAY_STEP_POINTS: 1,
  DEFAULT_MIN_POINTS_PER_CORRECT: 1,
  DEFAULT_OVERRIDE_GOVERNANCE: 'host',
  DEFAULT_HINT_RELEASE_POLICY: 'auto-publish',
  DEFAULT_AI_QUEUE_STRATEGY: 'queue-retry-pending',
  DEFAULT_NO_CHEAT_MODE: false,


  // Language
  SUPPORTED_LANGUAGES: ['de', 'en'] as Language[],
  DEFAULT_LANGUAGE: 'de' as Language,

  // Music
  DEFAULT_MUSIC_PROVIDER: 'youtube' as MusicProvider,
  COUNTDOWN_SECONDS: 3,      // Countdown before music starts (autoplay workaround)
  SPOTIFY_PREVIEW_DURATION: 30, // Spotify Free preview length in seconds

  // Themes
  DEFAULT_THEME: 'jackbox' as ThemeName,
  AVAILABLE_THEMES: ['jackbox', 'spotify', 'youtube', 'musicwall'] as ThemeName[],

  // Content Packs (Structured for Progression)
  SONG_PACKS: [
    {
      id: 'global-hits',
      name: 'Global Hits',
      tagline: 'Von Sinatra bis Sabrina. Alles drin.',
      emoji: '🌍',
      gradient: ['#4f46e5', '#7c3aed'],
    },
    {
      id: '80s-flashback',
      name: '80s Flashback',
      tagline: 'Schulterpolster. Synthesizer. Schweißperlen.',
      emoji: '🕹️',
      gradient: ['#db2777', '#f97316'],
    },
    {
      id: '90s-rave',
      name: '90s Rave',
      tagline: 'Kurt oder Kylie? Hier stimmt beides.',
      emoji: '💊',
      gradient: ['#0891b2', '#2563eb'],
    },
    {
      id: 'guilty-pleasures',
      name: 'Guilty Pleasures',
      tagline: 'Die Songs, die du heimlich auswendig kannst.',
      emoji: '🫣',
      gradient: ['#be185d', '#9333ea'],
    },
    {
      id: 'rock-anthems',
      name: 'Rock Anthems',
      tagline: 'Feuerzeuge hoch. Gehör optional.',
      emoji: '🎸',
      gradient: ['#dc2626', '#ea580c'],
    },
    {
      id: 'summer-vibes',
      name: 'Summer Vibes',
      tagline: 'Sonnencreme, Ohrwürmer, kein Ausweg.',
      emoji: '☀️',
      gradient: ['#d97706', '#f59e0b'],
    },
    {
      id: 'global-beats',
      name: 'Global Beats',
      tagline: 'Reggaeton, Afrobeats, K-Pop. Grenzenlos.',
      emoji: '🗺️',
      gradient: ['#059669', '#0d9488'],
    },
    {
      id: 'movie-magic',
      name: 'Movie Magic',
      tagline: 'Du kennst den Film. Die Musik verrät ihn.',
      emoji: '🎬',
      gradient: ['#b45309', '#d97706'],
    },
    {
      id: 'legendary-voices',
      name: 'Legendary Voices',
      tagline: 'Sinatra. Mercury. Aretha. Die GOATs persönlich.',
      emoji: '👑',
      gradient: ['#92400e', '#b45309'],
    },
    {
      id: 'modern-charts',
      name: 'Modern Charts',
      tagline: 'Von TikTok direkt in die Gehörgänge.',
      emoji: '📱',
      gradient: ['#7c3aed', '#db2777'],
    },
    {
      id: 'eurovision-icons',
      name: 'Eurovision Icons',
      tagline: 'Europe calling. Niemand gewinnt, alle tanzen.',
      emoji: '🌟',
      gradient: ['#1d4ed8', '#0891b2'],
    },
    {
      id: 'tiktok-viral',
      name: 'TikTok Viral',
      tagline: 'Wenn der Beat startet und alle mitsingen.',
      emoji: '🔥',
      gradient: ['#dc2626', '#f97316'],
    },
    {
      id: 'jazz-blues',
      name: 'Jazz & Blues',
      tagline: 'Nachtclub-Feeling um 15 Uhr nachmittags.',
      emoji: '🎷',
      gradient: ['#1e3a5f', '#1d4ed8'],
    },
    {
      id: 'metal-hardcore',
      name: 'Metal & Hardcore',
      tagline: 'Für starke Nerven und schwache Stimmbänder.',
      emoji: '💀',
      gradient: ['#111827', '#dc2626'],
    },
    {
      id: 'country-folk',
      name: 'Country & Folk',
      tagline: 'Heimweh trifft Gitarre trifft Herz.',
      emoji: '🤠',
      gradient: ['#92400e', '#78350f'],
    },
    {
      id: 'piano-ballads',
      name: 'Piano & Power Ballads',
      tagline: 'Wer nicht weint, kennt den Song nicht.',
      emoji: '🎹',
      gradient: ['#312e81', '#4338ca'],
    },
    {
      id: 'electronic-synth',
      name: 'Electronic & Synth',
      tagline: 'Drop incoming. Ohren auf, Kopf aus.',
      emoji: '⚡',
      gradient: ['#0e7490', '#7c3aed'],
    },
    {
      id: 'soul-funk',
      name: 'Soul & Funk',
      tagline: 'Wer nicht tanzt, macht es definitiv falsch.',
      emoji: '🕺',
      gradient: ['#c2410c', '#d97706'],
    },
    {
      id: 'classical-orchestral',
      name: 'Klassik & Orchester',
      tagline: 'Kennt jeder. Weiß nur keiner woher.',
      emoji: '🎻',
      gradient: ['#374151', '#4f46e5'],
    },
    {
      id: 'grand-finale',
      name: 'The Grand Finale',
      tagline: 'Das letzte Magazin. Alles rein. Kein Zurück.',
      emoji: '🏆',
      gradient: ['#92400e', '#dc2626'],
    },
  ],

  // Game Modes
  ALL_GAME_MODES: [
    'timeline',
    'hint-master',
    'lyrics',
    'vibe-check',
    'survivor',
    'cover-confusion',
  ] as GameMode[],

  // Hint-Master Scoring (points per hint level)
  HINT_MASTER_POINTS: [5, 4, 3, 2, 1] as const,

  // Anti-Cheat Defaults
  DEFAULT_UNLOCK_METHOD: 'swipe' as UnlockMethod,

  // Timeline Mechanics
  FORCE_REMOVE_DUPLICATE_YEARS: true,

  // Future Features (not in MVP)
  ENABLE_CHIPS_BETTING: false,

  // Physical Cards
  CARD_WIDTH_MM: 59,
  CARD_HEIGHT_MM: 91,
  CARD_BLEED_MM: 3,
  MAX_CARDS_PER_SET: 110,
} as const;
