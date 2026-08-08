"""
damage_classifier.py
====================
Production inference wrapper around the trained ResNet50 checkpoint.

The model is trained by training/train.py and saved to checkpoints/best.pt.
Set DAMAGE_MODEL_PATH in .env to point at that file.

If no checkpoint is found (first run / demo), falls back to ImageNet weights
with a warning — results will be random in that case.
"""

from __future__ import annotations

import io
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms

# Re-use the exact same transform that was used during val/test
# so train-test skew is impossible
_TRANSFORMS_AVAILABLE = False
try:
    _repo_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(_repo_root))
    from training.augmentations import infer_transform as _infer_transform
    _TRANSFORMS_AVAILABLE = True
except ImportError:
    pass


# ── Config ────────────────────────────────────────────────────────────────────
MODEL_CHECKPOINT_PATH = os.getenv("DAMAGE_MODEL_PATH", "checkpoints/best.pt")
DEVICE  = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CLASSES = ["MINOR", "MAJOR", "DESTROYED"]

# Fallback transform (identical to val_transform in augmentations.py)
# Used only when augmentations.py cannot be imported
_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]
_fallback_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=_MEAN, std=_STD),
])

_transform = _infer_transform if _TRANSFORMS_AVAILABLE else _fallback_transform
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class ClassificationResult:
    damage_grade: str        # "MINOR" | "MAJOR" | "DESTROYED"
    confidence: float        # softmax probability for top class (0–1)
    all_scores: dict         # {"MINOR": 0.x, "MAJOR": 0.x, "DESTROYED": 0.x}
    ai_description: str
    using_trained_model: bool  # False = ImageNet fallback, treat with caution


# ── Compensation table (NDRF / SDRF norms, INR) ──────────────────────────────
COMPENSATION_TABLE = {
    "RESIDENTIAL": {"MINOR": 10_000,  "MAJOR": 95_000,  "DESTROYED": 130_000},
    "COMMERCIAL":  {"MINOR": 25_000,  "MAJOR": 200_000, "DESTROYED": 350_000},
    "AGRICULTURAL":{"MINOR":  5_000,  "MAJOR": 40_000,  "DESTROYED":  68_000},
}

_DESCRIPTIONS = {
    "MINOR":     "Minor damage detected — repairable cracks or superficial damage. "
                 "Structure is likely habitable.",
    "MAJOR":     "Major structural damage detected — partial wall or roof collapse. "
                 "Temporary relocation recommended.",
    "DESTROYED": "Complete destruction detected — total loss, not habitable. "
                 "Immediate relocation required.",
}


# ── Model ─────────────────────────────────────────────────────────────────────

def _build_resnet50(num_classes: int = 3) -> nn.Module:
    """Build the exact same architecture used in train.py."""
    m = models.resnet50(weights=None)
    m.fc = nn.Sequential(
        nn.Dropout(p=0.0),           # p=0 at inference — dropout is training-only
        nn.Linear(m.fc.in_features, num_classes),
    )
    return m


