import SwiftUI
import BitFoundation

// MARK: - Discord-Style Navigation Drawer View

public struct DiscordChannelDrawer: View {
    @ObservedObject var channelManager: ChannelManager = .shared
    @EnvironmentObject var peerListModel: PeerListModel
    @EnvironmentObject var privateConversationModel: PrivateConversationModel
    @EnvironmentObject var privateInboxModel: PrivateInboxModel
    
    let myPeerID: PeerID
    let myNickname: String
    let onCloseDrawer: () -> Void
    
    @State private var showCreateChannelSheet = false
    @State private var createChannelTargetCategory: String? = nil
    @State private var unlockChannelTarget: DiscordChannel? = nil

    public init(myPeerID: PeerID, myNickname: String, onCloseDrawer: @escaping () -> Void) {
        self.myPeerID = myPeerID
        self.myNickname = myNickname
        self.onCloseDrawer = onCloseDrawer
    }

    public var body: some View {
        HStack(spacing: 0) {
            // -------------------------------------------------------------
            // LEFT RAIL: Server / Hub Icons
            // -------------------------------------------------------------
            VStack(spacing: 10) {
                ForEach(channelManager.hubs) { hub in
                    let isSelected = hub.id == channelManager.selectedHubId
                    let unreadForHub = hubUnreadCount(hub.id)

                    ZStack {
                        // Selection pill
                        if isSelected {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(hub.isEmergency ? Color.red : Color(red: 88/255, green: 101/255, blue: 242/255))
                                .frame(width: 4, height: 32)
                                .offset(x: -30)
                        }

                        // Hub Icon
                        Button {
                            channelManager.selectHub(hub.id)
                        } label: {
                            ZStack {
                                RoundedRectangle(cornerRadius: isSelected ? 16 : 24)
                                    .fill(isSelected ? Color(red: 88/255, green: 101/255, blue: 242/255) : Color(red: 43/255, green: 45/255, blue: 49/255))
                                    .frame(width: 48, height: 48)

                                Text(hub.icon)
                                    .font(.system(size: 22))
                            }
                        }
                        .buttonStyle(.plain)

                        // Unread Badge
                        if unreadForHub > 0 {
                            Text(unreadForHub > 99 ? "99+" : "\(unreadForHub)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Capsule().fill(Color.red))
                                .offset(x: 18, y: 16)
                        }
                    }
                }

                Spacer()

                // Add Channel Button
                Button {
                    createChannelTargetCategory = nil
                    showCreateChannelSheet = true
                } label: {
                    ZStack {
                        Circle()
                            .fill(Color(red: 43/255, green: 45/255, blue: 49/255))
                            .frame(width: 44, height: 44)

                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color.green)
                    }
                }
                .buttonStyle(.plain)
                .padding(.bottom, 12)
            }
            .frame(width: 68)
            .background(Color(red: 20/255, green: 21/255, blue: 23/255))
            .padding(.top, 12)

            // -------------------------------------------------------------
            // MAIN DRAWER PANEL: Channels / DMs
            // -------------------------------------------------------------
            VStack(spacing: 0) {
                // Header
                let activeHub = channelManager.hubs.first { $0.id == channelManager.selectedHubId }
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(activeHub?.name ?? "Campus Hub")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        Text("\(peerListModel.peers.count) students connected via mesh")
                            .font(.system(size: 11))
                            .foregroundColor(Color.green)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)

                Divider()
                    .background(Color(red: 43/255, green: 45/255, blue: 49/255))

                // Content list
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        if channelManager.selectedHubId == ChannelManager.HUB_DIRECT_MESSAGES {
                            // Direct Messages (WhatsApp Style)
                            directMessagesSection
                        } else {
                            // Category Accordions
                            let categoriesForHub = channelManager.categories.filter { $0.hubId == channelManager.selectedHubId }
                            ForEach(categoriesForHub) { category in
                                categorySection(category)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }

                Divider()
                    .background(Color(red: 43/255, green: 45/255, blue: 49/255))

                // Footer Bar: Student Profile Node
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Color(red: 88/255, green: 101/255, blue: 242/255))
                            .frame(width: 32, height: 32)
                        Text(myNickname.prefix(1).uppercased())
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(myNickname.isEmpty ? "Anonymous Student" : myNickname)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                        Text("Student #\(myPeerID.id.prefix(6)) • Campus Mesh Active")
                            .font(.system(size: 10))
                            .foregroundColor(Color.green)
                    }

                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(red: 20/255, green: 21/255, blue: 23/255))
            }
            .background(Color(red: 30/255, green: 31/255, blue: 34/255))
        }
        .frame(width: 320)
        .sheet(isPresented: $showCreateChannelSheet) {
            CreateChannelSheet(
                categories: channelManager.categories.filter { $0.hubId == channelManager.selectedHubId },
                defaultCategoryId: createChannelTargetCategory,
                selectedHubId: channelManager.selectedHubId,
                onDismiss: { showCreateChannelSheet = false },
                onCreate: { name, topic, catId, isEnc, pwd in
                    _ = channelManager.createChannel(
                        name: name,
                        topic: topic,
                        categoryId: catId,
                        hubId: channelManager.selectedHubId,
                        isEncrypted: isEnc,
                        password: pwd
                    )
                    showCreateChannelSheet = false
                    onCloseDrawer()
                }
            )
        }
        .sheet(item: $unlockChannelTarget) { channel in
            UnlockChannelSheet(
                channel: channel,
                onDismiss: { unlockChannelTarget = nil },
                onUnlock: { password in
                    channelManager.setChannelPassword(channel: channel.id, password: password)
                    channelManager.selectChannel(channel.id)
                    unlockChannelTarget = nil
                    onCloseDrawer()
                }
            )
        }
    }

    // MARK: - Direct Messages Section

    @ViewBuilder
    private var directMessagesSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("DIRECT MESSAGES (1:1 E2EE NOISE)")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(red: 148/255, green: 155/255, blue: 164/255))
                .padding(.horizontal, 16)
                .padding(.top, 4)

            // Available Connected Classmates
            let discoveredPeers = peerListModel.peers.filter { $0.id != myPeerID }
            if !discoveredPeers.isEmpty {
                Text("AVAILABLE STUDENTS ON MESH (\(discoveredPeers.count))")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.green)
                    .padding(.horizontal, 16)
                    .padding(.top, 6)

                ForEach(discoveredPeers) { peer in
                    Button {
                        privateConversationModel.startConversation(with: peer.id)
                        onCloseDrawer()
                    } label: {
                        HStack(spacing: 10) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 88/255, green: 101/255, blue: 242/255))
                                    .frame(width: 28, height: 28)
                                Text(peer.nickname.prefix(1).uppercased())
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(peer.nickname)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.white)
                                Text("🟢 Tap to start 1:1 E2EE chat")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color.green)
                            }

                            Spacer()
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.clear)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                }
            } else {
                Text("Searching for nearby student devices over Bluetooth mesh...")
                    .font(.system(size: 11))
                    .foregroundColor(Color(red: 148/255, green: 155/255, blue: 164/255))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
            }
        }
    }

    // MARK: - Category Section

    @ViewBuilder
    private func categorySection(_ category: DiscordCategory) -> some View {
        let isCollapsed = channelManager.collapsedCategoryIds.contains(category.id)
        let categoryChannels = channelManager.channels.filter { $0.categoryId == category.id }

        VStack(alignment: .leading, spacing: 2) {
            // Category Header
            Button {
                channelManager.toggleCategoryCollapse(category.id)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: isCollapsed ? "chevron.right" : "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(red: 148/255, green: 155/255, blue: 164/255))

                    Text(category.title)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 148/255, green: 155/255, blue: 164/255))

                    Spacer()

                    Button {
                        createChannelTargetCategory = category.id
                        showCreateChannelSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(red: 148/255, green: 155/255, blue: 164/255))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
            }
            .buttonStyle(.plain)

            // Channels List
            if !isCollapsed {
                ForEach(categoryChannels) { channel in
                    let isSelected = channelManager.currentChannelId == channel.id
                    let unread = channelManager.unreadChannelCounts[channel.id] ?? 0

                    Button {
                        if channel.isPasswordProtected && !channelManager.hasChannelKey(channel.id) {
                            unlockChannelTarget = channel
                        } else {
                            channelManager.selectChannel(channel.id)
                            onCloseDrawer()
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Text(channel.isEncrypted ? "🔒" : "#")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(channel.isEncrypted ? Color.yellow : Color(red: 148/255, green: 155/255, blue: 164/255))

                            Text(channel.name)
                                .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                                .foregroundColor(isSelected ? .white : Color(red: 219/255, green: 222/255, blue: 225/255))

                            Spacer()

                            if unread > 0 {
                                Text("\(unread)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Capsule().fill(Color.red))
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                        .background(isSelected ? Color(red: 53/255, green: 55/255, blue: 60/255) : Color.clear)
                        .cornerRadius(6)
                        .padding(.horizontal, 6)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func hubUnreadCount(_ hubId: String) -> Int {
        if hubId == ChannelManager.HUB_DIRECT_MESSAGES {
            return privateInboxModel.totalUnreadCount
        }
        return channelManager.channels.filter { $0.hubId == hubId }.reduce(0) { $0 + (channelManager.unreadChannelCounts[$1.id] ?? 0) }
    }
}

// MARK: - Create Channel Sheet

private struct CreateChannelSheet: View {
    let categories: [DiscordCategory]
    let defaultCategoryId: String?
    let selectedHubId: String
    let onDismiss: () -> Void
    let onCreate: (String, String, String, Bool, String?) -> Void

    @State private var name = ""
    @State private var topic = ""
    @State private var selectedCategoryId: String = ""
    @State private var isEncrypted = false
    @State private var password = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Channel Details")) {
                    TextField("Channel Name (e.g. cse-study-group)", text: $name)
                    TextField("Topic / Description", text: $topic)

                    Picker("Category", selection: $selectedCategoryId) {
                        ForEach(categories) { cat in
                            Text(cat.title).tag(cat.id)
                        }
                    }
                }

                Section(header: Text("Security & Privacy")) {
                    Toggle("End-to-End Encrypted (E2EE)", isOn: $isEncrypted)
                    if isEncrypted {
                        SecureField("Squad Secret Password", text: $password)
                        Text("Only students who enter this exact password will be able to read messages. Intermediaries will relay ciphertext only.")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            .navigationTitle("Create Channel")
            .navigationBarItems(
                leading: Button("Cancel", action: onDismiss),
                trailing: Button("Create") {
                    onCreate(name, topic, selectedCategoryId, isEncrypted, isEncrypted ? password : nil)
                }.disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || (isEncrypted && password.isEmpty))
            )
            .onAppear {
                selectedCategoryId = defaultCategoryId ?? categories.first?.id ?? ChannelManager.CAT_CAMPUS_BROADCAST
            }
        }
    }
}

// MARK: - Unlock Channel Sheet

private struct UnlockChannelSheet: View {
    let channel: DiscordChannel
    let onDismiss: () -> Void
    let onUnlock: (String) -> Void

    @State private var password = ""

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("🔒 Unlock \(channel.id)")
                    .font(.headline)

                Text("This study squad is End-to-End Encrypted. Enter the squad passphrase to join and decrypt messages.")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                SecureField("Passphrase", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding(.horizontal)

                Button("Unlock & Join Squad") {
                    onUnlock(password)
                }
                .disabled(password.isEmpty)
                .padding()
                .background(password.isEmpty ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)

                Spacer()
            }
            .padding(.top, 30)
            .navigationTitle("Private Study Squad")
            .navigationBarItems(leading: Button("Cancel", action: onDismiss))
        }
    }
}
