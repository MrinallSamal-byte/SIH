package com.bitchat.android.ui

import android.util.Log
import com.bitchat.android.model.BitchatMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.Date
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Discord Server / Hub model
 */
data class DiscordHub(
    val id: String,
    val name: String,
    val icon: String,
    val description: String,
    val isEmergency: Boolean = false
)

/**
 * Discord Channel Category Type
 */
enum class ChannelCategoryType {
    EMERGENCY,
    BROADCAST,
    SECURE_SQUAD,
    GENERAL,
    DIRECT_MESSAGES
}

/**
 * Discord Category model
 */
data class DiscordCategory(
    val id: String,
    val hubId: String,
    val title: String,
    val type: ChannelCategoryType,
    val isCollapsible: Boolean = true,
    val isCollapsed: Boolean = false
)

/**
 * Discord Channel model
 */
data class DiscordChannel(
    val id: String,
    val name: String,
    val topic: String,
    val categoryId: String,
    val hubId: String,
    val isEncrypted: Boolean = false,
    val isPasswordProtected: Boolean = false,
    val hasKey: Boolean = false,
    val unreadCount: Int = 0,
    val isEmergency: Boolean = false,
    val isVoiceActive: Boolean = false,
    val activePeersCount: Int = 0
)

/**
 * Handles channel management including creation, joining, leaving, Discord hierarchy, and E2EE encryption
 */
