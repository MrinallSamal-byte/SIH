"""
Convenience launcher — runs the FastAPI service with uvicorn.
Usage: python run.py
"""
import os
from pathlib import Path

# Load .env from the ai-service directory so PORT and DAMAGE_MODEL_PATH are picked up
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass   # python-dotenv not installed — fall back to shell env vars

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,      # set reload=False in production
    )
