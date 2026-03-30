/**
 * Game Store (Zustand)
 *
 * Zentrale Zustandsverwaltung für eine Phomu-Spielsitzung.
 * Persistiert in localStorage, damit ein Seiten-Reload die
 * Lobby-Konfiguration nicht löscht.
 *
 * Importieren via: import { useGameStore } from '@/stores/game-store';
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, GameConfig, GameRound, RoundPhase, PlayerAnswer } from '@/types/game-state';
import type { Player } from '@/types/player';
import type { PhomuSong } from '@/types/song';
import { PHOMU_CONFIG } from '@/config/game-config';

// ─── Standardkonfiguration ────────────────────────────────────────

/** Wird beim Anlegen einer neuen Session verwendet */
const DEFAULT_CONFIG: GameConfig = {
  selectedModes: ['timeline'],
  selectedPacks: [PHOMU_CONFIG.SONG_PACKS[0]],
  teamMode: PHOMU_CONFIG.DEFAULT_TEAM_MODE,
  deviceMode: 'pass-the-phone',
  winCondition: PHOMU_CONFIG.DEFAULT_WIN_SCORE,
  timeLimitSeconds: null,
  difficulty: 'all',
  chipsEnabled: PHOMU_CONFIG.ENABLE_CHIPS_BETTING,
};

// ─── Store-Interface ──────────────────────────────────────────────

/** Alle Actions, die auf den GameState operieren */
interface GameActions {
  /** Setzt den gesamten State zurück und generiert eine neue Session-ID */
  initSession: () => void;

  /** Fügt einen neuen Spieler zur Lobby hinzu */
  addPlayer: (name: string, avatar?: string, color?: string) => void;

  /** Entfernt einen Spieler anhand seiner ID */
  removePlayer: (playerId: string) => void;

  /** Aktualisiert die Spielkonfiguration (Teilaktualisierung möglich) */
  setConfig: (updates: Partial<GameConfig>) => void;

  /** Startet das Spiel — setzt Rundenstand und wählt den ersten Modus */
  startGame: () => void;

  /** Speichert die abgeschlossene Runde und bereitet die nächste vor */
  nextRound: () => void;

  /** Beendet das Spiel und setzt den Gewinner */
  endGame: (winnerId?: string) => void;

  /** Setzt den aktuellen Song und wechselt in die Fragerunde */
  drawSong: (song: PhomuSong) => void;

  /** Wechselt die aktuelle Rundenphase */
  advancePhase: (phase: RoundPhase) => void;

  /** Fügt eine Spielerantwort zur laufenden Runde hinzu */
  submitAnswer: (answer: PlayerAnswer) => void;

  /** Addiert Punkte zum Score eines Spielers */
  awardPoints: (playerId: string, points: number) => void;

  /** Setzt alle Spieler-Scores auf 0 zurück (für "Nochmal spielen") */
  resetScores: () => void;
}

/** Vollständiger Store-Typ = State + Actions */
export type GameStore = GameState & GameActions;

// ─── Initialer State ──────────────────────────────────────────────

function createInitialState(): GameState {
  return {
    sessionId: crypto.randomUUID(),
    players: [],
    teams: [],
    turnOrder: [],
    currentTurnIndex: 0,
    config: DEFAULT_CONFIG,
    currentRound: 0,
    roundPhase: 'drawing',
    currentSong: null,
    currentMode: 'timeline',
    currentAnswers: [],
    roundHistory: [],
    playedSongIds: [],
    isGameOver: false,
    winnerId: undefined,
  };
}

/** Wählt zufällig einen Modus aus der Liste der aktiven Modi */
function pickRandomMode(modes: GameState['config']['selectedModes']): GameState['currentMode'] {
  return modes[Math.floor(Math.random() * modes.length)] ?? 'timeline';
}

