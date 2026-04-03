import type { GameMode } from '@/config/game-config';

/**
 * Expected asset locations.
 * Missing files are handled silently by the SFX player.
 */
export const GAME_SFX = {
  correct: '/audio/sfx/correct.mp3',
  incorrect: '/audio/sfx/incorrect.mp3',
  reveal: '/audio/sfx/reveal.mp3',
  win: '/audio/sfx/win.mp3',
  lose: '/audio/sfx/lose.mp3',
} as const;

export const MODE_CUES: Record<GameMode, string> = {
  timeline: '/audio/mode-cues/timeline.mp3',
  'hint-master': '/audio/mode-cues/hint-master.mp3',
  lyrics: '/audio/mode-cues/lyrics.mp3',
  'vibe-check': '/audio/mode-cues/vibe-check.mp3',
  survivor: '/audio/mode-cues/survivor.mp3',
  'cover-confusion': '/audio/mode-cues/cover-confusion.mp3',
};
