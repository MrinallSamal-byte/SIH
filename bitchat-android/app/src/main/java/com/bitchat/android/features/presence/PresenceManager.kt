package com.bitchat.android.features.presence

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentHashMap

/**
 * Presence state for a single peer.
 */
data class PeerPresenceState(
    val peerID: String,
    val isOnline: Boolean = false,
    val lastSeen: Long = 0L,
    val isTyping: Boolean = false,
    val typingExpiry: Long = 0L
) {
    fun getLastSeenText(): String {
        if (isOnline) return "online"
        if (lastSeen == 0L) return ""
        val elapsed = System.currentTimeMillis() - lastSeen
        return when {
            elapsed < 60_000L -> "last seen just now"
            elapsed < 3_600_000L -> "last seen ${elapsed / 60_000L} min ago"
            elapsed < 86_400_000L -> "last seen ${elapsed / 3_600_000L}h ago"
            else -> "last seen ${elapsed / 86_400_000L}d ago"
        }
    }

    fun getStatusText(): String = when {
        isTyping -> "typing..."
        isOnline -> "online"
        lastSeen > 0L -> getLastSeenText()
        else -> ""
    }
}

/**
 * Singleton managing online/offline/typing state for all peers.
 *
 * - Peers are marked online when we receive an ONLINE_PING or any presence update.
 * - Peers are marked offline after [ONLINE_TIMEOUT_MS] without an update, or on explicit OFFLINE.
 * - Typing status auto-clears after [TYPING_TIMEOUT_MS].
 * - Integrates with PeerManager's connected peer list.
 */
object PresenceManager {
    private const val TAG = "PresenceManager"
    private const val TYPING_TIMEOUT_MS = 5_000L
    private const val ONLINE_TIMEOUT_MS = 30_000L
    private const val CLEANUP_INTERVAL_MS = 10_000L

    private val presenceMap = ConcurrentHashMap<String, PeerPresenceState>()
    private val _peerPresence = MutableStateFlow<Map<String, PeerPresenceState>>(emptyMap())
    val peerPresence: StateFlow<Map<String, PeerPresenceState>> = _peerPresence.asStateFlow()

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var cleanupJob: Job? = null

    init {
        startCleanupLoop()
    }

    /**
     * Called when a presence packet is received from a peer.
     */
    fun handlePresenceUpdate(senderPeerID: String, type: PresenceUpdateType) {
        val now = System.currentTimeMillis()
        val current = presenceMap[senderPeerID] ?: PeerPresenceState(peerID = senderPeerID)

        val updated = when (type) {
            PresenceUpdateType.TYPING_START -> current.copy(
                isOnline = true,
                lastSeen = now,
                isTyping = true,
                typingExpiry = now + TYPING_TIMEOUT_MS
            )
            PresenceUpdateType.TYPING_STOP -> current.copy(
                isOnline = true,
                lastSeen = now,
                isTyping = false,
                typingExpiry = 0L
            )
            PresenceUpdateType.ONLINE_PING -> current.copy(
                isOnline = true,
                lastSeen = now
            )
            PresenceUpdateType.OFFLINE -> current.copy(
                isOnline = false,
                lastSeen = now,
                isTyping = false,
                typingExpiry = 0L
            )
        }

        presenceMap[senderPeerID] = updated
        publishState()
    }

    /**
     * Mark peers as online when they appear in the connected peer list.
     */
    fun markPeersOnline(peerIDs: Collection<String>) {
        val now = System.currentTimeMillis()
        var changed = false
        for (peerID in peerIDs) {
            val current = presenceMap[peerID]
            if (current == null || !current.isOnline) {
                presenceMap[peerID] = (current ?: PeerPresenceState(peerID = peerID)).copy(
                    isOnline = true,
                    lastSeen = now
                )
                changed = true
            }
        }
        if (changed) publishState()
    }

    /**
     * Mark peers as offline when they disconnect.
     */
    fun markPeersOffline(peerIDs: Collection<String>) {
        val now = System.currentTimeMillis()
        var changed = false
        for (peerID in peerIDs) {
            val current = presenceMap[peerID] ?: continue
            if (current.isOnline) {
                presenceMap[peerID] = current.copy(
                    isOnline = false,
                    lastSeen = now,
                    isTyping = false,
                    typingExpiry = 0L
                )
                changed = true
            }
        }
        if (changed) publishState()
    }

    /**
     * Get the presence state for a specific peer.
     */
    fun getPresence(peerID: String): PeerPresenceState? = presenceMap[peerID]

    /**
     * Check if a specific peer is online.
     */
    fun isOnline(peerID: String): Boolean = presenceMap[peerID]?.isOnline == true

    /**
     * Check if a specific peer is typing.
     */
    fun isTyping(peerID: String): Boolean {
        val state = presenceMap[peerID] ?: return false
        if (!state.isTyping) return false
        // Check if typing has expired
        if (state.typingExpiry > 0 && System.currentTimeMillis() > state.typingExpiry) {
            presenceMap[peerID] = state.copy(isTyping = false, typingExpiry = 0L)
            publishState()
            return false
        }
        return true
    }

    fun clear() {
        presenceMap.clear()
        publishState()
    }

    private fun publishState() {
        _peerPresence.value = HashMap(presenceMap)
    }

    private fun startCleanupLoop() {
        cleanupJob?.cancel()
        cleanupJob = scope.launch {
            while (isActive) {
                delay(CLEANUP_INTERVAL_MS)
                cleanupExpired()
            }
        }
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        var changed = false

        presenceMap.forEach { (peerID, state) ->
            // Auto-clear expired typing
            if (state.isTyping && state.typingExpiry > 0 && now > state.typingExpiry) {
                presenceMap[peerID] = state.copy(isTyping = false, typingExpiry = 0L)
                changed = true
            }
            // Auto-offline after timeout (only if no recent update)
            if (state.isOnline && state.lastSeen > 0 && (now - state.lastSeen) > ONLINE_TIMEOUT_MS) {
                presenceMap[peerID] = state.copy(isOnline = false)
                changed = true
            }
        }

        if (changed) publishState()
    }
}
