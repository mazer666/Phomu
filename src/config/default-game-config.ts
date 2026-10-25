/**
 * The configuration a new game starts with.
 *
 * WHAT: the values the lobby uses until the host changes them.
 *
 * WHY the configuration lives here and not in the store: the store is the
 * state of a running game. The values a game starts with are a default, and
 * a default has one place (src/config/game-config.ts holds the rules, this
 * file holds the shape of the lobby).
 *
 * EXAMPLE: a game that nobody configured starts with the Timeline mode and
 * the first pack of the catalogue.
 */
import type { GameConfig } from '@/types/game-state';
import { PHOMU_CONFIG } from '@/config/game-config';

/** The configuration of a new session. */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  selectedModes: ['timeline'],
  selectedPacks: [PHOMU_CONFIG.SONG_PACKS[0].id],
  teamMode: PHOMU_CONFIG.DEFAULT_TEAM_MODE,
  deviceMode: 'pass-the-phone',
  endingCondition: 'rounds',
  targetPoints: 100,
  targetRounds: 10,
  targetTimeMinutes: 60,
  winCondition: PHOMU_CONFIG.DEFAULT_WIN_SCORE,
  timeLimitSeconds: null,
  difficulty: 'all',
  roundsToPlay: PHOMU_CONFIG.DEFAULT_ROUNDS_TO_PLAY,
  timelineMaxPoints: PHOMU_CONFIG.DEFAULT_TIMELINE_MAX_POINTS,
  timeDecayEnabled: PHOMU_CONFIG.DEFAULT_TIME_DECAY_ENABLED,
  timeDecayGraceSeconds: PHOMU_CONFIG.DEFAULT_TIME_DECAY_GRACE_SECONDS,
  timeDecayStepSeconds: PHOMU_CONFIG.DEFAULT_TIME_DECAY_STEP_SECONDS,
  timeDecayStepPoints: PHOMU_CONFIG.DEFAULT_TIME_DECAY_STEP_POINTS,
  minPointsPerCorrect: PHOMU_CONFIG.DEFAULT_MIN_POINTS_PER_CORRECT,
  overrideGovernance: PHOMU_CONFIG.DEFAULT_OVERRIDE_GOVERNANCE,
  hintReleasePolicy: PHOMU_CONFIG.DEFAULT_HINT_RELEASE_POLICY,
  aiQueueStrategy: PHOMU_CONFIG.DEFAULT_AI_QUEUE_STRATEGY,
  chipsEnabled: PHOMU_CONFIG.ENABLE_CHIPS_BETTING,
  noCheatMode: PHOMU_CONFIG.DEFAULT_NO_CHEAT_MODE,
  onlyQRCompatible: false,
};
