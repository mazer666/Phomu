package de.phomu

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * The permissions of the shell.
 *
 * WHAT: the test of the permission list of the application.
 *
 * WHY the test exists: the requirement PLAT-109 says that the core game
 * needs no permission at all, and PLAT-108 says that the camera is only
 * needed for the scan of a card. The scan of a card is switched off in this
 * milestone, so the manifest declares no camera permission — a permission
 * that nothing uses is a permission the store asks about.
 */
class PermissionRequestTest {

    /**
     * The manifest of the application.
     *
     * WHY two candidates: the working directory of a unit test is the module
     * directory, but a runner may use the directory of the repository.
     */
    private val manifest: File = listOf(
        File("src/main/AndroidManifest.xml"),
        File("app/src/main/AndroidManifest.xml"),
    ).firstOrNull { it.isFile } ?: File("src/main/AndroidManifest.xml")

    /**
     * The camera is only requested for the scan of a card.
     */
    @Test
    fun camera_is_requested_only_in_the_scanner() {
        assertTrue("the manifest exists", manifest.isFile)
        val content = manifest.readText()

        assertFalse(
            "the manifest declares no camera permission",
            content.contains("android.permission.CAMERA"),
        )
        assertFalse(
            "the manifest declares no microphone permission",
            content.contains("android.permission.RECORD_AUDIO"),
        )
        assertFalse(
            "the manifest declares no location permission",
            content.contains("android.permission.ACCESS_FINE_LOCATION"),
        )
    }

    /**
     * The manifest declares the permissions of the network only.
     */
    @Test
    fun the_manifest_declares_the_network_only() {
        val content = manifest.readText()
        val permissions = Regex("android\\.permission\\.([A-Z_]+)")
            .findAll(content)
            .map { it.groupValues[1] }
            .toSet()

        assertTrue(
            "the network permission is declared",
            permissions.contains("INTERNET"),
        )
        assertEquals(
            "the permission list is the network and the network state",
            setOf("INTERNET", "ACCESS_NETWORK_STATE"),
            permissions,
        )
    }
}
