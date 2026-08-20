package com.bitchat.android.features.admin

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Wire format for user report control packets sent over the mesh.
 *
 * Format:
 * - 1 byte: packet type marker (0x31 = USER_REPORT)
 * - 2 bytes: reporter peer ID length
 * - N bytes: reporter peer ID (UTF-8)
 * - 2 bytes: reporter nickname length
 * - N bytes: reporter nickname (UTF-8)
 * - 2 bytes: reported peer ID length
 * - N bytes: reported peer ID (UTF-8)
 * - 2 bytes: reported nickname length
 * - N bytes: reported nickname (UTF-8)
 * - 2 bytes: reason length (0 if no reason)
 * - N bytes: reason (UTF-8, optional)
 * - 8 bytes: timestamp (millis since epoch)
 */
object ReportPacket {
    const val PACKET_TYPE: Byte = 0x31

    fun encode(
        reporterPeerID: String,
        reporterNickname: String,
        reportedPeerID: String,
        reportedNickname: String,
        reason: String?
    ): ByteArray {
        val reporterIDBytes = reporterPeerID.toByteArray(Charsets.UTF_8)
        val reporterNameBytes = reporterNickname.toByteArray(Charsets.UTF_8)
        val reportedIDBytes = reportedPeerID.toByteArray(Charsets.UTF_8)
        val reportedNameBytes = reportedNickname.toByteArray(Charsets.UTF_8)
        val reasonBytes = reason?.toByteArray(Charsets.UTF_8) ?: ByteArray(0)

        val totalSize = 1 + // packet type
            2 + reporterIDBytes.size +
            2 + reporterNameBytes.size +
            2 + reportedIDBytes.size +
            2 + reportedNameBytes.size +
            2 + reasonBytes.size +
            8 // timestamp

        val buffer = ByteBuffer.allocate(totalSize).order(ByteOrder.BIG_ENDIAN)
        buffer.put(PACKET_TYPE)
        buffer.putShort(reporterIDBytes.size.toShort())
        buffer.put(reporterIDBytes)
        buffer.putShort(reporterNameBytes.size.toShort())
        buffer.put(reporterNameBytes)
        buffer.putShort(reportedIDBytes.size.toShort())
        buffer.put(reportedIDBytes)
        buffer.putShort(reportedNameBytes.size.toShort())
        buffer.put(reportedNameBytes)
        buffer.putShort(reasonBytes.size.toShort())
        if (reasonBytes.isNotEmpty()) buffer.put(reasonBytes)
        buffer.putLong(System.currentTimeMillis())
        return buffer.array()
    }

    data class Decoded(
        val reporterPeerID: String,
        val reporterNickname: String,
        val reportedPeerID: String,
        val reportedNickname: String,
        val reason: String?,
        val timestamp: Long
    )

    fun decode(data: ByteArray): Decoded? {
        if (data.size < 19) return null // minimum viable packet
        val buffer = ByteBuffer.wrap(data).order(ByteOrder.BIG_ENDIAN)

        val packetType = buffer.get()
        if (packetType != PACKET_TYPE) return null

        fun readString(): String? {
            if (buffer.remaining() < 2) return null
            val len = buffer.short.toInt() and 0xFFFF
            if (buffer.remaining() < len) return null
            val bytes = ByteArray(len)
            buffer.get(bytes)
            return String(bytes, Charsets.UTF_8)
        }

        val reporterPeerID = readString() ?: return null
        val reporterNickname = readString() ?: return null
        val reportedPeerID = readString() ?: return null
        val reportedNickname = readString() ?: return null
        val reason = readString()
        if (buffer.remaining() < 8) return null
        val timestamp = buffer.long

        return Decoded(
            reporterPeerID = reporterPeerID,
            reporterNickname = reporterNickname,
            reportedPeerID = reportedPeerID,
            reportedNickname = reportedNickname,
            reason = reason?.takeIf { it.isNotEmpty() },
            timestamp = timestamp
        )
    }
}
