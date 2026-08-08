"""
prepare_dataset.py — with pHash deduplication
==============================================
Before splitting, compute perceptual hash (pHash) for every image.
Images with pHash distance <= 8 are considered near-duplicates.
Keep only ONE image per near-duplicate group.
Then do a stratified split on the deduplicated set.

This prevents data leakage where the same disaster scene appears
in both train and val/test with slightly different crops.
"""

from __future__ import annotations
import argparse
import hashlib
import json
import random
import shutil
import sys
from collections import defaultdict
from pathlib import Path

# Windows consoles default to cp1252, which cannot render the →/✓/█ symbols
# used below. Force UTF-8 output so the pretty log lines never crash the run.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import imagehash
    from PIL import Image
    HAS_PHASH = True
except ImportError:
    HAS_PHASH = False
    print("[WARN] imagehash not installed — skipping deduplication. Run: pip install imagehash Pillow")

CLASSES   = ["MINOR", "MAJOR", "DESTROYED"]
SPLIT     = (0.75, 0.15, 0.10)   # train / val / test
PHASH_THRESHOLD = 8               # hamming distance — images within 8 bits are near-dupes


def compute_phash(path: Path) -> str | None:
    if not HAS_PHASH:
        return path.stem   # fall back to filename as unique key
    try:
        return str(imagehash.phash(Image.open(path).convert("RGB")))
    except Exception:
        return None


def deduplicate(files: list[Path], threshold: int = PHASH_THRESHOLD) -> list[Path]:
    """
    Remove near-duplicate images using pHash.
    Two images with Hamming distance <= threshold are near-duplicates.
    Keep one representative per group (the first one alphabetically).
    """
    if not HAS_PHASH:
        return files

    print(f"    Computing pHash for {len(files)} images...")
    hashes = []
    for f in files:
        h = compute_phash(f)
        if h:
            hashes.append((f, imagehash.hex_to_hash(h)))

    kept   = []
    used   = set()
    for i, (f, h) in enumerate(hashes):
        if i in used:
            continue
        kept.append(f)
        for j, (_, h2) in enumerate(hashes):
            if j != i and j not in used:
                if (h - h2) <= threshold:
                    used.add(j)
        used.add(i)

    removed = len(files) - len(kept)
    if removed:
        print(f"    Removed {removed} near-duplicate images (pHash distance <= {threshold})")
    return kept


def split_files(files: list[Path], seed: int = 42) -> tuple[list, list, list]:
    """Stratified random split — same seed every run for reproducibility."""
    r = random.Random(seed)
    files = sorted(files)    # sort first for reproducibility
    r.shuffle(files)
    n      = len(files)
    n_tr   = int(n * SPLIT[0])
    n_va   = int(n * SPLIT[1])
    return files[:n_tr], files[n_tr:n_tr+n_va], files[n_tr+n_va:]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raw_dir",  default="dataset/raw",  help="Input: dataset/raw/MINOR|MAJOR|DESTROYED")
    p.add_argument("--out_dir",  default="dataset",      help="Output root for train/val/test")
    p.add_argument("--no_dedup", action="store_true",    help="Skip deduplication (faster but leaky splits)")
    p.add_argument("--seed",     type=int, default=42)
    args = p.parse_args()

    raw_dir = Path(args.raw_dir)
    out_dir = Path(args.out_dir)

    print(f"\n{'='*58}")
    print(f"  AapdaSetu — Dataset Preparation (with deduplication)")
    print(f"  Raw dir  : {raw_dir.resolve()}")
    print(f"  Out dir  : {out_dir.resolve()}")
    print(f"  Split    : {SPLIT[0]*100:.0f}% train / {SPLIT[1]*100:.0f}% val / {SPLIT[2]*100:.0f}% test")
    print(f"  Dedup    : {'OFF (--no_dedup)' if args.no_dedup else f'ON (threshold={PHASH_THRESHOLD})'}")
    print(f"{'='*58}\n")

    # Clear existing splits
    for split_name in ["train", "val", "test"]:
        split_path = out_dir / split_name
        if split_path.exists():
            shutil.rmtree(split_path)

    manifest = {}
    total_before = 0
    total_after  = 0

    for cls in CLASSES:
        cls_dir = raw_dir / cls
        if not cls_dir.exists():
            print(f"  [WARN] {cls_dir} not found — skipping")
            continue

        files = sorted(f for f in cls_dir.iterdir()
                       if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"})
        total_before += len(files)
        print(f"[{cls}] {len(files)} raw images")

        # Deduplicate
        if not args.no_dedup:
            files = deduplicate(files)
        total_after += len(files)

        train_f, val_f, test_f = split_files(files, seed=args.seed)

        for split_name, split_files_list in [("train", train_f), ("val", val_f), ("test", test_f)]:
            dest = out_dir / split_name / cls
            dest.mkdir(parents=True, exist_ok=True)
            for f in split_files_list:
                shutil.copy2(f, dest / f.name)
            print(f"    {split_name:<6}: {len(split_files_list)} images → {dest.relative_to(out_dir.parent)}")

        manifest[cls] = {
            "raw": len(files),
            "train": len(train_f),
            "val":   len(val_f),
            "test":  len(test_f),
        }
        print()

    # Class balance report
    class_counts = {c: manifest[c]["raw"] for c in CLASSES if c in manifest}
    total = sum(class_counts.values())
    max_c = max(class_counts.values())
    min_c = min(class_counts.values())
    ratio = max_c / max(min_c, 1)

    print(f"── Class balance ──────────────────────────────────")
    for cls in CLASSES:
        if cls in manifest:
            n   = manifest[cls]["raw"]
            bar = "█" * int(n / total * 40)
            print(f"  {cls:<12} {n:>5} images  {n/total*100:5.1f}%  {bar}")
    print(f"  Imbalance ratio: {ratio:.1f}x  ({'acceptable ✓' if ratio <= 3 else 'high — consider oversampling'})")
    if total_before != total_after:
        print(f"  Duplicates removed: {total_before - total_after}")
    print()

    # Save manifest
    manifest_path = out_dir / "splits.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  Split manifest → {manifest_path}")
    print(f"  ✓ Dataset ready. Next: python training/train.py\n")


if __name__ == "__main__":
    main()
