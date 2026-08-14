package com.bitchat.android.contacts

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.provider.ContactsContract
import android.util.Log
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Manages phone contacts access, retrieval, normalization, caching,
 * and matching against active mesh network peers.
 */
object PhoneContactsManager {
    private const val TAG = "PhoneContactsManager"

    private val contactsCache = CopyOnWriteArrayList<PhoneContact>()

    /**
     * Checks whether the app has been granted permission to read contacts.
     */
    fun hasContactsPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Returns the cached list of phone contacts.
     */
    fun getCachedContacts(): List<PhoneContact> = contactsCache.toList()

    /**
     * Loads all contacts with valid phone numbers from the phone's Contacts provider.
     * Operates safely on Dispatchers.IO.
     */
    suspend fun loadPhoneContacts(
        context: Context,
        activePeerNicknames: Map<String, String> = emptyMap()
    ): List<PhoneContact> = withContext(Dispatchers.IO) {
        if (!hasContactsPermission(context)) {
            Log.d(TAG, "Cannot load phone contacts: READ_CONTACTS permission not granted")
            return@withContext emptyList()
        }

        val contactsList = mutableListOf<PhoneContact>()
        val seenKeys = mutableSetOf<String>()

        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.PHOTO_THUMBNAIL_URI,
            ContactsContract.CommonDataKinds.Phone.LOOKUP_KEY
        )

        val sortOrder = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY} ASC"

        try {
            val cursor: Cursor? = context.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )

            cursor?.use { c ->
                val idIdx = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
                val nameIdx = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME_PRIMARY)
                val numberIdx = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                val photoIdx = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.PHOTO_THUMBNAIL_URI)
                val lookupIdx = c.getColumnIndex(ContactsContract.CommonDataKinds.Phone.LOOKUP_KEY)

                while (c.moveToNext()) {
                    val rawId = if (idIdx != -1) c.getString(idIdx) else ""
                    val lookupKey = if (lookupIdx != -1) c.getString(lookupIdx) else rawId
                    val name = if (nameIdx != -1) c.getString(nameIdx)?.trim() ?: "" else ""
                    val rawNumber = if (numberIdx != -1) c.getString(numberIdx)?.trim() ?: "" else ""
                    val photoUri = if (photoIdx != -1) c.getString(photoIdx) else null

                    if (name.isBlank() && rawNumber.isBlank()) continue

                    val normalized = normalizePhoneNumber(rawNumber)
                    val dedupeKey = "${name.lowercase()}::${normalized.lowercase()}"

                    if (dedupeKey in seenKeys) continue
                    seenKeys.add(dedupeKey)

                    // Find if any connected peer's nickname matches this contact
                    val matchingPeerID = activePeerNicknames.entries.firstOrNull { (peerId, nickname) ->
                        nickname.equals(name, ignoreCase = true) ||
                            (normalized.isNotBlank() && nickname.contains(normalized))
                    }?.key

                    val contact = PhoneContact(
                        id = lookupKey.ifBlank { rawId.ifBlank { normalized } },
                        name = name.ifBlank { rawNumber },
                        phoneNumber = rawNumber,
                        normalizedNumber = normalized,
                        photoUri = photoUri,
                        matchedMeshPeerID = matchingPeerID,
                        isMeshAvailable = matchingPeerID != null
                    )
                    contactsList.add(contact)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying phone contacts: ${e.message}", e)
        }

        val sorted = contactsList.sortedWith(
            compareBy<PhoneContact> { !it.isMeshAvailable }
                .thenBy(String.CASE_INSENSITIVE_ORDER) { it.name }
        )

        contactsCache.clear()
        contactsCache.addAll(sorted)
        sorted
    }

    /**
     * Looks up a cached phone contact by its canonical conversation ID or normalized phone.
     */
    fun findContactByConversationId(conversationID: String): PhoneContact? {
        val clean = conversationID.trim().lowercase()
        val normalizedNumber = if (clean.startsWith("phone_")) clean.removePrefix("phone_") else clean
        return contactsCache.firstOrNull { contact ->
            contact.conversationID.equals(clean, ignoreCase = true) ||
                contact.normalizedNumber.equals(normalizedNumber, ignoreCase = true) ||
                contact.id.equals(clean, ignoreCase = true)
        }
    }

    /**
     * Normalizes a phone number for canonical storage and matching.
     * Preserves leading '+' and digits only.
     */
    fun normalizePhoneNumber(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return ""
        val hasPlus = trimmed.startsWith("+")
        val digitsOnly = trimmed.filter { it.isDigit() }
        return if (hasPlus) "+$digitsOnly" else digitsOnly
    }

    /**
     * Searches contacts matching a given text query in name or phone number.
     */
    fun searchContacts(query: String, contacts: List<PhoneContact> = contactsCache): List<PhoneContact> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return contacts
        val qDigits = q.filter { it.isDigit() }
        return contacts.filter { contact ->
            contact.name.lowercase().contains(q) ||
                contact.phoneNumber.contains(q) ||
                (qDigits.isNotEmpty() && contact.normalizedNumber.contains(qDigits))
        }
    }
}
