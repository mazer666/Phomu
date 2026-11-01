package de.phomu.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.phomu.game.GamePhase
import de.phomu.game.GameUiState
import de.phomu.game.ModeAnswerInput
import de.phomu.ui.components.PhomuCardBack
import de.phomu.ui.components.PhomuPrimaryButton
import de.phomu.ui.text.PhomuStrings

private fun modeSuffix(mode: String) = when (mode) {
    "hint-master" -> "hintMaster"
    "vibe-check" -> "vibeCheck"
    "cover-confusion" -> "coverConfusion"
    else -> mode
}

/** The round fills the viewport, with one primary action outside the movable card table. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(state: GameUiState, strings: PhomuStrings, onDraw: () -> Unit,
    onAnswer: (ModeAnswerInput) -> Unit, onReveal: () -> Unit,
    onNextRound: () -> Unit, onLeave: () -> Unit) {
    var leave by rememberSaveable { mutableStateOf(false) }
    var scores by rememberSaveable { mutableStateOf(false) }
    var selectedSlot by rememberSaveable(state.roundNumber) { mutableStateOf<Int?>(null) }
    BackHandler { leave = true }
    if (leave) AlertDialog(onDismissRequest = { leave = false },
        title = { Text(strings.text("game.header.exitTitle")) },
        text = { Text(strings.text("game.header.exitAriaLabel")) },
        confirmButton = { TextButton(onClick = onLeave) { Text(strings.text("common.confirm")) } },
        dismissButton = { TextButton(onClick = { leave = false }) { Text(strings.text("common.cancel")) } })
    if (scores) AlertDialog(onDismissRequest = { scores = false },
        title = { Text(strings.text("game.scoreboard.title")) },
        text = { Column(Modifier.verticalScroll(rememberScrollState())) {
            state.players.forEach { player ->
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                    Text(player.name, Modifier.weight(1f)); Text(player.score.toString())
                }
            }
        } }, confirmButton = { TextButton(onClick = { scores = false }) { Text(strings.text("common.close")) } })
    Scaffold(topBar = { TopAppBar(title = {
        Text(strings.text("game.header.round", state.roundNumber), style = MaterialTheme.typography.titleMedium)
    }, navigationIcon = { IconButton(onClick = { leave = true }) {
        Icon(Icons.Filled.Close, strings.text("game.header.exitAriaLabel"))
    } }, actions = { IconButton(onClick = { scores = true }) {
        Icon(Icons.Filled.EmojiEvents, strings.text("game.scoreboard.title"))
    } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            state.failure?.let { failure -> Text(strings.text(failure.messageKey), color = MaterialTheme.colorScheme.error) }
            Text(strings.text("game.drawing.modeTitle.${modeSuffix(state.mode)}"), style = MaterialTheme.typography.titleLarge)
            if (state.phase != GamePhase.Reveal) Text(
                strings.text("game.drawing.modeInstruction.${modeSuffix(state.mode)}"),
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (state.phase == GamePhase.Question && state.mode == "timeline") {
                TimelineTable(state, strings, selectedSlot, { selectedSlot = it }, Modifier.weight(1f))
            } else {
                Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    when (state.phase) {
                        GamePhase.Drawing, GamePhase.Idle -> PhomuCardBack(Modifier.width(140.dp).height(190.dp))
                        GamePhase.Question -> ModeChoices(state, strings, onAnswer)
                        GamePhase.Reveal -> state.reveal?.let { reveal ->
                            Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(reveal.title, style = MaterialTheme.typography.headlineMedium)
                                Text(reveal.artist, style = MaterialTheme.typography.titleLarge)
                                Text(reveal.year.toString(), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.primary)
                                Text("${strings.text("common.points")}: ${reveal.pointsAwarded}")
                            } }
                        }
                        else -> Unit
                    }
                }
            }
            val question = state.phase == GamePhase.Question
            val needsPlacement = question && state.mode == "timeline" && !state.answersLocked
            PhomuPrimaryButton(text = when {
                needsPlacement -> strings.text("modes.timeline.reveal")
                question -> strings.text("game.question.allDoneReveal")
                state.phase == GamePhase.Drawing || state.phase == GamePhase.Idle -> strings.text("game.drawing.drawLabel1")
                else -> strings.text("common.next")
            }, enabled = !state.isBusy && (!question || state.answersLocked || (needsPlacement && selectedSlot != null)),
                onClick = {
                    when {
                        needsPlacement -> selectedSlot?.let { onAnswer(ModeAnswerInput.Timeline(it)) }
                        question -> onReveal()
                        state.phase == GamePhase.Drawing || state.phase == GamePhase.Idle -> onDraw()
                        else -> onNextRound()
                    }
                }, modifier = Modifier.fillMaxWidth())
        }
    }
}

/** Native choices use the same wire answers as the web and never compute the score. */
@Composable
private fun ModeChoices(state: GameUiState, strings: PhomuStrings, onAnswer: (ModeAnswerInput) -> Unit) {
    var level by rememberSaveable(state.roundNumber) { mutableIntStateOf(1) }
    val enabled = !state.answersLocked && !state.isBusy
    if (state.mode == "hint-master") {
        state.hints.take(level).forEach { Text(it, style = MaterialTheme.typography.bodyLarge) }
        if (level < state.hints.size) OutlinedButton(onClick = { level++ }, enabled = enabled) {
            Text(strings.text("common.next"))
        }
        listOf("both" to "knewBoth", "artist" to "knewArtist", "title" to "knewTitle", "none" to "knewNothing").forEach { (answer, label) ->
            OutlinedButton(onClick = { onAnswer(ModeAnswerInput.HintMaster(level, answer)) }, enabled = enabled,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(strings.text("modes.hintMaster.$label")) }
        }
    } else if (state.mode == "survivor") {
        listOf(true to "yes", false to "no").forEach { (oneHit, label) ->
            OutlinedButton(onClick = { onAnswer(ModeAnswerInput.Survivor(oneHit)) }, enabled = enabled,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(strings.text("modes.survivor.$label")) }
        }
    } else {
        state.options.forEach { option ->
            val answer = when (state.mode) {
                "vibe-check" -> ModeAnswerInput.VibeCheck(option, false)
                "lyrics" -> ModeAnswerInput.Lyrics(option)
                "cover-confusion" -> ModeAnswerInput.CoverConfusion(0, option, null)
                else -> null
            }
            OutlinedButton(onClick = { if (answer != null) onAnswer(answer) }, enabled = enabled && answer != null,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(option, style = MaterialTheme.typography.bodyLarge) }
        }
    }
}
