package de.phomu.lobby

import de.phomu.bridge.BridgeVocabulary
import de.phomu.config.GeneratedGameConfig
import org.phomu.bridge.PhomuPackInfo

/**
 * A player of the lobby.
 *
 * @param id the identifier of the player
 * @param name the name of the player
 * @param teamId the identifier of the team, if the player is in one
 */
data class LobbyPlayer(
    val id: String,
    val name: String,
    val teamId: String? = null,
)

/**
 * A team of the lobby.
 *
 * @param id the identifier of the team
 * @param name the name of the team
 * @param playerIds the identifiers of the members of the team
 */
data class LobbyTeam(
    val id: String,
    val name: String,
    val playerIds: List<String> = emptyList(),
)

/**
 * The state of the lobby, as the shell draws it.
 *
 * WHY the lobby holds no rule: the limits of the lobby are the limits of the
 * base, and the base refuses a session that breaks them. The lobby shows the
 * limits of the *projection* of the constants and lets the base decide.
 *
 * @param players the players of the session
 * @param teams the teams of the session
 * @param packs the packs of the catalogue
 * @param selectedPackIds the identifiers of the selected packs
 * @param selectedModeIds the identifiers of the selected modes
 * @param teamMode how the players are grouped
 * @param endingCondition what ends the game
 * @param targetPoints the score that ends the game
 * @param difficulty the difficulty the songs have to have
 * @param isLoading whether the catalogue is being read
 * @param failure the failure of the last command, if there was one
 * @param isStarted whether the game has been started
 */
data class LobbyUiState(
    val players: List<LobbyPlayer> = emptyList(),
    val teams: List<LobbyTeam> = emptyList(),
    val packs: List<PhomuPackInfo> = emptyList(),
    val selectedPackIds: Set<String> = emptySet(),
    val selectedModeIds: Set<String> = BridgeVocabulary.ALL_MODES.toSet(),
    val teamMode: String = BridgeVocabulary.TEAM_MODE_INDIVIDUAL,
    val endingCondition: String = BridgeVocabulary.ENDING_CONDITION_POINTS,
    val targetPoints: Long = GeneratedGameConfig.DEFAULT_TARGET_POINTS.toLong(),
    val difficulty: String = BridgeVocabulary.DIFFICULTY_ALL,
    val isLoading: Boolean = true,
    val failure: de.phomu.bridge.BridgeFailure? = null,
    val isStarted: Boolean = false,
) {
    /**
     * Whether a session can be created.
     *
     * WHY the shell checks the player count at all: the base refuses a
     * session without a player, and the lobby should not offer a button that
     * always fails. The *number* is the projection of the constant of the
     * base; the decision still belongs to the base.
     *
     * @return `true` when the lobby may be left to the game
     */
    val canStart: Boolean
        get() = players.isNotEmpty() &&
            players.size <= GeneratedGameConfig.MAX_PLAYERS &&
            selectedModeIds.isNotEmpty() &&
            selectedPackIds.isNotEmpty()
}
