package com.bitchat.android.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.outlined.Contacts
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.bitchat.android.ui.theme.LocalBitchatPalette
import com.bitchat.android.ui.theme.colorForPeer
import com.bitchat.android.ui.PeerIdentity

/**
 * Discord-style Channel & Community Navigation Drawer
 */
@Composable
fun DiscordChannelDrawer(
    viewModel: ChatViewModel,
    onCloseDrawer: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hubs by viewModel.discordHubs.collectAsState()
    val categories by viewModel.discordCategories.collectAsState()
    val channels by viewModel.discordChannels.collectAsState()
    val selectedHubId by viewModel.selectedDiscordHubId.collectAsState()
    val collapsedCategories by viewModel.collapsedDiscordCategories.collectAsState()
    val currentChannel by viewModel.currentChannel.collectAsState()
    val unreadCounts by viewModel.unreadChannelMessages.collectAsState()
    val privateChats by viewModel.privateChats.collectAsState()
    val unreadPrivateCounts by viewModel.unreadPrivateMessageCounts.collectAsState()
    val peerNicknames by viewModel.peerNicknames.collectAsState()
    val activePeers by viewModel.connectedPeers.collectAsState()
    val myNickname by viewModel.nickname.collectAsState()
    val phoneContacts by viewModel.phoneContacts.collectAsState()
    val hasContactsPermission by viewModel.hasContactsPermission.collectAsState()
    val myPeerID = viewModel.myPeerID

    var showCreateChannelDialog by remember { mutableStateOf(false) }
    var createChannelTargetCategory by remember { mutableStateOf<String?>(null) }
    var unlockChannelTarget by remember { mutableStateOf<DiscordChannel?>(null) }

    val palette = LocalBitchatPalette.current
    val currentHub = hubs.firstOrNull { it.id == selectedHubId } ?: hubs.firstOrNull()

    Row(
        modifier = modifier
            .fillMaxHeight()
            .width(320.dp)
            .background(Color(0xFF1E1F22)) // Discord dark sidebar background
    ) {
        // -------------------------------------------------------------
        // LEFT RAIL: Discord Server / Hub Icons
        // -------------------------------------------------------------
        Column(
            modifier = Modifier
                .width(68.dp)
                .fillMaxHeight()
                .background(Color(0xFF141517))
                .padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            hubs.forEach { hub ->
                val isSelected = hub.id == selectedHubId
                val unreadCountForHub = if (hub.id == ChannelManager.HUB_DIRECT_MESSAGES) {
                    unreadPrivateCounts.values.sum()
                } else {
                    channels.filter { it.hubId == hub.id }.sumOf { unreadCounts[it.id] ?: 0 }
                }

                Box(
                    modifier = Modifier.size(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // Left indicator pill
                    if (isSelected) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .offset(x = (-10).dp)
                                .width(4.dp)
                                .height(32.dp)
                                .clip(RoundedCornerShape(topEnd = 4.dp, bottomEnd = 4.dp))
                                .background(if (hub.isEmergency) Color(0xFFFF453A) else Color(0xFF5865F2))
                        )
                    }

                    // Hub Icon Button
                    Surface(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(if (isSelected) 16.dp else 24.dp))
                            .clickable { viewModel.selectDiscordHub(hub.id) },
                        color = when {
                            isSelected && hub.isEmergency -> Color(0xFFE03E3E)
                            isSelected -> Color(0xFF5865F2) // Discord Blurple
                            hub.isEmergency -> Color(0xFF3B1F20)
                            else -> Color(0xFF2B2D31)
                        }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = hub.icon,
                                fontSize = 22.sp
                            )
                        }
                    }

                    // Unread badge pill
                    if (unreadCountForHub > 0) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .offset(x = 2.dp, y = 2.dp),
                            shape = CircleShape,
                            color = Color(0xFFFF453A)
                        ) {
                            Text(
                                text = if (unreadCountForHub > 99) "99+" else unreadCountForHub.toString(),
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Add Channel Quick Action Button
            Surface(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .clickable {
                        createChannelTargetCategory = null
                        showCreateChannelDialog = true
                    },
                color = Color(0xFF2B2D31)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Create Channel",
                        tint = Color(0xFF32D74B),
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }

        // -------------------------------------------------------------
        // MAIN DRAWER PANEL: Categories & Channels
        // -------------------------------------------------------------
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(Color(0xFF1E1F22))
        ) {
            // Header: Server Title & Mesh Peer Count
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                color = Color(0xFF1E1F22),
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = currentHub?.name ?: "Mesh Channels",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF2F3F5),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF32D74B))
                            )
                            Text(
                                text = "${activePeers.size} students connected via mesh",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF949BA4)
                            )
                        }
                    }
                }
            }

            HorizontalDivider(color = Color(0xFF2B2D31), thickness = 1.dp)

            // Category & Channel List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // If Hub is Direct Messages, display 1-on-1 private chats (WhatsApp style)
                if (selectedHubId == ChannelManager.HUB_DIRECT_MESSAGES) {
                    item {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    viewModel.showUnifiedContactSearch()
                                    onCloseDrawer()
                                },
                            color = Color(0xFF2B2D31)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Search,
                                    contentDescription = "Search",
                                    tint = Color(0xFF5865F2),
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Search contacts or channels…",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF949BA4),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    item {
                        Text(
                            text = "DIRECT MESSAGES (1:1 E2EE NOISE)",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF949BA4),
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                        )
                    }

                    if (privateChats.isNotEmpty()) {
                        items(privateChats.keys.toList()) { peerID ->
                            val nickname = peerNicknames[peerID] ?: peerID.take(8)
                            val isOnline = activePeers.contains(peerID)
                            val unreadCount = unreadPrivateCounts[peerID] ?: 0

                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        viewModel.showPrivateChatSheet(peerID)
                                        onCloseDrawer()
                                    },
                                color = Color.Transparent
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    // Avatar
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(colorForPeer(PeerIdentity.mesh(peerID), palette)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = nickname.take(1).uppercase(),
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = nickname,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(0xFFDBDEE1),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = if (isOnline) "🟢 Direct Mesh Link" else "⚪ Offline / Multi-Hop",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            color = Color(0xFF949BA4)
                                        )
                                    }

                                    if (unreadCount > 0) {
                                        Surface(
                                            shape = CircleShape,
                                            color = Color(0xFFFF453A)
                                        ) {
                                            Text(
                                                text = unreadCount.toString(),
                                                color = Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Available Classmates on Mesh (1-tap to start WhatsApp style private chat)
                    val otherPeers = activePeers.filter { !privateChats.containsKey(it) && it != myPeerID }
                    if (otherPeers.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "AVAILABLE STUDENTS ON MESH (${otherPeers.size})",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF32D74B),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                            )
                        }

                        items(otherPeers) { peerID ->
                            val nickname = peerNicknames[peerID] ?: peerID.take(8)

                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        viewModel.showPrivateChatSheet(peerID)
                                        onCloseDrawer()
                                    },
                                color = Color.Transparent
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(colorForPeer(PeerIdentity.mesh(peerID), palette)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = nickname.take(1).uppercase(),
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = nickname,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(0xFFDBDEE1),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = "🟢 Tap to start 1:1 E2EE chat",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            color = Color(0xFF32D74B)
                                        )
                                    }
                                }
                            }
                        }
                    } else if (privateChats.isEmpty() && phoneContacts.isEmpty()) {
                        item {
                            Text(
                                text = "Searching for nearby student devices over Bluetooth/Wi-Fi mesh...",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF949BA4),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                    }

                    // Phone Contacts Section
                    if (!hasContactsPermission) {
                        item {
                            Spacer(modifier = Modifier.height(10.dp))
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable {
                                        viewModel.showUnifiedContactSearch()
                                        onCloseDrawer()
                                    },
                                color = Color(0xFF1E222D),
                                border = BorderStroke(1.dp, Color(0xFF388AF6).copy(alpha = 0.4f))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Contacts,
                                        contentDescription = null,
                                        tint = Color(0xFF388AF6),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Sync Phone Contacts",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Text(
                                            text = "Find saved numbers on mesh",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            color = Color(0xFF949BA4)
                                        )
                                    }
                                    Icon(
                                        imageVector = Icons.Default.ChevronRight,
                                        contentDescription = null,
                                        tint = Color(0xFF388AF6),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    } else if (phoneContacts.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "SAVED PHONE CONTACTS (${phoneContacts.size})",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF5865F2),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                            )
                        }

                        items(phoneContacts.take(20)) { contact ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        viewModel.startPrivateChatWithPhoneContact(contact)
                                        onCloseDrawer()
                                    },
                                color = Color.Transparent
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF388AF6)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = contact.initial,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = contact.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(0xFFDBDEE1),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = contact.phoneNumber,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontSize = 10.sp,
                                            color = Color(0xFF949BA4)
                                        )
                                    }

                                    if (contact.isMeshAvailable) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF32D74B))
                                        )
                                    }
                                }
                            }
                        }

                        if (phoneContacts.size > 20) {
                            item {
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .clickable {
                                            viewModel.showUnifiedContactSearch()
                                            onCloseDrawer()
                                        },
                                    color = Color(0xFF2B2D31)
                                ) {
                                    Text(
                                        text = "View all ${phoneContacts.size} contacts…",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color(0xFF5865F2),
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                } else {
                    // Filter categories for the selected hub
                    val hubCategories = categories.filter { it.hubId == selectedHubId }

                    hubCategories.forEach { category ->
                        val isCollapsed = collapsedCategories.contains(category.id)
                        val categoryChannels = channels.filter { it.categoryId == category.id }

                        // Category Header
                        item(key = "cat_${category.id}") {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.toggleDiscordCategoryCollapse(category.id) }
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val rotation by animateFloatAsState(if (isCollapsed) 0f else 90f)
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = "Expand/Collapse",
                                    tint = Color(0xFF949BA4),
                                    modifier = Modifier
                                        .size(14.dp)
                                        .rotate(rotation)
                                )

                                Spacer(modifier = Modifier.width(4.dp))

                                Text(
                                    text = category.title,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = when (category.type) {
                                        ChannelCategoryType.EMERGENCY -> Color(0xFFFF6B6B)
                                        ChannelCategoryType.SECURE_SQUAD -> Color(0xFF5865F2)
                                        else -> Color(0xFF949BA4)
                                    },
                                    modifier = Modifier.weight(1f),
                                    letterSpacing = 0.5.sp
                                )

                                // + Create channel in this category
                                IconButton(
                                    onClick = {
                                        createChannelTargetCategory = category.id
                                        showCreateChannelDialog = true
                                    },
                                    modifier = Modifier.size(20.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Add,
                                        contentDescription = "Add Channel",
                                        tint = Color(0xFF949BA4),
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }

                        // Channels inside Category
                        if (!isCollapsed) {
                            items(categoryChannels, key = { it.id }) { channel ->
                                val isSelected = currentChannel == channel.id
                                val unreadCount = unreadCounts[channel.id] ?: 0

                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .clickable {
                                            if (channel.isEncrypted && !viewModel.hasChannelKey(channel.id)) {
                                                unlockChannelTarget = channel
                                            } else {
                                                viewModel.switchToChannel(channel.id)
                                                onCloseDrawer()
                                            }
                                        },
                                    color = if (isSelected) Color(0xFF35373C) else Color.Transparent
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 8.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        // Channel Icon (# or 🔒 or 🚨 or 🛡️)
                                        val isAdminChan = channel.id.equals("#admin", ignoreCase = true) || channel.name.equals("admin", ignoreCase = true)
                                        if (isAdminChan) {
                                            Icon(
                                                imageVector = Icons.Default.AdminPanelSettings,
                                                contentDescription = "Admin Channel",
                                                tint = if (isSelected) Color(0xFF818CF8) else Color(0xFF6366F1),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        } else if (channel.isEmergency) {
                                            Text(text = "🚨", fontSize = 14.sp)
                                        } else if (channel.isEncrypted) {
                                            Icon(
                                                imageVector = Icons.Default.Lock,
                                                contentDescription = "Encrypted E2EE",
                                                tint = if (isSelected) Color(0xFF32D74B) else Color(0xFF949BA4),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        } else {
                                            Icon(
                                                imageVector = Icons.Default.Tag,
                                                contentDescription = "Channel",
                                                tint = if (isSelected) Color(0xFFF2F3F5) else Color(0xFF949BA4),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }

                                        Text(
                                            text = channel.name,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = if (isSelected || unreadCount > 0) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) Color(0xFFF2F3F5) else if (unreadCount > 0) Color.White else Color(0xFF949BA4),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )

                                        // Admin or E2EE Badge
                                        if (isAdminChan) {
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = Color(0xFF6366F1).copy(alpha = 0.2f)
                                            ) {
                                                Text(
                                                    text = "ADMIN",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF818CF8),
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                )
                                            }
                                        } else if (channel.isEncrypted) {
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = Color(0xFF1E2F23)
                                            ) {
                                                Text(
                                                    text = "E2EE",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF32D74B),
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                )
                                            }
                                        }

                                        // Unread Counter
                                        if (unreadCount > 0) {
                                            Surface(
                                                shape = CircleShape,
                                                color = Color(0xFFFF453A)
                                            ) {
                                                Text(
                                                    text = unreadCount.toString(),
                                                    color = Color.White,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            HorizontalDivider(color = Color(0xFF2B2D31), thickness = 1.dp)

            // User Profile / Node Footer Bar
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                color = Color(0xFF111214)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Local Node Avatar
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF32D74B)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = myNickname.take(1).uppercase(),
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = myNickname.ifBlank { "Student Node" },
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF2F3F5),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Student #${myPeerID.take(6)} • Campus Mesh Active",
                            style = MaterialTheme.typography.labelSmall,
                            fontSize = 10.sp,
                            color = Color(0xFF32D74B)
                        )
                    }
                }
            }
        }
    }

    // -----------------------------------------------------------------
    // CREATE CHANNEL MODAL DIALOG
    // -----------------------------------------------------------------
    if (showCreateChannelDialog) {
        CreateChannelDialog(
            categories = categories.filter { it.hubId == selectedHubId },
            defaultCategoryId = createChannelTargetCategory,
            selectedHubId = selectedHubId,
            onDismiss = { showCreateChannelDialog = false },
            onCreate = { name, topic, categoryId, isEncrypted, password ->
                viewModel.createDiscordChannel(
                    name = name,
                    topic = topic,
                    categoryId = categoryId,
                    hubId = selectedHubId,
                    isEncrypted = isEncrypted,
                    password = password
                )
                showCreateChannelDialog = false
                onCloseDrawer()
            }
        )
    }

    // -----------------------------------------------------------------
    // Unlock Protected / Encrypted Channel Dialog
    // -----------------------------------------------------------------
    unlockChannelTarget?.let { channel ->
        UnlockChannelDialog(
            channel = channel,
            onDismiss = { unlockChannelTarget = null },
            onUnlock = { password ->
                val success = viewModel.joinChannel(channel.id, password)
                if (success) {
                    unlockChannelTarget = null
                    onCloseDrawer()
                }
                success
            }
        )
    }
}

