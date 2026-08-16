package com.bitchat.android.mesh

import java.util.ArrayDeque

/**
 * Per-link GATT send window.
 *
 * Android allows only one outstanding write or notification per connection.
 * File transfers feed this queue faster than BLE can drain it, so admission
 * must fail closed when the window is full and completion must be bound to
 * the write that was actually started.
 *
 * A late platform callback or watchdog must not retire a newer in-flight
 * packet. Every start captures a generation; only that generation can
 * complete or retry the head.
 */
internal class LinkSendQueue<T>(
    private val maxPendingSends: Int,
    private val maxPendingBytes: Int,
    private val bytesOf: (T) -> Int
) {
    enum class EnqueueResult { Rejected, Queued, StartNow }

    enum class AdvanceResult { Ignored, Idle, StartNext }

    private val pending = ArrayDeque<T>()
    private var pendingBytes: Int = 0
    private var inFlight: Boolean = false
    private var retryScheduled: Boolean = false
    private var generation: Long = 0L

    fun size(): Int = pending.size
    fun pendingBytes(): Int = pendingBytes
    fun generation(): Long = generation
    fun isInFlight(): Boolean = inFlight
    fun isRetryScheduled(): Boolean = retryScheduled
    fun isEmpty(): Boolean = pending.isEmpty()
    fun peek(): T? = pending.peekFirst()

    fun enqueue(item: T): EnqueueResult {
        val itemBytes = bytesOf(item)
        if (pending.size >= maxPendingSends || pendingBytes + itemBytes > maxPendingBytes) {
            return EnqueueResult.Rejected
        }
        pending.addLast(item)
        pendingBytes += itemBytes
        // Reserve in-flight so a second enqueue cannot start a parallel write.
        if (!inFlight && !retryScheduled) {
            inFlight = true
            return EnqueueResult.StartNow
        }
        return EnqueueResult.Queued
    }

    /**
     * Bind the current head to a new generation. Returns null when the
     * queue is empty and clears a stale in-flight reservation.
     */
    fun beginStart(): Long? {
        if (pending.isEmpty()) {
            inFlight = false
            return null
        }
        inFlight = true
        generation += 1L
        return generation
    }

    /**
     * Retire the head only when [expectedGeneration] is still current.
     */
    fun complete(expectedGeneration: Long): AdvanceResult {
        if (!inFlight || generation != expectedGeneration) {
            return AdvanceResult.Ignored
        }
        val head = pending.peekFirst() ?: run {
            inFlight = false
            return AdvanceResult.Idle
        }
        pending.removeFirst()
        pendingBytes = (pendingBytes - bytesOf(head)).coerceAtLeast(0)
        inFlight = false
        if (pending.isEmpty()) {
            return AdvanceResult.Idle
        }
        inFlight = true
        return AdvanceResult.StartNext
    }

    fun scheduleRetry(expectedGeneration: Long): Boolean {
        if (generation != expectedGeneration) return false
        inFlight = false
        if (retryScheduled || pending.isEmpty()) return false
        retryScheduled = true
        return true
    }

    fun takeScheduledRetry(): Boolean {
        retryScheduled = false
        if (inFlight || pending.isEmpty()) return false
        inFlight = true
        return true
    }

    fun clear() {
        pending.clear()
        pendingBytes = 0
        inFlight = false
        retryScheduled = false
        generation += 1L
    }
}
