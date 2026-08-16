"""
Damage assessment inference service — PLACEHOLDER BOUNDARY.

The actual damage-classification ML model is ALREADY BUILT and will be provided
separately. This module is the integration seam where the existing model will be
loaded and invoked. Do NOT train a new model here.

When the real model is available:
  1. Drop the weights file at `models/damage_model.pt` (path from `DAMAGE_ML_MODEL_PATH`).
  2. Replace `_infer` below with a call to the real model (decode image, preprocess,
     forward pass, map logits to MINOR_DAMAGE / MAJOR_STRUCTURAL_DAMAGE / FULLY_DESTROYED).
  3. Return the agreed `{"classification": "...", "confidence": 0.0}` contract.

The Node backend calls POST /api/v1/damage-assessment/predict and expects exactly
the `DamagePrediction` schema.
"""

from __future__ import annotations

import base64
import io

from app.core.config import settings
from app.schemas.damage import DamagePredictRequest, DamagePrediction


class DamageAssessmentService:
    """Isolated service boundary for the existing damage model."""

    def __init__(self) -> None:
        self.model_loaded = False
        self._model = None
        self._load_model_if_present()

    def _load_model_if_present(self) -> None:
        """Load the real model weights if they have been dropped into the models dir."""
        import os

        path = settings.model_path
        if os.path.exists(path):
            # Real inference wiring goes here once the model artifacts are provided.
            self.model_loaded = True
            self._model = path

    def predict(self, request: DamagePredictRequest) -> DamagePrediction:
        """Run inference. Falls back to a deterministic placeholder result only as
        a service-level default — the real model replaces `_infer`."""
        prediction = self._infer(request)
        return DamagePrediction(**prediction)

    def _infer(self, request: DamagePredictRequest) -> dict:
        # ------------------------------------------------------------------
        # PLACEHOLDER: replace with real model inference when provided.
        # Until then, do not fabricate ML. Return the lowest-confidence
        # classification so downstream compensation math is exercised safely.
        # ------------------------------------------------------------------
        image_bytes = self._decode_image(request.imageBase64)
        if image_bytes is None:
            raise ValueError("Unable to decode image payload")

        classification = "MINOR_DAMAGE"
        confidence = settings.default_confidence
        return {"classification": classification, "confidence": confidence}

    @staticmethod
    def _decode_image(base64_str: str) -> bytes | None:
        try:
            cleaned = base64_str.split(",", 1)[-1]
            return base64.b64decode(cleaned, validate=True)
        except Exception:
            return None

    def health(self) -> bool:
        return True


service = DamageAssessmentService()