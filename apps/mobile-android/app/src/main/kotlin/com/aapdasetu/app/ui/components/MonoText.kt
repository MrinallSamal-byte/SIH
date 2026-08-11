package com.aapdasetu.app.ui.components

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import com.aapdasetu.app.ui.theme.AapdaSetuType
import com.aapdasetu.app.ui.theme.KineticMutedText

/** Uppercase, letter-spaced mono label - status chips, nav labels, button text. */
@Composable
fun LabelCapsText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = LocalContentColor.current,
    textAlign: TextAlign? = null
) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        style = AapdaSetuType.labelCaps,
        color = color,
        textAlign = textAlign
    )
}

/** Technical readout text - coordinates, IDs, timestamps. */
@Composable
fun DataMonoText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = KineticMutedText,
    textAlign: TextAlign? = null
) {
    Text(
        text = text,
        modifier = modifier,
        style = AapdaSetuType.dataMono,
        color = color,
        textAlign = textAlign
    )
}
