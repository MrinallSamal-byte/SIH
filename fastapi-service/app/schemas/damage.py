from pydantic import BaseModel, Field


class MetadataPayload(BaseModel):
    """Optional metadata sent by the Node backend for verification purposes."""

    reportedLatitude: float | None = None
    reportedLongitude: float | None = None
    exifLatitude: float | None = None
    exifLongitude: float | None = None
    imageHash: str | None = None


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


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
