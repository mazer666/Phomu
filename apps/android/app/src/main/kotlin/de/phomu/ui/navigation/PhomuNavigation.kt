package de.phomu.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.phomu.AppContainer
import kotlinx.coroutines.launch
import de.phomu.browse.BrowseViewModel
import de.phomu.game.GameController
import de.phomu.game.GamePhase
import de.phomu.game.modeId
import de.phomu.game.toWire
import de.phomu.lobby.LobbyViewModel
import de.phomu.settings.AppSettings
import de.phomu.ui.screens.BrowseScreen
import de.phomu.ui.screens.GameOverScreen
import de.phomu.ui.screens.GameScreen
import de.phomu.ui.screens.LobbyScreen
import de.phomu.ui.screens.SettingsScreen
import de.phomu.ui.text.PhomuStrings

/**
 * The routes of the shell.
 *
 * WHY the routes are named and not numbered: a route is a place of the
 * navigation of the shell, and the name says what it is.
 */
object Routes {
    /** The lobby. */
    const val LOBBY: String = "lobby"

    /** The game. */
    const val GAME: String = "game"

    /** The end of the game. */
    const val GAME_OVER: String = "game-over"

    /** The catalogue. */
    const val BROWSE: String = "browse"

    /** The settings. */
    const val SETTINGS: String = "settings"
}

/**
 * The navigation of the shell.
 *
 * WHAT: the five screens of the shell and the way between them.
 *
 * WHY the navigation belongs to the shell: a route is a platform concept
 * (docs/design/PLATFORM-ARCHITECTURE.md § 4.2).
 *
 * @param container the dependencies of the shell
 * @param navController the controller of the navigation
 */
@Composable
fun PhomuNavigation(
    container: AppContainer,
    navController: NavHostController = rememberNavController(),
) {
    val settings by container.settingsRepository.settings
        .collectAsStateWithLifecycle(initialValue = AppSettings())
    val context = LocalContext.current
    val strings = remember(settings.language, context) {
        PhomuStrings(context, settings.language)
    }

    val lobbyViewModel: LobbyViewModel = viewModel(
        factory = viewModelFactory {
            initializer {
                LobbyViewModel(container.catalogueRepository, container.gameController)
            }
        },
    )
    val browseViewModel: BrowseViewModel = viewModel(
        factory = viewModelFactory {
            initializer { BrowseViewModel(container.catalogueRepository) }
        },
    )

    val gameState by container.gameController.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    NavHost(navController = navController, startDestination = Routes.LOBBY) {
        composable(Routes.LOBBY) {
            val lobbyState by lobbyViewModel.state.collectAsStateWithLifecycle()
            LaunchedEffect(Unit) { lobbyViewModel.loadCatalogue() }
            LobbyScreen(
                state = lobbyState,
                strings = strings,
                onAddPlayer = lobbyViewModel::addPlayer,
                onRemovePlayer = lobbyViewModel::removePlayer,
                onToggleMode = lobbyViewModel::toggleMode,
                onTogglePack = lobbyViewModel::togglePack,
                onStart = {
                    if (lobbyViewModel.startGame() == null) {
                        navController.navigate(Routes.GAME)
                    }
                },
                onOpenBrowse = { navController.navigate(Routes.BROWSE) },
                onOpenSettings = { navController.navigate(Routes.SETTINGS) },
            )
        }

        composable(Routes.GAME) {
            GameScreen(
                state = gameState,
                strings = strings,
                onDraw = { container.gameController.draw() },
                onAnswer = { input ->
                    container.gameController.answer(input.toWire(input.modeId), null)
                },
                onReveal = { container.gameController.reveal() },
                onNextRound = { container.gameController.nextRound() },
                onLeave = { navController.popBackStack() },
            )
        }

        composable(Routes.GAME_OVER) {
            val winner = gameState.players.firstOrNull { player ->
                player.id == gameState.winnerId
            }
            GameOverScreen(
                winnerName = winner?.name,
                players = gameState.players,
                strings = strings,
                onPlayAgain = { navController.popBackStack(Routes.LOBBY, inclusive = false) },
                onNewLobby = {
                    navController.popBackStack(Routes.LOBBY, inclusive = false)
                },
                onBackToMenu = {
                    navController.popBackStack(Routes.LOBBY, inclusive = false)
                },
            )
        }

        composable(Routes.BROWSE) {
            val browseState by browseViewModel.state.collectAsStateWithLifecycle()
            LaunchedEffect(Unit) { browseViewModel.load() }
            BrowseScreen(
                state = browseState,
                strings = strings,
                onQueryChanged = browseViewModel::setQuery,
                onTogglePack = browseViewModel::togglePack,
                onSelectDifficulty = browseViewModel::selectDifficulty,
                onQrOnly = browseViewModel::setQrCompatibleOnly,
                onLyricsOnly = browseViewModel::setWithLyricsOnly,
                onReset = browseViewModel::resetFilters,
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                settings = settings,
                strings = strings,
                onLanguageChanged = { language ->
                    scope.launch { container.settingsRepository.setLanguage(language) }
                },
                onThemeChanged = { theme ->
                    scope.launch { container.settingsRepository.setTheme(theme) }
                },
                onProviderChanged = { provider ->
                    scope.launch { container.settingsRepository.setMusicProvider(provider) }
                },
                onAudioChanged = { enabled ->
                    scope.launch { container.settingsRepository.setAudioEnabled(enabled) }
                },
                onBack = { navController.popBackStack() },
            )
        }
    }
}

/**
 * The media of the running round.
 *
 * WHY the shell plays the first source it can play: the base names the
 * sources in the order they have to be tried, and the shell plays the first
 * one it is able to play. The fallback chain itself is a rule of the base
 * (docs/design/PLATFORM-ARCHITECTURE.md § 8.8).
 *
 * @param controller the controller of the game
 * @param player the player of the shell
 * @param phase the phase of the round
 */
@Composable
fun GameMediaEffect(
    controller: GameController,
    player: de.phomu.platform.MusicPlayer,
    phase: GamePhase,
) {
    LaunchedEffect(phase) {
        if (phase != GamePhase.Drawing && phase != GamePhase.Question) {
            player.stop()
            return@LaunchedEffect
        }
        val plan = controller.mediaPlan() ?: return@LaunchedEffect
        val candidate = plan.candidates.firstOrNull { entry ->
            entry.kind == de.phomu.bridge.BridgeVocabulary.MEDIA_KIND_PREVIEW_AUDIO
        } ?: return@LaunchedEffect
        player.play(candidate.location, plan.startSeconds)
    }
}
