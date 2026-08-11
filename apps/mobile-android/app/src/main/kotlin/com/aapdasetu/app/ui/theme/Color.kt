package com.aapdasetu.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * "Kinetic Zero" palette, extracted from the AapdaSetu Stitch design
 * (stitch_aapdasetu_p2p_sos/kinetic_zero/DESIGN.md) and cross-checked against
 * the actual generated screen HTML.
 *
 * Important: DESIGN.md's auto-generated Material color tokens define
 * error/secondary as a salmon pink (#ffb4ac). None of the real screens use
 * that. Every genuine critical/SOS state hardcodes KineticSosRed (#E53935)
 * instead - that is the color to reach for, not a "secondary"/"error" token.
 */

// Surfaces
val KineticBackground = Color(0xFF121414)
val KineticSurfaceContainerLow = Color(0xFF1B1C1C)
val KineticSurfaceContainer = Color(0xFF1F2020)
val KineticSurfaceContainerHigh = Color(0xFF292A2A)

// Glass panel (Level 1 container): black at 50% alpha + this 1px border
val KineticGlassFill = Color(0x80000000)
val KineticGlassBorder = Color(0xFF1A1A1A)
// Level 2 (modals / elevated sheets) get a brighter border
val KineticGlassBorderElevated = Color(0xFF333333)

// Text & icons
val KineticPrimary = Color(0xFFFFFFFF)
val KineticOnPrimary = Color(0xFF2F3131)
val KineticOnSurface = Color(0xFFE3E2E2)
val KineticOnSurfaceVariant = Color(0xFFC4C7C8)
val KineticMutedText = Color(0xFF757575)

// Borders / outlines
val KineticOutline = Color(0xFF8E9192)
val KineticOutlineVariant = Color(0xFF444748)

// The one functional accent color in the whole system. Reserved for
// emergency / critical / SOS states only - never used decoratively.
val KineticSosRed = Color(0xFFE53935)
val KineticSosRedGlow = Color(0x66E53935)
val KineticSosContainer = Color(0xFF93000A)

// "BROADCAST SENT" success flash (Tailwind emerald-600 in the source screens)
val KineticSuccessGreen = Color(0xFF059669)
