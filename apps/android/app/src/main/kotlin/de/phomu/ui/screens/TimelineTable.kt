package de.phomu.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import de.phomu.game.GameUiState
import de.phomu.ui.components.PhomuCardBack
import de.phomu.ui.text.PhomuStrings
import kotlinx.coroutines.launch

/** Horizontal card table in both orientations; only the cards move, never the action. */
@Composable
fun TimelineTable(state: GameUiState, strings: PhomuStrings, selected: Int?, onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier) {
    val list = rememberLazyListState()
    val scope = rememberCoroutineScope()
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(strings.text("modes.timeline.tableHint"), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            TextButton(enabled = list.canScrollBackward, onClick = {
                scope.launch { list.animateScrollToItem((list.firstVisibleItemIndex - 2).coerceAtLeast(0)) }
            }) { Text("←", modifier = Modifier.semantics { contentDescription = strings.text("modes.timeline.earlier") }) }
            TextButton(enabled = list.canScrollForward, onClick = {
                scope.launch { list.animateScrollToItem((list.firstVisibleItemIndex + 2).coerceAtMost(state.timelineYears.size * 2)) }
            }) { Text("→", modifier = Modifier.semantics { contentDescription = strings.text("modes.timeline.later") }) }
        }
        LazyRow(state = list, modifier = Modifier.weight(1f).fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
            items(state.timelineYears.size * 2 + 1) { item ->
                if (item % 2 == 0) {
                    val slot = item / 2
                    OutlinedCard(onClick = { onSelect(slot) }, enabled = !state.answersLocked && !state.isBusy,
                        modifier = Modifier.width(if (selected == slot) 100.dp else 56.dp).fillParentMaxHeight(.9f).semantics {
                            contentDescription = strings.text("modes.timeline.slotLabel", slot + 1,
                                state.timelineYears.getOrNull(slot - 1)?.toString() ?: strings.text("modes.timeline.beginning"),
                                state.timelineYears.getOrNull(slot)?.toString() ?: strings.text("modes.timeline.end"))
                        },
                        colors = CardDefaults.outlinedCardColors(containerColor =
                            if (selected == slot) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            if (selected == slot) PhomuCardBack(Modifier.fillMaxSize())
                            else Text("+ ${slot + 1}", style = MaterialTheme.typography.titleMedium)
                        }
                    }
                } else {
                    Card(Modifier.width(100.dp).fillParentMaxHeight(.9f)) {
                        Column(Modifier.fillMaxSize().padding(8.dp), verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(state.timelineYears[item / 2].toString(), style = MaterialTheme.typography.headlineMedium)
                            Text("PHOMU", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
        Text(strings.text("modes.timeline.swipeHint"), style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