class ChannelManager(
    private val state: ChatState,
    private val messageManager: MessageManager,
    private val dataManager: DataManager,
    private val coroutineScope: CoroutineScope
) {
    companion object {
        private const val TAG = "ChannelManager"
        private const val PBKDF2_ITERATIONS = 100000
        private const val KEY_LENGTH = 256
        
        // Hub IDs
        const val HUB_CAMPUS = "hub_campus"
        const val HUB_ACADEMICS = "hub_academics"
        const val HUB_HOSTEL = "hub_hostel"
        const val HUB_CLUBS = "hub_clubs"
        const val HUB_DIRECT_MESSAGES = "hub_dms"
        
        // Category IDs
        const val CAT_CAMPUS_BROADCAST = "cat_campus_broadcast"
        const val CAT_STUDY_GROUPS = "cat_study_groups"
        const val CAT_SECURE_SQUADS = "cat_secure_squads"
        const val CAT_HOSTEL_LIFE = "cat_hostel_life"
        const val CAT_CLUBS_SPORTS = "cat_clubs_sports"
        const val CAT_DMS = "cat_dms"

        // Admin Channel & Credentials
        const val ADMIN_CHANNEL = "#admin"
        const val ADMIN_DEFAULT_PASSWORD = "Mrinall@1123"
    }
    
    // Channel encryption and security
    private val channelKeys = ConcurrentHashMap<String, SecretKeySpec>()
    private val channelPasswords = ConcurrentHashMap<String, String>()
    private val channelKeyCommitments = ConcurrentHashMap<String, String>()
    private val retentionEnabledChannels = mutableSetOf<String>()
    
    // Discord Hierarchy State
    private val _selectedHubId = MutableStateFlow(HUB_CAMPUS)
    val selectedHubId: StateFlow<String> = _selectedHubId.asStateFlow()
    
    private val _hubs = MutableStateFlow<List<DiscordHub>>(emptyList())
    val hubs: StateFlow<List<DiscordHub>> = _hubs.asStateFlow()
    
    private val _categories = MutableStateFlow<List<DiscordCategory>>(emptyList())
    val categories: StateFlow<List<DiscordCategory>> = _categories.asStateFlow()
    
    private val _channels = MutableStateFlow<List<DiscordChannel>>(emptyList())
    val channels: StateFlow<List<DiscordChannel>> = _channels.asStateFlow()
    
    private val _collapsedCategories = MutableStateFlow<Set<String>>(emptySet())
    val collapsedCategories: StateFlow<Set<String>> = _collapsedCategories.asStateFlow()

    init {
        initializeDiscordHierarchy()
    }
    
    private fun initializeDiscordHierarchy() {
        val initialHubs = listOf(
            DiscordHub(
                id = HUB_CAMPUS,
                name = "Campus Main Hub",
                icon = "🎓",
                description = "Campus-wide Offline Mesh Network & Student Announcements",
                isEmergency = false
            ),
            DiscordHub(
                id = HUB_ACADEMICS,
                name = "Academics & Study",
                icon = "📚",
                description = "Departments, Study Groups & Exam Prep",
                isEmergency = false
            ),
            DiscordHub(
                id = HUB_HOSTEL,
                name = "Hostel & Campus Life",
                icon = "🏢",
                description = "Hostels, Mess & Canteen, Lost and Found",
                isEmergency = false
            ),
            DiscordHub(
                id = HUB_CLUBS,
                name = "Clubs & Activities",
                icon = "⚡",
                description = "Coding, Tech, Sports & Cultural Societies",
                isEmergency = false
            ),
            DiscordHub(
                id = HUB_DIRECT_MESSAGES,
                name = "Direct Messages",
                icon = "💬",
                description = "1-on-1 End-to-End Encrypted Private Chats",
                isEmergency = false
            )
        )
        
        val initialCategories = listOf(
            // Campus Main
            DiscordCategory(
                id = CAT_CAMPUS_BROADCAST,
                hubId = HUB_CAMPUS,
                title = "📢 CAMPUS BROADCASTS",
                type = ChannelCategoryType.BROADCAST
            ),
            // Academics
            DiscordCategory(
                id = CAT_STUDY_GROUPS,
                hubId = HUB_ACADEMICS,
                title = "📚 STUDY GROUPS & NOTES",
                type = ChannelCategoryType.GENERAL
            ),
            DiscordCategory(
                id = CAT_SECURE_SQUADS,
                hubId = HUB_ACADEMICS,
                title = "🔒 PRIVATE STUDY SQUADS (E2EE)",
                type = ChannelCategoryType.SECURE_SQUAD
            ),
            // Hostel & Living
            DiscordCategory(
                id = CAT_HOSTEL_LIFE,
                hubId = HUB_HOSTEL,
                title = "🍕 HOSTEL & CAMPUS LIVING",
                type = ChannelCategoryType.GENERAL
            ),
            // Clubs
            DiscordCategory(
                id = CAT_CLUBS_SPORTS,
                hubId = HUB_CLUBS,
                title = "🎯 CLUBS & ACTIVITIES",
                type = ChannelCategoryType.GENERAL
            ),
            // DMs
            DiscordCategory(
                id = CAT_DMS,
                hubId = HUB_DIRECT_MESSAGES,
                title = "💬 DIRECT MESSAGES",
                type = ChannelCategoryType.DIRECT_MESSAGES
            )
        )
        
        val initialChannels = listOf(
            // Campus Main Hub
            DiscordChannel(
                id = "#admin",
                name = "admin",
                topic = "🛡️ Campus Mesh Administration & Moderation Dashboard (Restricted Access)",
                categoryId = CAT_CAMPUS_BROADCAST,
                hubId = HUB_CAMPUS,
                isEncrypted = true,
                isPasswordProtected = true
            ),
            DiscordChannel(
                id = "#campus-announcements",
                name = "campus-announcements",
                topic = "📢 College news, timetable changes, exam alerts & notices",
                categoryId = CAT_CAMPUS_BROADCAST,
                hubId = HUB_CAMPUS
            ),
            DiscordChannel(
                id = "#general-chat",
                name = "general-chat",
                topic = "💬 Campus-wide open chat for all students",
                categoryId = CAT_CAMPUS_BROADCAST,
                hubId = HUB_CAMPUS
            ),
            DiscordChannel(
                id = "#lost-and-found",
                name = "lost-and-found",
                topic = "🔍 Lost ID cards, calculators, earphones, keys & notebooks",
                categoryId = CAT_CAMPUS_BROADCAST,
                hubId = HUB_CAMPUS
            ),
            
            // Academics & Study Hub
            DiscordChannel(
                id = "#assignments-and-notes",
                name = "assignments-and-notes",
                topic = "📝 Lecture notes, question banks & assignment sharing",
                categoryId = CAT_STUDY_GROUPS,
                hubId = HUB_ACADEMICS
            ),
            DiscordChannel(
                id = "#exam-prep-and-doubts",
                name = "exam-prep-and-doubts",
                topic = "💡 Peer doubt clearing, previous year papers & viva discussions",
                categoryId = CAT_STUDY_GROUPS,
                hubId = HUB_ACADEMICS
            ),
            DiscordChannel(
                id = "#coding-and-projects",
                name = "coding-and-projects",
                topic = "💻 Hackathons, coding challenges, bug fixes & team formation",
                categoryId = CAT_STUDY_GROUPS,
                hubId = HUB_ACADEMICS
            ),
            
            // Secure Squads (E2EE Password Protected)
            DiscordChannel(
                id = "#batch-2026-cse",
                name = "batch-2026-cse",
                topic = "🔒 CSE Batch private discussion (End-to-End Encrypted)",
                categoryId = CAT_SECURE_SQUADS,
                hubId = HUB_ACADEMICS,
                isEncrypted = true,
                isPasswordProtected = true
            ),
            DiscordChannel(
                id = "#core-project-team",
                name = "core-project-team",
                topic = "🔒 Final year capstone project team (E2EE Password Protected)",
                categoryId = CAT_SECURE_SQUADS,
                hubId = HUB_ACADEMICS,
                isEncrypted = true,
                isPasswordProtected = true
            ),
            DiscordChannel(
                id = "#secret-squad",
                name = "secret-squad",
                topic = "🔒 Student study squad (E2EE Password Protected)",
                categoryId = CAT_SECURE_SQUADS,
                hubId = HUB_ACADEMICS,
                isEncrypted = true,
                isPasswordProtected = true
            ),
            
            // Hostel & Campus Life Hub
            DiscordChannel(
                id = "#hostel-life",
                name = "hostel-life",
                topic = "🛏️ Hostel notices, night canteen & room discussions",
                categoryId = CAT_HOSTEL_LIFE,
                hubId = HUB_HOSTEL
            ),
            DiscordChannel(
                id = "#canteen-and-mess",
                name = "canteen-and-mess",
                topic = "🍛 Mess food menu, reviews & canteen updates",
                categoryId = CAT_HOSTEL_LIFE,
                hubId = HUB_HOSTEL
            ),
            DiscordChannel(
                id = "#campus-rideshare",
                name = "campus-rideshare",
                topic = "🚗 Auto/cab sharing to railway station, metro & airport",
                categoryId = CAT_HOSTEL_LIFE,
                hubId = HUB_HOSTEL
            ),
            
            // Clubs & Activities Hub
            DiscordChannel(
                id = "#tech-and-robotics",
                name = "tech-and-robotics",
                topic = "🤖 Robotics, AI & open source club discussions",
                categoryId = CAT_CLUBS_SPORTS,
                hubId = HUB_CLUBS
            ),
            DiscordChannel(
                id = "#cultural-and-music",
                name = "cultural-and-music",
                topic = "🎸 College fests, music, dance, drama & arts",
                categoryId = CAT_CLUBS_SPORTS,
                hubId = HUB_CLUBS
            ),
            DiscordChannel(
                id = "#sports-and-gaming",
                name = "sports-and-gaming",
                topic = "⚽ Football, cricket, badminton, BGMI, Chess & LAN gaming",
                categoryId = CAT_CLUBS_SPORTS,
                hubId = HUB_CLUBS
            )
        )
        
        _hubs.value = initialHubs
        _categories.value = initialCategories
        _channels.value = initialChannels
    }
    
    fun selectHub(hubId: String) {
        _selectedHubId.value = hubId
    }
    
    fun toggleCategoryCollapse(categoryId: String) {
        val current = _collapsedCategories.value.toMutableSet()
        if (current.contains(categoryId)) {
            current.remove(categoryId)
        } else {
            current.add(categoryId)
        }
        _collapsedCategories.value = current
    }
    
    fun createChannel(
        name: String,
        topic: String,
        categoryId: String,
        hubId: String,
        isEncrypted: Boolean,
        password: String? = null,
        myPeerID: String
    ): Boolean {
        val cleanName = name.trim().removePrefix("#").lowercase().replace(" ", "-")
        if (cleanName.isEmpty()) return false
        val channelId = "#$cleanName"
        
        // If encrypted, password is required
        if (isEncrypted && password.isNullOrBlank()) {
            return false
        }
        
        val newChannel = DiscordChannel(
            id = channelId,
            name = cleanName,
            topic = topic.ifBlank { "Channel for #$cleanName" },
            categoryId = categoryId,
            hubId = hubId,
            isEncrypted = isEncrypted,
            isPasswordProtected = isEncrypted,
            hasKey = isEncrypted && password != null
        )
        
        val currentChannels = _channels.value.toMutableList()
        currentChannels.removeAll { it.id == channelId }
        currentChannels.add(newChannel)
        _channels.value = currentChannels
        
        if (isEncrypted && password != null) {
            setChannelPassword(channelId, password)
        }
        
        return joinChannel(channelId, password, myPeerID)
    }

    // MARK: - Channel Lifecycle
    
    fun joinChannel(channel: String, password: String? = null, myPeerID: String): Boolean {
        val channelTag = if (channel.startsWith("#")) channel else "#$channel"
        val isAdminChannel = channelTag.equals(ADMIN_CHANNEL, ignoreCase = true)
        
        if (!isAdminChannel && com.bitchat.android.features.admin.AdminManager.isChannelBlocked(channelTag)) {
            return false
        }
        
        // Check if already joined
        if (state.getJoinedChannelsValue().contains(channelTag)) {
            if ((isAdminChannel || state.getPasswordProtectedChannelsValue().contains(channelTag)) && !channelKeys.containsKey(channelTag)) {
                // Need password verification
                if (password != null) {
                    return verifyAndSetChannelPassword(channelTag, password)
                } else {
                    state.setPasswordPromptChannel(channelTag)
                    state.setShowPasswordPrompt(true)
                    return false
                }
            }
            if (isAdminChannel) {
                com.bitchat.android.features.admin.AdminManager.verifyAndEnable(ADMIN_DEFAULT_PASSWORD)
            }
            switchToChannel(channelTag)
            return true
        }
        
        // If password protected or admin channel and no key yet
        if (isAdminChannel || (state.getPasswordProtectedChannelsValue().contains(channelTag) && !channelKeys.containsKey(channelTag))) {
            if (isAdminChannel) {
                if (password != null) {
                    if (!verifyAndSetChannelPassword(channelTag, password)) {
                        return false
                    }
                } else {
                    state.setPasswordPromptChannel(channelTag)
                    state.setShowPasswordPrompt(true)
                    return false
                }
            } else if (dataManager.isChannelCreator(channelTag, myPeerID)) {
                // Creator bypass
            } else if (password != null) {
                if (!verifyAndSetChannelPassword(channelTag, password)) {
                    return false
                }
            } else {
                state.setPasswordPromptChannel(channelTag)
                state.setShowPasswordPrompt(true)
                return false
            }
        } else if (password != null && password.isNotBlank()) {
            setChannelPassword(channelTag, password)
        }
        
        // Join the channel
        val updatedChannels = state.getJoinedChannelsValue().toMutableSet()
        updatedChannels.add(channelTag)
        state.setJoinedChannels(updatedChannels)
        
        // Set as creator if new channel
        if (!dataManager.channelCreators.containsKey(channelTag) && !state.getPasswordProtectedChannelsValue().contains(channelTag)) {
            dataManager.addChannelCreator(channelTag, myPeerID)
        }
        
        // Add ourselves as member
        dataManager.addChannelMember(channelTag, myPeerID)
        
        // Initialize channel messages if needed
        if (!state.getChannelMessagesValue().containsKey(channelTag)) {
            val updatedChannelMessages = state.getChannelMessagesValue().toMutableMap()
            updatedChannelMessages[channelTag] = emptyList()
            state.setChannelMessages(updatedChannelMessages)
        }
        
        switchToChannel(channelTag)
        saveChannelData()
        return true
    }
    
    fun leaveChannel(channel: String) {
        val updatedChannels = state.getJoinedChannelsValue().toMutableSet()
        updatedChannels.remove(channel)
        state.setJoinedChannels(updatedChannels)
        
        // Exit channel if currently in it
        if (state.getCurrentChannelValue() == channel) {
            state.setCurrentChannel(null)
        }
        
        if (channel.equals(ADMIN_CHANNEL, ignoreCase = true)) {
            com.bitchat.android.features.admin.AdminManager.disableAdmin()
        }
        
        // Cleanup
        messageManager.removeChannelMessages(channel)
        dataManager.removeChannelMembers(channel)
        channelKeys.remove(channel)
        channelPasswords.remove(channel)
        channelKeyCommitments.remove(channel)
        dataManager.removeChannelCreator(channel)
        
        saveChannelData()
    }
    
    fun switchToChannel(channel: String?) {
        state.setCurrentChannel(channel)
        state.setSelectedPrivateChatPeer(null)
        
        // Clear unread count
        channel?.let { ch ->
            messageManager.clearChannelUnreadCount(ch)
        }
    }
    
    // MARK: - Channel Password and AES-256-GCM Encryption
    
    private fun verifyAndSetChannelPassword(channel: String, password: String): Boolean {
        if (password.isBlank()) return false
        val normalized = if (channel.startsWith("#")) channel else "#$channel"
        if (normalized.equals(ADMIN_CHANNEL, ignoreCase = true)) {
            if (password != ADMIN_DEFAULT_PASSWORD) {
                Log.w(TAG, "Invalid password attempt for admin channel")
                return false
            }
            com.bitchat.android.features.admin.AdminManager.setupAdmin(ADMIN_DEFAULT_PASSWORD)
            com.bitchat.android.features.admin.AdminManager.verifyAndEnable(ADMIN_DEFAULT_PASSWORD)
        }
        setChannelPassword(channel, password)
        return true
    }
    
    fun deriveChannelKey(password: String, channelName: String): SecretKeySpec {
        return try {
            val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val salt = channelName.lowercase().toByteArray(Charsets.UTF_8)
            val spec = PBEKeySpec(
                password.toCharArray(),
                salt,
                PBKDF2_ITERATIONS,
                KEY_LENGTH
            )
            val secretKey = factory.generateSecret(spec)
            SecretKeySpec(secretKey.encoded, "AES")
        } catch (e: Exception) {
            Log.e(TAG, "Error deriving channel key for $channelName: ${e.message}")
            throw e
        }
    }
    
    fun decryptChannelMessage(encryptedContent: ByteArray, channel: String): String? {
        val key = channelKeys[channel] ?: return null
        
        return try {
            if (encryptedContent.size < 16) {
                Log.w(TAG, "Encrypted channel payload too short: ${encryptedContent.size} bytes")
                return null
            }
            
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val iv = encryptedContent.sliceArray(0..11)
            val ciphertext = encryptedContent.sliceArray(12 until encryptedContent.size)
            
            val gcmSpec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec)
            
            val decryptedData = cipher.doFinal(ciphertext)
            String(decryptedData, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to decrypt message for channel $channel: ${e.message}")
            null
        }
    }
    
    fun encryptChannelMessage(content: String, channel: String): ByteArray? {
        val key = channelKeys[channel] ?: return null
        
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key)
            
            val iv = cipher.iv
            val encryptedData = cipher.doFinal(content.toByteArray(Charsets.UTF_8))
            
            val combined = ByteArray(iv.size + encryptedData.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(encryptedData, 0, combined, iv.size, encryptedData.size)
            combined
        } catch (e: Exception) {
            Log.e(TAG, "Failed to encrypt message for channel $channel: ${e.message}")
            null
        }
    }
    
    fun sendEncryptedChannelMessage(
        content: String, 
        mentions: List<String>, 
        channel: String, 
        senderNickname: String?, 
        myPeerID: String,
        onEncryptedPayload: (ByteArray) -> Unit,
        onFallback: () -> Unit
    ) {
        val encryptedBytes = encryptChannelMessage(content, channel)
        if (encryptedBytes == null) {
            Log.w(TAG, "Cannot encrypt channel message for $channel - falling back to plain")
            onFallback()
            return
        }
        
        val encryptedMessage = BitchatMessage(
            sender = senderNickname ?: myPeerID,
            content = "", // Content placeholder
            timestamp = Date(),
            isRelay = false,
            senderPeerID = myPeerID,
            mentions = if (mentions.isNotEmpty()) mentions else null,
            channel = channel,
            encryptedContent = encryptedBytes,
            isEncrypted = true
        )
        
        val payload = encryptedMessage.toBinaryPayload()
        if (payload != null) {
            onEncryptedPayload(payload)
        } else {
            Log.e(TAG, "Failed to serialize encrypted channel message to binary payload")
            onFallback()
        }
    }
    
    // MARK: - Channel Management
    
    fun addChannelMessage(channel: String, message: BitchatMessage, senderPeerID: String?) {
        messageManager.addChannelMessage(channel, message)
        
        // Track as channel member
        senderPeerID?.let { peerID ->
            dataManager.addChannelMember(channel, peerID)
        }
    }
    
    fun removeChannelMember(channel: String, peerID: String) {
        dataManager.removeChannelMember(channel, peerID)
    }
    
    fun cleanupDisconnectedMembers(connectedPeers: List<String>, myPeerID: String) {
        dataManager.cleanupAllDisconnectedMembers(connectedPeers, myPeerID)
    }
    
    // MARK: - Channel Information
    
    fun isChannelPasswordProtected(channel: String): Boolean {
        val tag = if (channel.startsWith("#")) channel else "#$channel"
        if (tag.equals(ADMIN_CHANNEL, ignoreCase = true)) return true
        return state.getPasswordProtectedChannelsValue().contains(tag)
    }
    
    fun hasChannelKey(channel: String): Boolean {
        return channelKeys.containsKey(channel)
    }
    
    fun getChannelPassword(channel: String): String? {
        return channelPasswords[channel]
    }
    
    fun isChannelCreator(channel: String, peerID: String): Boolean {
        return dataManager.isChannelCreator(channel, peerID)
    }
    
    fun getJoinedChannelsList(): List<String> {
        return state.getJoinedChannelsValue().toList().sorted()
    }
    
    // MARK: - Data Persistence
    
    private fun saveChannelData() {
        dataManager.saveChannelData(state.getJoinedChannelsValue(), state.getPasswordProtectedChannelsValue())
    }
    
    fun loadChannelData(): Pair<Set<String>, Set<String>> {
        val (joined, protected) = dataManager.loadChannelData()
        val updatedProtected = protected.toMutableSet().apply { add(ADMIN_CHANNEL) }
        return Pair(joined, updatedProtected)
    }
    
    // MARK: - Password Management
    
    fun hidePasswordPrompt() {
        state.setShowPasswordPrompt(false)
        state.setPasswordPromptChannel(null)
    }

    fun setChannelPassword(channel: String, password: String) {
        if (password.isEmpty()) return
        channelPasswords[channel] = password
        val key = deriveChannelKey(password, channel)
        channelKeys[channel] = key
        
        // Calculate key commitment
        try {
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(key.encoded)
            channelKeyCommitments[channel] = hash.joinToString("") { "%02x".format(it) }
        } catch (_: Exception) { }

        state.setPasswordProtectedChannels(
            state.getPasswordProtectedChannelsValue().toMutableSet().apply { add(channel) }
        )

        dataManager.saveChannelData(
            state.getJoinedChannelsValue(),
            state.getPasswordProtectedChannelsValue()
        )
        
        Log.i(TAG, "Key derived and configured for secure channel $channel (E2EE enabled)")
    }
    
    // MARK: - Emergency Clear
    
    fun clearAllChannels() {
        state.setJoinedChannels(emptySet())
        state.setCurrentChannel(null)
        state.setPasswordProtectedChannels(emptySet())
        state.setShowPasswordPrompt(false)
        state.setPasswordPromptChannel(null)
        
        channelKeys.clear()
        channelPasswords.clear()
        channelKeyCommitments.clear()
        retentionEnabledChannels.clear()
    }
}

