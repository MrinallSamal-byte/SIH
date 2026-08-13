import Foundation
import SwiftUI
import Combine
import CryptoKit
import CommonCrypto
import BitFoundation
import BitLogger

// MARK: - Discord Data Models

public struct DiscordHub: Identifiable, Equatable, Hashable {
    public let id: String
    public let name: String
    public let icon: String
    public let description: String
    public let isEmergency: Bool

    public init(id: String, name: String, icon: String, description: String, isEmergency: Bool = false) {
        self.id = id
        self.name = name
        self.icon = icon
        self.description = description
        self.isEmergency = isEmergency
    }
}

public enum ChannelCategoryType: String, Equatable, Hashable {
    case emergency
    case broadcast
    case secureSquad
    case general
    case directMessages
}

public struct DiscordCategory: Identifiable, Equatable, Hashable {
    public let id: String
    public let hubId: String
    public let title: String
    public let type: ChannelCategoryType
    public let isCollapsible: Bool
    public var isCollapsed: Bool

    public init(
        id: String,
        hubId: String,
        title: String,
        type: ChannelCategoryType,
        isCollapsible: Bool = true,
        isCollapsed: Bool = false
    ) {
        self.id = id
        self.hubId = hubId
        self.title = title
        self.type = type
        self.isCollapsible = isCollapsible
        self.isCollapsed = isCollapsed
    }
}

public struct DiscordChannel: Identifiable, Equatable, Hashable {
    public let id: String
    public let name: String
    public let topic: String
    public let categoryId: String
    public let hubId: String
    public let isEncrypted: Bool
    public let isPasswordProtected: Bool
    public var hasKey: Bool
    public var unreadCount: Int
    public let isEmergency: Bool

    public init(
        id: String,
        name: String,
        topic: String,
        categoryId: String,
        hubId: String,
        isEncrypted: Bool = false,
        isPasswordProtected: Bool = false,
        hasKey: Bool = false,
        unreadCount: Int = 0,
        isEmergency: Bool = false
    ) {
        self.id = id
        self.name = name
        self.topic = topic
        self.categoryId = categoryId
        self.hubId = hubId
        self.isEncrypted = isEncrypted
        self.isPasswordProtected = isPasswordProtected
        self.hasKey = hasKey
        self.unreadCount = unreadCount
        self.isEmergency = isEmergency
    }
}

// MARK: - Channel Manager

@MainActor
public final class ChannelManager: ObservableObject {
    public static let shared = ChannelManager()

    public static let HUB_CAMPUS = "hub_campus"
    public static let HUB_ACADEMICS = "hub_academics"
    public static let HUB_HOSTEL = "hub_hostel"
    public static let HUB_CLUBS = "hub_clubs"
    public static let HUB_DIRECT_MESSAGES = "hub_dms"

    public static let CAT_CAMPUS_BROADCAST = "cat_campus_broadcast"
    public static let CAT_STUDY_GROUPS = "cat_study_groups"
    public static let CAT_SECURE_SQUADS = "cat_secure_squads"
    public static let CAT_HOSTEL_LIFE = "cat_hostel_life"
    public static let CAT_CLUBS_SPORTS = "cat_clubs_sports"
    public static let CAT_DMS = "cat_dms"

    private let pbkdf2Iterations: UInt32 = 100000
    private let keyLength: Int = 32

    @Published public private(set) var selectedHubId: String = HUB_CAMPUS
    @Published public private(set) var hubs: [DiscordHub] = []
    @Published public private(set) var categories: [DiscordCategory] = []
    @Published public private(set) var channels: [DiscordChannel] = []
    @Published public private(set) var collapsedCategoryIds: Set<String> = []
    @Published public private(set) var currentChannelId: String? = nil
    @Published public private(set) var channelMessages: [String: [BitchatMessage]] = [:]
    @Published public private(set) var unreadChannelCounts: [String: Int] = [:]

    private var channelKeys: [String: SymmetricKey] = [:]
    private var channelPasswords: [String: String] = [:]
    private var channelKeyCommitments: [String: String] = [:]

    public init() {
        initializeCampusHierarchy()
    }

