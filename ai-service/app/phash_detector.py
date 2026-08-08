"""
Perceptual Hash (pHash) Duplicate Detector
-------------------------------------------
Computes a 64-bit DCT-based perceptual hash for an image.

Why pHash over MD5/SHA?
  A bit-identical copy has the same MD5, but a screenshot, recompressed JPEG,
  or colour-adjusted version has a different MD5 yet looks identical to a human
  reviewer. pHash survives those minor edits — it compares *visual content*, not
  raw bytes.

Hamming distance threshold: images with distance ≤ DUPLICATE_THRESHOLD are
considered the same photograph for fraud purposes.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Optional

import numpy as np
from PIL import Image


# ── Tunable threshold ────────────────────────────────────────────────────────
DUPLICATE_THRESHOLD = 10   # bits different out of 64; ~15% tolerance
HASH_SIZE          = 8     # produces a 64-bit hash (8×8 DCT grid)
HIGH_FREQ_FACTOR   = 4     # image is resized to (hash_size × high_freq_factor)²
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class PHashResult:
    hash_hex: str        # 16-char lowercase hex string representing 64 bits
    is_duplicate: bool
    duplicate_of_hash: Optional[str]   # hash of the existing record that matched
    hamming_distance: Optional[int]    # None when no duplicate found


def compute_phash(image_bytes: bytes) -> str:
    """
    Compute the 64-bit DCT perceptual hash of *image_bytes*.

    Returns a 16-character lowercase hex string (zero-padded).
    Raises ValueError on unreadable image data.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("L")  # grayscale

    img_size = HASH_SIZE * HIGH_FREQ_FACTOR
    img = img.resize((img_size, img_size), Image.LANCZOS)

    pixels = np.array(img, dtype=np.float32)

    # 2D DCT via separable 1D DCT on rows then columns
    dct = _dct2(pixels)

    # Top-left HASH_SIZE×HASH_SIZE is the low-frequency component
    dct_low = dct[:HASH_SIZE, :HASH_SIZE]

    # Compare each value to the mean (excluding [0,0] DC term)
    mean_val = (dct_low.sum() - dct_low[0, 0]) / (HASH_SIZE * HASH_SIZE - 1)
    bits = (dct_low > mean_val).flatten()

    # Pack 64 bits → 8 bytes → hex string
    hash_int = int("".join("1" if b else "0" for b in bits), 2)
    return format(hash_int, "016x")


def hamming_distance(hash_a: str, hash_b: str) -> int:
    """Bit-level Hamming distance between two 16-char hex hash strings."""
    a = int(hash_a, 16)
    b = int(hash_b, 16)
    xor = a ^ b
    return bin(xor).count("1")


def check_duplicate(new_hash: str, existing_hashes: list[str]) -> PHashResult:
    """
    Compare *new_hash* against a list of *existing_hashes* already stored in
    the database.

    Parameters
    ----------
    new_hash        : hex hash of the incoming photo
    existing_hashes : list of (hash_hex) strings from the DB for the same
                      disaster zone / date window

    Returns
    -------
    PHashResult — is_duplicate=True when any stored hash is within threshold.
    """
    best_dist: Optional[int] = None
    best_match: Optional[str] = None

    for stored in existing_hashes:
        try:
            dist = hamming_distance(new_hash, stored)
        except ValueError:
            continue
        if best_dist is None or dist < best_dist:
            best_dist = dist
            best_match = stored

    is_dup = best_dist is not None and best_dist <= DUPLICATE_THRESHOLD

    return PHashResult(
        hash_hex=new_hash,
        is_duplicate=is_dup,
        duplicate_of_hash=best_match if is_dup else None,
        hamming_distance=best_dist if is_dup else None,
    )


# ── Internal DCT helper ───────────────────────────────────────────────────────

def _dct1d(signal: np.ndarray) -> np.ndarray:
    """Naive-but-correct 1D Type-II DCT (no scipy dependency needed)."""
    N = len(signal)
    n = np.arange(N)
    k = n.reshape((N, 1))
    cos_matrix = np.cos(np.pi * k * (2 * n + 1) / (2 * N))
    return np.dot(cos_matrix, signal)


def _dct2(matrix: np.ndarray) -> np.ndarray:
    """Separable 2D DCT: apply 1D DCT on rows, then on columns."""
    rows = np.apply_along_axis(_dct1d, 1, matrix)
    return np.apply_along_axis(_dct1d, 0, rows)
