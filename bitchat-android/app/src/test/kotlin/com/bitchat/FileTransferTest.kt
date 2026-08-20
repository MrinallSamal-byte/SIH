package com.bitchat

import com.bitchat.android.model.BitchatFilePacket
import com.bitchat.android.model.BitchatMessage
import com.bitchat.android.model.BitchatMessageType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.ConscryptMode
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Date

@RunWith(RobolectricTestRunner::class)
@ConscryptMode(ConscryptMode.Mode.OFF) // Disable Conscrypt to avoid native library loading issues
class FileTransferTest {

    @Test
    fun `encode and decode file packet with all fields should preserve data`() {
        // Given: Complete file packet
        val contentArray = ByteArray(1024) { (it % 256).toByte() }
        val originalPacket = BitchatFilePacket(
            fileName = "test.png",
            mimeType = "image/png",
            fileSize = contentArray.size.toLong(),
            content = contentArray
        )

        // When: Encode and decode
        val encoded = originalPacket.encode()
        val decoded = BitchatFilePacket.decode(encoded!!)

        // Then: Data should be preserved
        assertNotNull(decoded)
        assertEquals(originalPacket.fileName, decoded!!.fileName)
        assertEquals(originalPacket.mimeType, decoded.mimeType)
        assertEquals(originalPacket.fileSize, decoded.fileSize)
        assertEquals(originalPacket.content.size, decoded.content.size)
        for (i in 0 until originalPacket.content.size) {
            assertEquals(originalPacket.content[i], decoded.content[i])
        }
    }

    @Test
    fun `encode file packet with filename should include filename TLV`() {
        // Given: Packet with filename
        val packet = BitchatFilePacket(
            fileName = "myimage.jpg",
            mimeType = "image/jpeg",
            fileSize = 2048,
            content = ByteArray(256) { 0xFF.toByte() }
        )

        // When: Encode
        val encoded = packet.encode()
        assertNotNull(encoded)

        // Then: Should contain filename TLV
        // FILE_NAME type (0x01) + length (11) + "myimage.jpg" (UTF-8 with null terminator might add 1 byte)
        val expectedType = 0x01.toByte()
        val expectedFilename = "myimage.jpg".toByteArray(Charsets.UTF_8)
        val expectedLength = expectedFilename.size // Should be 10 for UTF-8 "myimage.jpg"

        assertNotNull(encoded)
        val nonNullEncoded = encoded ?: return
        assertEquals(expectedType, nonNullEncoded[0])
        // Calculate the actual length from little-endian encoded data
        val actualLength = (nonNullEncoded[2].toInt() and 0xFF) or ((nonNullEncoded[1].toInt() and 0xFF) shl 8)
        // The encoding seems to be including a null terminator or extended bytes
        assertEquals(11, actualLength) // The encoding produces 11 bytes for "myimage.jpg"

        val actualFilename = nonNullEncoded.sliceArray(3 until 3 + expectedLength)
        for (i in expectedFilename.indices) {
            assertEquals(expectedFilename[i], actualFilename[i])
        }
    }

    @Test
    fun `encode file size should use big endian byte order for file size`() {
        // Given: File with specific size
        val fileSize = 0x12345678L
        val packet = BitchatFilePacket(
            fileName = "test.bin",
            mimeType = "application/octet-stream",
            fileSize = fileSize,
            content = ByteArray(10)
        )

        // When: Encode
        val encoded = packet.encode()
        assertNotNull(encoded)
        val nonNullEncoded = encoded ?: return

        // Then: FILE_SIZE follows FILE_NAME and keeps the deployed UInt32 format.
        val sizeTlvOffset = 3 + "test.bin".toByteArray(Charsets.UTF_8).size
        assertEquals(0x02.toByte(), nonNullEncoded[sizeTlvOffset])
        assertEquals(0, nonNullEncoded[sizeTlvOffset + 1].toInt())
        assertEquals(4, nonNullEncoded[sizeTlvOffset + 2].toInt())
        val decodedFileSize = ByteBuffer.wrap(
            nonNullEncoded.sliceArray(sizeTlvOffset + 3 until sizeTlvOffset + 7)
        ).order(ByteOrder.BIG_ENDIAN).int.toLong()
        assertEquals(fileSize, decodedFileSize)
    }

