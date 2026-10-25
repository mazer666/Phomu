package de.phomu

import de.phomu.platform.ScreenPolicy
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The reduced motion of the shell.
 *
 * WHAT: the test of the rule that the animations are switched off when the
 * system asks for less motion.
 *
 * WHY the test exists: the requirement A11Y-106 asks every shell to honour
 * the preference of the platform. The feedback stays in text form; only the
 * animation is off.
 */
class ReducedMotionTest {

    /**
     * The animations are switched off when the system asks for it.
     */
    @Test
    fun animations_are_disabled_when_preferred() {
        assertTrue(
            "a scale of zero switches the animations off",
            ScreenPolicy.isReducedMotion(0f),
        )
    }

    /**
     * The animations stay on when the system does not ask for less motion.
     */
    @Test
    fun animations_stay_on_by_default() {
        assertFalse(
            "the default scale keeps the animations",
            ScreenPolicy.isReducedMotion(1f),
        )
        assertFalse(
            "a scale of half keeps the animations",
            ScreenPolicy.isReducedMotion(0.5f),
        )
    }
}
