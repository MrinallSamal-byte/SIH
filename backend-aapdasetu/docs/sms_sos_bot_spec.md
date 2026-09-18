# SMS SOS Bot — Architecture Specification

Source of truth for a new AapdaSetu feature: citizens on basic/feature phones with
no internet and no app can text a keyword to a dedicated number and get a real
SOS incident created through the existing pipeline — same triage, same tracking
ID, same Command Center visibility as the web 1-Tap SOS button — with a
confirmation sent back over SMS.

This document reflects the **actual current codebase** (`backend-aapdasetu/`,
Prisma model `Report`, not the aspirational `Incident` ER diagram in the root
`README.md`). Read it alongside `prisma/schema.prisma`,
`src/services/reports.service.ts`, `src/services/checkins.service.ts`,
`src/services/communications.service.ts`, and `src/config/env.ts` before
writing code.

---

## 1. Goal

`SOS` texted to the provisioned number → a `Report` row exists with
`source: 'sms'`, correct `latitude`/`longitude`, a triage score, and a tracking
ID → the sender gets an SMS confirming submission (or, if the location can't
be resolved, a reply asking for one) → the Command Center's Live SOS view
shows it exactly like any other incident.

---

## 2. Two corrected assumptions — read first

### 2.1 "Auto-detected location" cannot mean GPS over plain SMS

An SMS is a text-only protocol. A basic/feature phone has no data connection,
no GPS-reporting app, and nothing that could attach coordinates to a text
message. There is no version of this feature where the phone "auto-detects"
its GPS position over SMS.

What genuinely is automatic: **the sender's phone number**, present in every
gateway's inbound webhook payload with zero extra work.

The realistic "auto-detected, else ask" behavior:

- If this phone number has a saved location on file (`SmsRegistration`,
  §4), use it immediately — the sender just gets "submitted" back.
- If it doesn't, ask for one, resolve it against `KnownLocation` (§4), save
  it for next time, then proceed.

### 2.2 Twilio cannot be used for this

`communications.service.ts` already sends outbound broadcast SMS via Twilio
(`TWILIO_ACCOUNT_SID` etc. in `.env.example`). That integration is one-way
outbound only — Twilio's own documentation confirms SMS to India is outbound
only; the carrier swaps the sender ID before delivery and replies cannot route
back to a Twilio number. This feature needs a real two-way gateway. Default
choice: **MSG91** (pay-as-you-go, no monthly commitment, India's default SMS
gateway, supports keyword/bot-flow inbound routing). Do not attempt to reuse
the existing Twilio config for inbound.

---

## 3. End-to-end flow

1. Citizen texts `SOS` or `SOS <landmark/village/PIN>` to the provisioned
   number.
2. Gateway POSTs to `POST /api/sms/inbound` with the sender's number and the
   message text (exact field names — §8).
3. Handler normalizes the sender's phone number (reuse the
   `normalizePhone()` pattern already in `checkins.service.ts` — last 10
   digits, extract it into a shared `lib/phone.ts` rather than duplicating
   it).
4. Command parser branches on message content — full grammar in §11.
5. Where a location resolves successfully, call the existing
   `createSosReport()` from `reports.service.ts` with `source: 'sms'` — do
   not reimplement triage, tracking-ID generation, or the realtime emit; all
   of that is already correct and shared with the web `/sos` route.
6. Reply is sent back over the same gateway's send API, through a new
   generalized `sendSms(to, body)` (§5).

---

## 4. New Prisma models

```prisma
model KnownLocation {
  id         String   @id @default(uuid()) @db.Uuid
  name       String
  aliases    String[]
  pincode    String?
  district   String?
  latitude   Float
  longitude  Float
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([name])
  @@index([pincode])
}

model SmsRegistration {
  id              String    @id @default(uuid()) @db.Uuid
  phoneNormalized String    @unique
  landmark        String?
  latitude        Float
  longitude       Float
  knownLocationId String?   @db.Uuid
  updatedAt       DateTime  @updatedAt
  createdAt       DateTime  @default(now())

  @@index([phoneNormalized])
}
```

`KnownLocation` seed source: existing `Shelter` lat/lng rows plus a manually
curated list of local ward/village names and PIN codes for the demo
district(s). This table is what makes "does this location exist" a real,
checkable question instead of a guess.

---

## 5. New backend surface

| File | Purpose |
|---|---|
| `src/routes/public.routes.ts` (edit) | add `POST /api/sms/inbound`, own rate-limit bucket like `sosRateLimiter` |
| `src/controllers/sms.controller.ts` | `smsInboundHandler` — thin, delegates to the service |
| `src/services/sms.service.ts` | command parsing, location resolution, orchestration |
| `src/adapters/sms-gateway.client.ts` | `sendSms(to, body)`, provider selected by `SMS_GATEWAY_PROVIDER`, mirrors the existing `adapters/openrouter.client.ts` adapter pattern |
| `src/lib/phone.ts` | extracted `normalizePhone()`, shared by `checkins.service.ts` and `sms.service.ts` |
| `prisma/schema.prisma` (edit) | add the two models in §4 + migration |

