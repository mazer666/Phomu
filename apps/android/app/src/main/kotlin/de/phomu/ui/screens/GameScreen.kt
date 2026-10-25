package de.phomu.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.phomu.game.GamePhase
import de.phomu.game.LeaveGameGuard
import de.phomu.game.GameUiState
import de.phomu.game.ModeAnswerInput
import de.phomu.ui.components.PhomuPrimaryButton
import de.phomu.ui.components.PhomuSecondaryButton
import de.phomu.ui.text.PhomuStrings

/**
 * The key of the title of a mode.
 *
 * @param mode the identifier of the mode
 * @return the key of the title
 */
private fun modeTitleKey(mode: String): String = when (mode) {
    "timeline" -> "game.drawing.modeTitle.timeline"
    "hint-master" -> "game.drawing.modeTitle.hintMaster"
    "lyrics" -> "game.drawing.modeTitle.lyrics"
    "vibe-check" -> "game.drawing.modeTitle.vibeCheck"
    "survivor" -> "game.drawing.modeTitle.survivor"
    "cover-confusion" -> "game.drawing.modeTitle.coverConfusion"
    else -> "game.drawing.modeTitle.timeline"
}

/**
 * The key of the instruction of a mode.
 *
 * @param mode the identifier of the mode
 * @return the key of the instruction
 */
private fun modeInstructionKey(mode: String): String = when (mode) {
    "timeline" -> "game.drawing.modeInstruction.timeline"
    "hint-master" -> "game.drawing.modeInstruction.hintMaster"
    "lyrics" -> "game.drawing.modeInstruction.lyrics"
    "vibe-check" -> "game.drawing.modeInstruction.vibeCheck"
    "survivor" -> "game.drawing.modeInstruction.survivor"
    "cover-confusion" -> "game.drawing.modeInstruction.coverConfusion"
    else -> "game.drawing.modeInstruction.timeline"
}

