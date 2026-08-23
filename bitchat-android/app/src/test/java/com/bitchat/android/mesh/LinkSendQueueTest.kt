package com.bitchat.android.mesh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LinkSendQueueTest {

    private fun queue(
        maxSends: Int = 4,
        maxBytes: Int = 1_024,
        isPriority: (ByteArray) -> Boolean = { false }
    ): LinkSendQueue<ByteArray> =
        LinkSendQueue(maxSends, maxBytes, { it.size }, isPriority)

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

    private fun drainAll(queue: LinkSendQueue<ByteArray>): List<Byte> {
        val drained = mutableListOf<Byte>()
        while (!queue.isEmpty()) {
            val generation = queue.beginStart()!!
            drained.add(queue.peek()!![0])
            queue.complete(generation)
        }
        return drained
    }

    @Test
    fun `priority op jumps ahead of earlier queued normal ops without preempting in-flight head`() {
        val queue = queue(maxSends = 8, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(2)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(3)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(9)))

        val firstGeneration = queue.beginStart()!!
        assertEquals(1.toByte(), queue.peek()!![0])
        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(firstGeneration))

        assertEquals(listOf(9, 2, 3).map { it.toByte() }, drainAll(queue))
    }

    @Test
    fun `priority lane drains fifo among itself and before every normal op`() {
        val queue = queue(maxSends = 16, isPriority = { it[0] >= 8 })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        for (item in listOf(byteArrayOf(2), byteArrayOf(8), byteArrayOf(3), byteArrayOf(9))) {
            assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(item))
        }

        assertEquals(5, queue.size())
        assertEquals(5, queue.pendingBytes())
        assertEquals(listOf(1, 8, 9, 2, 3).map { it.toByte() }, drainAll(queue))
    }

    @Test
    fun `priority op cannot exceed pending caps`() {
        val countCapped = queue(maxSends = 2, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, countCapped.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, countCapped.enqueue(byteArrayOf(2)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, countCapped.enqueue(byteArrayOf(9)))
        assertEquals(2, countCapped.size())

        val byteCapped = queue(maxSends = 8, maxBytes = 10, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, byteCapped.enqueue(ByteArray(6)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, byteCapped.enqueue(ByteArray(5)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, byteCapped.enqueue(ByteArray(4)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, byteCapped.enqueue(byteArrayOf(9)))
        assertEquals(10, byteCapped.pendingBytes())
    }

    @Test
    fun `completing a priority head keeps byte accounting across lanes`() {
        val queue = queue(maxSends = 8, maxBytes = 64, isPriority = { it[0] == 9.toByte() })
        queue.enqueue(ByteArray(4))
        queue.enqueue(ByteArray(6))
        queue.enqueue(byteArrayOf(9))

        val generation = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(generation))
        assertEquals(9.toByte(), queue.peek()!![0])
        assertEquals(7, queue.pendingBytes())

        val priorityGeneration = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(priorityGeneration))
        assertEquals(6, queue.pendingBytes())
        assertEquals(0.toByte(), queue.peek()!![0])
    }

    @Test
    fun `a completed generation cannot retire a second head before the next start`() {
        val queue = queue(maxSends = 8)
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(2)))
        val generation = queue.beginStart()!!

        assertEquals(LinkSendQueue.AdvanceResult.StartNext, queue.complete(generation))
        // A duplicate completion report (GATT callback racing the pacing
        // fallback) must become a no-op instead of retiring the new head.
        assertEquals(LinkSendQueue.AdvanceResult.Ignored, queue.complete(generation))
        assertEquals(1, queue.size())
        assertEquals(2.toByte(), queue.peek()!![0])
    }

    @Test
    fun `retry of an in-flight priority head requeues the same priority head`() {
        val queue = queue(maxSends = 8, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(9)))

        val generation = queue.beginStart()!!
        assertTrue(queue.scheduleRetry(generation))
        assertFalse(queue.isInFlight())
        assertTrue(queue.isRetryScheduled())

        assertTrue(queue.takeScheduledRetry())
        val retryGeneration = queue.beginStart()!!
        assertTrue(retryGeneration > generation)
        assertEquals("the priority head must still be the head of its lane",
            9.toByte(), queue.peek()!![0])

        assertEquals(LinkSendQueue.AdvanceResult.Idle, queue.complete(retryGeneration))
        assertTrue(queue.isEmpty())
    }

    @Test
    fun `retry of a priority head keeps queued normal ops behind it`() {
        val queue = queue(maxSends = 8, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(9)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(2)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(3)))

        val generation = queue.beginStart()!!
        assertTrue(queue.scheduleRetry(generation))
        assertTrue(queue.takeScheduledRetry())

        assertEquals(listOf(9, 2, 3).map { it.toByte() }, drainAll(queue))
    }

    @Test
    fun `clear empties both lanes and resets all accounting`() {
        val queue = queue(maxSends = 16, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(ByteArray(4)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(9)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(ByteArray(2)))
        val generation = queue.beginStart()!!

        queue.clear()

        assertTrue(queue.isEmpty())
        assertEquals(0, queue.size())
        assertEquals(0, queue.pendingBytes())
        assertFalse(queue.isInFlight())
        assertFalse(queue.isRetryScheduled())
        assertEquals(LinkSendQueue.AdvanceResult.Ignored, queue.complete(generation))

        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(7)))
    }

    @Test
    fun `max sends of one admits strictly one op at a time in both lanes`() {
        val queue = queue(maxSends = 1, isPriority = { it[0] == 9.toByte() })
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, queue.enqueue(byteArrayOf(2)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, queue.enqueue(byteArrayOf(9)))

        val generation = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.Idle, queue.complete(generation))

        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(9)))
        val priorityGeneration = queue.beginStart()!!
        assertEquals(LinkSendQueue.AdvanceResult.Idle, queue.complete(priorityGeneration))
        assertTrue(queue.isEmpty())
        assertEquals(0, queue.pendingBytes())
    }

    @Test
    fun `rejected enqueue never mutates either lane`() {
        val queue = queue(maxSends = 2, maxBytes = 100)
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, queue.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, queue.enqueue(byteArrayOf(2)))

        assertEquals(LinkSendQueue.EnqueueResult.Rejected, queue.enqueue(byteArrayOf(9)))
        assertEquals(2, queue.size())
        assertEquals(2, queue.pendingBytes())
        assertEquals(1.toByte(), queue.peek()!![0])

        val byteCapped = queue(maxSends = 8, maxBytes = 3)
        assertEquals(LinkSendQueue.EnqueueResult.StartNow, byteCapped.enqueue(byteArrayOf(1)))
        assertEquals(LinkSendQueue.EnqueueResult.Queued, byteCapped.enqueue(ByteArray(2)))
        assertEquals(LinkSendQueue.EnqueueResult.Rejected, byteCapped.enqueue(ByteArray(4)))
        assertEquals(2, byteCapped.size())
        assertEquals(3, byteCapped.pendingBytes())
        assertEquals(listOf(1, 0).map { it.toByte() }, drainAll(byteCapped))
    }
}
