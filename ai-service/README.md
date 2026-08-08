---
license: mit
library_name: pytorch
pipeline_tag: image-classification
tags:
  - pytorch
  - resnet50
  - damage-assessment
  - disaster-response
  - building-damage
  - smart-india-hackathon
model-index:
  - name: aapdasetu-damage-assessment
    results:
      - task:
          type: image-classification
          name: Image Classification
        dataset:
          name: AapdaSetu Building Damage Dataset
          type: aapdasetu-damage
        metrics:
          - type: accuracy
            value: 98.36%
---

# AapdaSetu Damage Assessment — ResNet50

> **🤗 Model weights are NOT stored in this GitHub repo** (the checkpoint is ~270 MB).
> Download them from Hugging Face: **[Divyanshu-Kumar19/aapdasetu-damage-assessment](https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment)**

Post-disaster building damage classifier for the **AapdaSetu** platform. Given a photo of a disaster-affected building, the model classifies damage severity into one of three grades and drives automated compensation assessment in the AapdaSetu relief pipeline.

Part of the **AapdaSetu** project (Smart India Hackathon).

## Model Details

| | |
|---|---|
| **Architecture** | ResNet50 (ImageNet-1K V2 pretrained backbone) + custom FC head (`Dropout → Linear(2048, 3)`) |
| **Input** | 224×224 RGB image |
| **Preprocessing** | `Resize(256) → CenterCrop(224) → ToTensor → Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])` |
| **Classes** | `MINOR`, `MAJOR`, `DESTROYED` |
| **Checkpoint** | `best.pt` (~97 MB, PyTorch dict — keys: `model_state`, `class_to_idx`, `classes`, `epoch`, `val_acc`, `val_loss`, `optim_state`) |

## Training Recipe

- **Dataset**: 2,400 post-disaster building images — MINOR (846), MAJOR (525), DESTROYED (1,029), split 75 / 15 / 10 per class with a leak check (image hashes verified disjoint across splits — see `leak_check.json`).
- **Two-phase training**:
  1. Backbone frozen — only the new FC head trains
  2. Full fine-tuning of the entire network
- **Evaluation**: 5-crop Test-Time Augmentation (TTA) on the held-out test set.

## Evaluation Results

Held-out test set (244 images), with TTA:

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| DESTROYED | 0.990 | 0.981 | 0.986 | 104 |
| MAJOR | 0.982 | 1.000 | 0.991 | 54 |
| MINOR | 0.977 | 0.977 | 0.977 | 86 |
| **Overall accuracy** | | | | **98.36%** |

Full metrics: [`eval_report.json`](eval_report.json) · Confusion matrix: [`confusion_matrix.png`](confusion_matrix.png) · ROC curves: [`roc_curves.png`](roc_curves.png) · Training curves: [`training_curves.png`](training_curves.png) · Misclassified samples: [`misclassified.png`](misclassified.png) · Training history: [`history.json`](history.json) · Split leak audit: [`leak_check.json`](leak_check.json)

## Quick Start — Loading `best.pt` for Inference

```python
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 1. Build the exact architecture used during training
model = models.resnet50(weights=None)
model.fc = nn.Sequential(
    nn.Dropout(p=0.0),                    # training-only; inert at inference
    nn.Linear(model.fc.in_features, 3),
)

# 2. Load the checkpoint
ckpt = torch.load("best.pt", map_location=device, weights_only=True)
model.load_state_dict(ckpt["model_state"])
model.to(device).eval()

# 3. IMPORTANT — use the checkpoint's index->class mapping.
#    ImageFolder trained classes in ALPHABETICAL order
#    (DESTROYED=0, MAJOR=1, MINOR=2), NOT ["MINOR", "MAJOR", "DESTROYED"].
idx_to_class = {int(v): k for k, v in ckpt["class_to_idx"].items()}

# 4. Preprocess exactly like training validation
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# 5. Predict
img = Image.open("building.jpg").convert("RGB")
x = transform(img).unsqueeze(0).to(device)
with torch.no_grad():
    probs = torch.softmax(model(x), dim=1)[0]

scores = {idx_to_class[i]: round(float(p), 4) for i, p in enumerate(probs)}
print("Damage grade:", idx_to_class[int(probs.argmax())])
print("All scores:", scores)
```

Download the checkpoint with:

```bash
hf download Divyanshu-Kumar19/aapdasetu-damage-assessment best.pt --local-dir ./checkpoints
```

## Intended Use

- Triage of post-disaster building damage photos in the AapdaSetu claim pipeline (maps grade → compensation under NDRF/SDRF norms).
- **Not** a substitute for a certified structural engineer's assessment.
- Out of scope: images that are not disaster-affected buildings, and safety-critical decisions without human review.

## Files in This Repository

| File | Description |
|---|---|
| `best.pt` | Trained model checkpoint (state dict + metadata) |
| `eval_report.json` | Per-class precision / recall / F1 on the test set |
| `confusion_matrix.png` | Confusion matrix visualization |
| `roc_curves.png` | One-vs-rest ROC curves |
| `training_curves.png` | Train/val loss & accuracy curves |
| `confidence_distribution.png` | Prediction confidence distribution |
| `misclassified.png` | Test samples the model got wrong |
| `history.json` | Per-epoch training history |
| `leak_check.json` | Train/val/test split leak audit |

## License

MIT
