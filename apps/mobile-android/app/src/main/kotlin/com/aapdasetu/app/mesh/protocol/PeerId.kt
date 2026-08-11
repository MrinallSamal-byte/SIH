package com.aapdasetu.app.mesh.protocol

import java.security.SecureRandom

/**
 * An 8-byte binary mesh peer identifier (16 hex chars on the wire),
 * matching bitchat's PeerID.swift.
 *
 * Wraps the hex STRING rather than the raw ByteArray on purpose: Kotlin
 * value classes delegate equals()/hashCode() to the wrapped value, and
 * ByteArray uses reference equality, not content equality. Wrapping the hex
 * string instead gives correct content-based equality for free, which
 * matters as soon as PeerId is used as a routing-table key.
 */
@JvmInline
value class PeerId(val hex: String) {
    init {
        require(hex.length == MeshConstants.SENDER_ID_SIZE * 2) {
            "PeerId hex must be ${MeshConstants.SENDER_ID_SIZE * 2} chars, was ${hex.length}"
        }
    }

    val bytes: ByteArray
        get() = ByteArray(MeshConstants.SENDER_ID_SIZE) { i ->
            hex.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }

    companion object {
        fun fromBytes(bytes: ByteArray): PeerId {
            require(bytes.size == MeshConstants.SENDER_ID_SIZE) {
                "PeerId must be exactly ${MeshConstants.SENDER_ID_SIZE} bytes, was ${bytes.size}"
            }
            return PeerId(bytes.joinToString(separator = "") { "%02x".format(it) })
        }

        fun random(): PeerId {
            val bytes = ByteArray(MeshConstants.SENDER_ID_SIZE)
            SecureRandom().nextBytes(bytes)
            return fromBytes(bytes)
        }
    }
}
