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
 *
 * Items matching [isPriority] (e.g. SOS) form a highest-priority lane that
 * dequeues ahead of all buffered normal items, FIFO within its own lane.
 * Priority changes dequeue order only; admission caps are identical for
 * both lanes and an in-flight write is never preempted.
 */
internal class LinkSendQueue<T>(
    private val maxPendingSends: Int,
    private val maxPendingBytes: Int,
    private val bytesOf: (T) -> Int,
    private val isPriority: (T) -> Boolean = { false }
) {
    enum class EnqueueResult { Rejected, Queued, StartNow }

    enum class AdvanceResult { Ignored, Idle, StartNext }

    private val pendingPriority = ArrayDeque<T>()
    private val pendingNormal = ArrayDeque<T>()
    private var pendingBytes: Int = 0
    private var inFlight: Boolean = false
    private var inFlightLaneIsPriority: Boolean = false
    private var retryScheduled: Boolean = false
    private var generation: Long = 0L

    fun size(): Int = pendingPriority.size + pendingNormal.size
    fun pendingBytes(): Int = pendingBytes
    fun generation(): Long = generation
    fun isInFlight(): Boolean = inFlight
    fun isRetryScheduled(): Boolean = retryScheduled
    fun isEmpty(): Boolean = pendingPriority.isEmpty() && pendingNormal.isEmpty()

    private fun headLane(): ArrayDeque<T> =
        if (pendingPriority.isNotEmpty()) pendingPriority else pendingNormal

    private fun inFlightLane(): ArrayDeque<T> =
        if (inFlightLaneIsPriority) pendingPriority else pendingNormal

    fun peek(): T? = (if (inFlight) inFlightLane() else headLane()).peekFirst()

    fun enqueue(item: T): EnqueueResult {
        val itemBytes = bytesOf(item)
        if (size() >= maxPendingSends || pendingBytes + itemBytes > maxPendingBytes) {
            return EnqueueResult.Rejected
        }
        if (isPriority(item)) {
            pendingPriority.addLast(item)
        } else {
            pendingNormal.addLast(item)
        }
        pendingBytes += itemBytes
        // Reserve in-flight so a second enqueue cannot start a parallel write.
        if (!inFlight && !retryScheduled) {
            inFlight = true
            inFlightLaneIsPriority = pendingPriority.isNotEmpty()
            return EnqueueResult.StartNow
        }
        return EnqueueResult.Queued
    }

    /**
     * Bind the current head to a new generation. Returns null when the
     * queue is empty and clears a stale in-flight reservation.
     */
    fun beginStart(): Long? {
        if (isEmpty()) {
            inFlight = false
            return null
        }
        inFlight = true
        generation += 1L
        return generation
    }

    /**
     * Retire the head only when [expectedGeneration] is still current.
     * A successful completion consumes the generation: the same generation
     * can never retire more than one head, even if it is reported twice
     * (e.g. a GATT callback racing the pacing fallback).
     */
    fun complete(expectedGeneration: Long): AdvanceResult {
        if (!inFlight || generation != expectedGeneration) {
            return AdvanceResult.Ignored
        }
        val lane = inFlightLane()
        val head = lane.peekFirst() ?: run {
            inFlight = false
            generation += 1L
            return AdvanceResult.Idle
        }
        lane.removeFirst()
        pendingBytes = (pendingBytes - bytesOf(head)).coerceAtLeast(0)
        inFlightLaneIsPriority = pendingPriority.isNotEmpty()
        inFlight = false
        generation += 1L
        if (isEmpty()) {
            return AdvanceResult.Idle
        }
        inFlight = true
        return AdvanceResult.StartNext
    }

    fun scheduleRetry(expectedGeneration: Long): Boolean {
        if (generation != expectedGeneration) return false
        inFlight = false
        if (retryScheduled || isEmpty()) return false
        retryScheduled = true
        return true
    }

    fun takeScheduledRetry(): Boolean {
        retryScheduled = false
        if (inFlight || isEmpty()) return false
        inFlight = true
        return true
    }

    fun clear() {
        pendingPriority.clear()
        pendingNormal.clear()
        pendingBytes = 0
        inFlight = false
        retryScheduled = false
        generation += 1L
    }
}
