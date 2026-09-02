You are the backend engineer implementing a new feature for AapdaSetu.

Before writing any code, thoroughly read `docs/sms_sos_bot_spec.md` in this
repository — it is the source of truth for this feature's flow, data model,
and reuse plan. Also read `prisma/schema.prisma`,
`src/services/reports.service.ts`, `src/services/checkins.service.ts`,
`src/services/communications.service.ts`, `src/adapters/openrouter.client.ts`,
and `src/config/env.ts` so you build on the real current code, not the
aspirational feature descriptions in the root `README.md`/`tech.md`.

---

## OBJECTIVE

Implement an inbound SMS-based SOS intake: a citizen texts a keyword to a
provisioned number, the message is parsed, and — once a valid location is
known — a `Report` row is created through the existing `createSosReport()`
pipeline exactly as if it came from the web 1-Tap SOS button. A confirmation
(or a request for a location) is sent back over SMS.

---

## HARD CONSTRAINTS — do not violate these

- **Do not use Twilio for this.** Twilio SMS to India is one-way outbound
  only — confirmed via Twilio's own documentation; recipients cannot reply.
  That is why Twilio is already wired only for the outbound broadcast alerts
  in `communications.service.ts`. This feature needs an actual two-way
  gateway — default to MSG91 unless told otherwise.
- **Do not invent GPS-based auto-location.** A plain SMS carries no
  coordinates. The only two legitimate location sources are (1) a phone
  number's previously-saved `SmsRegistration` row, or (2) free text the
  sender typed, resolved against the `KnownLocation` table.
- **Do not call `createSosReport()` with guessed, default, or
  district-center coordinates** when a location can't be resolved.
  `latitude`/`longitude` are required, non-nullable fields on `Report`. If
  resolution fails, reply asking for a landmark/PIN and stop — do not create
  a report with a fabricated location.
- **Do not hardcode a guessed inbound webhook payload schema as verified
  fact.** Log the raw payload on first receipt and parse defensively (accept
  `from`/`sender`/`mobile`/`msisdn` and `text`/`message`/`body`) until a real
  sample is confirmed from the gateway dashboard. Say explicitly in your
  final report which of the two you did.
- **Do not duplicate phone-normalization logic.** Extract the existing
  `normalizePhone()` out of `checkins.service.ts` into a shared
  `src/lib/phone.ts` and use it from both places.
- **Do not touch** the web `/sos` or `/reports` routes, the triage engine, or
  the Command Center. This feature is a new ingress into the existing
  pipeline, not a rebuild of it.
- **Do not use paid services.** MSG91's pay-as-you-go wallet with free trial
  credit is fine; do not add anything requiring a monthly subscription.

---

## WHAT TO BUILD

1. Prisma models `KnownLocation` and `SmsRegistration` (see spec §4) +
   migration, run the same way the existing `prisma/migrations/` entries
   were generated.
2. `POST /api/sms/inbound` — route, controller, service (spec §5).
3. `src/adapters/sms-gateway.client.ts` — a generalized single-recipient
   `sendSms(to, body)`, provider selected by `SMS_GATEWAY_PROVIDER`, MSG91
   implementation first, mirroring the shape of the existing
   `adapters/openrouter.client.ts`.
4. Command parsing + location resolution per spec §10 (the full grammar
   table — implement every row, including the "no report created" branches).
5. Unit tests (vitest) for the command parser, the location resolver, and
   `normalizePhone()`, in `tests/`, matching the style of the existing
   `triage.test.ts`.
6. `scripts/sms-smoke-test.mjs`, modeled on the existing
   `scripts/smoke-test.mjs`.
7. One new citizen-facing card on the Home page (frontend,
   `frontend-aapdasetu/`) per spec §12 — this has no backend dependency in
   either direction; do it last and keep it small.

---

## FINAL OUTPUT REQUIRED

Do not just say "done." Provide:

1. Every new/changed file, with a one-line reason for each.
2. The exact webhook payload shape you ended up parsing against, and whether
   it came from a real observed sample or the defensive fallback in
   §8/constraints above.
3. The full command grammar as actually implemented — the exact reply text
   for each branch in the table in spec §10.
4. Every new environment variable and what it's for.
5. Exact commands to: run the new migration, run the new tests, run the
   smoke-test script.
6. Anything you had to assume because it wasn't decided in the spec (see
   spec §14 — "Open decisions") so it can be corrected before this ships.
