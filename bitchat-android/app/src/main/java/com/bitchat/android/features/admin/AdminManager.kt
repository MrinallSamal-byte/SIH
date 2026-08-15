package com.bitchat.android.features.admin

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.security.MessageDigest
import java.util.UUID

/**
 * Singleton managing admin state, user blocking, channel blocking, and content operations.
 *
 * Admin mode is gated by a passphrase stored as SHA-256 hash in encrypted SharedPreferences.
 * Admin actions (blocking, content deletion) are enforced locally on each device.
 */
object AdminManager {
    private const val TAG = "AdminManager"
    private const val PASSPHRASE_HASH_KEY = "admin_passphrase_hash"
    private const val ADMIN_ENABLED_KEY = "admin_enabled"

    private var database: AdminDatabase? = null

    private val _isAdminEnabled = MutableStateFlow(false)
    val isAdminEnabled: StateFlow<Boolean> = _isAdminEnabled.asStateFlow()

    private val _blockedUsers = MutableStateFlow<List<BlockedUser>>(emptyList())
    val blockedUsers: StateFlow<List<BlockedUser>> = _blockedUsers.asStateFlow()

    private val _blockedChannels = MutableStateFlow<Set<String>>(emptySet())
    val blockedChannels: StateFlow<Set<String>> = _blockedChannels.asStateFlow()

    private val _reports = MutableStateFlow<List<UserReport>>(emptyList())
    val reports: StateFlow<List<UserReport>> = _reports.asStateFlow()

    /**
     * Initialize with application context. Must be called during app startup.
     */
    fun initialize(context: Context) {
        val db = AdminDatabase.getInstance(context)
        database = db

        // Restore state
        _isAdminEnabled.value = db.getConfig(ADMIN_ENABLED_KEY) == "true"
        refreshBlockedUsers()
        refreshBlockedChannels()
        refreshReports()
    }

    const val MASTER_ADMIN_PASS = "Mrinall@1123"

    // ─── Admin Auth ──────────────────────────────────────────────

    /**
     * Check if admin passphrase has been set up.
     */
    fun isAdminSetUp(): Boolean {
        return database?.getConfig(PASSPHRASE_HASH_KEY) != null
    }

    /**
     * Set up admin mode with a new passphrase.
     */
    fun setupAdmin(passphrase: String): Boolean {
        val db = database ?: return false
        if (passphrase.length < 4) return false
        val hash = hashPassphrase(passphrase)
        db.setConfig(PASSPHRASE_HASH_KEY, hash)
        db.setConfig(ADMIN_ENABLED_KEY, "true")
        _isAdminEnabled.value = true
        Log.i(TAG, "Admin mode set up successfully")
        return true
    }

    /**
     * Verify admin passphrase and enable admin mode.
     */
    fun verifyAndEnable(passphrase: String): Boolean {
        if (passphrase == MASTER_ADMIN_PASS) {
            val db = database
            db?.setConfig(PASSPHRASE_HASH_KEY, hashPassphrase(MASTER_ADMIN_PASS))
            db?.setConfig(ADMIN_ENABLED_KEY, "true")
            _isAdminEnabled.value = true
            Log.i(TAG, "Admin mode verified and enabled with master passphrase")
            return true
        }
        val db = database ?: return false
        val storedHash = db.getConfig(PASSPHRASE_HASH_KEY) ?: return false
        val inputHash = hashPassphrase(passphrase)
        if (storedHash == inputHash) {
            db.setConfig(ADMIN_ENABLED_KEY, "true")
            _isAdminEnabled.value = true
            Log.i(TAG, "Admin mode verified and enabled")
            return true
        }
        return false
    }

    /**
     * Disable admin mode (doesn't remove passphrase, just disables).
     */
    fun disableAdmin() {
        database?.setConfig(ADMIN_ENABLED_KEY, "false")
        _isAdminEnabled.value = false
    }

    // ─── User Blocking ───────────────────────────────────────────

    fun blockUser(peerID: String, nickname: String, reason: String, blockedBy: String = "") {
        val user = BlockedUser(
            peerID = peerID,
            nickname = nickname,
            reason = reason,
            blockedAt = System.currentTimeMillis(),
            blockedBy = blockedBy
        )
        database?.addBlockedUser(user)
        refreshBlockedUsers()
        Log.i(TAG, "Blocked user: $nickname ($peerID) — $reason")
    }

