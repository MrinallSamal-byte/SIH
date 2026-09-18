-- SOS idempotency + hot-path indexes.
-- Normalize stored volunteer phones to digits-only (last 10) so the login
-- lookup (which strips formatting from user input) can actually match seeded
-- rows like '+91-9876510000'.
UPDATE "Volunteer"
SET "phone" = right(regexp_replace("phone", '\D', '', 'g'), 10)
WHERE "phone" IS NOT NULL AND "phone" <> '';

-- Offline-replay idempotency for SOS / reports.
ALTER TABLE "Report" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Report" ADD COLUMN "clientCreatedAt" TIMESTAMP(3);

-- Dedupe key for outbox replays (nullable: legacy rows and direct API calls).
CREATE UNIQUE INDEX "Report_clientRequestId_key" ON "Report"("clientRequestId");

-- Hot admin/citizen query paths: filter by status (or priority) + sort by recency.
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_priorityLabel_createdAt_idx" ON "Report"("priorityLabel", "createdAt");

-- Volunteer login lookup by normalized phone.
CREATE INDEX "Volunteer_phone_idx" ON "Volunteer"("phone");
