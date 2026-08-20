package com.bitchat.android.features.voice

import com.bitchat.android.features.file.FileUtils
import com.bitchat.android.util.AppConstants
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class VoiceRecordLimitTest {

    @Test
    fun testMediaLimitConstantIs5MB() {
        val expected5MB = 5L * 1024L * 1024L
        assertEquals(expected5MB, AppConstants.Media.MAX_FILE_SIZE_BYTES)
    }

    @Test
    fun testFileSizeFormatting() {
        assertEquals("500.0 B", FileUtils.formatFileSize(500L))
        assertEquals("1.0 KB", FileUtils.formatFileSize(1024L))
        assertEquals("5.0 MB", FileUtils.formatFileSize(5L * 1024L * 1024L))
        assertEquals("5.5 MB", FileUtils.formatFileSize((5.5 * 1024 * 1024).toLong()))
    }

    @Test
    fun testFragmentationConstantsAccommodate5MB() {
        val maxFileSize = AppConstants.Media.MAX_FILE_SIZE_BYTES
        val maxTotalBytes = AppConstants.Fragmentation.MAX_FRAGMENT_TOTAL_BYTES.toLong()
        val maxGlobalBytes = AppConstants.Fragmentation.MAX_GLOBAL_FRAGMENT_TOTAL_BYTES
        val maxFragments = AppConstants.Fragmentation.MAX_FRAGMENTS_PER_ID.toLong()
        val maxFragSize = AppConstants.Fragmentation.MAX_FRAGMENT_SIZE.toLong()

        assertTrue("Total reassembly buffer ($maxTotalBytes) must be >= 5 MB ($maxFileSize)", maxTotalBytes >= maxFileSize)
        assertTrue("Global fragment buffer ($maxGlobalBytes) must be >= 10 MB", maxGlobalBytes >= maxFileSize * 2)
        assertTrue("Max fragments ($maxFragments) * max fragment size ($maxFragSize) must be >= 5 MB ($maxFileSize)", (maxFragments * maxFragSize) >= maxFileSize)
    }
}
