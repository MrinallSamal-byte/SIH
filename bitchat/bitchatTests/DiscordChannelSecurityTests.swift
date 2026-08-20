import XCTest
import CryptoKit
import CommonCrypto
import BitFoundation
@testable import bitchat

final class DiscordChannelSecurityTests: XCTestCase {

    @MainActor
    func testDiscordHierarchyStructure() {
        let channelManager = ChannelManager.shared
        XCTAssertEqual(channelManager.hubs.count, 5)
        XCTAssertTrue(channelManager.hubs.contains { $0.id == ChannelManager.HUB_CAMPUS })
        XCTAssertTrue(channelManager.hubs.contains { $0.id == ChannelManager.HUB_ACADEMICS })
        XCTAssertTrue(channelManager.hubs.contains { $0.id == ChannelManager.HUB_HOSTEL })
        XCTAssertTrue(channelManager.hubs.contains { $0.id == ChannelManager.HUB_CLUBS })
        XCTAssertTrue(channelManager.hubs.contains { $0.id == ChannelManager.HUB_DIRECT_MESSAGES })

        let announcementsChannel = channelManager.channels.first { $0.id == "#campus-announcements" }
        XCTAssertNotNil(announcementsChannel)
        XCTAssertFalse(announcementsChannel?.isEncrypted ?? true)

        let batchCseChannel = channelManager.channels.first { $0.id == "#batch-2026-cse" }
        XCTAssertNotNil(batchCseChannel)
        XCTAssertTrue(batchCseChannel?.isEncrypted ?? false)
        XCTAssertTrue(batchCseChannel?.isPasswordProtected ?? false)
    }

    @MainActor
    func testChannelE2EE_DecryptionByAuthorizedNodeOnly() {
        let channelManager = ChannelManager.shared
        let channel = "#batch-2026-cse"
        let correctPassword = "CampusCSEBatchSecretPass2026!"
        let sensitiveMessage = "PRIVATE: End-Sem Exam question bank solutions uploaded to room 302."

        channelManager.setChannelPassword(channel: channel, password: correctPassword)
        XCTAssertTrue(channelManager.hasChannelKey(channel))

        // 1. Sender encrypts
        guard let ciphertext = channelManager.encryptChannelMessage(content: sensitiveMessage, channel: channel) else {
            XCTFail("Encryption must succeed")
            return
        }
        XCTAssertGreaterThanOrEqual(ciphertext.count, 16, "Ciphertext must include nonce + payload + tag")

        // 2. Target member with matching key decrypts
        let decrypted = channelManager.decryptChannelMessage(encryptedData: ciphertext, channel: channel)
        XCTAssertEqual(decrypted, sensitiveMessage)

        // 3. Intermediate student node with wrong key attempts decryption -> MUST FAIL
        guard let wrongKey = channelManager.deriveChannelKey(password: "OtherStudentWrongPass", channelName: channel) else {
            XCTFail("Wrong key derivation failed")
            return
        }
        do {
            let sealedBox = try AES.GCM.SealedBox(combined: ciphertext)
            _ = try AES.GCM.open(sealedBox, using: wrongKey)
            XCTFail("Intermediate node without matching key must NOT be able to decrypt")
        } catch {
            // Expected failure
            XCTAssertTrue(true, "Non-member decryption threw authentication error as expected")
        }
    }

    @MainActor
    func testEncryptedChannelMessage_BinaryProtocolEncoding() {
        let channel = "#core-project-team"
        let password = "ProjectTeamAlpha2026"
        let plaintext = "Capstone Project PPT is ready. Meet in Lab 4 at 5 PM."

        let channelManager = ChannelManager.shared
        channelManager.setChannelPassword(channel: channel, password: password)

        guard let ciphertext = channelManager.encryptChannelMessage(content: plaintext, channel: channel) else {
            XCTFail("Encryption failed")
            return
        }

        let message = BitchatMessage(
            id: UUID().uuidString,
            sender: "AaravSharma",
            content: "",
            timestamp: Date(),
            isRelay: false,
            senderPeerID: PeerID(hex: "aabbccddeeff0011"),
            mentions: nil,
            channel: channel,
            encryptedContent: ciphertext,
            isEncrypted: true
        )

        // Binary encoding
        guard let binaryPayload = message.toBinaryPayload() else {
            XCTFail("Binary payload encoding failed")
            return
        }

        // Binary decoding
        guard let decodedMessage = BitchatMessage(binaryPayload) else {
            XCTFail("Binary payload decoding failed")
            return
        }

        XCTAssertEqual(decodedMessage.channel, channel)
        XCTAssertTrue(decodedMessage.isEncrypted)
        XCTAssertEqual(decodedMessage.encryptedContent, ciphertext)

        // Reconstructed decryption
        let decrypted = channelManager.decryptChannelMessage(encryptedData: decodedMessage.encryptedContent!, channel: channel)
        XCTAssertEqual(decrypted, plaintext)
    }

    @MainActor
    func testKeyCommitmentConsistency() {
        let channelManager = ChannelManager.shared
        let channel1 = "#assignments-and-notes"
        let channel2 = "#assignments-and-notes"
        let password = "SamePasswordAcrossDevices"

        guard let key1 = channelManager.deriveChannelKey(password: password, channelName: channel1),
              let key2 = channelManager.deriveChannelKey(password: password, channelName: channel2) else {
            XCTFail("Key derivations failed")
            return
        }

        let keyData1 = key1.withUnsafeBytes { Data($0) }
        let keyData2 = key2.withUnsafeBytes { Data($0) }

        let hash1 = SHA256.hash(data: keyData1).compactMap { String(format: "%02x", $0) }.joined()
        let hash2 = SHA256.hash(data: keyData2).compactMap { String(format: "%02x", $0) }.joined()

        XCTAssertEqual(hash1, hash2, "Identical passphrases and channels must produce identical key commitments")
    }
}
