from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="AapdaSetu AI Engine",
    description="ML-service interface for the existing damage-assessment model (inference provided separately).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "aapdasetu-ai-engine", "timestamp": None}


@app.get("/", tags=["system"])
def root() -> dict:
    return {"service": "AapdaSetu AI Engine", "docs": "/docs", "version": "1.0.0"}
