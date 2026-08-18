"""
export_onnx.py
==============
Export the trained ResNet50 checkpoint (best.pt) to ONNX so the Render.com
free tier (512 MB RAM) can run it with onnxruntime instead of PyTorch.

Usage:
    python training/export_onnx.py [ckpt_path] [out_dir]

Outputs:
    <out_dir>/best.onnx            — model graph with softmax baked in
    <out_dir>/class_mapping.json   — {logit_index: class_name} from training time
"""
import json
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models

REPO_ROOT = Path(__file__).resolve().parent.parent
CKPT = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO_ROOT / "checkpoints" / "best.pt"
OUT_DIR = Path(sys.argv[2]) if len(sys.argv) > 2 else CKPT.parent


def build_resnet50(num_classes: int = 3) -> nn.Module:
    m = models.resnet50(weights=None)
    m.fc = nn.Sequential(nn.Dropout(p=0.0), nn.Linear(m.fc.in_features, num_classes))
    return m


def main() -> None:
    ckpt = torch.load(CKPT, map_location="cpu", weights_only=True)
    c2i = ckpt.get("class_to_idx", {"DESTROYED": 0, "MAJOR": 1, "MINOR": 2})
    idx_to_class = {int(v): k for k, v in c2i.items()}
    model = build_resnet50(len(idx_to_class))
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    # Bake softmax into the graph so the server gets probabilities directly
    wrapped = nn.Sequential(model, nn.Softmax(dim=1))

    out_onnx = OUT_DIR / "best.onnx"
    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        wrapped,
        dummy,
        out_onnx,
        input_names=["image"],
        output_names=["scores"],
        dynamic_axes={"image": {0: "batch"}, "scores": {0: "batch"}},
        opset_version=17,
    )

    out_map = OUT_DIR / "class_mapping.json"
    out_map.write_text(json.dumps(idx_to_class, indent=2))

    print(f"[export] ONNX model  -> {out_onnx} ({out_onnx.stat().st_size / 1e6:.1f} MB)")
    print(f"[export] class map   -> {out_map} {idx_to_class}")


if __name__ == "__main__":
    main()