class DamageClassifier:
    """
    Singleton model wrapper.

    Loaded once at first request, reused for all subsequent calls.
    Thread-safe for FastAPI's async workers because PyTorch inference
    with torch.no_grad() is re-entrant.
    """

    _instance: Optional["DamageClassifier"] = None

    def __new__(cls) -> "DamageClassifier":
        if cls._instance is None:
            obj = super().__new__(cls)
            obj._load()
            cls._instance = obj
        return cls._instance

    def _load(self) -> None:
        ckpt_path = Path(MODEL_CHECKPOINT_PATH)
        self.model = _build_resnet50(len(CLASSES))

        # Default index->class mapping; replaced below by the checkpoint's
        # authoritative training-time mapping when a checkpoint is present.
        self._idx_to_class: dict[int, str] = {i: c for i, c in enumerate(CLASSES)}

        if ckpt_path.is_file():
            # ── Load trained checkpoint ───────────────────────────────────────
            ckpt = torch.load(ckpt_path, map_location=DEVICE, weights_only=True)
            self.model.load_state_dict(ckpt["model_state"])
            self._trained = True

            # Use the training-time ImageFolder mapping (authoritative index
            # order). This fixes a MINOR/DESTROYED label swap: the model emits
            # logits in ImageFolder alphabetical order (DESTROYED=0, MAJOR=1,
            # MINOR=2), NOT in the CLASSES list order.
            c2i = ckpt.get("class_to_idx")
            if c2i:
                self._idx_to_class = {int(v): k for k, v in c2i.items()}

            val_acc = ckpt.get("val_acc", "?")
            val_loss = ckpt.get("val_loss", "?")
            epoch = ckpt.get("epoch", "?")
            print(f"[DamageClassifier] Loaded trained checkpoint: {ckpt_path}")
            print(f"[DamageClassifier] Epoch={epoch}  val_acc={val_acc}  val_loss={val_loss}")
            print(f"[DamageClassifier] Index->class mapping: {self._idx_to_class}")

            # Validate the class NAMES match (order-independent).
            saved_classes = ckpt.get("classes", CLASSES)
            if set(saved_classes) != set(self._idx_to_class.values()):
                raise ValueError(
                    f"Checkpoint classes {saved_classes} != expected "
                    f"{sorted(self._idx_to_class.values())}. Retrain with matching class names."
                )
        else:
            # ── ImageNet fallback (demo only) ─────────────────────────────────
            pretrained = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
            # Copy weights into our architecture (fc layer shape mismatch is ok
            # since we use strict=False — only backbone weights are copied)
            self.model.load_state_dict(pretrained.state_dict(), strict=False)
            self._trained = False
            print(
                f"[DamageClassifier] WARNING: No checkpoint found at {ckpt_path}. "
                "Using ImageNet pre-trained weights — predictions are unreliable. "
                "Run training/train.py to produce a real checkpoint."
            )

        self.model.to(DEVICE).eval()

    def predict(self, image_bytes: bytes) -> ClassificationResult:
        """
        Run inference on raw image bytes using Test-Time Augmentation (TTA).

        TTA runs the same image through 5 slightly different crops/flips,
        averages the softmax scores, then picks the top class.
        This gives 1-3% accuracy improvement over a single forward pass
        at zero extra training cost.

        Falls back to single forward pass if TTA transforms are unavailable.
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Try TTA first, fall back to single pass
        try:
            _repo_root2 = Path(__file__).resolve().parent.parent
            sys.path.insert(0, str(_repo_root2))
            from training.augmentations import tta_transforms
            transforms_to_use = tta_transforms
        except ImportError:
            transforms_to_use = None

        with torch.no_grad():
            if transforms_to_use:
                # Average predictions over all TTA transforms
                all_probs = []
                for t in transforms_to_use:
                    tensor = t(img).unsqueeze(0).to(DEVICE)
                    logits = self.model(tensor)
                    probs  = F.softmax(logits, dim=1)[0]
                    all_probs.append(probs)
                # Mean of softmax probabilities (better than voting)
                probs = torch.stack(all_probs).mean(dim=0)
            else:
                tensor = _transform(img).unsqueeze(0).to(DEVICE)
                logits = self.model(tensor)
                probs  = F.softmax(logits, dim=1)[0]

        scores   = {self._idx_to_class[i]: round(float(probs[i]), 4) for i in range(len(probs))}
        top_idx  = int(probs.argmax())
        top_cls  = self._idx_to_class[top_idx]
        top_conf = round(float(probs[top_idx]), 4)

        # Untrained fallback — discount confidence heavily
        if not self._trained:
            top_conf = round(top_conf * 0.4, 4)

        return ClassificationResult(
            damage_grade        = top_cls,
            confidence          = top_conf,
            all_scores          = scores,
            ai_description      = _DESCRIPTIONS[top_cls],
            using_trained_model = self._trained,
        )

    @classmethod
    def reset(cls) -> None:
        """Force reload — useful for hot-swapping checkpoints without restart."""
        cls._instance = None


def calculate_compensation(damage_grade: str, property_type: str = "RESIDENTIAL") -> float:
    """Return standard compensation amount in INR based on grade and property type."""
    table = COMPENSATION_TABLE.get(property_type.upper(), COMPENSATION_TABLE["RESIDENTIAL"])
    return float(table.get(damage_grade, 0))
