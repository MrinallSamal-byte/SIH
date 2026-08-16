package com.bitchat.android.features.file

import com.bitchat.android.model.BitchatFilePacket
import com.bitchat.android.mesh.FragmentManager
import com.bitchat.android.mesh.MeshPacketUtils
import com.bitchat.android.protocol.BitchatPacket
import com.bitchat.android.protocol.MessageType
import com.bitchat.android.util.AppConstants
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.Random

@RunWith(RobolectricTestRunner::class)
class MediaTransfer5MBTest {

    private val testPeerID = "1122334455667788"

    @Test
    fun testFilePacket5MBEncodeDecode() {
        val fiveMB = 5 * 1024 * 1024
        val content = ByteArray(fiveMB)
        Random(12345).nextBytes(content)

        val filePacket = BitchatFilePacket(
            fileName = "large_image.jpg",
            fileSize = fiveMB.toLong(),
            mimeType = "image/jpeg",
            content = content
        )

        val encoded = filePacket.encode()
        assertNotNull("5 MB file packet should encode successfully", encoded)

        val decoded = BitchatFilePacket.decode(encoded!!)
        assertNotNull("5 MB file packet should decode successfully", decoded)
        assertEquals("large_image.jpg", decoded!!.fileName)
        assertEquals(fiveMB.toLong(), decoded.fileSize)
        assertEquals("image/jpeg", decoded.mimeType)
        assertArrayEquals("Content bytes must match exactly", content, decoded.content)
    }

    @Test
    fun testFilePacket5MBFragmentationAndReassembly() {
        val size = 5 * 1024 * 1024 // 5 MB
        val content = ByteArray(size)
        Random(67890).nextBytes(content)

        val filePacket = BitchatFilePacket(
            fileName = "voice_memo.m4a",
            fileSize = size.toLong(),
            mimeType = "audio/m4a",
            content = content
        )

        val payload = filePacket.encode()
        assertNotNull(payload)

        val senderPacket = BitchatPacket(
            version = 2u,
            type = MessageType.FILE_TRANSFER.value,
            senderID = MeshPacketUtils.hexStringToByteArray(testPeerID),
            recipientID = null,
            timestamp = System.currentTimeMillis().toULong(),
            payload = payload!!,
            signature = null,
            ttl = 7u
        )

        val senderFragmentManager = FragmentManager()
        val fragments = senderFragmentManager.createFragments(
            senderPacket,
            AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID
        )

        assertTrue("Should create fragments for 5 MB payload", fragments.isNotEmpty())
        assertTrue("Fragments count should be within MAX_FRAGMENTS_PER_ID (${fragments.size} <= ${AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID})",
            fragments.size <= AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID)

        // Verify fragment size constraint (MTU <= 512 bytes)
        for (f in fragments) {
            val binary = f.toBinaryData()
            assertNotNull(binary)
            assertTrue("Each fragment binary size (${binary!!.size}) must not exceed BLE MTU 512", binary.size <= 512)
        }

        // Simulate receiver reassembly
        val receiverFragmentManager = FragmentManager()
        var reassembledPacket: BitchatPacket? = null

        for (fragment in fragments) {
            val result = receiverFragmentManager.handleFragment(fragment)
            if (result != null) {
                reassembledPacket = result
            }
        }

        assertNotNull("Receiver should successfully reassemble 5 MB packet from all fragments", reassembledPacket)
        assertEquals(MessageType.FILE_TRANSFER.value, reassembledPacket!!.type)

        val decodedFile = BitchatFilePacket.decode(reassembledPacket.payload)
        assertNotNull("Reassembled packet payload should decode back into BitchatFilePacket", decodedFile)
        assertEquals("voice_memo.m4a", decodedFile!!.fileName)
        assertEquals(size.toLong(), decodedFile.fileSize)
        assertEquals("audio/m4a", decodedFile.mimeType)
        assertArrayEquals("Reassembled content must match original 5 MB data byte-for-byte", content, decodedFile.content)
    }

    @Test
    fun testAppConstantsMediaLimitAllows5MB() {
        val fiveMB = 5L * 1024L * 1024L
        assertEquals(fiveMB, AppConstants.Media.MAX_FILE_SIZE_BYTES)
        assertTrue(AppConstants.Fragmentation.MAX_FRAGMENT_TOTAL_BYTES >= fiveMB)
        assertTrue(AppConstants.Fragmentation.MAX_GLOBAL_FRAGMENT_TOTAL_BYTES >= fiveMB * 2)
    }
}