    // MARK: - Initialization

    private func initializeCampusHierarchy() {
        hubs = [
            DiscordHub(
                id: Self.HUB_CAMPUS,
                name: "Campus Main Hub",
                icon: "🎓",
                description: "Campus-wide Offline Mesh Network & Student Announcements"
            ),
            DiscordHub(
                id: Self.HUB_ACADEMICS,
                name: "Academics & Study",
                icon: "📚",
                description: "Department study groups, notes, assignments & peer doubt clearing"
            ),
            DiscordHub(
                id: Self.HUB_HOSTEL,
                name: "Hostel & Campus Life",
                icon: "🏢",
                description: "Hostel notices, mess food reviews & campus cab/auto rideshare"
            ),
            DiscordHub(
                id: Self.HUB_CLUBS,
                name: "Clubs & Activities",
                icon: "⚡",
                description: "Coding, robotics, cultural fests, music & sports tournaments"
            ),
            DiscordHub(
                id: Self.HUB_DIRECT_MESSAGES,
                name: "Direct Messages",
                icon: "💬",
                description: "1-on-1 private student chats (WhatsApp style with E2EE Noise sessions)"
            )
        ]

        categories = [
            // Campus Main
            DiscordCategory(
                id: Self.CAT_CAMPUS_BROADCAST,
                hubId: Self.HUB_CAMPUS,
                title: "📢 CAMPUS BROADCASTS",
                type: .broadcast
            ),
            // Academics
            DiscordCategory(
                id: Self.CAT_STUDY_GROUPS,
                hubId: Self.HUB_ACADEMICS,
                title: "📚 STUDY GROUPS & NOTES",
                type: .general
            ),
            DiscordCategory(
                id: Self.CAT_SECURE_SQUADS,
                hubId: Self.HUB_ACADEMICS,
                title: "🔒 PRIVATE STUDY SQUADS (E2EE)",
                type: .secureSquad
            ),
            // Hostels
            DiscordCategory(
                id: Self.CAT_HOSTEL_LIFE,
                hubId: Self.HUB_HOSTEL,
                title: "🍕 HOSTEL & CAMPUS LIVING",
                type: .general
            ),
            // Clubs
            DiscordCategory(
                id: Self.CAT_CLUBS_SPORTS,
                hubId: Self.HUB_CLUBS,
                title: "🎯 CLUBS & ACTIVITIES",
                type: .general
            ),
            // DMs
            DiscordCategory(
                id: Self.CAT_DMS,
                hubId: Self.HUB_DIRECT_MESSAGES,
                title: "💬 DIRECT MESSAGES",
                type: .directMessages
            )
        ]

        channels = [
            // Campus Main
            DiscordChannel(
                id: "#campus-announcements",
                name: "campus-announcements",
                topic: "📢 College news, timetable changes, exam alerts & notices",
                categoryId: Self.CAT_CAMPUS_BROADCAST,
                hubId: Self.HUB_CAMPUS
            ),
            DiscordChannel(
                id: "#general-chat",
                name: "general-chat",
                topic: "💬 Campus-wide open chat for all students",
                categoryId: Self.CAT_CAMPUS_BROADCAST,
                hubId: Self.HUB_CAMPUS
            ),
            DiscordChannel(
                id: "#lost-and-found",
                name: "lost-and-found",
                topic: "🔍 Lost ID cards, calculators, earphones, keys & books",
                categoryId: Self.CAT_CAMPUS_BROADCAST,
                hubId: Self.HUB_CAMPUS
            ),

            // Academics & Study
            DiscordChannel(
                id: "#assignments-and-notes",
                name: "assignments-and-notes",
                topic: "📝 Lecture notes, question banks & assignment sharing",
                categoryId: Self.CAT_STUDY_GROUPS,
                hubId: Self.HUB_ACADEMICS
            ),
            DiscordChannel(
                id: "#exam-prep-and-doubts",
                name: "exam-prep-and-doubts",
                topic: "💡 Peer doubt clearing, previous year papers & viva prep",
                categoryId: Self.CAT_STUDY_GROUPS,
                hubId: Self.HUB_ACADEMICS
            ),
            DiscordChannel(
                id: "#coding-and-projects",
                name: "coding-and-projects",
                topic: "💻 Hackathons, coding challenges & project partner search",
                categoryId: Self.CAT_STUDY_GROUPS,
                hubId: Self.HUB_ACADEMICS
            ),
            DiscordChannel(
                id: "#batch-2026-cse",
                name: "batch-2026-cse",
                topic: "🔒 Private batch discussion for CSE 2026 students",
                categoryId: Self.CAT_SECURE_SQUADS,
                hubId: Self.HUB_ACADEMICS,
                isEncrypted: true,
                isPasswordProtected: true
            ),
            DiscordChannel(
                id: "#core-project-team",
                name: "core-project-team",
                topic: "🔒 Capstone / Final Year Project Team Alpha",
                categoryId: Self.CAT_SECURE_SQUADS,
                hubId: Self.HUB_ACADEMICS,
                isEncrypted: true,
                isPasswordProtected: true
            ),
            DiscordChannel(
                id: "#secret-squad",
                name: "secret-squad",
                topic: "🔒 Student private squad",
                categoryId: Self.CAT_SECURE_SQUADS,
                hubId: Self.HUB_ACADEMICS,
                isEncrypted: true,
                isPasswordProtected: true
            ),

            // Hostel Life
            DiscordChannel(
                id: "#hostel-life",
                name: "hostel-life",
                topic: "🏢 Hostel notices, room discussions & night canteen",
                categoryId: Self.CAT_HOSTEL_LIFE,
                hubId: Self.HUB_HOSTEL
            ),
            DiscordChannel(
                id: "#canteen-and-mess",
                name: "canteen-and-mess",
                topic: "🍛 Today's mess menu, food reviews & night canteen orders",
                categoryId: Self.CAT_HOSTEL_LIFE,
                hubId: Self.HUB_HOSTEL
            ),
            DiscordChannel(
                id: "#campus-rideshare",
                name: "campus-rideshare",
                topic: "🚕 Auto/cab sharing to railway station, metro & airport",
                categoryId: Self.CAT_HOSTEL_LIFE,
                hubId: Self.HUB_HOSTEL
            ),

            // Clubs & Activities
            DiscordChannel(
                id: "#tech-and-robotics",
                name: "tech-and-robotics",
                topic: "🤖 Robotics, AI & open source club discussions",
                categoryId: Self.CAT_CLUBS_SPORTS,
                hubId: Self.HUB_CLUBS
            ),
            DiscordChannel(
                id: "#cultural-and-music",
                name: "cultural-and-music",
                topic: "🎸 College fests, music, dance, drama & arts",
                categoryId: Self.CAT_CLUBS_SPORTS,
                hubId: Self.HUB_CLUBS
            ),
            DiscordChannel(
                id: "#sports-and-gaming",
                name: "sports-and-gaming",
                topic: "⚽ Football, cricket, badminton, BGMI & LAN gaming",
                categoryId: Self.CAT_CLUBS_SPORTS,
                hubId: Self.HUB_CLUBS
            )
        ]
    }

