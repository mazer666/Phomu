package de.phomu

import de.phomu.bridge.AbiBracket
import de.phomu.bridge.UniFfiGameBridge
import de.phomu.config.GameConfigFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.phomu.bridge.PhomuAnswer
import org.phomu.bridge.PhomuPlayer
import org.phomu.bridge.PhomuRoundView

/**
 * The bridge, as the real library.
 *
 * WHAT: the test that plays a round through the *real* native library of the
 * base — the `libphomu_ffi.so` that the Cargo workspace produced.
 *
 * WHY the test exists: the other tests of the shell use a double, and a
 * double cannot show that the marshalling loses nothing. This test drives
 * the generated UniFFI bindings against the real library
 * (docs/design/PLATFORM-ARCHITECTURE.md § 12.2, layer T4).
 *
 * WHY the test runs on the JVM and not on a device: the sandbox has no
 * emulator. The library that is loaded here is the host build of the same
 * crate; the instrumented test [de.phomu.bridge.BridgeInstrumentedTest] does
 * the same on a device with the Android build of the library.
 */
class BridgeRoundTripTest {

    /** The catalogue of the test. */
    private val catalogueJson = """
        {
          "songs": [
            {
              "id": "test-song",
              "title": "Test Song",
              "artist": "Test Artist",
              "year": 1985,
              "country": "DE",
              "genre": "Pop",
              "difficulty": "easy",
              "mood": ["Happy"],
              "packs": ["pack-one"],
              "hints": ["The band came from Hamburg."],
              "supportedModes": [
                "timeline", "hint-master", "lyrics", "vibe-check",
                "survivor", "cover-confusion"
              ],
              "isQRCompatible": true,
              "links": {
                "youtube": "https://example.invalid/watch",
                "spotifyFreePreview": "https://example.invalid/preview.mp3"
              }
            }
          ],
          "packs": {
            "pack-one": { "pack": "Pack One" }
          }
        }
    """.trimIndent()

    /**
     * The version of the base lies inside the bracket of the shell.
     */
    @Test
    fun the_version_of_the_base_lies_inside_the_bracket() {
        val bridge = UniFfiGameBridge()

        assertEquals("the version of the base", "1.0.0", bridge.abiVersion())
        assertTrue(
            "the shell accepts the version of the base",
            AbiBracket.accepts(bridge),
        )
    }

    /**
     * A round runs from the catalogue to the reveal.
     */
    @Test
    fun plays_a_round_through_the_real_library() {
        val bridge = UniFfiGameBridge()

        val catalogue = bridge.openCatalogue(catalogueJson)
        val packs = bridge.cataloguePacks(catalogue)
        assertEquals("the catalogue has one pack", 1, packs.size)
        assertEquals("the pack of the catalogue", "pack-one", packs.first().id)

        val songs = bridge.catalogueSongs(catalogue, emptyList())
        assertEquals("the catalogue has one song", 1, songs.size)
        assertEquals("the song of the catalogue", "test-song", songs.first().id)

        val session = bridge.newSession(
            config = GameConfigFactory.create(
                selectedModes = listOf("timeline"),
                selectedPacks = listOf("pack-one"),
                targetPoints = 100,
                targetRounds = 3,
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
                PhomuPlayer(
                    id = "player-2",
                    name = "Sam",
                    teamId = null,
                    isSpectator = false,
                    isPilot = false,
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
        assertTrue("the game starts in the drawing phase", started is PhomuRoundView.Drawing)

        val question = bridge.draw(session, "random", null)
        assertTrue("the draw opens the question phase", question is PhomuRoundView.Question)
        val asked = question as PhomuRoundView.Question
        assertEquals("the mode of the round", "timeline", asked.mode)
        assertTrue("the question has a hint", asked.hints.isNotEmpty())
        assertFalse(
            "the question carries no title",
            asked.hints.joinToString(" ").contains("Test Song"),
        )

        // WHY the plan is read here: the base holds the song of the round
        // only while the round runs. After the next round the song is
        // released, and the base answers with `NoSongDrawn`.
        val plan = bridge.mediaPlan(session)
        assertTrue("the plan has a source", plan.candidates.isNotEmpty())

        val scores = bridge.answer(
            session,
            PhomuAnswer(
                mode = "timeline",
                timelineSlot = 0u,
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
            ),
            3,
        )
        assertEquals("the score of the round", 1, scores.players.size)

        val reveal = bridge.reveal(session)
        assertEquals("the solution of the round", "Test Song", reveal.title)
        assertEquals("the artist of the round", "Test Artist", reveal.artist)

        val next = bridge.nextRound(session, 2_000L)
        assertTrue("the next round is drawn", next is PhomuRoundView.Drawing)

        val snapshot = bridge.snapshot(session)
        assertNotNull("the session has a snapshot", snapshot)
        assertFalse("the session is not over", snapshot.isGameOver)

        val over = bridge.end(session, "player-1")
        assertEquals("the winner of the game", "player-1", over.winnerId)
    }
}
