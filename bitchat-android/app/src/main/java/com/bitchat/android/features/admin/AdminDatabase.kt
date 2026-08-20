package com.bitchat.android.features.admin

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.content.ContentValues
import android.util.Log
import java.util.UUID

/**
 * SQLite database for admin data — blocked users, blocked channels, user reports, admin config.
 * Survives process restart so admin state is persistent.
 */
class AdminDatabase private constructor(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {

    companion object {
        private const val TAG = "AdminDatabase"
        private const val DB_NAME = "bitchat_admin.db"
        private const val DB_VERSION = 1

        // Tables
        private const val TABLE_BLOCKED_USERS = "blocked_users"
        private const val TABLE_BLOCKED_CHANNELS = "blocked_channels"
        private const val TABLE_REPORTS = "user_reports"
        private const val TABLE_ADMIN_CONFIG = "admin_config"

        @Volatile
        private var instance: AdminDatabase? = null

        fun getInstance(context: Context): AdminDatabase =
            instance ?: synchronized(this) {
                instance ?: AdminDatabase(context).also { instance = it }
            }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE $TABLE_BLOCKED_USERS (
                peer_id TEXT PRIMARY KEY,
                nickname TEXT NOT NULL DEFAULT '',
                reason TEXT NOT NULL DEFAULT '',
                blocked_at INTEGER NOT NULL,
                blocked_by TEXT NOT NULL DEFAULT ''
            )
        """)

        db.execSQL("""
            CREATE TABLE $TABLE_BLOCKED_CHANNELS (
                channel_name TEXT PRIMARY KEY,
                blocked_at INTEGER NOT NULL
            )
        """)

        db.execSQL("""
            CREATE TABLE $TABLE_REPORTS (
                id TEXT PRIMARY KEY,
                reported_peer_id TEXT NOT NULL,
                reported_nickname TEXT NOT NULL DEFAULT '',
                reporter_peer_id TEXT NOT NULL,
                reporter_nickname TEXT NOT NULL DEFAULT '',
                reason TEXT,
                timestamp INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING'
            )
        """)

        db.execSQL("""
            CREATE TABLE $TABLE_ADMIN_CONFIG (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        // Create indexes
        db.execSQL("CREATE INDEX idx_reports_reported ON $TABLE_REPORTS(reported_peer_id)")
        db.execSQL("CREATE INDEX idx_reports_status ON $TABLE_REPORTS(status)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // For future schema migrations
    }

    // ─── Admin Config ────────────────────────────────────────────

    fun setConfig(key: String, value: String) {
        try {
            writableDatabase.insertWithOnConflict(
                TABLE_ADMIN_CONFIG,
                null,
                ContentValues().apply {
                    put("key", key)
                    put("value", value)
                },
                SQLiteDatabase.CONFLICT_REPLACE
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error setting config $key: ${e.message}")
        }
    }

    fun getConfig(key: String): String? {
        return try {
            readableDatabase.query(
                TABLE_ADMIN_CONFIG, arrayOf("value"),
                "key = ?", arrayOf(key),
                null, null, null
            ).use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting config $key: ${e.message}")
            null
        }
    }

    // ─── Blocked Users ───────────────────────────────────────────

    fun addBlockedUser(user: BlockedUser) {
        try {
            writableDatabase.insertWithOnConflict(
                TABLE_BLOCKED_USERS,
                null,
                ContentValues().apply {
                    put("peer_id", user.peerID)
                    put("nickname", user.nickname)
                    put("reason", user.reason)
                    put("blocked_at", user.blockedAt)
                    put("blocked_by", user.blockedBy)
                },
                SQLiteDatabase.CONFLICT_REPLACE
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error adding blocked user ${user.peerID}: ${e.message}")
        }
    }

    fun removeBlockedUser(peerID: String) {
        try {
            writableDatabase.delete(TABLE_BLOCKED_USERS, "peer_id = ?", arrayOf(peerID))
        } catch (e: Exception) {
            Log.e(TAG, "Error removing blocked user $peerID: ${e.message}")
        }
    }

    fun getBlockedUsers(): List<BlockedUser> {
        val list = mutableListOf<BlockedUser>()
        try {
            readableDatabase.query(
                TABLE_BLOCKED_USERS, null, null, null, null, null, "blocked_at DESC"
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    list.add(BlockedUser(
                        peerID = cursor.getString(cursor.getColumnIndexOrThrow("peer_id")),
                        nickname = cursor.getString(cursor.getColumnIndexOrThrow("nickname")),
                        reason = cursor.getString(cursor.getColumnIndexOrThrow("reason")),
                        blockedAt = cursor.getLong(cursor.getColumnIndexOrThrow("blocked_at")),
                        blockedBy = cursor.getString(cursor.getColumnIndexOrThrow("blocked_by"))
                    ))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting blocked users: ${e.message}")
        }
        return list
    }

    fun isUserBlocked(peerID: String): Boolean {
        return try {
            readableDatabase.query(
                TABLE_BLOCKED_USERS, arrayOf("peer_id"),
                "peer_id = ?", arrayOf(peerID),
                null, null, null
            ).use { it.count > 0 }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if user blocked $peerID: ${e.message}")
            false
        }
    }

    // ─── Blocked Channels ────────────────────────────────────────

    fun addBlockedChannel(channelName: String) {
        try {
            writableDatabase.insertWithOnConflict(
                TABLE_BLOCKED_CHANNELS,
                null,
                ContentValues().apply {
                    put("channel_name", channelName)
                    put("blocked_at", System.currentTimeMillis())
                },
                SQLiteDatabase.CONFLICT_REPLACE
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error adding blocked channel $channelName: ${e.message}")
        }
    }

    fun removeBlockedChannel(channelName: String) {
        try {
            writableDatabase.delete(TABLE_BLOCKED_CHANNELS, "channel_name = ?", arrayOf(channelName))
        } catch (e: Exception) {
            Log.e(TAG, "Error removing blocked channel $channelName: ${e.message}")
        }
    }

    fun getBlockedChannels(): Set<String> {
        val set = mutableSetOf<String>()
        try {
            readableDatabase.query(
                TABLE_BLOCKED_CHANNELS, arrayOf("channel_name"),
                null, null, null, null, null
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    set.add(cursor.getString(0))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting blocked channels: ${e.message}")
        }
        return set
    }

    fun isChannelBlocked(channelName: String): Boolean {
        return try {
            readableDatabase.query(
                TABLE_BLOCKED_CHANNELS, arrayOf("channel_name"),
                "channel_name = ?", arrayOf(channelName),
                null, null, null
            ).use { it.count > 0 }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if channel blocked $channelName: ${e.message}")
            false
        }
    }

    // ─── Reports ─────────────────────────────────────────────────

    fun addReport(report: UserReport) {
        try {
            writableDatabase.insertWithOnConflict(
                TABLE_REPORTS,
                null,
                ContentValues().apply {
                    put("id", report.id)
                    put("reported_peer_id", report.reportedPeerID)
                    put("reported_nickname", report.reportedNickname)
                    put("reporter_peer_id", report.reporterPeerID)
                    put("reporter_nickname", report.reporterNickname)
                    put("reason", report.reason)
                    put("timestamp", report.timestamp)
                    put("status", report.status.name)
                },
                SQLiteDatabase.CONFLICT_REPLACE
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error adding report ${report.id}: ${e.message}")
        }
    }

    fun getReports(statusFilter: ReportStatus? = null): List<UserReport> {
        val list = mutableListOf<UserReport>()
        try {
            val selection = statusFilter?.let { "status = ?" }
            val selectionArgs = statusFilter?.let { arrayOf(it.name) }
            readableDatabase.query(
                TABLE_REPORTS, null, selection, selectionArgs,
                null, null, "timestamp DESC"
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    list.add(UserReport(
                        id = cursor.getString(cursor.getColumnIndexOrThrow("id")),
                        reportedPeerID = cursor.getString(cursor.getColumnIndexOrThrow("reported_peer_id")),
                        reportedNickname = cursor.getString(cursor.getColumnIndexOrThrow("reported_nickname")),
                        reporterPeerID = cursor.getString(cursor.getColumnIndexOrThrow("reporter_peer_id")),
                        reporterNickname = cursor.getString(cursor.getColumnIndexOrThrow("reporter_nickname")),
                        reason = cursor.getString(cursor.getColumnIndexOrThrow("reason")),
                        timestamp = cursor.getLong(cursor.getColumnIndexOrThrow("timestamp")),
                        status = try {
                            ReportStatus.valueOf(cursor.getString(cursor.getColumnIndexOrThrow("status")))
                        } catch (_: Exception) { ReportStatus.PENDING }
                    ))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting reports: ${e.message}")
        }
        return list
    }

    fun getReportsForUser(peerID: String): List<UserReport> {
        val list = mutableListOf<UserReport>()
        try {
            readableDatabase.query(
                TABLE_REPORTS, null,
                "reported_peer_id = ?", arrayOf(peerID),
                null, null, "timestamp DESC"
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    list.add(UserReport(
                        id = cursor.getString(cursor.getColumnIndexOrThrow("id")),
                        reportedPeerID = cursor.getString(cursor.getColumnIndexOrThrow("reported_peer_id")),
                        reportedNickname = cursor.getString(cursor.getColumnIndexOrThrow("reported_nickname")),
                        reporterPeerID = cursor.getString(cursor.getColumnIndexOrThrow("reporter_peer_id")),
                        reporterNickname = cursor.getString(cursor.getColumnIndexOrThrow("reporter_nickname")),
                        reason = cursor.getString(cursor.getColumnIndexOrThrow("reason")),
                        timestamp = cursor.getLong(cursor.getColumnIndexOrThrow("timestamp")),
                        status = try {
                            ReportStatus.valueOf(cursor.getString(cursor.getColumnIndexOrThrow("status")))
                        } catch (_: Exception) { ReportStatus.PENDING }
                    ))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting reports for user $peerID: ${e.message}")
        }
        return list
    }

    fun getReportCountForUser(peerID: String): Int {
        return try {
            readableDatabase.rawQuery(
                "SELECT COUNT(DISTINCT reporter_peer_id) FROM $TABLE_REPORTS WHERE reported_peer_id = ?",
                arrayOf(peerID)
            ).use { cursor ->
                if (cursor.moveToFirst()) cursor.getInt(0) else 0
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting report count for user $peerID: ${e.message}")
            0
        }
    }

    fun updateReportStatus(reportID: String, status: ReportStatus) {
        try {
            writableDatabase.update(
                TABLE_REPORTS,
                ContentValues().apply { put("status", status.name) },
                "id = ?",
                arrayOf(reportID)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error updating report status $reportID: ${e.message}")
        }
    }

    fun deleteReport(reportID: String) {
        try {
            writableDatabase.delete(TABLE_REPORTS, "id = ?", arrayOf(reportID))
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting report $reportID: ${e.message}")
        }
    }

    fun deleteAllReportsForUser(peerID: String) {
        try {
            writableDatabase.delete(TABLE_REPORTS, "reported_peer_id = ?", arrayOf(peerID))
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting all reports for user $peerID: ${e.message}")
        }
    }
}