    // MARK: - Actions

    public func selectHub(_ hubId: String) {
        selectedHubId = hubId
    }

    public func toggleCategoryCollapse(_ categoryId: String) {
        if collapsedCategoryIds.contains(categoryId) {
            collapsedCategoryIds.remove(categoryId)
        } else {
            collapsedCategoryIds.insert(categoryId)
        }
    }

    public func selectChannel(_ channelId: String) {
        currentChannelId = channelId
        unreadChannelCounts[channelId] = 0
        if let index = channels.firstIndex(where: { $0.id == channelId }) {
            channels[index].unreadCount = 0
        }
    }

    public func leaveCurrentChannel() {
        currentChannelId = nil
    }

    public func createChannel(
        name: String,
        topic: String,
        categoryId: String,
        hubId: String,
        isEncrypted: Bool,
        password: String? = nil
    ) -> Bool {
        var formattedName = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !formattedName.hasPrefix("#") {
            formattedName = "#\(formattedName)"
        }
        let cleanName = formattedName.replacingOccurrences(of: "#", with: "")

        let newChannel = DiscordChannel(
            id: formattedName,
            name: cleanName,
            topic: topic.isEmpty ? "Campus channel" : topic,
            categoryId: categoryId,
            hubId: hubId,
            isEncrypted: isEncrypted,
            isPasswordProtected: isEncrypted,
            hasKey: isEncrypted && password != nil
        )

        channels.append(newChannel)

        if isEncrypted, let pwd = password, !pwd.isEmpty {
            setChannelPassword(channel: formattedName, password: pwd)
        }

        return true
    }

