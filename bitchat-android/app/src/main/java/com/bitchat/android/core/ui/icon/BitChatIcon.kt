package com.bitchat.android.core.ui.icon

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

val BitChatIcon: ImageVector
    get() {
        _BitChatIcon?.let { return it }

        return ImageVector.Builder(
            name = "SoaMeshIcon",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).apply {
            // Radio Wave Broadcast Arc at top
            path(
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 1.2f,
                strokeLineCap = StrokeCap.Round
            ) {
                moveTo(9.5f, 4.5f)
                curveTo(10.5f, 3.5f, 13.5f, 3.5f, 14.5f, 4.5f)
            }

            // Letter 'S' - Futuristic Curved Mesh Glyph
            path(
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 1.6f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round
            ) {
                moveTo(8.2f, 7.5f)
                curveTo(6.2f, 7.2f, 4.5f, 7.8f, 4.5f, 9.8f)
                curveTo(4.5f, 12f, 8.2f, 12.2f, 8.2f, 14.4f)
                curveTo(8.2f, 16.4f, 6.2f, 17f, 4.5f, 16.8f)
            }

            // Letter 'O' - Central Connected Mesh Nexus Ring
            path(
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 1.6f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round
            ) {
                moveTo(12f, 7.5f)
                curveTo(14.5f, 7.5f, 15.5f, 9.5f, 15.5f, 12.2f)
                curveTo(15.5f, 14.8f, 14.5f, 16.8f, 12f, 16.8f)
                curveTo(9.5f, 16.8f, 8.5f, 14.8f, 8.5f, 12.2f)
                curveTo(8.5f, 9.5f, 9.5f, 7.5f, 12f, 7.5f)
                close()
            }

            // Central Pulse Node in 'O'
            path(fill = SolidColor(Color.Black)) {
                moveTo(12f, 11.2f)
                lineTo(13f, 12.2f)
                lineTo(12f, 13.2f)
                lineTo(11f, 12.2f)
                close()
            }

            // Letter 'A' - Transmitter Apex Beacon
            path(
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 1.6f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round
            ) {
                moveTo(16.5f, 16.8f)
                lineTo(19f, 7.5f)
                lineTo(21.5f, 16.8f)
                moveTo(17.4f, 13.5f)
                lineTo(20.6f, 13.5f)
            }

            // Bottom Mesh Baseline and Nodes
            path(
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 0.8f,
                strokeLineCap = StrokeCap.Round
            ) {
                moveTo(6f, 19.5f)
                lineTo(18f, 19.5f)
            }

            path(fill = SolidColor(Color.Black)) {
                moveTo(6f, 19f)
                lineTo(6.5f, 19.5f)
                lineTo(6f, 20f)
                lineTo(5.5f, 19.5f)
                close()

                moveTo(12f, 19f)
                lineTo(12.5f, 19.5f)
                lineTo(12f, 20f)
                lineTo(11.5f, 19.5f)
                close()

                moveTo(18f, 19f)
                lineTo(18.5f, 19.5f)
                lineTo(18f, 20f)
                lineTo(17.5f, 19.5f)
                close()
            }
        }.build().also { _BitChatIcon = it }
    }

private var _BitChatIcon: ImageVector? = null
