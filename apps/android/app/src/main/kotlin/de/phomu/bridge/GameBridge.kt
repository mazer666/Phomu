package de.phomu.bridge

import org.phomu.bridge.PhomuAnswer
import org.phomu.bridge.PhomuCatalogHandle
import org.phomu.bridge.PhomuGameConfig
import org.phomu.bridge.PhomuGameOverSnapshot
import org.phomu.bridge.PhomuMediaPlan
import org.phomu.bridge.PhomuPackInfo
import org.phomu.bridge.PhomuPlayer
import org.phomu.bridge.PhomuPlayerScore
import org.phomu.bridge.PhomuRevealView
import org.phomu.bridge.PhomuRoundView
import org.phomu.bridge.PhomuScoreSnapshot
import org.phomu.bridge.PhomuSessionHandle
import org.phomu.bridge.PhomuSessionSnapshot
import org.phomu.bridge.PhomuSongSummary
import org.phomu.bridge.PhomuTeam
import org.phomu.bridge.PhomuTeamScore

/**
 * The operations the shell sends to the base.
 *
 * WHAT: the surface of the base that the shell uses — the version check, the
 * catalogue, the session and the media plan.
 *
 * WHY an interface and not the generated bindings directly: the state
 * holders of the shell are tested without the native library. The interface
 * is the seam; the implementation that talks to the generated bindings is
 * [UniFfiGameBridge].
 *
 * WHY the DTOs of the bridge are used instead of new Kotlin types: the DTOs
 * are the contract of the surface. A second definition of every DTO in the
 * shell would be a second truth
 * (docs/design/BUILD-CONTRACT.md § 2.3).
 */
interface GameBridge {

    /**
     * The version of the exported surface.
     *
     * @return the version, for example `1.0.0`
     */
    fun abiVersion(): String

    /**
     * Whether the version of the base lies inside a bracket.
     *
     * @param minimum the lowest version the shell accepts
     * @param maximum the highest version the shell accepts
     * @return `true` when the shell may run against the base
     */
    fun abiAccepts(minimum: Triple<Int, Int, Int>, maximum: Triple<Int, Int, Int>): Boolean

    /**
     * Opens the catalogue.
     *
     * @param source the bytes of the catalogue artefact
     * @return the handle of the catalogue
     */
    fun openCatalogue(source: String): PhomuCatalogHandle

    /**
     * The packs of an open catalogue.
     *
     * @param handle the handle of the catalogue
     * @return the packs of the catalogue
     */
    fun cataloguePacks(handle: PhomuCatalogHandle): List<PhomuPackInfo>

    /**
     * The songs of an open catalogue.
     *
     * @param handle the handle of the catalogue
     * @param packs the packs to filter by; an empty list returns every song
     * @return the summaries of the songs
     */
    fun catalogueSongs(handle: PhomuCatalogHandle, packs: List<String>): List<PhomuSongSummary>

    /**
     * Creates a session.
     *
     * @param config the configuration of the session
     * @param players the players of the session
     * @param teams the teams of the session
     * @param catalogue the catalogue the session draws from
     * @param seed the seed of the random generator
     * @param nowMs the current time in milliseconds
     * @return the handle of the session
     */
    fun newSession(
        config: PhomuGameConfig,
        players: List<PhomuPlayer>,
        teams: List<PhomuTeam>,
        catalogue: PhomuCatalogHandle?,
        seed: Long,
        nowMs: Long,
    ): PhomuSessionHandle

    /**
     * The state of a session.
     *
     * @param handle the handle of the session
     * @return the snapshot of the session
     */
    fun snapshot(handle: PhomuSessionHandle): PhomuSessionSnapshot

    /**
     * Starts the game.
     *
     * @param handle the handle of the session
     * @param nowMs the current time in milliseconds
     * @return the view of the round
     */
    fun start(handle: PhomuSessionHandle, nowMs: Long): PhomuRoundView

    /**
     * Draws a song and opens the question phase.
     *
     * @param handle the handle of the session
     * @param source the source of the draw
     * @param song the song of a scanned card
     * @return the view of the round
     */
    fun draw(handle: PhomuSessionHandle, source: String, song: String?): PhomuRoundView

    /**
     * Submits the answer of the active player.
     *
     * @param handle the handle of the session
     * @param answer the answer of the player
     * @param answeredInSeconds the time the answer took
     * @return the scores after the answer
     */
    fun answer(
        handle: PhomuSessionHandle,
        answer: PhomuAnswer,
        answeredInSeconds: Int?,
    ): PhomuScoreSnapshot

    /**
     * Releases the solution of the round.
     *
     * @param handle the handle of the session
     * @return the view of the reveal
     */
    fun reveal(handle: PhomuSessionHandle): PhomuRevealView

    /**
     * Closes the round and prepares the next one.
     *
     * @param handle the handle of the session
     * @param nowMs the current time in milliseconds
     * @return the view of the next round
     */
    fun nextRound(handle: PhomuSessionHandle, nowMs: Long): PhomuRoundView

    /**
     * Ends the game.
     *
     * @param handle the handle of the session
     * @param winnerId the identifier of the winner
     * @return the state of the game at its end
     */
    fun end(handle: PhomuSessionHandle, winnerId: String?): PhomuGameOverSnapshot

    /**
     * The plan of the base for the media of the running round.
     *
     * @param handle the handle of the session
     * @return the plan
     */
    fun mediaPlan(handle: PhomuSessionHandle): PhomuMediaPlan

    /**
     * The i18n key of a game event.
     *
     * @param event the event of the base
     * @return the key
     */
    fun messageKey(event: String): String
}

/**
 * The score of a player, as the shell shows it.
 *
 * WHY a small type instead of the DTO of the bridge: the scoreboard of the
 * shell needs the identifier, the name, the score and the team of a player —
 * and nothing else. The type is a *view* of the DTO, not a copy of it.
 *
 * @param id the identifier of the player
 * @param name the name of the player
 * @param score the score of the player
 * @param teamId the identifier of the team, if the player is in one
 */
data class PlayerScore(
    val id: String,
    val name: String,
    val score: Long,
    val teamId: String?,
)

/**
 * The score of a team, as the shell shows it.
 *
 * @param id the identifier of the team
 * @param score the score of the team
 */
data class TeamScore(
    val id: String,
    val score: Long,
)

/**
 * The scores of the players, as the shell shows them.
 *
 * @param players the scores of the players
 */
fun List<PhomuPlayerScore>.toPlayerScores(): List<PlayerScore> = map {
    PlayerScore(
        id = it.id,
        name = it.name,
        score = it.score,
        teamId = it.teamId,
    )
}

/**
 * The scores of the teams, as the shell shows them.
 *
 * @param teams the scores of the teams
 */
fun List<PhomuTeamScore>.toTeamScores(): List<TeamScore> = map {
    TeamScore(id = it.id, score = it.score)
}
