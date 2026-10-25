package de.phomu

import de.phomu.bridge.GameBridge
import org.phomu.bridge.PhomuAnswer
import org.phomu.bridge.PhomuException
import org.phomu.bridge.PhomuCatalogHandle
import org.phomu.bridge.PhomuGameConfig
import org.phomu.bridge.PhomuGameOverSnapshot
import org.phomu.bridge.PhomuMediaCandidate
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
 * The bridge of the base, as a test double.
 *
 * WHAT: a bridge that answers with fixed values and records the commands it
 * received.
 *
 * WHY the tests need it: the rules of the game live in the base, and the
 * tests of the shell must not need the native library to prove that the
 * shell draws what the base reports. The test of the *real* library is
 * [BridgeRoundTripTest].
 */
class FakeGameBridge : GameBridge {

    /** The commands the bridge received, in the order they arrived. */
    val commands: MutableList<String> = mutableListOf()

    /** The version the fake bridge reports. */
    var version: String = "1.0.0"

    /** Whether the fake bridge accepts the bracket of the shell. */
    var accepts: Boolean = true

    /** The failure the fake bridge raises, if there is one. */
    var failure: PhomuException? = null

    /** The view the fake bridge returns for the question phase. */
    var questionView: PhomuRoundView.Question = PhomuRoundView.Question(
        roundNumber = 1u,
        mode = "timeline",
        hints = listOf("[XXX] sang in the eighties"),
        options = emptyList(),
        pointsPossible = 5u,
        answersLocked = false,
    )

    override fun abiVersion(): String {
        commands.add("abiVersion")
        return version
    }

    override fun abiAccepts(
        minimum: Triple<Int, Int, Int>,
        maximum: Triple<Int, Int, Int>,
    ): Boolean {
        commands.add("abiAccepts")
        return accepts
    }

    override fun openCatalogue(source: String): PhomuCatalogHandle {
        commands.add("openCatalogue")
        return PhomuCatalogHandle(id = 1u)
    }

    override fun cataloguePacks(handle: PhomuCatalogHandle): List<PhomuPackInfo> {
        commands.add("cataloguePacks")
        return listOf(
            PhomuPackInfo(
                id = "pack-one",
                name = "Pack One",
                taglineKey = "packs.packOne.tagline",
                songCount = 12u,
            ),
        )
    }

    override fun catalogueSongs(
        handle: PhomuCatalogHandle,
        packs: List<String>,
    ): List<PhomuSongSummary> {
        commands.add("catalogueSongs")
        return listOf(
            PhomuSongSummary(
                id = "song-one",
                difficulty = "easy",
                packs = listOf("pack-one"),
                supportedModes = listOf("timeline"),
                isQrCompatible = true,
                hasLyrics = false,
            ),
        )
    }

    override fun newSession(
        config: PhomuGameConfig,
        players: List<PhomuPlayer>,
        teams: List<PhomuTeam>,
        catalogue: PhomuCatalogHandle?,
        seed: Long,
        nowMs: Long,
    ): PhomuSessionHandle {
        commands.add("newSession")
        failure?.let { throw it }
        return PhomuSessionHandle(id = 7u)
    }

    override fun snapshot(handle: PhomuSessionHandle): PhomuSessionSnapshot {
        commands.add("snapshot")
        return PhomuSessionSnapshot(
            phase = "question",
            roundNumber = 1u,
            currentMode = "timeline",
            pointsPossible = 5u,
            roundCount = 1u,
            players = listOf(
                PhomuPlayerScore(
                    id = "player-1",
                    name = "Alex",
                    score = 3L,
                    teamId = null,
                    isEliminated = false,
                    isSpectator = false,
                ),
            ),
            teamScores = emptyList<PhomuTeamScore>(),
            isGameOver = false,
            winnerId = null,
        )
    }

    override fun start(handle: PhomuSessionHandle, nowMs: Long): PhomuRoundView {
        commands.add("start")
        return PhomuRoundView.Drawing(
            roundNumber = 1u,
            mode = "timeline",
            autoDraw = false,
        )
    }

    override fun draw(
        handle: PhomuSessionHandle,
        source: String,
        song: String?,
    ): PhomuRoundView {
        commands.add("draw:$source")
        return questionView
    }

    override fun answer(
        handle: PhomuSessionHandle,
        answer: PhomuAnswer,
        answeredInSeconds: Int?,
    ): PhomuScoreSnapshot {
        commands.add("answer:${answer.mode}")
        return PhomuScoreSnapshot(
            roundNumber = 1u,
            mode = answer.mode,
            answers = emptyList(),
            players = listOf(
                PhomuPlayerScore(
                    id = "player-1",
                    name = "Alex",
                    score = 5L,
                    teamId = null,
                    isEliminated = false,
                    isSpectator = false,
                ),
            ),
        )
    }

    override fun reveal(handle: PhomuSessionHandle): PhomuRevealView {
        commands.add("reveal")
        return PhomuRevealView(
            roundNumber = 1u,
            mode = "timeline",
            title = "The Answer",
            artist = "The Artist",
            year = 1985,
            isCorrect = true,
            pointsAwarded = 5u,
        )
    }

    override fun nextRound(handle: PhomuSessionHandle, nowMs: Long): PhomuRoundView {
        commands.add("nextRound")
        return PhomuRoundView.Drawing(
            roundNumber = 2u,
            mode = "lyrics",
            autoDraw = false,
        )
    }

    override fun end(handle: PhomuSessionHandle, winnerId: String?): PhomuGameOverSnapshot {
        commands.add("end")
        return PhomuGameOverSnapshot(
            winnerId = winnerId,
            roundCount = 1u,
            players = emptyList(),
            teamScores = emptyList(),
        )
    }

    override fun mediaPlan(handle: PhomuSessionHandle): PhomuMediaPlan {
        commands.add("mediaPlan")
        return PhomuMediaPlan(
            candidates = listOf(
                PhomuMediaCandidate(
                    source = "spotify-free",
                    kind = "preview-audio",
                    location = "https://example.invalid/preview.mp3",
                ),
            ),
            startSeconds = 0u,
            endSeconds = 30u,
        )
    }

    override fun messageKey(event: String): String {
        commands.add("messageKey")
        return "game.feedback.$event"
    }
}
