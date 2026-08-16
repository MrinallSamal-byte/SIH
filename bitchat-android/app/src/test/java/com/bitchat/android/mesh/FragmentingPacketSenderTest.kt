package com.bitchat.android.mesh

import com.bitchat.android.model.RoutedPacket
import com.bitchat.android.protocol.BitchatPacket
import com.bitchat.android.protocol.MessageType
import com.bitchat.android.util.AppConstants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.Random
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

@RunWith(RobolectricTestRunner::class)
class FragmentingPacketSenderTest {

    private val senderID = "1122334455667788"

    private fun packetWithPayload(bytes: Int): BitchatPacket {
        val payload = ByteArray(bytes)
        Random(42).nextBytes(payload)
        return BitchatPacket(
            version = 2u,
            type = MessageType.FILE_TRANSFER.value,
            senderID = MeshPacketUtils.hexStringToByteArray(senderID),
            recipientID = null,
            timestamp = System.currentTimeMillis().toULong(),
            payload = payload,
            signature = null,
            ttl = 7u
        )
    }

    @Test
    fun `oversized packet exceeding receiver fragment cap is rejected with fail event`() = runBlocking {
        val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val sender = FragmentingPacketSender(scope, FragmentManager(), "test")
        // Exceed MAX_FRAGMENTS_PER_ID fragments
        val packet = packetWithPayload((AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID + 50) * 500)
        var sent = false

        val failed = java.util.concurrent.ConcurrentLinkedQueue<String>()
        val collectJob = launch(Dispatchers.Default) {
            TransferProgressManager.events.collect { event ->
                if (event.failed) failed.add(event.transferId)
            }
        }
        kotlinx.coroutines.delay(100) // activate subscription before emitting

        val accepted = sender.send(RoutedPacket(packet, transferId = "oversize-test"), "test") { sent = true; true }
        assertFalse(accepted)
        assertFalse(sent)
        withTimeout(5_000) {
            while (!failed.contains("oversize-test")) {
                kotlinx.coroutines.delay(10)
            }
        }
        collectJob.cancel()
        Unit
    }

    @Test
    fun `packet within fragment cap is accepted`() = runBlocking {
        val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val sender = FragmentingPacketSender(scope, FragmentManager(), "test", interFragmentDelayMs = 0L)
        val packet = packetWithPayload(10_000)
        var writes = 0

        val accepted = sender.send(RoutedPacket(packet, transferId = "fits-test"), "test") { writes += 1; true }
        assertTrue(accepted)
        withTimeout(5_000) {
            while (writes == 0) {
                kotlinx.coroutines.delay(10)
            }
        }
        assertTrue(writes > 0)
    }

    @Test
    fun `temporarily full transport retries the same fragment instead of dropping it`() = runBlocking {
        val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val manager = FragmentManager()
        val sender = FragmentingPacketSender(scope, manager, "test", interFragmentDelayMs = 0L)
        val packet = packetWithPayload(1_500)
        val expectedFragments = manager.createFragments(
            packet,
            AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID
        ).size
        val rejectedOnce = AtomicBoolean(false)
        val calls = AtomicInteger(0)
        val accepted = ConcurrentLinkedQueue<BitchatPacket>()

        assertTrue(
            sender.send(RoutedPacket(packet, transferId = "retry-test"), "test") { routed ->
                calls.incrementAndGet()
                if (!rejectedOnce.getAndSet(true)) {
                    false
                } else {
                    accepted.add(routed.packet)
                    true
                }
            }
        )

        withTimeout(5_000) {
            while (accepted.size < expectedFragments) {
                kotlinx.coroutines.delay(10)
            }
        }
        assertEquals(expectedFragments, accepted.size)
        assertEquals(expectedFragments + 1, calls.get())
    }

    @Test
    fun `sender delivers every fragment through a small sliding window`() = runBlocking {
        val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val manager = FragmentManager()
        val sender = FragmentingPacketSender(scope, manager, "test", interFragmentDelayMs = 0L)
        val packet = packetWithPayload(8_000)
        val expectedFragments = manager.createFragments(
            packet,
            AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID
        ).size
        assertTrue(expectedFragments > 4)
        val inFlight = AtomicInteger(0)
        val delivered = AtomicInteger(0)
        val window = 4

        assertTrue(
            sender.send(RoutedPacket(packet, transferId = "window-test"), "test") { _ ->
                val occupied = inFlight.get()
                if (occupied >= window) {
                    false
                } else if (!inFlight.compareAndSet(occupied, occupied + 1)) {
                    false
                } else {
                    delivered.incrementAndGet()
                    scope.launch {
                        kotlinx.coroutines.yield()
                        inFlight.decrementAndGet()
                    }
                    true
                }
            }
        )

        withTimeout(10_000) {
            while (delivered.get() < expectedFragments) {
                kotlinx.coroutines.yield()
            }
        }
        assertEquals(expectedFragments, delivered.get())
        assertEquals(0, inFlight.get())
    }

    @Test
    fun `fragment count at cap boundary is not rejected`() {
        val manager = FragmentManager()
        val packet = packetWithPayload(AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID * 400)
        val fragments = manager.createFragments(packet, AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID)
        assertTrue(fragments.isNotEmpty())
        assertTrue(fragments.size <= AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID)
    }
}
