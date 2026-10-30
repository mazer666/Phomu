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
      id: 'Global Hits 1950-2026',
      name: 'Global Hits',
      taglineKey: 'packs.globalHits.tagline',
      icon: 'globe',
      gradient: ['#4f46e5', '#7c3aed'],
    },
    {
      id: '80s Flashback',
      name: '80s Flashback',
      taglineKey: 'packs.eightiesFlashback.tagline',
      icon: 'controller',
      gradient: ['#db2777', '#f97316'],
    },
    {
      id: '90s Unplugged',
      name: '90s Rave',
      taglineKey: 'packs.ninetiesRave.tagline',
      icon: 'note',
      gradient: ['#0891b2', '#2563eb'],
    },
    {
      id: 'Indie & Alternative',
      name: 'Guilty Pleasures',
      taglineKey: 'packs.guiltyPleasures.tagline',
      icon: 'heart',
      gradient: ['#be185d', '#9333ea'],
    },
    {
      id: 'Rock Anthems',
      name: 'Rock Anthems',
      taglineKey: 'packs.rockAnthems.tagline',
      icon: 'guitar',
      gradient: ['#dc2626', '#ea580c'],
    },
    {
      id: 'Dance Floor Fillers',
      name: 'Summer Vibes',
      taglineKey: 'packs.summerVibes.tagline',
      icon: 'sun',
      gradient: ['#d97706', '#f59e0b'],
    },
    {
      id: 'World, Reggae & Soul',
      name: 'Global Beats',
      taglineKey: 'packs.globalBeats.tagline',
      icon: 'compass',
      gradient: ['#059669', '#0d9488'],
    },
    {
      id: 'Movie Hits',
      name: 'Movie Magic',
      taglineKey: 'packs.movieMagic.tagline',
      icon: 'film',
      gradient: ['#b45309', '#d97706'],
    },
    {
      id: '60s & 70s Soul & Rock Legends',
      name: 'Legendary Voices',
      taglineKey: 'packs.legendaryVoices.tagline',
      icon: 'crown',
      gradient: ['#92400e', '#b45309'],
    },
    {
      id: '2010s & 2020s Chart Toppers',
      name: 'Modern Charts',
      taglineKey: 'packs.modernCharts.tagline',
      icon: 'disc',
      gradient: ['#7c3aed', '#db2777'],
    },
    {
      id: 'Schlager & Evergreens',
      name: 'Eurovision Icons',
      taglineKey: 'packs.eurovisionIcons.tagline',
      icon: 'star',
      gradient: ['#1d4ed8', '#0891b2'],
    },
    {
      id: 'Hip Hop Essentials',
      name: 'TikTok Viral',
      taglineKey: 'packs.tikTokViral.tagline',
      icon: 'sun',
      gradient: ['#dc2626', '#f97316'],
    },
    {
      id: 'jazz-blues',
      name: 'Jazz & Blues',
      taglineKey: 'packs.jazzBlues.tagline',
      icon: 'note',
      gradient: ['#1e3a5f', '#1d4ed8'],
    },
    {
      id: 'metal-hardcore',
      name: 'Metal & Hardcore',
      taglineKey: 'packs.metalHardcore.tagline',
      icon: 'guitar',
      gradient: ['#111827', '#dc2626'],
    },
    {
      id: 'country-folk',
      name: 'Country & Folk',
      taglineKey: 'packs.countryFolk.tagline',
      icon: 'heart',
      gradient: ['#92400e', '#78350f'],
    },
    {
      id: 'piano-ballads',
      name: 'Piano & Power Ballads',
      taglineKey: 'packs.pianoBallads.tagline',
      icon: 'globe',
      gradient: ['#312e81', '#4338ca'],
    },
    {
      id: 'electronic-synth',
      name: 'Electronic & Synth',
      taglineKey: 'packs.electronicSynth.tagline',
      icon: 'compass',
      gradient: ['#0e7490', '#7c3aed'],
    },
    {
      id: 'soul-funk',
      name: 'Soul & Funk',
      taglineKey: 'packs.soulFunk.tagline',
      icon: 'controller',
      gradient: ['#c2410c', '#d97706'],
    },
    {
      id: 'classical-orchestral',
      name: 'Klassik & Orchester',
      taglineKey: 'packs.classicalOrchestral.tagline',
      icon: 'film',
      gradient: ['#374151', '#4f46e5'],
    },
    {
      id: 'grand-finale',
      name: 'The Grand Finale',
      taglineKey: 'packs.grandFinale.tagline',
      icon: 'crown',
      gradient: ['#92400e', '#dc2626'],
    },
    {
      id: 'youtube-import',
      name: 'YouTube Import',
      taglineKey: 'packs.youtubeImport.tagline',
      icon: 'disc',
      gradient: ['#334155', '#0f766e'],
    },
    {
      id: '80s-pop',
      name: '80s Pop',
      taglineKey: 'packs.eightiesPop.tagline',
      icon: 'star',
      gradient: ['#9d174d', '#c2410c'],
    },
    {
      id: 'kids-disney',
      name: 'Kids & Disney',
      taglineKey: 'packs.kidsDisney.tagline',
      icon: 'sun',
      gradient: ['#0369a1', '#f59e0b'],
    },
    {
      id: 'German Classics',
      name: 'German Classics',
      taglineKey: 'packs.germanClassics.tagline',
      icon: 'note',
      gradient: ['#7f1d1d', '#b45309'],
    },
    {
      id: '2000s Pop & RnB',
      name: '2000s Pop & RnB',
      taglineKey: 'packs.twoThousandsPopRnB.tagline',
      icon: 'guitar',
      gradient: ['#4c1d95', '#db2777'],
    },
    {
      id: 'Electronic & Techno',
      name: 'Electronic & Techno',
      taglineKey: 'packs.electronicTechno.tagline',
      icon: 'heart',
      gradient: ['#0f766e', '#4338ca'],
    },
    {
      id: 'Country, Jazz & Blues',
      name: 'Country, Jazz & Blues',
      taglineKey: 'packs.countryJazzBlues.tagline',
      icon: 'globe',
      gradient: ['#1f2937', '#0e7490'],
    },
  ],

  // Legacy lobby IDs -> current pack keys (src/data/songs/packs.json).
  // The old IDs do not occur as a `packs` entry in any song, i.e. they
  // produced empty selections in the filter. They are mapped to real keys here.
  PACK_ALIASES: {
    'global-hits': 'Global Hits 1950-2026',
    '80s-flashback': '80s Flashback',
    '90s-rave': '90s Unplugged',
    'guilty-pleasures': 'Indie & Alternative',
    'rock-anthems': 'Rock Anthems',
    'summer-vibes': 'Dance Floor Fillers',
    'global-beats': 'World, Reggae & Soul',
    'movie-magic': 'Movie Hits',
    'legendary-voices': '60s & 70s Soul & Rock Legends',
    'modern-charts': '2010s & 2020s Chart Toppers',
    'eurovision-icons': 'Schlager & Evergreens',
    'tiktok-viral': 'Hip Hop Essentials',
  },

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
