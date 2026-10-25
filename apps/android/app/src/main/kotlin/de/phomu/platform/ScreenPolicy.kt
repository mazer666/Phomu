package de.phomu.platform

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.provider.Settings
import android.view.WindowManager

/**
 * The policy of the screen of the application.
 *
 * WHAT: the three things the operating system does with the screen of the
 * shell — it stays awake, it turns, and it animates.
 */
object ScreenPolicy {

    /**
     * Keeps the screen awake while a round runs.
     *
     * WHY only during the round: a screen that never sleeps drains the
     * battery of the phone of a party, and the idle timeout of the system is
     * the right behaviour outside the round
     * (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-105).
     *
     * @param activity the activity of the shell
     * @param keepAwake whether the screen should stay awake
     */
    fun setKeepScreenOn(activity: Activity, keepAwake: Boolean) {
        if (keepAwake) {
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    /**
     * The orientation of the screen of the game.
     *
     * WHY the game is locked to the portrait: the game is played with the
     * phone passed around, and the layout of the question is built for the
     * portrait.
     */
    const val GAME_ORIENTATION: Int = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

    /**
     * The orientation of the screens that are read.
     *
     * WHY the settings may lie: the settings are read while the phone lies
     * on the table, and a locked orientation would force the player to turn
     * the phone (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-114).
     */
    const val READ_ORIENTATION: Int = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED

    /**
     * Whether the system asks for less motion.
     *
     * WHY the scale of the animator and not a flag of the shell: the scale
     * is the setting the system offers, and it is what the user has changed
     * (docs/spec/REQUIREMENTS-PLATFORM.md, A11Y-106).
     *
     * @param context the context of the application
     * @return `true` when the animations should be switched off
     */
    fun prefersReducedMotion(context: Context): Boolean {
        val scale = Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        )
        return isReducedMotion(scale)
    }

    /**
     * Whether a scale of the animator asks for less motion.
     *
     * WHY the scale is a parameter: the decision is a rule of the shell and
     * is therefore testable without a device
     * (docs/spec/REQUIREMENTS-PLATFORM.md, A11Y-106).
     *
     * @param scale the scale of the animator of the system
     * @return `true` when the animations should be switched off
     */
    fun isReducedMotion(scale: Float): Boolean = scale == 0f
}
