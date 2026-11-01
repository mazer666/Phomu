package de.phomu.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/** A record sleeve drawn in the selected theme. It never contains song metadata. */
@Composable
fun PhomuCardBack(modifier: Modifier = Modifier) {
    val color = MaterialTheme.colorScheme.primary
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier.background(MaterialTheme.colorScheme.surface, shape)
            .border(2.dp, color, shape).padding(8.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height * .4f)
            val radius = minOf(size.width, size.height) * .38f
            listOf(1f, .83f, .66f).forEach { scale ->
                drawCircle(color.copy(alpha = .7f), radius * scale, center, style = Stroke(2.dp.toPx()))
            }
            drawCircle(color, radius * .3f, center)
            drawCircle(color.copy(alpha = .2f), radius * .08f, center)
        }
        Text("PHOMU", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
    }
}
