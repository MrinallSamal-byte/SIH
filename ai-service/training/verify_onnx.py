"""Parity check: torch checkpoint vs exported ONNX on a random image."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import numpy as np
import onnxruntime as ort
import torch
from training.export_onnx import build_resnet50

ckpt = torch.load(ROOT / "checkpoints" / "best.pt", map_location="cpu", weights_only=True)
model = build_resnet50(3)
model.load_state_dict(ckpt["model_state"])
model.eval()

x = torch.randn(1, 3, 224, 224)
with torch.no_grad():
    ref = torch.softmax(model(x), dim=1).numpy()

sess = ort.InferenceSession(str(ROOT / "checkpoints" / "best.onnx"), providers=["CPUExecutionProvider"])
out = sess.run(["scores"], {"image": x.numpy()})[0]

print("torch:", ref.round(6))
print("onnx :", out.round(6))
print("max abs diff:", float(np.abs(ref - out).max()))
