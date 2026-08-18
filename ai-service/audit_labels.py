"""
audit_labels.py
===============
Data-quality audit for the raw damage dataset. Two complementary checks:

1. SAMPLE MONTAGES — for each class, thumbnail a random sample of images into a
   labelled grid so a human can eyeball whether the photos match the folder.

2. MODEL DISAGREEMENT SCAN — run the trained checkpoint over EVERY raw image.
   Where the model's top prediction differs from the folder the image lives in,
   that image is a mislabel suspect. Suspects are saved as a JSON list and as a
   montage (sorted by confidence) for fast manual review.

Outputs go to  dataset/_audit/ .

Usage
-----
  python training/audit_labels.py                    # both checks
  python training/audit_labels.py --samples 40       # 40 sample thumbs/class
  python training/audit_labels.py --skip_scan        # montages only (no GPU)
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw, ImageFont
from torchvision import models

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.augmentations import infer_transform

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

CLASSES    = ["MINOR", "MAJOR", "DESTROYED"]
VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
# Border colours per folder (RGB)
FOLDER_COLORS = {"MINOR": (46, 204, 113), "MAJOR": (230, 126, 34), "DESTROYED": (231, 76, 60)}


def _font(size: int):
    for path in ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def make_montage(paths, out_path, title, cols=5, cell=192, labels=None, borders=None):
    n = len(paths)
    if n == 0:
        return
    rows = math.ceil(n / cols)
    strip = 20
    W = cols * cell
    H = 34 + rows * (cell + strip)
    canvas = Image.new("RGB", (W, H), (18, 18, 18))
    draw = ImageDraw.Draw(canvas)
    draw.text((8, 6), title, font=_font(20), fill=(255, 255, 255))

    for i, p in enumerate(paths):
        r, c = divmod(i, cols)
        x = c * cell
        y = 34 + r * (cell + strip)
        try:
            img = Image.open(p).convert("RGB")
            img.thumbnail((cell, cell))
            canvas.paste(img, (x + (cell - img.width) // 2, y))
        except Exception:
            draw.rectangle([x, y, x + cell, y + cell], outline=(255, 0, 255), width=3)
        if borders is not None:
            draw.rectangle([x, y, x + cell, y + cell], outline=borders[i], width=4)
        lab = (labels[i] if labels else Path(p).name)[:30]
        draw.text((x + 2, y + cell + 2), lab, font=_font(12), fill=(255, 255, 0))

    canvas.save(out_path)
    print(f"    montage → {out_path}")


def collect(raw_dir: Path) -> dict[str, list[Path]]:
    out = {}
    for cls in CLASSES:
        d = raw_dir / cls
        files = sorted(f for f in d.iterdir() if f.suffix.lower() in VALID_EXTS) if d.exists() else []
        out[cls] = files
    return out


def sample_montages(files_by_class: dict, out_dir: Path, samples: int, seed: int):
    rng = random.Random(seed)
    per_montage = 25
    for cls, files in files_by_class.items():
        if not files:
            continue
        k = min(samples, len(files))
        picks = rng.sample(files, k)
        color = FOLDER_COLORS[cls]
        for chunk in range(0, len(picks), per_montage):
            part = picks[chunk:chunk + per_montage]
            idx = chunk // per_montage + 1
            borders = [color] * len(part)
            labels = [f.name for f in part]
            make_montage(part, out_dir / f"{cls}_sample_{idx}.png",
                         f"{cls} — random sample ({len(part)} of {len(files)})",
                         borders=borders, labels=labels)


def build_model(ckpt: dict, device) -> tuple[nn.Module, dict]:
    model = models.resnet50(weights=None)
    model.fc = nn.Sequential(nn.Dropout(p=0.0), nn.Linear(model.fc.in_features, len(CLASSES)))
    model.load_state_dict(ckpt["model_state"])
    model.to(device).eval()
    c2i = ckpt.get("class_to_idx")
    idx_to_class = ({int(v): kk for kk, v in c2i.items()} if c2i
                    else {i: c for i, c in enumerate(CLASSES)})
    return model, idx_to_class


def disagreement_scan(files_by_class: dict, ckpt_path: Path, out_dir: Path, device):
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=True)
    model, idx_to_class = build_model(ckpt, device)
    print(f"    Model index→class: {idx_to_class}")

    suspects = []
    total = 0
    with torch.no_grad():
        for cls, files in files_by_class.items():
            for f in files:
                total += 1
                try:
                    img = Image.open(f).convert("RGB")
                    tensor = infer_transform(img).unsqueeze(0).to(device)
                    probs = F.softmax(model(tensor), dim=1)[0]
                except Exception as e:
                    suspects.append({"path": str(f), "folder": cls, "predicted": "READ_ERROR",
                                     "confidence": 0.0, "all_scores": {}, "error": str(e)})
                    continue
                top_idx = int(probs.argmax())
                pred = idx_to_class[top_idx]
                if pred != cls:
                    suspects.append({
                        "path": str(f),
                        "folder": cls,
                        "predicted": pred,
                        "confidence": round(float(probs[top_idx]), 4),
                        "all_scores": {idx_to_class[i]: round(float(probs[i]), 4)
                                       for i in range(len(probs))},
                    })

    suspects.sort(key=lambda s: s["confidence"], reverse=True)
    report = out_dir / "disagreements.json"
    with open(report, "w") as fh:
        json.dump({"total_scanned": total, "num_disagreements": len(suspects),
                   "suspects": suspects}, fh, indent=2)
    print(f"    Scanned {total} images → {len(suspects)} disagreements")
    print(f"    report → {report}")

    # Montage of top suspects (red border = folder colour, label = folder→pred)
    per_montage = 25
    for chunk in range(0, len(suspects), per_montage):
        part = suspects[chunk:chunk + per_montage]
        paths = [s["path"] for s in part]
        labels = [f'{s["folder"]}→{s["predicted"]} {s["confidence"]:.2f}' for s in part]
        borders = [FOLDER_COLORS.get(s["folder"], (255, 255, 255)) for s in part]
        make_montage(paths, out_dir / f"disagreements_{chunk // per_montage + 1}.png",
                     f"Mislabel suspects (folder → model prediction)",
                     borders=borders, labels=labels)
    return suspects


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raw_dir", default="dataset/raw")
    p.add_argument("--checkpoint", default="checkpoints/best.pt")
    p.add_argument("--out_dir", default="dataset/_audit")
    p.add_argument("--samples", type=int, default=25, help="random samples per class")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--skip_scan", action="store_true")
    args = p.parse_args()

    raw_dir = Path(args.raw_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    files_by_class = collect(raw_dir)
    counts = {c: len(v) for c, v in files_by_class.items()}
    print(f"\n  Raw counts: {counts}  (total {sum(counts.values())})")

    print("\n[1] Sample montages")
    sample_montages(files_by_class, out_dir, args.samples, args.seed)

    if not args.skip_scan:
        print("\n[2] Model disagreement scan")
        disagreement_scan(files_by_class, Path(args.checkpoint), out_dir, device)

    print(f"\n  ✓ Audit outputs in: {out_dir.resolve()}\n")


if __name__ == "__main__":
    main()
