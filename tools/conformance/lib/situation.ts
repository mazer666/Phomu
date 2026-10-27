/**
 * The situation of a vector
 *
 * WHY: the situation has to be built the way the reference builds it —
 * otherwise the comparison measures the harness instead of the two
 * implementations. The Rust core can only reach a situation through its
 * commands, therefore the harness uses the actions of the reference for the
 * same steps: `startGame` for a running game, `drawSong` for a drawn song
 * and `advancePhase` for the reveal. Only the parts that no action can
 * reach (the turn that is played, the years of the timeline, the songs that
 * have been played, the experience points) are set directly.
 */
import { useGameStore } from '@/stores/game-store';
import type { GameConfig, GameState, RoundPhase } from '@/types/game-state';
import type { Player, Team } from '@/types/player';
import type { PhomuSong } from '@/types/song';
import type { ModeSong } from '@/utils/mode-rules';
import type { Vector, VectorSong } from './types';

/** The default hints of a song fixture — the type demands five. */
const DEFAULT_HINTS = ['', '', '', '', ''];

/**
 * Builds a complete song from a fixture.
 *
 * WHY: the catalogue type has many required fields; a vector only names the
 * ones its rule reads. The defaults are documented in the vector schema.
 */
export function buildSong(fixture: VectorSong): PhomuSong {
  return {
    id: fixture.id,
    title: fixture.title ?? fixture.id,
    artist: fixture.artist ?? 'Unknown Artist',
    year: fixture.year,
    country: fixture.country ?? 'US',
    genre: fixture.genre ?? 'Pop',
    difficulty: fixture.difficulty ?? 'medium',
    mood: fixture.mood ?? [],
    packs: fixture.packs ?? [],
    hints: (fixture.hints ?? DEFAULT_HINTS) as PhomuSong['hints'],
    lyrics: fixture.lyrics
      ? {
          real: fixture.lyrics.real as [string, string, string],
          fake: fixture.lyrics.fake,
        }
      : null,
    isOneHitWonder: fixture.isOneHitWonder ?? false,
    supportedModes: fixture.supportedModes ?? [
      'timeline',
      'hint-master',
      'lyrics',
      'vibe-check',
      'survivor',
      'cover-confusion',
    ],
    isQRCompatible: fixture.isQRCompatible ?? true,
    links: {
      youtube:
        fixture.links?.youtube ?? 'https://www.youtube.com/watch?v=phomu',
      coverLink: fixture.links?.coverLink,
    },
  };
}

/**
 * The properties of a song that the mode rules read.
 */
export function toModeSong(song: PhomuSong): ModeSong {
  return {
    id: song.id,
    year: song.year,
    mood: song.mood,
    isOneHitWonder: song.isOneHitWonder,
    artist: song.artist,
    links: { coverLink: song.links.coverLink },
  };
}

/**
 * Builds the situation of a vector in the store.
 *
 * WHY: the situation has to be built the way the reference builds it —
 * otherwise the comparison measures the harness instead of the two
 * implementations. The Rust core can only reach a situation through its
 * commands, therefore the harness uses the actions of the reference for the
 * same steps: `startGame` for a running game, `drawSong` for a drawn song
 * and `advancePhase` for the reveal. Only the parts that no action can
 * reach (the turn that is played, the years of the timeline, the songs that
 * have been played, the experience points) are set directly.
 *
 * @param vector - the vector to build the situation for
 * @returns {PhomuSong|null} the song of the round — the store does not hold
 * it any more (the question view model of the core has no field for the
 * solution), so the harness has to learn it from here
 */
export function buildSituation(vector: Vector): PhomuSong | null {
  const store = useGameStore.getState();
  store.initSession();

  const given = vector.given;

  if (given.config) {
    useGameStore.getState().setConfig(given.config as Partial<GameConfig>);
  }

  const songs = new Map<string, PhomuSong>();
  for (const [id, fixture] of Object.entries(given.songs ?? {})) {
    songs.set(id, buildSong(fixture));
  }

  const players: Player[] = (given.players ?? []).map((player) => ({
    id: player.id,
    name: player.name ?? player.id,
    score: player.score ?? 0,
    teamId: player.teamId ?? undefined,
    isEliminated: player.isEliminated ?? false,
    isSpectator: player.isSpectator ?? false,
    isPilot: player.isPilot ?? false,
  }));

  const teams: Team[] = (given.teams ?? []).map((team) => ({
    id: team.id,
    name: team.name ?? team.id,
    playerIds: team.playerIds ?? [],
    score: team.score ?? 0,
    color: team.color ?? '#FF6B35',
  }));

  // The players and the teams exist before the game starts — the store adds
  // them in the lobby.
  useGameStore.setState({ players, teams });

  // A running game: the reference builds the turn order in `startGame`.
  if ((given.currentRound ?? 0) > 0) {
    useGameStore.getState().startGame();
  }

  // The parts that no action of the reference can reach.
  const patch: Partial<GameState> = {
    timelineYears: given.timelineYears ?? [],
    playedSongIds: given.playedSongIds ?? [],
    currentSongSource: given.currentSongSource ?? null,
    autoDrawIntent: given.autoDrawIntent ?? false,
    gameStartTime: given.gameStartTime ?? null,
    totalXP: given.totalXP ?? 0,
    isGameOver: given.isGameOver ?? false,
    winnerId: given.winnerId ?? undefined,
  };
  if (given.turnOrder) patch.turnOrder = given.turnOrder;
  if (given.currentTurnIndex !== undefined) {
    patch.currentTurnIndex = given.currentTurnIndex;
  }
  if (given.currentRound !== undefined) patch.currentRound = given.currentRound;
  useGameStore.setState(patch);

  // The mode of the round — the core draws it and the shell shows it.
  // `startGame` sets the placeholder 'timeline'; the situation of the
  // vector names the mode of the round, so the reference has to show it.
  if (given.currentMode) {
    useGameStore.getState().setCurrentMode(given.currentMode);
  }

  // The drawn song — the reference draws it with `drawSong`.
  let drawn: PhomuSong | null = null;
  if (given.currentSong) {
    const song = songs.get(given.currentSong);
    if (song) {
      drawn = song;
      useGameStore.getState().setQuestion(
        {
          phase: 'question',
          roundNumber: 0,
          mode: useGameStore.getState().currentMode,
          hints: song.hints,
          options: [],
          identity: null,
          pointsPossible: 0,
          answersLocked: false,
          songId: song.id,
          media: {
            youtube: song.links.youtube,
            youtubeAlternatives: song.links.youtubeAlternatives ?? [],
            spotify: song.links.spotify ?? null,
            spotifyFreePreview: song.links.spotifyFreePreview ?? null,
            amazonMusic: song.links.amazonMusic ?? null,
            amazonPrimePreview: song.links.amazonPrimePreview ?? null,
            coverLink: song.links.coverLink ?? null,
            startSeconds: song.previewTimestamp?.start ?? 0,
            endSeconds: song.previewTimestamp?.end ?? 0,
          },
          context: {
            timelineYears: [],
            timelineSlots: [],
            genre: song.genre,
            pack: song.packs[0] ?? null,
          },
        },
        // The source of the song — a scan or a draw. The question carries it
        // into the store, so it has to be handed over with it.
        given.currentSongSource ?? 'random',
      );
    }
  }

  // The phase — the reference switches it with `advancePhase`. A phase
  // without a drawn song can only be reached that way.
  if (!given.currentSong && given.roundPhase) {
    useGameStore.getState().advancePhase(given.roundPhase as RoundPhase);
  }

  return drawn;
}
