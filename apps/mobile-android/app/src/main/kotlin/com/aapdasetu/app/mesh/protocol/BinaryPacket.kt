package com.aapdasetu.app.mesh.protocol

import java.io.ByteArrayOutputStream
import java.util.zip.Deflater
import java.util.zip.Inflater

/**
 * V1 binary packet codec, byte-for-byte matching bitchat's
 * BinaryProtocol.swift (encode(packet:) / decode(_:)):
 *
 *   [version:1][type:1][ttl:1][timestamp:8 BE][flags:1][payloadLength:2 BE]
 *   [senderID:8][recipientID:8 if hasRecipient]
 *   [originalSize:2 BE if isCompressed][payload bytes][signature:64 if hasSignature]
 *
 * payloadLength covers the payload bytes AND, when compressed, the 2-byte
 * originalSize prefix that precedes them - it is not just the raw payload
 * size. This was confirmed by reading the actual vendored source, not
 * guessed.
 *
 * SCOPE - what this does NOT port from the real source:
 *   - V2's 16-byte header / 4-byte length fields
 *   - Flags.hasRoute (0x08) source-route encoding, v2+ only
 *   - Flags.isRSR (0x10) - bit value confirmed, exact semantics not
 *     investigated
 *   - MessagePadding's block-size padding step
 * Verify against bitchat/localPackages/BitFoundation/Sources/BitFoundation/BinaryProtocol.swift
 * in this repo before depending on this for multi-hop routing or padded
 * traffic analysis resistance.
 */
object BinaryPacket {
    const val VERSION_1: Byte = 1

    private object Flags {
        const val HAS_RECIPIENT = 0x01
        const val HAS_SIGNATURE = 0x02
        const val IS_COMPRESSED = 0x04
        // Confirmed to exist on the wire but not implemented here:
        const val HAS_ROUTE = 0x08 // v2+ only
        const val IS_RSR = 0x10
    }

    /**
     * Note: this is a data class containing ByteArray properties, so the
     * generated equals()/hashCode() use reference equality for [payload]
     * and [signature] (a standard Kotlin data-class-with-array caveat) -
     * don't rely on `==` to compare packet content.
     */
    data class Packet(
        val version: Byte = VERSION_1,
        val type: Byte,
        val ttl: Byte,
        val timestamp: Long,
        val senderId: PeerId,
        val recipientId: PeerId? = null,
        val payload: ByteArray,
        val signature: ByteArray? = null
    ) {
        init {
            require(signature == null || signature.size == MeshConstants.SIGNATURE_SIZE) {
                "signature must be ${MeshConstants.SIGNATURE_SIZE} bytes, was ${signature?.size}"
            }
        }
    }

    fun encode(packet: Packet): ByteArray {
        require(packet.version == VERSION_1) {
            "BinaryPacket only supports V1 (got version=${packet.version}) - see the scope note in this file's class doc"
        }
        val shouldAttemptCompression = packet.payload.size > MeshConstants.COMPRESSION_THRESHOLD
        val compressed = if (shouldAttemptCompression) deflate(packet.payload) else null
        val useCompression = compressed != null && compressed.size < packet.payload.size

        var flags = 0
        if (packet.recipientId != null) flags = flags or Flags.HAS_RECIPIENT
        if (packet.signature != null) flags = flags or Flags.HAS_SIGNATURE
        if (useCompression) flags = flags or Flags.IS_COMPRESSED

        val payloadBytes = if (useCompression) compressed!! else packet.payload
        val payloadSectionSize = payloadBytes.size + if (useCompression) 2 else 0

        val out = ByteArrayOutputStream()
        out.write(packet.version.toInt())
        out.write(packet.type.toInt())
        out.write(packet.ttl.toInt())
        writeUInt64BE(out, packet.timestamp)
        out.write(flags)
        writeUInt16BE(out, payloadSectionSize)
        out.write(padOrTruncate(packet.senderId.bytes, MeshConstants.SENDER_ID_SIZE))
        packet.recipientId?.let { out.write(padOrTruncate(it.bytes, MeshConstants.RECIPIENT_ID_SIZE)) }
        if (useCompression) writeUInt16BE(out, packet.payload.size)
        out.write(payloadBytes)
        packet.signature?.let { out.write(it) }
        return out.toByteArray()
    }

