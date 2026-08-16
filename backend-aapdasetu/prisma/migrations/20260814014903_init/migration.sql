-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('fire', 'flood', 'medical', 'missing_person', 'earthquake', 'accident', 'other');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('pending', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "PriorityLabel" AS ENUM ('RED', 'YELLOW', 'GREEN');

-- CreateEnum
CREATE TYPE "VolunteerSkill" AS ENUM ('medical', 'search_rescue', 'driving', 'logistics');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('available', 'on_duty', 'offline');

-- CreateEnum
CREATE TYPE "ShelterStatus" AS ENUM ('open', 'full', 'closed');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('food', 'water', 'medical_station', 'power_generator');

-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('fire_department', 'police', 'ndrf', 'hospital', 'ngo');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('food', 'water', 'medical', 'clothing', 'fuel');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('sms', 'whatsapp', 'public', 'all');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('safe', 'need_assistance');

-- CreateEnum
CREATE TYPE "DamageClassification" AS ENUM ('MINOR_DAMAGE', 'MAJOR_STRUCTURAL_DAMAGE', 'FULLY_DESTROYED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "trackingId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'pending',
    "priorityScore" SMALLINT NOT NULL DEFAULT 30,
    "priorityLabel" "PriorityLabel" NOT NULL DEFAULT 'GREEN',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "landmark" TEXT,
    "description" TEXT,
    "reporterName" TEXT,
    "reporterPhone" TEXT,
    "missingPersonName" TEXT,
    "missingPersonAge" INTEGER,
    "missingPersonDesc" TEXT,
    "medicalCondition" TEXT,
    "bloodType" TEXT,
    "mediaData" TEXT,
    "mediaType" TEXT DEFAULT 'none',
    "triageFactors" JSONB,
    "assignedVolunteerId" UUID,
    "assignedAgencyId" UUID,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "skills" "VolunteerSkill"[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "VolunteerStatus" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelter" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "facilities" "FacilityType"[],
    "contactPhone" TEXT,
    "status" "ShelterStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shelter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgencyType" NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "jurisdiction" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "shelterId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'public',
    "targetArea" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyCheckin" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "locationName" TEXT,
    "notes" TEXT,
    "status" "CheckinStatus" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageAssessment" (
    "id" UUID NOT NULL,
    "reportId" UUID,
    "reporterName" TEXT,
    "reporterPhone" TEXT,
    "imageHash" TEXT,
    "exifLatitude" DOUBLE PRECISION,
    "exifLongitude" DOUBLE PRECISION,
    "reportedLatitude" DOUBLE PRECISION,
    "reportedLongitude" DOUBLE PRECISION,
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "locationDistanceM" DOUBLE PRECISION,
    "classification" "DamageClassification" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "compensation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawModelResponse" JSONB,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissingPersonMatch" (
    "id" UUID NOT NULL,
    "reportAId" UUID NOT NULL,
    "reportBId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB,
    "status" "MatchStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "MissingPersonMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteHazard" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "geometry" JSONB NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteHazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "volunteerId" UUID,
    "agencyId" UUID,
    "action" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_trackingId_key" ON "Report"("trackingId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_priorityLabel_idx" ON "Report"("priorityLabel");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- CreateIndex
CREATE INDEX "Report_latitude_longitude_idx" ON "Report"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Report_assignedVolunteerId_idx" ON "Report"("assignedVolunteerId");

-- CreateIndex
CREATE INDEX "Report_assignedAgencyId_idx" ON "Report"("assignedAgencyId");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");

-- CreateIndex
CREATE INDEX "Volunteer_latitude_longitude_idx" ON "Volunteer"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Shelter_status_idx" ON "Shelter"("status");

-- CreateIndex
CREATE INDEX "Shelter_latitude_longitude_idx" ON "Shelter"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Agency_type_idx" ON "Agency"("type");

-- CreateIndex
CREATE INDEX "Agency_jurisdiction_idx" ON "Agency"("jurisdiction");

-- CreateIndex
CREATE INDEX "Resource_shelterId_idx" ON "Resource"("shelterId");

-- CreateIndex
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_channel_idx" ON "Alert"("channel");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminEmail_idx" ON "AuditLog"("adminEmail");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "SafetyCheckin_status_idx" ON "SafetyCheckin"("status");

-- CreateIndex
CREATE INDEX "SafetyCheckin_createdAt_idx" ON "SafetyCheckin"("createdAt");

-- CreateIndex
CREATE INDEX "SafetyCheckin_latitude_longitude_idx" ON "SafetyCheckin"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "DamageAssessment_imageHash_idx" ON "DamageAssessment"("imageHash");

-- CreateIndex
CREATE INDEX "DamageAssessment_reportId_idx" ON "DamageAssessment"("reportId");

-- CreateIndex
CREATE INDEX "DamageAssessment_createdAt_idx" ON "DamageAssessment"("createdAt");

-- CreateIndex
CREATE INDEX "MissingPersonMatch_status_idx" ON "MissingPersonMatch"("status");

-- CreateIndex
CREATE INDEX "MissingPersonMatch_score_idx" ON "MissingPersonMatch"("score");

-- CreateIndex
CREATE UNIQUE INDEX "MissingPersonMatch_reportAId_reportBId_key" ON "MissingPersonMatch"("reportAId", "reportBId");

-- CreateIndex
CREATE INDEX "RouteHazard_active_idx" ON "RouteHazard"("active");

-- CreateIndex
CREATE INDEX "RouteHazard_type_idx" ON "RouteHazard"("type");

-- CreateIndex
CREATE INDEX "Dispatch_reportId_idx" ON "Dispatch"("reportId");

-- CreateIndex
CREATE INDEX "Dispatch_createdAt_idx" ON "Dispatch"("createdAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedVolunteerId_fkey" FOREIGN KEY ("assignedVolunteerId") REFERENCES "Volunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedAgencyId_fkey" FOREIGN KEY ("assignedAgencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageAssessment" ADD CONSTRAINT "DamageAssessment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingPersonMatch" ADD CONSTRAINT "MissingPersonMatch_reportAId_fkey" FOREIGN KEY ("reportAId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingPersonMatch" ADD CONSTRAINT "MissingPersonMatch_reportBId_fkey" FOREIGN KEY ("reportBId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
