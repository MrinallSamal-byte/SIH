"""Production inference wrapper around the trained ResNet50 checkpoint.
Checkpoint hosted on Hugging Face: https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment
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

_TRANSFORMS_AVAILABLE = False
try:
    _repo_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(_repo_root))
    from training.augmentations import infer_transform as _infer_transform
    _TRANSFORMS_AVAILABLE = True
except ImportError:
    pass

# Download checkpoint from the Hugging Face model repo (see .gitignore)
MODEL_CHECKPOINT_PATH = os.getenv("DAMAGE_MODEL_PATH", "checkpoints/best.pt")
DEVICE  = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CLASSES = ["MINOR", "MAJOR", "DESTROYED"]

_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]
_fallback_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=_MEAN, std=_STD),
])

_transform = _infer_transform if _TRANSFORMS_AVAILABLE else _fallback_transform

@dataclass
class ClassificationResult:
    damage_grade: str
    confidence: float
    all_scores: dict
    ai_description: str
    using_trained_model: bool

# Compensation amounts in INR (NDRF / SDRF norms)
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

def _build_resnet50(num_classes: int = 3) -> nn.Module:
    m = models.resnet50(weights=None)
    m.fc = nn.Sequential(
        nn.Dropout(p=0.0),
        nn.Linear(m.fc.in_features, num_classes),
    )
    return m

class DamageClassifier:
    """Singleton model wrapper — loaded once, reused for all requests."""

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

        self._idx_to_class: dict[int, str] = {i: c for i, c in enumerate(CLASSES)}

        if ckpt_path.is_file():
            ckpt = torch.load(ckpt_path, map_location=DEVICE, weights_only=True)
            self.model.load_state_dict(ckpt["model_state"])
            self._trained = True

            # Model emits logits in ImageFolder alphabetical order, not CLASSES order
            c2i = ckpt.get("class_to_idx")
            if c2i:
                self._idx_to_class = {int(v): k for k, v in c2i.items()}

            val_acc = ckpt.get("val_acc", "?")
            val_loss = ckpt.get("val_loss", "?")
            epoch = ckpt.get("epoch", "?")
            print(f"[DamageClassifier] Loaded trained checkpoint: {ckpt_path}")
            print(f"[DamageClassifier] Epoch={epoch}  val_acc={val_acc}  val_loss={val_loss}")
            print(f"[DamageClassifier] Index->class mapping: {self._idx_to_class}")

            saved_classes = ckpt.get("classes", CLASSES)
            if set(saved_classes) != set(self._idx_to_class.values()):
                raise ValueError(
                    f"Checkpoint classes {saved_classes} != expected "
                    f"{sorted(self._idx_to_class.values())}. Retrain with matching class names."
                )
        else:
            pretrained = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
            self.model.load_state_dict(pretrained.state_dict(), strict=False)
            self._trained = False
            print(
                f"[DamageClassifier] WARNING: No checkpoint found at {ckpt_path}. "
                "Using ImageNet pre-trained weights — predictions are unreliable. "
                "Run training/train.py to produce a real checkpoint."
            )

        self.model.to(DEVICE).eval()

    def predict(self, image_bytes: bytes) -> ClassificationResult:
        """Run inference on raw image bytes, averaging TTA crops when available."""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        try:
            _repo_root2 = Path(__file__).resolve().parent.parent
            sys.path.insert(0, str(_repo_root2))
            from training.augmentations import tta_transforms
            transforms_to_use = tta_transforms
        except ImportError:
            transforms_to_use = None

        with torch.no_grad():
            if transforms_to_use:
                all_probs = []
                for t in transforms_to_use:
                    tensor = t(img).unsqueeze(0).to(DEVICE)
                    logits = self.model(tensor)
                    probs  = F.softmax(logits, dim=1)[0]
                    all_probs.append(probs)
                probs = torch.stack(all_probs).mean(dim=0)
            else:
                tensor = _transform(img).unsqueeze(0).to(DEVICE)
                logits = self.model(tensor)
                probs  = F.softmax(logits, dim=1)[0]

        scores   = {self._idx_to_class[i]: round(float(probs[i]), 4) for i in range(len(probs))}
        top_idx  = int(probs.argmax())
        top_cls  = self._idx_to_class[top_idx]
        top_conf = round(float(probs[top_idx]), 4)

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
        """Force reload of the model."""
        cls._instance = None

def calculate_compensation(damage_grade: str, property_type: str = "RESIDENTIAL") -> float:
    table = COMPENSATION_TABLE.get(property_type.upper(), COMPENSATION_TABLE["RESIDENTIAL"])
    return float(table.get(damage_grade, 0))