    /** Returns null on truncated/malformed input rather than throwing. */
    fun decode(data: ByteArray): Packet? {
        if (data.size < MeshConstants.HEADER_SIZE_V1) return null
        var offset = 0

        val version = data[offset]; offset += 1
        if (version != VERSION_1) return null // V2+ has a different header layout - see class doc, not parseable here
        val type = data[offset]; offset += 1
        val ttl = data[offset]; offset += 1
        val timestamp = readUInt64BE(data, offset); offset += 8
        val flags = data[offset].toInt() and 0xFF; offset += 1
        val payloadSectionSize = readUInt16BE(data, offset); offset += 2

        val hasRecipient = (flags and Flags.HAS_RECIPIENT) != 0
        val hasSignature = (flags and Flags.HAS_SIGNATURE) != 0
        val isCompressed = (flags and Flags.IS_COMPRESSED) != 0
        // Flags.HAS_ROUTE / Flags.IS_RSR intentionally unread - v2/RSR not supported, see class doc.

        if (offset + MeshConstants.SENDER_ID_SIZE > data.size) return null
        val senderId = PeerId.fromBytes(data.copyOfRange(offset, offset + MeshConstants.SENDER_ID_SIZE))
        offset += MeshConstants.SENDER_ID_SIZE

        var recipientId: PeerId? = null
        if (hasRecipient) {
            if (offset + MeshConstants.RECIPIENT_ID_SIZE > data.size) return null
            recipientId = PeerId.fromBytes(data.copyOfRange(offset, offset + MeshConstants.RECIPIENT_ID_SIZE))
            offset += MeshConstants.RECIPIENT_ID_SIZE
        }

        var originalSize = -1
        if (isCompressed) {
            if (offset + 2 > data.size) return null
            originalSize = readUInt16BE(data, offset)
            offset += 2
        }

        val compressedPayloadSize = payloadSectionSize - if (isCompressed) 2 else 0
        if (compressedPayloadSize < 0 || offset + compressedPayloadSize > data.size) return null
        val rawPayload = data.copyOfRange(offset, offset + compressedPayloadSize)
        offset += compressedPayloadSize

        val payload = if (isCompressed) inflate(rawPayload, originalSize) else rawPayload

        var signature: ByteArray? = null
        if (hasSignature) {
            if (offset + MeshConstants.SIGNATURE_SIZE > data.size) return null
            signature = data.copyOfRange(offset, offset + MeshConstants.SIGNATURE_SIZE)
        }

        return Packet(
            version = version,
            type = type,
            ttl = ttl,
            timestamp = timestamp,
            senderId = senderId,
            recipientId = recipientId,
            payload = payload,
            signature = signature
        )
    }

    private fun padOrTruncate(bytes: ByteArray, size: Int): ByteArray {
        if (bytes.size == size) return bytes
        val result = ByteArray(size)
        System.arraycopy(bytes, 0, result, 0, minOf(bytes.size, size))
        return result
    }

    private fun writeUInt64BE(out: ByteArrayOutputStream, value: Long) {
        for (i in 7 downTo 0) out.write(((value ushr (i * 8)) and 0xFF).toInt())
    }

    private fun writeUInt16BE(out: ByteArrayOutputStream, value: Int) {
        out.write((value ushr 8) and 0xFF)
        out.write(value and 0xFF)
    }

    private fun readUInt64BE(data: ByteArray, offset: Int): Long {
        var result = 0L
        for (i in 0 until 8) result = (result shl 8) or (data[offset + i].toLong() and 0xFF)
        return result
    }

    private fun readUInt16BE(data: ByteArray, offset: Int): Int =
        ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)

    private fun deflate(input: ByteArray): ByteArray {
        val deflater = Deflater()
        deflater.setInput(input)
        deflater.finish()
        val out = ByteArrayOutputStream(input.size)
        val buffer = ByteArray(1024)
        while (!deflater.finished()) {
            val count = deflater.deflate(buffer)
            out.write(buffer, 0, count)
        }
        deflater.end()
        return out.toByteArray()
    }

    private fun inflate(input: ByteArray, expectedSize: Int): ByteArray {
        val inflater = Inflater()
        inflater.setInput(input)
        val out = ByteArrayOutputStream(if (expectedSize > 0) expectedSize else input.size * 3)
        val buffer = ByteArray(1024)
        while (!inflater.finished()) {
            val count = inflater.inflate(buffer)
            if (count == 0 && inflater.needsInput()) break
            out.write(buffer, 0, count)
        }
        inflater.end()
        return out.toByteArray()
    }
}
