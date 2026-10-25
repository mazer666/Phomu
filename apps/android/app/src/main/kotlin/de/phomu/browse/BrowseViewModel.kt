package de.phomu.browse

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import de.phomu.bridge.toBridgeFailure
import org.phomu.bridge.PhomuException
import de.phomu.catalogue.Catalogue
import de.phomu.catalogue.CatalogueRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * The view model of the catalogue screen.
 *
 * WHAT: the list of the songs of the catalogue and the filters of the list.
 *
 * WHY the list is read through the bridge: the base owns the catalogue and
 * its selection rules; the shell asks for the songs of the selected packs
 * and filters what it shows (docs/design/BUILD-CONTRACT.md § 4.1).
 */
class BrowseViewModel(
    private val catalogue: CatalogueRepository,
) : ViewModel() {

    /** The state of the screen. */
    private val mutableState = MutableStateFlow(BrowseUiState())

    /** The state of the screen, as a stream. */
    val state: StateFlow<BrowseUiState> = mutableState.asStateFlow()

    /** The filters of the list. */
    private var filters = BrowseFilters()

    /** The catalogue of the session, once it has been read. */
    private var openCatalogue: Catalogue? = null

    /**
     * Reads the catalogue and fills the list.
     */
    fun load() {
        viewModelScope.launch {
            try {
                val opened = catalogue.open()
                openCatalogue = opened
                val songs = catalogue.songs(opened, emptyList())
                mutableState.update {
                    it.copy(songs = songs, isLoading = false)
                }
            } catch (failure: PhomuException) {
                mutableState.update {
                    it.copy(isLoading = false, failure = failure.toBridgeFailure())
                }
            }
        }
    }

    /**
     * Sets the search term of the player.
     *
     * @param query the search term
     */
    fun setQuery(query: String) {
        filters = filters.copy(query = query)
        applyFilters()
    }

    /**
     * Switches a pack of the filter on or off.
     *
     * @param packId the identifier of the pack
     */
    fun togglePack(packId: String) {
        val packs = filters.packIds.toMutableSet()
        if (!packs.remove(packId)) packs.add(packId)
        filters = filters.copy(packIds = packs)
        applyFilters()
    }

    /**
     * Chooses the difficulty of the filter.
     *
     * @param difficulty the identifier of the difficulty, or `null` for every
     */
    fun selectDifficulty(difficulty: String?) {
        filters = filters.copy(difficulty = difficulty)
        applyFilters()
    }

    /**
     * Switches the filter for the songs of the card deck on or off.
     *
     * @param enabled whether the filter is active
     */
    fun setQrCompatibleOnly(enabled: Boolean) {
        filters = filters.copy(onlyQrCompatible = enabled)
        applyFilters()
    }

    /**
     * Switches the filter for the songs with lyrics on or off.
     *
     * @param enabled whether the filter is active
     */
    fun setWithLyricsOnly(enabled: Boolean) {
        filters = filters.copy(onlyWithLyrics = enabled)
        applyFilters()
    }

    /**
     * Resets every filter.
     */
    fun resetFilters() {
        filters = BrowseFilters()
        applyFilters()
    }

    /**
     * Applies the filters to the list.
     */
    private fun applyFilters() {
        val songs = mutableState.value.songs
        mutableState.update {
            it.copy(songs = songs.filter { song -> filters.matches(song) })
        }
    }
}
