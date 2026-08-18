"""
leak_check.py
=============
Honest leakage + overfitting audit of the trained checkpoint. Two checks:

1. CROSS-SPLIT PHASH SCAN
   Every TEST image is hashed and compared against every TRAIN + VAL image.
   prepare_dataset.py deduplicates globally BEFORE splitting, so near-
   duplicates (Hamming distance <= 8) across splits are impossible by
   construction — this script verifies that claim empirically and also
   reports looser matches (<= 10, <= 12) that could indicate scene-level
   overlap the strict threshold missed.

2. TRUE TRAIN ACCURACY
   During training, train_acc is measured on mixup-blended batches, which
   artificially depresses it (~0.68) and creates a misleading negative gap.
   Here the checkpoint is run over the UNMODIFIED train split with the
   deterministic inference transform, giving the real generalisation gap:
       true_gap = true_train_acc − test_acc

Output: checkpoints/leak_check.json + console report.

Usage
-----
  python training/leak_check.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import datasets, models
from torch.utils.data import DataLoader

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.augmentations import val_transform

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import imagehash

CLASSES = ["DESTROYED", "MAJOR", "MINOR"]   # ImageFolder alphabetical order
VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ── Check 1: cross-split pHash scan ──────────────────────────────────────────

def hash_dir(folder: Path) -> tuple[list[Path], np.ndarray]:
    """pHash every image under a folder (recursive) → (paths, bool bits (N, 64))."""
    files = sorted(f for f in folder.rglob("*")
                   if f.is_file() and f.suffix.lower() in VALID_EXTS)
    bits = np.zeros((len(files), 64), dtype=bool)
    for i, f in enumerate(files):
        h = imagehash.phash(Image.open(f).convert("RGB"))   # 8×8 hash
        bits[i] = h.hash.flatten()
    return files, bits


def cross_split_scan(data_dir: Path) -> dict:
    print("  Hashing test split...")
    test_files, test_bits = hash_dir(data_dir / "test")
    print(f"    {len(test_files)} test images hashed")

    print("  Hashing train + val splits...")
    ref_files, ref_bits = [], []
    for split in ("train", "val"):
        f, b = hash_dir(data_dir / split)
        ref_files += f
        ref_bits.append(b)
    ref_bits = np.vstack(ref_bits)
    print(f"    {len(ref_files)} train+val images hashed")

    # Vectorised Hamming distance: for each test row, count bit flips vs all refs
    hits = {8: [], 10: [], 12: []}
    for i in range(len(test_files)):
        dists = (ref_bits != test_bits[i]).sum(axis=1)
        for thr in hits:
            idx = np.where(dists <= thr)[0]
            for j in idx:
                hits[thr].append({
                    "test": str(test_files[i]),
                    "train_or_val": str(ref_files[j]),
                    "hamming": int(dists[j]),
                })

    report = {
        "test_images": len(test_files),
        "train_val_images": len(ref_files),
        "pairs_compared": len(test_files) * len(ref_files),
        "matches_at_8": len(hits[8]),
        "matches_at_10": len(hits[10]),
        "matches_at_12": len(hits[12]),
        "suspects_at_12": sorted(hits[12], key=lambda x: x["hamming"])[:20],
    }
    return report


# ── Check 2: true train accuracy ─────────────────────────────────────────────

def split_accuracy(model, folder: Path, device) -> float:
    ds = datasets.ImageFolder(str(folder), transform=val_transform)
    loader = DataLoader(ds, batch_size=64, shuffle=False, num_workers=0)
    correct = total = 0
    with torch.no_grad():
        for imgs, labels in loader:
            preds = model(imgs.to(device)).argmax(dim=1).cpu()
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    return correct / total


def true_train_check(data_dir: Path, ckpt_path: Path, device) -> dict:
    model = models.resnet50(weights=None)
    model.fc = nn.Sequential(nn.Dropout(p=0.0), nn.Linear(model.fc.in_features, len(CLASSES)))
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state"])
    model.to(device).eval()

    train_acc = split_accuracy(model, data_dir / "train", device)
    val_acc   = split_accuracy(model, data_dir / "val",   device)
    test_acc  = split_accuracy(model, data_dir / "test",  device)
    return {
        "true_train_acc": round(train_acc, 4),
        "val_acc": round(val_acc, 4),
        "test_acc": round(test_acc, 4),
        "true_gap_train_minus_test": round(train_acc - test_acc, 4),
    }


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    data_dir = Path("dataset")
    ckpt_path = Path("checkpoints/best.pt")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print(f"\n{'='*62}")
    print("  AapdaSetu — Leakage & Overfit Audit")
    print(f"{'='*62}\n")

    print("[1] Cross-split pHash scan (test vs train+val)")
    leak = cross_split_scan(data_dir)
    print(f"    Pairs compared       : {leak['pairs_compared']:,}")
    print(f"    Matches at dist<=8   : {leak['matches_at_8']}   (strict — leakage if >0)")
    print(f"    Matches at dist<=10  : {leak['matches_at_10']}")
    print(f"    Matches at dist<=12  : {leak['matches_at_12']}   (loose — scene overlap)")
    for s in leak["suspects_at_12"]:
        print(f"      d={s['hamming']:>2}  test={Path(s['test']).name}  "
              f"<->  {Path(s['train_or_val']).name}")

    print("\n[2] True split accuracies (clean images, no mixup)")
    acc = true_train_check(data_dir, ckpt_path, device)
    print(f"    train : {acc['true_train_acc']:.4f}")
    print(f"    val   : {acc['val_acc']:.4f}")
    print(f"    test  : {acc['test_acc']:.4f}")
    print(f"    true gap (train−test) : {acc['true_gap_train_minus_test']:+.4f}")

    out = {"leakage_scan": leak, "true_accuracy": acc}
    with open("checkpoints/leak_check.json", "w") as f:
        json.dump(out, f, indent=2)
    print(f"\n  Report saved → checkpoints/leak_check.json\n")


if __name__ == "__main__":
    main()
