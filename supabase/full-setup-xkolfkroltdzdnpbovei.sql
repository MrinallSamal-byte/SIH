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

-- =========================
-- CodeMentor Tables (18)
-- =========================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT ''::text,
  preferred_language TEXT DEFAULT 'python'::text,
  learning_style TEXT DEFAULT 'balanced'::text,
  skill_level TEXT DEFAULT 'beginner'::text,
  current_streak INTEGER DEFAULT 0,
  last_active_date DATE DEFAULT CURRENT_DATE,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  avatar_url TEXT DEFAULT 'tech_bot'::text,
  longest_streak INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'python'::text NOT NULL,
  track TEXT DEFAULT 'fundamentals'::text NOT NULL,
  difficulty TEXT DEFAULT 'beginner'::text NOT NULL,
  topic TEXT DEFAULT ''::text,
  status TEXT DEFAULT 'active'::text NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_code TEXT,
  session_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT DEFAULT ''::text NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON public.chat_messages(user_id);

CREATE TABLE IF NOT EXISTS public.code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  code TEXT DEFAULT ''::text NOT NULL,
  problem_title TEXT DEFAULT ''::text,
  status TEXT DEFAULT 'pending'::text NOT NULL,
  output TEXT DEFAULT ''::text,
  feedback TEXT DEFAULT ''::text,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_code_submissions_user ON public.code_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_session ON public.code_submissions(session_id);

CREATE TABLE IF NOT EXISTS public.progress_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  track TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'not_started'::text NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_score INTEGER DEFAULT 0,
  strength_rating INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  repetitions INTEGER DEFAULT 0,
  ease_factor DOUBLE PRECISION DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id, language, track, topic)
);

CREATE TABLE IF NOT EXISTS public.simulation_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_type TEXT NOT NULL,
  interactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  user_answer INTEGER,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE NOT NULL,
  language TEXT NOT NULL,
  track TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starter_code TEXT,
  solution TEXT,
  difficulty TEXT DEFAULT 'beginner'::text NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'pending'::text NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT 'Award'::text NOT NULL,
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  category TEXT DEFAULT 'general'::text
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  claimed BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'ai_explanation'::text NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  updated_at TIMESTAMPTZ DEFAULT now(),
  diagram_data JSONB,
  diagram_preview TEXT
);

CREATE TABLE IF NOT EXISTS public.adaptive_difficulty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  track TEXT NOT NULL,
  current_level TEXT DEFAULT 'beginner'::text NOT NULL,
  success_rate DOUBLE PRECISION DEFAULT 0 NOT NULL,
  total_attempts INTEGER DEFAULT 0 NOT NULL,
  correct_attempts INTEGER DEFAULT 0 NOT NULL,
  avg_response_time_ms INTEGER,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, language, track)
);

CREATE TABLE IF NOT EXISTS public.problem_hints (
  id TEXT PRIMARY KEY,
  tiers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.doc_hints (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.doc_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_set TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'completed'::text NOT NULL,
  quiz_passed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, doc_set, slug)
);

CREATE TABLE IF NOT EXISTS public.user_problem_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, problem_id)
);

CREATE TABLE IF NOT EXISTS public.user_unlocked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_type, target_id, item_id)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.email,'')) ON CONFLICT (id) DO NOTHING; RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Streak/XP helpers
CREATE OR REPLACE FUNCTION public.increment_xp(user_id UUID, amount INTEGER) RETURNS VOID AS $$
BEGIN UPDATE public.profiles SET total_xp = total_xp + amount, updated_at = now() WHERE id = user_id; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.award_doc_completion_xp(p_user_id UUID, p_doc_set TEXT, p_slug TEXT, p_quiz BOOLEAN) RETURNS VOID AS $$
DECLARE v_exists BOOLEAN; BEGIN
  SELECT EXISTS (SELECT 1 FROM public.doc_progress WHERE user_id=p_user_id AND doc_set=p_doc_set AND slug=p_slug) INTO v_exists;
  IF NOT v_exists THEN
    INSERT INTO public.doc_progress (user_id, doc_set, slug, quiz_passed) VALUES (p_user_id, p_doc_set, p_slug, p_quiz)
    ON CONFLICT (user_id, doc_set, slug) DO UPDATE SET quiz_passed = EXCLUDED.quiz_passed, updated_at=now();
    PERFORM public.increment_xp(p_user_id, CASE WHEN p_quiz THEN 50 ELSE 20 END);
  END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.profile_stats_aggregate(target_user_id UUID) RETURNS JSON AS $$
