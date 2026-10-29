/**
 * Game store (Zustand)
 *
 * Central state management for a Phomu game session.
 * Persisted in localStorage so that a page reload does not wipe
 * the lobby configuration.
 *
 * WHAT: the store is the composition of the slices — the players, the
 * rounds, the teams, the timeline, the preferences and the failures. Every
 * slice owns one part of the state, and this file puts them together.
 *
 * WHY the slices live apart: the store had grown into one file with every
 * kind of state of the shell. The slices make the parts readable on their
 * own, and the store stays the place that decides what is persisted.
 *
 * WHY the question is not persisted: the question of the running round is
 * the question of the base, and a reload has to ask the base again — a
 * persisted question could show a state that the base does not have
 * (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 * Import via: import { useGameStore } from '@/stores/game-store';
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createInitialState } from './game-initial-state';
import { createErrorActions } from './game-store-errors';
import { createPlayerActions } from './game-store-players';
import { createPreferenceActions } from './game-store-preferences';
import { createRoundActions } from './game-store-rounds';
import { createTeamActions } from './game-store-teams';
import { createTimelineActions } from './game-store-timeline';
import type { GameStore } from './game-store-types';

export type { GameActions, GameStore } from './game-store-types';

// ─── Store ────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // ── initSession ──────────────────────────────────────────────
      initSession() {
        set(createInitialState());
      },

      ...createPlayerActions(set, get),
      ...createRoundActions(set, get),
      ...createTeamActions(set, get),
      ...createTimelineActions(set),
      ...createPreferenceActions(set),
      ...createErrorActions(set),
    }),

    {
      name: 'phomu-game-state',
      // Now also persist the progression data
      //
      // WHY the failure is not persisted: a failure is a state of the
      // running session, not a progress. A player who reloads the page gets
      // a fresh attempt — and a failure of the last session would be
      // nonsense in the new one.
      partialize: (state) => ({
        players: state.players,
        teams: state.teams,
        config: state.config,
        sessionId: state.sessionId,
        totalXP: state.totalXP,
        preferredPlayer: state.preferredPlayer,
        preferredMusicProvider: state.preferredMusicProvider,
        musicEnabled: state.musicEnabled,
        musicVolume: state.musicVolume,
        sfxEnabled: state.sfxEnabled,
        sfxVolume: state.sfxVolume,
        currentRound: state.currentRound,
        isGameOver: state.isGameOver,
        timelineYears: state.timelineYears,
        gameStartTime: state.gameStartTime,
      }),
    }
  )
);
