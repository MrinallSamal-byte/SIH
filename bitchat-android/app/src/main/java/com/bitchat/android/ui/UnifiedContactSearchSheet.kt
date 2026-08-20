package com.bitchat.android.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material.icons.outlined.Contacts
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.SearchOff
import androidx.compose.material.icons.outlined.Tag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.bitchat.android.R
import com.bitchat.android.contacts.PhoneContact
import com.bitchat.android.contacts.PhoneContactsManager
import com.bitchat.android.core.ui.component.sheet.BitchatBottomSheet
import com.bitchat.android.core.ui.component.sheet.BitchatSheetTitle
import com.bitchat.android.core.ui.component.sheet.BitchatSheetTopBar
import com.bitchat.android.ui.theme.BitchatFontFamily
import com.bitchat.android.ui.theme.LocalBitchatPalette
import com.bitchat.android.ui.theme.colorForPeer

private enum class SearchCategoryFilter {
    ALL,
    CONTACTS,
    CHANNELS,
    PEERS,
}

/**
 * Unified Search & Contact Picker BottomSheet
 *
 * Allows users to search across phone contacts (with contact numbers),
 * channels, and connected mesh peers to start 1:1 direct messages or switch channels.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UnifiedContactSearchSheet(
    isPresented: Boolean,
    viewModel: ChatViewModel,
    onDismiss: () -> Unit,
    onRequestContactsPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (!isPresented) return

    val colorScheme = MaterialTheme.colorScheme
    val palette = LocalBitchatPalette.current
    val focusManager = LocalFocusManager.current

    val phoneContacts by viewModel.phoneContacts.collectAsStateWithLifecycle()
    val hasContactsPermission by viewModel.hasContactsPermission.collectAsStateWithLifecycle()
    val isContactsLoading by viewModel.isContactsLoading.collectAsStateWithLifecycle()
    val connectedPeers by viewModel.connectedPeers.collectAsStateWithLifecycle()
    val peerNicknames by viewModel.peerNicknames.collectAsStateWithLifecycle()
    val channels by viewModel.discordChannels.collectAsStateWithLifecycle()
    val conversations by viewModel.conversations.collectAsStateWithLifecycle()
    val myPeerID = viewModel.myPeerID

    var searchQuery by rememberSaveable { mutableStateOf("") }
    var selectedFilter by rememberSaveable { mutableStateOf(SearchCategoryFilter.ALL) }

    // Filter Phone Contacts
    val filteredContacts = remember(phoneContacts, searchQuery) {
        if (searchQuery.isBlank()) phoneContacts else PhoneContactsManager.searchContacts(searchQuery, phoneContacts)
    }

    // Filter Channels
    val filteredChannels = remember(channels, searchQuery) {
        val q = searchQuery.trim().removePrefix("#").lowercase()
        if (q.isBlank()) channels else channels.filter {
            it.name.lowercase().contains(q) || it.topic.lowercase().contains(q)
        }
    }

    // Filter Mesh Peers
    val filteredPeers = remember(connectedPeers, peerNicknames, searchQuery) {
        val q = searchQuery.trim().lowercase()
        val otherPeers = connectedPeers.filter { it != myPeerID }
        if (q.isBlank()) otherPeers else otherPeers.filter { peerID ->
            val nick = peerNicknames[peerID]?.lowercase() ?: ""
            nick.contains(q) || peerID.lowercase().contains(q)
        }
    }

    // Filter Conversations
    val filteredConversations = remember(conversations, searchQuery) {
        val q = searchQuery.trim().lowercase()
        if (q.isBlank()) conversations else conversations.filter {
            it.displayName.lowercase().contains(q) || it.latestMessagePreview.lowercase().contains(q)
        }
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val listState = rememberLazyListState()

    val isScrolled by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 0 }
    }
    val topBarAlpha by animateFloatAsState(
        targetValue = if (isScrolled) 0.95f else 0f,
        label = "searchTopBarAlpha"
    )

    BitchatBottomSheet(
        modifier = modifier,
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Box(modifier = Modifier.fillMaxWidth().fillMaxHeight(0.92f)) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 72.dp, bottom = 36.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // -------------------------------------------------------------
                // SEARCH BAR
                // -------------------------------------------------------------
                item(key = "search_input") {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        placeholder = {
                            Text(
                                stringResource(R.string.search_all_hint),
                                fontFamily = BitchatFontFamily,
                                fontSize = 14.sp
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = "Search",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        },
                        trailingIcon = if (searchQuery.isNotEmpty()) {
                            {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Clear",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        } else null,
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                        )
                    )
                }

                // -------------------------------------------------------------
                // CATEGORY FILTER CHIPS
                // -------------------------------------------------------------
                item(key = "category_filters") {
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            FilterChip(
                                selected = selectedFilter == SearchCategoryFilter.ALL,
                                onClick = { selectedFilter = SearchCategoryFilter.ALL },
                                label = { Text("All") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                                )
                            )
                        }
                        item {
                            FilterChip(
                                selected = selectedFilter == SearchCategoryFilter.CONTACTS,
                                onClick = { selectedFilter = SearchCategoryFilter.CONTACTS },
                                label = {
                                    Text(
                                        if (hasContactsPermission && phoneContacts.isNotEmpty()) {
                                            "Contacts (${filteredContacts.size})"
                                        } else "Contacts"
                                    )
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Outlined.Contacts,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                                )
                            )
                        }
                        item {
                            FilterChip(
                                selected = selectedFilter == SearchCategoryFilter.PEERS,
                                onClick = { selectedFilter = SearchCategoryFilter.PEERS },
                                label = { Text("Mesh Peers (${filteredPeers.size})") },
                                leadingIcon = {
                                    Icon(
                                        Icons.Outlined.People,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                                )
                            )
                        }
                        item {
                            FilterChip(
                                selected = selectedFilter == SearchCategoryFilter.CHANNELS,
                                onClick = { selectedFilter = SearchCategoryFilter.CHANNELS },
                                label = { Text("Channels (${filteredChannels.size})") },
                                leadingIcon = {
                                    Icon(
                                        Icons.Outlined.Tag,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                                )
                            )
                        }
                    }
                }

                // -------------------------------------------------------------
                // CONTACTS PERMISSION PROMPT BANNER (if not granted)
                // -------------------------------------------------------------
                if (!hasContactsPermission && (selectedFilter == SearchCategoryFilter.ALL || selectedFilter == SearchCategoryFilter.CONTACTS)) {
                    item(key = "permission_banner") {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .clip(RoundedCornerShape(14.dp)),
                            color = Color(0xFF1E222D),
                            border = BorderStroke(1.dp, Color(0xFF388AF6).copy(alpha = 0.4f))
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF388AF6).copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Outlined.Contacts,
                                            contentDescription = null,
                                            tint = Color(0xFF388AF6),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = stringResource(R.string.contacts_permission_title),
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                        Text(
                                            text = stringResource(R.string.contacts_permission_description),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color(0xFF949BA4)
                                        )
                                    }
                                }

                                Button(
                                    onClick = onRequestContactsPermission,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF388AF6)
                                    )
                                ) {
                                    Icon(
                                        Icons.Outlined.Contacts,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = stringResource(R.string.grant_contacts_permission),
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }

                // Loading contacts indicator
                if (isContactsLoading) {
                    item(key = "loading_contacts_indicator") {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                stringResource(R.string.loading_contacts),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION: PHONE CONTACTS
                // -------------------------------------------------------------
                if (hasContactsPermission && (selectedFilter == SearchCategoryFilter.ALL || selectedFilter == SearchCategoryFilter.CONTACTS)) {
                    if (filteredContacts.isNotEmpty()) {
                        item(key = "phone_contacts_header") {
                            SectionHeader(
                                title = "${stringResource(R.string.search_contacts_section)} (${filteredContacts.size})",
                                icon = Icons.Outlined.Phone
                            )
                        }

                        items(
                            items = filteredContacts,
                            key = { "contact_${it.id}_${it.normalizedNumber}" }
                        ) { contact ->
                            PhoneContactRow(
                                contact = contact,
                                onStartChat = {
                                    viewModel.startPrivateChatWithPhoneContact(contact)
                                    onDismiss()
                                }
                            )
                        }
                    } else if (searchQuery.isNotBlank() && selectedFilter == SearchCategoryFilter.CONTACTS) {
                        item(key = "no_contacts_result") {
                            EmptySearchResultItem(message = stringResource(R.string.no_contacts_found))
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION: CONNECTED MESH PEERS
                // -------------------------------------------------------------
                if (selectedFilter == SearchCategoryFilter.ALL || selectedFilter == SearchCategoryFilter.PEERS) {
                    if (filteredPeers.isNotEmpty()) {
                        item(key = "mesh_peers_header") {
                            SectionHeader(
                                title = "${stringResource(R.string.search_peers_section)} (${filteredPeers.size})",
                                icon = Icons.Outlined.People
                            )
                        }

                        items(
                            items = filteredPeers,
                            key = { "peer_$it" }
                        ) { peerID ->
                            val nickname = peerNicknames[peerID] ?: peerID.take(8)
                            MeshPeerSearchRow(
                                peerID = peerID,
                                nickname = nickname,
                                onStartChat = {
                                    viewModel.showPrivateChatSheet(peerID)
                                    onDismiss()
                                }
                            )
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION: CHANNELS
                // -------------------------------------------------------------
                if (selectedFilter == SearchCategoryFilter.ALL || selectedFilter == SearchCategoryFilter.CHANNELS) {
                    if (filteredChannels.isNotEmpty()) {
                        item(key = "channels_header") {
                            SectionHeader(
                                title = "${stringResource(R.string.search_channels_section)} (${filteredChannels.size})",
                                icon = Icons.Outlined.Tag
                            )
                        }

                        items(
                            items = filteredChannels,
                            key = { "channel_${it.id}" }
                        ) { channel ->
                            ChannelSearchRow(
                                channel = channel,
                                onSelectChannel = {
                                    viewModel.switchToChannel(channel.name)
                                    onDismiss()
                                }
                            )
                        }
                    }
                }

                // -------------------------------------------------------------
                // SECTION: EXISTING CONVERSATIONS
                // -------------------------------------------------------------
                if (selectedFilter == SearchCategoryFilter.ALL && filteredConversations.isNotEmpty() && searchQuery.isNotBlank()) {
                    item(key = "conversations_header") {
                        SectionHeader(
                            title = stringResource(R.string.search_conversations_section),
                            icon = Icons.AutoMirrored.Filled.Chat
                        )
                    }

                    items(
                        items = filteredConversations,
                        key = { "conv_${it.conversationID}" }
                    ) { conv ->
                        ConversationSearchRow(
                            conversation = conv,
                            onOpenConversation = {
                                viewModel.showPrivateChatSheet(conv.conversationID)
                                onDismiss()
                            }
                        )
                    }
                }

                // Global empty result check
                val hasAnyResults = filteredContacts.isNotEmpty() ||
                    filteredPeers.isNotEmpty() ||
                    filteredChannels.isNotEmpty() ||
                    (searchQuery.isNotBlank() && filteredConversations.isNotEmpty())

                if (!hasAnyResults && searchQuery.isNotBlank()) {
                    item(key = "global_empty_results") {
                        EmptySearchResultItem(
                            message = stringResource(R.string.no_search_results_found)
                        )
                    }
                }
            }

            // Top Bar
            BitchatSheetTopBar(
                title = {
                    BitchatSheetTitle(text = "Find & Direct Message")
                },
                backgroundAlpha = topBarAlpha,
                onClose = onDismiss,
            )
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(16.dp)
        )
        Text(
            text = title,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            letterSpacing = 0.5.sp
        )
    }
}

@Composable
private fun PhoneContactRow(
    contact: PhoneContact,
    onStartChat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = LocalBitchatPalette.current

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onStartChat),
        color = Color(0xFF1E1F22)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                Color(0xFF5865F2),
                                Color(0xFF57F287)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = contact.initial,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = contact.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFF2F3F5),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (contact.isMeshAvailable) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Color(0xFF32D74B).copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "Mesh Online",
                                color = Color(0xFF32D74B),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }

                Text(
                    text = contact.phoneNumber,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF949BA4)
                )
            }

            // Direct message action button
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFF2B2D31),
                modifier = Modifier.clickable(onClick = onStartChat)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Chat,
                        contentDescription = "Message",
                        tint = Color(0xFF5865F2),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "Message",
                        color = Color(0xFFDBDEE1),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun MeshPeerSearchRow(
    peerID: String,
    nickname: String,
    onStartChat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = LocalBitchatPalette.current

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onStartChat),
        color = Color(0xFF1E1F22)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(colorForPeer(com.bitchat.android.ui.PeerIdentity.mesh(peerID), palette)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = nickname.take(1).uppercase(),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = nickname,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFF2F3F5),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "🟢 Direct BLE / Wi-Fi Mesh Link",
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 10.sp,
                    color = Color(0xFF32D74B)
                )
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFF2B2D31),
                modifier = Modifier.clickable(onClick = onStartChat)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Chat,
                        contentDescription = "Message",
                        tint = Color(0xFF32D74B),
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "1:1 Chat",
                        color = Color(0xFFDBDEE1),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun ChannelSearchRow(
    channel: DiscordChannel,
    onSelectChannel: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onSelectChannel),
        color = Color(0xFF1E1F22)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF2B2D31)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when {
                        channel.isVoiceActive -> Icons.AutoMirrored.Outlined.VolumeUp
                        channel.isEncrypted -> Icons.Default.Lock
                        else -> Icons.Default.Tag
                    },
                    contentDescription = null,
                    tint = if (channel.isEncrypted) Color(0xFF5865F2) else Color(0xFF949BA4),
                    modifier = Modifier.size(18.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "#${channel.name}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFF2F3F5),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (channel.topic.isNotBlank()) {
                    Text(
                        text = channel.topic,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF949BA4),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Text(
                text = "Join",
                color = Color(0xFF5865F2),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun ConversationSearchRow(
    conversation: ConversationSummary,
    onOpenConversation: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onOpenConversation),
        color = Color(0xFF1E1F22)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF2B2D31)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Chat,
                    contentDescription = null,
                    tint = Color(0xFF5865F2),
                    modifier = Modifier.size(18.dp)
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = conversation.displayName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFF2F3F5),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = conversation.latestMessagePreview.ifBlank { "No messages yet" },
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF949BA4),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun EmptySearchResultItem(
    message: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = Icons.Outlined.SearchOff,
            contentDescription = null,
            tint = Color(0xFF949BA4),
            modifier = Modifier.size(36.dp)
        )
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFF949BA4)
        )
    }
}
