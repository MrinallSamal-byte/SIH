package com.aapdasetu.app.ui.screens.welcome

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Sensors
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aapdasetu.app.ui.components.AapdaSetuTopBar
import com.aapdasetu.app.ui.components.DataMonoText
import com.aapdasetu.app.ui.components.GlassPanel
import com.aapdasetu.app.ui.components.LabelCapsText
import com.aapdasetu.app.ui.components.PulsingDot
import com.aapdasetu.app.ui.theme.AapdaSetuShape
import com.aapdasetu.app.ui.theme.AapdaSetuType
import com.aapdasetu.app.ui.theme.KineticBackground
import com.aapdasetu.app.ui.theme.KineticMutedText
import com.aapdasetu.app.ui.theme.KineticOnPrimary
import com.aapdasetu.app.ui.theme.KineticOnSurface
import com.aapdasetu.app.ui.theme.KineticOutlineVariant
import com.aapdasetu.app.ui.theme.KineticPrimary
import com.aapdasetu.app.ui.theme.KineticSosRed

/**
 * Screen 1 of 4 from the Stitch export (welcome_to_aapdasetu). Onboarding
 * splash: animated mesh diagram, protocol pitch, single CTA into Setup.
 */
@Composable
fun WelcomeScreen(onGetStarted: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(KineticBackground)) {
        AapdaSetuTopBar(
            trailing = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    PulsingDot(color = KineticSosRed)
                    Spacer(modifier = Modifier.width(6.dp))
                    LabelCapsText(text = "System Ready", color = KineticMutedText)
                }
            }
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(32.dp))
            Text(text = "WELCOME", style = AapdaSetuType.headlineLg, color = KineticPrimary)
            Spacer(modifier = Modifier.height(24.dp))

            GlassPanel {
                Column {
                    MeshDiagram()
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        DataMonoText(text = "PROTO: MESH_V4")
                        DataMonoText(text = "STATUS: ACTIVE", color = KineticSosRed)
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            Text(text = "THE MESH PROTOCOL", style = AapdaSetuType.headlineMd, color = KineticPrimary)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Your phone becomes a beacon. Even without cellular service, you can signal for help through the community mesh.",
                style = AapdaSetuType.bodyLg,
                color = KineticOnSurface
            )

            Spacer(modifier = Modifier.height(24.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, KineticOutlineVariant.copy(alpha = 0.5f), AapdaSetuShape.xl)
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.Sensors,
                        contentDescription = null,
                        tint = KineticOnSurface,
                        modifier = Modifier.padding(end = 12.dp)
                    )
                    Text(
                        text = "Peer-to-peer data relay active within 500m radius.",
                        style = AapdaSetuType.bodyMd,
                        color = KineticOnSurface
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = onGetStarted,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = AapdaSetuShape.default,
                colors = ButtonDefaults.buttonColors(
                    containerColor = KineticPrimary,
                    contentColor = KineticOnPrimary
                )
            ) {
                Text(text = "GET STARTED", style = AapdaSetuType.labelCaps.copy(fontSize = 16.sp))
                Spacer(modifier = Modifier.width(8.dp))
                Icon(imageVector = Icons.AutoMirrored.Outlined.ArrowForward, contentDescription = null)
            }

            Spacer(modifier = Modifier.height(16.dp))
            DataMonoText(
                text = "System Build v4.0.2-Rel \u2022 Encryption Enabled",
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun MeshDiagram() {
    val infiniteTransition = rememberInfiniteTransition(label = "mesh_pulse")
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    Canvas(modifier = Modifier.fillMaxWidth().height(160.dp)) {
        val centerNode = Offset(size.width * 0.28f, size.height * 0.5f)
        val peerA = Offset(size.width * 0.62f, size.height * 0.2f)
        val peerB = Offset(size.width * 0.62f, size.height * 0.8f)
        val gateway = Offset(size.width * 0.9f, size.height * 0.5f)

        val dashEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f), 0f)
        val lineColor = Color.White.copy(alpha = 0.25f)

        drawLine(lineColor, centerNode, peerA, strokeWidth = 2f, pathEffect = dashEffect, cap = StrokeCap.Round)
        drawLine(lineColor, centerNode, peerB, strokeWidth = 2f, pathEffect = dashEffect, cap = StrokeCap.Round)
        drawLine(lineColor, centerNode, gateway, strokeWidth = 2f, pathEffect = dashEffect, cap = StrokeCap.Round)

        drawCircle(
            color = Color.White.copy(alpha = pulse * 0.5f),
            radius = 18f + (pulse * 6f),
            center = centerNode
        )
        drawCircle(color = Color.White, radius = 7f, center = centerNode)

        listOf(peerA, peerB, gateway).forEach { point ->
            drawRect(
                color = Color.White.copy(alpha = 0.7f),
                topLeft = Offset(point.x - 4f, point.y - 4f),
                size = Size(8f, 8f)
            )
        }
    }
}
