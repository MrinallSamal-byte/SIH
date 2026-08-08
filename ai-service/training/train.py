"""
Fine-tunes ResNet50 on the 3-class damage dataset (two-phase, early stopping).

Usage:
  python training/train.py
  python training/train.py --resume checkpoints/last.pt
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Force UTF-8 output on Windows consoles
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, models

# AMP import — supports both old and new PyTorch
try:
    from torch.amp import GradScaler, autocast
    _AMP_DEVICE_ARG = True
except ImportError:
    from torch.cuda.amp import GradScaler, autocast
    _AMP_DEVICE_ARG = False

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.augmentations import train_transform, val_transform

DEFAULTS = dict(
    data_dir      = "dataset",
    out_dir       = "checkpoints",
    epochs        = 40,
    batch_size    = 32,
    lr_head       = 3e-4,
    lr_finetune   = 3e-5,
    weight_decay  = 1e-4,
    patience      = 10,
    phase1_epochs = 6,
    warmup_epochs = 2,
    num_workers   = 0,
    resume        = "",
    seed          = 42,
    mixup_alpha   = 0.1,
)

# Folder names; index order comes from ImageFolder (DESTROYED=0, MAJOR=1, MINOR=2)
CLASSES = ["MINOR", "MAJOR", "DESTROYED"]

def set_seed(seed: int) -> None:
    import random, numpy as np
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark     = False

def build_model(num_classes: int = 3) -> nn.Module:
    """ResNet50 with Dropout(0.3) + linear head."""
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, num_classes),
    )
    return model

def freeze_backbone(model: nn.Module) -> None:
    """Phase 1: freeze all layers except the FC head."""
    for name, param in model.named_parameters():
        if "fc" not in name:
            param.requires_grad = False

def unfreeze_last_blocks(model: nn.Module) -> None:
    """Phase 2: unfreeze layer3, layer4 and fc only."""
    for param in model.parameters():
        param.requires_grad = False
    for name, param in model.named_parameters():
        if any(blk in name for blk in ["layer3", "layer4", "fc"]):
            param.requires_grad = True

def freeze_bn(model: nn.Module) -> None:
    """Keep BatchNorm layers in eval mode to avoid val loss spikes."""
    for m in model.modules():
        if isinstance(m, (nn.BatchNorm2d, nn.BatchNorm1d)):
            m.eval()
            for p in m.parameters():
                p.requires_grad = False

def make_weighted_sampler(dataset: datasets.ImageFolder) -> WeightedRandomSampler:
    """Balance class frequencies per epoch without duplicating data."""
    class_counts = [0] * len(dataset.classes)
    for _, label in dataset.samples:
        class_counts[label] += 1
    class_weights  = [1.0 / max(c, 1) for c in class_counts]
    sample_weights = [class_weights[label] for _, label in dataset.samples]
    return WeightedRandomSampler(sample_weights, len(sample_weights), replacement=True)

def load_data(data_dir: Path, batch_size: int, num_workers: int):
    train_ds = datasets.ImageFolder(str(data_dir / "train"), transform=train_transform)
    val_ds   = datasets.ImageFolder(str(data_dir / "val"),   transform=val_transform)

    actual = sorted(train_ds.class_to_idx.keys())
    expected = sorted(CLASSES)
    assert actual == expected, (
        f"Dataset folders {actual} != expected {expected}. "
        "Check your dataset/train/ subdirectory names."
    )

    train_loader = DataLoader(
        train_ds,
        batch_size  = batch_size,
        sampler     = make_weighted_sampler(train_ds),
        num_workers = num_workers,
        pin_memory  = torch.cuda.is_available(),
        persistent_workers = num_workers > 0,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size  = batch_size * 2,
        shuffle     = False,
        num_workers = num_workers,
        pin_memory  = torch.cuda.is_available(),
        persistent_workers = num_workers > 0,
    )
    return train_loader, val_loader, train_ds.class_to_idx

def mixup_batch(imgs: torch.Tensor, labels: torch.Tensor, alpha: float):
    """Blend two samples and their labels to prevent memorisation."""
    if alpha <= 0:
        return imgs, labels, labels, 1.0
    lam = float(torch.distributions.Beta(
        torch.tensor(alpha), torch.tensor(alpha)
    ).sample())
    idx   = torch.randperm(imgs.size(0), device=imgs.device)
    mixed = lam * imgs + (1 - lam) * imgs[idx]
    return mixed, labels, labels[idx], lam

def mixup_criterion(criterion, logits, y_a, y_b, lam):
    return lam * criterion(logits, y_a) + (1 - lam) * criterion(logits, y_b)

def run_epoch(
    model, loader, criterion, optimizer, scaler,
    device, is_train: bool,
    mixup_alpha: float = 0.0,
    freeze_batchnorm: bool = False,
) -> tuple[float, float]:
    """One pass over the dataset; returns (avg loss, accuracy)."""
    if is_train:
        model.train()
        if freeze_batchnorm:
            freeze_bn(model)
    else:
        model.eval()

    total_loss = 0.0
    correct    = 0
    total      = 0

    with torch.set_grad_enabled(is_train):
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)

            if is_train and mixup_alpha > 0:
                imgs, labels_a, labels_b, lam = mixup_batch(imgs, labels, mixup_alpha)
            else:
                labels_a, labels_b, lam = labels, labels, 1.0

            if scaler is not None:
                if _AMP_DEVICE_ARG:
                    ctx = autocast("cuda")
                else:
                    ctx = autocast()
            else:
                ctx = torch.no_grad() if not is_train else _null_context()

            with ctx:
                logits = model(imgs)
                if is_train and mixup_alpha > 0 and lam < 1.0:
                    loss = mixup_criterion(criterion, logits, labels_a, labels_b, lam)
                else:
                    loss = criterion(logits, labels)

            if is_train:
                optimizer.zero_grad(set_to_none=True)
                if scaler:
                    scaler.scale(loss).backward()
                    scaler.unscale_(optimizer)
                    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                    optimizer.step()

            total_loss += loss.item() * imgs.size(0)
            preds       = logits.argmax(dim=1)
            correct    += (preds == labels).sum().item()
            total      += imgs.size(0)

    return total_loss / max(total, 1), correct / max(total, 1)

class _null_context:
    """No-op context manager for CPU inference path."""
    def __enter__(self): return self
    def __exit__(self, *a): pass

def save_checkpoint(model, optimizer, epoch, val_loss, val_acc, path: Path, class_to_idx):
    torch.save({
        "epoch":        epoch,
        "model_state":  model.state_dict(),
        "optim_state":  optimizer.state_dict(),
        "val_loss":     val_loss,
        "val_acc":      val_acc,
        "class_to_idx": class_to_idx,
        "classes":      CLASSES,
    }, path)

def plot_history(history: dict, out_dir: Path) -> None:
    """Save loss + accuracy curves as PNG."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        epochs = range(1, len(history["train_loss"]) + 1)
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        fig.suptitle("AapdaSetu — Training Curves", fontsize=14)

        ax = axes[0]
        ax.plot(epochs, history["train_loss"], "b-o", markersize=3, label="Train Loss")
        ax.plot(epochs, history["val_loss"],   "r-o", markersize=3, label="Val Loss")
        ax.set_xlabel("Epoch"); ax.set_ylabel("Loss")
        ax.set_title("Loss (lower = better, curves should converge)")
        ax.legend(); ax.grid(alpha=0.3)

        ax = axes[1]
        ax.plot(epochs, history["train_acc"], "b-o", markersize=3, label="Train Acc")
        ax.plot(epochs, history["val_acc"],   "r-o", markersize=3, label="Val Acc")
        ax.set_xlabel("Epoch"); ax.set_ylabel("Accuracy")
        ax.set_title("Accuracy (gap < 10% = good generalisation)")
        ax.set_ylim(0, 1); ax.legend(); ax.grid(alpha=0.3)

        path = out_dir / "training_curves.png"
        plt.tight_layout()
        plt.savefig(path, dpi=150)
        plt.close()
        print(f"  Training curves saved → {path}")
    except ImportError:
        print("  [INFO] matplotlib not installed — skipping training curve plot")

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train ResNet50 damage classifier")
    for key, val in DEFAULTS.items():
        if isinstance(val, bool):
            p.add_argument(f"--{key}", action="store_true", default=val)
        elif val == "":
            p.add_argument(f"--{key}", type=str, default=val)
        else:
            p.add_argument(f"--{key}", type=type(val), default=val)
    return p.parse_args()

