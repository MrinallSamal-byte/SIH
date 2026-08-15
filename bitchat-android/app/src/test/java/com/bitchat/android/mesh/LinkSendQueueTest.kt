package com.bitchat.android.mesh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LinkSendQueueTest {

    private fun queue(maxSends: Int = 4, maxBytes: Int = 1_024): LinkSendQueue<ByteArray> =
        LinkSendQueue(maxSends, maxBytes) { it.size }

    @Test
    fun `full window rejects instead of dropping an already queued head`() {
        val queue = queue(maxSends = 2, maxBytes = 1_024)
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(2)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, queue.enqueue(byteArrayOf(3)))
        assertEquals(2, queue.size())
        assertEquals(1.toByte(), queue.peek()!![0])
    }

    @Test
    fun `byte window rejects when the next packet would exceed the cap`() {
        val queue = queue(maxSends = 8, maxBytes = 10)
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(ByteArray(6)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, queue.enqueue(ByteArray(5)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(ByteArray(4)))
        assertEquals(2, queue.size())
    }

    @Test
    fun `stale completion cannot retire a newer in-flight packet`() {
        val queue = queue()
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(2)))
        val firstGeneration = queue.beginStart()
        assertNotNull(firstGeneration)

        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(firstGeneration!!))
        val secondGeneration = queue.beginStart()
        assertNotNull(secondGeneration)
        assertTrue(secondGeneration!! > firstGeneration)
        assertEquals(2.toByte(), queue.peek()!![0])

        assertEquals(LinkSendQueue.AdvanceResult.Ignored, queue.complete(firstGeneration))
        assertEquals(1, queue.size())
        assertEquals(2.toByte(), queue.peek()!![0])
        assertTrue(queue.isInFlight())
    }

    @Test
    fun `many stale watchdogs cannot drain a later window`() {
        val queue = queue(maxSends = 8)
        repeat(8) { index ->
            queue.enqueue(byteArrayOf(index.toByte()))
        }
        val firstGeneration = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(firstGeneration))
        val liveGeneration = queue.beginStart()!!

        repeat(20) {
            assertEquals(LinkSendQueue.AdvanceResult.Ignored, queue.complete(firstGeneration))
        }

        assertEquals(7, queue.size())
        assertEquals(liveGeneration, queue.generation())
        assertEquals(1.toByte(), queue.peek()!![0])
    }

    @Test
    fun `beginStart on an empty queue clears a stale in-flight reservation`() {
        val queue = queue()
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        val generation = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.Idle, queue.complete(generation))
        assertNull(queue.beginStart())
        assertFalse(queue.isInFlight())
        assertTrue(queue.isEmpty())
    }

    @Test
    fun `retry is ignored after a newer generation has started`() {
        val queue = queue()
        queue.enqueue(byteArrayOf(1))
        queue.enqueue(byteArrayOf(2))
        val firstGeneration = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(firstGeneration))
        val secondGeneration = queue.beginStart()!!

        assertFalse(queue.scheduleRetry(firstGeneration))
        assertFalse(queue.isRetryScheduled())
        assertTrue(queue.isInFlight())
        assertEquals(secondGeneration, queue.generation())
        assertEquals(2.toByte(), queue.peek()!![0])
    }

    @Test
    fun `clear invalidates in-flight generations`() {
        val queue = queue()
        queue.enqueue(byteArrayOf(1))
        val generation = queue.beginStart()!!
        queue.clear()
        assertTrue(queue.isEmpty())
        assertEquals(LinkSendQueue.AdvanceResult.Ignored, queue.complete(generation))
    }
}
