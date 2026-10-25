package de.phomu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.phomu.browse.BrowseUiState
import de.phomu.ui.components.PhomuSecondaryButton
import de.phomu.ui.text.PhomuStrings

/**
 * The catalogue of the shell.
 *
 * WHAT: the list of the songs of the catalogue with the filters of the list.
 *
 * WHY the list shows what the base reports: the base owns the catalogue and
 * its selection rules; the shell asks for the songs and filters the list it
 * shows (docs/design/BUILD-CONTRACT.md § 4.1).
 *
 * @param state the state of the screen
 * @param strings the texts of the shell
 * @param onQueryChanged sets the search term
 * @param onTogglePack switches a pack of the filter on or off
 * @param onSelectDifficulty chooses the difficulty of the filter
 * @param onQrOnly switches the filter for the card deck on or off
 * @param onLyricsOnly switches the filter for the songs with lyrics on or off
 * @param onReset resets every filter
 * @param onBack returns to the previous screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BrowseScreen(
    state: BrowseUiState,
    strings: PhomuStrings,
    onQueryChanged: (String) -> Unit,
    onTogglePack: (String) -> Unit,
    onSelectDifficulty: (String?) -> Unit,
    onQrOnly: (Boolean) -> Unit,
    onLyricsOnly: (Boolean) -> Unit,
    onReset: () -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.text("browse.title")) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = strings.text("common.back"),
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
                OutlinedTextField(
                    value = state.query,
                    onValueChange = onQueryChanged,
                    label = { Text(strings.text("browse.searchPlaceholder")) },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            item {
                Text(
                    text = strings.text("browse.filterOptions"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item {
                        FilterChip(
                            selected = state.difficulty == null,
                            onClick = { onSelectDifficulty(null) },
                            label = { Text(strings.text("common.all")) },
                        )
                    }
                    items(
                        listOf(
                            "easy" to "browse.difficultyEasy",
                            "medium" to "browse.difficultyMedium",
                            "hard" to "browse.difficultyHard",
                        ),
                        key = { entry -> entry.first },
                    ) { entry ->
                        FilterChip(
                            selected = state.difficulty == entry.first,
                            onClick = { onSelectDifficulty(entry.first) },
                            label = { Text(strings.text(entry.second)) },
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.onlyQrCompatible,
                            onClick = { onQrOnly(!state.onlyQrCompatible) },
                            label = { Text(strings.text("browse.filterQr")) },
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.onlyWithLyrics,
                            onClick = { onLyricsOnly(!state.onlyWithLyrics) },
                            label = { Text(strings.text("browse.filterLyrics")) },
                        )
                    }
                }
            }
            item {
                PhomuSecondaryButton(
                    text = strings.text("browse.resetFilters"),
                    onClick = onReset,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
            if (!state.isLoading && state.songs.isEmpty()) {
                item {
                    Text(
                        text = strings.text("browse.noSongsFound"),
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )
                }
            }
            items(state.songs, key = { song -> song.id }) { song ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = song.id,
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Text(
                            text = song.difficulty,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    if (song.isQrCompatible) {
                        Text(
                            text = strings.text("browse.qrLabel"),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }
    }
}
