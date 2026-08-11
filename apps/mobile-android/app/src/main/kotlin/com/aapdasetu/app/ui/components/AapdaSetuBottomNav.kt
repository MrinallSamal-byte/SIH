package com.aapdasetu.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.aapdasetu.app.ui.theme.KineticBackground
import com.aapdasetu.app.ui.theme.KineticMutedText
import com.aapdasetu.app.ui.theme.KineticOutlineVariant
import com.aapdasetu.app.ui.theme.KineticPrimary

enum class BottomNavTab(val label: String, val icon: ImageVector) {
    ALERTS("Alerts", Icons.Outlined.Warning),
    MAP("Map", Icons.Outlined.Explore),
    MESH("Mesh", Icons.Outlined.Hub),
    PROFILE("Profile", Icons.Outlined.Person)
}

/** The persistent 4-tab bottom nav: Alerts / Map / Mesh / Profile. */
@Composable
fun AapdaSetuBottomNav(
    selected: BottomNavTab,
    onSelect: (BottomNavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.background(KineticBackground)) {
        HorizontalDivider(color = KineticOutlineVariant.copy(alpha = 0.4f), thickness = 1.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            BottomNavTab.entries.forEach { tab ->
                val isSelected = tab == selected
                val tint = if (isSelected) KineticPrimary else KineticMutedText
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onSelect(tab) }
                        .padding(8.dp)
                ) {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.label,
                        tint = tint,
                        modifier = Modifier.size(22.dp)
                    )
                    LabelCapsText(text = tab.label, color = tint)
                }
            }
        }
    }
}
