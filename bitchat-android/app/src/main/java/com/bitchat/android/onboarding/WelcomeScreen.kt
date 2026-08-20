package com.bitchat.android.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.WifiTethering
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bitchat.android.R
import com.bitchat.android.ui.theme.BitchatFontFamily

/**
 * Welcome screen shown to first-time users to explain the mesh network concept
 */
@Composable
fun WelcomeScreen(
    modifier: Modifier = Modifier,
    onContinue: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val scrollState = rememberScrollState()

    Box(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
                .padding(bottom = 88.dp)
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(64.dp))

            // App Icon / Logo placeholder
            Surface(
                modifier = Modifier.size(100.dp),
                color = colorScheme.primaryContainer,
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Filled.WifiTethering,
                        contentDescription = null,
                        modifier = Modifier.size(56.dp),
                        tint = colorScheme.onPrimaryContainer
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Welcome to " + stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontFamily = BitchatFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 32.sp
                ),
                textAlign = TextAlign.Center,
                color = colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Secure, serverless messaging powered by you and the people around you.",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = colorScheme.onBackground.copy(alpha = 0.7f),
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Feature Highlights
            WelcomeFeatureItem(
                icon = Icons.Filled.Group,
                title = "Direct Mesh Network",
                description = "Connect directly with nearby users via Bluetooth and Wi-Fi. No internet required."
            )

            Spacer(modifier = Modifier.height(24.dp))

            WelcomeFeatureItem(
                icon = Icons.Filled.Chat,
                title = "Private & Anonymous",
                description = "No phone numbers, no accounts, and no data tracking. Your identity is ephemeral."
            )

            Spacer(modifier = Modifier.height(24.dp))

            WelcomeFeatureItem(
                icon = Icons.Filled.WifiTethering,
                title = "Relay & Extend",
                description = "Every device helps extend the network range by relaying messages to others."
            )

            Spacer(modifier = Modifier.height(32.dp))
        }

        // Fixed button at bottom
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = colorScheme.surface,
            shadowElevation = 8.dp
        ) {
            Button(
                onClick = onContinue,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = colorScheme.primary
                )
            ) {
                Text(
                    text = "Get Started",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontFamily = BitchatFontFamily,
                        fontWeight = FontWeight.Bold
                    ),
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun WelcomeFeatureItem(
    icon: ImageVector,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
            )
        }
    }
}
