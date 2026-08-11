package com.aapdasetu.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aapdasetu.app.ui.theme.AapdaSetuShape
import com.aapdasetu.app.ui.theme.KineticGlassBorder
import com.aapdasetu.app.ui.theme.KineticGlassBorderElevated
import com.aapdasetu.app.ui.theme.KineticGlassFill

/**
 * The "Level 1 glass container" used throughout the design: translucent
 * black fill + a 1px border + sharp 8dp corners.
 *
 * The source screens use `backdrop-filter: blur(20px)` behind this panel
 * (a true background blur). Compose has no simple, broadly-compatible
 * Modifier for backdrop blur, so this scaffold uses the semi-transparent
 * fill alone, which already reads as "glass" against the near-black
 * background. Revisit with Modifier.graphicsLayer + RenderEffect (API 31+)
 * if you want the exact frosted-glass look later.
 */
@Composable
fun GlassPanel(
    modifier: Modifier = Modifier,
    elevated: Boolean = false,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable () -> Unit
) {
    val borderColor: Color = if (elevated) KineticGlassBorderElevated else KineticGlassBorder
    Box(
        modifier = modifier
            .clip(AapdaSetuShape.xl)
            .background(KineticGlassFill)
            .border(1.dp, borderColor, AapdaSetuShape.xl)
            .padding(contentPadding)
    ) {
        content()
    }
}