// ─── Store ────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // ── initSession ──────────────────────────────────────────────
      initSession() {
        set(createInitialState());
      },

      // ── addPlayer ────────────────────────────────────────────────
      addPlayer(name, avatar, color) {
        const { players, turnOrder } = get();

        // Maximalanzahl prüfen
        if (players.length >= PHOMU_CONFIG.MAX_PLAYERS) return;

        const newPlayer: Player = {
          id: crypto.randomUUID(),
          name: name.trim(),
          score: 0,
          isEliminated: false,
          isSpectator: false,
          // Der erste Spieler wird automatisch zum Piloten
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

        // Wenn der Pilot entfernt wird, übernimmt der erste verbleibende Spieler
        const removedWasPilot = players.find((p) => p.id === playerId)?.isPilot ?? false;
        const updated = removedWasPilot && remaining.length > 0
          ? remaining.map((p, i) => (i === 0 ? { ...p, isPilot: true } : p))
          : remaining;

        set({
          players: updated,
          turnOrder: turnOrder.filter((id) => id !== playerId),
        });
      },

      // ── setConfig ────────────────────────────────────────────────
      setConfig(updates) {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },

      // ── startGame ────────────────────────────────────────────────
      startGame() {
        const { config } = get();
        set({
          currentRound: 1,
          roundPhase: 'drawing',
          currentMode: pickRandomMode(config.selectedModes),
          currentSong: null,
          currentAnswers: [],
          isGameOver: false,
          winnerId: undefined,
        });
      },

      // ── nextRound ────────────────────────────────────────────────
      nextRound() {
        const {
          currentRound,
          config,
          currentTurnIndex,
          turnOrder,
          currentMode,
          currentAnswers,
          currentSong,
          roundHistory,
        } = get();

        // Abgeschlossene Runde in den Verlauf schreiben (nur wenn Song vorhanden)
        const newHistory: GameRound[] =
          currentSong !== null
            ? [
                ...roundHistory,
                {
                  roundNumber: currentRound,
                  mode: currentMode,
                  song: currentSong,
                  answers: currentAnswers,
                  completedAt: new Date().toISOString(),
                },
              ]
            : roundHistory;

        set({
          currentRound: currentRound + 1,
          roundPhase: 'drawing',
          currentMode: pickRandomMode(config.selectedModes),
          currentSong: null,
          currentAnswers: [],
          currentTurnIndex: turnOrder.length > 0
            ? (currentTurnIndex + 1) % turnOrder.length
            : 0,
          roundHistory: newHistory,
        });
      },

      // ── endGame ──────────────────────────────────────────────────
      endGame(winnerId) {
        set({ isGameOver: true, winnerId, roundPhase: 'scoring' });
      },

      // ── drawSong ─────────────────────────────────────────────────
      drawSong(song) {
        set((state) => ({
          currentSong: song,
          roundPhase: 'question',
          playedSongIds: [...state.playedSongIds, song.id],
        }));
      },

      // ── advancePhase ──────────────────────────────────────────────
      advancePhase(phase) {
        set({ roundPhase: phase });
      },

      // ── submitAnswer ──────────────────────────────────────────────
      submitAnswer(answer) {
        set((state) => ({
          currentAnswers: [...state.currentAnswers, answer],
        }));
      },

      // ── awardPoints ───────────────────────────────────────────────
      awardPoints(playerId, points) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score: p.score + points } : p,
          ),
        }));
      },

      // ── resetScores ───────────────────────────────────────────────
      resetScores() {
        set((state) => ({
          players: state.players.map((p) => ({ ...p, score: 0 })),
          currentRound: 0,
          roundHistory: [],
          playedSongIds: [],
          currentAnswers: [],
          currentSong: null,
          isGameOver: false,
          winnerId: undefined,
          roundPhase: 'drawing',
        }));
      },
    }),

    {
      name: 'phomu-game-state',
      // Nur Lobby-relevante Daten persistieren; Spielstand wird bei initSession zurückgesetzt
      partialize: (state) => ({
        players: state.players,
        config: state.config,
        sessionId: state.sessionId,
      }),
    }
  )
);
