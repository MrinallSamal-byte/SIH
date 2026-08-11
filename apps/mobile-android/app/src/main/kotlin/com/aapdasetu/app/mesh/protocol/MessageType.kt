package com.aapdasetu.app.mesh.protocol

/**
 * Wire message type byte codes, ported from bitchat's MessageType.swift.
 *
 * AapdaSetu-specific SOS payloads should ride inside an existing envelope
 * type (MESSAGE is the safe default) rather than inventing new top-level
 * wire type bytes, to stay parseable by unmodified bitchat peers relaying
 * traffic they don't otherwise understand.
 */
enum class MeshMessageType(val byte: Byte) {
    ANNOUNCE(0x01),
    MESSAGE(0x02),
    LEAVE(0x03),
    COURIER_ENVELOPE(0x04),
    NOISE_HANDSHAKE(0x10),
    NOISE_ENCRYPTED(0x11),
    FRAGMENT(0x20),
    REQUEST_SYNC(0x21),
    FILE_TRANSFER(0x22),
    BOARD_POST(0x23),
    PREKEY_BUNDLE(0x24),
    GROUP_MESSAGE(0x25),
    PING(0x26),
    PONG(0x27),
    NOSTR_CARRIER(0x28),
    VOICE_FRAME(0x29);

    companion object {
        fun fromByte(byte: Byte): MeshMessageType? = entries.find { it.byte == byte }
    }
}
