"""
smoke_test.py — end-to-end check of the FastAPI service.

Sends one real test-set image per class to POST /api/assess-damage and
verifies the returned damage_grade matches the folder the image lives in.
Also exercises /health and /api/check-duplicate.

Requires the service running on http://localhost:8000  (python run.py)
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = "http://localhost:8000"
TEST_DIR = Path("dataset/raw")   # raw source folders (MINOR/MAJOR/DESTROYED)


def pick_one(cls: str) -> Path:
    files = sorted((TEST_DIR / cls).iterdir())
    return files[len(files) // 2]   # a middle file, deterministic


def main():
    ok = True

    # 1. health
    r = httpx.get(f"{BASE}/health", timeout=10)
    print(f"GET  /health            -> {r.status_code} {r.json()}")
    ok &= r.status_code == 200

    # 2. check-duplicate (pure pHash, no ML)
    r = httpx.post(f"{BASE}/api/check-duplicate", timeout=10, json={
        "new_hash": "abcdef1234567890",
        "existing_hashes": ["abcdef1234567890", "0000000000000000"],
    })
    body = r.json()
    print(f"POST /api/check-duplicate -> {r.status_code} {body}")
    ok &= r.status_code == 200 and body["is_duplicate"] is True

    # 3. assess-damage with one image per class (first request loads the model)
    for cls in ("DESTROYED", "MAJOR", "MINOR"):
        img = pick_one(cls)
        with open(img, "rb") as fh:
            r = httpx.post(
                f"{BASE}/api/assess-damage",
                timeout=120,
                files={"photo": (img.name, fh, "image/jpeg")},
                data={
                    "claimed_lat": "23.0225",
                    "claimed_lng": "72.5714",
                    "property_type": "RESIDENTIAL",
                    "disaster_cutoff": "2025-07-30T00:00:00",
                    "existing_hashes_csv": "",
                },
            )
        if r.status_code != 200:
            print(f"[{cls}] {img.name}: HTTP {r.status_code} {r.text[:300]}")
            ok = False
            continue
        body = r.json()
        match = "OK " if body["damage_grade"] == cls else "FAIL"
        ok &= body["damage_grade"] == cls
        print(f"[{match}] {cls:9s} <- {img.name}: "
              f"grade={body['damage_grade']} conf={body['confidence_score']:.3f} "
              f"scores={body['all_scores']} comp={body['compensation_amount']}")

    print("\nRESULT:", "ALL PASSED" if ok else "SOME CHECKS FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
