package de.phomu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.phomu.bridge.PlayerScore
import de.phomu.ui.components.PhomuPrimaryButton
import de.phomu.ui.components.PhomuSecondaryButton
import de.phomu.ui.text.PhomuStrings

/**
 * The end of the game.
 *
 * WHAT: the winner, the final scores and the ways out of the screen.
 *
 * WHY the screen shows the scores of the base: the base decides who has won
 * and how many points every player has. The screen only draws them.
 *
 * @param winnerName the name of the winner, if there is one
 * @param players the final scores of the players
 * @param strings the texts of the shell
 * @param onPlayAgain starts a new game with the same lobby
 * @param onNewLobby returns to the lobby
 * @param onBackToMenu returns to the first screen
 */
@Composable
fun GameOverScreen(
    winnerName: String?,
    players: List<PlayerScore>,
    strings: PhomuStrings,
    onPlayAgain: () -> Unit,
    onNewLobby: () -> Unit,
    onBackToMenu: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text(
                text = if (winnerName != null) {
                    strings.text("gameover.winner", winnerName)
                } else {
                    strings.text("common.finish")
                },
                style = MaterialTheme.typography.headlineMedium,
            )
        }
        item {
            Text(
                text = strings.text("game.scoreboard.title"),
                style = MaterialTheme.typography.titleMedium,
            )
        }
        items(players, key = { player -> player.id }) { player ->
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = player.name,
                    style = MaterialTheme.typography.bodyLarge,
                )
                Text(
                    text = "${strings.text("common.points")}: ${player.score}",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PhomuPrimaryButton(
                    text = strings.text("gameover.playAgain"),
                    onClick = onPlayAgain,
                    modifier = Modifier.fillMaxWidth(),
                )
                PhomuSecondaryButton(
                    text = strings.text("gameover.newLobby"),
                    onClick = onNewLobby,
                    modifier = Modifier.fillMaxWidth(),
                )
                PhomuSecondaryButton(
                    text = strings.text("gameover.backToMenu"),
                    onClick = onBackToMenu,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
