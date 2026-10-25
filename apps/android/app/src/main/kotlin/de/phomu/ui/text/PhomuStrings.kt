package de.phomu.ui.text

import android.content.Context
import android.content.res.Configuration
import de.phomu.config.GeneratedStrings
import java.util.IllegalFormatException
import java.util.MissingFormatArgumentException
import java.util.Locale

/**
 * The texts of the shell.
 *
 * WHAT: the resolver that turns a key of the key space into a text in the
 * language the player chose.
 *
 * WHY the shell resolves the keys itself: the base supplies the *keys* and
 * the shell supplies the *texts* (docs/design/BUILD-CONTRACT.md § 6.1,
 * rule L-1). The keys arrive from three places — the screens of the shell,
 * the failures of the base and the tagline of a pack — and all three are
 * resolved here.
 *
 * WHY the language is a parameter and not the system locale: the shell is
 * German-first with English as the second language, and the player chooses
 * the language in the settings
 * (docs/spec/REQUIREMENTS-PLATFORM.md, SHELL-110). The resources carry the
 * German text in `values/` and the English text in `values-en/`, and the
 * resolver reads them through a configuration context.
 *
 * EXAMPLE: `strings.text("lobby.title")` returns the German title of the
 * lobby when the language is `de`.
 */
class PhomuStrings(context: Context, language: String) {

    /** The context that reads the resources of the chosen language. */
    private val context: Context = forLanguage(context, language)

    /**
     * The text of a key.
     *
     * @param key the key of the key space
     * @param args the values of the placeholders of the text
     * @return the text, or the key itself when the key is unknown
     */
    fun text(key: String, vararg args: Any): String {
        val entry = GeneratedStrings.resources[key] ?: return key
        if (entry.isPlural) {
            return plural(key, args.firstOrNull() as? Int ?: 0, *args.copyOfRange(1, args.size))
        }
        return format(entry.id, args.copyOf())
    }

    /**
     * The text of a key, with the plural form of a number.
     *
     * @param key the key of the key space
     * @param count the number that selects the form
     * @param args the values of the placeholders of the text
     * @return the text, or the key itself when the key is unknown
     */
    fun plural(key: String, count: Int, vararg args: Any): String {
        val entry = GeneratedStrings.resources[key] ?: return key
        if (!entry.isPlural) {
            return format(entry.id, args.copyOf())
        }
        val quantity = context.resources.getQuantityString(entry.id, count, *args)
        return quantity
    }

    /**
     * The format of a resource.
     *
     * WHY the fallback: a text with a placeholder that the caller did not
     * fill is a defect of the caller, not a crash of the application. The
     * unformatted text is shown instead.
     *
     * @param id the identifier of the resource
     * @param args the values of the placeholders
     * @return the text
     */
    private fun format(id: Int, args: Array<out Any>): String = try {
        context.resources.getString(id, *args)
    } catch (failure: IllegalFormatException) {
        context.resources.getString(id)
    } catch (failure: MissingFormatArgumentException) {
        context.resources.getString(id)
    }

    companion object {
        /**
         * A context that reads the resources of a language.
         *
         * @param context the context of the application
         * @param language the language, `de` or `en`
         * @return the context of the language
         */
        fun forLanguage(context: Context, language: String): Context {
            val configuration = Configuration(context.resources.configuration)
            configuration.setLocale(Locale.forLanguageTag(language))
            return context.createConfigurationContext(configuration)
        }
    }
}
