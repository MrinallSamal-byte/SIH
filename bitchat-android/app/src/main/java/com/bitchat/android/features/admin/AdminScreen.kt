package com.bitchat.android.features.admin

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.text.SimpleDateFormat
import java.util.*

/**
 * Admin tab options.
 */
private enum class AdminTab(val label: String, val icon: ImageVector) {
    BLOCKED_USERS("Blocked", Icons.Default.Block),
    REPORTS("Reports", Icons.Default.Flag),
    CHANNELS("Channels", Icons.Outlined.Forum),
    CONTENT("Content", Icons.Default.DeleteSweep)
}

/**
 * Full admin dashboard as a bottom sheet.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminScreen(
    onDismiss: () -> Unit,
    onDeleteUserContent: (String) -> Unit,
    onFormatChannel: (String) -> Unit,
    channelNames: List<String>
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        sheetMaxWidth = androidx.compose.ui.unit.Dp.Unspecified,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        AdminDashboardContent(
            onDismiss = onDismiss,
            onDeleteUserContent = onDeleteUserContent,
            onFormatChannel = onFormatChannel,
            channelNames = channelNames
        )
    }
}

/**
 * Admin Dashboard content view (embeddable in screen or sheet).
 */
@Composable
fun AdminDashboardContent(
    onDismiss: (() -> Unit)? = null,
    onDeleteUserContent: (String) -> Unit,
    onFormatChannel: (String) -> Unit,
    channelNames: List<String>,
    modifier: Modifier = Modifier
) {
    val blockedUsers by AdminManager.blockedUsers.collectAsStateWithLifecycle()
    val blockedChannels by AdminManager.blockedChannels.collectAsStateWithLifecycle()
    val reports by AdminManager.reports.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableStateOf(AdminTab.BLOCKED_USERS) }
    var showUnblockConfirm by remember { mutableStateOf<String?>(null) }
    var showBlockUserDialog by remember { mutableStateOf(false) }
    var showFormatConfirm by remember { mutableStateOf<String?>(null) }
    var showDeleteContentDialog by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.AdminPanelSettings,
                contentDescription = null,
                tint = Color(0xFF6366F1),
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Admin Panel",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.weight(1f))
            if (onDismiss != null) {
                IconButton(onClick = {
                    AdminManager.disableAdmin()
                    onDismiss()
                }) {
                    Icon(
                        imageVector = Icons.Default.LockOpen,
                        contentDescription = "Lock Admin",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Tabs
        ScrollableTabRow(
            selectedTabIndex = AdminTab.entries.indexOf(selectedTab),
            containerColor = Color.Transparent,
            edgePadding = 16.dp,
            divider = {},
            indicator = {}
        ) {
            AdminTab.entries.forEach { tab ->
                val isSelected = selectedTab == tab
                val badgeCount = when (tab) {
                    AdminTab.BLOCKED_USERS -> blockedUsers.size
                    AdminTab.REPORTS -> reports.count { it.status == ReportStatus.PENDING }
                    AdminTab.CHANNELS -> blockedChannels.size
                    AdminTab.CONTENT -> 0
                }

                Tab(
                    selected = isSelected,
                    onClick = { selectedTab = tab },
                    modifier = Modifier.padding(horizontal = 4.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) Color(0xFF6366F1).copy(alpha = 0.15f)
                            else Color.Transparent,
                        modifier = Modifier.padding(vertical = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = if (isSelected) Color(0xFF6366F1)
                                    else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = tab.label,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) Color(0xFF6366F1)
                                    else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 14.sp
                            )
                            if (badgeCount > 0) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Badge(
                                    containerColor = if (tab == AdminTab.REPORTS) Color(0xFFEF4444)
                                        else Color(0xFF6366F1)
                                    ) {
                                    Text("$badgeCount", fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        HorizontalDivider(
            modifier = Modifier.padding(top = 4.dp),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
        )

        // Tab Content
        when (selectedTab) {
            AdminTab.BLOCKED_USERS -> BlockedUsersTab(
                blockedUsers = blockedUsers,
                onUnblock = { showUnblockConfirm = it }
            )
            AdminTab.REPORTS -> ReportsTab(
                reports = reports,
                onActOnReport = { reportID, action -> AdminManager.actOnReport(reportID, action) },
                onDismissReport = { AdminManager.dismissReport(it) }
            )
            AdminTab.CHANNELS -> ChannelsTab(
                blockedChannels = blockedChannels,
                allChannels = channelNames,
                onBlockChannel = { AdminManager.blockChannel(it) },
                onUnblockChannel = { AdminManager.unblockChannel(it) },
                onFormatChannel = { showFormatConfirm = it }
            )
            AdminTab.CONTENT -> ContentTab(
                onDeleteUserContent = { showDeleteContentDialog = it },
                onFormatChannel = { showFormatConfirm = it },
                channelNames = channelNames
            )
        }
    }

    // Unblock confirmation
    showUnblockConfirm?.let { peerID ->
        AlertDialog(
            onDismissRequest = { showUnblockConfirm = null },
            title = { Text("Unblock User") },
            text = { Text("Are you sure you want to unblock this user? They will be able to send messages again.") },
            confirmButton = {
                TextButton(onClick = {
                    AdminManager.unblockUser(peerID)
                    showUnblockConfirm = null
                }) {
                    Text("Unblock", color = Color(0xFF6366F1))
                }
            },
            dismissButton = {
                TextButton(onClick = { showUnblockConfirm = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Format channel confirmation
    showFormatConfirm?.let { channelName ->
        AlertDialog(
            onDismissRequest = { showFormatConfirm = null },
            title = { Text("Format Channel") },
            text = { Text("This will delete ALL messages in #${channelName.removePrefix("#")}. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    onFormatChannel(channelName)
                    showFormatConfirm = null
                }) {
                    Text("Format", color = Color(0xFFEF4444))
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormatConfirm = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete user content confirmation
    showDeleteContentDialog?.let { peerID ->
        AlertDialog(
            onDismissRequest = { showDeleteContentDialog = null },
            title = { Text("Delete All Content") },
            text = { Text("This will delete ALL messages from this user. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    onDeleteUserContent(peerID)
                    showDeleteContentDialog = null
                }) {
                    Text("Delete All", color = Color(0xFFEF4444))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteContentDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun BlockedUsersTab(
    blockedUsers: List<BlockedUser>,
    onUnblock: (String) -> Unit
) {
    if (blockedUsers.isEmpty()) {
        EmptyState(
            icon = Icons.Default.CheckCircle,
            title = "No Blocked Users",
            subtitle = "Users you block will appear here"
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(blockedUsers, key = { it.peerID }) { user ->
                BlockedUserCard(user = user, onUnblock = { onUnblock(user.peerID) })
            }
        }
    }
}

@Composable
private fun BlockedUserCard(user: BlockedUser, onUnblock: () -> Unit) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()) }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        tonalElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEF4444).copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Block,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user.nickname.ifEmpty { user.peerID.take(8) },
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (user.reason.isNotEmpty()) {
                    Text(
                        text = user.reason,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Text(
                    text = "Blocked ${dateFormat.format(Date(user.blockedAt))}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            FilledTonalButton(
                onClick = onUnblock,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.filledTonalButtonColors(
                    containerColor = Color(0xFF6366F1).copy(alpha = 0.12f)
                ),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text("Unblock", fontSize = 13.sp, color = Color(0xFF6366F1))
            }
        }
    }
}

@Composable
private fun ReportsTab(
    reports: List<UserReport>,
    onActOnReport: (String, ReportAction) -> Unit,
    onDismissReport: (String) -> Unit
) {
    val pendingReports = reports.filter { it.status == ReportStatus.PENDING }
    val resolvedReports = reports.filter { it.status != ReportStatus.PENDING }

    if (reports.isEmpty()) {
        EmptyState(
            icon = Icons.Default.Flag,
            title = "No Reports",
            subtitle = "User reports from the mesh will appear here"
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (pendingReports.isNotEmpty()) {
                item {
                    Text(
                        text = "Pending (${pendingReports.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color(0xFFEF4444),
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
                items(pendingReports, key = { it.id }) { report ->
                    ReportCard(
                        report = report,
                        reportCount = AdminManager.getReportCountForUser(report.reportedPeerID),
                        onWarn = { onActOnReport(report.id, ReportAction.WARN) },
                        onBlock = { onActOnReport(report.id, ReportAction.BLOCK) },
                        onDismiss = { onDismissReport(report.id) }
                    )
                }
            }

            if (resolvedReports.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Resolved (${resolvedReports.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
                items(resolvedReports, key = { it.id }) { report ->
                    ReportCard(
                        report = report,
                        reportCount = AdminManager.getReportCountForUser(report.reportedPeerID),
                        onWarn = null,
                        onBlock = null,
                        onDismiss = null
                    )
                }
            }
        }
    }
}

@Composable
private fun ReportCard(
    report: UserReport,
    reportCount: Int,
    onWarn: (() -> Unit)? = null,
    onBlock: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null
) {
    val dateFormat = remember { SimpleDateFormat("MMM dd HH:mm", Locale.getDefault()) }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        tonalElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFCA5A5).copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Flag,
                        contentDescription = null,
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = report.reportedNickname.ifEmpty { report.reportedPeerID.take(8) },
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp
                    )
                    Text(
                        text = "Reported by ${report.reporterNickname.ifEmpty { report.reporterPeerID.take(8) }}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (reportCount > 1) {
                    Badge(containerColor = Color(0xFFEF4444)) {
                        Text("$reportCount reports", fontSize = 10.sp)
                    }
                }
            }

            report.reason?.let { reason ->
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerLow
                ) {
                    Text(
                        text = "\"$reason\"",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = dateFormat.format(Date(report.timestamp)),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )

                if (report.status != ReportStatus.PENDING) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = when (report.status) {
                            ReportStatus.ACTED_UPON -> Color(0xFFEF4444).copy(alpha = 0.12f)
                            ReportStatus.REVIEWED -> Color(0xFFF59E0B).copy(alpha = 0.12f)
                            ReportStatus.DISMISSED, ReportStatus.PENDING -> MaterialTheme.colorScheme.surfaceContainerLow
                        }
                    ) {
                        Text(
                            text = report.status.name.replace("_", " "),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = when (report.status) {
                                ReportStatus.ACTED_UPON -> Color(0xFFEF4444)
                                ReportStatus.REVIEWED -> Color(0xFFF59E0B)
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                if (onBlock != null && onDismiss != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(
                            onClick = onDismiss,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                            )
                        ) {
                            Text("Dismiss", fontSize = 12.sp)
                        }
                        if (onWarn != null) {
                            FilledTonalButton(
                                onClick = onWarn,
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = Color(0xFFF59E0B).copy(alpha = 0.15f),
                                    contentColor = Color(0xFFD97706)
                                )
                            ) {
                                Text("Warn", fontSize = 12.sp)
                            }
                        }
                        Button(
                            onClick = onBlock,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFEF4444)
                            )
                        ) {
                            Text("Block", fontSize = 12.sp, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelsTab(
    blockedChannels: Set<String>,
    allChannels: List<String>,
    onBlockChannel: (String) -> Unit,
    onUnblockChannel: (String) -> Unit,
    onFormatChannel: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (blockedChannels.isNotEmpty()) {
            item {
                Text(
                    text = "Blocked Channels",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFFEF4444),
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
            items(blockedChannels.toList()) { channel ->
                ChannelActionCard(
                    channelName = channel,
                    isBlocked = true,
                    onToggleBlock = { onUnblockChannel(channel) },
                    onFormat = { onFormatChannel(channel) }
                )
            }
        }

        val unblockedChannels = allChannels.filter { it !in blockedChannels }
        if (unblockedChannels.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Active Channels",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
            items(unblockedChannels) { channel ->
                ChannelActionCard(
                    channelName = channel,
                    isBlocked = false,
                    onToggleBlock = { onBlockChannel(channel) },
                    onFormat = { onFormatChannel(channel) }
                )
            }
        }

        if (blockedChannels.isEmpty() && allChannels.isEmpty()) {
            item {
                EmptyState(
                    icon = Icons.Outlined.Forum,
                    title = "No Channels",
                    subtitle = "Channels will appear here when created"
                )
            }
        }
    }
}

@Composable
private fun ChannelActionCard(
    channelName: String,
    isBlocked: Boolean,
    onToggleBlock: () -> Unit,
    onFormat: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        tonalElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (isBlocked) Icons.Default.Block else Icons.Outlined.Tag,
                contentDescription = null,
                tint = if (isBlocked) Color(0xFFEF4444)
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "#${channelName.removePrefix("#")}",
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onFormat, modifier = Modifier.size(36.dp)) {
                Icon(
                    imageVector = Icons.Default.DeleteSweep,
                    contentDescription = "Format",
                    tint = Color(0xFFF59E0B),
                    modifier = Modifier.size(18.dp)
                )
            }
            IconButton(onClick = onToggleBlock, modifier = Modifier.size(36.dp)) {
                Icon(
                    imageVector = if (isBlocked) Icons.Default.LockOpen else Icons.Default.Block,
                    contentDescription = if (isBlocked) "Unblock" else "Block",
                    tint = if (isBlocked) Color(0xFF6366F1) else Color(0xFFEF4444),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun ContentTab(
    onDeleteUserContent: (String) -> Unit,
    onFormatChannel: (String) -> Unit,
    channelNames: List<String>
) {
    var targetPeerID by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Delete Content by User",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = targetPeerID,
                onValueChange = { targetPeerID = it },
                label = { Text("Peer ID or Nickname") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = {
                    if (targetPeerID.isNotBlank()) {
                        onDeleteUserContent(targetPeerID.trim())
                        targetPeerID = ""
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                enabled = targetPeerID.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.DeleteForever, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Delete All Content from User")
            }
        }

        if (channelNames.isNotEmpty()) {
            item {
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                Text(
                    text = "Format Channel (Clear All Messages)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
            items(channelNames) { channel ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onFormatChannel(channel) }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.DeleteSweep,
                            contentDescription = null,
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Format #${channel.removePrefix("#")}",
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyState(
    icon: ImageVector,
    title: String,
    subtitle: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 60.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = subtitle,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
    }
}
