package de.phomu

import de.phomu.config.GameConfigFactory
import de.phomu.game.GameController
import de.phomu.game.GamePhase
import de.phomu.game.ModeAnswerInput
import de.phomu.game.modeId
import de.phomu.game.toWire
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The journey of a round, as the shell plays it.
 *
 * WHAT: the test of the core journey of the shell — the lobby, the draw, the
 * question, the answer, the reveal and the next round.
 *
 * WHY the test uses the double and not the native library: the test proves
 * that the shell *sequences* the commands of the base correctly. The test of
 * the real library is [BridgeRoundTripTest].
 */
class RoundJourneyTest {

    /** The bridge of the test. */
    private val bridge = FakeGameBridge()

    /** The controller of the test. */
    private val controller = GameController(
        bridge = bridge,
        now = { 1_000L },
        seed = { 42L },
    )

    /**
     * A round runs from the draw to the reveal.
     */
    @Test
    fun completes_one_round() {
        val config = GameConfigFactory.create(
            selectedModes = listOf("timeline"),
            selectedPacks = listOf("pack-one"),
        )
        val failure = controller.start(
            config = config,
            players = listOf(
                org.phomu.bridge.PhomuPlayer(
                    id = "player-1",
                    name = "Alex",
                    teamId = null,
                    isSpectator = false,
                    isPilot = true,
                    color = null,
                    avatar = null,
                ),
            ),
            teams = emptyList(),
            catalogue = null,
        )

        assertNull("the session was created without a failure", failure)
        assertEquals(GamePhase.Drawing, controller.state.value.phase)

        assertNull(controller.draw())
        assertEquals(GamePhase.Question, controller.state.value.phase)
        assertEquals(1, controller.state.value.roundNumber)
        assertEquals("timeline", controller.state.value.mode)

        val input = ModeAnswerInput.Timeline(slot = 0)
        assertNull(controller.answer(input.toWire(input.modeId), null))
        assertTrue(controller.state.value.answersLocked)

        assertNull(controller.reveal())
        assertEquals(GamePhase.Reveal, controller.state.value.phase)
        assertNotNull(controller.state.value.reveal)
        assertEquals("The Answer", controller.state.value.reveal?.title)

        assertNull(controller.nextRound())
        assertEquals(GamePhase.Drawing, controller.state.value.phase)
        assertEquals(2, controller.state.value.roundNumber)
    }

    /**
     * The question phase carries no identity of the song.
     *
     * WHY the test exists: the anti-spoiler guarantee is structural — the
     * state of the shell in the question phase has no field that could carry
     * the title, the artist or the year of the song
     * (docs/design/PLATFORM-ARCHITECTURE.md § 10.2, rule C-1).
     */
    @Test
    fun the_question_phase_carries_no_solution() {
        controller.start(
            config = GameConfigFactory.create(listOf("timeline"), listOf("pack-one")),
            players = emptyList(),
            teams = emptyList(),
            catalogue = null,
        )
        controller.draw()

        val state = controller.state.value
        assertEquals(GamePhase.Question, state.phase)
        assertNull("the question phase has no solution", state.reveal)
        val rendered = state.toString()
        assertFalse("the title is not in the state", rendered.contains("The Answer"))
        assertFalse("the artist is not in the state", rendered.contains("The Artist"))
    }

    /**
     * The shell asks the base for the source of a draw.
     *
     * WHY the test exists: the card source is switched off in this milestone
     * because the bridge exports no entry point for the intent of a card. The
     * shell therefore never asks for it — it asks the base for a random
     * draw, and the base decides which song that is.
     */
    @Test
    fun the_shell_never_asks_for_the_card_source() {
        controller.start(
            config = GameConfigFactory.create(listOf("timeline"), listOf("pack-one")),
            players = emptyList(),
            teams = emptyList(),
            catalogue = null,
        )
        controller.draw()

        assertTrue(bridge.commands.contains("draw:random"))
        assertFalse(bridge.commands.any { command -> command.startsWith("draw:qr") })
    }
}
