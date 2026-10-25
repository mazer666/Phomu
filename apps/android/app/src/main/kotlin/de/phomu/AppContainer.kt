package de.phomu

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import de.phomu.bridge.GameBridge
import de.phomu.bridge.UniFfiGameBridge
import de.phomu.catalogue.AssetReader
import de.phomu.catalogue.CatalogueRepository
import de.phomu.game.GameController
import de.phomu.platform.AudioFocusController
import de.phomu.platform.MusicPlayer
import de.phomu.settings.SettingsRepository

/**
 * The storage of the settings of the shell.
 *
 * WHY the name is fixed: the data store of the application is addressed by
 * its name, and a second name would be a second storage.
 */
private val Context.phomuSettings: DataStore<Preferences> by preferencesDataStore(
    name = "phomu-settings",
)

/**
 * The reader of the assets of the application.
 *
 * WHY the shell reads the asset and the base parses it: the base performs no
 * file system access; the bytes arrive from the shell
 * (docs/design/BUILD-CONTRACT.md § 1.2, rule 1).
 */
class AndroidAssetReader(private val context: Context) : AssetReader {
    override fun read(name: String): String =
        context.assets.open(name).bufferedReader().use { reader -> reader.readText() }
}

/**
 * The dependencies of the shell.
 *
 * WHY a container and not a framework: the shell has five dependencies, and
 * a framework that solves the problem of five dependencies would be more
 * code than the container. The container exists so that the tests can build
 * the same graph with a bridge that does not need the native library.
 *
 * WHY the container holds one game controller: the phone shell plays one game
 * at a time, and a second session would replace the first one.
 */
class AppContainer(context: Context) {

    /** The context of the application. */
    private val applicationContext: Context = context.applicationContext

    /** The bridge of the base. */
    val bridge: GameBridge = UniFfiGameBridge()

    /** The catalogue of the application. */
    val catalogueRepository: CatalogueRepository = CatalogueRepository(
        bridge = bridge,
        assets = AndroidAssetReader(applicationContext),
    )

    /** The settings of the application. */
    val settingsRepository: SettingsRepository = SettingsRepository(
        applicationContext.phomuSettings,
    )

    /** The controller of the running game. */
    val gameController: GameController = GameController(bridge)

    /** The audio focus of the application. */
    val audioFocusController: AudioFocusController = AudioFocusController(applicationContext)

    /** The player of the preview audio. */
    val musicPlayer: MusicPlayer = MusicPlayer(audioFocusController)
}
