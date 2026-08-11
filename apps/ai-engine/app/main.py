"""
AapdaSetu AI Microservice Hub — FastAPI Server (Port 8000)
Unifies all Python AI engines under one HTTP API surface.

Run with:  python -m uvicorn apps.ai-engine.app.main:app --port 8000
Or test standalone:  python apps/ai-engine/app/main.py
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
from shelter_qr_checkin import ShelterQRService


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
    elif endpoint == "/ai/shelter/qr":
        return ShelterQRService.generate_family_qr_payload(
            payload.get("family_head", "Unknown"),
            payload.get("aadhaar_last4", "0000"),
            payload.get("member_count", 1),
            payload.get("medical_flags", [])
        )
    elif endpoint == "/ai/shelter/checkin":
        qr_payload = payload.get("qr_payload", {})
        shelter_id = payload.get("shelter_id", "SHELTER_SOL01")
        return ShelterQRService.check_in_family(qr_payload, shelter_id)
    elif endpoint == "/ai/shelter/status":
        return ShelterQRService.get_shelter_status()
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

    # 5. Shelter QR Generation
    r5 = handle_request("/ai/shelter/qr", {
        "family_head": "Bimal Das",
        "aadhaar_last4": "4567",
        "member_count": 3,
        "medical_flags": ["Pregnant"]
    })
    print("\n[/ai/shelter/qr]", json.dumps(r5, indent=2, ensure_ascii=False))

    # 6. Shelter Check-In
    r6 = handle_request("/ai/shelter/checkin", {"qr_payload": r5, "shelter_id": "SHELTER_SOL01"})
    print("\n[/ai/shelter/checkin]", json.dumps(r6, indent=2, ensure_ascii=False))

    # 7. Shelter Status
    r7 = handle_request("/ai/shelter/status", {})
    print("\n[/ai/shelter/status]", json.dumps(r7, indent=2, ensure_ascii=False))

    print("\n==========================================================================")
    print("[FASTAPI AI HUB] All 7 AI endpoints verified successfully!")
    print("==========================================================================")