/**
 * Modal dialog for creating Discord-style channel with optional E2EE encryption
 */
@Composable
private fun CreateChannelDialog(
    categories: List<DiscordCategory>,
    defaultCategoryId: String?,
    selectedHubId: String,
    onDismiss: () -> Unit,
    onCreate: (name: String, topic: String, categoryId: String, isEncrypted: Boolean, password: String?) -> Unit
) {
    var channelName by remember { mutableStateOf("") }
    var channelTopic by remember { mutableStateOf("") }
    var selectedCatId by remember {
        mutableStateOf(defaultCategoryId ?: categories.firstOrNull()?.id ?: ChannelManager.CAT_CAMPUS_BROADCAST)
    }
    var isEncrypted by remember { mutableStateOf(false) }
    var channelPassword by remember { mutableStateOf("") }
    var errorText by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = Color(0xFF313338),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "Create Channel",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                Text(
                    text = "in ${categories.firstOrNull { it.id == selectedCatId }?.title ?: "Channels"}",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFF949BA4)
                )

                // Channel Name Field
                OutlinedTextField(
                    value = channelName,
                    onValueChange = { 
                        channelName = it.replace(" ", "-").lowercase()
                        errorText = null
                    },
                    label = { Text("Channel Name") },
                    placeholder = { Text("e.g. cse-study-group") },
                    leadingIcon = { Icon(Icons.Default.Tag, contentDescription = null, tint = Color(0xFF949BA4)) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF5865F2),
                        unfocusedBorderColor = Color(0xFF4E5058)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Channel Topic Field
                OutlinedTextField(
                    value = channelTopic,
                    onValueChange = { channelTopic = it },
                    label = { Text("Channel Topic / Purpose") },
                    placeholder = { Text("What is this channel for?") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF5865F2),
                        unfocusedBorderColor = Color(0xFF4E5058)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // E2EE Encryption Switch
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF2B2D31))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = Color(0xFF32D74B),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "End-to-End Encrypted (E2EE)",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.White
                            )
                        }
                        Text(
                            text = "Intermediate relay phones cannot decrypt or read messages.",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF949BA4)
                        )
                    }

                    Switch(
                        checked = isEncrypted,
                        onCheckedChange = { isEncrypted = it }
                    )
                }

                // Password field if E2EE is enabled
                if (isEncrypted) {
                    OutlinedTextField(
                        value = channelPassword,
                        onValueChange = { 
                            channelPassword = it
                            errorText = null
                        },
                        label = { Text("Channel Secret Key / Passphrase") },
                        placeholder = { Text("Passphrase for group members") },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF32D74B),
                            unfocusedBorderColor = Color(0xFF4E5058)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                if (errorText != null) {
                    Text(
                        text = errorText!!,
                        color = Color(0xFFFF453A),
                        style = MaterialTheme.typography.labelSmall
                    )
                }

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = Color(0xFF949BA4))
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Button(
                        onClick = {
                            if (channelName.isBlank()) {
                                errorText = "Channel name cannot be empty"
                                return@Button
                            }
                            if (isEncrypted && channelPassword.isBlank()) {
                                errorText = "Password is required for E2EE channels"
                                return@Button
                            }
                            onCreate(
                                channelName.trim(),
                                channelTopic.trim(),
                                selectedCatId,
                                isEncrypted,
                                if (isEncrypted) channelPassword else null
                            )
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF5865F2)
                        )
                    ) {
                        Text("Create Channel", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/**
 * Modal dialog for unlocking a password-protected E2EE channel
 */
@Composable
private fun UnlockChannelDialog(
    channel: DiscordChannel,
    onDismiss: () -> Unit,
    onUnlock: (password: String) -> Boolean
) {
    var password by remember { mutableStateOf("") }
    var errorText by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = Color(0xFF313338),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = null,
                        tint = Color(0xFF32D74B),
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = "Unlock ${channel.id}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Text(
                    text = "This channel is End-to-End Encrypted (AES-256-GCM). Enter the channel passphrase to decrypt and participate.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF949BA4)
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { 
                        password = it
                        errorText = null
                    },
                    label = { Text("Channel Passphrase") },
                    placeholder = { Text("Enter secret key") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF32D74B),
                        unfocusedBorderColor = Color(0xFF4E5058)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorText != null) {
                    Text(
                        text = errorText!!,
                        color = Color(0xFFFF453A),
                        style = MaterialTheme.typography.labelSmall
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = Color(0xFF949BA4))
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Button(
                        onClick = {
                            if (password.isBlank()) {
                                errorText = "Password cannot be empty"
                                return@Button
                            }
                            val success = onUnlock(password)
                            if (!success) {
                                errorText = "Incorrect channel passphrase"
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF32D74B)
                        )
                    ) {
                        Text("Unlock Channel", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
