package com.aapdasetu.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.aapdasetu.app.navigation.AapdaSetuNavGraph
import com.aapdasetu.app.ui.theme.AapdaSetuTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AapdaSetuTheme {
                AapdaSetuNavGraph()
            }
        }
    }
}
