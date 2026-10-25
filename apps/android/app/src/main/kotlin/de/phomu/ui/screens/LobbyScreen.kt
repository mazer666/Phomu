package de.phomu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.phomu.lobby.LobbyUiState
import de.phomu.ui.components.MINIMUM_TOUCH_TARGET
import de.phomu.ui.components.PhomuPrimaryButton
import de.phomu.ui.text.PhomuStrings

/**
 * The modes of the product and the key of their name.
 *
 * WHY the table lives here and not in the base: the *identifiers* of the
 * modes are the vocabulary of the wire, and the *texts* of the modes are the
 * texts of the product. The table binds the two together — it decides
 * nothing about the game.
 */
private val MODE_LABELS: List<Pair<String, String>> = listOf(
    "timeline" to "modes.timeline.name",
    "hint-master" to "modes.hint-master.name",
    "lyrics" to "modes.lyrics.name",
    "vibe-check" to "modes.vibe-check.name",
    "survivor" to "modes.survivor.name",
    "cover-confusion" to "modes.cover-confusion.name",
)

/**
 * The lobby of the shell.
 *
 * WHAT: the players, the modes, the packs and the start of the game.
 *
 * WHY the lobby shows what the base reported: the packs come from the
 * catalogue of the base, the modes are the vocabulary of the wire, and the
 * limits are the projection of the constants of the base.
 *
 * @param state the state of the lobby
 * @param strings the texts of the shell
 * @param onAddPlayer adds a player to the lobby
 * @param onRemovePlayer removes a player from the lobby
 * @param onToggleMode switches a mode on or off
 * @param onTogglePack switches a pack on or off
 * @param onStart starts the game
 * @param onOpenBrowse opens the catalogue
 * @param onOpenSettings opens the settings
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LobbyScreen(
    state: LobbyUiState,
    strings: PhomuStrings,
    onAddPlayer: (String) -> Unit,
    onRemovePlayer: (String) -> Unit,
    onToggleMode: (String) -> Unit,
    onTogglePack: (String) -> Unit,
    onStart: () -> Unit,
    onOpenBrowse: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    var playerName by rememberSaveable { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.text("lobby.title")) },
                actions = {
                    IconButton(onClick = onOpenBrowse) {
                        Icon(
                            imageVector = Icons.Filled.LibraryMusic,
                            contentDescription = strings.text("browse.title"),
                        )
                    }
                    IconButton(onClick = onOpenSettings) {
                        Icon(
                            imageVector = Icons.Filled.Settings,
                            contentDescription = strings.text("common.settings"),
                        )
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text(
                    text = strings.text("lobby.step1.title"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            items(state.players, key = { player -> player.id }) { player ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = player.name,
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { onRemovePlayer(player.id) }) {
                        Icon(
                            imageVector = Icons.Filled.Delete,
                            contentDescription = strings.text("lobby.player.removeAria", player.name),
                        )
                    }
                }
            }
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = playerName,
                        onValueChange = { playerName = it },
                        label = { Text(strings.text("lobby.step1.namePlaceholder")) },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(
                        onClick = {
                            onAddPlayer(playerName)
                            playerName = ""
                        },
                        modifier = Modifier.defaultMinSize(
                            minWidth = MINIMUM_TOUCH_TARGET,
                            minHeight = MINIMUM_TOUCH_TARGET,
                        ),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Add,
                            contentDescription = strings.text("lobby.step1.addPlayerTooltip"),
                            modifier = Modifier.defaultMinSize(
                                minWidth = MINIMUM_TOUCH_TARGET,
                                minHeight = MINIMUM_TOUCH_TARGET,
                            ),
                        )
                    }
                }
            }
            item {
                Text(
                    text = strings.text("lobby.modes.label"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(MODE_LABELS, key = { entry -> entry.first }) { entry ->
                        FilterChip(
                            selected = entry.first in state.selectedModeIds,
                            onClick = { onToggleMode(entry.first) },
                            label = { Text(strings.text(entry.second)) },
                        )
                    }
                }
            }
            item {
                Text(
                    text = strings.text("lobby.packs.label"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            items(state.packs, key = { pack -> pack.id }) { pack ->
                FilterChip(
                    selected = pack.id in state.selectedPackIds,
                    onClick = { onTogglePack(pack.id) },
                    label = { Text("${pack.name} (${pack.songCount})") },
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    PhomuPrimaryButton(
                        text = strings.text("lobby.startNow"),
                        onClick = onStart,
                        enabled = state.canStart,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (!state.canStart) {
                        Text(
                            text = strings.text("lobby.pleaseSelect"),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }
    }
}
