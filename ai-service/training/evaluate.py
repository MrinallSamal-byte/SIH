"""
evaluate.py
===========
Runs the saved best.pt checkpoint on the held-out TEST set and produces:

  1. Overall accuracy
  2. Per-class Precision / Recall / F1 / Support
  3. Confusion matrix  (saved as PNG  → checkpoints/confusion_matrix.png)
  4. ROC curves        (saved as PNG  → checkpoints/roc_curves.png)
  5. Training curves   (saved as PNG  → checkpoints/training_curves.png)
  6. Misclassified grid (top-20)      → checkpoints/misclassified.png
  7. Full report       (saved as JSON → checkpoints/eval_report.json)

All plots are PPT-ready (high DPI, clean style, labelled axes).

Usage
─────
  python training/evaluate.py
  python training/evaluate.py --checkpoint checkpoints/best.pt --data_dir dataset
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Windows consoles default to cp1252, which cannot render the →/✓/─ symbols
# used below. Force UTF-8 output so log lines never crash the evaluation run.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import matplotlib
matplotlib.use("Agg")   # non-interactive backend — works without a display
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
)
from torchvision import datasets, models
import torch.nn as nn
from torch.utils.data import DataLoader

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.augmentations import test_transform

# IMPORTANT: must match ImageFolder's alphabetical index order used at training
# time (DESTROYED=0, MAJOR=1, MINOR=2). The model emits logits in this order, so
# labels and colours are aligned by index. Do NOT reorder without retraining.
CLASSES      = ["DESTROYED", "MAJOR", "MINOR"]
CLASS_COLORS = ["#e74c3c", "#e67e22", "#2ecc71"]   # red / orange / green
PPT_DPI     = 150


# ── Model loader ──────────────────────────────────────────────────────────────

def load_model(checkpoint_path: Path, device: torch.device) -> nn.Module:
    model = models.resnet50(weights=None)
    model.fc = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(model.fc.in_features, len(CLASSES)),
    )
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state"])
    model.to(device).eval()
    print(f"  Loaded checkpoint  : {checkpoint_path}")
    print(f"  Saved at epoch     : {ckpt.get('epoch', '?')}")
    print(f"  Best val loss      : {ckpt.get('val_loss', '?'):.4f}")
    print(f"  Best val accuracy  : {ckpt.get('val_acc', '?'):.3f}\n")
    return model


# ── Inference ─────────────────────────────────────────────────────────────────

def run_inference(model, loader, device):
    """
    Returns:
      all_labels  : (N,)  true integer labels
      all_preds   : (N,)  predicted integer labels
      all_probs   : (N,3) softmax probabilities for all classes
      all_paths   : (N,)  file paths (for misclassified grid)
    """
    all_labels, all_preds, all_probs, all_paths = [], [], [], []

    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            logits = model(imgs)
            probs  = F.softmax(logits, dim=1).cpu().numpy()
            preds  = probs.argmax(axis=1)

            all_labels.extend(labels.numpy())
            all_preds.extend(preds)
            all_probs.extend(probs)

    # Collect paths from dataset (DataLoader doesn't expose them directly)
    for path, _ in loader.dataset.samples:
        all_paths.append(path)

    return (
        np.array(all_labels),
        np.array(all_preds),
        np.array(all_probs),
        all_paths,
    )


# ── Plot helpers ──────────────────────────────────────────────────────────────

def plot_confusion_matrix(cm: np.ndarray, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.colorbar(im, ax=ax)

    ax.set(
        xticks=range(len(CLASSES)),
        yticks=range(len(CLASSES)),
        xticklabels=CLASSES,
        yticklabels=CLASSES,
        xlabel="Predicted Label",
        ylabel="True Label",
        title="Confusion Matrix — Test Set",
    )
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right", fontsize=11)
    plt.setp(ax.get_yticklabels(), fontsize=11)

    # Annotate each cell
    thresh = cm.max() / 2.0
    for i in range(len(CLASSES)):
        for j in range(len(CLASSES)):
            ax.text(
                j, i, f"{cm[i, j]}",
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontsize=14, fontweight="bold",
            )

    fig.tight_layout()
    fig.savefig(out_path, dpi=PPT_DPI, bbox_inches="tight")
    plt.close(fig)
    print(f"  Confusion matrix   → {out_path}")


def plot_roc_curves(labels: np.ndarray, probs: np.ndarray, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(7, 6))

    # One-vs-rest ROC for each class
    for i, (cls, color) in enumerate(zip(CLASSES, CLASS_COLORS)):
        binary = (labels == i).astype(int)
        if binary.sum() == 0:
            continue
        fpr, tpr, _ = roc_curve(binary, probs[:, i])
        auc = roc_auc_score(binary, probs[:, i])
        ax.plot(fpr, tpr, color=color, lw=2, label=f"{cls}  (AUC={auc:.3f})")

    ax.plot([0, 1], [0, 1], "k--", lw=1, label="Random classifier")
    ax.set(
        xlim=[0, 1], ylim=[0, 1.02],
        xlabel="False Positive Rate",
        ylabel="True Positive Rate",
        title="ROC Curves (One-vs-Rest) — Test Set",
    )
    ax.legend(loc="lower right", fontsize=11)
    ax.grid(alpha=0.3)

    fig.tight_layout()
    fig.savefig(out_path, dpi=PPT_DPI, bbox_inches="tight")
    plt.close(fig)
    print(f"  ROC curves         → {out_path}")


def plot_training_curves(history_path: Path, out_path: Path) -> None:
    if not history_path.exists():
        print(f"  [SKIP] history.json not found at {history_path}")
        return

    with open(history_path) as f:
        h = json.load(f)

    epochs = list(range(1, len(h["train_loss"]) + 1))

    fig = plt.figure(figsize=(14, 5))
    gs  = gridspec.GridSpec(1, 3, figure=fig)

    # Loss
    ax1 = fig.add_subplot(gs[0])
    ax1.plot(epochs, h["train_loss"], label="Train",      color="#3498db", lw=2)
    ax1.plot(epochs, h["val_loss"],   label="Validation", color="#e74c3c", lw=2)
    ax1.set(title="Loss per Epoch", xlabel="Epoch", ylabel="Cross-Entropy Loss")
    ax1.legend(); ax1.grid(alpha=0.3)

    # Accuracy
    ax2 = fig.add_subplot(gs[1])
    ax2.plot(epochs, h["train_acc"], label="Train",      color="#3498db", lw=2)
    ax2.plot(epochs, h["val_acc"],   label="Validation", color="#e74c3c", lw=2)
    ax2.set(title="Accuracy per Epoch", xlabel="Epoch", ylabel="Accuracy")
    ax2.set_ylim([0, 1.05])
    ax2.legend(); ax2.grid(alpha=0.3)

    # Overfit gap (train_acc − val_acc)
    gap = [tr - vl for tr, vl in zip(h["train_acc"], h["val_acc"])]
    ax3 = fig.add_subplot(gs[2])
    ax3.fill_between(epochs, gap, alpha=0.4, color="#e67e22")
    ax3.plot(epochs, gap, color="#e67e22", lw=2)
    ax3.axhline(0.15, color="red", linestyle="--", lw=1, label="Overfit threshold (0.15)")
    ax3.set(title="Overfit Gap (Train − Val Acc)", xlabel="Epoch", ylabel="Gap")
    ax3.legend(fontsize=9); ax3.grid(alpha=0.3)

    fig.suptitle("AapdaSetu — Training Curves", fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_path, dpi=PPT_DPI, bbox_inches="tight")
    plt.close(fig)
    print(f"  Training curves    → {out_path}")


def plot_misclassified(
    labels: np.ndarray,
    preds: np.ndarray,
    probs: np.ndarray,
    paths: list[str],
    out_path: Path,
    max_show: int = 20,
) -> None:
    from PIL import Image

    wrong_idx = np.where(labels != preds)[0]
    if len(wrong_idx) == 0:
        print("  No misclassified samples — perfect test accuracy!")
        return

    wrong_idx = wrong_idx[:max_show]
    n         = len(wrong_idx)
    ncols     = 5
    nrows     = (n + ncols - 1) // ncols

    fig, axes = plt.subplots(nrows, ncols, figsize=(ncols * 3, nrows * 3.5))
    axes      = np.array(axes).flatten()

    for ax in axes:
        ax.axis("off")

    for plot_i, idx in enumerate(wrong_idx):
        img = Image.open(paths[idx]).convert("RGB").resize((224, 224))
        axes[plot_i].imshow(img)
        true_cls = CLASSES[labels[idx]]
        pred_cls = CLASSES[preds[idx]]
        conf     = probs[idx][preds[idx]]
        axes[plot_i].set_title(
            f"True: {true_cls}\nPred: {pred_cls} ({conf:.0%})",
            fontsize=8,
            color="red",
        )

    fig.suptitle(
        f"Misclassified Samples ({n} of {len(labels)} test images)",
        fontsize=13, fontweight="bold",
    )
    fig.tight_layout()
    fig.savefig(out_path, dpi=PPT_DPI, bbox_inches="tight")
    plt.close(fig)
    print(f"  Misclassified grid → {out_path}")


def plot_class_confidence(probs: np.ndarray, labels: np.ndarray, out_path: Path) -> None:
    """Box-plot of softmax confidence per class — shows calibration quality."""
    fig, axes = plt.subplots(1, len(CLASSES), figsize=(12, 5), sharey=True)

    for i, (cls, color, ax) in enumerate(zip(CLASSES, CLASS_COLORS, axes)):
        # Separate correct vs incorrect predictions for this class
        mask_correct   = (labels == i) & (probs.argmax(1) == i)
        mask_incorrect = (labels == i) & (probs.argmax(1) != i)

        data   = [probs[mask_correct, i], probs[mask_incorrect, i]]
        labels_box = ["Correct", "Wrong"]
        colors_box = ["#2ecc71", "#e74c3c"]

        bp = ax.boxplot(
            [d for d in data if len(d) > 0],
            tick_labels=[l for l, d in zip(labels_box, data) if len(d) > 0],
            patch_artist=True,
        )
        for patch, c in zip(bp["boxes"], colors_box):
            patch.set_facecolor(c)
            patch.set_alpha(0.7)

        ax.set_title(f"{cls}", fontsize=12, fontweight="bold", color=color)
        ax.set_ylabel("Model Confidence" if i == 0 else "")
        ax.set_ylim(0, 1.05)
        ax.grid(alpha=0.3, axis="y")

    fig.suptitle("Model Confidence Distribution per Class", fontsize=13, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_path, dpi=PPT_DPI, bbox_inches="tight")
    plt.close(fig)
    print(f"  Confidence plot    → {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", default="checkpoints/best.pt")
    p.add_argument("--data_dir",   default="dataset")
    p.add_argument("--batch_size", type=int, default=32)
    p.add_argument("--num_workers",type=int, default=0)
    p.add_argument("--out_dir",    default="checkpoints")
    return p.parse_args()


def main():
    args     = parse_args()
    device   = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ckpt     = Path(args.checkpoint)
    data_dir = Path(args.data_dir)
    out_dir  = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*58}")
    print(f"  AapdaSetu — Model Evaluation")
    print(f"  Device     : {device}")
    print(f"  Checkpoint : {ckpt}")
    print(f"  Test data  : {data_dir / 'test'}")
    print(f"{'='*58}\n")

    # ── Load model ────────────────────────────────────────────────────────────
    model = load_model(ckpt, device)

    # ── Test dataset ──────────────────────────────────────────────────────────
    test_ds = datasets.ImageFolder(str(data_dir / "test"), transform=test_transform)
    test_loader = DataLoader(
        test_ds,
        batch_size  = args.batch_size,
        shuffle     = False,
        num_workers = args.num_workers,
    )
    print(f"  Test images : {len(test_ds)}")
    print(f"  Classes     : {test_ds.class_to_idx}\n")

    # Safety check — the label order used for every plot/report below must match
    # the integer indices the model actually outputs (ImageFolder order). Without
    # this, MINOR and DESTROYED would silently be swapped in the report.
    actual_order = [k for k, _ in sorted(test_ds.class_to_idx.items(), key=lambda kv: kv[1])]
    assert actual_order == CLASSES, (
        f"Dataset class order {actual_order} != evaluate.py CLASSES {CLASSES}. "
        "Update CLASSES to match ImageFolder's alphabetical order."
    )

    # ── Inference ─────────────────────────────────────────────────────────────
    print("  Running inference on test set...")
    labels, preds, probs, paths = run_inference(model, test_loader, device)

    # ── Text report ───────────────────────────────────────────────────────────
    overall_acc = (labels == preds).mean()
    report_str  = classification_report(
        labels, preds, target_names=CLASSES, digits=4
    )
    print(f"\n  Overall test accuracy : {overall_acc:.4f}  ({overall_acc*100:.2f}%)")
    print(f"\n{report_str}")

    # ── Save JSON report ──────────────────────────────────────────────────────
    report_dict = classification_report(
        labels, preds, target_names=CLASSES, output_dict=True
    )
    report_dict["overall_accuracy"] = float(overall_acc)

    eval_path = out_dir / "eval_report.json"
    with open(eval_path, "w") as f:
        json.dump(report_dict, f, indent=2)
    print(f"\n  Full report saved  → {eval_path}")

    # ── Plots ─────────────────────────────────────────────────────────────────
    cm = confusion_matrix(labels, preds)
    plot_confusion_matrix(cm,  out_dir / "confusion_matrix.png")
    plot_roc_curves(labels, probs, out_dir / "roc_curves.png")
    plot_training_curves(
        out_dir / "history.json",
        out_dir / "training_curves.png",
    )
    plot_misclassified(labels, preds, probs, paths, out_dir / "misclassified.png")
    plot_class_confidence(probs, labels, out_dir / "confidence_distribution.png")

    print(f"\n  All evaluation artefacts saved to: {out_dir.resolve()}")
    print(f"\n  ── Summary ──────────────────────────────────────────")
    for cls in CLASSES:
        m = report_dict.get(cls, {})
        print(f"  {cls:<12}  P={m.get('precision',0):.3f}  "
              f"R={m.get('recall',0):.3f}  F1={m.get('f1-score',0):.3f}  "
              f"n={int(m.get('support',0))}")
    print(f"  {'Overall':<12}  Acc={overall_acc:.3f}")
    print()


if __name__ == "__main__":
    main()
