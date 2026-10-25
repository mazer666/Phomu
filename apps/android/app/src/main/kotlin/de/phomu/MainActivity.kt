package de.phomu

import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.phomu.bridge.AbiBracket
import de.phomu.platform.ImmersiveModeController
import de.phomu.platform.ScreenPolicy
import de.phomu.ui.navigation.GameMediaEffect
import de.phomu.ui.navigation.PhomuNavigation
import de.phomu.ui.theme.PhomuTheme

/**
 * The activity of the shell.
 *
 * WHAT: the one activity that hosts every screen of the shell, and the
 * place where the platform integration of the screen lives.
 *
 * WHY the shell has one activity: the navigation of the shell is a graph of
 * composables, and the platform integration — the screen that stays awake,
 * the immersive mode, the orientation — belongs to the window, not to a
 * screen.
 */
class MainActivity : ComponentActivity() {

    /** The immersive mode of the game. */
    private lateinit var immersiveMode: ImmersiveModeController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        immersiveMode = ImmersiveModeController(this)

        val container = (application as PhomuApplication).container

        setContent {
            val settings by container.settingsRepository.settings
                .collectAsStateWithLifecycle(initialValue = de.phomu.settings.AppSettings())
            val gameState by container.gameController.state.collectAsStateWithLifecycle()

            // WHY the orientation follows the screen: the game is played in
            // the portrait, the settings are read while the phone lies on the
            // table (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-114).
            val orientation = if (isGameScreen(gameState)) {
                ScreenPolicy.GAME_ORIENTATION
            } else {
                ScreenPolicy.READ_ORIENTATION
            }
            SideEffect {
                requestedOrientation = orientation
            }

            // WHY the screen stays awake only during a round: a phone that
            // never sleeps drains the battery of a party
            // (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-105).
            val inRound = gameState.phase == de.phomu.game.GamePhase.Question ||
                gameState.phase == de.phomu.game.GamePhase.Drawing ||
                gameState.phase == de.phomu.game.GamePhase.Reveal
            LaunchedEffect(inRound) {
                ScreenPolicy.setKeepScreenOn(this@MainActivity, inRound)
            }

            DisposableEffect(inRound) {
                if (inRound) immersiveMode.enter() else immersiveMode.leave()
                onDispose { immersiveMode.leave() }
            }

            PhomuTheme(themeName = settings.theme) {
                PhomuNavigation(container = container)
                GameMediaEffect(
                    controller = container.gameController,
                    player = container.musicPlayer,
                    phase = gameState.phase,
                )
            }
        }
    }

    /**
     * Whether the game is on the screen.
     *
     * @param state the state of the game
     * @return `true` when a round is running
     */
    private fun isGameScreen(state: de.phomu.game.GameUiState): Boolean =
        state.phase != de.phomu.game.GamePhase.Idle
}

/**
 * The activity of the shell is declared in the manifest with the
 * orientation of the game.
 *
 * WHY the constant is here and not in the manifest: the manifest declares
 * the *default*; the activity changes it when the screen changes.
 */
internal const val DEFAULT_ORIENTATION: Int = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
