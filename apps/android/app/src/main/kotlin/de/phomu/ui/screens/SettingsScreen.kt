package de.phomu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
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
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.phomu.bridge.BridgeVocabulary
import de.phomu.settings.AppSettings
import de.phomu.ui.components.MINIMUM_TOUCH_TARGET
import de.phomu.ui.text.PhomuStrings
import de.phomu.ui.theme.THEME_NAMES

/**
 * The settings of the shell.
 *
 * WHAT: the language, the theme, the music provider and the audio.
 *
 * WHY the screen reads the settings from the storage and writes them back:
 * the settings are a property of the device, not of the session
 * (docs/design/BUILD-CONTRACT.md § 4.2).
 *
 * @param settings the settings of the shell
 * @param strings the texts of the shell
 * @param onLanguageChanged writes the language
 * @param onThemeChanged writes the theme
 * @param onProviderChanged writes the provider
 * @param onAudioChanged writes whether the music is played
 * @param onBack returns to the previous screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    settings: AppSettings,
    strings: PhomuStrings,
    onLanguageChanged: (String) -> Unit,
    onThemeChanged: (String) -> Unit,
    onProviderChanged: (String) -> Unit,
    onAudioChanged: (Boolean) -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(strings.text("common.settings")) },
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
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    text = strings.text("settings.language"),
                    style = MaterialTheme.typography.titleMedium,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("de", "en"), key = { language -> language }) { language ->
                        FilterChip(
                            selected = settings.language == language,
                            onClick = { onLanguageChanged(language) },
                            label = {
                                Text(
                                    if (language == "de") "Deutsch" else "English",
                                )
                            },
                        )
                    }
                }
            }
            item {
                Text(
                    text = strings.text("settings.theme"),
                    style = MaterialTheme.typography.titleMedium,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(THEME_NAMES, key = { theme -> theme }) { theme ->
                        FilterChip(
                            selected = settings.theme == theme,
                            onClick = { onThemeChanged(theme) },
                            label = { Text(strings.text("themes.$theme")) },
                        )
                    }
                }
            }
            item {
                Text(
                    text = strings.text("settings.musicProvider"),
                    style = MaterialTheme.typography.titleMedium,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(BridgeVocabulary.ALL_PROVIDERS, key = { provider -> provider }) { provider ->
                        FilterChip(
                            selected = settings.musicProvider == provider,
                            onClick = { onProviderChanged(provider) },
                            label = { Text(provider) },
                        )
                    }
                }
            }
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = MINIMUM_TOUCH_TARGET),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = strings.text("settings.sections.audioTitle"),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Switch(
                        checked = settings.audioEnabled,
                        onCheckedChange = onAudioChanged,
                    )
                }
            }
            item {
                Text(
                    text = strings.text("settings.subtitle"),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}
