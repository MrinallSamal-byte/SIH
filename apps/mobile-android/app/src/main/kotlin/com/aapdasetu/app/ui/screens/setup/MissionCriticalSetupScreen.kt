package com.aapdasetu.app.ui.screens.setup

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Sensors
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.aapdasetu.app.ui.theme.KineticOnSurfaceVariant
import com.aapdasetu.app.ui.theme.KineticOutlineVariant
import com.aapdasetu.app.ui.theme.KineticPrimary
import com.aapdasetu.app.ui.theme.KineticSurfaceContainer

/**
 * Screen 2 of 4 from the Stitch export (mission_critical_setup). Requests
 * the 3 real permissions AapdaSetu needs (BLE mesh, location, battery
 * exemption) and only unlocks the CTA once all 3 are granted.
 */
@Composable
fun MissionCriticalSetupScreen(onEngage: () -> Unit) {
    val permissionState = rememberSetupPermissionState()

    Column(modifier = Modifier.fillMaxSize().background(KineticBackground)) {
        AapdaSetuTopBar(
            trailing = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Outlined.Sensors, contentDescription = null, tint = KineticPrimary)
                    Spacer(modifier = Modifier.width(16.dp))
                    Icon(imageVector = Icons.Outlined.Menu, contentDescription = null, tint = KineticPrimary)
                }
            }
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            LinearProgressIndicator(
                progress = { 2f / 4f },
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = KineticPrimary,
                trackColor = KineticOutlineVariant.copy(alpha = 0.4f)
            )
            Spacer(modifier = Modifier.height(12.dp))
            LabelCapsText(text = "Step 02 / 04", color = KineticMutedText)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "MISSION CRITICAL PERMISSIONS", style = AapdaSetuType.headlineLgMobile, color = KineticPrimary)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "To ensure survival connectivity in zero-infrastructure zones, the following telemetry protocols must be authorized.",
                style = AapdaSetuType.bodyMd,
                color = KineticOnSurfaceVariant
            )
            Spacer(modifier = Modifier.height(24.dp))

            SetupPermissionItem.entries.forEach { item ->
                PermissionCard(
                    item = item,
                    granted = permissionState.granted[item] == true,
                    onGrant = { permissionState.request(item) }
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Fixed bottom footer: integrity meter + the gated CTA.
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(KineticBackground)
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                LabelCapsText(text = "System Integrity", color = KineticMutedText)
                DataMonoText(text = "${permissionState.grantedCount}/3 CALIBRATED")
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { permissionState.grantedCount / 3f },
                modifier = Modifier.fillMaxWidth().height(4.dp),
                color = KineticPrimary,
                trackColor = KineticSurfaceContainer
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onEngage,
                enabled = permissionState.allGranted,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = AapdaSetuShape.default,
                colors = ButtonDefaults.buttonColors(
                    containerColor = KineticPrimary,
                    contentColor = KineticOnPrimary,
                    disabledContainerColor = KineticSurfaceContainer,
                    disabledContentColor = KineticMutedText
                )
            ) {
                Text(
                    text = if (permissionState.allGranted) "ENGAGE PROTOCOL" else "SYSTEM READY",
                    style = AapdaSetuType.labelCaps.copy(fontSize = 16.sp)
                )
            }
        }
    }
}

@Composable
private fun PermissionCard(
    item: SetupPermissionItem,
    granted: Boolean,
    onGrant: () -> Unit
) {
    GlassPanel(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = item.icon, contentDescription = null, tint = KineticPrimary)
                    Spacer(modifier = Modifier.width(10.dp))
                    LabelCapsText(text = item.title, color = KineticPrimary)
                }
                if (granted) {
                    PulsingDot(color = KineticPrimary)
                } else {
                    Spacer(
                        modifier = Modifier
                            .padding(2.dp)
                            .width(6.dp)
                            .height(6.dp)
                            .background(KineticOutlineVariant, shape = CircleShape)
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = item.description, style = AapdaSetuType.bodyMd, color = KineticOnSurface)
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    DataMonoText(text = item.metaPrimary)
                    if (item.metaSecondary.isNotEmpty()) {
                        DataMonoText(text = item.metaSecondary)
                    }
                }
                if (granted) {
                    OutlinedButton(
                        onClick = {},
                        enabled = false,
                        shape = AapdaSetuShape.default,
                        colors = OutlinedButtonDefaults.colors(disabledContentColor = KineticPrimary)
                    ) {
                        Text(text = "GRANTED", style = AapdaSetuType.labelCaps)
                    }
                } else {
                    OutlinedButton(
                        onClick = onGrant,
                        shape = AapdaSetuShape.default,
                        colors = OutlinedButtonDefaults.colors(contentColor = KineticPrimary),
                        border = BorderStroke(1.dp, KineticPrimary)
                    ) {
                        Text(text = "GRANT", style = AapdaSetuType.labelCaps)
                    }
                }
            }
        }
    }
}
