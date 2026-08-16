from fastapi import APIRouter, HTTPException, status

from app.schemas.damage import DamagePredictRequest, DamagePrediction
from app.services.damage_service import service

router = APIRouter(prefix="/damage-assessment", tags=["damage-assessment"])


@router.post(
    "/predict",
    response_model=DamagePrediction,
    status_code=status.HTTP_200_OK,
    summary="Predict property damage classification from a photo",
)
async def predict_damage(request: DamagePredictRequest) -> DamagePrediction:
    """Interface for the existing damage-assessment ML model.

    Request:  base64 image + optional metadata.
    Response: {"classification": "MINOR_DAMAGE|MAJOR_STRUCTURAL_DAMAGE|FULLY_DESTROYED",
               "confidence": 0.0}
    """
    try:
        return service.predict(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
