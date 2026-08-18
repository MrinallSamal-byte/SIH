# Dataset Guide — AapdaSetu Damage Classifier

> The final training dataset (2,400 labelled images) is hosted on Hugging Face:
> **[Divyanshu-Kumar19/aapdasetu-damage-dataset](https://huggingface.co/datasets/Divyanshu-Kumar19/aapdasetu-damage-dataset)**.
> This guide covers collecting/organising images and the local training workflow.

## Folder structure you must create

Place your photos into exactly this layout before running `prepare_dataset.py`:

```
dataset/
└── raw/
    ├── MINOR/          ← photos of minor damage
    ├── MAJOR/          ← photos of major damage
    └── DESTROYED/      ← photos of total destruction
```

After running `prepare_dataset.py` it will automatically create:

```
dataset/
├── train/   MINOR/  MAJOR/  DESTROYED/    (75% of each class)
├── val/     MINOR/  MAJOR/  DESTROYED/    (15% of each class)
├── test/    MINOR/  MAJOR/  DESTROYED/    (10% of each class)
└── splits.json
```

---

## What counts as each class

| Class | What to photograph |
|---|---|
| **MINOR** | Hairline cracks in walls, broken windows, minor flooding inside rooms, dislodged roof tiles, superficial peeling — house is still standing and liveable |
| **MAJOR** | One or more walls partially collapsed, large section of roof missing, staircase destroyed, severe flooding damage, but the main structure still exists |
| **DESTROYED** | Complete collapse, only rubble remains, nothing salvageable, foundation-level destruction |

---

## How many photos do you need?

| Minimum | Acceptable | Good |
|---|---|---|
| 50 per class | 100–150 per class | 300+ per class |

With 100 per class (300 total) + ImageNet transfer learning you can expect **~78–84% test accuracy**.  
With 300 per class (900 total) you can expect **~85–91% test accuracy**.

---

## Where to get photos

### Free public sources (use for training)
1. **Google Images** — search `"house flood damage india"`, `"earthquake collapsed building"`, `"wall crack damage"`
2. **NDRF / SDRF press releases** — Government of India disaster relief photo galleries
3. **Reuters / AP Newswire** — filter by `disaster`, `flood`, `earthquake` (educational/research use)
4. **Wikimedia Commons** — search `building damage`, `hurricane damage`, free licence
5. **xBD Dataset** — [xview2.org](https://xview2.org) — satellite overhead (supplement only)
6. **AIDER Dataset** — [github.com/ckyrkou/AIDER](https://github.com/ckyrkou/AIDER) — ground + aerial photos

### Your own photos (best for demo)
- If possible, photograph real damaged structures in your area
- These will look exactly like citizen submissions → best model generalisation

---

## Photo quality guidelines

✅ **Do include:**
- Photos taken from 2–10 metres away (normal phone distance)
- Different lighting: day, evening, overcast, bright sun
- Different angles: straight-on, slight tilt, from street
- Different phone models / cameras
- Dusty, slightly blurry, or partially obstructed photos (real conditions)

❌ **Do not include:**
- Aerial / drone photos (wrong perspective for your use case)
- Photos where the building takes up < 30% of the frame
- Duplicate or near-duplicate images of the same building
- Photos with watermarks covering the damage area
- Illustrations or diagrams

---

## Accepted file formats

`.jpg` `.jpeg` `.png` `.webp` `.heic` `.bmp`

All images are automatically resized to **224 × 224** during training.  
Original files are never modified.

---

## Step-by-step: from photos to trained model

```bash
# Step 1 — Organise your photos into dataset/raw/MINOR, MAJOR, DESTROYED

# Step 2 — Split into train/val/test
python training/prepare_dataset.py

# Step 3 — Train the model
python training/train.py

# Step 4 — Evaluate on test set, generate all plots
python training/evaluate.py

# Step 5 (optional) — Hyperparameter search (script kept in the personal/local copy)
# python training/tune_hyperparams.py --trials 30

# Step 6 — Test on a single photo
python training/test_single.py --image my_photo.jpg --visualize

# Step 7 (optional) — Export for production (ONNX) and verify parity
python training/export_onnx.py
python training/verify_onnx.py

# Step 8 — Start the API server
python run.py
```

---

## What the evaluation script produces (for PPT)

| File | What it shows |
|---|---|
| `checkpoints/confusion_matrix.png` | How often each class is confused with another |
| `checkpoints/roc_curves.png` | AUC score per class — closer to 1.0 = better |
| `checkpoints/training_curves.png` | Loss + accuracy + overfit gap across epochs |
| `checkpoints/misclassified.png` | Grid of photos the model got wrong |
| `checkpoints/confidence_distribution.png` | How confident the model is when correct vs wrong |
| `checkpoints/eval_report.json` | Precision / Recall / F1 numbers for your slides |
