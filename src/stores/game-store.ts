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
import type { Player, Team } from '@/types/player';
import type { PhomuSong } from '@/types/song';

// ─── Lustige Team-Namen ───────────────────────────────────────────

const FUNNY_TEAM_NAMES = [
  'Die Ohrwürmer', 'Stimmbruch Deluxe', 'Absolute Divas', 'Team Gänsehaut',
  'Die Taktlosen', 'Bass im Gesicht', 'Die Plattenbosse', 'Vollplayback',
  'Die Kopfhörer-Diebe', 'Team Zugabe', 'Karaoke-Katastrophe', 'Die Falschen Noten',
  'Riff Raff', 'Die Discokugel-Gang', 'Team Eintagsfliege', 'Einfach zu laut',
  'Die Hinterbänkler', 'Team Aufgedreht', 'Die Plattenspieler', 'Autotune-Verbot',
  'Team Schallmauer', 'Die Dauerschleife', 'Mosh-Pit-Diplomaten', 'Team Bassgewicht',
];

const TEAM_COLORS = ['#FF6B35', '#118AB2', '#06D6A0', '#EF476F', '#9B5DE5', '#FFD166'];

function pickTeamName(usedNames: string[]): string {
  const available = FUNNY_TEAM_NAMES.filter(n => !usedNames.includes(n));
  const pool = available.length > 0 ? available : FUNNY_TEAM_NAMES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
import { PHOMU_CONFIG } from '@/config/game-config';

// ─── Standardkonfiguration ────────────────────────────────────────

/** Wird beim Anlegen einer neuen Session verwendet */
const DEFAULT_CONFIG: GameConfig = {
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
  onlyQRCompatible: false,
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
  drawSong: (song: PhomuSong, source?: 'random' | 'qr') => void;

  /** Überspringt einen defekten Song (404/Restricted) */
  skipBrokenSong: () => void;

  /** Setzt den bevorzugten Player-Typ */
  setPreferredPlayer: (type: 'standard' | 'music') => void;

  /** Audio-Einstellungen für Musik/SFX */
  setAudioSettings: (updates: Partial<Pick<GameState, 'musicEnabled' | 'musicVolume' | 'sfxEnabled' | 'sfxVolume'>>) => void;

  /** Wechselt die aktuelle Rundenphase */
  advancePhase: (phase: RoundPhase) => void;

  /** Fügt eine Spielerantwort zur laufenden Runde hinzu */
  submitAnswer: (answer: PlayerAnswer) => void;

  /** Addiert Punkte zum Score eines Spielers */
  awardPoints: (playerId: string, points: number) => void;

  /** Setzt alle Spieler-Scores auf 0 zurück (für "Nochmal spielen") */
  resetScores: () => void;

  /** Startet sofort ein Spiel mit einem spezifischen Song (Quick Play) */
  startQuickGame: (song: PhomuSong) => void;

  /** Aktualisiert Spielerdaten (z.B. Avatar/Farbe in Settings) */
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;

  /** Setzt den gesamten Fortschritt (XP) zurück */
  resetProgress: () => void;

  /** Erstellt N Teams mit zufälligen lustigen Namen */
  initTeams: (count: number) => void;

  /** Fügt ein neues Team hinzu */
  createTeam: (name?: string) => void;

  /** Entfernt ein Team und hebt alle Zuordnungen auf */
  removeTeam: (teamId: string) => void;

  /** Weist einen Spieler einem Team zu (undefined = kein Team) */
  assignPlayerToTeam: (playerId: string, teamId: string | undefined) => void;

  /** Setzt die initialen Timeline-Jahreszahlen (beim ersten Timeline-Zug) */
  initTimeline: (years: number[]) => void;

  /** Fügt eine Jahreszahl zur Timeline hinzu (nach richtigem Tipp) */
  addTimelineYear: (year: number) => void;

  /** Entfernt eine Jahreszahl aus der Timeline (erste Instanz) */
  removeTimelineYear: (year: number) => void;
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
    // Global Progression & Preferences
    totalXP: 0,
    preferredPlayer: 'standard',
    musicEnabled: true,
    musicVolume: 0.8,
    sfxEnabled: true,
    sfxVolume: 0.55,
    currentSongSource: null,
    autoDrawIntent: false,
    timelineYears: [],
    gameStartTime: null,
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
        const { config, players, teams } = get();
        
        // Define turnOrder based on mode
        const newTurnOrder = config.teamMode === 'individual'
          ? players.map((p) => p.id)
          : teams.map((t) => t.id);

        set({
          turnOrder: newTurnOrder,
          currentTurnIndex: 0,
          currentRound: 1,
          roundPhase: 'drawing',
          currentMode: pickRandomMode(config.selectedModes),
          currentSong: null,
          currentAnswers: [],
          isGameOver: false,
          winnerId: undefined,
          gameStartTime: Date.now(),
        });
      },

      // ── nextRound ────────────────────────────────────────────────
      nextRound() {
        const state = get();
        const {
          currentRound,
          config,
          currentTurnIndex,
          turnOrder,
          currentMode,
          currentAnswers,
          currentSong,
          roundHistory,
          players,
          teams,
          gameStartTime,
        } = state;

        // 1. Check for Game Over Conditions
        let shouldEnd = false;
        let winnerId: string | undefined = undefined;

        // Only check ending after a full rotation is complete (last player finished)
        // or if it's the very first round being initialized.
        const isEndOfRotation = currentTurnIndex === turnOrder.length - 1;

        if (isEndOfRotation) {
          if (config.endingCondition === 'points') {
            const topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
            const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];
            const maxScore = config.teamMode === 'individual' ? (topPlayer?.score ?? 0) : (topTeam?.score ?? 0);
            
            if (maxScore >= config.targetPoints) {
              shouldEnd = true;
              winnerId = config.teamMode === 'individual' ? topPlayer?.id : topTeam?.id;
            }
          } else if (config.endingCondition === 'rounds') {
            // targetRounds is per team/player
            if (currentRound >= config.targetRounds * (config.teamMode === 'individual' ? players.length : teams.length)) {
              shouldEnd = true;
            }
          } else if (config.endingCondition === 'time' && gameStartTime) {
            const elapsedMinutes = (Date.now() - gameStartTime) / 60000;
            if (elapsedMinutes >= config.targetTimeMinutes) {
              shouldEnd = true;
            }
          }
        }

        if (shouldEnd) {
          state.endGame(winnerId);
          return;
        }

        // 2. Prepare next round
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

        const nextTurnIndex = turnOrder.length > 0
          ? (currentTurnIndex + 1) % turnOrder.length
          : 0;

        // Bei Shifting-Teams: Spieler jede Runde neu mischen
        let updatedTeams = teams;
        let updatedPlayers = players;
        if (config.teamMode === 'shifting' && teams.length >= 2) {
          const shuffled = [...players].sort(() => Math.random() - 0.5);
          const newTeams: Team[] = teams.map(t => ({ ...t, playerIds: [] as string[] }));
          shuffled.forEach((p, i) => {
            newTeams[i % newTeams.length]!.playerIds.push(p.id);
          });
          updatedPlayers = players.map(p => {
            const team = newTeams.find(t => t.playerIds.includes(p.id));
            return { ...p, teamId: team?.id };
          });
          updatedTeams = newTeams;
        }

        set({
          currentRound: currentRound + 1,
          roundPhase: 'drawing',
          currentMode: pickRandomMode(config.selectedModes),
          currentSong: null,
          currentAnswers: [],
          currentTurnIndex: nextTurnIndex,
          roundHistory: newHistory,
          teams: updatedTeams,
          players: updatedPlayers,
        });
      },

      // ── endGame ──────────────────────────────────────────────────
      endGame(winnerId) {
        const { players, totalXP } = get();
        // Berechne die in dieser Session verdiente XP (Summe aller Spieler-Punkte)
        const sessionXP = players.reduce((sum, p) => sum + p.score, 0);
        const newTotalXP = totalXP + sessionXP;

        set({
          isGameOver: true,
          winnerId,
          roundPhase: 'scoring',
          totalXP: newTotalXP,
        });
      },

      // ── drawSong ─────────────────────────────────────────────────
      drawSong(song, source = 'random') {
        set((state) => ({
          currentSong: song,
          currentSongSource: source,
          roundPhase: 'question',
          playedSongIds: [...state.playedSongIds, song.id],
          autoDrawIntent: false, // Reset flag once song is actually drawn
        }));
      },

      // ── skipBrokenSong ───────────────────────────────────────────
      skipBrokenSong() {
        const { currentSongSource } = get();
        
        if (currentSongSource === 'qr') {
          // Bei QR-Scan wird nur markiert als "übersprungen"
          set({ roundPhase: 'drawing', autoDrawIntent: false });
          return;
        }

        // Bei Zufallszug wird sofort ein neuer Song gezogen (via DrawingPhase auto-intent)
        set({ roundPhase: 'drawing', currentSong: null, autoDrawIntent: true });
      },

      // ── setPreferredPlayer ────────────────────────────────────────
      setPreferredPlayer(type) {
        set({ preferredPlayer: type });
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
      awardPoints(entityId, points) {
        set((state) => {
          const isTeam = state.teams.some(t => t.id === entityId);
          if (isTeam) {
            return {
              teams: state.teams.map((t) =>
                t.id === entityId ? { ...t, score: t.score + points } : t,
              ),
            };
          }

          const player = state.players.find(p => p.id === entityId);
          if (!player) return state;

          const teamId = player.teamId;
          return {
            players: state.players.map((p) =>
              p.id === entityId ? { ...p, score: p.score + points } : p,
            ),
            // Sync points up to the player's team if they are in one (for individual turns in teams)
            teams: teamId ? state.teams.map((t) =>
              t.id === teamId ? { ...t, score: t.score + points } : t,
            ) : state.teams,
          };
        });
      },

      // ── resetScores ───────────────────────────────────────────────
      resetScores() {
        set((state) => ({
          players: state.players.map((p) => ({ ...p, score: 0 })),
          teams: state.teams.map((t) => ({ ...t, score: 0 })),
          currentRound: 0,
          roundHistory: [],
          playedSongIds: [],
          currentAnswers: [],
          currentSong: null,
          isGameOver: false,
          winnerId: undefined,
          roundPhase: 'drawing',
          timelineYears: [],
        }));
      },

      // ── startQuickGame ───────────────────────────────────────────
      startQuickGame(song) {
        const { addPlayer } = get();
        // Falls keine Spieler da sind, einen Standard-Spieler hinzufügen
        if (get().players.length === 0) {
          addPlayer('Spieler 1', '🎵', '#FF6B35');
        }
        set((state) => ({
          currentRound: 1,
          roundPhase: 'question',
          currentMode: state.config.selectedModes[0] ?? 'timeline',
          currentSong: song,
          currentAnswers: [],
          isGameOver: false,
          winnerId: undefined,
          playedSongIds: [...state.playedSongIds, song.id],
          currentSongSource: 'qr',
        }));
      },

      // ── updatePlayer ─────────────────────────────────────────────
      updatePlayer(playerId, updates) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p,
          ),
        }));
      },

      // ── resetProgress ─────────────────────────────────────────────
      resetProgress() {
        set({ totalXP: 0 });
      },

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
    }),

    {
      name: 'phomu-game-state',
      // Persistiere nun auch Progressions-Daten
      partialize: (state) => ({
        players: state.players,
        teams: state.teams,
        config: state.config,
        sessionId: state.sessionId,
        totalXP: state.totalXP,
        preferredPlayer: state.preferredPlayer,
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
