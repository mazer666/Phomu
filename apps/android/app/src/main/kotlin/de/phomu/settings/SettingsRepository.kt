package de.phomu.settings

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey

/**
 * The settings of the shell.
 *
 * WHAT: the four areas the settings screen offers — the language, the theme,
 * the music provider and the audio.
 *
 * WHY the values are strings and not an enumeration of the shell: the
 * identifiers of the base are the vocabulary of the wire
 * (`de.phomu.bridge.BridgeVocabulary`), and the shell has to be able to show
 * a value that the base adds later without a change of the shell.
 *
 * @param language the language of the interface, `de` or `en`
 * @param theme the theme of the interface
 * @param musicProvider the provider the players prefer
 * @param audioEnabled whether the shell plays music
 */
data class AppSettings(
    val language: String = DEFAULT_LANGUAGE,
    val theme: String = DEFAULT_THEME,
    val musicProvider: String = DEFAULT_PROVIDER,
    val audioEnabled: Boolean = true,
) {
    companion object {
        /** The default language of the shell — German is the primary one. */
        const val DEFAULT_LANGUAGE: String = "de"

        /** The default theme of the shell. */
        const val DEFAULT_THEME: String = "jackbox"

        /** The default provider of the shell. */
        const val DEFAULT_PROVIDER: String = "youtube"
    }
}

/**
 * The storage of the settings.
 *
 * WHY the storage is app-scoped: the shell writes nothing outside its own
 * area (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-110).
 */
class SettingsRepository(private val dataStore: DataStore<Preferences>) {

    /**
     * The settings of the shell, as a stream.
     *
     * @return the stream of the settings
     */
    val settings: Flow<AppSettings> = dataStore.data.map { preferences ->
        AppSettings(
            language = preferences[LANGUAGE] ?: AppSettings.DEFAULT_LANGUAGE,
            theme = preferences[THEME] ?: AppSettings.DEFAULT_THEME,
            musicProvider = preferences[PROVIDER] ?: AppSettings.DEFAULT_PROVIDER,
            audioEnabled = preferences[AUDIO_ENABLED] ?: true,
        )
    }

    /**
     * Writes the language of the interface.
     *
     * @param language the language, `de` or `en`
     */
    suspend fun setLanguage(language: String) {
        dataStore.edit { it[LANGUAGE] = language }
    }

    /**
     * Writes the theme of the interface.
     *
     * @param theme the theme
     */
    suspend fun setTheme(theme: String) {
        dataStore.edit { it[THEME] = theme }
    }

    /**
     * Writes the provider the players prefer.
     *
     * @param provider the identifier of the provider
     */
    suspend fun setMusicProvider(provider: String) {
        dataStore.edit { it[PROVIDER] = provider }
    }

    /**
     * Writes whether the shell plays music.
     *
     * @param enabled whether the music is played
     */
    suspend fun setAudioEnabled(enabled: Boolean) {
        dataStore.edit { it[AUDIO_ENABLED] = enabled }
    }

    private companion object {
        val LANGUAGE = stringPreferencesKey("language")
        val THEME = stringPreferencesKey("theme")
        val PROVIDER = stringPreferencesKey("musicProvider")
        val AUDIO_ENABLED = booleanPreferencesKey("audioEnabled")
    }
}
