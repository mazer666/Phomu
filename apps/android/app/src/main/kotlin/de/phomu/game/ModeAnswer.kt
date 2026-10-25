package de.phomu.game

import de.phomu.bridge.BridgeVocabulary
import org.phomu.bridge.PhomuAnswer

/**
 * The answer of a player, as the interface collects it.
 *
 * WHY the shell has its own type: the six modes ask different questions, and
 * the interface collects the answers differently. The type describes what the
 * player picked; the wire type describes what the bridge sends.
 */
sealed interface ModeAnswerInput {

    /**
     * The slot the player put the song into — the Timeline mode.
     *
     * @param slot the index of the slot
     */
    data class Timeline(val slot: Int) : ModeAnswerInput

    /**
     * The hint the pilot reached and what the pilot knew — the Hint-Master
     * mode.
     *
     * @param level the level that was reached
     * @param knewWhat what the pilot knew: `both`, `artist`, `title` or `none`
     */
    data class HintMaster(val level: Int, val knewWhat: String) : ModeAnswerInput

    /**
     * The line the player picked — the Lyrics mode.
     *
     * @param pickedFake whether the picked line was the invented one
     */
    data class Lyrics(val pickedFake: Boolean) : ModeAnswerInput

    /**
     * The mood the player picked — the Vibe-Check mode.
     *
     * @param mood the identifier of the mood
     * @param cheatUsed whether a cheat was used
     */
    data class VibeCheck(val mood: String, val cheatUsed: Boolean) : ModeAnswerInput

    /**
     * The guess of the player — the Survivor mode.
     *
     * @param guessedOneHit whether the player guessed a one-hit wonder
     */
    data class Survivor(val guessedOneHit: Boolean) : ModeAnswerInput

    /**
     * The answer of the player — the Cover Confusion mode.
     *
     * @param hintsUsed the number of hints that were used
     * @param pickedArtist the artist the player picked
     * @param selfAssess the self-assessment of the player
     */
    data class CoverConfusion(
        val hintsUsed: Int,
        val pickedArtist: String?,
        val selfAssess: Boolean?,
    ) : ModeAnswerInput
}

/**
 * Turns the answer of the interface into the answer of the wire.
 *
 * WHY the mapping lives here and not in the screens: the bridge defines
 * which field of the answer belongs to which mode
 * (`platform/phomu-ffi/src/answer.rs`), and the base rejects an answer that
 * does not fit the mode of the round. The mapping is the wire contract, not
 * a rule of the game — the points of an answer are decided by the base.
 *
 * EXAMPLE: `ModeAnswerInput.Timeline(2).toWire(BridgeVocabulary.MODE_TIMELINE)`
 * is the answer that puts the song into the third slot.
 */
fun ModeAnswerInput.toWire(mode: String): PhomuAnswer = when (this) {
    is ModeAnswerInput.Timeline -> emptyAnswer(mode).copy(timelineSlot = slot.toUInt())

    is ModeAnswerInput.HintMaster -> emptyAnswer(mode).copy(
        hintLevel = level.toUInt(),
        knewWhat = knewWhat,
    )

    is ModeAnswerInput.Lyrics -> emptyAnswer(mode).copy(pickedFake = pickedFake)

    is ModeAnswerInput.VibeCheck -> emptyAnswer(mode).copy(
        mood = mood,
        cheatUsed = cheatUsed,
    )

    is ModeAnswerInput.Survivor -> emptyAnswer(mode).copy(guessedOneHit = guessedOneHit)

    is ModeAnswerInput.CoverConfusion -> emptyAnswer(mode).copy(
        hintsUsed = hintsUsed.toUInt(),
        pickedArtist = pickedArtist,
        selfAssess = selfAssess,
    )
}

/**
 * An answer without a value.
 *
 * WHY every field is named: the generated record of the bridge has no default
 * values, because a record on the wire has no way to say "the field is
 * absent" other than by carrying the absence. The shell therefore fills
 * every field and leaves the ones of the other modes empty — and the base
 * rejects an answer that does not fit the mode of the round.
 *
 * @param mode the identifier of the mode the answer belongs to
 * @return the empty answer
 */
private fun emptyAnswer(mode: String): PhomuAnswer = PhomuAnswer(
    mode = mode,
    timelineSlot = null,
    hintLevel = null,
    knewWhat = null,
    pickedFake = null,
    claimed = null,
    mood = null,
    cheatUsed = null,
    guessedOneHit = null,
    hintsUsed = null,
    pickedArtist = null,
    selfAssess = null,
    guessCover = null,
)

/**
 * The identifier of the mode an answer belongs to.
 *
 * @return the identifier of the mode
 */
val ModeAnswerInput.modeId: String
    get() = when (this) {
        is ModeAnswerInput.Timeline -> BridgeVocabulary.MODE_TIMELINE
        is ModeAnswerInput.HintMaster -> BridgeVocabulary.MODE_HINT_MASTER
        is ModeAnswerInput.Lyrics -> BridgeVocabulary.MODE_LYRICS
        is ModeAnswerInput.VibeCheck -> BridgeVocabulary.MODE_VIBE_CHECK
        is ModeAnswerInput.Survivor -> BridgeVocabulary.MODE_SURVIVOR
        is ModeAnswerInput.CoverConfusion -> BridgeVocabulary.MODE_COVER_CONFUSION
    }
