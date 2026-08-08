"""Image transforms: train (augmented), val/test/infer (deterministic), and TTA crops."""

from torchvision import transforms

IMAGE_SIZE = 224
RESIZE_TO  = 256

# ImageNet normalization stats
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.65, 1.00), ratio=(0.80, 1.25)),
    transforms.RandomHorizontalFlip(p=0.5),
    # no vertical flip — upside-down buildings are unrealistic
    transforms.RandomRotation(degrees=12),
    transforms.ColorJitter(brightness=0.35, contrast=0.35, saturation=0.25, hue=0.06),
    transforms.RandomGrayscale(p=0.10),
    transforms.RandomApply(
        [transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 1.5))],
        p=0.25,
    ),
    transforms.RandAugment(num_ops=2, magnitude=6),
    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),
    transforms.RandomErasing(p=0.20, scale=(0.02, 0.15), ratio=(0.3, 3.3), value=0),
])

val_transform = transforms.Compose([
    transforms.Resize(RESIZE_TO),
    transforms.CenterCrop(IMAGE_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),
])

test_transform  = val_transform
infer_transform = val_transform

# Test-time augmentation: 5 crops, averaged at inference
tta_transforms = [
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # zoom out
    transforms.Compose([
        transforms.Resize(int(RESIZE_TO * 1.15)),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # zoom in
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(int(IMAGE_SIZE * 0.92)),
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
    # brightness shift
    transforms.Compose([
        transforms.Resize(RESIZE_TO),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ColorJitter(brightness=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD),
    ]),
]
