-- Second-pass fixes: check-in family search scalability + volunteer revocation.
-- Normalize stored check-in phones to digits-only last-10 so the public family
-- search can query an indexed column instead of a bounded scan-then-filter.
ALTER TABLE "SafetyCheckin" ADD COLUMN "phoneNormalized" TEXT;

UPDATE "SafetyCheckin"
SET "phoneNormalized" = right(regexp_replace("phone", '\D', '', 'g'), 10)
WHERE "phone" IS NOT NULL
  AND "phone" <> ''
  AND regexp_replace("phone", '\D', '', 'g') <> '';

CREATE INDEX "SafetyCheckin_phoneNormalized_idx" ON "SafetyCheckin"("phoneNormalized");

-- Volunteer revocation: requireVolunteer re-checks this in the DB so a
-- disabled volunteer's token stops working immediately.
ALTER TABLE "Volunteer" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
