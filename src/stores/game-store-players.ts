/**
 * The slice of the players of a session.
 *
 * WHAT: adding a player to the lobby, removing one again and changing the
 * data of a player.
 *
 * WHY a slice: the store grew into one file with every kind of state. The
 * slices keep the parts apart, and the store composes them.
 */
import type { Player } from '@/types/player';
import { PHOMU_CONFIG } from '@/config/game-config';
import type { SliceActions, StoreGet, StoreSet } from './game-store-types';

/** The actions of the slice of the players. */
export type PlayerActions = SliceActions<
  'addPlayer' | 'removePlayer' | 'updatePlayer'
>;

/**
 * The slice of the players of a session.
 *
 * @param set - The setter of the store.
 * @param get - The reader of the store.
 */
export function createPlayerActions(
  set: StoreSet,
  get: StoreGet
): PlayerActions {
  return {
    // ── addPlayer ────────────────────────────────────────────────
    addPlayer(name, avatar, color) {
      const { players, turnOrder } = get();

      // Check the maximum count
      if (players.length >= PHOMU_CONFIG.MAX_PLAYERS) return;

      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: name.trim(),
        score: 0,
        isEliminated: false,
        isSpectator: false,
        // The first player automatically becomes the pilot
        isPilot: players.length === 0,
        avatar,
        color,
      };

      set({
        players: [...players, newPlayer],
        turnOrder: [...turnOrder, newPlayer.id],
      });
    },

    // ── removePlayer ─────────────────────────────────────────────
    removePlayer(playerId) {
      const { players, turnOrder } = get();
      const remaining = players.filter((p) => p.id !== playerId);

      // If the pilot is removed, the first remaining player takes over
      const removedWasPilot = players.find((p) => p.id === playerId)?.isPilot ?? false;
      const updated = removedWasPilot && remaining.length > 0
        ? remaining.map((p, i) => (i === 0 ? { ...p, isPilot: true } : p))
        : remaining;

      set({
        players: updated,
        turnOrder: turnOrder.filter((id) => id !== playerId),
      });
    },

    // ── updatePlayer ─────────────────────────────────────────────
    updatePlayer(playerId, updates) {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId ? { ...p, ...updates } : p,
        ),
      }));
    },
  };
}