/**
 * The game of the shell.
 *
 * WHAT: the phases of a round — the draw, the question, the lock, the
 * reveal and the points.
 *
 * WHY the screen draws what the base reports: the phase, the hints, the
 * options and the points come from the view model of the base. The screen
 * never computes a phase and never computes points.
 *
 * WHY the back button asks: a party game is interrupted by a phone call;
 * leaving the game by accident costs the group its place
 * (docs/spec/REQUIREMENTS-PLATFORM.md, PLAT-122).
 *
 * @param state the state of the game
 * @param strings the texts of the shell
 * @param onDraw draws the next song
 * @param onAnswer submits the answer of the player
 * @param onReveal releases the solution of the round
 * @param onNextRound closes the round and prepares the next one
 * @param onLeave leaves the game
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(
    state: GameUiState,
    strings: PhomuStrings,
    onDraw: () -> Unit,
    onAnswer: (ModeAnswerInput) -> Unit,
    onReveal: () -> Unit,
    onNextRound: () -> Unit,
    onLeave: () -> Unit,
) {
    val guard = remember { LeaveGameGuard() }

    BackHandler(enabled = true) {
        guard.onBackPressed()
    }

    if (guard.isDialogVisible) {
        AlertDialog(
            onDismissRequest = { guard.dismiss() },
            title = { Text(strings.text("game.header.exitTitle")) },
            text = { Text(strings.text("game.header.exitAriaLabel")) },
            confirmButton = {
                TextButton(onClick = {
                    guard.confirm()
                    onLeave()
                }) {
                    Text(strings.text("common.confirm"))
                }
            },
            dismissButton = {
                TextButton(onClick = { guard.dismiss() }) {
                    Text(strings.text("common.cancel"))
                }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(strings.text("game.header.round", state.roundNumber))
                },
                actions = {
                    IconButton(onClick = { guard.onBackPressed() }) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = strings.text("game.header.exitAriaLabel"),
                        )
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    text = strings.text(modeTitleKey(state.mode)),
                    style = MaterialTheme.typography.headlineMedium,
                )
            }
            item {
                Text(
                    text = strings.text(modeInstructionKey(state.mode)),
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            if (state.hints.isNotEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            state.hints.forEach { hint ->
                                Text(
                                    text = hint,
                                    style = MaterialTheme.typography.bodyLarge,
                                    modifier = Modifier.padding(vertical = 4.dp),
                                )
                            }
                        }
                    }
                }
            }
            if (state.pointsPossible > 0) {
                item {
                    Text(
                        text = "${strings.text("common.points")}: ${state.pointsPossible}",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            }
            items(state.options) { option ->
                val answer = optionAnswer(state.mode, option, state.options)
                Button(
                    onClick = { if (answer != null) onAnswer(answer) },
                    enabled = !state.answersLocked && answer != null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                ) {
                    Text(option)
                }
            }
            if (state.options.isNotEmpty() && state.options.all {
                    optionAnswer(state.mode, it, state.options) == null
                }
            ) {
                item {
                    Text(
                        text = strings.text("common.notAvailable"),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
            item {
                when (state.phase) {
                    GamePhase.Drawing -> PhomuPrimaryButton(
                        text = strings.text("game.drawing.drawLabel1"),
                        onClick = onDraw,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    GamePhase.Question -> Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        PhomuPrimaryButton(
                            text = strings.text("game.question.allDoneReveal"),
                            onClick = onReveal,
                            enabled = state.answersLocked,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (state.options.isEmpty()) {
                            Text(
                                text = strings.text("common.notAvailable"),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }

                    GamePhase.Reveal -> {
                        val reveal = state.reveal
                        if (reveal != null) {
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = reveal.title,
                                        style = MaterialTheme.typography.headlineMedium,
                                    )
                                    Text(
                                        text = "${reveal.artist} (${reveal.year})",
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                    Text(
                                        text = "${strings.text("common.points")}: " +
                                            reveal.pointsAwarded,
                                        style = MaterialTheme.typography.titleMedium,
                                    )
                                }
                            }
                        }
                        PhomuPrimaryButton(
                            text = strings.text("common.next"),
                            onClick = onNextRound,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    GamePhase.Scoring -> PhomuPrimaryButton(
                        text = strings.text("common.next"),
                        onClick = onNextRound,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    GamePhase.Finished -> PhomuPrimaryButton(
                        text = strings.text("common.finish"),
                        onClick = onNextRound,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    GamePhase.Idle -> PhomuSecondaryButton(
                        text = strings.text("common.start"),
                        onClick = onDraw,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
            item {
                Text(
                    text = strings.text("game.scoreboard.title"),
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            items(state.players, key = { player -> player.id }) { player ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(text = player.name, style = MaterialTheme.typography.bodyLarge)
                    Text(text = player.score.toString(), style = MaterialTheme.typography.bodyLarge)
                }
            }
        }
    }
}

/**
 * The answer of the player, as the screen collects it.
 *
 * WHY the mapping is here and not in the base: the base defines which field
 * of the answer belongs to which mode, and the shell fills that field with
 * what the player picked. The points of the answer are decided by the base.
 *
 * WHY two modes have no answer: the question view model of the bridge does
 * not carry the slots of the Timeline mode and drops the flag of the Lyrics
 * mode, so the shell cannot express the answer of these two modes. The
 * screen shows that the answer is not available instead of sending a wrong
 * answer. The gap is listed in the delivery report of the track.
 *
 * @param mode the identifier of the mode
 * @param option the option the player picked
 * @param options every option of the question
 * @return the answer, or `null` when the mode cannot be answered
 */
private fun optionAnswer(
    mode: String,
    option: String,
    options: List<String>,
): ModeAnswerInput? = when (mode) {
    "vibe-check" -> ModeAnswerInput.VibeCheck(mood = option, cheatUsed = false)
    "cover-confusion" -> ModeAnswerInput.CoverConfusion(
        hintsUsed = 0,
        pickedArtist = option,
        selfAssess = null,
    )
    "survivor" -> ModeAnswerInput.Survivor(guessedOneHit = false)
    else -> null
}
