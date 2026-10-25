package de.phomu

import de.phomu.game.LeaveGameGuard
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The back button of the game.
 *
 * WHAT: the test of the confirmation that appears when the player leaves a
 * running game.
 *
 * WHY the test exists: the system back gesture is the most used control of
 * Android, and a game that ends by accident costs the group its place
 * (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-122).
 */
class BackNavigationTest {

    /**
     * The back button of the game asks before the game ends.
     */
    @Test
    fun back_from_game_asks_for_confirmation() {
        val guard = LeaveGameGuard()

        assertFalse("no confirmation before the back button", guard.isDialogVisible)

        assertTrue("the back button shows the confirmation", guard.onBackPressed())
        assertTrue("the confirmation is visible", guard.isDialogVisible)
    }

    /**
     * The confirmation lets the player stay in the game.
     */
    @Test
    fun dismissing_the_confirmation_keeps_the_game() {
        val guard = LeaveGameGuard()
        guard.onBackPressed()

        guard.dismiss()

        assertFalse("the confirmation is gone", guard.isDialogVisible)
    }

    /**
     * The confirmation lets the player leave the game.
     */
    @Test
    fun confirming_the_confirmation_leaves_the_game() {
        val guard = LeaveGameGuard()
        guard.onBackPressed()

        assertTrue("the game may be left", guard.confirm())
        assertFalse("the confirmation is gone", guard.isDialogVisible)
    }
}
