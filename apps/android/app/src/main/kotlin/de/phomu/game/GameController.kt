package de.phomu.game

import de.phomu.bridge.BridgeFailure
import de.phomu.bridge.BridgeVocabulary
import de.phomu.bridge.GameBridge
import de.phomu.bridge.PlayerScore
import de.phomu.bridge.TeamScore
import de.phomu.bridge.toBridgeFailure
import de.phomu.bridge.toPlayerScores
import de.phomu.bridge.toTeamScores
import org.phomu.bridge.PhomuCatalogHandle
import org.phomu.bridge.PhomuException
import org.phomu.bridge.PhomuGameConfig
import org.phomu.bridge.PhomuPlayer
import org.phomu.bridge.PhomuRoundView
import org.phomu.bridge.PhomuSessionHandle
import org.phomu.bridge.PhomuAnswer
import org.phomu.bridge.PhomuTeam
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * The phase of the round, as the shell shows it.
 *
 * WHY the shell has an enumeration of its own: the base decides which phase
 * a round is in, and the shell draws it. The enumeration is the drawing, not
 * the decision — every value of it is read out of a view model of the base.
 */
enum class GamePhase {
    /** No round is running. */
    Idle,

    /** A card is being drawn. */
    Drawing,

    /** The question stands. */
    Question,

    /** The round is scored. */
    Scoring,

    /** The solution of the round is released. */
    Reveal,

    /** The game is over. */
    Finished,
}

/**
 * The solution of the round, as the shell shows it after the reveal.
 *
 * WHY the solution has its own type: in the question phase the shell has no
 * field that could carry the identity of the song. The type exists only
 * after the base has released it
 * (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).
 *
 * @param title the title of the song
 * @param artist the artist of the song
 * @param year the year of the release
 * @param isCorrect whether the answer of the pilot was correct
 * @param pointsAwarded the number of points that were awarded
 */
data class RevealContent(
    val title: String,
    val artist: String,
    val year: Int,
    val isCorrect: Boolean,
    val pointsAwarded: Int,
)

/**
 * One source the shell may play, as the base named it.
 *
 * @param source the identifier of the source
 * @param kind the kind of the source: `embed`, `preview-audio` or `deep-link`
 * @param location the location the shell has to open
 */
data class MediaCandidate(
    val source: String,
    val kind: String,
    val location: String,
)

/**
 * The plan of the base for the media of the round.
 *
 * @param candidates the sources, in the order they have to be tried
 * @param startSeconds the offset the playback starts at
 * @param endSeconds the offset the playback stops at
 */
data class MediaPlan(
    val candidates: List<MediaCandidate>,
    val startSeconds: Int,
    val endSeconds: Int?,
)

/**
 * The state of the game, as the shell draws it.
 *
 * WHY the state has no field for the song: in the question phase the base
 * does not hand the identity of the song over, and the shell must not have
 * one either. The field [reveal] is filled only after the base has released
 * the solution.
 *
 * @param phase the phase of the round
 * @param roundNumber the number of the round
 * @param mode the identifier of the mode of the round
 * @param hints the censored hints of the song
 * @param options the options the mode offers
 * @param pointsPossible the number of points the round is worth
 * @param answersLocked whether the answers are locked in
 * @param reveal the solution of the round, after the reveal
 * @param players the scores of the players
 * @param teams the scores of the teams
 * @param roundCount the number of rounds that were played
 * @param isGameOver whether the game is over
 * @param winnerId the identifier of the winner
 * @param mediaPlan the plan of the base for the media of the round
 * @param failure the failure of the last command, if there was one
 * @param isBusy whether a command of the base is running
 */
data class GameUiState(
    val phase: GamePhase = GamePhase.Idle,
    val roundNumber: Int = 0,
    val mode: String = "",
    val hints: List<String> = emptyList(),
    val options: List<String> = emptyList(),
    val pointsPossible: Int = 0,
    val answersLocked: Boolean = false,
    val reveal: RevealContent? = null,
    val players: List<PlayerScore> = emptyList(),
    val teams: List<TeamScore> = emptyList(),
    val roundCount: Int = 0,
    val isGameOver: Boolean = false,
    val winnerId: String? = null,
    val mediaPlan: MediaPlan? = null,
    val failure: BridgeFailure? = null,
    val isBusy: Boolean = false,
)

/**
 * The controller of a running game.
 *
 * WHAT: the shell's counterpart of a session of the base. It sends the
 * commands of the player to the base, reads the view models the base answers
 * with and publishes them as the state of the interface.
 *
 * WHY the controller decides nothing: every command it sends is answered by
 * the base, and the state it publishes is a projection of the answer. The
 * controller never computes a phase, a score or a winner
 * (docs/design/BUILD-CONTRACT.md § 2.4).
 *
 * WHY the controller is not a view model: the view model of Compose holds
 * the state of the screen; the controller holds the session. The two are
 * separated so that the session can be tested without Android.
 */
