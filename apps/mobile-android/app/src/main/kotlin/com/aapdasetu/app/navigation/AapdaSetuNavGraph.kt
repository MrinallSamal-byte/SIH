package com.aapdasetu.app.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aapdasetu.app.ui.components.AapdaSetuBottomNav
import com.aapdasetu.app.ui.components.AapdaSetuTopBar
import com.aapdasetu.app.ui.components.BottomNavTab
import com.aapdasetu.app.ui.screens.landmark.ManualLandmarkEntryScreen
import com.aapdasetu.app.ui.screens.mesh.MeshRelayInboxScreen
import com.aapdasetu.app.ui.screens.setup.MissionCriticalSetupScreen
import com.aapdasetu.app.ui.screens.welcome.WelcomeScreen
import com.aapdasetu.app.ui.theme.AapdaSetuType
import com.aapdasetu.app.ui.theme.KineticBackground
import com.aapdasetu.app.ui.theme.KineticMutedText

private val bottomNavRoutes = setOf(Destinations.ALERTS, Destinations.MAP, Destinations.MESH, Destinations.PROFILE)

private fun routeToTab(route: String?): BottomNavTab = when (route) {
    Destinations.ALERTS -> BottomNavTab.ALERTS
    Destinations.MAP -> BottomNavTab.MAP
    Destinations.PROFILE -> BottomNavTab.PROFILE
    else -> BottomNavTab.MESH
}

private fun tabToRoute(tab: BottomNavTab): String = when (tab) {
    BottomNavTab.ALERTS -> Destinations.ALERTS
    BottomNavTab.MAP -> Destinations.MAP
    BottomNavTab.MESH -> Destinations.MESH
    BottomNavTab.PROFILE -> Destinations.PROFILE
}

/**
 * Flow confirmed by the Stitch reference prototype (aapdasetu_mesh_protocol):
 * Welcome -> Setup -> Mesh, with Mesh/Map/Alerts/Profile as bottom-nav peers.
 * Alerts and Profile have no Stitch screen yet, so they render a plain
 * placeholder rather than silently reusing another screen's content.
 */
@Composable
fun AapdaSetuNavGraph(navController: NavHostController = rememberNavController()) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    Scaffold(
        containerColor = KineticBackground,
        bottomBar = {
            if (currentRoute in bottomNavRoutes) {
                AapdaSetuBottomNav(
                    selected = routeToTab(currentRoute),
                    onSelect = { tab ->
                        navController.navigate(tabToRoute(tab)) {
                            popUpTo(Destinations.MESH) {
                                inclusive = false
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Destinations.WELCOME,
            modifier = Modifier.fillMaxSize()
        ) {
            composable(Destinations.WELCOME) {
                WelcomeScreen(
                    onGetStarted = {
                        navController.navigate(Destinations.SETUP) {
                            popUpTo(Destinations.WELCOME) { inclusive = true }
                        }
                    }
                )
            }
            composable(Destinations.SETUP) {
                MissionCriticalSetupScreen(
                    onEngage = {
                        navController.navigate(Destinations.MESH) {
                            popUpTo(Destinations.SETUP) { inclusive = true }
                        }
                    }
                )
            }
            composable(Destinations.MESH) {
                MeshRelayInboxScreen(contentPadding = innerPadding)
            }
            composable(Destinations.MAP) {
                ManualLandmarkEntryScreen(contentPadding = innerPadding)
            }
            composable(Destinations.ALERTS) {
                ComingSoonPlaceholder(contentPadding = innerPadding, label = "Alerts")
            }
            composable(Destinations.PROFILE) {
                ComingSoonPlaceholder(contentPadding = innerPadding, label = "Profile")
            }
        }
    }
}

@Composable
private fun ComingSoonPlaceholder(contentPadding: PaddingValues, label: String) {
    Column(modifier = Modifier.fillMaxSize().background(KineticBackground)) {
        AapdaSetuTopBar()
        Box(
            modifier = Modifier.fillMaxSize().padding(contentPadding),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "${label.uppercase()} - NOT YET DESIGNED",
                style = AapdaSetuType.dataMono,
                color = KineticMutedText
            )
        }
    }
}
