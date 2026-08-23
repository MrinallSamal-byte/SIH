package com.bitchat.android.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

object OnboardingProgressSteps {
    const val TOTAL_STEPS = 7
    const val STEP_WELCOME = 1
    const val STEP_PERMISSION_EXPLANATION = 2
    const val STEP_BACKGROUND_LOCATION = 3
    const val STEP_BLUETOOTH_CHECK = 4
    const val STEP_LOCATION_CHECK = 5
    const val STEP_BATTERY_OPTIMIZATION = 6
    const val STEP_INITIALIZING = 7
}

@Composable
fun OnboardingProgress(
    currentStep: Int,
    totalSteps: Int,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Step $currentStep of $totalSteps",
            style = MaterialTheme.typography.labelMedium.copy(
                fontWeight = FontWeight.Medium
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            repeat(totalSteps) { index ->
                val reached = index < currentStep
                Box(
                    modifier = Modifier
                        .size(width = if (reached) 20.dp else 8.dp, height = 8.dp)
                        .background(
                            color = if (reached) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f)
                            },
                            shape = CircleShape
                        )
                )
            }
        }
    }
}
