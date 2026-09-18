package com.bitchat.android.core.ui.component.button

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.bitchat.android.core.ui.icon.BitChatIcon
import com.bitchat.android.ui.rememberPressScale

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun BitChatBrandButton(
    onClick: () -> Unit,
    /** Long-press: requests a full data wipe. Deliberately unlabelled — hidden gesture. */
    onRequestEraseEverything: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.primary,
    iconSize: Dp = 22.dp,
) {
    val currentOnClick by rememberUpdatedState(onClick)
    val currentOnEraseRequested by rememberUpdatedState(onRequestEraseEverything)

    val interactionSource = remember { MutableInteractionSource() }
    val pressScale = rememberPressScale(interactionSource)

    // A plain Box rather than an IconButton: IconButton insists on drawing a ripple, which was the
    // only press background left in the header once every other control moved to scale-only
    // feedback.
    Box(
        modifier = modifier
            .clip(CircleShape)
            .combinedClickable(
                interactionSource = interactionSource,
                indication = null,
                onClickLabel = contentDescription,
                onClick = { currentOnClick() },
                onLongClick = { currentOnEraseRequested() }
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = BitChatIcon,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier
                .size(iconSize)
                .scale(pressScale),
        )
    }
}