    // MARK: - Cryptography & E2EE

    public func deriveChannelKey(password: String, channelName: String) -> SymmetricKey? {
        guard let passwordData = password.data(using: .utf8),
              let saltData = channelName.lowercased().data(using: .utf8) else {
            return nil
        }

        var derivedKeyData = Data(count: keyLength)
        let derivationStatus = derivedKeyData.withUnsafeMutableBytes { derivedKeyBytes in
            saltData.withUnsafeBytes { saltBytes in
                passwordData.withUnsafeBytes { passwordBytes in
                    CCKeyDerivationPBKDF(
                        CCPBKDFAlgorithm(kCCPBKDF2),
                        passwordBytes.baseAddress?.assumingMemoryBound(to: Int8.self),
                        passwordData.count,
                        saltBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        saltData.count,
                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                        pbkdf2Iterations,
                        derivedKeyBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        keyLength
                    )
                }
            }
        }

        guard derivationStatus == kCCSuccess else {
            SecureLogger.error("❌ PBKDF2 Key Derivation Failed for \(channelName)", category: .security)
            return nil
        }

        return SymmetricKey(data: derivedKeyData)
    }

    public func setChannelPassword(channel: String, password: String) {
        guard !password.isEmpty else { return }
        channelPasswords[channel] = password
        if let key = deriveChannelKey(password: password, channelName: channel) {
            channelKeys[channel] = key
            let keyData = key.withUnsafeBytes { Data($0) }
            let hash = SHA256.hash(data: keyData)
            channelKeyCommitments[channel] = hash.compactMap { String(format: "%02x", $0) }.joined()
            
            if let index = channels.firstIndex(where: { $0.id.caseInsensitiveCompare(channel) == .orderedSame }) {
                channels[index].hasKey = true
            }
            SecureLogger.info("🔐 Derived AES-256-GCM key for campus study squad \(channel)", category: .security)
        }
    }

    public func hasChannelKey(_ channel: String) -> Bool {
        return channelKeys[channel] != nil
    }

    public func encryptChannelMessage(content: String, channel: String) -> Data? {
        guard let key = channelKeys[channel],
              let contentData = content.data(using: .utf8) else {
            return nil
        }

        do {
            let sealed = try AES.GCM.seal(contentData, using: key)
            guard let combined = sealed.combined else { return nil }
            return combined
        } catch {
            SecureLogger.error("❌ Failed to encrypt message for channel \(channel): \(error)", category: .security)
            return nil
        }
    }

    public func decryptChannelMessage(encryptedData: Data, channel: String) -> String? {
        guard let key = channelKeys[channel] else {
            return nil
        }

        do {
            let sealedBox = try AES.GCM.SealedBox(combined: encryptedData)
            let decryptedData = try AES.GCM.open(sealedBox, using: key)
            return String(data: decryptedData, encoding: .utf8)
        } catch {
            SecureLogger.debug("🔒 Decryption skipped / failed for channel \(channel)", category: .security)
            return nil
        }
    }

    public func addChannelMessage(_ channel: String, message: BitchatMessage) {
        var list = channelMessages[channel] ?? []
        list.append(message)
        channelMessages[channel] = list

        if currentChannelId != channel {
            let currentUnread = unreadChannelCounts[channel] ?? 0
            unreadChannelCounts[channel] = currentUnread + 1
            if let index = channels.firstIndex(where: { $0.id == channel }) {
                channels[index].unreadCount = currentUnread + 1
            }
        }
    }
}
