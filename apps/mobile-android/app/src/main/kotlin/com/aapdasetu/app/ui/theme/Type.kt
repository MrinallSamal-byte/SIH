package com.aapdasetu.app.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Font families for the Kinetic Zero type system: Inter for body copy,
 * Space Mono for headlines / data readouts / tracked-out labels.
 *
 * This scaffold intentionally ships with SYSTEM FONTS as a working default
 * (FontFamily.Default stands in for Inter, FontFamily.Monospace stands in
 * for Space Mono) so the project compiles and runs with zero extra steps.
 * The real fonts are not bundled here because this tool can't write binary
 * font files to your filesystem.
 *
 * To switch to the real fonts, pick ONE of:
 *   1. Download Inter and Space Mono from Google Fonts, drop the .ttf files
 *      into res/font/ (e.g. res/font/inter_regular.ttf, res/font/space_mono_regular.ttf,
 *      res/font/space_mono_bold.ttf), then replace the two FontFamily vals
 *      below with FontFamily(Font(R.font.inter_regular), ...).
 *   2. Use the Downloadable Fonts API (androidx.compose.ui.text.googlefonts)
 *      to fetch them from Google's Font Provider at runtime instead of
 *      bundling files - needs Google Play Services and a small provider-cert
 *      resource array. Not wired up here to avoid shipping an unverified
 *      certificate hash.
 */
val InterFontFamily: FontFamily = FontFamily.Default
val SpaceMonoFontFamily: FontFamily = FontFamily.Monospace

object AapdaSetuType {
    val headlineLg = TextStyle(
        fontFamily = SpaceMonoFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 40.sp,
        lineHeight = 44.sp,
        letterSpacing = (-0.02).em
    )

    /** The size actually used for most on-screen headers ("AAPDASETU", "WELCOME", card titles). */
    val headlineLgMobile = TextStyle(
        fontFamily = SpaceMonoFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.01).em
    )

    val headlineMd = TextStyle(
        fontFamily = SpaceMonoFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 24.sp,
        lineHeight = 29.sp
    )

    val bodyLg = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp,
        lineHeight = 29.sp
    )

    val bodyMd = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp
    )

    /** Coordinates, IDs, timestamps - technical readouts. */
    val dataMono = TextStyle(
        fontFamily = SpaceMonoFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.05.em
    )

    /** Uppercase, tracked-out labels: button text, status chips, nav labels.
     *  Apply .uppercase() to the string yourself - Compose TextStyle has no
     *  built-in text-transform. */
    val labelCaps = TextStyle(
        fontFamily = SpaceMonoFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.1.em
    )
}
