package com.bitchat.android.features.admin

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
class UserReportTest {

    private lateinit var context: Context
    private lateinit var db: AdminDatabase

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        AdminManager.initialize(context)
        db = AdminDatabase.getInstance(context)
    }

    @Test
    fun testUserReportCreationAndStore() {
        val report = UserReport(
            id = UUID.randomUUID().toString(),
            reportedPeerID = "bad_actor_peer_999",
            reportedNickname = "spammer_bob",
            reporterPeerID = "good_samaritan_111",
            reporterNickname = "alice",
            reason = "Spamming link in general chat",
            timestamp = System.currentTimeMillis(),
            status = ReportStatus.PENDING
        )

        AdminManager.addReport(report)
        val reports = AdminManager.reports.value
        assertTrue("Report must be stored in AdminManager", reports.any { it.reportedPeerID == "bad_actor_peer_999" && it.reportedNickname == "spammer_bob" })
    }

    @Test
    fun testReportStatusTransitions() {
        val reportId = UUID.randomUUID().toString()
        val report = UserReport(
            id = reportId,
            reportedPeerID = "trouble_maker_222",
            reportedNickname = "troll",
            reporterPeerID = "reporter_333",
            reporterNickname = "carol",
            reason = "Inappropriate behavior",
            timestamp = System.currentTimeMillis(),
            status = ReportStatus.PENDING
        )

        AdminManager.addReport(report)
        AdminManager.actOnReport(reportId, ReportAction.WARN)

        val updatedReports = AdminManager.reports.value
        val updated = updatedReports.firstOrNull { it.id == reportId }
        assertNotNull(updated)
        assertEquals(ReportStatus.REVIEWED, updated?.status)
    }

    @Test
    fun testDismissReport() {
        val reportId = UUID.randomUUID().toString()
        val report = UserReport(
            id = reportId,
            reportedPeerID = "false_alarm_peer",
            reportedNickname = "dave",
            reporterPeerID = "reporter_444",
            reporterNickname = "eve",
            reason = "Mistake",
            timestamp = System.currentTimeMillis(),
            status = ReportStatus.PENDING
        )

        AdminManager.addReport(report)
        AdminManager.dismissReport(reportId)

        val updatedReports = AdminManager.reports.value
        val updated = updatedReports.firstOrNull { it.id == reportId }
        assertNotNull(updated)
        assertEquals(ReportStatus.DISMISSED, updated?.status)
    }
}