class GameController(
    private val bridge: GameBridge,
    private val now: () -> Long = { System.currentTimeMillis() },
    private val seed: () -> Long = { kotlin.random.Random.nextLong() },
) {

    /** The handle of the session of the base. */
    private var handle: PhomuSessionHandle? = null

    /** The state of the interface. */
    private val mutableState = MutableStateFlow(GameUiState())

    /** The state of the interface, as a stream. */
    val state: StateFlow<GameUiState> = mutableState.asStateFlow()

    /**
     * Creates the session and starts the game.
     *
     * @param config the configuration of the session
     * @param players the players of the session
     * @param teams the teams of the session
     * @param catalogue the catalogue the session draws from
     * @return the failure of the base, if there was one
     */
    fun start(
        config: PhomuGameConfig,
        players: List<PhomuPlayer>,
        teams: List<PhomuTeam>,
        catalogue: PhomuCatalogHandle?,
    ): BridgeFailure? = runCommand {
        val session = bridge.newSession(config, players, teams, catalogue, seed(), now())
        handle = session
        val view = bridge.start(session, now())
        publish(view)
    }

    /**
     * Draws a song and opens the question phase.
     *
     * @return the failure of the base, if there was one
     */
    fun draw(): BridgeFailure? = runCommand {
        val session = requireHandle()
        publish(bridge.draw(session, BridgeVocabulary.DRAW_SOURCE_RANDOM, null))
    }

    /**
     * Submits the answer of the active player.
     *
     * @param answer the answer of the player
     * @param answeredInSeconds the time the answer took
     * @return the failure of the base, if there was one
     */
    fun answer(
        answer: PhomuAnswer,
        answeredInSeconds: Int?,
    ): BridgeFailure? = runCommand {
        val session = requireHandle()
        val scores = bridge.answer(session, answer, answeredInSeconds)
        mutableState.update {
            it.copy(
                answersLocked = true,
                players = scores.players.toPlayerScores(),
            )
        }
    }

    /**
     * Releases the solution of the round.
     *
     * @return the failure of the base, if there was one
     */
    fun reveal(): BridgeFailure? = runCommand {
        val session = requireHandle()
        val reveal = bridge.reveal(session)
        mutableState.update {
            it.copy(
                phase = GamePhase.Reveal,
                reveal = RevealContent(
                    title = reveal.title,
                    artist = reveal.artist,
                    year = reveal.year,
                    isCorrect = reveal.isCorrect,
                    pointsAwarded = reveal.pointsAwarded.toInt(),
                ),
                players = it.players,
            )
        }
    }

    /**
     * Closes the round and prepares the next one.
     *
     * @return the failure of the base, if there was one
     */
    fun nextRound(): BridgeFailure? = runCommand {
        val session = requireHandle()
        publish(bridge.nextRound(session, now()))
    }

    /**
     * Ends the game.
     *
     * @return the failure of the base, if there was one
     */
    fun end(): BridgeFailure? = runCommand {
        val session = requireHandle()
        val over = bridge.end(session, mutableState.value.winnerId)
        mutableState.update {
            it.copy(
                phase = GamePhase.Finished,
                isGameOver = true,
                winnerId = over.winnerId,
                players = over.players.toPlayerScores(),
                teams = over.teamScores.toTeamScores(),
            )
        }
    }

    /**
     * The plan of the base for the media of the round.
     *
     * @return the plan, or `null` when the base has none
     */
    fun mediaPlan(): MediaPlan? {
        val session = handle ?: return null
        val plan = bridge.mediaPlan(session)
        return MediaPlan(
            candidates = plan.candidates.map {
                MediaCandidate(source = it.source, kind = it.kind, location = it.location)
            },
            startSeconds = plan.startSeconds.toInt(),
            endSeconds = plan.endSeconds?.toInt(),
        )
    }

    /**
     * The scores of the session, read from the base.
     *
     * @return the scores, or `null` when there is no session
     */
    fun refreshScores() {
        val session = handle ?: return
        val snapshot = bridge.snapshot(session)
        mutableState.update {
            it.copy(
                players = snapshot.players.toPlayerScores(),
                teams = snapshot.teamScores.toTeamScores(),
                roundCount = snapshot.roundCount.toInt(),
            )
        }
    }

    /**
     * Publishes the view of the base as the state of the interface.
     *
     * @param view the view of the base
     */
    private fun publish(view: PhomuRoundView) {
        val phase = when (view) {
            is PhomuRoundView.Drawing -> GamePhase.Drawing
            is PhomuRoundView.Question -> GamePhase.Question
            is PhomuRoundView.Scoring -> GamePhase.Scoring
        }
        mutableState.update { current ->
            when (view) {
                is PhomuRoundView.Drawing -> current.copy(
                    phase = phase,
                    roundNumber = view.roundNumber.toInt(),
                    mode = view.mode,
                    hints = emptyList(),
                    options = emptyList(),
                    pointsPossible = 0,
                    answersLocked = false,
                    reveal = null,
                )

                is PhomuRoundView.Question -> current.copy(
                    phase = phase,
                    roundNumber = view.roundNumber.toInt(),
                    mode = view.mode,
                    hints = view.hints,
                    options = view.options,
                    pointsPossible = view.pointsPossible.toInt(),
                    answersLocked = view.answersLocked,
                    reveal = null,
                )

                is PhomuRoundView.Scoring -> current.copy(
                    phase = phase,
                    roundNumber = view.roundNumber.toInt(),
                    mode = view.mode,
                    winnerId = view.winnerId ?: current.winnerId,
                )
            }
        }
    }

    /**
     * Runs a command of the base and publishes its failure.
     *
     * @param command the command of the base
     * @return the failure of the base, if there was one
     */
    private fun runCommand(command: () -> Unit): BridgeFailure? = try {
        mutableState.update { it.copy(isBusy = true, failure = null) }
        command()
        null
    } catch (failure: PhomuException) {
        val mapped = failure.toBridgeFailure()
        mutableState.update { it.copy(failure = mapped) }
        mapped
    } finally {
        mutableState.update { it.copy(isBusy = false) }
    }

    /**
     * The handle of the session.
     *
     * @return the handle of the session
     */
    private fun requireHandle(): PhomuSessionHandle = handle
        ?: throw IllegalStateException("the session has not been started")
}
