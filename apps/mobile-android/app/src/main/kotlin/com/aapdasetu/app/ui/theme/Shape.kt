package com.aapdasetu.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Kinetic Zero is a sharp, minimal-radius system - these values follow the
 * actual Tailwind config baked into the Stitch-generated screens (which
 * overrides DESIGN.md's default token scale), not the DESIGN.md prose scale.
 */
object AapdaSetuShape {
    val sm = RoundedCornerShape(2.dp)
    val default = RoundedCornerShape(4.dp)
    val lg = RoundedCornerShape(4.dp)
    val xl = RoundedCornerShape(8.dp)
    /** Named "full" in the source tokens but is a 12dp radius, not a true pill. */
    val full = RoundedCornerShape(12.dp)
}

val AapdaSetuShapes = Shapes(
    extraSmall = AapdaSetuShape.sm,
    small = AapdaSetuShape.default,
    medium = AapdaSetuShape.lg,
    large = AapdaSetuShape.xl,
    extraLarge = AapdaSetuShape.full
)
