package com.bitchat.android.features.admin

/**
 * Simple bridge to allow AboutSheet (which doesn't have direct access to ChatViewModel)
 * to trigger the admin panel opening. Set by ChatScreen at composition time.
 */
object AboutSheetAdminBridge {
    var onOpenAdmin: (() -> Unit)? = null
}
