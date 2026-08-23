package com.bitchat.android.features.admin

import com.bitchat.android.model.BitchatMessage
import com.bitchat.android.ui.ChannelManager
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.Date
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Unit tests verifying the password-protected #admin channel and AdminManager authentication.
 */
class AdminChannelTest {

    private val adminPassword = "SyntheticAdminPass#123"
    private val adminChannel = "#admin"

    private fun deriveKey(password: String, channel: String): SecretKeySpec {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val salt = channel.lowercase().toByteArray(Charsets.UTF_8)
        val spec = PBEKeySpec(password.toCharArray(), salt, 100000, 256)
        val secretKey = factory.generateSecret(spec)
        return SecretKeySpec(secretKey.encoded, "AES")
    }

    private fun encryptPayload(content: String, key: SecretKeySpec): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(content.toByteArray(Charsets.UTF_8))
        val combined = ByteArray(iv.size + ciphertext.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(ciphertext, 0, combined, iv.size, ciphertext.size)
        return combined
    }

    private fun decryptPayload(encryptedData: ByteArray, key: SecretKeySpec): String? {
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

    @Before
    fun setUp() {
        AdminManager.disableAdmin()
    }

    @Test
    fun testAdminConstants() {
        assertEquals("#admin", ChannelManager.ADMIN_CHANNEL)
    }

    @Test
    fun testAdminLockedBeforePassphraseSetup() {
        assertFalse(AdminManager.isAdminEnabled.value)
        assertFalse(AdminManager.isAdminSetUp())
        assertFalse(
            "Admin verification must fail while no passphrase has been set up",
            AdminManager.verifyAndEnable("SyntheticAdminPass#123")
        )
        assertFalse("AdminManager must remain disabled before passphrase setup", AdminManager.isAdminEnabled.value)
    }

    @Test
    fun testAdminPassphraseVerification_Failure() {
        assertFalse(AdminManager.isAdminEnabled.value)
        val failure = AdminManager.verifyAndEnable("WrongPassword123")
        assertFalse("Admin verification must fail without a matching stored passphrase", failure)
        assertFalse("AdminManager must remain disabled", AdminManager.isAdminEnabled.value)
    }

    @Test
    fun testAdminChannelE2EE_DecryptionByAuthorizedAdminOnly() {
        val adminKey = deriveKey(adminPassword, adminChannel)
        val unauthorizedKey = deriveKey("AttackerGuessPassword", adminChannel)

        val confidentialCommand = "ADMIN_CMD: BAN_PEER_HEX_7F8A9B"

        // Encrypt message for #admin channel
        val encryptedData = encryptPayload(confidentialCommand, adminKey)
        assertNotNull(encryptedData)
        assertTrue(encryptedData.size >= 16)

        // Non-admin attempt -> MUST FAIL
        val unauthorizedDecrypted = decryptPayload(encryptedData, unauthorizedKey)
        assertNull("Node with incorrect password must fail decryption", unauthorizedDecrypted)

        // Authorized admin attempt -> MUST SUCCEED
        val authorizedDecrypted = decryptPayload(encryptedData, adminKey)
        assertNotNull("Admin node with correct password must decrypt successfully", authorizedDecrypted)
        assertEquals(confidentialCommand, authorizedDecrypted)
    }

    @Test
    fun testAdminChannelMessage_SerializationAndDeserialization() {
        val adminKey = deriveKey(adminPassword, adminChannel)
        val logContent = "AUDIT_LOG: Mesh node connected at hop 2"
        val ciphertext = encryptPayload(logContent, adminKey)

        val message = BitchatMessage(
            id = UUID.randomUUID().toString(),
            sender = "AdminNode",
            content = "",
            timestamp = Date(),
            senderPeerID = "1122334455667788",
            channel = adminChannel,
            encryptedContent = ciphertext,
            isEncrypted = true
        )

        val binaryPayload = message.toBinaryPayload()
        assertNotNull(binaryPayload)

        val decoded = BitchatMessage.fromBinaryPayload(binaryPayload!!)
        assertNotNull(decoded)
        assertEquals(adminChannel, decoded?.channel)
        assertTrue(decoded?.isEncrypted == true)
        assertArrayEquals(ciphertext, decoded?.encryptedContent)

        val decrypted = decryptPayload(decoded!!.encryptedContent!!, adminKey)
        assertEquals(logContent, decrypted)
    }

    @Test
    fun testAdminDeleteAllContentByUser() {
        val targetPeerID = "bad_actor_peer_99"
        val otherPeerID = "good_student_peer_01"

        val msg1 = BitchatMessage(
            id = "msg_1",
            sender = "Spammer",
            content = "Spam 1",
            timestamp = Date(),
            senderPeerID = targetPeerID
        )
        val msg2 = BitchatMessage(
            id = "msg_2",
            sender = "Student",
            content = "Hello class",
            timestamp = Date(),
            senderPeerID = otherPeerID
        )
        val msg3 = BitchatMessage(
            id = "msg_3",
            sender = "Spammer",
            content = "Spam 2",
            timestamp = Date(),
            senderPeerID = targetPeerID
        )

        val messages = listOf(msg1, msg2, msg3)
        val deletedIds = mutableListOf<String>()

        val deletedCount = AdminManager.deleteAllContentByUser(targetPeerID, messages) { id ->
            deletedIds.add(id)
        }

        assertEquals(2, deletedCount)
        assertEquals(listOf("msg_1", "msg_3"), deletedIds)
    }

    @Test
    fun testAdminFormatChannel() {
        val channelName = "test-channel"
        val msg1 = BitchatMessage(id = "c1", sender = "A", content = "Hi", timestamp = Date(), channel = "#$channelName")
        val msg2 = BitchatMessage(id = "c2", sender = "B", content = "Hey", timestamp = Date(), channel = "#$channelName")

        val channelMessages = listOf(msg1, msg2)
        val deletedIds = mutableListOf<String>()

        val count = AdminManager.formatChannel(channelName, channelMessages) { id ->
            deletedIds.add(id)
        }

        assertEquals(2, count)
        assertEquals(listOf("c1", "c2"), deletedIds)
    }

    @Test
    fun testAdminDeleteAllContentByNickname() {
        val msg1 = BitchatMessage(id = "m1", sender = "ToxicTroll#1234", content = "Spam", timestamp = Date(), senderPeerID = "peer_99")
        val msg2 = BitchatMessage(id = "m2", sender = "GoodStudent", content = "Notes", timestamp = Date(), senderPeerID = "peer_01")
        val msg3 = BitchatMessage(id = "m3", sender = "ToxicTroll", content = "Spam 2", timestamp = Date(), senderPeerID = "peer_99")

        val messages = listOf(msg1, msg2, msg3)
        val deletedIds = mutableListOf<String>()

        val count = AdminManager.deleteAllContentByUser("ToxicTroll", messages) { id ->
            deletedIds.add(id)
        }

        assertEquals(2, count)
        assertEquals(listOf("m1", "m3"), deletedIds)
    }

    @Test
    fun testSaltNormalizationConsistency() {
        val channel1 = "#Batch-2026-CSE"
        val channel2 = "#batch-2026-cse"
        val pass = "Password123"

        val key1 = deriveKey(pass, channel1)
        val key2 = deriveKey(pass, channel2)

        assertArrayEquals("Derived keys for mixed-case and lower-case channels must match", key1.encoded, key2.encoded)
    }
}
