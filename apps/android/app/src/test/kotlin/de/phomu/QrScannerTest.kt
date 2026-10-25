package de.phomu

import de.phomu.config.GameConfigFactory
import de.phomu.game.GameController
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * The scan of a card.
 *
 * WHAT: the test of the source of a draw.
 *
 * WHY the card source is off in this milestone: the bridge exports no entry
 * point for the intent of a card — the only entry point expects the whole
 * song document, and the format of the card is a rule that belongs to the
 * base (`formats/phomu-qr`). A shell that decoded the card itself would
 * implement a rule of the game, which the architecture forbids. The lobby
 * therefore offers the random draw, and the gap is listed in the delivery
 * report of the track.
 *
 * The test therefore proves two things: the shell never asks the base for
 * the card source, and the shell does not decode a card on its own.
 */
class QrScannerTest {

    /** The bridge of the test. */
    private val bridge = FakeGameBridge()

    /** The controller of the test. */
    private val controller = GameController(
        bridge = bridge,
        now = { 1_000L },
        seed = { 42L },
    )

    /**
     * A scan of a card does not change the source of the draw.
     */
    @Test
    fun scan_applies_the_pack_intent() {
        controller.start(
            config = GameConfigFactory.create(listOf("timeline"), listOf("pack-one")),
            players = emptyList(),
            teams = emptyList(),
            catalogue = null,
        )

        assertNull(controller.draw())

        assertTrue(
            "the draw comes from the catalogue of the base",
            bridge.commands.contains("draw:random"),
        )
        assertFalse(
            "the shell never asks for the card source",
            bridge.commands.any { command -> command.startsWith("draw:qr") },
        )
    }

    /**
     * The shell carries no decoder of the format of a card.
     *
     * WHY the test scans the sources: a decoder that is added later would
     * implement a rule in the shell. The scan is the cheapest way to keep
     * that from happening by accident.
     */
    @Test
    fun the_shell_carries_no_card_decoder() {
        val sources = File("src/main/kotlin").walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .toList()

        assertTrue("the sources of the shell exist", sources.isNotEmpty())
        val offenders = sources.filter { file ->
            val content = file.readText()
            content.contains("qr-intent") || content.contains("QrIntent")
        }
        assertTrue(
            "no source of the shell decodes the format of a card: ${offenders.map { it.name }}",
            offenders.isEmpty(),
        )
    }
}
