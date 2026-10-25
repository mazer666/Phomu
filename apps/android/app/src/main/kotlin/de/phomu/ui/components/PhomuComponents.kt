package de.phomu.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp

/**
 * The minimum size of a control of the shell.
 *
 * WHY 48 dp and not 44 px: the requirement PLAT-102 asks for at least
 * 44 px on a touch track, and the guideline of the platform asks for 48 dp.
 * The shell uses the larger of the two.
 */
val MINIMUM_TOUCH_TARGET: androidx.compose.ui.unit.Dp = 48.dp

/**
 * A button with an icon and a name for the screen reader.
 *
 * WHY the name is a parameter and not optional: the requirement A11Y-105
 * asks every interactive element to have a name that a screen reader
 * announces, and an icon-only button without a name is the classic
 * violation.
 *
 * @param icon the icon of the button
 * @param description the name the screen reader announces
 * @param onClick what the button does
 * @param modifier the modifier of the button
 */
@Composable
fun PhomuIconButton(
    icon: ImageVector,
    description: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    IconButton(
        onClick = onClick,
        modifier = modifier.defaultMinSize(
            minWidth = MINIMUM_TOUCH_TARGET,
            minHeight = MINIMUM_TOUCH_TARGET,
        ),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = description,
            modifier = Modifier.defaultMinSize(
                minWidth = MINIMUM_TOUCH_TARGET,
                minHeight = MINIMUM_TOUCH_TARGET,
            ),
        )
    }
}

/**
 * The primary action of a screen.
 *
 * @param text the text of the button
 * @param onClick what the button does
 * @param modifier the modifier of the button
 * @param enabled whether the button can be pressed
 */
@Composable
fun PhomuPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.defaultMinSize(minHeight = MINIMUM_TOUCH_TARGET),
    ) {
        Text(text)
    }
}

/**
 * The secondary action of a screen.
 *
 * @param text the text of the button
 * @param onClick what the button does
 * @param modifier the modifier of the button
 * @param enabled whether the button can be pressed
 */
@Composable
fun PhomuSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.defaultMinSize(minHeight = MINIMUM_TOUCH_TARGET),
    ) {
        Text(text)
    }
}

/**
 * A card with a title and a content.
 *
 * @param title the title of the card
 * @param modifier the modifier of the card
 * @param content the content of the card
 */
@Composable
fun PhomuCard(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(modifier = modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        androidx.compose.foundation.layout.Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            content()
        }
    }
}

/**
 * A row of the choices of a screen.
 *
 * @param modifier the modifier of the row
 * @param content the choices of the row
 */
@Composable
fun PhomuChoiceRow(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        content()
    }
}

/**
 * A value that is shown next to its name.
 *
 * WHY the semantics are cleared: the value is read by the screen reader as
 * part of the row, and a separate announcement of the value would repeat it.
 *
 * @param name the name of the value
 * @param value the value
 */
@Composable
fun PhomuLabelledValue(name: String, value: String) {
    Row(
        modifier = Modifier
            .defaultMinSize(minHeight = MINIMUM_TOUCH_TARGET)
            .padding(vertical = 4.dp)
            .clearAndSetSemantics { },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = name, style = MaterialTheme.typography.bodyMedium)
        Text(text = value, style = MaterialTheme.typography.bodyLarge)
    }
}
