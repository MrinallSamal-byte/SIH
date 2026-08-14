"""Pytest suite for the AapdaSetu AI engine (damage assessment interface)."""

import asyncio
import base64

import httpx

from app.main import app


def _run(coro):
    return asyncio.run(coro)


async def _request(method: str, path: str, json=None):
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        return await client.request(method, path, json=json)


def test_health():
    resp = _run(_request("GET", "/health"))
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_predict_contract():
    payload = {"imageBase64": base64.b64encode(b"a" * 64).decode(), "mimeType": "image/jpeg"}
    resp = _run(_request("POST", "/api/v1/damage-assessment/predict", json=payload))
    assert resp.status_code == 200
    body = resp.json()
    assert body["classification"] in {
        "MINOR_DAMAGE",
        "MAJOR_STRUCTURAL_DAMAGE",
        "FULLY_DESTROYED",
    }
    assert isinstance(body["confidence"], float)
    assert 0.0 <= body["confidence"] <= 1.0


def test_predict_rejects_short_payload():
    resp = _run(
        _request("POST", "/api/v1/damage-assessment/predict", json={"imageBase64": "short"})
    )
    assert resp.status_code == 422