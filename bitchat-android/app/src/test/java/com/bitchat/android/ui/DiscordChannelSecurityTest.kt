package com.bitchat.android.ui

import com.bitchat.android.model.BitchatMessage
import org.junit.Assert.*
import org.junit.Test
import java.security.MessageDigest
import java.util.*
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Verification test suite for Discord-style channels and End-to-End Encryption (E2EE) security.
 */
class DiscordChannelSecurityTest {

    private fun deriveTestKey(password: String, channelName: String): SecretKeySpec {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val salt = channelName.lowercase().toByteArray(Charsets.UTF_8)
        val spec = PBEKeySpec(password.toCharArray(), salt, 100000, 256)
        val secretKey = factory.generateSecret(spec)
        return SecretKeySpec(secretKey.encoded, "AES")
    }

    private fun encryptTestMessage(content: String, key: SecretKeySpec): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val encryptedData = cipher.doFinal(content.toByteArray(Charsets.UTF_8))
        val combined = ByteArray(iv.size + encryptedData.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(encryptedData, 0, combined, iv.size, encryptedData.size)
        return combined
    }

    private fun decryptTestMessage(encryptedData: ByteArray, key: SecretKeySpec): String? {
        if (encryptedData.size < 16) return null
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val iv = encryptedData.sliceArray(0..11)
            val ciphertext = encryptedData.sliceArray(12 until encryptedData.size)
            val gcmSpec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec)
            val decrypted = cipher.doFinal(ciphertext)
            String(decrypted, Charsets.UTF_8)
        } catch (e: Exception) {
            null
        }
    }

    @Test
    fun testDiscordHierarchyStructure() {
        val campusHub = DiscordHub(
            id = ChannelManager.HUB_CAMPUS,
            name = "Campus Main Hub",
            icon = "🎓",
            description = "Campus-wide Offline Mesh Network & Student Announcements",
            isEmergency = false
        )
        assertEquals("🎓", campusHub.icon)
        assertFalse(campusHub.isEmergency)

        val broadcastCategory = DiscordCategory(
            id = ChannelManager.CAT_CAMPUS_BROADCAST,
            hubId = ChannelManager.HUB_CAMPUS,
            title = "📢 CAMPUS BROADCASTS",
            type = ChannelCategoryType.BROADCAST
        )
        assertEquals(ChannelCategoryType.BROADCAST, broadcastCategory.type)

        val announcementChannel = DiscordChannel(
            id = "#campus-announcements",
            name = "campus-announcements",
            topic = "📢 College news, timetable changes, exam alerts & notices",
            categoryId = ChannelManager.CAT_CAMPUS_BROADCAST,
            hubId = ChannelManager.HUB_CAMPUS,
            isEmergency = false
        )
        assertEquals("#campus-announcements", announcementChannel.id)
        assertFalse(announcementChannel.isEmergency)
    }

    @Test
    fun testChannelE2EE_DecryptionByAuthorizedNodeOnly() {
        val channel = "#batch-2026-cse"
        val correctPassword = "CampusCSEBatchSecretPass2026!"
        val wrongPassword = "OtherStudentGuessingWrongPassword"

        val senderKey = deriveTestKey(correctPassword, channel)
        val recipientKey = deriveTestKey(correctPassword, channel)
        val attackerKey = deriveTestKey(wrongPassword, channel)

        val sensitiveMessage = "PRIVATE: End-Sem Exam question bank solutions uploaded to room 302."

        // 1. Sender (Node A) encrypts message
        val ciphertext = encryptTestMessage(sensitiveMessage, senderKey)
        assertNotNull(ciphertext)
        assertTrue("Ciphertext must include 12-byte IV + payload + auth tag", ciphertext.size >= 16)

        // 2. Intermediary / Non-member student (Node B) attempts decryption without matching key -> MUST FAIL
        val unauthorizedDecrypted = decryptTestMessage(ciphertext, attackerKey)
        assertNull("Intermediate relay phone without key cannot decrypt message", unauthorizedDecrypted)

        // 3. Authorized Batch Member (Node C) decrypts message with matching channel key -> MUST SUCCEED
        val authorizedDecrypted = decryptTestMessage(ciphertext, recipientKey)
        assertNotNull("Authorized recipient must decrypt correctly", authorizedDecrypted)
        assertEquals(sensitiveMessage, authorizedDecrypted)
    }

    @Test
    fun testEncryptedChannelMessage_BinaryProtocolEncoding() {
        val channel = "#core-project-team"
        val key = deriveTestKey("ProjectTeamAlpha2026", channel)
        val plaintext = "Capstone Project PPT is ready. Meet in Lab 4 at 5 PM."
        val ciphertext = encryptTestMessage(plaintext, key)

        val message = BitchatMessage(
            id = UUID.randomUUID().toString(),
            sender = "AaravSharma",
            content = "",
            timestamp = Date(),
            senderPeerID = "aabbccddeeff0011",
            channel = channel,
            encryptedContent = ciphertext,
            isEncrypted = true
        )

        // Binary serialization
        val binaryPayload = message.toBinaryPayload()
        assertNotNull("Binary payload encoding must succeed", binaryPayload)

        // Binary deserialization
        val decodedMessage = BitchatMessage.fromBinaryPayload(binaryPayload!!)
        assertNotNull("Binary payload decoding must succeed", decodedMessage)
        assertEquals(channel, decodedMessage?.channel)
        assertTrue(decodedMessage?.isEncrypted == true)
        assertArrayEquals(ciphertext, decodedMessage?.encryptedContent)

        // Decrypt reconstructed message
        val decryptedText = decryptTestMessage(decodedMessage!!.encryptedContent!!, key)
        assertEquals(plaintext, decryptedText)
    }

    @Test
    fun testKeyCommitmentConsistency() {
        val key = deriveTestKey("SamePasswordAcrossDevices", "#assignments-and-notes")
        val digest = MessageDigest.getInstance("SHA-256")
        val commitment1 = digest.digest(key.encoded).joinToString("") { "%02x".format(it) }

        val key2 = deriveTestKey("SamePasswordAcrossDevices", "#assignments-and-notes")
        val digest2 = MessageDigest.getInstance("SHA-256")
        val commitment2 = digest2.digest(key2.encoded).joinToString("") { "%02x".format(it) }

        assertEquals("Key commitments must match for identical channel passphrases", commitment1, commitment2)
    }
}
