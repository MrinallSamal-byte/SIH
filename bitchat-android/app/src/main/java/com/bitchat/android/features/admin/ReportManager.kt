package com.bitchat.android.features.admin

import android.util.Log
import java.util.UUID

/**
 * Manages incoming and outgoing user reports.
 * Delegates persistence to [AdminManager] and [AdminDatabase].
 */
object ReportManager {
    private const val TAG = "ReportManager"

    /**
     * Create and store a report for a user. Called when the local user submits a report.
     */
    fun createReport(
        reportedPeerID: String,
        reportedNickname: String,
        reporterPeerID: String,
        reporterNickname: String,
        reason: String?
    ): UserReport {
        val report = UserReport(
            id = UUID.randomUUID().toString().uppercase(),
            reportedPeerID = reportedPeerID,
            reportedNickname = reportedNickname,
            reporterPeerID = reporterPeerID,
            reporterNickname = reporterNickname,
            reason = reason,
            timestamp = System.currentTimeMillis(),
            status = ReportStatus.PENDING
        )
        AdminManager.addReport(report)
        Log.i(TAG, "Created report: ${report.reportedNickname} by ${report.reporterNickname}")
        return report
    }

    /**
     * Handle an incoming report packet from the mesh.
     */
    fun handleIncomingReport(decoded: ReportPacket.Decoded) {
        // Only process if admin mode is enabled
        if (!AdminManager.isAdminEnabled.value) {
            Log.d(TAG, "Ignoring incoming report — admin mode not enabled")
            return
        }

        val report = UserReport(
            id = UUID.randomUUID().toString().uppercase(),
            reportedPeerID = decoded.reportedPeerID,
            reportedNickname = decoded.reportedNickname,
            reporterPeerID = decoded.reporterPeerID,
            reporterNickname = decoded.reporterNickname,
            reason = decoded.reason,
            timestamp = decoded.timestamp,
            status = ReportStatus.PENDING
        )
        AdminManager.addReport(report)
        Log.i(TAG, "Received mesh report: ${report.reportedNickname} by ${report.reporterNickname}")
    }

    /**
     * Build the encoded packet for broadcasting a report over the mesh.
     */
    fun encodeReportForBroadcast(
        reporterPeerID: String,
        reporterNickname: String,
        reportedPeerID: String,
        reportedNickname: String,
        reason: String?
    ): ByteArray {
        return ReportPacket.encode(
            reporterPeerID = reporterPeerID,
            reporterNickname = reporterNickname,
            reportedPeerID = reportedPeerID,
            reportedNickname = reportedNickname,
            reason = reason
        )
    }
}
