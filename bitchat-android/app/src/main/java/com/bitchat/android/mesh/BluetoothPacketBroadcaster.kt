
package com.bitchat.android.mesh

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothStatusCodes
import android.os.Build
import android.util.Log
import com.bitchat.android.protocol.SpecialRecipients
import com.bitchat.android.model.RoutedPacket
import com.bitchat.android.protocol.MessageType
import com.bitchat.android.util.toHexString
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.channels.actor

/**
 * Handles packet broadcasting to connected devices using actor pattern for serialization
 * 
 * In Bluetooth Low Energy (BLE):
 *
 * Peripheral (server):
 * Advertises.
 * Accepts connections.
 * Hosts a GATT server.
 * Remote devices read/write/subscribe to characteristics.
 *
 *  Central (client):
 * Scans.
 * Initiates connections.
 * Hosts a GATT client.
 * Reads/writes to the peripheral’s characteristics.
 */
class BluetoothPacketBroadcaster(
    private val connectionScope: CoroutineScope,
    private val connectionTracker: BluetoothConnectionTracker,
    private val fragmentManager: FragmentManager?,
    private val myPeerID: String
) {
    
    companion object {
        private const val TAG = "BluetoothPacketBroadcaster"
        private const val MAX_PENDING_SENDS_PER_LINK = 16
        private const val MAX_PENDING_BYTES_PER_LINK = 16_384
        private const val SEND_RETRY_DELAY_MS = 20L
        // WRITE_NO_RESPONSE callbacks are not generation-scoped. Pace the next
        // GATT operation after the stack accepts a write instead of treating a
        // late callback as completion of whatever is now in flight.
        private const val GATT_PACE_MS = 20L
    }

    // Optional nickname resolver injected by higher layer (peerID -> nickname?)
    private var nicknameResolver: ((String) -> String?)? = null

    fun setNicknameResolver(resolver: (String) -> String?) {
        nicknameResolver = resolver
    }
    
    /**
     * Debug logging helper - can be easily removed/disabled for production
     */
    private fun logPacketRelay(
        typeName: String,
        senderPeerID: String,
        senderNick: String?,
        incomingPeer: String?,
        incomingAddr: String?,
        toPeer: String?,
        toDeviceAddress: String,
        ttl: UByte,
        packetVersion: UByte = 1u,
        routeInfo: String? = null
    ) {
        try {
            val fromNick = incomingPeer?.let { nicknameResolver?.invoke(it) }
            val toNick = toPeer?.let { nicknameResolver?.invoke(it) }
            val manager = com.bitchat.android.ui.debug.DebugSettingsManager.getInstance()
            // Always log outgoing for the actual transmission target
            manager.logOutgoing(
                packetType = typeName,
                toPeerID = toPeer,
                toNickname = toNick,
                toDeviceAddress = toDeviceAddress,
                previousHopPeerID = incomingPeer,
                packetVersion = packetVersion,
                routeInfo = routeInfo
            )
            // Keep the verbose relay message for human readability
            manager.logPacketRelayDetailed(
                packetType = typeName,
                senderPeerID = senderPeerID,
                senderNickname = senderNick,
                fromPeerID = incomingPeer,
                fromNickname = fromNick,
                fromDeviceAddress = incomingAddr,
                toPeerID = toPeer,
                toNickname = toNick,
                toDeviceAddress = toDeviceAddress,
                ttl = ttl,
                isRelay = true,
                packetVersion = packetVersion,
                routeInfo = routeInfo
            )
        } catch (_: Exception) { 
            // Silently ignore debug logging failures
        }
    }
    
    // Data class to hold broadcast request information
    private data class BroadcastRequest(
        val routed: RoutedPacket,
        val gattServer: BluetoothGattServer?,
        val characteristic: BluetoothGattCharacteristic?,
        val accepted: CompletableDeferred<Boolean>? = null
    )
    
    // Actor scope for the broadcaster
    private val broadcasterScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val fragmentingSender = FragmentingPacketSender(connectionScope, fragmentManager, TAG)

    private enum class SendDirection { CLIENT_WRITE, SERVER_NOTIFICATION }

    private data class SendKey(
        val deviceAddress: String,
        val linkID: String,
        val direction: SendDirection
    )

    private data class PendingSend(
        val data: ByteArray,
        val device: BluetoothDevice,
        val gatt: BluetoothGatt? = null,
        val gattServer: BluetoothGattServer? = null,
        val characteristic: BluetoothGattCharacteristic
    )

    private val sendLock = Any()
    private val sendStates = mutableMapOf<SendKey, LinkSendQueue<PendingSend>>()
    
    // SERIALIZATION: Actor to serialize all broadcast operations
    @OptIn(kotlinx.coroutines.ObsoleteCoroutinesApi::class)
    private val broadcasterActor = broadcasterScope.actor<BroadcastRequest>(
        capacity = 2048
    ) {
        for (request in channel) {
            val accepted = try {
                broadcastSinglePacketInternal(
                    request.routed,
                    request.gattServer,
                    request.characteristic
                )
            } catch (e: Exception) {
                Log.w(TAG, "Broadcast request failed: ${e.message}")
                false
            }
            request.accepted?.complete(accepted)
        }
    }
    
    fun broadcastPacket(
        routed: RoutedPacket,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        return fragmentingSender.send(routed, "BLE broadcast") { packet ->
            // Do not advance a file transfer merely because a coroutine was
            // launched. Waiting for the serialized broadcaster to admit this
            // packet makes the fragment sender observe a full per-link queue
            // and retry the same fragment instead of silently losing it.
            broadcastPacketAndAwaitAcceptance(packet, gattServer, characteristic)
        }
    }

    fun cancelTransfer(transferId: String): Boolean {
        return fragmentingSender.cancelTransfer(transferId)
    }

    /**
     * Send a packet to a specific peer only, without broadcasting.
     * Returns true if a direct path was found and used.
     */
    fun sendPacketToPeer(
        routed: RoutedPacket,
        targetPeerID: String,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        if (!hasPeerConnection(targetPeerID)) return false
        return fragmentingSender.send(routed, "BLE peer ${targetPeerID.take(8)}") { packet ->
            sendSinglePacketToPeer(packet, targetPeerID, gattServer, characteristic)
        }
    }

    fun sendPacketToLink(
        routed: RoutedPacket,
        deviceAddress: String,
        linkID: String,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean = fragmentingSender.send(routed, "BLE link $deviceAddress") { packet ->
        val data = packet.packet.toBinaryData(
            padding = BLEPacketPaddingPolicy.shouldPadForBLE(packet.packet.type)
        ) ?: return@send false
        val currentLink = connectionTracker.getDeviceConnection(deviceAddress)
            ?.takeIf { it.linkID == linkID }
            ?: return@send false
        if (currentLink.isClient) {
            return@send writeToDeviceConn(currentLink, data)
        }
        val serverTarget = connectionTracker.getSubscribedDevices()
            .firstOrNull { it.address == deviceAddress }
            ?: return@send false
        notifyDevice(serverTarget, data, gattServer, characteristic)
    }

    private fun sendSinglePacketToPeer(
        routed: RoutedPacket,
        targetPeerID: String,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        val packet = routed.packet
        // iOS-compatible: Use selective padding policy for BLE
        val padForBLE = BLEPacketPaddingPolicy.shouldPadForBLE(packet.type)
        val data = packet.toBinaryData(padding = padForBLE) ?: return false
        val typeName = MessageType.fromValue(packet.type)?.name ?: packet.type.toString()
        val senderPeerID = routed.peerID ?: packet.senderID.toHexString()
        val incomingAddr = routed.relayAddress
        val incomingPeer = incomingAddr?.let { connectionTracker.addressPeerMap[it] }
        val senderNick = senderPeerID.let { pid -> nicknameResolver?.invoke(pid) }
        val route = packet.route
        val routeInfo = if (!route.isNullOrEmpty()) "routed: ${route.size} hops" else null

        // Prefer server-side subscriptions
        val serverTarget = connectionTracker.getSubscribedDevices()
            .firstOrNull { connectionTracker.addressPeerMap[it.address] == targetPeerID }
        if (serverTarget != null) {
            if (notifyDevice(serverTarget, data, gattServer, characteristic)) {
                logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, targetPeerID, serverTarget.address, packet.ttl, packet.version, routeInfo)
                return true
            }
        }

        // Then client connections
        val clientTarget = connectionTracker.getConnectedDevices().values
            .firstOrNull { connectionTracker.addressPeerMap[it.device.address] == targetPeerID }
        if (clientTarget != null) {
            if (writeToDeviceConn(clientTarget, data)) {
                logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, targetPeerID, clientTarget.device.address, packet.ttl, packet.version, routeInfo)
                return true
            }
        }

        return false
    }

    
    /**
     * Public entry point for broadcasting - submits request to actor for serialization
     */
    fun broadcastSinglePacket(
        routed: RoutedPacket,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ) {
        // Submit broadcast request to actor for serialized processing
        broadcasterScope.launch {
            try {
                broadcasterActor.send(BroadcastRequest(routed, gattServer, characteristic))
            } catch (e: Exception) {
                Log.w(TAG, "Failed to send broadcast request to actor: ${e.message}")
                // Fallback to direct processing if actor fails
                broadcastSinglePacketInternal(routed, gattServer, characteristic)
            }
        }
    }

    /**
     * Serializes one packet with BLE traffic and waits until every selected
     * link has admitted it to its GATT queue. Fragment senders use this as
     * backpressure rather than treating coroutine launch as delivery.
     */
    suspend fun broadcastPacketAndAwaitAcceptance(
        routed: RoutedPacket,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        val accepted = CompletableDeferred<Boolean>()
        return try {
            broadcasterActor.send(
                BroadcastRequest(routed, gattServer, characteristic, accepted)
            )
            accepted.await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w(TAG, "Failed to queue BLE packet: ${e.message}")
            broadcastSinglePacketInternal(routed, gattServer, characteristic)
        }
    }

    /** Backwards-compatible name for callers that send a single control packet. */
    suspend fun broadcastControlPacketAndAwaitAcceptance(
        routed: RoutedPacket,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean = broadcastPacketAndAwaitAcceptance(routed, gattServer, characteristic)

    /**
     * Targeted send to a specific peer (by peerID) if directly connected.
     * Returns true if sent to at least one matching connection.
     */
    fun sendToPeer(
        targetPeerID: String,
        routed: RoutedPacket,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        if (!hasPeerConnection(targetPeerID)) return false
        return fragmentingSender.send(routed, "BLE peer ${targetPeerID.take(8)}") { packet ->
            sendSinglePacketToPeer(packet, targetPeerID, gattServer, characteristic)
        }
    }

    private fun hasPeerConnection(targetPeerID: String): Boolean {
        val hasServerTarget = connectionTracker.getSubscribedDevices()
            .any { connectionTracker.addressPeerMap[it.address] == targetPeerID }
        if (hasServerTarget) return true

        return connectionTracker.getConnectedDevices().values
            .any { connectionTracker.addressPeerMap[it.device.address] == targetPeerID }
    }
    
    /**
     * Internal broadcast implementation - runs in serialized actor context
     */
    private suspend fun broadcastSinglePacketInternal(
        routed: RoutedPacket,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        val packet = routed.packet
        // iOS-compatible: Use selective padding policy for BLE
        val padForBLE = BLEPacketPaddingPolicy.shouldPadForBLE(packet.type)
        val data = packet.toBinaryData(padding = padForBLE) ?: return false
        val typeName = MessageType.fromValue(packet.type)?.name ?: packet.type.toString()
        val senderPeerID = routed.peerID ?: packet.senderID.toHexString()
        val incomingAddr = routed.relayAddress
        val incomingPeer = incomingAddr?.let { connectionTracker.addressPeerMap[it] }
        val senderNick = senderPeerID.let { pid -> nicknameResolver?.invoke(pid) }
        val route = packet.route
        val routeInfo = if (!route.isNullOrEmpty()) "routed: ${route.size} hops" else null

        // Source Routing for Originating Packets
        // If we are the sender and a source route is defined, we must send ONLY to the first hop.
        if (packet.senderID.toHexString() == myPeerID && !packet.route.isNullOrEmpty()) {
            val firstHop = packet.route!![0].toHexString()

            var sent = false

            // Try to find first hop in server connections (subscribedDevices)
            val serverTarget = connectionTracker.getSubscribedDevices()
                .firstOrNull { connectionTracker.addressPeerMap[it.address] == firstHop }

            if (serverTarget != null) {
                if (notifyDevice(serverTarget, data, gattServer, characteristic)) {
                    val toPeer = connectionTracker.addressPeerMap[serverTarget.address]
                    logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, toPeer, serverTarget.address, packet.ttl, packet.version, routeInfo)
                    sent = true
                }
            }

            // Try to find first hop in client connections if not sent yet
            if (!sent) {
                val clientTarget = connectionTracker.getConnectedDevices().values
                    .firstOrNull { connectionTracker.addressPeerMap[it.device.address] == firstHop }
                
                if (clientTarget != null) {
                    if (writeToDeviceConn(clientTarget, data)) {
                        val toPeer = connectionTracker.addressPeerMap[clientTarget.device.address]
                        logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, toPeer, clientTarget.device.address, packet.ttl, packet.version, routeInfo)
                        sent = true
                    }
                }
            }

            if (sent) return true

            Log.d(TAG, "Source Routing: First hop $firstHop not connected. Falling back to standard broadcast logic.")
        }
        
        if (packet.recipientID != null && !packet.recipientID.contentEquals(SpecialRecipients.BROADCAST)) {
            val recipientID = packet.recipientID?.toHexString() ?: ""

            // Try to find the recipient in server connections (subscribedDevices)
            val targetDevice = connectionTracker.getSubscribedDevices()
                .firstOrNull { connectionTracker.addressPeerMap[it.address] == recipientID }
            
            // If found, send directly
            if (targetDevice != null) {
                if (notifyDevice(targetDevice, data, gattServer, characteristic)) {
                    val toPeer = connectionTracker.addressPeerMap[targetDevice.address]
                    logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, toPeer, targetDevice.address, packet.ttl, packet.version, routeInfo)
                    return true
                }
            }

            // Try to find the recipient in client connections (connectedDevices)
            val targetDeviceConn = connectionTracker.getConnectedDevices().values
                .firstOrNull { connectionTracker.addressPeerMap[it.device.address] == recipientID }
            
            // If found, send directly
            if (targetDeviceConn != null) {
                if (writeToDeviceConn(targetDeviceConn, data)) {
                    val toPeer = connectionTracker.addressPeerMap[targetDeviceConn.device.address]
                    logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, toPeer, targetDeviceConn.device.address, packet.ttl, packet.version, routeInfo)
                    return true
                }
            }
        }

        // Else, continue with broadcasting to all devices
        val subscribedDevices = connectionTracker.getSubscribedDevices()
        val connectedDevices = connectionTracker.getConnectedDevices()

        val senderID = packet.senderID.toHexString()
        var attempted = false
        var acceptedByAny = false

        // Send to server connections (devices connected to our GATT server)
        subscribedDevices.forEach { device ->
            if (device.address == routed.relayAddress) {
                return@forEach
            }
            if (connectionTracker.addressPeerMap[device.address] == senderID) {
                return@forEach
            }
            attempted = true
            val sent = notifyDevice(device, data, gattServer, characteristic)
            if (sent) {
                acceptedByAny = true
                val toPeer = connectionTracker.addressPeerMap[device.address]
                logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, toPeer, device.address, packet.ttl, packet.version, routeInfo)
            }
        }
        
        // Send to client connections (GATT servers we are connected to)
        connectedDevices.values.forEach { deviceConn ->
            if (deviceConn.isClient && deviceConn.gatt != null && deviceConn.characteristic != null) {
                if (deviceConn.device.address == routed.relayAddress) {
                    return@forEach
                }
                if (connectionTracker.addressPeerMap[deviceConn.device.address] == senderID) {
                    return@forEach
                }
                attempted = true
                val sent = writeToDeviceConn(deviceConn, data)
                if (sent) {
                    acceptedByAny = true
                    val toPeer = connectionTracker.addressPeerMap[deviceConn.device.address]
                    logPacketRelay(typeName, senderPeerID, senderNick, incomingPeer, incomingAddr, toPeer, deviceConn.device.address, packet.ttl, packet.version, routeInfo)
                }
            }
        }
        // In a mesh, a packet is "accepted" if it reaches at least one neighbor.
        // Returning true here prevents one slow or disconnected peer from stalling
        // the entire transfer for other neighbors.
        return acceptedByAny || !attempted
    }
    
    /**
     * Send data to a single device (server->client)
     */
    private fun notifyDevice(
        device: BluetoothDevice, 
        data: ByteArray,
        gattServer: BluetoothGattServer?,
        characteristic: BluetoothGattCharacteristic?
    ): Boolean {
        val server = gattServer ?: return false
        val char = characteristic ?: return false
        val linkID = connectionTracker.getDeviceConnection(device.address)
            ?.takeIf { !it.isClient }
            ?.linkID
            ?: connectionTracker.getDeviceConnection(device.address)?.linkID
            ?: "server_${device.address}"
        return enqueueSend(
            SendKey(device.address, linkID, SendDirection.SERVER_NOTIFICATION),
            PendingSend(data.copyOf(), device, gattServer = server, characteristic = char)
        )
    }

    /**
     * Send data to a single device (client->server)
     */
    private fun writeToDeviceConn(
        deviceConn: BluetoothConnectionTracker.DeviceConnection, 
        data: ByteArray
    ): Boolean {
        val gatt = deviceConn.gatt ?: return false
        val char = deviceConn.characteristic ?: return false
        return enqueueSend(
            SendKey(deviceConn.device.address, deviceConn.linkID, SendDirection.CLIENT_WRITE),
            PendingSend(data.copyOf(), deviceConn.device, gatt = gatt, characteristic = char)
        )
    }

    /**
     * Android permits only one outstanding GATT operation per link. Queueing here
     * is a small sliding window so the fragment sender observes backpressure
     * instead of dumping thousands of fragments into a buffer that never drains.
     */
    private fun enqueueSend(key: SendKey, request: PendingSend): Boolean {
        val startNow = synchronized(sendLock) {
            val queue = sendStates.getOrPut(key) {
                LinkSendQueue(MAX_PENDING_SENDS_PER_LINK, MAX_PENDING_BYTES_PER_LINK) { it.data.size }
            }
            when (queue.enqueue(request)) {
                LinkSendQueue.EnqueueResult.Rejected -> {
                    Log.w(TAG, "BLE send queue full for ${key.direction}; rejecting ${request.data.size} bytes")
                    return false
                }
                LinkSendQueue.EnqueueResult.StartNow -> true
                LinkSendQueue.EnqueueResult.Queued -> false
            }
        }
        if (startNow) startHead(key)
        return true
    }

    @Suppress("DEPRECATION")
    @SuppressLint("MissingPermission", "ObsoleteSdkInt")
    private fun startHead(key: SendKey) {
        val started = synchronized(sendLock) {
            val queue = sendStates[key] ?: return
            val generation = queue.beginStart() ?: run {
                if (queue.isEmpty()) sendStates.remove(key)
                return
            }
            val request = queue.peek() ?: run {
                sendStates.remove(key)
                return
            }
            request to generation
        }
        val (request, generation) = started
        val accepted = try {
            when (key.direction) {
                SendDirection.CLIENT_WRITE -> {
                    val gatt = request.gatt
                    if (gatt == null) {
                        false
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        gatt.writeCharacteristic(
                            request.characteristic,
                            request.data,
                            BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                        ) == BluetoothStatusCodes.SUCCESS
                    } else {
                        request.characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                        request.characteristic.value = request.data
                        gatt.writeCharacteristic(request.characteristic)
                    }
                }
                SendDirection.SERVER_NOTIFICATION -> {
                    val server = request.gattServer
                    if (server == null) {
                        false
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        server.notifyCharacteristicChanged(
                            request.device,
                            request.characteristic,
                            false,
                            request.data
                        ) == BluetoothStatusCodes.SUCCESS
                    } else {
                        request.characteristic.value = request.data
                        server.notifyCharacteristicChanged(request.device, request.characteristic, false)
                    }
                }
            }
        } catch (error: Exception) {
            Log.w(TAG, "BLE ${key.direction} failed to start: ${error.message}")
            false
        }
        if (!accepted) {
            rejectStart(key, generation)
        } else {
            connectionScope.launch {
                delay(GATT_PACE_MS)
                val startNext = synchronized(sendLock) {
                    val queue = sendStates[key] ?: return@synchronized false
                    when (queue.complete(generation)) {
                        LinkSendQueue.AdvanceResult.StartNext -> true
                        LinkSendQueue.AdvanceResult.Idle -> {
                            sendStates.remove(key)
                            false
                        }
                        LinkSendQueue.AdvanceResult.Ignored -> false
                    }
                }
                if (startNext) startHead(key)
            }
        }
    }

    private fun rejectStart(key: SendKey, generation: Long): Boolean {
        val schedule = synchronized(sendLock) {
            sendStates[key]?.scheduleRetry(generation) == true
        }
        if (schedule) {
            connectionScope.launch {
                delay(SEND_RETRY_DELAY_MS)
                val retry = synchronized(sendLock) {
                    sendStates[key]?.takeScheduledRetry() == true
                }
                if (retry) startHead(key)
            }
        }
        return false
    }

    fun onGattClientWriteComplete(deviceAddress: String, linkID: String, status: Int) {
        if (status != BluetoothGatt.GATT_SUCCESS) {
            Log.w(TAG, "BLE client write failed with status $status for $deviceAddress")
        }
        // Advance the queue immediately on callback. LinkSendQueue.complete()
        // is idempotent for the current generation, so this safely races with
        // the GATT_PACE_MS fallback delay.
        advanceQueue(deviceAddress, linkID, SendDirection.CLIENT_WRITE)
    }

    fun onGattServerNotificationComplete(deviceAddress: String, linkID: String?, status: Int) {
        if (status != BluetoothGatt.GATT_SUCCESS) {
            Log.w(TAG, "BLE server notify failed with status $status for $deviceAddress")
        }
        linkID?.let { advanceQueue(deviceAddress, it, SendDirection.SERVER_NOTIFICATION) }
    }

    private fun advanceQueue(deviceAddress: String, linkID: String, direction: SendDirection) {
        val key = SendKey(deviceAddress, linkID, direction)
        val startNext = synchronized(sendLock) {
            val queue = sendStates[key] ?: return@synchronized false
            // Since callbacks aren't generation-scoped, we have to trust it's for the head.
            // This is safe because we only have one in-flight per link anyway.
            val currentGen = queue.generation()
            when (queue.complete(currentGen)) {
                LinkSendQueue.AdvanceResult.StartNext -> true
                LinkSendQueue.AdvanceResult.Idle -> {
                    sendStates.remove(key)
                    false
                }
                LinkSendQueue.AdvanceResult.Ignored -> false
            }
        }
        if (startNext) startHead(key)
    }

    fun onLinkDisconnected(deviceAddress: String, linkID: String?) {
        synchronized(sendLock) {
            val stale = sendStates.keys.filter { key ->
                key.deviceAddress == deviceAddress && (linkID == null || key.linkID == linkID)
            }
            stale.forEach { key ->
                sendStates.remove(key)?.clear()
            }
        }
    }
    
    /**
     * Get debug information
     */
    fun getDebugInfo(): String {
        return buildString {
            appendLine("=== Packet Broadcaster Debug Info ===")
            appendLine("Broadcaster Scope Active: ${broadcasterScope.isActive}")
            appendLine("Actor Channel Closed: ${broadcasterActor.isClosedForSend}")
            appendLine("Connection Scope Active: ${connectionScope.isActive}")
        }
    }
    
    /**
     * Shutdown the broadcaster actor gracefully
     */
    fun shutdown() {
        synchronized(sendLock) { sendStates.clear() }
        // Close the actor gracefully
        broadcasterActor.close()

        // Cancel the broadcaster scope
        broadcasterScope.cancel()
    }
} 
