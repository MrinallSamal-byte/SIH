package com.bitchat.android.mesh

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch

data class TransferProgressEvent(
    val transferId: String,
    val sent: Int,
    val total: Int,
    val completed: Boolean,
    val failed: Boolean = false,
    val isIncoming: Boolean = false
)

object TransferProgressManager {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _events = MutableSharedFlow<TransferProgressEvent>(replay = 0, extraBufferCapacity = 64)
    val events: SharedFlow<TransferProgressEvent> = _events

    private val _activeIncomingTransfers = kotlinx.coroutines.flow.MutableStateFlow<List<TransferProgressEvent>>(emptyList())
    val activeIncomingTransfers: kotlinx.coroutines.flow.StateFlow<List<TransferProgressEvent>> = _activeIncomingTransfers

    fun start(id: String, total: Int, isIncoming: Boolean = false) { 
        emit(id, 0, total, false, failed = false, isIncoming = isIncoming) 
    }
    
    fun progress(id: String, sent: Int, total: Int, isIncoming: Boolean = false) { 
        emit(id, sent, total, sent >= total, failed = false, isIncoming = isIncoming) 
    }
    
    fun complete(id: String, total: Int, isIncoming: Boolean = false) { 
        emit(id, total, total, done = true, failed = false, isIncoming = isIncoming) 
    }
    
    fun fail(id: String, isIncoming: Boolean = false) { 
        emit(id, 0, 0, done = true, failed = true, isIncoming = isIncoming) 
    }

    private fun emit(id: String, sent: Int, total: Int, done: Boolean, failed: Boolean = false, isIncoming: Boolean = false) {
        val event = TransferProgressEvent(id, sent, total, done, failed, isIncoming)
        if (isIncoming) {
            val current = _activeIncomingTransfers.value.toMutableList()
            if (done || failed) {
                current.removeAll { it.transferId == id }
            } else if (total > 1) {
                val idx = current.indexOfFirst { it.transferId == id }
                if (idx >= 0) {
                    current[idx] = event
                } else {
                    current.add(event)
                }
            }
            _activeIncomingTransfers.value = current
        }
        scope.launch { _events.emit(event) }
    }
}