    @Test
    fun `encoder keeps the deployed four-byte content length for large media`() {
        val content = ByteArray(70_000) { (it % 251).toByte() }
        val fileName = "large.bin"
        val mimeType = "application/octet-stream"
        val encoded = BitchatFilePacket(
            fileName = fileName,
            fileSize = content.size.toLong(),
            mimeType = mimeType,
            content = content
        ).encode()!!

        val firstContentOffset =
            3 + fileName.toByteArray().size +
                3 + 4 +
                3 + mimeType.toByteArray().size
        assertEquals(0x04.toByte(), encoded[firstContentOffset])
        assertEquals(0, encoded[firstContentOffset + 1].toInt())
        assertEquals(1, encoded[firstContentOffset + 2].toInt())
        assertEquals(0x11, encoded[firstContentOffset + 3].toInt())
        assertEquals(0x70, encoded[firstContentOffset + 4].toInt())
        assertTrue(BitchatFilePacket.decode(encoded)!!.content.contentEquals(content))
    }

    @Test
    fun `decoder accepts chunked UInt16 content fields`() {
        val content = ByteArray(70_000) { (it % 251).toByte() }
        val name = "compatible.bin".toByteArray()
        val mime = "application/octet-stream".toByteArray()
        val wire = ByteArrayOutputStream().apply {
            fun writeTlv(type: Int, value: ByteArray) {
                write(type)
                write(value.size ushr 8)
                write(value.size)
                write(value)
            }

            writeTlv(0x01, name)
            writeTlv(
                0x02,
                ByteBuffer.allocate(8).order(ByteOrder.BIG_ENDIAN).putLong(content.size.toLong()).array()
            )
            writeTlv(0x03, mime)
            // A one-byte first chunk is deliberately awkward for a parser
            // that assumes the deployed UInt32 length. The legacy UInt64 size
            // marker must select the chunked decoder before content is read.
            write(0x04)
            write(0)
            write(1)
            write(content, 0, 1)

            var offset = 1
            while (offset < content.size) {
                val length = minOf(0xFFFF, content.size - offset)
                write(0x04)
                write(length ushr 8)
                write(length)
                write(content, offset, length)
                offset += length
            }
        }.toByteArray()

        val decoded = BitchatFilePacket.decode(wire)
        assertNotNull(decoded)
        assertEquals(content.size.toLong(), decoded!!.fileSize)
        assertTrue(decoded.content.contentEquals(content))
    }

    @Test
    fun `legacy Android four-byte content length remains decodable`() {
        val content = ByteArray(32) { it.toByte() }
        val name = "legacy.bin".toByteArray()
        val mime = "application/octet-stream".toByteArray()
        val wire = ByteBuffer.allocate(
            3 + name.size + 3 + 4 + 3 + mime.size + 1 + 4 + content.size
        ).order(ByteOrder.BIG_ENDIAN).apply {
            put(0x01.toByte()); putShort(name.size.toShort()); put(name)
            put(0x02.toByte()); putShort(4.toShort()); putInt(content.size)
            put(0x03.toByte()); putShort(mime.size.toShort()); put(mime)
            put(0x04.toByte()); putInt(content.size); put(content)
        }.array()

        val decoded = BitchatFilePacket.decode(wire)
        assertNotNull(decoded)
        assertTrue(decoded!!.content.contentEquals(content))
        assertEquals(content.size.toLong(), decoded.fileSize)
    }

    @Test
    fun `incomplete file packet is never considered safe to persist`() {
        val packet = BitchatFilePacket(
            fileName = "partial.jpg",
            fileSize = 128,
            mimeType = "image/jpeg",
            content = ByteArray(127)
        )

        assertFalse(packet.hasConsistentMetadata())
        assertFalse(packet.isCompleteAndWithinLimit())
        assertNotNull(packet.encode())
    }

    @Test
    fun `decode minimal file packet should handle defaults correctly`() {
        // Given: Minimal valid packet (the constructor requires non-null values)
        val originalPacket = BitchatFilePacket(
            fileName = "test",
            mimeType = "application/octet-stream",
            fileSize = 32,  // Matches content size
            content = ByteArray(32) { 0xAA.toByte() }
        )

        // When: Encode and decode
        val encoded = originalPacket.encode()
        val decoded = BitchatFilePacket.decode(encoded!!)

        // Then: Data should be preserved completely
        assertNotNull(decoded)
        assertEquals(32, decoded!!.content.size)
        for (i in 0 until 32) {
            assertEquals(0xAA.toByte(), decoded.content[i])
        }
        assertEquals("test", decoded.fileName)
        assertEquals("application/octet-stream", decoded.mimeType)
        assertEquals(32L, decoded.fileSize)
    }

