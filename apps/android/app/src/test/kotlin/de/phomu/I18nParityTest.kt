package de.phomu

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import de.phomu.config.GeneratedStrings
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * The parity of the key space.
 *
 * WHAT: the test that the shell offers exactly the keys of the web shell.
 *
 * WHY the test exists: the requirement SHELL-110 says that every shell
 * carries the same key set, with the same interpolation rules and the same
 * fallback. The resources of the shell are generated from the locale files
 * of the web shell, and the test proves that the generation did not lose a
 * key.
 */
class I18nParityTest {

    /** The root of the repository, as the build passes it. */
    private val repositoryRoot: File = File(
        System.getProperty("phomu.repository.root") ?: "../../..",
    )

    /**
     * The shell carries the same key set as the web shell.
     */
    @Test
    fun the_shell_carries_the_key_set_of_the_web_shell() {
        val german = leaves(File(repositoryRoot, "src/i18n/locales/de.json"))
        val english = leaves(File(repositoryRoot, "src/i18n/locales/en.json"))

        assertEquals(
            "the locale files of the web shell have the same keys",
            german.keys.sorted(),
            english.keys.sorted(),
        )

        assertEquals(
            "the shell carries every key of the locale files",
            normalise(german.keys).sorted(),
            GeneratedStrings.resources.keys.sorted(),
        )
    }

    /**
     * The plural keys of the shell are the plural keys of the web shell.
     */
    @Test
    fun the_plurals_of_the_shell_are_the_plurals_of_the_web_shell() {
        val german = leaves(File(repositoryRoot, "src/i18n/locales/de.json"))
        val expected = german.keys
            .filter { key -> key.endsWith("_one") }
            .map { key -> key.removeSuffix("_one") }
            .toSet()
        val actual = GeneratedStrings.resources
            .filter { entry -> entry.value.isPlural }
            .keys

        assertEquals("the plurals of the shell", expected.sorted(), actual.sorted())
    }

    /**
     * The key space of the shell is not empty.
     */
    @Test
    fun the_key_space_of_the_shell_is_not_empty() {
        assertTrue(
            "the shell carries a key space",
            GeneratedStrings.resources.size > 1_000,
        )
    }

    /**
     * The leaf keys of a locale file.
     *
     * @param file the locale file
     * @return the leaf keys and their texts
     */
    private fun leaves(file: File): Map<String, String> {
        assertTrue("the locale file ${file.path} exists", file.isFile)
        val result = mutableMapOf<String, String>()
        fun walk(element: JsonElement, prefix: String) {
            if (element.isJsonObject) {
                element.asJsonObject.entrySet().forEach { entry ->
                    walk(
                        entry.value,
                        if (prefix.isEmpty()) entry.key else "$prefix.${entry.key}",
                    )
                }
            } else if (element.isJsonPrimitive) {
                result[prefix] = element.asString
            }
        }
        walk(JsonParser.parseString(file.readText()), "")
        return result
    }

    /**
     * The key set of the locale files without the suffixes of the plural
     * forms.
     *
     * @param keys the keys of the locale file
     * @return the keys without the suffix of the plural forms
     */
    private fun normalise(keys: Set<String>): Set<String> = keys.map { key ->
        when {
            key.endsWith("_one") -> key.removeSuffix("_one")
            key.endsWith("_other") -> key.removeSuffix("_other")
            else -> key
        }
    }.toSet()
}
