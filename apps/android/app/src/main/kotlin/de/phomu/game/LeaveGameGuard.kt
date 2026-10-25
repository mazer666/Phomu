package de.phomu.game

/**
 * The guard that asks before a running game is left.
 *
 * WHAT: the state holder of the confirmation that appears when the player
 * presses the back button during a round.
 *
 * WHY the confirmation exists: a party game is interrupted by a phone call
 * and by a pocket; a game that ends by accident costs the group its place
 * (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-122, LOBBY-023).
 *
 * WHY it is a class and not a flag in the screen: the behaviour is the
 * subject of a test that runs without a device.
 *
 * EXAMPLE: `guard.onBackPressed()` returns `true` and shows the dialog; the
 * game is only left after `guard.confirm()`.
 */
class LeaveGameGuard {

    /** Whether the confirmation is visible. */
    var isDialogVisible: Boolean = false
        private set

    /**
     * The reaction of the shell to the back button.
     *
     * @return `true` when the confirmation was shown, `false` when the game
     *   may be left right away
     */
    fun onBackPressed(): Boolean {
        isDialogVisible = true
        return true
    }

    /**
     * The confirmation of the player.
     *
     * @return `true` when the game may be left
     */
    fun confirm(): Boolean {
        isDialogVisible = false
        return true
    }

    /**
     * The dismissal of the confirmation by the player.
     */
    fun dismiss() {
        isDialogVisible = false
    }
}