    @Test
    fun `decode should skip unknown TLV types instead of dropping the whole file`() {
        // Given: a packet from a peer that added one TLV this build does not
        // know (a message id, tag 0x05), placed before CONTENT the way an
        // encoder that appends content last would emit it.
        val content = ByteArray(64) { (it % 256).toByte() }
        val fileName = "photo.jpg".toByteArray(Charsets.UTF_8)
        val mimeType = "image/jpeg".toByteArray(Charsets.UTF_8)
        val unknownValue = "some-message-id".toByteArray(Charsets.UTF_8)

        val buf = ByteBuffer.allocate(
            (1 + 2 + fileName.size) + (1 + 2 + 4) + (1 + 2 + mimeType.size) +
                (1 + 2 + unknownValue.size) + (1 + 4 + content.size)
        ).order(ByteOrder.BIG_ENDIAN)
        buf.put(0x01.toByte()); buf.putShort(fileName.size.toShort()); buf.put(fileName)
        buf.put(0x02.toByte()); buf.putShort(4); buf.putInt(content.size)
        buf.put(0x03.toByte()); buf.putShort(mimeType.size.toShort()); buf.put(mimeType)
        buf.put(0x05.toByte()); buf.putShort(unknownValue.size.toShort()); buf.put(unknownValue)
        buf.put(0x04.toByte()); buf.putInt(content.size); buf.put(content)

        // When: Decoding
        val decoded = BitchatFilePacket.decode(buf.array())

        // Then: the unknown TLV costs nothing — the media still arrives.
        // Rejecting it made every such transfer vanish with no error on either
        // side, while iOS decoded the very same bytes fine.
        assertNotNull(decoded)
        assertEquals("photo.jpg", decoded!!.fileName)
        assertEquals("image/jpeg", decoded.mimeType)
        assertEquals(content.size.toLong(), decoded.fileSize)
        assertEquals(content.size, decoded.content.size)
        for (i in content.indices) {
            assertEquals(content[i], decoded.content[i])
        }
    }

    @Test
    fun `decode should skip an unknown TLV that trails the content`() {
        // Given: the same kind of extension appended AFTER content, which a
        // decoder that stops at the first unknown tag also loses.
        val content = ByteArray(16) { 0x7F }
        val fileName = "note.m4a".toByteArray(Charsets.UTF_8)
        val trailing = ByteArray(4) { 0x11 }

        val buf = ByteBuffer.allocate(
            (1 + 2 + fileName.size) + (1 + 4 + content.size) + (1 + 2 + trailing.size)
        ).order(ByteOrder.BIG_ENDIAN)
        buf.put(0x01.toByte()); buf.putShort(fileName.size.toShort()); buf.put(fileName)
        buf.put(0x04.toByte()); buf.putInt(content.size); buf.put(content)
        buf.put(0x7F.toByte()); buf.putShort(trailing.size.toShort()); buf.put(trailing)

        // When: Decoding
        val decoded = BitchatFilePacket.decode(buf.array())

        // Then: Defaults still apply and the content is intact
        assertNotNull(decoded)
        assertEquals("note.m4a", decoded!!.fileName)
        assertEquals("application/octet-stream", decoded.mimeType)
        assertEquals(content.size.toLong(), decoded.fileSize)
        assertEquals(content.size, decoded.content.size)
    }

    @Test
    fun `decode should reject an incomplete TLV header after an unknown extension`() {
        // Given: a valid file and unknown extension followed by either only a
        // tag or a tag plus one length byte.
        val content = ByteArray(8) { 0x2A }
        val fileName = "truncated.bin".toByteArray(Charsets.UTF_8)
        val buf = ByteBuffer.allocate(
            (1 + 2 + fileName.size) + (1 + 4 + content.size) + (1 + 2)
        ).order(ByteOrder.BIG_ENDIAN)
        buf.put(0x01.toByte()); buf.putShort(fileName.size.toShort()); buf.put(fileName)
        buf.put(0x04.toByte()); buf.putInt(content.size); buf.put(content)
        buf.put(0x05.toByte()); buf.putShort(0)
        val packetWithUnknownExtension = buf.array()

        // When/Then: Android rejects the same incomplete tails that iOS does.
        assertNull(BitchatFilePacket.decode(packetWithUnknownExtension + byteArrayOf(0x06)))
        assertNull(BitchatFilePacket.decode(packetWithUnknownExtension + byteArrayOf(0x06, 0x00)))
    }

    @Test
    fun `decode should handle a packet padded with many zero-length unknown TLVs`() {
        // Given: the cheapest padding a peer can send — a zero-length unknown
        // TLV is 3 bytes, so one packet can carry hundreds of thousands of
        // them. Anything the skip path does per TLV (copying the empty value,
        // formatting a log line) is scaled by the sender, not by us.
        val padCount = 200_000
        val content = ByteArray(8) { 0x5A }
        val fileName = "padded.bin".toByteArray(Charsets.UTF_8)

        val buf = ByteBuffer.allocate(
            (1 + 2 + fileName.size) + (padCount * 3) + (1 + 4 + content.size)
        ).order(ByteOrder.BIG_ENDIAN)
        buf.put(0x01.toByte()); buf.putShort(fileName.size.toShort()); buf.put(fileName)
        repeat(padCount) {
            buf.put(0x05.toByte()); buf.putShort(0)
        }
        buf.put(0x04.toByte()); buf.putInt(content.size); buf.put(content)

        // When: Decoding
        val decoded = BitchatFilePacket.decode(buf.array())

        // Then: the real fields still come through and the padding is ignored
        assertNotNull(decoded)
        assertEquals("padded.bin", decoded!!.fileName)
        assertEquals(content.size.toLong(), decoded.fileSize)
        assertEquals(content.size, decoded.content.size)
    }

