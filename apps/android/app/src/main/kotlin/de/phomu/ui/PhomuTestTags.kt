package de.phomu.ui

/**
 * The marks that the tests of the shell use to find a control.
 *
 * WHY they live in one place: a test that has to know the name of a
 * control should not have to search the sources for it, and a control that
 * is renamed should break one file and not every test. The names are the
 * same on every platform of the shell — the web shell uses `data-testid`.
 *
 * EXAMPLE: the test of the timeline finds the slot with
 * `onNodeWithTag("${PhomuTestTags.TIMELINE_SLOT}0")`.
 */
object PhomuTestTags {
    /** The main action of a screen — the button that advances the round. */
    const val PRIMARY_ACTION: String = "phomu-primary-action"

    /** The button that draws the next card. */
    const val DRAW_CARD: String = "phomu-draw-card"

    /** The input of the name of a player. */
    const val PLAYER_NAME: String = "phomu-player-name"

    /** The button that adds a player. */
    const val ADD_PLAYER: String = "phomu-add-player"

    /** The prefix of the slots of the timeline; the number of the slot follows. */
    const val TIMELINE_SLOT: String = "phomu-timeline-slot-"

    /** The name of a tag of a slot of the timeline. */
    fun timelineSlot(index: Int): String = "$TIMELINE_SLOT$index"
}
