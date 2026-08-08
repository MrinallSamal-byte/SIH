"""
test_single.py
==============
Test the trained model on a single image from the command line.
Useful for:
  - Quickly verifying the model works after training
  - Live demo during the SIH presentation
  - Debugging wrong predictions

Usage
─────
  python training/test_single.py --image path/to/photo.jpg
  python training/test_single.py --image photo.jpg --checkpoint checkpoints/best.pt
  python training/test_single.py --image photo.jpg --visualize

Output
──────
  DAMAGE GRADE  : MAJOR
  Confidence    : 87.3%
  
  Class scores:
    MINOR     :  8.1%  ████
    MAJOR     : 87.3%  ████████████████████████████████████████████
    DESTROYED :  4.6%  ██

  EXIF GPS      : 28.6139° N, 77.2090° E
  EXIF timestamp: 2025-08-01 14:32:11
  GPS verified  : ✓  (0.12 km from claimed location)
  Timestamp     : ✓  (after disaster cutoff)
  Duplicate     : ✗  (no matching photo found)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch
import torch.nn.functional as F
import torch.nn as nn
from torchvision import models
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.augmentations import infer_transform

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

CLASSES          = ["MINOR", "MAJOR", "DESTROYED"]
BAR_WIDTH        = 50    # characters for the ASCII bar chart

COMPENSATION_TABLE = {
    "RESIDENTIAL": {"MINOR": 10_000,  "MAJOR": 95_000,  "DESTROYED": 130_000},
    "COMMERCIAL":  {"MINOR": 25_000,  "MAJOR": 200_000, "DESTROYED": 350_000},
    "AGRICULTURAL":{"MINOR":  5_000,  "MAJOR": 40_000,  "DESTROYED":  68_000},
}

GRADE_COLORS = {
    "MINOR":     "\033[92m",   # green
    "MAJOR":     "\033[93m",   # yellow
    "DESTROYED": "\033[91m",   # red
}
RESET = "\033[0m"


# ── Model ─────────────────────────────────────────────────────────────────────

def load_model(checkpoint_path: str, device: torch.device):
    model = models.resnet50(weights=None)
    model.fc = nn.Sequential(
        nn.Dropout(p=0.0),           # disable dropout at inference
        nn.Linear(model.fc.in_features, len(CLASSES)),
    )
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state"])
    model.to(device).eval()
    # Authoritative index->class mapping from training (ImageFolder order).
    # Fixes the MINOR/DESTROYED swap: logits are emitted in ImageFolder
    # alphabetical order, NOT in the CLASSES list order.
    c2i = ckpt.get("class_to_idx")
    idx_to_class = (
        {int(v): k for k, v in c2i.items()} if c2i
        else {i: c for i, c in enumerate(CLASSES)}
    )
    return model, idx_to_class


def predict(model: nn.Module, image_path: str, device: torch.device, idx_to_class: dict) -> dict:
    img    = Image.open(image_path).convert("RGB")
    tensor = infer_transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        probs  = F.softmax(logits, dim=1)[0].cpu().numpy()

    top_idx = int(probs.argmax())
    return {
        "grade":      idx_to_class[top_idx],
        "confidence": float(probs[top_idx]),
        "scores":     {idx_to_class[i]: float(probs[i]) for i in range(len(probs))},
    }


# ── Display ───────────────────────────────────────────────────────────────────

def print_bar(label: str, value: float, highlight: bool) -> None:
    filled = int(value * BAR_WIDTH)
    bar    = "█" * filled + "░" * (BAR_WIDTH - filled)
    pct    = f"{value*100:5.1f}%"
    prefix = "► " if highlight else "  "
    color  = GRADE_COLORS.get(label, "") if highlight else ""
    print(f"  {prefix}{label:<12} {pct}  {color}{bar}{RESET}")


def print_result(result: dict, image_path: str, property_type: str) -> None:
    grade = result["grade"]
    conf  = result["confidence"]
    color = GRADE_COLORS.get(grade, "")

    compensation = COMPENSATION_TABLE.get(
        property_type.upper(), COMPENSATION_TABLE["RESIDENTIAL"]
    ).get(grade, 0)

    print(f"\n{'═'*60}")
    print(f"  AapdaSetu — Damage Assessment Result")
    print(f"{'═'*60}")
    print(f"  Image         : {Path(image_path).name}")
    print(f"  Property type : {property_type.upper()}")
    print(f"\n  {color}DAMAGE GRADE  : {grade}{RESET}")
    print(f"  Confidence    : {conf*100:.1f}%")

    # Confidence bar — flag low confidence
    if conf < 0.60:
        print(f"  ⚠  Low confidence — recommend manual review")

    print(f"\n  Class probabilities:")
    for cls, score in result["scores"].items():
        print_bar(cls, score, cls == grade)

    print(f"\n  Estimated compensation : ₹{compensation:,.0f}  ({property_type.upper()})")

    # Fraud signal based purely on confidence for standalone test
    print(f"\n  Fraud signals:")
    if conf < 0.60:
        print(f"    ⚠  Low model confidence ({conf*100:.1f}%) — needs human review")
    else:
        print(f"    ✓  Model confidence acceptable ({conf*100:.1f}%)")
    print(f"    ℹ  EXIF / GPS / duplicate checks run via FastAPI in production")
    print(f"{'═'*60}\n")


def visualize(image_path: str, result: dict) -> None:
    """Save an annotated copy of the image (useful for PPT screenshots)."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.patches as patches

        img  = Image.open(image_path).convert("RGB")
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.imshow(img)
        ax.axis("off")

        grade = result["grade"]
        conf  = result["confidence"]
        color_map = {"MINOR": "green", "MAJOR": "orange", "DESTROYED": "red"}
        color = color_map.get(grade, "blue")

        # Overlay label box
        ax.text(
            0.02, 0.97,
            f"{grade}  ({conf*100:.1f}%)",
            transform=ax.transAxes,
            fontsize=16, fontweight="bold", color="white",
            verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor=color, alpha=0.85),
        )

        # Score bars at bottom
        bar_y = 0.05
        for i, (cls, score) in enumerate(result["scores"].items()):
            c = list(color_map.values())[i]
            ax.barh(
                bar_y + i * 0.06, score, height=0.05,
                left=0.01, color=c, alpha=0.7,
                transform=ax.transAxes,
            )
            ax.text(
                0.01 + score + 0.01, bar_y + i * 0.06 + 0.015,
                f"{cls} {score*100:.1f}%",
                transform=ax.transAxes,
                fontsize=9, color="white",
            )

        out_path = Path(image_path).stem + "_result.png"
        fig.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="black")
        plt.close(fig)
        print(f"  Annotated image saved → {out_path}")

    except ImportError:
        print("  matplotlib not available — skipping visualisation")


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Test damage classifier on a single image")
    p.add_argument("--image",       required=True,            help="Path to image file")
    p.add_argument("--checkpoint",  default="checkpoints/best.pt")
    p.add_argument("--property",    default="RESIDENTIAL",
                   choices=["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL"])
    p.add_argument("--visualize",   action="store_true",
                   help="Save annotated image (for PPT screenshots)")
    return p.parse_args()


def main():
    args   = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.exists():
        print(f"\n  ERROR: Checkpoint not found at {ckpt_path}")
        print(f"  Run training first:  python training/train.py\n")
        sys.exit(1)

    img_path = Path(args.image)
    if not img_path.exists():
        print(f"\n  ERROR: Image not found at {img_path}\n")
        sys.exit(1)

    model, idx_to_class = load_model(str(ckpt_path), device)
    result = predict(model, str(img_path), device, idx_to_class)
    print_result(result, str(img_path), args.property)

    if args.visualize:
        visualize(str(img_path), result)


if __name__ == "__main__":
    main()
