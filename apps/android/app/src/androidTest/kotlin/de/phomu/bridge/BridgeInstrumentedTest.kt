package de.phomu.bridge

import androidx.test.ext.junit.runners.AndroidJUnit4
import de.phomu.config.GameConfigFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.phomu.bridge.PhomuPlayer
import org.phomu.bridge.PhomuRoundView

/**
 * The bridge on a device.
 *
 * WHAT: the test that plays a round through the native library of the base
 * *on a device* — the `libphomu_ffi.so` of the Android build that travels
 * in the APK.
 *
 * WHY the test exists: the JVM test [de.phomu.BridgeRoundTripTest] proves
 * that the marshalling of the bridge works; this test proves that the
 * library that is packaged for Android works on Android, with the Java
 * Native Access library of the platform.
 *
 * WHY the test needs a device: the library of the base is compiled for the
 * ABI of the device, and the sandbox has no emulator. The test is therefore
 * **NOT RUN** in the sandbox; it runs on a device or on an emulator in the
 * acceptance of the track.
 */
@RunWith(AndroidJUnit4::class)
class BridgeInstrumentedTest {

    /** The catalogue of the test. */
    private val catalogueJson = """
        {
          "songs": [
            {
              "id": "test-song",
              "title": "Test Song",
              "artist": "Test Artist",
              "year": 1985,
              "difficulty": "easy",
              "packs": ["pack-one"],
              "hints": ["The band came from Hamburg."],
              "supportedModes": ["timeline", "hint-master"],
              "isQRCompatible": true,
              "links": { "youtube": "https://example.invalid/watch" }
            }
          ],
          "packs": { "pack-one": { "pack": "Pack One" } }
        }
    """.trimIndent()

    /**
     * A round runs on the device through the packaged library.
     */
    @Test
    fun plays_a_round_on_the_device() {
        val bridge = UniFfiGameBridge()

        assertEquals("the version of the base", "1.0.0", bridge.abiVersion())
        assertTrue(
            "the shell accepts the version of the base",
            AbiBracket.accepts(bridge),
        )

        val catalogue = bridge.openCatalogue(catalogueJson)
        val session = bridge.newSession(
            config = GameConfigFactory.create(
                selectedModes = listOf("timeline"),
                selectedPacks = listOf("pack-one"),
            ),
            players = listOf(
                PhomuPlayer(
                    id = "player-1",
                    name = "Alex",
                    teamId = null,
                    isSpectator = false,
                    isPilot = true,
                    color = null,
                    avatar = null,
                ),
            ),
            teams = emptyList(),
            catalogue = catalogue,
            seed = 42L,
            nowMs = 1_000L,
        )

        val started = bridge.start(session, 1_000L)
        assertTrue(started is PhomuRoundView.Drawing)

        val question = bridge.draw(session, "random", null)
        assertTrue(question is PhomuRoundView.Question)

        val reveal = bridge.reveal(session)
        assertEquals("the solution of the round", "Test Song", reveal.title)
    }
}
