package de.phomu

import de.phomu.bridge.GameBridge
import de.phomu.catalogue.AssetReader
import de.phomu.catalogue.CatalogueRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The responsiveness of the interface.
 *
 * WHAT: the test that the catalogue is read in the background.
 *
 * WHY the test exists: the requirement PERF-109 forbids a blocking read on
 * the interface thread. The catalogue is several megabytes, and a read on
 * the interface thread would freeze the screen of the lobby.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ResponsivenessTest {

    /**
     * The interface stays responsive during the load of the catalogue.
     */
    @Test
    fun ui_stays_responsive_during_catalogue_load() = runTest {
        val dispatcher = StandardTestDispatcher(testScheduler)
        val readingThread = mutableListOf<String>()
        val repository = CatalogueRepository(
            bridge = object : GameBridge by FakeGameBridge() {},
            assets = object : AssetReader {
                override fun read(name: String): String {
                    readingThread.add(Thread.currentThread().name)
                    return """{"songs": []}"""
                }
            },
            dispatcher = dispatcher,
        )

        val job = kotlinx.coroutines.CoroutineScope(dispatcher).launch { repository.open() }

        // The call returns before the dispatcher has run the read: the work
        // is queued, not executed on the caller's thread.
        assertEquals("the read has not run yet", 0, readingThread.size)

        testScheduler.advanceUntilIdle()
        job.join()

        assertEquals("the asset was read once", 1, readingThread.size)
        assertTrue(
            "the read did not run on the thread of the caller",
            readingThread.first() != Thread.currentThread().name,
        )
    }
}
