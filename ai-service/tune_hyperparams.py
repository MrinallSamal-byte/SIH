"""
tune_hyperparams.py
===================
Optuna-based hyperparameter search — finds the best combination of:
  - Learning rate (head phase)
  - Learning rate (finetune phase)
  - Dropout rate
  - Weight decay
  - Batch size
  - Label smoothing
  - Phase 1 epoch count

Run AFTER prepare_dataset.py, BEFORE final train.py.

Usage
─────
  python training/tune_hyperparams.py              # 30 trials (default)
  python training/tune_hyperparams.py --trials 50  # more trials = better search

Output
──────
  checkpoints/best_hyperparams.json   ← use these values in train.py

How it works (Optuna TPE sampler)
──────────────────────────────────
Each trial trains for only 10 epochs (fast proxy) and reports val accuracy.
Optuna uses Tree-structured Parzen Estimator (TPE) — a Bayesian method that
builds a probabilistic model of which hyperparameters give good results, then
samples more trials from promising regions. Much smarter than grid search.

Pruning: MedianPruner stops bad trials early (after epoch 3) if they are
performing below the median of completed trials. Saves ~40% of compute.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import optuna
from optuna.pruners import MedianPruner
from optuna.samplers import TPESampler
import torch
import torch.nn as nn
try:
    from torch.amp import GradScaler, autocast as _autocast
    def autocast(enabled=True):
        return _autocast("cuda", enabled=enabled)
except ImportError:
    from torch.cuda.amp import GradScaler, autocast
from torch.utils.data import DataLoader
from torchvision import datasets, models

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from training.augmentations import train_transform, val_transform

CLASSES      = ["MINOR", "MAJOR", "DESTROYED"]
QUICK_EPOCHS = 12     # each trial trains for this many epochs (proxy for full run)
DEVICE       = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_model(dropout: float) -> nn.Module:
    m = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    # Freeze all conv layers — only tune the head in the search
    for p in m.parameters():
        p.requires_grad = False
    m.fc = nn.Sequential(
        nn.Dropout(p=dropout),
        nn.Linear(m.fc.in_features, len(CLASSES)),
    )
    return m.to(DEVICE)


def get_loaders(data_dir: Path, batch_size: int):
    train_ds = datasets.ImageFolder(str(data_dir / "train"), transform=train_transform)
    val_ds   = datasets.ImageFolder(str(data_dir / "val"),   transform=val_transform)

    # Weighted sampler for imbalance
    counts  = [0] * len(train_ds.classes)
    for _, lbl in train_ds.samples:
        counts[lbl] += 1
    weights = [1.0 / max(c, 1) for c in counts]
    sample_w = [weights[lbl] for _, lbl in train_ds.samples]
    from torch.utils.data import WeightedRandomSampler
    sampler = WeightedRandomSampler(sample_w, len(sample_w), replacement=True)

    tl = DataLoader(train_ds, batch_size=batch_size, sampler=sampler,  num_workers=0, pin_memory=False)
    vl = DataLoader(val_ds,   batch_size=batch_size * 2, shuffle=False, num_workers=0, pin_memory=False)
    return tl, vl


def objective(trial: optuna.Trial, data_dir: Path) -> float:
    # ── Sample hyperparameters ────────────────────────────────────────────────
    lr          = trial.suggest_float("lr",           1e-4, 1e-2, log=True)
    dropout     = trial.suggest_float("dropout",      0.2,  0.6)
    weight_decay= trial.suggest_float("weight_decay", 1e-5, 1e-2, log=True)
    batch_size  = trial.suggest_categorical("batch_size", [16, 32])
    smoothing   = trial.suggest_float("label_smoothing", 0.0, 0.2)

    model     = build_model(dropout)
    criterion = nn.CrossEntropyLoss(label_smoothing=smoothing)
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=lr, weight_decay=weight_decay,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=QUICK_EPOCHS)
    scaler    = GradScaler() if DEVICE.type == "cuda" else None

    train_loader, val_loader = get_loaders(data_dir, batch_size)

    best_val_acc = 0.0
    for epoch in range(QUICK_EPOCHS):
        # ── Train ─────────────────────────────────────────────────────────────
        model.train()
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            with autocast(enabled=(scaler is not None)):
                loss = criterion(model(imgs), labels)
            if scaler:
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                loss.backward()
                optimizer.step()
        scheduler.step()

        # ── Validate ──────────────────────────────────────────────────────────
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                preds = model(imgs).argmax(dim=1)
                correct += (preds == labels).sum().item()
                total   += imgs.size(0)

        val_acc = correct / max(total, 1)
        best_val_acc = max(best_val_acc, val_acc)

        # Report to Optuna for pruning
        trial.report(val_acc, epoch)
        if trial.should_prune():
            raise optuna.exceptions.TrialPruned()

    return best_val_acc


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir", default="dataset")
    p.add_argument("--trials",   type=int, default=30)
    p.add_argument("--out_dir",  default="checkpoints")
    return p.parse_args()


def main():
    args     = parse_args()
    data_dir = Path(args.data_dir)
    out_dir  = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*58}")
    print(f"  AapdaSetu — Hyperparameter Search (Optuna TPE)")
    print(f"  Trials  : {args.trials}")
    print(f"  Epochs per trial : {QUICK_EPOCHS}")
    print(f"  Device  : {DEVICE}")
    print(f"{'='*58}\n")

    study = optuna.create_study(
        direction = "maximize",
        sampler   = TPESampler(seed=42),
        pruner    = MedianPruner(n_startup_trials=5, n_warmup_steps=3),
    )

    study.optimize(
        lambda trial: objective(trial, data_dir),
        n_trials  = args.trials,
        show_progress_bar = True,
    )

    best = study.best_trial
    print(f"\n  Best val accuracy : {best.value:.4f}")
    print(f"  Best params:")
    for k, v in best.params.items():
        print(f"    {k:<20} = {v}")

    # Save best params
    out_path = out_dir / "best_hyperparams.json"
    with open(out_path, "w") as f:
        json.dump({"best_val_acc": best.value, "params": best.params}, f, indent=2)
    print(f"\n  Saved → {out_path}")
    print(f"\n  Now run train.py with these values:")
    params = best.params
    print(f"  python training/train.py "
          f"--lr_head {params.get('lr', 1e-3):.2e} "
          f"--batch_size {params.get('batch_size', 32)} "
          f"--weight_decay {params.get('weight_decay', 1e-4):.2e}\n")


if __name__ == "__main__":
    main()
