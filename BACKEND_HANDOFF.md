# AapdaSetu — Backend Integration & Push Guide

> Damage-assessment feature: ResNet50 AI service (FastAPI, port 8000) ↔ Node/Express backend.
> AI model accuracy: **98.36%** (honest test split), leakage-audited.

## Where everything lives (current status)

| Artifact | Location | Status |
|---|---|---|
| AI service code (`ai-service/`) + demo app | GitHub `MrinallSamal-byte/SIH` — branch **`divyanshu`** | ✅ pushed |
| Model checkpoint `best.pt` (258 MB) + eval artifacts | 🤗 [Divyanshu-Kumar19/aapdasetu-damage-assessment](https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment) | ✅ uploaded |
| Training dataset (2,400 images) | 🤗 [Divyanshu-Kumar19/aapdasetu-damage-dataset](https://huggingface.co/datasets/Divyanshu-Kumar19/aapdasetu-damage-dataset) | ✅ uploaded |
| Backend damage module (`server/`) + this guide | GitHub `divyanshu` branch (reference for Krishna) | ✅ pushed |

`ai-service` exists **only** on the `divyanshu` branch — `main` and `Krishna` branches don't have it.

---

## PART A — What to do in the backend (Krishna's `server/`)

The damage module is **already fully written** (same conventions: `TryCatch`, `prisma`,
`cloudinary`, `AuthMiddleware/AdminMiddleware`, zod `validate`). Integration = copy +
schema + register. **No new code to write.**

### Step 1 — Copy the module files
| From (reference copy on `divyanshu`) | To (friend's backend) |
|---|---|
| `server/src/controllers/damage.controller.js` | `src/controllers/damage.controller.js` |
| `server/src/routes/damage.route.js` | `src/routes/damage.route.js` |

### Step 2 — Prisma schema (`prisma/schema.prisma`)
Copy from `server/prisma/schema.prisma`:
- `enum DAMAGE_GRADE` (MINOR / MAJOR / DESTROYED)
- `enum REVIEW_STATUS` (PENDING_REVIEW / APPROVED / REJECTED / NEEDS_REVISIT)
- `model DamageReport` (photo, EXIF verification fields, pHash/duplicate fields,
  damageGrade, confidenceScore, compensationAmount, claimed GPS, admin review fields)

Add these two relation lines inside his existing `model user { }`:
```prisma
damageReports   DamageReport[] @relation("DamageReports")
damageReviews   DamageReport[] @relation("DamageReviews")
```
Then run:
```bash
npx prisma migrate dev --name damage_report
```

### Step 3 — Validators (`src/lib/validator.js`)
Copy `SubmitDamageReportSchema` + `ReviewDamageReportSchema` from
`server/src/lib/validator.js` (zod, with `z.coerce.number()` for multipart strings).

### Step 4 — Register the router (`src/server.js`)
```js
import damageRouter from "./routes/damage.route.js";
// ...
app.use("/api/damage", damageRouter);
```

### Step 5 — Environment variables (`.env`)
```env
AI_SERVICE_URL=http://localhost:8000      # or the deployed AI service URL
# Cloudinary keys (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET) — likely already present
```

### Endpoints this unlocks
```
POST  /api/damage/submit              citizen photo → AI assessment (auth)
GET   /api/damage/my-reports          citizen's own claims (auth)
GET   /api/damage/:id                 single claim (auth)
GET   /api/damage/admin/list          admin: filtered/paginated list
PATCH /api/damage/admin/:id/review    admin approve / reject / re-survey
```

### Request flow
`photo upload → Cloudinary → fetch existing pHashes (±5 km box) → POST AI /api/assess-damage
→ save DamageReport → return grade + confidence + compensation + fraud flags`

---

## PART B — Size rules (why GitHub / Hugging Face are split)

| Item | Size | Where it lives |
|---|---|---|
| `ai-service/` code + demo + checkpoint JSONs/PNGs | < 3 MB | ✅ GitHub (`divyanshu`) |
| **`checkpoints/best.pt` (the model)** | **258 MB** | 🤗 Hugging Face — GitHub rejects files > 100 MB |
| `dataset/raw/` (training images) | ~128 MB | 🤗 Hugging Face — not needed for running |

Anyone who clones the repo fetches the model with one command (see Part C).

---

## PART C — Running the AI service + demo app

```powershell
cd ai-service
pip install -r requirements.txt

# Download the checkpoint from Hugging Face (~258 MB, one-time)
hf download Divyanshu-Kumar19/aapdasetu-damage-assessment best.pt --local-dir ./checkpoints

python run.py                     # starts on http://localhost:8000
```

- **Interactive demo**: open **http://localhost:8000** — upload a disaster photo and see
  damage grade, confidence bars, compensation, EXIF fraud checks and duplicate detection live.
- API docs (Swagger): **http://localhost:8000/docs**
- Health check: `GET /health`
- First request loads the model (~15 s), then ~1 s per image. ~2 GB RAM on CPU.
- Quick end-to-end test (with server running): `python tests/smoke_test.py`
- Test one image from CLI: `python training/test_single.py <path>`

### Demo tip for presentations
Upload an original phone photo to show `gps_verified ✓` / `timestamp_verified ✓`,
then upload a WhatsApp-forwarded image to show the `MISSING_GPS` / `MISSING_TIMESTAMP`
fraud flags firing.

### The AI contract (what the backend controller sends)
```
POST /api/assess-damage   (multipart/form-data)
  photo                 file        (jpeg/png/webp/heic)
  claimed_lat           float
  claimed_lng           float
  property_type         RESIDENTIAL | COMMERCIAL | AGRICULTURAL
  disaster_cutoff       ISO-8601 datetime
  existing_hashes_csv   comma-separated pHashes (duplicate check)

→ returns: damage_grade, confidence_score, all_scores, exif_* fields,
  gps_verified, timestamp_verified, phash, is_duplicate, duplicate_of_hash,
  compensation_amount, ai_description, fraud_flags[]
```
