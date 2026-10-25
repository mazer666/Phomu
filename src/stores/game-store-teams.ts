/**
 * The slice of the teams of a session.
 *
 * WHAT: creating the teams, changing them, assigning the players to them
 * and paying out the points.
 *
 * WHY the points are here: a team may win the points of a player, and the
 * rule of that belongs to the teams.
 */
import type { Team } from '@/types/player';
import { TEAM_COLORS, pickTeamName } from '@/utils/team-names';
import type { SliceActions, StoreGet, StoreSet } from './game-store-types';

/** The actions of the slice of the teams. */
export type TeamActions = SliceActions<
  | 'initTeams'
  | 'createTeam'
  | 'removeTeam'
  | 'assignPlayerToTeam'
  | 'awardPoints'
>;

/**
 * The slice of the teams of a session.
 *
 * @param set - The setter of the store.
 * @param get - The reader of the store.
 */
export function createTeamActions(
  set: StoreSet,
  get: StoreGet
): TeamActions {
  return {
    // ── initTeams ─────────────────────────────────────────────────
    initTeams(count) {
      const usedNames: string[] = [];
      const teams: Team[] = Array.from({ length: count }, (_, i) => {
        const name = pickTeamName(usedNames);
        usedNames.push(name);
        return {
          id: crypto.randomUUID(),
          name,
          playerIds: [],
          score: 0,
          color: TEAM_COLORS[i % TEAM_COLORS.length]!,
        };
      });
      set({ teams });
    },

    // ── createTeam ────────────────────────────────────────────────
    createTeam(name) {
      const { teams } = get();
      const teamName = name ?? pickTeamName(teams.map(t => t.name));
      const newTeam: Team = {
        id: crypto.randomUUID(),
        name: teamName,
        playerIds: [],
        score: 0,
        color: TEAM_COLORS[teams.length % TEAM_COLORS.length]!,
      };
      set({ teams: [...teams, newTeam] });
    },

    // ── removeTeam ────────────────────────────────────────────────
    removeTeam(teamId) {
      const { teams, players } = get();
      set({
        teams: teams.filter(t => t.id !== teamId),
        players: players.map(p =>
          p.teamId === teamId ? { ...p, teamId: undefined } : p,
        ),
      });
    },

    // ── assignPlayerToTeam ────────────────────────────────────────
    assignPlayerToTeam(playerId, teamId) {
      const { teams, players } = get();
      const player = players.find(p => p.id === playerId);
      if (!player) return;
      const oldTeamId = player.teamId;

      set({
        players: players.map(p =>
          p.id === playerId ? { ...p, teamId } : p,
        ),
        teams: teams.map(t => {
          if (t.id === oldTeamId) {
            return { ...t, playerIds: t.playerIds.filter(id => id !== playerId) };
          }
          if (t.id === teamId) {
            return { ...t, playerIds: [...t.playerIds, playerId] };
          }
          return t;
        }),
      });
    },

    // ── awardPoints ───────────────────────────────────────────────
    awardPoints(entityId, points) {
      set((state) => {
        const isTeam = state.teams.some(t => t.id === entityId);
        if (isTeam) {
          return {
            teams: state.teams.map((t) =>
              t.id === entityId ? { ...t, score: Math.max(0, t.score + points) } : t,
            ),
          };
        }

        const player = state.players.find(p => p.id === entityId);
        if (!player) return state;

        const teamId = player.teamId;
        return {
          players: state.players.map((p) =>
            p.id === entityId ? { ...p, score: Math.max(0, p.score + points) } : p,
          ),
          // Sync points up to the player's team if they are in one (for individual turns in teams)
          teams: teamId ? state.teams.map((t) =>
            t.id === teamId ? { ...t, score: Math.max(0, t.score + points) } : t,
          ) : state.teams,
        };
      });
    },
  };
}
