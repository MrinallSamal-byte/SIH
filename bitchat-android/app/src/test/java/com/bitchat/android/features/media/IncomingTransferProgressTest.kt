package com.bitchat.android.features.media

import com.bitchat.android.mesh.TransferProgressManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class IncomingTransferProgressTest {

    @Test
    fun testIncomingTransferLifecycle() = runBlocking {
        val testId = "test_transfer_123"

        // 1. Start incoming transfer with 10 parts
        TransferProgressManager.start(testId, 10, isIncoming = true)
        var list = TransferProgressManager.activeIncomingTransfers.value
        assertEquals(1, list.size)
        assertEquals(testId, list[0].transferId)
        assertEquals(0, list[0].sent)
        assertEquals(10, list[0].total)
        assertTrue(list[0].isIncoming)
        assertFalse(list[0].completed)

        // 2. Progress to 5 parts
        TransferProgressManager.progress(testId, 5, 10, isIncoming = true)
        list = TransferProgressManager.activeIncomingTransfers.value
        assertEquals(1, list.size)
        assertEquals(5, list[0].sent)
        assertEquals(10, list[0].total)

        // 3. Complete transfer
        TransferProgressManager.complete(testId, 10, isIncoming = true)
        list = TransferProgressManager.activeIncomingTransfers.value
        assertEquals(0, list.size)
    }

    @Test
    fun testIncomingTransferFailureCleansUp() = runBlocking {
        val testId = "test_transfer_failed"

        TransferProgressManager.start(testId, 8, isIncoming = true)
        assertEquals(1, TransferProgressManager.activeIncomingTransfers.value.size)

        TransferProgressManager.fail(testId, isIncoming = true)
        assertEquals(0, TransferProgressManager.activeIncomingTransfers.value.size)
    }
}
