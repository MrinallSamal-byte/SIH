"""
bootstrap.py
============
Render.com startup script.

The trained model is intentionally NOT stored in this GitHub repo — it lives
on Hugging Face:
    https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment

On boot we download the ONNX export (best.onnx, ~94 MB) which runs on
onnxruntime — small enough for Render's 512 MB free tier (PyTorch got OOM-killed).
Then launches uvicorn.
"""
import os
import subprocess
import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

ONNX = Path("checkpoints/best.onnx")
MAPPING = Path("checkpoints/class_mapping.json")
HF_REPO = "Divyanshu-Kumar19/aapdasetu-damage-assessment"


def main() -> None:
    for local, fname in ((ONNX, "best.onnx"), (MAPPING, "class_mapping.json")):
        if not local.is_file():
            print(f"[bootstrap] Downloading {fname} from HF repo {HF_REPO} ...")
            hf_hub_download(HF_REPO, fname, local_dir="checkpoints")
        print(f"[bootstrap] Ready: {local}")

    port = os.getenv("PORT", "8000")
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0", "--port", port],
        check=True,
    )


if __name__ == "__main__":
    main()
