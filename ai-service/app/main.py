"""
AapdaSetu — AI damage assessment FastAPI service.

Endpoints:
  POST /api/assess-damage   — EXIF check + pHash dedup + damage grade + compensation
  POST /api/check-duplicate — pHash comparison only
"""

from __future__ import annotations

import traceback
from datetime import datetime
from typing import Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .damage_classifier import DamageClassifier, calculate_compensation
from .exif_validator import extract_and_verify
from .phash_detector import check_duplicate, compute_phash

app = FastAPI(
    title="AapdaSetu Damage Assessment AI",
    version="1.0.0",
    description="ResNet50-based building damage classifier with EXIF fraud detection",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-load model on first request
_classifier: Optional[DamageClassifier] = None

def get_classifier() -> DamageClassifier:
    global _classifier
    if _classifier is None:
        _classifier = DamageClassifier()
    return _classifier

class DuplicateCheckRequest(BaseModel):
    new_hash: str
    existing_hashes: list[str]

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    duplicate_of_hash: Optional[str]
    hamming_distance: Optional[int]

class AssessmentResponse(BaseModel):
    # EXIF
    exif_gps_lat: Optional[float]
    exif_gps_lng: Optional[float]
    exif_timestamp: Optional[str]
    camera_make: Optional[str]
    camera_model: Optional[str]
    gps_verified: bool
    timestamp_verified: bool

    # pHash
    phash: str
    is_duplicate: bool
    duplicate_of_hash: Optional[str]

    # AI classification
    damage_grade: str
    confidence_score: float
    all_scores: dict
    ai_description: str

    # Compensation
    compensation_amount: float
    property_type: str

    # Meta
    fraud_flags: list[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/assess-damage", response_model=AssessmentResponse)
async def assess_damage(
    photo: UploadFile                       = File(..., description="Property damage photo"),
    claimed_lat: float                      = Form(...),
    claimed_lng: float                      = Form(...),
    property_type: str                      = Form("RESIDENTIAL"),
    disaster_cutoff: str                    = Form(..., description="e.g. 2025-07-30T00:00:00"),
    existing_hashes_csv: str               = Form("", description="Existing pHashes, comma-separated"),
    # Optional: fetch image from URL instead of upload
    photo_url: Optional[str]               = Form(None),
):
    """EXIF verify → pHash dedup → damage classification → compensation."""
    if photo_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(photo_url)
                resp.raise_for_status()
                image_bytes = resp.content
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to fetch photo_url: {exc}")
    else:
        image_bytes = await photo.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image data provided")

    try:
        cutoff_dt = datetime.fromisoformat(disaster_cutoff)
    except ValueError:
        raise HTTPException(status_code=400, detail="disaster_cutoff must be ISO-8601 format")

    try:
        exif = extract_and_verify(image_bytes, claimed_lat, claimed_lng, cutoff_dt)
    except Exception:
        raise HTTPException(status_code=500, detail="EXIF extraction failed: " + traceback.format_exc())

    try:
        phash_hex = compute_phash(image_bytes)
    except Exception:
        raise HTTPException(status_code=500, detail="pHash computation failed")

    existing = [h.strip() for h in existing_hashes_csv.split(",") if h.strip()]
    phash_result = check_duplicate(phash_hex, existing)

    clf = get_classifier()
    try:
        classification = clf.predict(image_bytes)
    except Exception:
        raise HTTPException(status_code=500, detail="Model inference failed: " + traceback.format_exc())

    compensation = calculate_compensation(classification.damage_grade, property_type)

    fraud_flags: list[str] = []

    if phash_result.is_duplicate:
        fraud_flags.append(
            f"DUPLICATE_PHOTO: visually identical to an existing claim "
            f"(Hamming distance={phash_result.hamming_distance})"
        )
    if not exif.gps_verified:
        if exif.gps_lat is None:
            fraud_flags.append("MISSING_GPS: photo has no GPS EXIF data")
        else:
            fraud_flags.append(
                "GPS_MISMATCH: EXIF GPS coordinates do not match the claimed property location"
            )
    if not exif.timestamp_verified:
        if exif.timestamp is None:
            fraud_flags.append("MISSING_TIMESTAMP: photo has no EXIF timestamp")
        else:
            fraud_flags.append(
                f"TIMESTAMP_BEFORE_DISASTER: photo taken {exif.timestamp.isoformat()} "
                f"before disaster cutoff {cutoff_dt.isoformat()}"
            )
    if classification.confidence < 0.5:
        fraud_flags.append(
            f"LOW_CONFIDENCE: AI model confidence {classification.confidence:.1%} — "
            "manual review recommended"
        )

    return AssessmentResponse(
        exif_gps_lat=exif.gps_lat,
        exif_gps_lng=exif.gps_lng,
        exif_timestamp=exif.timestamp.isoformat() if exif.timestamp else None,
        camera_make=exif.camera_make,
        camera_model=exif.camera_model,
        gps_verified=exif.gps_verified,
        timestamp_verified=exif.timestamp_verified,
        phash=phash_result.hash_hex,
        is_duplicate=phash_result.is_duplicate,
        duplicate_of_hash=phash_result.duplicate_of_hash,
        damage_grade=classification.damage_grade,
        confidence_score=classification.confidence,
        all_scores=classification.all_scores,
        ai_description=classification.ai_description,
        compensation_amount=compensation,
        property_type=property_type.upper(),
        fraud_flags=fraud_flags,
    )

@app.post("/api/check-duplicate", response_model=DuplicateCheckResponse)
def check_dup_endpoint(body: DuplicateCheckRequest):
    """Duplicate check via pHash Hamming distance only."""
    result = check_duplicate(body.new_hash, body.existing_hashes)
    return DuplicateCheckResponse(
        is_duplicate=result.is_duplicate,
        duplicate_of_hash=result.duplicate_of_hash,
        hamming_distance=result.hamming_distance,
    )
