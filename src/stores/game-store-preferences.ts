/**
 * The slice of the preferences of a session.
 *
 * WHAT: the configuration of the lobby, the preferences of the player and
 * the audio settings.
 *
 * WHY a slice: the preferences outlive a round and survive a reload of the
 * page. They are persisted, and they do not belong to the round.
 */
import type { GameState } from '@/types/game-state';
import type { SliceActions, StoreSet } from './game-store-types';

/** The actions of the slice of the preferences. */
export type PreferenceActions = SliceActions<
  | 'setConfig'
  | 'setPreferredPlayer'
  | 'setPreferredMusicProvider'
  | 'setAudioSettings'
  | 'resetProgress'
>;

/**
 * The slice of the preferences of a session.
 *
 * @param set - The setter of the store.
 */
export function createPreferenceActions(set: StoreSet): PreferenceActions {
  return {
    // ── setConfig ────────────────────────────────────────────────
    setConfig(updates) {
      set((state) => ({
        config: { ...state.config, ...updates },
      }));
    },

    // ── setPreferredPlayer ────────────────────────────────────────
    setPreferredPlayer(type) {
      set({ preferredPlayer: type });
    },

    // ── setPreferredMusicProvider ────────────────────────────────
    setPreferredMusicProvider(provider) {
      set({ preferredMusicProvider: provider });
    },

    // ── setAudioSettings ─────────────────────────────────────────
    setAudioSettings(updates) {
      set((state) => ({
        musicEnabled: updates.musicEnabled ?? state.musicEnabled,
        musicVolume: updates.musicVolume ?? state.musicVolume,
        sfxEnabled: updates.sfxEnabled ?? state.sfxEnabled,
        sfxVolume: updates.sfxVolume ?? state.sfxVolume,
      }));
    },

    // ── resetProgress ─────────────────────────────────────────────
    resetProgress() {
      set({ totalXP: 0 });
    },
  };
}

/** The audio settings of the session — the part the slice writes. */
export type AudioSettings = Pick<
  GameState,
  'musicEnabled' | 'musicVolume' | 'sfxEnabled' | 'sfxVolume'
>;
