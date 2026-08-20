package com.bitchat.android.model

data class DeleteControlMessage(
    val targetMessageID: String
) {
    companion object {
        private const val PREFIX = "[DELETE_MESSAGE]:"

        fun parse(content: String): DeleteControlMessage? {
            val trimmed = content.trim()
            if (!trimmed.startsWith(PREFIX)) return null
            val messageID = trimmed.substringAfter(PREFIX).trim()
            if (messageID.isEmpty()) return null
            return DeleteControlMessage(targetMessageID = messageID)
        }

        fun encode(targetMessageID: String): String {
            return "$PREFIX$targetMessageID"
        }
    }
}
