package de.phomu.browse

import de.phomu.bridge.BridgeVocabulary
import org.phomu.bridge.PhomuSongSummary

/**
 * The state of the catalogue screen, as the shell draws it.
 *
 * @param query the search term of the player
 * @param selectedPackIds the identifiers of the packs the list is filtered by
 * @param difficulty the difficulty the list is filtered by
 * @param onlyQrCompatible whether only the songs of the card deck are shown
 * @param onlyWithLyrics whether only the songs with lyrics are shown
 * @param songs the songs of the list
 * @param isLoading whether the catalogue is being read
 * @param failure the failure of the last command, if there was one
 */
data class BrowseUiState(
    val query: String = "",
    val selectedPackIds: Set<String> = emptySet(),
    val difficulty: String? = null,
    val onlyQrCompatible: Boolean = false,
    val onlyWithLyrics: Boolean = false,
    val songs: List<PhomuSongSummary> = emptyList(),
    val isLoading: Boolean = true,
    val failure: de.phomu.bridge.BridgeFailure? = null,
)

/**
 * The filters of the catalogue screen.
 *
 * WHY the filters live in the shell and not in the base: the base owns the
 * *selection* of a song for a round; the filters of a list that a player
 * browses are a property of the screen. The values the filters use are the
 * vocabulary of the wire.
 */
data class BrowseFilters(
    val query: String = "",
    val packIds: Set<String> = emptySet(),
    val difficulty: String? = null,
    val onlyQrCompatible: Boolean = false,
    val onlyWithLyrics: Boolean = false,
) {
    /**
     * Whether a song belongs to the list.
     *
     * @param song the summary of the song
     * @return `true` when the song matches every filter
     */
    fun matches(song: PhomuSongSummary): Boolean {
        if (packIds.isNotEmpty() && song.packs.none { it in packIds }) return false
        if (difficulty != null && song.difficulty != difficulty) return false
        if (onlyQrCompatible && !song.isQrCompatible) return false
        if (onlyWithLyrics && !song.hasLyrics) return false
        if (query.isNotBlank()) {
            val needle = query.trim().lowercase()
            val haystack = buildString {
                append(song.id.lowercase())
                append(' ')
                append(song.difficulty.lowercase())
                append(' ')
                append(song.packs.joinToString(" ").lowercase())
                append(' ')
                append(song.supportedModes.joinToString(" ").lowercase())
            }
            if (!haystack.contains(needle)) return false
        }
        return true
    }

    companion object {
        /** The difficulties the catalogue screen offers. */
        val DIFFICULTIES: List<String> = listOf(
            BridgeVocabulary.DIFFICULTY_EASY,
            BridgeVocabulary.DIFFICULTY_MEDIUM,
            BridgeVocabulary.DIFFICULTY_HARD,
        )
    }
}