def main():
    args   = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_seed(args.seed)

    data_dir = Path(args.data_dir)
    out_dir  = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*62}")
    print(f"  AapdaSetu — Damage Classifier Training")
    print(f"  Device        : {device}")
    if device.type == "cuda":
        print(f"  GPU           : {torch.cuda.get_device_name(0)}")
        print(f"  VRAM          : {torch.cuda.get_device_properties(0).total_memory // 1024**2} MB")
    print(f"  Data dir      : {data_dir.resolve()}")
    print(f"  Checkpoints   : {out_dir.resolve()}")
    print(f"  Epochs        : {args.epochs}  (phase1={args.phase1_epochs}, warmup={args.warmup_epochs})")
    print(f"  Batch size    : {args.batch_size}")
    print(f"  Mixup alpha   : {args.mixup_alpha}")
    print(f"  LR head/tune  : {args.lr_head} / {args.lr_finetune}")
    print(f"{'='*62}\n")

    train_loader, val_loader, class_to_idx = load_data(
        data_dir, args.batch_size, args.num_workers
    )
    print(f"  Train batches : {len(train_loader)}  ({len(train_loader.dataset)} images)")
    print(f"  Val batches   : {len(val_loader)}   ({len(val_loader.dataset)} images)")
    print(f"  Class mapping : {class_to_idx}\n")

    model  = build_model(num_classes=len(CLASSES)).to(device)
    scaler = GradScaler() if device.type == "cuda" else None

    history: dict[str, list] = {
        "train_loss": [], "train_acc": [],
        "val_loss":   [], "val_acc":   [],
        "lr":         [],
    }

    best_val_loss  = float("inf")
    best_val_acc   = 0.0
    patience_count = 0
    start_epoch    = 0

    # Resume
    if args.resume and os.path.isfile(args.resume):
        ckpt = torch.load(args.resume, map_location=device, weights_only=True)
        model.load_state_dict(ckpt["model_state"])
        start_epoch = ckpt["epoch"] + 1
        best_val_loss = ckpt.get("val_loss", float("inf"))
        print(f"  Resumed from {args.resume} (epoch {start_epoch})\n")

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    print("── Phase 1: Training head only (backbone frozen) ────────────")
    freeze_backbone(model)
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr_head, weight_decay=args.weight_decay,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.phase1_epochs, eta_min=args.lr_head * 0.01,
    )

    p1_end = min(args.phase1_epochs, args.epochs)
    for epoch in range(start_epoch, p1_end):
        t0 = time.time()
        tr_loss, tr_acc = run_epoch(
            model, train_loader, criterion, optimizer, scaler, device,
            is_train=True, mixup_alpha=0.0,
        )
        vl_loss, vl_acc = run_epoch(
            model, val_loader, criterion, None, None, device,
            is_train=False,
        )
        scheduler.step()

        history["train_loss"].append(tr_loss)
        history["train_acc"].append(tr_acc)
        history["val_loss"].append(vl_loss)
        history["val_acc"].append(vl_acc)
        history["lr"].append(optimizer.param_groups[0]["lr"])

        elapsed = time.time() - t0
        print(f"  Ep {epoch+1:>3}/{args.epochs}  "
              f"tr_loss={tr_loss:.4f}  tr_acc={tr_acc:.3f}  "
              f"val_loss={vl_loss:.4f}  val_acc={vl_acc:.3f}  "
              f"lr={optimizer.param_groups[0]['lr']:.1e}  ({elapsed:.0f}s)")

        if vl_loss < best_val_loss:
            best_val_loss = vl_loss
            best_val_acc  = vl_acc
            save_checkpoint(model, optimizer, epoch, vl_loss, vl_acc,
                            out_dir / "best.pt", class_to_idx)
            print(f"       ✓ best saved  val_acc={vl_acc:.3f}")
            patience_count = 0
        else:
            patience_count += 1

    # Underfitting check after phase 1
    if len(history["val_acc"]) > 0 and history["val_acc"][-1] < 0.55:
        print("\n  ⚠  WARNING: val_acc < 55% after phase 1.")
        print("     This may indicate underfitting or a data/label problem.")
        print("     Check that dataset/train/ has the correct folder names.\n")

    print("\n── Phase 2: Fine-tuning layer3 + layer4 + head (BN frozen) ──")
    unfreeze_last_blocks(model)
    freeze_bn(model)

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr_finetune * 0.1,
        weight_decay=args.weight_decay,
    )
    target_lr  = args.lr_finetune
    remaining  = args.epochs - args.phase1_epochs
    scheduler  = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=max(remaining - args.warmup_epochs, 1), eta_min=1e-7,
    )
    patience_count = 0

    for epoch in range(args.phase1_epochs, args.epochs):
        # LR warmup
        ep_in_phase2 = epoch - args.phase1_epochs
        if ep_in_phase2 < args.warmup_epochs:
            warmup_factor = (ep_in_phase2 + 1) / args.warmup_epochs
            for pg in optimizer.param_groups:
                pg["lr"] = target_lr * warmup_factor
        elif ep_in_phase2 == args.warmup_epochs:
            for pg in optimizer.param_groups:
                pg["lr"] = target_lr
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer,
                T_max=max(remaining - args.warmup_epochs, 1),
                eta_min=1e-7,
            )

        t0 = time.time()
        tr_loss, tr_acc = run_epoch(
            model, train_loader, criterion, optimizer, scaler, device,
            is_train=True,
            mixup_alpha=args.mixup_alpha,
            freeze_batchnorm=True,
        )
        vl_loss, vl_acc = run_epoch(
            model, val_loader, criterion, None, None, device,
            is_train=False,
        )

        if ep_in_phase2 >= args.warmup_epochs:
            scheduler.step()

        history["train_loss"].append(tr_loss)
        history["train_acc"].append(tr_acc)
        history["val_loss"].append(vl_loss)
        history["val_acc"].append(vl_acc)
        history["lr"].append(optimizer.param_groups[0]["lr"])

        # Gap diagnostics
        gap = tr_acc - vl_acc
        if gap > 0.15:
            flag = "  ⚠ OVERFIT gap!"
        elif vl_acc < 0.55 and epoch > args.phase1_epochs + 5:
            flag = "  ⚠ UNDERFIT"
        else:
            flag = ""

        elapsed = time.time() - t0
        print(f"  Ep {epoch+1:>3}/{args.epochs}  "
              f"tr_loss={tr_loss:.4f}  tr_acc={tr_acc:.3f}  "
              f"val_loss={vl_loss:.4f}  val_acc={vl_acc:.3f}  "
              f"gap={gap:+.3f}  lr={optimizer.param_groups[0]['lr']:.1e}  "
              f"({elapsed:.0f}s){flag}")

        # Save last (for resume)
        save_checkpoint(model, optimizer, epoch, vl_loss, vl_acc,
                        out_dir / "last.pt", class_to_idx)

        if vl_loss < best_val_loss:
            best_val_loss = vl_loss
            best_val_acc  = vl_acc
            save_checkpoint(model, optimizer, epoch, vl_loss, vl_acc,
                            out_dir / "best.pt", class_to_idx)
            print(f"       ✓ best saved  val_acc={vl_acc:.3f}")
            patience_count = 0
        else:
            patience_count += 1
            if patience_count >= args.patience:
                print(f"\n  Early stopping — no val improvement for {args.patience} epochs")
                break

    hist_path = out_dir / "history.json"
    with open(hist_path, "w") as f:
        json.dump(history, f, indent=2)
    print(f"\n  History saved → {hist_path}")

    plot_history(history, out_dir)

    final_gap = history["train_acc"][-1] - history["val_acc"][-1]
    print(f"\n{'='*62}")
    print(f"  TRAINING COMPLETE")
    print(f"  Best val loss : {best_val_loss:.4f}")
    print(f"  Best val acc  : {best_val_acc:.3f}  ({best_val_acc*100:.1f}%)")
    print(f"  Final gap     : {final_gap:+.3f}  (train_acc − val_acc)")
    if final_gap > 0.15:
        print(f"  ⚠  Gap > 15%: model may be overfitting.")
        print(f"     Try: increase mixup_alpha, reduce lr_finetune, add more data.")
    elif best_val_acc < 0.70:
        print(f"  ⚠  val_acc < 70%: model may be underfitting.")
        print(f"     Try: train more epochs, or check dataset/ labels.")
    else:
        print(f"  ✓  Model looks well-generalised (gap ≤ 15%, val_acc ≥ 70%)")
    print(f"  Checkpoint    → {out_dir / 'best.pt'}")
    print(f"  Next step     : python training/evaluate.py")
    print(f"{'='*62}\n")

if __name__ == "__main__":
    main()
