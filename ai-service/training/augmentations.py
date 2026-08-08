"""
augmentations.py
================
All image transforms in one place.

Anti-overfitting strategy
──────────────────────────
TRAIN  — heavy geometric + colour augmentation so the model never sees
         the exact same image twice across epochs. With 40 epochs and
         random ops, each photo is seen in ~40 unique variations.

VAL    — no augmentation, only resize + centre-crop + normalise.
         Deterministic so val metrics are reproducible.

TEST   — identical to val (deterministic, reproducible final metrics).

INFER  — identical to val (what FastAPI uses at runtime).

TTA    — Test-Time Augmentation: run the same image through 5 slightly
         different crops and average the predictions. Boosts accuracy
         by 1-3% at zero extra training cost. Used in test_single.py
         and damage_classifier.py for production inference.

What is NOT used (and why):
  RandomVerticalFlip  — upside-down buildings never appear in real photos.
                        Including them would hurt accuracy (out-of-distribution).
  Very large rotations (>20°) — extreme tilts are rare for phone photos.
  CutMix              — overkill for 3-class, Mixup in train.py is sufficient.
"""

from torchvision import transforms

# ── Shared constants ──────────────────────────────────────────────────────────
IMAGE_SIZE = 224      # ResNet50 input size
RESIZE_TO  = 256      # resize before centre-crop (standard ResNet pipeline)

# ImageNet stats — must match the pretrained weights exactly
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]


# ── Training transform ────────────────────────────────────────────────────────
train_transform = transforms.Compose([

    # Geometry — simulates photos from different distances and angles
    transforms.RandomResizedCrop(
        IMAGE_SIZE,
        scale=(0.65, 1.00),   # see at least 65% of area — avoids too-aggressive cropping
        ratio=(0.80, 1.25),   # keep roughly square (phone photos aren't extreme aspect ratios)
    ),
    transforms.RandomHorizontalFlip(p=0.5),
    # NO vertical flip — upside-down buildings are out-of-distribution
    transforms.RandomRotation(degrees=12),  # ±12° phone tilt — realistic

    # Colour / lighting — simulates different cameras, time of day, weather
    transforms.ColorJitter(
        brightness=0.35,
        contrast=0.35,
        saturation=0.25,
        hue=0.06,
    ),
    # 10% chance grayscale — forces model to learn structure, not just colour
    transforms.RandomGrayscale(p=0.10),

    # Blur — simulates motion blur / low-res phone cameras
    transforms.RandomApply(
        [transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 1.5))],
        p=0.25,
    ),

    # RandAugment — learnt augmentation policy (shear, posterize, equalize etc.)
    # num_ops=2, magnitude=6 — slightly lighter so the training signal stays clear
    transforms.RandAugment(num_ops=2, magnitude=6),

    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),

    # RandomErasing — blacks out 2-15% of image AFTER normalisation.
    # Prevents the model from memorising a single discriminative patch.
    # p=0.20 is lighter than before — avoids erasing too much on 224×224
    transforms.RandomErasing(
        p=0.20,
        scale=(0.02, 0.15),
        ratio=(0.3, 3.3),
        value=0,
    ),
])


# ── Validation / Test / Inference — deterministic ────────────────────────────
val_transform = transforms.Compose([
    transforms.Resize(RESIZE_TO),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),
])

test_transform  = val_transform
infer_transform = val_transform


# ── Test-Time Augmentation (TTA) ──────────────────────────────────────────────
# Runs the same image through 5 deterministic crops, averages softmax outputs.
# Boosts accuracy 1-3% at zero training cost. Used in production inference.
tta_transforms = [
    # Centre crop (standard)
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # Horizontal flip + centre crop
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # Slightly larger crop (zoom out)
    transforms.Compose([
        transforms.Resize(int(RESIZE_TO * 1.15)),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # Slightly smaller crop (zoom in)
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(int(IMAGE_SIZE * 0.92)),
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # Mild brightness shift
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ColorJitter(brightness=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
]
