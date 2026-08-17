from pydantic import BaseModel, Field


class MetadataPayload(BaseModel):
    """Optional metadata sent by the Node backend for verification purposes."""

    reportedLatitude: float | None = None
    reportedLongitude: float | None = None
    exifLatitude: float | None = None
    exifLongitude: float | None = None
    imageHash: str | None = None
    infrastructureType: str | None = None


class DamagePredictRequest(BaseModel):
    """Request contract for the existing damage-assessment model.

    The model inference receives the raw image (base64) plus optional metadata.
    Image validation, EXIF extraction and pHash dedup happen in the Node backend;
    this service only performs model inference.
    """

    imageBase64: str = Field(..., min_length=24, description="Base64-encoded damage photo")
    mimeType: str | None = None
    metadata: MetadataPayload | None = None


class DamagePrediction(BaseModel):
    classification: str = Field(
        ...,
        description="MINOR_DAMAGE | MAJOR_STRUCTURAL_DAMAGE | FULLY_DESTROYED",
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    damageScore: float = Field(default=30.0, ge=0.0, le=100.0, description="Quantitative damage score from 0-100 pts")
    huggingFaceModel: str = Field(
        default="Divyanshu-Kumar19/aapdasetu-damage-assessment",
        description="HuggingFace model ID used for inference",
    )


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
