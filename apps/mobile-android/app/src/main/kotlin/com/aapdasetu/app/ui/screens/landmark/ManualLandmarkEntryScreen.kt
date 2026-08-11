package com.aapdasetu.app.ui.screens.landmark

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.LocationOff
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aapdasetu.app.ui.components.AapdaSetuTopBar
import com.aapdasetu.app.ui.components.DataMonoText
import com.aapdasetu.app.ui.components.LabelCapsText
import com.aapdasetu.app.ui.theme.AapdaSetuShape
import com.aapdasetu.app.ui.theme.AapdaSetuType
import com.aapdasetu.app.ui.theme.KineticBackground
import com.aapdasetu.app.ui.theme.KineticMutedText
import com.aapdasetu.app.ui.theme.KineticOnPrimary
import com.aapdasetu.app.ui.theme.KineticOnSurface
import com.aapdasetu.app.ui.theme.KineticOutlineVariant
import com.aapdasetu.app.ui.theme.KineticPrimary
import com.aapdasetu.app.ui.theme.KineticSosContainer
import com.aapdasetu.app.ui.theme.KineticSosRed
import com.aapdasetu.app.ui.theme.KineticSuccessGreen
import com.aapdasetu.app.ui.theme.KineticSurfaceContainer
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class BroadcastState { IDLE, TRANSMITTING, SENT }

/**
 * Screen 3 of 4 from the Stitch export (manual_landmark_entry). GPS-fallback
 * SOS composer: last-known coordinates plus 3 manual location fields,
 * broadcast over the mesh with a 3-stage transmit animation.
 */
@Composable
fun ManualLandmarkEntryScreen(
    contentPadding: PaddingValues = PaddingValues(),
    onBroadcast: (street: String, landmark: String, floor: String) -> Unit = { _, _, _ -> }
) {
    var street by remember { mutableStateOf("") }
    var landmark by remember { mutableStateOf("") }
    var floor by remember { mutableStateOf("") }
    var broadcastState by remember { mutableStateOf(BroadcastState.IDLE) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize().background(KineticBackground)) {
        AapdaSetuTopBar(
            trailing = { Icon(imageVector = Icons.Outlined.Hub, contentDescription = null, tint = KineticPrimary) }
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(contentPadding)
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(KineticSosContainer.copy(alpha = 0.25f), AapdaSetuShape.xl)
                    .border(1.dp, KineticSosRed.copy(alpha = 0.5f), AapdaSetuShape.xl)
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.LocationOff,
                        contentDescription = null,
                        tint = KineticSosRed,
                        modifier = Modifier.padding(end = 10.dp)
                    )
                    LabelCapsText(text = "GPS Connection Lost", color = KineticSosRed)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Emergency mesh network active. Please provide physical markers manually for rescue synchronization.",
                    style = AapdaSetuType.bodyMd,
                    color = KineticOnSurface
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    LabelCapsText(text = "Last Known Locus", color = KineticMutedText)
                    Spacer(modifier = Modifier.height(4.dp))
                    DataMonoText(text = "28.6139\u00b0 N, 77.2090\u00b0 E", color = KineticOnSurface)
                }
                Column(horizontalAlignment = Alignment.End) {
                    LabelCapsText(text = "Accuracy", color = KineticMutedText)
                    Spacer(modifier = Modifier.height(4.dp))
                    DataMonoText(text = "LOW (>500M)", color = KineticSosRed)
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            LandmarkField("Street Name / Area", "e.g. MG Road, Block C", street) { street = it }
            Spacer(modifier = Modifier.height(20.dp))
            LandmarkField("Nearest Landmark", "e.g. Water Tank, Blue Gate", landmark) { landmark = it }
            Spacer(modifier = Modifier.height(20.dp))
            LandmarkField("Floor / Room / Unit", "e.g. 4th Floor, Room 402", floor) { floor = it }

            Spacer(modifier = Modifier.height(32.dp))

            val containerColor = when (broadcastState) {
                BroadcastState.IDLE -> KineticPrimary
                BroadcastState.TRANSMITTING -> KineticSosRed
                BroadcastState.SENT -> KineticSuccessGreen
            }
            val contentColor = if (broadcastState == BroadcastState.IDLE) KineticOnPrimary else KineticPrimary

            Button(
                onClick = {
                    if (broadcastState == BroadcastState.IDLE) {
                        scope.launch {
                            broadcastState = BroadcastState.TRANSMITTING
                            delay(1200)
                            broadcastState = BroadcastState.SENT
                            onBroadcast(street, landmark, floor)
                            delay(1600)
                            broadcastState = BroadcastState.IDLE
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(64.dp),
                shape = AapdaSetuShape.default,
                colors = ButtonDefaults.buttonColors(containerColor = containerColor, contentColor = contentColor)
            ) {
                when (broadcastState) {
                    BroadcastState.IDLE -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "BROADCAST LOCATION", style = AapdaSetuType.labelCaps.copy(fontSize = 16.sp))
                        Spacer(modifier = Modifier.height(4.dp))
                        DataMonoText(text = "TRANSMIT OVER MESH PROTOCOL", color = contentColor.copy(alpha = 0.7f))
                    }
                    BroadcastState.TRANSMITTING -> Text(text = "TRANSMITTING...", style = AapdaSetuType.labelCaps.copy(fontSize = 16.sp))
                    BroadcastState.SENT -> Text(text = "BROADCAST SENT", style = AapdaSetuType.labelCaps.copy(fontSize = 16.sp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            DataMonoText(
                text = "ENCRYPTED END-TO-END | P2P RELAY ACTIVE",
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .background(KineticSurfaceContainer, AapdaSetuShape.xl)
                    .border(1.dp, KineticOutlineVariant.copy(alpha = 0.4f), AapdaSetuShape.xl),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(imageVector = Icons.Outlined.Map, contentDescription = null, tint = KineticMutedText)
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LandmarkField(label: String, placeholder: String, value: String, onValueChange: (String) -> Unit) {
    Column {
        LabelCapsText(text = label, color = KineticMutedText)
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { DataMonoText(text = placeholder.uppercase(), color = KineticOutlineVariant) },
            modifier = Modifier.fillMaxWidth(),
            textStyle = AapdaSetuType.dataMono.copy(color = KineticOnSurface),
            shape = AapdaSetuShape.sm,
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = KineticPrimary,
                unfocusedBorderColor = KineticOutlineVariant,
                focusedTextColor = KineticOnSurface,
                unfocusedTextColor = KineticOnSurface,
                cursorColor = KineticPrimary
            )
        )
    }
}
