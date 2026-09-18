-- P0 trust + escalation + push foundations.
-- OTP phone verification, volunteer trust tiers, RED escalation SLA fields,
-- Web Push subscriptions, shelter self check-in codes.

CREATE TYPE "VolunteerVerification" AS ENUM ('pending', 'verified', 'suspended');

-- Caller verification + near-duplicate SOS clustering on reports.
ALTER TABLE "Report" ADD COLUMN "reporterPhoneNormalized" TEXT;
ALTER TABLE "Report" ADD COLUMN "reporterPhoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Report_reporterPhoneNormalized_idx" ON "Report"("reporterPhoneNormalized");

-- Volunteer trust tiers. Existing roster rows were admin-created before
-- verification existed, so grandfather them in as verified.
ALTER TABLE "Volunteer" ADD COLUMN "verificationStatus" "VolunteerVerification" NOT NULL DEFAULT 'pending';
ALTER TABLE "Volunteer" ADD COLUMN "personalCodeHash" TEXT;
ALTER TABLE "Volunteer" ADD COLUMN "trainingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Volunteer" ADD COLUMN "idDocumentRef" TEXT;

UPDATE "Volunteer" SET "verificationStatus" = 'verified' WHERE "verificationStatus" = 'pending';

CREATE INDEX "Volunteer_verificationStatus_idx" ON "Volunteer"("verificationStatus");

-- Public self check-in code per shelter (nullable: backfilled on next update).
ALTER TABLE "Shelter" ADD COLUMN "checkinCode" TEXT;
CREATE UNIQUE INDEX "Shelter_checkinCode_key" ON "Shelter"("checkinCode");

-- OTP challenge state. Codes are stored as sha256 hashes only.
CREATE TABLE "OtpRequest" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'sos_verify',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpRequest_phone_idx" ON "OtpRequest"("phone");
CREATE INDEX "OtpRequest_expiresAt_idx" ON "OtpRequest"("expiresAt");

-- Single-use verified-phone tokens. Wire format `<id>.<secret>`; only the
-- sha256 of the secret is stored.
CREATE TABLE "PhoneVerification" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhoneVerification_tokenHash_key" ON "PhoneVerification"("tokenHash");
CREATE INDEX "PhoneVerification_phone_idx" ON "PhoneVerification"("phone");
CREATE INDEX "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");

-- Web Push subscriptions. Stored until a VAPID sender is configured; the
-- broadcaster reports honest queued/skipped counts meanwhile.
CREATE TABLE "PushSubscription" (
    "id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT,
    "auth" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_createdAt_idx" ON "PushSubscription"("createdAt");
