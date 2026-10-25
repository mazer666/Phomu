/**
 * The slice of the timeline of a session.
 *
 * WHAT: the years that are on the timeline of the round — the years it
 * starts with, the year a correct answer adds and the year the player
 * removes.
 */
import type { SliceActions, StoreSet } from './game-store-types';

/** The actions of the slice of the timeline. */
export type TimelineActions = SliceActions<
  'initTimeline' | 'addTimelineYear' | 'removeTimelineYear'
>;

/**
 * The slice of the timeline of a session.
 *
 * WHY the years are always sorted: the timeline is a list of years, and the
 * slots of the mode depend on the order. The rule lives here, so that every
 * path that changes the timeline keeps it.
 *
 * @param set - The setter of the store.
 */
export function createTimelineActions(set: StoreSet): TimelineActions {
  return {
    // ── initTimeline ──────────────────────────────────────────────
    initTimeline(years) {
      set({ timelineYears: [...years].sort((a, b) => a - b) });
    },

    // ── addTimelineYear ───────────────────────────────────────────
    addTimelineYear(year) {
      set((state) => ({
        timelineYears: [...state.timelineYears, year].sort((a, b) => a - b),
      }));
    },

    // ── removeTimelineYear ────────────────────────────────────────
    removeTimelineYear(year) {
      set((state) => {
        const idx = state.timelineYears.indexOf(year);
        if (idx === -1) return {};
        const next = [...state.timelineYears];
        next.splice(idx, 1);
        return { timelineYears: next };
      });
    },
  };
}
