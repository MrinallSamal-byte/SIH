package com.bitchat.android.contacts

/**
 * Represents a contact retrieved from the phone's address book with support for
 * off-grid / mesh direct messaging.
 */
data class PhoneContact(
    val id: String,
    val name: String,
    val phoneNumber: String,
    val normalizedNumber: String,
    val photoUri: String? = null,
    val matchedMeshPeerID: String? = null,
    val isMeshAvailable: Boolean = false,
) {
    /**
     * Unique conversation identifier used across Bitchat to address this phone contact.
     */
    val conversationID: String
        get() = if (normalizedNumber.isNotBlank()) "phone_$normalizedNumber" else "phone_$id"

    /**
     * Initial letter for default avatar rendering.
     */
    val initial: String
        get() = name.trim().take(1).uppercase().ifEmpty { "?" }
}
