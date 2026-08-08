# AapdaSetu AI Service — Code Documentation

> What every file does and why it was written.
> Code lives in `ai-service/` · Model weights: [Divyanshu-Kumar19/aapdasetu-damage-assessment](https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment) · Dataset: [Divyanshu-Kumar19/aapdasetu-damage-dataset](https://huggingface.co/datasets/Divyanshu-Kumar19/aapdasetu-damage-dataset)

## Why this service exists

After a disaster, authorities receive thousands of compensation claims with property photos. Reviewing them manually is slow, and fraud is common: the same photo submitted for multiple claims, old pre-disaster photos, or photos taken nowhere near the claimed property.

This service automates the triage. Given one claim photo it runs three checks and returns a verdict:

1. **EXIF verification** — was the photo really taken at the claimed location, after the disaster?
2. **pHash duplicate check** — has this exact photo already been used in another claim?
3. **AI damage grading** — a ResNet50 classifier grades damage as `MINOR` / `MAJOR` / `DESTROYED`, which maps to a compensation amount under NDRF/SDRF norms.

## Pipeline

```
Claim photo ──► EXIF extract & verify (GPS ≤ 500 m, timestamp ≥ disaster cutoff)
            ──► pHash compute & dedup (Hamming distance vs existing claim hashes)
            ──► ResNet50 classification (5-crop TTA, 98.36% test accuracy)
            ──► Compensation lookup (NDRF/SDRF table)
            ──► JSON response + fraud_flags for manual review
```

## Folder layout

```
ai-service/
├── app/                    # production service (FastAPI)
│   ├── main.py
│   ├── damage_classifier.py
│   ├── exif_validator.py
│   └── phash_detector.py
├── training/               # how the model was built (offline scripts)
│   ├── prepare_dataset.py
│   ├── augmentations.py
│   ├── train.py
│   ├── evaluate.py
│   └── test_single.py
├── checkpoints/            # best.pt (download from Hugging Face, git-ignored)
├── dataset/raw/            # source images (git-ignored, on Hugging Face)
├── run.py                  # server launcher
├── smoke_test.py           # end-to-end API test
├── requirements.txt
└── .env.example
```

---

## app/ — the production service

### `app/main.py`
**What it does:** FastAPI application with two endpoints. `/api/assess-damage` accepts a photo upload plus claim details (claimed GPS, disaster cutoff date) and runs the full pipeline: EXIF → pHash → classification → compensation → fraud flags. `/api/check-duplicate` is a lightweight pHash-only endpoint.

**Why it was written:** the Node.js backend needs one HTTP call to get a complete claim verdict, so all pipeline steps are combined in a single endpoint. CORS is open and the model lazy-loads on first request so the server starts fast.

### `app/damage_classifier.py`
**What it does:** loads the trained ResNet50 checkpoint (`best.pt`) once as a singleton, runs inference with 5-crop test-time augmentation, and holds the compensation table.

**Why it was written:** loading a 270 MB model per request would be too slow, so it loads once and is reused. Compensation amounts (NDRF/SDRF norms) live next to the grading logic so the grade→money mapping stays in one place. Checkpoint comes from Hugging Face because GitHub's 100 MB file limit can't hold it.

**Important invariant:** model outputs follow ImageFolder alphabetical order (`DESTROYED=0, MAJOR=1, MINOR=2`), which the code remaps via the checkpoint's `class_to_idx`.

### `app/exif_validator.py`
**What it does:** extracts GPS coordinates, capture timestamp and camera make/model from the photo's EXIF block using `piexif`, then verifies: GPS within 500 m of the claimed property (haversine distance) and timestamp after the disaster cutoff.

**Why it was written:** anti-fraud. GPS and timestamp are baked into the photo by the camera at capture time, so they can't easily be faked — unlike a location the user types into a form. Missing or mismatched EXIF produces a `fraud_flags` entry for manual review instead of silently failing.

### `app/phash_detector.py`
**What it does:** computes a 64-bit DCT perceptual hash of an image (resize → grayscale → DCT → keep low-frequency block → threshold against mean) and compares it against existing claim hashes using Hamming distance.

**Why it was written:** claimants may submit the same photo for multiple properties, possibly slightly re-compressed or cropped. Pixel-perfect comparison fails on re-compression; perceptual hashing catches visually identical images. Threshold: Hamming distance ≤ 8 = duplicate.

---

## training/ — how the model was built

### `training/prepare_dataset.py`
**What it does:** takes the raw image folders (`dataset/raw/{MINOR,MAJOR,DESTROYED}`), removes near-duplicates via pHash, then splits into train/val/test (75/15/10) and writes `splits.json`.

**Why it was written:** scraped disaster images often contain duplicates, and a duplicate landing in both train and test would fake the accuracy. The split also includes a leak check (hashes verified disjoint across splits).

### `training/augmentations.py`
**What it does:** defines the image transforms — augmented training transform (flips, rotation, color jitter, zoom — no vertical flip, upside-down buildings are unrealistic), deterministic val/test transform, and the 5 TTA crops used at inference.

**Why it was written:** 2,400 images is small for a ResNet50, so augmentation prevents memorisation; TTA squeezes extra accuracy out of the same weights at inference time.

### `training/train.py`
**What it does:** two-phase fine-tuning of ResNet50 — phase 1 freezes the backbone and trains only the new head; phase 2 unfreezes layer3/layer4/head with a lower learning rate. Includes class balancing, mixup, label smoothing, AMP, early stopping, checkpointing (`best.pt`, `last.pt`) and resume support.

**Why it was written:** this is what produced `best.pt`. Two-phase training stabilises a small dataset; early stopping picks the epoch with the best validation accuracy instead of the last one.

### `training/evaluate.py`
**What it does:** loads `best.pt`, evaluates on the held-out test set with TTA, and saves `eval_report.json`, confusion matrix, ROC curves, confidence distribution and misclassified samples.

**Why it was written:** an auditable final report — precision/recall/F1 per class — so the 98.36% accuracy claim is reproducible and inspectable.

### `training/test_single.py`
**What it does:** classifies one image from the command line and prints all three class probabilities.

**Why it was written:** quick manual sanity checks during development without starting the full API.

---

## Root files

### `run.py`
**What it does:** loads `.env` and starts the service with uvicorn (`python run.py`, default port 8000).

**Why it was written:** one-command launch — no need to remember uvicorn flags.

### `smoke_test.py`
**What it does:** end-to-end test against a running server: health check, duplicate check, and three real photos (fire/flood/normal) asserting each gets the expected damage grade.

**Why it was written:** verifies the whole service still works after any change — model loading, EXIF, pHash and classification together.

### `requirements.txt`
Pinned dependencies: FastAPI, uvicorn, torch/torchvision, Pillow, piexif, opencv, numpy, httpx.

### `.env.example`
Template for local config: `PORT` and `DAMAGE_MODEL_PATH` (checkpoint location).

---

## Quick start (run it yourself)

```bash
cd ai-service
pip install -r requirements.txt

# get the checkpoint from Hugging Face (~270 MB)
hf download Divyanshu-Kumar19/aapdasetu-damage-assessment best.pt --local-dir ./checkpoints

python run.py              # starts on http://localhost:8000
python smoke_test.py       # in a second terminal — full end-to-end check
```

Then open `http://localhost:8000/docs` and upload your own photo to `/api/assess-damage`.

## Model summary

| | |
|---|---|
| Architecture | ResNet50 (ImageNet pretrained) + Dropout → Linear(2048, 3) |
| Classes | `MINOR` · `MAJOR` · `DESTROYED` |
| Dataset | 2,400 post-disaster building images (75/15/10 split, leak-checked) |
| Test accuracy | **98.36%** with 5-crop TTA |
| Compensation | MINOR ₹10,000 · MAJOR ₹95,000 · DESTROYED ₹1,30,000 (residential, NDRF/SDRF) |
