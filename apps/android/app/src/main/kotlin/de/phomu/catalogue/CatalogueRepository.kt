package de.phomu.catalogue

import de.phomu.bridge.GameBridge
import org.phomu.bridge.PhomuCatalogHandle
import org.phomu.bridge.PhomuPackInfo
import org.phomu.bridge.PhomuSongSummary
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * The reader of the assets of the application.
 *
 * WHY an interface: the repository is tested without an Android context, so
 * the test supplies its own reader.
 */
interface AssetReader {
    /**
     * Reads an asset of the application.
     *
     * @param name the name of the asset
     * @return the content of the asset
     */
    fun read(name: String): String
}

/**
 * The catalogue of the base, as the shell sees it.
 *
 * @param handle the handle of the open catalogue
 * @param packs the packs of the catalogue
 */
data class Catalogue(
    val handle: PhomuCatalogHandle,
    val packs: List<PhomuPackInfo>,
)

/**
 * The catalogue of the session.
 *
 * WHAT: the shell hands the bytes of the catalogue artefact to the base and
 * reads the packs and the songs back.
 *
 * WHY the shell moves bytes and never parses the catalogue: the base owns
 * the model of the catalogue and the rules of the selection
 * (docs/design/BUILD-CONTRACT.md § 4.1). The shell reads the file and hands
 * it over.
 *
 * WHY the work happens on the background dispatcher: the artefact is several
 * megabytes and the rules forbid a blocking read on the interface thread
 * (docs/spec/REQUIREMENTS-PLATFORM.md, PERF-109).
 */
class CatalogueRepository(
    private val bridge: GameBridge,
    private val assets: AssetReader,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {

    /**
     * The name of the asset that carries the catalogue.
     */
    companion object {
        /** The name of the catalogue asset. */
        const val ASSET_NAME: String = "catalogue.json"
    }

    /**
     * Opens the catalogue of the application.
     *
     * @return the catalogue and its packs
     */
    suspend fun open(): Catalogue = withContext(dispatcher) {
        val bytes = assets.read(ASSET_NAME)
        val handle = bridge.openCatalogue(bytes)
        Catalogue(handle = handle, packs = bridge.cataloguePacks(handle))
    }

    /**
     * The songs of the catalogue.
     *
     * @param catalogue the open catalogue
     * @param packs the packs to filter by; an empty list returns every song
     * @return the summaries of the songs
     */
    suspend fun songs(catalogue: Catalogue, packs: List<String>): List<PhomuSongSummary> =
        withContext(dispatcher) {
            bridge.catalogueSongs(catalogue.handle, packs)
        }
}
