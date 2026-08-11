package com.aapdasetu.app.ui.screens.mesh

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.PriorityHigh
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.outlined.WifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.aapdasetu.app.ui.components.AapdaSetuTopBar
import com.aapdasetu.app.ui.components.DataMonoText
import com.aapdasetu.app.ui.components.GlassPanel
import com.aapdasetu.app.ui.components.LabelCapsText
import com.aapdasetu.app.ui.components.PulsingDot
import com.aapdasetu.app.ui.theme.AapdaSetuShape
import com.aapdasetu.app.ui.theme.AapdaSetuType
import com.aapdasetu.app.ui.theme.KineticBackground
import com.aapdasetu.app.ui.theme.KineticGlassBorder
import com.aapdasetu.app.ui.theme.KineticMutedText
import com.aapdasetu.app.ui.theme.KineticOnSurface
import com.aapdasetu.app.ui.theme.KineticOutlineVariant
import com.aapdasetu.app.ui.theme.KineticPrimary
import com.aapdasetu.app.ui.theme.KineticSosRed
import com.aapdasetu.app.ui.theme.KineticSosRedGlow
import com.aapdasetu.app.ui.theme.KineticSuccessGreen
import com.aapdasetu.app.ui.theme.KineticSurfaceContainer
import com.aapdasetu.app.ui.theme.KineticSurfaceContainerLow

private data class RelayItem(
    val id: String,
    val icon: ImageVector,
    val priorityBadge: String?,
    val badgeSolid: Boolean,
    val timestampLine: String,
    val signalStrength: Int,
    val statusLabel: String,
    val statusColor: Color,
    val statusIcon: ImageVector?,
    val statusPulsing: Boolean,
    val isCritical: Boolean
)

private val relayItems = listOf(
    RelayItem(
        id = "8F2-X9L-441",
        icon = Icons.Outlined.PriorityHigh,
        priorityBadge = "HIGH PRIORITY",
        badgeSolid = false,
        timestampLine = "RCVD: 14:02:11 | T-MINUS: 02M",
        signalStrength = 3,
        statusLabel = "RELAYING...",
        statusColor = KineticPrimary,
        statusIcon = null,
        statusPulsing = true,
        isCritical = false
    ),
    RelayItem(
        id = "A22-K0Z-119",
        icon = Icons.Outlined.WifiOff,
        priorityBadge = null,
        badgeSolid = false,
        timestampLine = "RCVD: 13:45:00 | T-MINUS: 19M",
        signalStrength = 1,
        statusLabel = "SYNCED",
        statusColor = KineticMutedText,
        statusIcon = Icons.Outlined.CheckCircle,
        statusPulsing = false,
        isCritical = false
    ),
    RelayItem(
        id = "SOS-CRIT-001",
        icon = Icons.Outlined.Warning,
        priorityBadge = "LIVE BROADCAST",
        badgeSolid = true,
        timestampLine = "RCVD: JUST NOW | HOP: 1",
        signalStrength = 4,
        statusLabel = "UPLOADING...",
        statusColor = KineticSosRed,
        statusIcon = null,
        statusPulsing = true,
        isCritical = true
    ),
    RelayItem(
        id = "D88-M3P-002",
        icon = Icons.Outlined.History,
        priorityBadge = null,
        badgeSolid = false,
        timestampLine = "RCVD: 12:10:55 | T-MINUS: 111M",
        signalStrength = 0,
        statusLabel = "PURGED",
        statusColor = KineticMutedText,
        statusIcon = Icons.Outlined.Delete,
        statusPulsing = false,
        isCritical = false
    )
)

/**
 * Screen 4 of 4 from the Stitch export (mesh_relay_inbox). The operational
 * dashboard: network stats, live peer count, and the list of SOS packets
 * currently in flight through this device's mesh relay.
 *
 * The relay list is hardcoded sample data (matching the Stitch mock),
 * exactly like the backend prototype's in-memory state - this is the seam
 * where MeshTransport (mesh/transport/MeshTransport.kt) plugs in once real
 * BLE relay is implemented.
 */
