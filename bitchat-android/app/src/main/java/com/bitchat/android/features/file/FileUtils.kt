package com.bitchat.android.features.file

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import com.bitchat.android.model.BitchatMessage
import com.bitchat.android.model.BitchatMessageType
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.*

object FileUtils {

    private const val TAG = "FileUtils"

    /**
     * Save a file from URI to app's file directory with unique filename
     */
    fun saveFileFromUri(
        context: Context,
        uri: Uri,
        originalName: String? = null
    ): String? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            if (inputStream == null) {
                Log.e(TAG, "❌ Failed to open input stream for URI: $uri")
                return null
            }
            Log.d(TAG, "📂 Opened input stream successfully")

            // Determine file extension
            val extension = originalName?.substringAfterLast(".") ?: "bin"
            val fileName = "file_${System.currentTimeMillis()}.$extension"

            // Create incoming dir if needed
            val incomingDir = File(context.filesDir, "files/incoming").apply {
                if (!exists()) mkdirs()
            }

            val file = File(incomingDir, fileName)

            inputStream.use { input ->
                FileOutputStream(file).use { output ->
                    input.copyTo(output)
                }
            }

            Log.d(TAG, "Saved file to: ${file.absolutePath}")
            file.absolutePath

        } catch (e: Exception) {
            Log.e(TAG, "Failed to save file from URI", e)
            null
        }
    }

    /**
     * Copy file to app's outgoing directory for sending
     */
    fun copyFileForSending(context: Context, uri: Uri, originalName: String? = null): String? {
        Log.d(TAG, "🔄 Starting file copy from URI: $uri")
        return try {
            val inputStream = context.contentResolver.openInputStream(uri)
            if (inputStream == null) {
                Log.e(TAG, "❌ Failed to open input stream for URI: $uri")
                return null
            }
            Log.d(TAG, "📂 Opened input stream successfully")

            // Determine original filename and extension if available
            val displayName = originalName ?: run {
                try {
                    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                        val nameIndex = cursor.getColumnIndex(android.provider.MediaStore.MediaColumns.DISPLAY_NAME)
                        if (nameIndex >= 0 && cursor.moveToFirst()) cursor.getString(nameIndex) else null
                    }
                } catch (_: Exception) { null }
            }
            val extension = displayName?.substringAfterLast('.', missingDelimiterValue = "")?.takeIf { it.isNotBlank() }
                ?: run {
                    // Try mime type to extension
                    val mime = try { context.contentResolver.getType(uri) } catch (_: Exception) { null }
                    android.webkit.MimeTypeMap.getSingleton().getExtensionFromMimeType(mime) ?: "bin"
                }
            // Preserve original filename (without artificial prefixes), ensure uniqueness
            val baseName = displayName?.substringBeforeLast('.')?.take(64)?.replace(Regex("[^A-Za-z0-9._-]"), "_")
                ?: "file"
            var fileName = if (extension.isNotBlank()) "$baseName.$extension" else baseName

            // Create outgoing dir if needed
            val outgoingDir = File(context.filesDir, "files/outgoing").apply {
                if (!exists()) mkdirs()
            }

            var target = File(outgoingDir, fileName)
            if (target.exists()) {
                var idx = 1
                val pureBase = baseName
                val dotExt = if (extension.isNotBlank()) ".${extension}" else ""
                while (target.exists() && idx < 1000) {
                    fileName = "$pureBase ($idx)$dotExt"
                    target = File(outgoingDir, fileName)
                    idx++
                }
            }

            inputStream.use { input ->
                FileOutputStream(target).use { output ->
                    input.copyTo(output)
                }
            }

            Log.d(TAG, "✅ Successfully copied file for sending: ${target.absolutePath}")
            Log.d(TAG, "📊 Final file size: ${target.length()} bytes")
            target.absolutePath

        } catch (e: Exception) {
            Log.e(TAG, "❌ CRITICAL: Failed to copy file for sending", e)
            Log.e(TAG, "❌ Source URI: $uri")
            Log.e(TAG, "❌ Original name: $originalName")
            Log.e(TAG, "❌ Error type: ${e.javaClass.simpleName}")
            null
        }
    }

    /**
     * Get MIME type for a file based on extension
     */
    fun getMimeTypeFromExtension(fileName: String): String {
        return when (fileName.substringAfterLast(".", "").lowercase()) {
            "pdf" -> "application/pdf"
            "doc" -> "application/msword"
            "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            "xls" -> "application/vnd.ms-excel"
            "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            "ppt" -> "application/vnd.ms-powerpoint"
            "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            "txt" -> "text/plain"
            "json" -> "application/json"
            "xml" -> "application/xml"
            "csv" -> "text/csv"
            "html", "htm" -> "text/html"
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "bmp" -> "image/bmp"
            "webp" -> "image/webp"
            "svg" -> "image/svg+xml"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "m4a" -> "audio/mp4"
            "mp4" -> "video/mp4"
            "avi" -> "video/x-msvideo"
            "mov" -> "video/quicktime"
            "zip" -> "application/zip"
            "rar" -> "application/vnd.rar"
            "7z" -> "application/x-7z-compressed"
            else -> "application/octet-stream"
        }
    }

    /**
     * Format file size for display
     */
    fun formatFileSize(bytes: Long): String {
        val units = arrayOf("B", "KB", "MB", "GB")
        var size = bytes.toDouble()
        var unitIndex = 0
        while (size >= 1024 && unitIndex < units.size - 1) {
            size /= 1024.0
            unitIndex++
        }
        return "%.1f %s".format(size, units[unitIndex])
    }

    /**
     * Check if file is viewable in system viewer
     */
    fun isFileViewable(fileName: String): Boolean {
        val extension = fileName.substringAfterLast(".", "").lowercase()
        return extension in listOf(
            "pdf", "txt", "json", "xml", "html", "htm", "csv",
            "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"
        )
    }

    /**
     * Save an incoming file packet to app storage and return absolute path.
     * Mirrors existing behavior used in MessageHandler (preserves names and folders).
     */
    fun saveIncomingFile(
        context: Context,
        file: com.bitchat.android.model.BitchatFilePacket
    ): String? {
        if (!file.isCompleteAndWithinLimit()) {
            Log.w(
                TAG,
                "Refusing incomplete incoming file: declared=${file.fileSize} actual=${file.content.size}"
            )
            return null
        }
        val lowerMime = file.mimeType.lowercase()
        val isImage = lowerMime.startsWith("image/")
        val isAudio = lowerMime.startsWith("audio/")
        val isVideo = lowerMime.startsWith("video/")
        // FIX: Use cacheDir instead of filesDir to prevent storage exhaustion attacks (Issue #592)
        // Files in cacheDir are eligible for automatic system cleanup when space is low
        val baseDir = context.cacheDir
        val subdir = when {
            isImage -> "images/incoming"
            isAudio -> "voicenotes/incoming"
            isVideo -> "videos/incoming"
            else -> "files/incoming"
        }
        val dir = java.io.File(baseDir, subdir).apply { mkdirs() }

        fun extFromMime(m: String): String = when (m.lowercase()) {
            "image/jpeg", "image/jpg" -> ".jpg"
            "image/png" -> ".png"
            "image/webp" -> ".webp"
            "image/gif" -> ".gif"
            "audio/mp4", "audio/m4a", "audio/aac" -> ".m4a"
            "audio/mpeg", "audio/mp3" -> ".mp3"
            "audio/wav", "audio/x-wav" -> ".wav"
            "audio/ogg" -> ".ogg"
            "video/mp4" -> ".mp4"
            "application/pdf" -> ".pdf"
            "text/plain" -> ".txt"
            else -> when {
                isImage -> ".jpg"
                isAudio -> ".m4a"
                isVideo -> ".mp4"
                else -> ".bin"
            }
        }

        // Prefer transmitted original name; ensure uniqueness to avoid overwrites
        val fallbackPrefix = when {
            isImage -> "img"
            isAudio -> "voice"
            isVideo -> "video"
            else -> "file"
        }
        val baseName = (file.fileName.takeIf { it.isNotBlank() } ?: fallbackPrefix)
            .replace(Regex("[^A-Za-z0-9._-]"), "_")
        val ext = extFromMime(lowerMime)
        var safeName = if (baseName.contains('.')) baseName else baseName + ext
        var idx = 1
        while (java.io.File(dir, safeName).exists() && idx < 1000) {
            val dot = safeName.lastIndexOf('.')
            safeName = if (dot > 0) {
                val b = safeName.substring(0, dot)
                val e = safeName.substring(dot)
                "$b ($idx)$e"
            } else {
                "$safeName ($idx)"
            }
            idx++
        }

        return try {
            val out = java.io.File(dir, safeName)
            java.io.BufferedOutputStream(java.io.FileOutputStream(out)).use { it.write(file.content) }
            out.absolutePath
        } catch (_: Exception) {
            // Fallback to cache dir with uniqueness
            try {
                var fallback = safeName
                var idx2 = 1
                while (java.io.File(context.cacheDir, fallback).exists() && idx2 < 1000) {
                    val dot = fallback.lastIndexOf('.')
                    fallback = if (dot > 0) {
                        val b = fallback.substring(0, dot)
                        val e = fallback.substring(dot)
                        "$b ($idx2)$e"
                    } else {
                        "$fallback ($idx2)"
                    }
                    idx2++
                }
                val out = java.io.File(context.cacheDir, fallback)
                java.io.BufferedOutputStream(java.io.FileOutputStream(out)).use { it.write(file.content) }
                out.absolutePath
            } catch (_: Exception) {
                try {
                    val tmp = java.io.File.createTempFile(
                        if (isImage) "img_" else "file_",
                        if (isImage) ".jpg" else ".bin"
                    )
                    java.io.BufferedOutputStream(java.io.FileOutputStream(tmp)).use { it.write(file.content) }
                    tmp.absolutePath
                } catch (error: Exception) {
                    Log.w(TAG, "Unable to persist incoming file", error)
                    null
                }
            }
        }
    }

    /**
     * Classify BitchatMessageType from MIME string used in file messages.
     */
    fun messageTypeForMime(mime: String): com.bitchat.android.model.BitchatMessageType {
        val lower = mime.lowercase()
        return when {
            lower.startsWith("image/") -> com.bitchat.android.model.BitchatMessageType.Image
            lower.startsWith("audio/") -> com.bitchat.android.model.BitchatMessageType.Audio
            else -> com.bitchat.android.model.BitchatMessageType.File
        }
    }

    /**
     * Safely load and downsample large image bitmaps up to 5 MB without OutOfMemoryError.
     */
    fun loadSafeBitmap(path: String, maxDimension: Int = 2048): android.graphics.Bitmap? {
        return try {
            val cleanPath = if (path.startsWith("file://")) path.removePrefix("file://") else path
            val file = File(cleanPath)
            if (!file.exists() || !file.canRead() || file.length() == 0L) return null

            val boundsOptions = android.graphics.BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            android.graphics.BitmapFactory.decodeFile(cleanPath, boundsOptions)

            var inSampleSize = 1
            val height = boundsOptions.outHeight
            val width = boundsOptions.outWidth
            if (height > 0 && width > 0 && (height > maxDimension || width > maxDimension)) {
                var halfHeight = height / 2
                var halfWidth = width / 2
                while ((halfHeight / inSampleSize) >= maxDimension && (halfWidth / inSampleSize) >= maxDimension) {
                    inSampleSize *= 2
                }
            }

            val decodeOptions = android.graphics.BitmapFactory.Options().apply {
                this.inSampleSize = inSampleSize
                inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888
            }
            android.graphics.BitmapFactory.decodeFile(cleanPath, decodeOptions)
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to decode bitmap from $path: ${e.message}")
            null
        }
    }

    /**
     * Recursively delete all media files (incoming and outgoing)
     * Used for Panic Mode cleanup
     */
    fun clearAllMedia(context: Context) {
        try {
            // Clear files dir subdirectories (legacy storage and outgoing)
            val filesDir = context.filesDir
            val dirsToClear = listOf(
                "files/incoming",
                "files/outgoing",
                "images/incoming",
                "images/outgoing",
                "voicenotes"
            )

            dirsToClear.forEach { subDir ->
                val dir = File(filesDir, subDir)
                if (dir.exists()) {
                    dir.deleteRecursively()
                    Log.d(TAG, "Deleted media directory from filesDir: $subDir")
                }
            }
            
            // Clear cache dir subdirectories (new incoming storage)
            // Note: cacheDir.deleteRecursively() below would handle this, but being explicit ensures these
            // specific media folders are targeted even if full cache clear fails or is modified later.
            val cacheDir = context.cacheDir
            val cacheDirsToClear = listOf(
                "files/incoming",
                "images/incoming"
            )
            
            cacheDirsToClear.forEach { subDir ->
                val dir = File(cacheDir, subDir)
                if (dir.exists()) {
                    dir.deleteRecursively()
                    Log.d(TAG, "Deleted media directory from cacheDir: $subDir")
                }
            }
            
            // Also clear entire cache dir as a catch-all
            context.cacheDir.deleteRecursively()
            Log.d(TAG, "Cleared entire cache directory")

        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear media files", e)
        }
    }

    /**
     * Delete app-owned media referenced only by the conversation being removed.
     *
     * Canonical-path checks prevent message content from turning this into an arbitrary-file
     * deletion primitive. Shared paths remain intact while any retained message still references
     * them.
     */
    fun deleteConversationMedia(
        context: Context,
        deletedMessages: Collection<BitchatMessage>,
        retainedMessages: Collection<BitchatMessage>
    ) {
        val mediaTypes = setOf(
            BitchatMessageType.Audio,
            BitchatMessageType.Image,
            BitchatMessageType.File
        )
        val roots = listOf(context.filesDir, context.cacheDir)
            .mapNotNull { runCatching { it.canonicalFile }.getOrNull() }
        val retainedPaths = retainedMessages
            .asSequence()
            .filter { it.type in mediaTypes }
            .mapNotNull { message ->
                runCatching { File(message.content.trim()).canonicalPath }.getOrNull()
            }
            .toSet()

        deletedMessages
            .asSequence()
            .filter { it.type in mediaTypes }
            .mapNotNull { message ->
                runCatching { File(message.content.trim()).canonicalFile }.getOrNull()
            }
            .distinctBy(File::getPath)
            .filter { file ->
                file.path !in retainedPaths &&
                    roots.any { root ->
                        file.path == root.path ||
                            file.path.startsWith(root.path + File.separator)
                    }
            }
            .forEach { file ->
                runCatching {
                    if (file.isFile && !file.delete()) {
                        Log.w(TAG, "Unable to delete conversation media")
                    }
                }
            }
    }

    /**
     * Deletes paths proven by the conversation database to have no remaining message reference.
     * The same canonical-root boundary as explicit conversation deletion prevents arbitrary paths
     * from being removed even if persisted metadata is malformed.
     */
    fun deleteStoredMediaPaths(context: Context, paths: Collection<String>) {
        val roots = listOf(context.filesDir, context.cacheDir)
            .mapNotNull { runCatching { it.canonicalFile }.getOrNull() }
        paths.asSequence()
            .mapNotNull { runCatching { File(it).canonicalFile }.getOrNull() }
            .distinctBy(File::getPath)
            .filter { file ->
                roots.any { root ->
                    file.path == root.path ||
                        file.path.startsWith(root.path + File.separator)
                }
            }
            .forEach { file ->
                runCatching {
                    if (file.isFile && !file.delete()) {
                        Log.w(TAG, "Unable to delete unreferenced conversation media")
                    }
                }
            }
    }
}
