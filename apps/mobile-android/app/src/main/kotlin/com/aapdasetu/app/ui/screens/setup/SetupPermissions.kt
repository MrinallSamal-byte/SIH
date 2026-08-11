package com.aapdasetu.app.ui.screens.setup

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BatteryStd
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

/**
 * The 3 permission items on the Setup screen, mapped to real Android
 * permissions. Kept as an enum (not raw permission strings) so the UI layer
 * never has to think about API-level branching - that lives entirely here.
 */
enum class SetupPermissionItem(
    val title: String,
    val description: String,
    val metaPrimary: String,
    val metaSecondary: String,
    val icon: ImageVector
) {
    MESH(
        title = "P2P Mesh Network",
        description = "Enables Bluetooth Low Energy & WiFi-Direct to form a decentralized data chain without cellular towers.",
        metaPrimary = "LATENCY: -- MS",
        metaSecondary = "PROTOCOL: BLE 5.0+",
        icon = Icons.Outlined.Hub
    ),
    LOCATION(
        title = "Location Services",
        description = "High-precision GNSS tracking for pinpoint SAR (Search and Rescue) coordination and breadcrumb mapping.",
        metaPrimary = "ACCURACY: < 5M",
        metaSecondary = "MODE: ALWAYS_ON",
        icon = Icons.Outlined.LocationOn
    ),
    BATTERY(
        title = "Battery Optimization",
        description = "Prevents OS from hibernating the mesh engine. Necessary for continuous beaconing during standby.",
        metaPrimary = "DAEMON: ACTIVE_BG",
        metaSecondary = "",
        icon = Icons.Outlined.BatteryStd
    )
}

/** Live grant-state for the 3 setup permissions, plus the real request flow for each. */
class SetupPermissionState internal constructor(private val context: Context) {
    var granted: Map<SetupPermissionItem, Boolean> by mutableStateOf(snapshot(context))
        private set

    private var requestBle: () -> Unit = {}
    private var requestLocation: () -> Unit = {}
    private var requestBattery: () -> Unit = {}

    internal fun bind(onRequestBle: () -> Unit, onRequestLocation: () -> Unit, onRequestBattery: () -> Unit) {
        requestBle = onRequestBle
        requestLocation = onRequestLocation
        requestBattery = onRequestBattery
    }

    fun refresh() {
        granted = snapshot(context)
    }

    fun request(item: SetupPermissionItem) {
        when (item) {
            SetupPermissionItem.MESH -> {
                // API 31+: real runtime BLE permissions. Below that, BLE
                // scanning is gated by ACCESS_FINE_LOCATION instead, which
                // the Location card already requests.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) requestBle() else requestLocation()
            }
            SetupPermissionItem.LOCATION -> requestLocation()
            SetupPermissionItem.BATTERY -> requestBattery()
        }
    }

    val grantedCount: Int get() = granted.values.count { it }
    val allGranted: Boolean get() = granted.values.all { it }
}

private fun snapshot(context: Context): Map<SetupPermissionItem, Boolean> {
    fun has(permission: String) =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    val meshGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        has(Manifest.permission.BLUETOOTH_SCAN) &&
            has(Manifest.permission.BLUETOOTH_ADVERTISE) &&
            has(Manifest.permission.BLUETOOTH_CONNECT)
    } else {
        has(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    val locationGranted = has(Manifest.permission.ACCESS_FINE_LOCATION)

    val batteryGranted = (context.getSystemService(Context.POWER_SERVICE) as PowerManager)
        .isIgnoringBatteryOptimizations(context.packageName)

    return mapOf(
        SetupPermissionItem.MESH to meshGranted,
        SetupPermissionItem.LOCATION to locationGranted,
        SetupPermissionItem.BATTERY to batteryGranted
    )
}

@Composable
fun rememberSetupPermissionState(): SetupPermissionState {
    val context = LocalContext.current
    val state = remember { SetupPermissionState(context) }

    val bleLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { state.refresh() }

    val locationLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { state.refresh() }

    // Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS doesn't reliably
    // report success via its result code across OEMs, so this always
    // re-checks PowerManager directly on return rather than trusting the result.
    val batteryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { state.refresh() }

    state.bind(
        onRequestBle = {
            bleLauncher.launch(
                arrayOf(
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.BLUETOOTH_ADVERTISE,
                    Manifest.permission.BLUETOOTH_CONNECT
                )
            )
        },
        onRequestLocation = { locationLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) },
        onRequestBattery = {
            val intent = Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${context.packageName}")
            )
            batteryLauncher.launch(intent)
        }
    )

    // Re-check on resume too - covers the case where the user grants the
    // permission from Settings and comes back via the back gesture rather
    // than the launcher's own result callback.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) state.refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    return state
}