@Composable
fun MeshRelayInboxScreen(contentPadding: PaddingValues = PaddingValues()) {
    Column(modifier = Modifier.fillMaxSize().background(KineticBackground)) {
        AapdaSetuTopBar(trailing = { Icon(Icons.Outlined.Hub, contentDescription = null, tint = KineticPrimary) })
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(contentPadding)
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            GlassPanel(modifier = Modifier.fillMaxWidth()) {
                Column {
                    LabelCapsText(text = "Mesh Status: Active Relay", color = KineticMutedText)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = "COMMUNITY IMPACT", style = AapdaSetuType.headlineLgMobile, color = KineticPrimary)
                    Spacer(modifier = Modifier.height(20.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                        StatBlock(value = "1,240", label = "MB SYNCED")
                        StatBlock(value = "42", label = "SIGNALS ROUTED")
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    StatBlock(value = "0.8ms", label = "RELAY LATENCY")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            GlassPanel(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    LabelCapsText(text = "Nearby Peers", color = KineticMutedText)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "15", style = AapdaSetuType.headlineLg, color = KineticPrimary)
                        Spacer(modifier = Modifier.width(10.dp))
                        PulsingDot(color = KineticPrimary, size = 8.dp)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    DataMonoText(text = "ENCRYPTED NODES")
                }
            }

            Spacer(modifier = Modifier.height(28.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                LabelCapsText(text = "SOS Signals Carried", color = KineticPrimary)
                DataMonoText(text = "AUTO-PURGE: 24H")
            }
            Spacer(modifier = Modifier.height(12.dp))

            relayItems.forEach { item ->
                RelayRow(item)
                Spacer(modifier = Modifier.height(12.dp))
            }

            Spacer(modifier = Modifier.height(16.dp))
            LabelCapsText(text = "Local Relay Topology", color = KineticMutedText)
            Spacer(modifier = Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(KineticSurfaceContainer, AapdaSetuShape.xl)
                    .border(1.dp, KineticOutlineVariant.copy(alpha = 0.4f), AapdaSetuShape.xl)
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StatBlock(value: String, label: String) {
    Column {
        Text(text = value, style = AapdaSetuType.headlineMd, color = KineticPrimary)
        Spacer(modifier = Modifier.height(2.dp))
        LabelCapsText(text = label, color = KineticMutedText)
    }
}

@Composable
private fun SignalBars(strength: Int) {
    val heights = listOf(6.dp, 10.dp, 14.dp, 18.dp)
    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        heights.forEachIndexed { index, barHeight ->
            val active = strength > index
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(barHeight)
                    .background(if (active) KineticPrimary else KineticOutlineVariant.copy(alpha = 0.4f))
            )
        }
    }
}

@Composable
private fun RelayRow(item: RelayItem) {
    val borderColor = if (item.isCritical) KineticSosRed.copy(alpha = 0.8f) else KineticGlassBorder
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(KineticSurfaceContainerLow, AapdaSetuShape.xl)
            .border(if (item.isCritical) 1.5.dp else 1.dp, borderColor, AapdaSetuShape.xl)
            .padding(14.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(if (item.isCritical) KineticSosRedGlow else KineticSurfaceContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = null,
                        tint = if (item.isCritical) KineticSosRed else KineticOnSurface,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                DataMonoText(text = "ID: ${item.id}", color = KineticOnSurface)
                item.priorityBadge?.let { badge ->
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .background(
                                if (item.badgeSolid) KineticSosRed else Color.Transparent,
                                AapdaSetuShape.sm
                            )
                            .border(1.dp, KineticSosRed, AapdaSetuShape.sm)
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        LabelCapsText(text = badge, color = if (item.badgeSolid) KineticPrimary else KineticSosRed)
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            DataMonoText(text = item.timestampLine, color = KineticMutedText)
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                SignalBars(item.signalStrength)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LabelCapsText(text = item.statusLabel, color = item.statusColor)
                    Spacer(modifier = Modifier.width(6.dp))
                    when {
                        item.statusPulsing -> PulsingDot(color = item.statusColor)
                        item.statusIcon != null -> Icon(
                            imageVector = item.statusIcon,
                            contentDescription = null,
                            tint = item.statusColor,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        }
    }
}
