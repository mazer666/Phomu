package de.phomu.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

/**
 * The colours of the four themes of the product.
 *
 * WHY the themes exist in the shell and not in the base: the base decides
 * what happens, the shell decides how it looks
 * (docs/design/PLATFORM-ARCHITECTURE.md § 4.2). The requirement SHELL-109
 * asks every shell to offer the same four themes, and this file is the
 * Android side of that promise.
 */
data class PhomuColors(
    val primary: Color,
    val secondary: Color,
    val background: Color,
    val surface: Color,
    val onBackground: Color,
    val accent: Color,
    val success: Color,
    val warning: Color,
    val error: Color,
)

/**
 * The theme "jackbox" — the colourful default of the product.
 */
val JACKBOX_COLORS = PhomuColors(
    primary = Color(0xFF4F46E5),
    secondary = Color(0xFF7C3AED),
    background = Color(0xFF111827),
    surface = Color(0xFF1F2937),
    onBackground = Color(0xFFF9FAFB),
    accent = Color(0xFFF59E0B),
    success = Color(0xFF22C55E),
    warning = Color(0xFFF97316),
    error = Color(0xFFEF4444),
)

/**
 * The theme "spotify" — dark, minimal, clean.
 */
val SPOTIFY_COLORS = PhomuColors(
    primary = Color(0xFF1DB954),
    secondary = Color(0xFF1ED760),
    background = Color(0xFF121212),
    surface = Color(0xFF181818),
    onBackground = Color(0xFFFFFFFF),
    accent = Color(0xFF1DB954),
    success = Color(0xFF1DB954),
    warning = Color(0xFFFFA726),
    error = Color(0xFFEF4444),
)

/**
 * The theme "youtube" — dark and red.
 */
val YOUTUBE_COLORS = PhomuColors(
    primary = Color(0xFFFF0000),
    secondary = Color(0xFFAA0000),
    background = Color(0xFF0F0F0F),
    surface = Color(0xFF212121),
    onBackground = Color(0xFFFFFFFF),
    accent = Color(0xFFFF5252),
    success = Color(0xFF22C55E),
    warning = Color(0xFFFFA726),
    error = Color(0xFFEF4444),
)

/**
 * The theme "musicwall" — light, tiles, covers.
 */
val MUSICWALL_COLORS = PhomuColors(
    primary = Color(0xFF2563EB),
    secondary = Color(0xFF7C3AED),
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    onBackground = Color(0xFF0F172A),
    accent = Color(0xFFDB2777),
    success = Color(0xFF16A34A),
    warning = Color(0xFFD97706),
    error = Color(0xFFDC2626),
)

/**
 * The colours of a theme.
 *
 * @param name the name of the theme
 * @return the colours of the theme
 */
fun colorsOf(name: String): PhomuColors = when (name) {
    "spotify" -> SPOTIFY_COLORS
    "youtube" -> YOUTUBE_COLORS
    "musicwall" -> MUSICWALL_COLORS
    else -> JACKBOX_COLORS
}

/**
 * The names of the four themes of the product.
 */
val THEME_NAMES: List<String> = listOf("jackbox", "spotify", "youtube", "musicwall")

/**
 * The typography of the shell.
 *
 * WHY the shell defines its own type scale: the type is a property of the
 * drawing, and the base has no pixels.
 */
private val phomuTypography = Typography(
    headlineLarge = TextStyle(fontSize = 32.sp, lineHeight = 40.sp),
    headlineMedium = TextStyle(fontSize = 26.sp, lineHeight = 34.sp),
    titleLarge = TextStyle(fontSize = 22.sp, lineHeight = 30.sp),
    titleMedium = TextStyle(fontSize = 18.sp, lineHeight = 26.sp),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 22.sp),
    labelLarge = TextStyle(fontSize = 15.sp, lineHeight = 20.sp),
)

/**
 * The theme of the shell.
 *
 * WHY the system appearance is not a fifth theme: the requirement PLAT-121
 * asks for the system appearance *in addition* to the four themes. The
 * appearance of the system therefore decides whether the dark or the light
 * variant of the chosen theme is used.
 *
 * @param themeName the name of the theme
 * @param darkTheme whether the dark variant is used
 */
@Composable
fun PhomuTheme(
    themeName: String,
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = colorsOf(themeName)
    val scheme = if (darkTheme) {
        darkColorScheme(
            primary = colors.primary,
            secondary = colors.secondary,
            background = colors.background,
            surface = colors.surface,
            onBackground = colors.onBackground,
            error = colors.error,
        )
    } else {
        lightColorScheme(
            primary = colors.primary,
            secondary = colors.secondary,
            background = colors.background,
            surface = colors.surface,
            onBackground = colors.onBackground,
            error = colors.error,
        )
    }
    MaterialTheme(
        colorScheme = scheme,
        typography = phomuTypography,
        content = content,
    )
}
