package com.bitchat.android.model

import android.util.Log
import com.bitchat.android.util.AppConstants
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * TLV-encoded file-transfer payload.
 *
 * Metadata fields use a two-byte, big-endian length. The deployed CONTENT
 * field uses a four-byte length so files larger than UInt16 remain one logical
 * payload before transport fragmentation. The decoder also accepts a
 * chunked-UInt16 CONTENT representation from compatible peers.
 */
data class BitchatFilePacket(
    val fileName: String,
    val fileSize: Long,
    val mimeType: String,
    val content: ByteArray
) {
    private enum class TLVType(val value: UByte) {
        FILE_NAME(0x01u),
        FILE_SIZE(0x02u),
        MIME_TYPE(0x03u),
        CONTENT(0x04u);

        companion object {
            fun from(value: UByte): TLVType? = entries.firstOrNull { it.value == value }
        }
    }

    /** True when the packet declaration exactly describes its in-memory bytes. */
    fun hasConsistentMetadata(): Boolean =
        fileName.isNotBlank() &&
            fileSize >= 0L &&
            fileSize == content.size.toLong()

    /**
     * A decoded packet is safe to persist or send through the media UI only
     * when its declared file size matches the recovered bytes and it stays
     * within the product media limit.
     */
    fun isCompleteAndWithinLimit(): Boolean =
        hasConsistentMetadata() && fileSize <= AppConstants.Media.MAX_FILE_SIZE_BYTES

    fun encode(): ByteArray? = try {
        val nameBytes = fileName.toByteArray(Charsets.UTF_8)
        val mimeBytes = mimeType.toByteArray(Charsets.UTF_8)
        if (nameBytes.size > MAX_TLV_VALUE_BYTES || mimeBytes.size > MAX_TLV_VALUE_BYTES) {
            Log.w(TAG, "File metadata exceeds the UInt16 TLV limit")
            return null
        }
        val initialCapacity =
            3 + nameBytes.size +
                3 + LEGACY_FILE_SIZE_BYTES +
                3 + mimeBytes.size +
                1 + CONTENT_LENGTH_BYTES + content.size
        val output = ByteArrayOutputStream(initialCapacity)

        writeTlv(output, TLVType.FILE_NAME, nameBytes)
        writeTlv(
            output,
            TLVType.FILE_SIZE,
            ByteBuffer.allocate(LEGACY_FILE_SIZE_BYTES)
                .order(ByteOrder.BIG_ENDIAN)
                .putInt(fileSize.toInt())
                .array()
        )
        writeTlv(output, TLVType.MIME_TYPE, mimeBytes)
        output.write(TLVType.CONTENT.value.toInt())
        writeUInt32(output, content.size)
        output.write(content)

        output.toByteArray()
    } catch (error: Exception) {
        Log.e(TAG, "File packet encoding failed", error)
        null
    }

    companion object {
        private const val TAG = "BitchatFilePacket"
        private const val MAX_TLV_VALUE_BYTES = 0xFFFF
        private const val LEGACY_FILE_SIZE_BYTES = 4
        private const val FILE_SIZE_BYTES = 8
        private const val CONTENT_LENGTH_BYTES = 4

        /**
         * The deployed format uses a four-byte CONTENT length. The only
         * unambiguous legacy marker is an eight-byte FILE_SIZE field, whose
         * peers used repeated UInt16 CONTENT fields. Select that parser before
         * content is interpreted so a normal packet can never be mistaken for
         * chunked content merely because its first bytes look like a length.
         */
        fun decode(data: ByteArray): BitchatFilePacket? {
            return if (hasLegacyFileSizeMarker(data)) {
                decodeWithContentLength(data, contentLengthBytes = 2)
            } else {
                decodeWithContentLength(data, contentLengthBytes = CONTENT_LENGTH_BYTES)
            }
        }

        private fun hasLegacyFileSizeMarker(data: ByteArray): Boolean {
            var offset = 0
            while (offset < data.size) {
                if (data.size - offset < 3) return false
                val type = TLVType.from(data[offset].toUByte())
                offset += 1
                // Metadata fields, including unknown extensions, always have
                // the standard UInt16 length. Stop at CONTENT because its
                // width is the very format choice this helper is making.
                if (type == TLVType.CONTENT) return false
                val length = readUInt16(data, offset)
                offset += 2
                if (length > data.size - offset) return false
                if (type == TLVType.FILE_SIZE) return length == FILE_SIZE_BYTES
                offset += length
            }
            return false
        }

        private fun decodeWithContentLength(
            data: ByteArray,
            contentLengthBytes: Int
        ): BitchatFilePacket? = try {
            var offset = 0
            var name: String? = null
            var size: Long? = null
            var mime: String? = null
            var sawContent = false
            val content = ByteArrayOutputStream()

            while (offset < data.size) {
                if (data.size - offset < 3) return null

                val type = TLVType.from(data[offset].toUByte())
                offset += 1
                val lengthBytes = if (type == TLVType.CONTENT) contentLengthBytes else 2
                if (data.size - offset < lengthBytes) return null

                val length = when (lengthBytes) {
                    2 -> readUInt16(data, offset)
                    4 -> readUInt32(data, offset) ?: return null
                    else -> return null
                }
                offset += lengthBytes
                if (length > data.size - offset) return null

                when (type) {
                    TLVType.FILE_NAME -> name = String(data, offset, length, Charsets.UTF_8)
                    TLVType.FILE_SIZE -> {
                        val declaredSize = when (length) {
                            4 -> ByteBuffer.wrap(data, offset, length)
                                .order(ByteOrder.BIG_ENDIAN)
                                .int
                                .toLong()
                            FILE_SIZE_BYTES -> ByteBuffer.wrap(data, offset, length)
                                .order(ByteOrder.BIG_ENDIAN)
                                .long
                            else -> return null
                        }
                        if (declaredSize !in 0L..AppConstants.Media.MAX_FILE_SIZE_BYTES) return null
                        size = declaredSize
                    }
                    TLVType.MIME_TYPE -> mime = String(data, offset, length, Charsets.UTF_8)
                    TLVType.CONTENT -> {
                        if (
                            length.toLong() >
                                AppConstants.Media.MAX_FILE_SIZE_BYTES - content.size().toLong()
                        ) {
                            return null
                        }
                        content.write(data, offset, length)
                        sawContent = true
                    }
                    null -> Unit // Unknown extensions retain the standard UInt16 length.
                }
                offset += length
            }

            if (!sawContent) return null
            val contentBytes = content.toByteArray()
            BitchatFilePacket(
                fileName = name ?: return null,
                fileSize = size ?: contentBytes.size.toLong(),
                mimeType = mime ?: "application/octet-stream",
                content = contentBytes
            )
        } catch (error: Exception) {
            Log.w(TAG, "File packet decoding failed", error)
            null
        }

        private fun writeTlv(output: ByteArrayOutputStream, type: TLVType, value: ByteArray) {
            output.write(type.value.toInt())
            writeUInt16(output, value.size)
            output.write(value)
        }

        private fun writeUInt16(output: ByteArrayOutputStream, value: Int) {
            output.write((value ushr 8) and 0xFF)
            output.write(value and 0xFF)
        }

        private fun writeUInt32(output: ByteArrayOutputStream, value: Int) {
            output.write((value ushr 24) and 0xFF)
            output.write((value ushr 16) and 0xFF)
            output.write((value ushr 8) and 0xFF)
            output.write(value and 0xFF)
        }

        private fun readUInt16(data: ByteArray, offset: Int): Int =
            ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)

        private fun readUInt32(data: ByteArray, offset: Int): Int? {
            val value =
                ((data[offset].toLong() and 0xFF) shl 24) or
                    ((data[offset + 1].toLong() and 0xFF) shl 16) or
                    ((data[offset + 2].toLong() and 0xFF) shl 8) or
                    (data[offset + 3].toLong() and 0xFF)
            return value.takeIf { it <= Int.MAX_VALUE }?.toInt()
        }
    }
}