DECLARE result JSON; BEGIN
  SELECT json_build_object('total_xp', COALESCE(total_xp,0), 'current_streak', COALESCE(current_streak,0), 'longest_streak', COALESCE(longest_streak,0))
  INTO result FROM public.profiles WHERE id=target_user_id;
  RETURN COALESCE(result, '{}'::json);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- RLS
-- =========================

-- Enable RLS on CodeMentor tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_difficulty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_problem_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
-- Public read tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_hints ENABLE ROW LEVEL SECURITY;

-- Policies: own data
DO $$ BEGIN
  CREATE POLICY select_own_profile ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY update_own_profile ON public.profiles FOR UPDATE USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY insert_own_profile ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY select_own_sessions ON public.learning_sessions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY insert_own_sessions ON public.learning_sessions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY update_own_sessions ON public.learning_sessions FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY delete_own_sessions ON public.learning_sessions FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY select_own_messages ON public.chat_messages FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY insert_own_messages ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY update_own_messages ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY delete_own_messages ON public.chat_messages FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY select_own_submissions ON public.code_submissions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY insert_own_submissions ON public.code_submissions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY update_own_submissions ON public.code_submissions FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY delete_own_submissions ON public.code_submissions FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY select_achievements ON public.achievements FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY select_daily_challenges ON public.daily_challenges FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY select_problem_hints ON public.problem_hints FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY select_doc_hints ON public.doc_hints FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY select_own_doc_progress ON public.doc_progress FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY insert_own_doc_progress ON public.doc_progress FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY update_own_doc_progress ON public.doc_progress FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AapdaSetu: enable RLS but allow backend service_role to bypass; anon can read public data (alerts/shelters)
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Volunteer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shelter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissingPerson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SafetyCheckin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DamageAssessment" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY allow_all_report ON "Report" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_volunteer ON "Volunteer" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_shelter ON "Shelter" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_agency ON "Agency" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_alert ON "Alert" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_missing ON "MissingPerson" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_checkin ON "SafetyCheckin" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY allow_all_damage ON "DamageAssessment" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Realtime
-- =========================
-- Enable replica identity FULL for realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.learning_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.code_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.quiz_questions REPLICA IDENTITY FULL;
ALTER TABLE public.session_notes REPLICA IDENTITY FULL;
ALTER TABLE "Report" REPLICA IDENTITY FULL;
ALTER TABLE "Shelter" REPLICA IDENTITY FULL;
ALTER TABLE "Alert" REPLICA IDENTITY FULL;
ALTER TABLE "SafetyCheckin" REPLICA IDENTITY FULL;
ALTER TABLE "MissingPerson" REPLICA IDENTITY FULL;
ALTER TABLE "DamageAssessment" REPLICA IDENTITY FULL;
ALTER TABLE "Volunteer" REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.code_submissions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_questions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_records; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.doc_progress; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Report"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Shelter"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Alert"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "SafetyCheckin"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "MissingPerson"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "DamageAssessment"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Volunteer"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Agency"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Resource"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE "Dispatch"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Seed Achievements
-- =========================
INSERT INTO public.achievements (key, name, description, icon, xp_reward, category) VALUES
('first_steps','First Steps','Complete your first lesson','Award',50,'general'),
('streak_3','3-Day Streak','Maintain a 3 day streak','Flame',100,'streak'),
('streak_7','Week Warrior','Maintain a 7 day streak','Trophy',250,'streak'),
('code_master','Code Master','Submit 10 code solutions','Code',200,'coding'),
('quiz_ace','Quiz Ace','Score 100% on 5 quizzes','Brain',150,'quiz')
ON CONFLICT (key) DO NOTHING;

-- Seed daily challenge
INSERT INTO public.daily_challenges (challenge_date, language, track, title, description, starter_code, solution, difficulty)
VALUES (CURRENT_DATE, 'python','fundamentals','Two Sum','Find two numbers that add up to target','def two_sum(nums, target):\n    pass','def two_sum(nums, target):\n    m={}\n    for i,n in enumerate(nums):\n        if target-n in m: return [m[target-n], i]\n        m[n]=i', 'beginner')
ON CONFLICT (challenge_date) DO NOTHING;

-- Verify
SELECT 'Setup complete. Tables:' as msg, count(*) as public_tables FROM pg_tables WHERE schemaname='public';