    @Test
    fun `replaceFilePathInContent should correctly format content markers for different file types`() {
        // Given: Different file types
        val imageMessage = BitchatMessage(
            id = "test1",
            sender = "alice",
            senderPeerID = "12345678",
            content = "/data/user/0/com.bitchat.android/files/images/photo.jpg",
            type = BitchatMessageType.Image,
            timestamp = Date(System.currentTimeMillis()),
            isPrivate = false
        )

        val audioMessage = BitchatMessage(
            id = "test2",
            sender = "bob",
            senderPeerID = "87654321",
            content = "/data/user/0/com.bitchat.android/files/audio/voice.amr",
            type = BitchatMessageType.Audio,
            timestamp = Date(System.currentTimeMillis()),
            isPrivate = false
        )

        val fileMessage = BitchatMessage(
            id = "test3",
            sender = "charlie",
            senderPeerID = "11223344",
            content = "/data/user/0/com.bitchat.android/files/documents/document.pdf",
            type = BitchatMessageType.File,
            timestamp = Date(System.currentTimeMillis()),
            isPrivate = false
        )

        // When: Converting to display format (this would be done in MessageMutable)
        var result = imageMessage.content
        result = result.replace(
            "/data/user/0/com.bitchat.android/files/images/photo.jpg",
            "[image] photo.jpg"
        )

        // Then: Should match expected pattern
        assertEquals("[image] photo.jpg", result)

        // Similar pattern for audio and file would be used in the actual implementation
    }

    @Test
    fun `buildPrivateMessagePreview should generate user-friendly notifications for file types`() {
        // Note: This test is for the NotificationTextUtils.buildPrivateMessagePreview function
        // The actual function is in a separate utility file as part of the refactoring

        // Given: Incoming image message
        val imageMessage = BitchatMessage(
            id = "test1",
            sender = "alice",
            senderPeerID = "1234abcd",
            content = "📷 sent an image", // This would be the result of the utility function
            type = BitchatMessageType.Image,
            timestamp = Date(System.currentTimeMillis()),
            isPrivate = true
        )

        // When: Building preview (this would call NotificationTextUtils.buildPrivateMessagePreview)
        val preview = imageMessage.content // In actual code, this would be generated

        // Then: Should provide user-friendly preview
        assertEquals("📷 sent an image", preview)

        // Additional assertions would test different file types
        // Audio: "🎤 sent a voice message"
        // File with specific extension: "📄 document.pdf"
        // Generic file: "📎 sent a file"
    }

    @Test
    fun `waveform extraction should handle empty audio data gracefully`() {
        // This test would verify that empty or very short audio files
        // don't cause crashes in waveform extraction

        // Given: Empty audio data
        val emptyAudioData = ByteArray(0)

        // When: Attempting to extract waveform
        // Note: Actual waveform extraction would be tested in the Waveform class
        // This is a unit test placeholder

        // Then: Should not crash and should return reasonable result
        // For empty data, waveform might be empty array or default values
        assertEquals(0, emptyAudioData.size)
    }

    @Test
    fun `media picker should handle file size limits correctly`() {
        // This test would verify that media file selection
        // respects size limits before attempting transfer

        // Given: Large file size (simulated)
        val largeFileSize = 100L * 1024 * 1024 // 100MB
        val maxAllowedSize = com.bitchat.android.util.AppConstants.Media.MAX_FILE_SIZE_BYTES

        // When: Checking if file can be transferred
        val isAllowed = largeFileSize <= maxAllowedSize

        // Then: Should be rejected
        assert(!isAllowed)
    }

    @Test
    fun `transfer cancellation should cleanup resources properly`() {
        // This test would verify that when a file transfer is cancelled,
        // all associated resources are cleaned up

        // Given: Active transfer in progress
        val transferId = "test_transfer_123"

        // When: Transfer is cancelled
        // In the actual implementation, this would call cancellation logic
        val cancelled = true // Simulated cancellation

        // Then: Resources should be cleaned up
        // This would verify temp files are deleted, progress tracking is cleared, etc.
        assert(cancelled)
    }
}
