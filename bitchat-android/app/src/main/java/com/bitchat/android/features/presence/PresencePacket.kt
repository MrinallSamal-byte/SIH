package com.bitchat.android.features.presence

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Presence update types sent over the mesh.
 */
enum class PresenceUpdateType(val code: Byte) {
    TYPING_START(0x01),
    TYPING_STOP(0x02),
    ONLINE_PING(0x03),
    OFFLINE(0x04);

    companion object {
        fun fromCode(code: Byte): PresenceUpdateType? = entries.firstOrNull { it.code == code }
    }
}

/**
 * Wire format for presence control packets.
 *
 * Format:
 * - 1 byte: packet type marker (0x30 = PRESENCE_UPDATE)
 * - 1 byte: subtype (PresenceUpdateType code)
 * - 2 bytes: sender peer ID length (big-endian)
 * - N bytes: sender peer ID (UTF-8)
 * - 8 bytes: timestamp (millis since epoch, big-endian)
 *
 * Compact packet — typically ~30 bytes.
 */
object PresencePacket {
    const val PACKET_TYPE: Byte = 0x30

    fun encode(senderPeerID: String, type: PresenceUpdateType): ByteArray {
        val peerIDBytes = senderPeerID.toByteArray(Charsets.UTF_8)
        val buffer = ByteBuffer.allocate(1 + 1 + 2 + peerIDBytes.size + 8)
            .order(ByteOrder.BIG_ENDIAN)
        buffer.put(PACKET_TYPE)
        buffer.put(type.code)
        buffer.putShort(peerIDBytes.size.toShort())
        buffer.put(peerIDBytes)
        buffer.putLong(System.currentTimeMillis())
        return buffer.array()
    }

    data class Decoded(
        val senderPeerID: String,
        val type: PresenceUpdateType,
        val timestamp: Long
    )

    fun decode(data: ByteArray): Decoded? {
        if (data.size < 12) return null
        val buffer = ByteBuffer.wrap(data).order(ByteOrder.BIG_ENDIAN)
        val packetType = buffer.get()
        if (packetType != PACKET_TYPE) return null
        val subtypeByte = buffer.get()
        val type = PresenceUpdateType.fromCode(subtypeByte) ?: return null
        val peerIDLength = buffer.short.toInt() and 0xFFFF
        if (buffer.remaining() < peerIDLength + 8) return null
        val peerIDBytes = ByteArray(peerIDLength)
        buffer.get(peerIDBytes)
        val senderPeerID = String(peerIDBytes, Charsets.UTF_8)
        val timestamp = buffer.long
        return Decoded(senderPeerID, type, timestamp)
    }
}