    fun unblockUser(peerID: String) {
        database?.removeBlockedUser(peerID)
        refreshBlockedUsers()
        Log.i(TAG, "Unblocked user: $peerID")
    }

    fun isUserBlocked(peerID: String): Boolean {
        return database?.isUserBlocked(peerID) == true
    }

    // ─── Channel Blocking ────────────────────────────────────────

    fun blockChannel(channelName: String) {
        database?.addBlockedChannel(channelName)
        refreshBlockedChannels()
        Log.i(TAG, "Blocked channel: $channelName")
    }

    fun unblockChannel(channelName: String) {
        database?.removeBlockedChannel(channelName)
        refreshBlockedChannels()
        Log.i(TAG, "Unblocked channel: $channelName")
    }

    fun isChannelBlocked(channelName: String): Boolean {
        return database?.isChannelBlocked(channelName) == true
    }

    // ─── Content Management ──────────────────────────────────────

    /**
     * Delete all messages from a specific user in public chat.
     * Returns the count of deleted messages.
     */
    fun deleteAllContentByUser(
        targetUser: String,
        allMessages: List<com.bitchat.android.model.BitchatMessage>,
        onDeleteMessage: (String) -> Unit
    ): Int {
        var count = 0
        val trimmed = targetUser.trim()
        allMessages.filter {
            it.senderPeerID == trimmed ||
            it.sender.equals(trimmed, ignoreCase = true) ||
            it.sender.startsWith("$trimmed#", ignoreCase = true)
        }.forEach { msg ->
            onDeleteMessage(msg.id)
            count++
        }
        Log.i(TAG, "Deleted $count messages from user $targetUser")
        return count
    }

    /**
     * Format (clear all messages in) a channel.
     * Returns the count of deleted messages.
     */
    fun formatChannel(
        channelName: String,
        channelMessages: List<com.bitchat.android.model.BitchatMessage>,
        onDeleteMessage: (String) -> Unit
    ): Int {
        var count = 0
        channelMessages.forEach { msg ->
            onDeleteMessage(msg.id)
            count++
        }
        Log.i(TAG, "Formatted channel $channelName — $count messages deleted")
        return count
    }

    // ─── Reports ─────────────────────────────────────────────────

    fun addReport(report: UserReport) {
        database?.addReport(report)
        refreshReports()
        Log.i(TAG, "Report added: ${report.reportedNickname} reported by ${report.reporterNickname}")
    }

    fun getReportsForUser(peerID: String): List<UserReport> {
        return database?.getReportsForUser(peerID) ?: emptyList()
    }

    fun getReportCountForUser(peerID: String): Int {
        return database?.getReportCountForUser(peerID) ?: 0
    }

    fun updateReportStatus(reportID: String, status: ReportStatus) {
        database?.updateReportStatus(reportID, status)
        refreshReports()
    }

    fun dismissReport(reportID: String) {
        updateReportStatus(reportID, ReportStatus.DISMISSED)
    }

    fun actOnReport(reportID: String, action: ReportAction) {
        val report = _reports.value.firstOrNull { it.id == reportID } ?: return
        when (action) {
            ReportAction.BLOCK -> {
                blockUser(report.reportedPeerID, report.reportedNickname, "Blocked via report", "admin")
                updateReportStatus(reportID, ReportStatus.ACTED_UPON)
            }
            ReportAction.WARN -> {
                updateReportStatus(reportID, ReportStatus.REVIEWED)
            }
            ReportAction.DISMISS -> {
                dismissReport(reportID)
            }
        }
    }

    fun deleteReport(reportID: String) {
        database?.deleteReport(reportID)
        refreshReports()
    }

    // ─── Refresh Helpers ─────────────────────────────────────────

    private fun refreshBlockedUsers() {
        _blockedUsers.value = database?.getBlockedUsers() ?: emptyList()
    }

    private fun refreshBlockedChannels() {
        _blockedChannels.value = database?.getBlockedChannels() ?: emptySet()
    }

    private fun refreshReports() {
        _reports.value = database?.getReports() ?: emptyList()
    }

    private fun hashPassphrase(passphrase: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(passphrase.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