---

## 6. Reused backend surface — do not modify

- `createSosReport()` in `reports.service.ts` — triage scoring, tracking ID,
  idempotency, `realtimeHub.emitSos()`. This is the single creation path for
  both the web SOS button and this bot.
- `computeTriage()` in `lib/triage.ts`.
- The `Report.source` field already accepts an arbitrary string
  (`'sos' | 'form' | 'api'`, add `'sms'`) — no schema change needed there.

---

## 7. Report field usage for SMS-originated reports

| Field | Value |
|---|---|
| `source` | `'sms'` |
| `isOneTapSos` | `true` — same triage boost as the web 1-Tap button; this is an emergency-only path |
| `reporterPhone` | sender's number from the webhook, normalized |
| `latitude` / `longitude` | from `SmsRegistration` or a resolved `KnownLocation` match — **never** null, never a guessed/default/district-center value |

---

## 8. Known unknown — the exact inbound webhook payload shape

At spec-writing time the literal JSON/form field names MSG91 sends to an
inbound SMS webhook were not available from public documentation (their docs
cover outbound send and delivery-report webhooks; inbound/keyword routing
appears to be enabled per-account through their dashboard/support, which then
shows a real sample payload).

**Do not hardcode a guessed schema and present it as fact.** Two acceptable
paths:

1. Enable inbound routing on the MSG91 account, capture one real payload
   (log it verbatim on first receipt), and write the parser against that.
2. Until then, parse defensively — check `from`, `sender`, `mobile`, and
   `msisdn` for the sender number, and `text`, `message`, and `body` for the
   content — and log the full raw payload so the real shape can be confirmed
   and the parser tightened.

---

## 9. Environment variables to add

```
SMS_GATEWAY_PROVIDER=msg91
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_INBOUND_WEBHOOK_SECRET=
```

Follow the existing `env.ts` pattern — `required(name, fallback)` with an
empty-string fallback outside production, so the app still boots without
credentials during development, exactly like the Twilio/WhatsApp broadcast
variables already do.

---

## 10. Command grammar

| Sender sends | Behavior | Reply |
|---|---|---|
| `SOS` | Look up `SmsRegistration` by phone | Found → `createSosReport()` with saved coords, reply `SOS received. Location: <landmark> — submitted. Tracking ID: <id>` |
| `SOS` | No saved registration | No report created. Reply `Send your location: SOS <village/landmark/PIN code>` |
| `SOS <text>` | Resolve `<text>` against `KnownLocation` | Match → upsert `SmsRegistration`, call `createSosReport()`, reply `submitted` + tracking ID |
| `SOS <text>` | No match in `KnownLocation` | No report created (`latitude`/`longitude` are required, non-nullable). Reply `Location not recognized. Try a nearby landmark, village name, or PIN code.` |
| `REG <text>` (optional, explicit address update) | Same resolution as above, updates `SmsRegistration` only | `not create a report` |
| anything else | — | One-line help message, no report created |

---

## 11. Testing plan

- **Unit** (vitest, alongside `tests/triage.test.ts` / `tests/communications.test.ts`):
  the command parser, the `KnownLocation` resolver, `normalizePhone()`. No
  live SMS needed.
- **Integration**: `ngrok http 4000` locally, point the gateway's webhook
  config at the ngrok URL, text the sandbox number from a real phone, confirm
  a `Report` row appears and the reply arrives.
- **Smoke test**: `scripts/sms-smoke-test.mjs`, modeled on the existing
  `scripts/smoke-test.mjs` — POST a synthetic webhook body, assert a `Report`
  row was created (or correctly withheld) and the expected reply text.

---

## 12. Frontend marketing addition — decoupled

One new citizen feature card on `Home.tsx`, same style as the existing
Shelters/Safe Routes cards: *"Text SOS to `<number>` — works without internet,
even on basic phones."* No backend dependency in either direction; the bot
works whether or not the website is up.

---

## 13. Explicit exclusions for v1

- No real GPS/cell-tower auto-location — that level of network-side location
  requires telecom-operator integration (e.g. India's ERSS-112 architecture),
  not available to an application developer account.
- Long code virtual number only, not a short code.
- English keyword parsing only; multilingual SMS commands are a v2 idea, not
  built now.
- No handling of delivery-report/status webhooks beyond logging — this spec
  covers the inbound message path only.

---

## 14. Open decisions — confirm with the project owner before finishing

- Final choice of gateway if MSG91's inbound-routing setup turns out to be
  slow/enterprise-gated for the hackathon timeline (fallback: Gupshup
  Enterprise).
- Which district(s)/villages to seed into `KnownLocation` for the demo.
- Exact keyword the bot listens for beyond `SOS`/`REG` (Hindi/Odia
  transliterations, etc.) — deferred per §13 but worth a decision, not a
  silent omission.
