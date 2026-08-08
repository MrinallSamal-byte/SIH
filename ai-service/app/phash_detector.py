"""64-bit DCT perceptual hash for duplicate-photo detection."""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Optional

import numpy as np
from PIL import Image

DUPLICATE_THRESHOLD = 10
HASH_SIZE          = 8
HIGH_FREQ_FACTOR   = 4

@dataclass
class PHashResult:
    hash_hex: str
    is_duplicate: bool
    duplicate_of_hash: Optional[str]
    hamming_distance: Optional[int]

def compute_phash(image_bytes: bytes) -> str:
    """Compute the 64-bit pHash; returns a 16-char hex string."""
    img = Image.open(io.BytesIO(image_bytes)).convert("L")

    img_size = HASH_SIZE * HIGH_FREQ_FACTOR
    img = img.resize((img_size, img_size), Image.LANCZOS)

    pixels = np.array(img, dtype=np.float32)

    dct = _dct2(pixels)

    # keep low-frequency block
    dct_low = dct[:HASH_SIZE, :HASH_SIZE]

    # compare against mean, excluding DC term
    mean_val = (dct_low.sum() - dct_low[0, 0]) / (HASH_SIZE * HASH_SIZE - 1)
    bits = (dct_low > mean_val).flatten()

    hash_int = int("".join("1" if b else "0" for b in bits), 2)
    return format(hash_int, "016x")

def hamming_distance(hash_a: str, hash_b: str) -> int:
    """Bit difference count between two hex hashes."""
    a = int(hash_a, 16)
    b = int(hash_b, 16)
    xor = a ^ b
    return bin(xor).count("1")

def check_duplicate(new_hash: str, existing_hashes: list[str]) -> PHashResult:
    """Flag as duplicate if any stored hash is within DUPLICATE_THRESHOLD."""
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

def _dct1d(signal: np.ndarray) -> np.ndarray:
    """1D Type-II DCT without scipy."""
    N = len(signal)
    n = np.arange(N)
    k = n.reshape((N, 1))
    cos_matrix = np.cos(np.pi * k * (2 * n + 1) / (2 * N))
    return np.dot(cos_matrix, signal)

def _dct2(matrix: np.ndarray) -> np.ndarray:
    """2D DCT via 1D DCT on rows, then columns."""
    rows = np.apply_along_axis(_dct1d, 1, matrix)
    return np.apply_along_axis(_dct1d, 0, rows)
