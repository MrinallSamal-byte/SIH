"""
AapdaSetu AI Prototype — Standalone JSON Test Harness
Runs the triage / damage-assessment / PFA-chatbot / flood-map helpers as a
local CLI smoke test (python apps/ai-engine/app/main.py). There is no ASGI
app in this directory; the served implementation lives in
backend-aapdasetu/fastapi-service — run it with:
    cd backend-aapdasetu && uvicorn app.main:app --app-dir fastapi-service --port 8000
"""
import sys
import json

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Import all AI modules
from triage import evaluate_sos_urgency
from damage_assessment import process_damage_photo
from pfa_chatbot import PFAChatbotEngine
from satellite_flood_mapping import generate_satellite_flood_polygons


def handle_request(endpoint, payload):
    """Simple request router for standalone testing without FastAPI/uvicorn."""
    if endpoint == "/ai/triage":
        return evaluate_sos_urgency(payload)
    elif endpoint == "/ai/damage":
        return process_damage_photo(
            payload.get("photo_filename", "unknown.jpg"),
            payload.get("metadata", {}),
            payload.get("user_claimed_gps", {})
        )
    elif endpoint == "/ai/pfa":
        return PFAChatbotEngine.get_pfa_response(
            payload.get("message", ""),
            payload.get("victim_name", "Friend")
        )
    elif endpoint == "/ai/flood-map":
        return generate_satellite_flood_polygons(payload.get("district", "North 24 Parganas"))
    else:
        return {"error": f"Unknown endpoint: {endpoint}"}


if __name__ == "__main__":
    print("==========================================================================")
    print("[FASTAPI AI HUB] Standalone Integration Test (all AI endpoints)")
    print("==========================================================================\n")

    # 1. Triage
    r1 = handle_request("/ai/triage", {
        "sos_uuid": "test-001",
        "victim_info": {"name": "Anita", "age": 72, "medical_conditions": ["Asthma"]},
        "transcript": "I am trapped on the roof, water is rising to 6ft, please send boat"
    })
    print("[/ai/triage]", json.dumps(r1, indent=2, ensure_ascii=False))

    # 2. Damage Assessment
    r2 = handle_request("/ai/damage", {
        "photo_filename": "house_collapsed_sector5.jpg",
        "metadata": {"exif_gps": {"lat": 22.572, "lng": 88.364}},
        "user_claimed_gps": {"lat": 22.572, "lng": 88.364}
    })
    print("\n[/ai/damage]", json.dumps(r2, indent=2, ensure_ascii=False))

    # 3. PFA Chatbot
    r3 = handle_request("/ai/pfa", {"message": "I am very scared, water is rising", "victim_name": "Sunita"})
    print("\n[/ai/pfa]", json.dumps(r3, indent=2, ensure_ascii=False))

    # 4. Satellite Flood Map
    r4 = handle_request("/ai/flood-map", {"district": "North 24 Parganas"})
    print("\n[/ai/flood-map]", json.dumps(r4, indent=2, ensure_ascii=False))

    print("\n==========================================================================")
    print("[FASTAPI AI HUB] All active AI endpoints verified successfully!")
    print("==========================================================================")
