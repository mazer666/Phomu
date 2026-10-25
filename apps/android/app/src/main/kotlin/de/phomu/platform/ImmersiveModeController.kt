package de.phomu.platform

import android.app.Activity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * The immersive mode of the game.
 *
 * WHAT: the full screen of the game, with the system bars that the player
 * brings back with a swipe.
 *
 * WHY the game is immersive and the other screens are not: during a round
 * the phone is passed around and the system bars of a notification take
 * space away from the question. The bars come back with a swipe from the
 * edge, so nothing is lost.
 */
class ImmersiveModeController(private val activity: Activity) {

    /**
     * Hides the system bars.
     */
    fun enter() {
        val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    /**
     * Shows the system bars.
     */
    fun leave() {
        val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
        controller.show(WindowInsetsCompat.Type.systemBars())
    }
}
