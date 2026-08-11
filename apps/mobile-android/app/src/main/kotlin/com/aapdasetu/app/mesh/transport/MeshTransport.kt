package com.aapdasetu.app.mesh.transport

import com.aapdasetu.app.mesh.protocol.BinaryPacket
import com.aapdasetu.app.mesh.protocol.PeerId
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.emptyFlow

/**
 * The seam between the UI layer and real BLE mesh networking. Nothing in
 * this scaffold implements actual BLE central/peripheral GATT logic yet -
 * that is the single biggest remaining chunk of work, deliberately scoped
 * out of this pass. See the module README for concrete next steps
 * (advertise/scan using MeshConstants' UUIDs, GATT server + client roles,
 * MTU negotiation, characteristic write/notify chunking for packets bigger
 * than one MTU, and a foreground Service so the OS doesn't kill the scan).
 *
 * Screens are built to call through this interface rather than talk to
 * Android's Bluetooth APIs directly, so a real BleMeshTransport
 * implementation can be dropped in later without touching Compose code.
 */
interface MeshTransport {
    val localPeerId: PeerId
    val nearbyPeerCount: StateFlow<Int>
    val incomingPackets: Flow<BinaryPacket.Packet>

    fun start()
    fun stop()
    suspend fun broadcast(packet: BinaryPacket.Packet): Boolean
}

/**
 * Does nothing - no scanning, no advertising, no real peers. Exists purely
 * so the UI layer has something to inject today. Swap for a real
 * BleMeshTransport(context, localPeerId) once that is built.
 */
class NoOpMeshTransport(
    override val localPeerId: PeerId = PeerId.random()
) : MeshTransport {
    private val _nearbyPeerCount = MutableStateFlow(0)
    override val nearbyPeerCount: StateFlow<Int> = _nearbyPeerCount.asStateFlow()
    override val incomingPackets: Flow<BinaryPacket.Packet> = emptyFlow()

    override fun start() {
        // Intentionally a no-op - see class doc.
    }

    override fun stop() {
        // Intentionally a no-op - see class doc.
    }

    override suspend fun broadcast(packet: BinaryPacket.Packet): Boolean {
        // Nothing to send to. Returns false (rather than throwing) so
        // callers can tell "no transport yet" apart from a real send that
        // failed.
        return false
    }
}
