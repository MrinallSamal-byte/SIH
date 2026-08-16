package com.bitchat.android.features.admin

/**
 * Represents a blocked user in the admin system.
 */
data class BlockedUser(
    val peerID: String,
    val nickname: String,
    val reason: String,
    val blockedAt: Long = System.currentTimeMillis(),
    val blockedBy: String = "" // admin peer ID who issued the block
)

/**
 * Represents a user report submitted by a mesh peer.
 */
data class UserReport(
    val id: String,
    val reportedPeerID: String,
    val reportedNickname: String,
    val reporterPeerID: String,
    val reporterNickname: String,
    val reason: String?, // optional message from reporter
    val timestamp: Long = System.currentTimeMillis(),
    val status: ReportStatus = ReportStatus.PENDING
)

/**
 * Status of a user report.
 */
enum class ReportStatus {
    PENDING,
    REVIEWED,
    ACTED_UPON,
    DISMISSED
}

/**
 * Action to take on a report.
 */
enum class ReportAction {
    BLOCK,
    WARN,
    DISMISS
}
