"""
bootstrap.py
============
Render.com startup script.

The trained checkpoint (best.pt) is intentionally NOT stored in this GitHub
repo — it lives on Hugging Face:
    https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment

This script downloads it on boot if missing, then launches uvicorn.
"""
import os
import subprocess
import sys
from pathlib import Path

CKPT = Path("checkpoints/best.pt")
HF_REPO = "Divyanshu-Kumar19/aapdasetu-damage-assessment"


def main() -> None:
    if not CKPT.is_file():
        from huggingface_hub import hf_hub_download

        print(f"[bootstrap] Downloading best.pt from HF repo {HF_REPO} ...")
        hf_hub_download(HF_REPO, "best.pt", local_dir="checkpoints")
        print(f"[bootstrap] Checkpoint ready at {CKPT}")
    else:
        print(f"[bootstrap] Checkpoint already present at {CKPT}")

    port = os.getenv("PORT", "8000")
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0", "--port", port],
        check=True,
    )


if __name__ == "__main__":
    main()
