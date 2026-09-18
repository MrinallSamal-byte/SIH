-- =============================================================================
-- Full Supabase Setup for xkolfkroltdzdnpbovei (AapdaSetu + CodeMentor)
-- Run in Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run
-- Idempotent: safe to re-run (uses IF NOT EXISTS / DO blocks)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =========================
-- AapdaSetu Enums
-- =========================
DO $$ BEGIN CREATE TYPE "IncidentType" AS ENUM ('fire','flood','medical','missing_person','earthquake','accident','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IncidentStatus" AS ENUM ('pending','in_progress','resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PriorityLabel" AS ENUM ('RED','YELLOW','GREEN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VolunteerSkill" AS ENUM ('medical','search_rescue','driving','logistics'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VolunteerStatus" AS ENUM ('available','on_duty','offline'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ShelterStatus" AS ENUM ('open','full','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FacilityType" AS ENUM ('food','water','medical_station','power_generator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AgencyType" AS ENUM ('fire_department','police','ndrf','hospital','ngo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ResourceCategory" AS ENUM ('food','water','medical','clothing','fuel'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AlertSeverity" AS ENUM ('info','warning','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AlertChannel" AS ENUM ('sms','whatsapp','public','all'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CheckinStatus" AS ENUM ('safe','need_assistance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DamageClassification" AS ENUM ('MINOR_DAMAGE','MAJOR_STRUCTURAL_DAMAGE','FULLY_DESTROYED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MatchStatus" AS ENUM ('pending','confirmed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- AapdaSetu Tables
-- =========================

CREATE TABLE IF NOT EXISTS "Volunteer" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "skills" "VolunteerSkill"[] NOT NULL DEFAULT '{}',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "status" "VolunteerStatus" NOT NULL DEFAULT 'available',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Volunteer_status_idx" ON "Volunteer"("status");
CREATE INDEX IF NOT EXISTS "Volunteer_phone_idx" ON "Volunteer"("phone");
CREATE INDEX IF NOT EXISTS "Volunteer_lat_lon_idx" ON "Volunteer"("latitude","longitude");

CREATE TABLE IF NOT EXISTS "Agency" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" "AgencyType" NOT NULL,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "jurisdiction" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Agency_type_idx" ON "Agency"("type");

CREATE TABLE IF NOT EXISTS "Shelter" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "capacity" INTEGER NOT NULL,
  "occupancy" INTEGER NOT NULL DEFAULT 0,
  "facilities" "FacilityType"[] NOT NULL DEFAULT '{}',
  "contactPhone" TEXT,
  "status" "ShelterStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Shelter_status_idx" ON "Shelter"("status");

CREATE TABLE IF NOT EXISTS "Report" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trackingId" TEXT UNIQUE NOT NULL DEFAULT ('RPT-' || substr(md5(random()::text),1,8)),
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
  "mediaType" TEXT NOT NULL DEFAULT 'none',
  "triageFactors" JSONB,
  "assignedVolunteerId" UUID REFERENCES "Volunteer"("id") ON DELETE SET NULL,
  "assignedAgencyId" UUID REFERENCES "Agency"("id") ON DELETE SET NULL,
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "source" TEXT,
  "clientRequestId" TEXT UNIQUE,
  "clientCreatedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");
CREATE INDEX IF NOT EXISTS "Report_priorityLabel_idx" ON "Report"("priorityLabel");
CREATE INDEX IF NOT EXISTS "Report_type_idx" ON "Report"("type");
CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report"("status","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Report_priority_createdAt_idx" ON "Report"("priorityLabel","createdAt" DESC);

CREATE TABLE IF NOT EXISTS "Resource" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "category" "ResourceCategory" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "shelterId" UUID REFERENCES "Shelter"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Alert" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "channel" "AlertChannel" NOT NULL DEFAULT 'public',
  "targetArea" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Alert_severity_idx" ON "Alert"("severity");
CREATE INDEX IF NOT EXISTS "Alert_createdAt_idx" ON "Alert"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "MissingPerson" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "age" INTEGER,
  "gender" TEXT,
  "lastSeenAt" TIMESTAMPTZ,
  "lastSeenLocation" TEXT,
  "clothes" TEXT,
  "contactPhone" TEXT,
  "photoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "MissingPerson_status_idx" ON "MissingPerson"("status");

CREATE TABLE IF NOT EXISTS "SafetyCheckin" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "phoneNormalized" TEXT,
  "locationName" TEXT,
  "notes" TEXT,
  "status" "CheckinStatus" NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "SafetyCheckin_phoneNormalized_idx" ON "SafetyCheckin"("phoneNormalized");

CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "lastLoginAt" TIMESTAMPTZ,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "DamageAssessment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportId" UUID REFERENCES "Report"("id") ON DELETE SET NULL,
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
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "DamageAssessment_imageHash_idx" ON "DamageAssessment"("imageHash");

CREATE TABLE IF NOT EXISTS "MissingPersonMatch" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportAId" UUID NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "reportBId" UUID NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "score" DOUBLE PRECISION NOT NULL,
  "reasons" JSONB,
  "status" "MatchStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  UNIQUE("reportAId","reportBId")
);

CREATE TABLE IF NOT EXISTS "RouteHazard" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "name" TEXT,
  "geometry" JSONB NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Dispatch" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportId" UUID NOT NULL REFERENCES "Report"("id") ON DELETE CASCADE,
  "volunteerId" UUID REFERENCES "Volunteer"("id") ON DELETE SET NULL,
  "agencyId" UUID REFERENCES "Agency"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "assignedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated at trigger for AapdaSetu
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW."updatedAt" = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_report_updated ON "Report"; CREATE TRIGGER trg_report_updated BEFORE UPDATE ON "Report" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_volunteer_updated ON "Volunteer"; CREATE TRIGGER trg_volunteer_updated BEFORE UPDATE ON "Volunteer" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_shelter_updated ON "Shelter"; CREATE TRIGGER trg_shelter_updated BEFORE UPDATE ON "Shelter" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_agency_updated ON "Agency"; CREATE TRIGGER trg_agency_updated BEFORE UPDATE ON "Agency" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_alert_updated ON "Alert"; CREATE TRIGGER trg_alert_updated BEFORE UPDATE ON "Alert" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_damage_updated ON "DamageAssessment"; CREATE TRIGGER trg_damage_updated BEFORE UPDATE ON "DamageAssessment" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

