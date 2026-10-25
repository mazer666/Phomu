package de.phomu.lobby

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import de.phomu.bridge.BridgeFailure
import de.phomu.bridge.BridgeVocabulary
import de.phomu.catalogue.Catalogue
import de.phomu.catalogue.CatalogueRepository
import de.phomu.config.GameConfigFactory
import de.phomu.game.GameController
import de.phomu.bridge.toBridgeFailure
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.phomu.bridge.PhomuException
import org.phomu.bridge.PhomuPlayer
import org.phomu.bridge.PhomuTeam

/**
 * The view model of the lobby.
 *
 * WHAT: the state of the lobby wizard and the commands of the players.
 *
 * WHY the lobby decides nothing about the game: it collects the players, the
 * teams, the modes and the packs, hands them to the base and shows what the
 * base answers (docs/design/BUILD-CONTRACT.md § 2.4).
 */
class LobbyViewModel(
    private val catalogue: CatalogueRepository,
    private val controller: GameController,
) : ViewModel() {

    /** The state of the lobby. */
    private val mutableState = MutableStateFlow(LobbyUiState())

    /** The state of the lobby, as a stream. */
    val state: StateFlow<LobbyUiState> = mutableState.asStateFlow()

    /** The catalogue of the session, once it has been read. */
    private var openCatalogue: Catalogue? = null

    /**
     * Reads the catalogue of the application.
     *
     * WHY the work happens in the background: the artefact is several
     * megabytes and the rules forbid a blocking read on the interface thread
     * (docs/spec/REQUIREMENTS-PLATFORM.md, PERF-109).
     */
    fun loadCatalogue() {
        viewModelScope.launch {
            try {
                val opened = catalogue.open()
                openCatalogue = opened
                mutableState.update {
                    it.copy(
                        packs = opened.packs,
                        selectedPackIds = opened.packs.map { pack -> pack.id }.toSet(),
                        isLoading = false,
                    )
                }
            } catch (failure: PhomuException) {
                mutableState.update {
                    it.copy(isLoading = false, failure = failure.toBridgeFailure())
                }
            }
        }
    }

    /**
     * Adds a player to the lobby.
     *
     * @param name the name of the player
     */
    fun addPlayer(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        mutableState.update { current ->
            val id = "player-${current.players.size + 1}"
            current.copy(
                players = current.players + LobbyPlayer(id = id, name = trimmed),
            )
        }
    }

    /**
     * Removes a player from the lobby.
     *
     * @param id the identifier of the player
     */
    fun removePlayer(id: String) {
        mutableState.update { current ->
            current.copy(
                players = current.players.filterNot { it.id == id },
                teams = current.teams.map { team ->
                    team.copy(playerIds = team.playerIds.filterNot { it == id })
                },
            )
        }
    }

    /**
     * Switches a mode of the session on or off.
     *
     * @param mode the identifier of the mode
     */
    fun toggleMode(mode: String) {
        mutableState.update { current ->
            val modes = current.selectedModeIds.toMutableSet()
            if (!modes.remove(mode)) modes.add(mode)
            current.copy(selectedModeIds = modes)
        }
    }

    /**
     * Switches a pack of the session on or off.
     *
     * @param packId the identifier of the pack
     */
    fun togglePack(packId: String) {
        mutableState.update { current ->
            val packs = current.selectedPackIds.toMutableSet()
            if (!packs.remove(packId)) packs.add(packId)
            current.copy(selectedPackIds = packs)
        }
    }

    /**
     * Chooses the team mode of the session.
     *
     * @param teamMode the identifier of the team mode
     */
    fun selectTeamMode(teamMode: String) {
        mutableState.update { it.copy(teamMode = teamMode) }
    }

    /**
     * Chooses the ending condition of the session.
     *
     * @param endingCondition the identifier of the ending condition
     */
    fun selectEndingCondition(endingCondition: String) {
        mutableState.update { it.copy(endingCondition = endingCondition) }
    }

    /**
     * Chooses the difficulty of the songs.
     *
     * @param difficulty the identifier of the difficulty
     */
    fun selectDifficulty(difficulty: String) {
        mutableState.update { it.copy(difficulty = difficulty) }
    }

    /**
     * Chooses the score that ends the game.
     *
     * @param points the score
     */
    fun selectTargetPoints(points: Long) {
        mutableState.update { it.copy(targetPoints = points) }
    }

    /**
     * Starts the game.
     *
     * @return the failure of the base, if there was one
     */
    fun startGame(): BridgeFailure? {
        val current = mutableState.value
        if (!current.canStart) return null
        val config = GameConfigFactory.create(
            selectedModes = current.selectedModeIds.toList(),
            selectedPacks = current.selectedPackIds.toList(),
            teamMode = current.teamMode,
            endingCondition = current.endingCondition,
            targetPoints = current.targetPoints,
            difficulty = current.difficulty,
        )
        val players = current.players.map { player ->
            PhomuPlayer(
                id = player.id,
                name = player.name,
                teamId = player.teamId,
                isSpectator = false,
                isPilot = player.id == current.players.firstOrNull()?.id,
                color = null,
                avatar = null,
            )
        }
        val teams = current.teams.map { team ->
            PhomuTeam(
                id = team.id,
                name = team.name,
                playerIds = team.playerIds,
                color = null,
            )
        }
        val failure = controller.start(config, players, teams, openCatalogue?.handle)
        mutableState.update { it.copy(isStarted = failure == null, failure = failure) }
        return failure
    }

    /**
     * The modes the lobby offers.
     *
     * @return the identifiers of the modes
     */
    fun availableModes(): List<String> = BridgeVocabulary.ALL_MODES
}
