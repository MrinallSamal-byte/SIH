package com.aapdasetu.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight

/**
 * Kinetic Zero is dark-only by design (there is no light-mode variant in the
 * Stitch source), so this theme ignores the system light/dark setting.
 */
private val KineticColorScheme = darkColorScheme(
    primary = KineticPrimary,
    onPrimary = KineticOnPrimary,
    secondary = KineticOnSurfaceVariant,
    onSecondary = KineticBackground,
    error = KineticSosRed,
    onError = KineticPrimary,
    errorContainer = KineticSosContainer,
    onErrorContainer = KineticPrimary,
    background = KineticBackground,
    onBackground = KineticOnSurface,
    surface = KineticBackground,
    onSurface = KineticOnSurface,
    surfaceVariant = KineticSurfaceContainer,
    onSurfaceVariant = KineticOnSurfaceVariant,
    surfaceContainerLow = KineticSurfaceContainerLow,
    surfaceContainer = KineticSurfaceContainer,
    surfaceContainerHigh = KineticSurfaceContainerHigh,
    outline = KineticOutline,
    outlineVariant = KineticOutlineVariant
)

/**
 * Material3's Typography only has fixed slot names (headlineLarge, bodyMedium,
 * etc). Kinetic Zero's own semantic scale (headlineLgMobile, dataMono,
 * labelCaps...) doesn't map onto those slots cleanly, so components should
 * reach for AapdaSetuType.* directly instead of MaterialTheme.typography.*.
 * This mapping exists only so that any stock Material3 component you add
 * later (e.g. a default Text() with no explicit style) still renders in the
 * right fonts instead of falling back to the platform default.
 */
private val KineticTypography = Typography(
    headlineLarge = AapdaSetuType.headlineLg,
    headlineMedium = AapdaSetuType.headlineMd,
    bodyLarge = AapdaSetuType.bodyLg,
    bodyMedium = AapdaSetuType.bodyMd,
    labelSmall = AapdaSetuType.labelCaps,
    labelMedium = AapdaSetuType.dataMono.copy(fontWeight = FontWeight.Medium)
)

@Composable
fun AapdaSetuTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = KineticColorScheme,
        typography = KineticTypography,
        shapes = AapdaSetuShapes,
        content = content
    )
}
