package com.aapdasetu.app.mesh.protocol

import java.util.UUID

/**
 * BLE GATT identifiers and framing constants, ported from the real bitchat
 * source vendored at the repo root of this project
 * (bitchat/bitchat/Services/BLE/BLEService.swift and
 * bitchat/localPackages/BitFoundation/Sources/BitFoundation/BinaryProtocol.swift).
 * Match these exactly - the whole point is that this app can mesh with real
 * bitchat peers over BLE.
 */
object MeshConstants {
    /** Release/mainnet build service UUID. */
    val SERVICE_UUID_RELEASE: UUID = UUID.fromString("F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C")

    /** Debug/testnet build service UUID - use this while developing. */
    val SERVICE_UUID_DEBUG: UUID = UUID.fromString("F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A")

    val CHARACTERISTIC_UUID: UUID = UUID.fromString("A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D")

    /** Negotiated BLE MTU bitchat targets. */
    const val BLE_MTU = 512

    /** Above this many payload bytes, the payload is zlib-compressed. */
    const val COMPRESSION_THRESHOLD = 256

    const val SENDER_ID_SIZE = 8
    const val RECIPIENT_ID_SIZE = 8
    const val SIGNATURE_SIZE = 64
    const val HEADER_SIZE_V1 = 14
    const val HEADER_SIZE_V2 = 16

    fun serviceUuid(isDebugBuild: Boolean): UUID =
        if (isDebugBuild) SERVICE_UUID_DEBUG else SERVICE_UUID_RELEASE
}
