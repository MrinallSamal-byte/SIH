import sys
import json

# Ensure stdout uses UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def evaluate_sos_urgency(sos_payload):
    """Deterministic triage — mirrors backend-aapdasetu/src/lib/triage.ts
    computeTriage (single source of truth):
    base 30 + type weight + one-match-per-keyword-group + 1-tap SOS boost 55
    + age/medical boosts, clamp 1-100, RED>=80 / YELLOW>=50 / GREEN.
    """
    transcript = ((sos_payload.get('transcript') or '') + ' ' + (sos_payload.get('location') or {}).get('landmark', '')).lower()
    victim_info = sos_payload.get('victim_info', {})
    incident_type = str(sos_payload.get('type') or 'other').lower()
    is_one_tap_sos = bool(sos_payload.get('is_one_tap_sos') or sos_payload.get('isOneTapSos'))

    type_weights = {
        'earthquake': 25,
        'fire': 20,
        'flood': 15,
        'medical': 15,
        'missing_person': 15,
        'accident': 12,
        'other': 5,
    }

    # 1. Base score + type weighting
    score = 30.0
    factors = []
    type_weight = type_weights.get(incident_type, 5)
    score += type_weight
    factors.append(f"TYPE_BASE:{incident_type}+{type_weight}")

    # 2. Keyword groups — one match per group (mirrors backend KEYWORD_SCORES)
    keyword_groups = [
        (['drowning', 'trapped', 'pregnant'], 30.0),
        (['bleeding', 'infant', 'cardiac', 'submerged'], 25.0),
        (['water 5ft', 'water five', 'water 6ft', 'child', 'unconscious'], 20.0),
        (['roof', 'diabetic', 'elderly'], 15.0),
    ]
    extracted_keywords = []
    for keywords, points in keyword_groups:
        matched = next((kw for kw in keywords if kw in transcript), None)
        if matched:
            score += points
            extracted_keywords.append(matched)
            factors.append(f"KEYWORD:{matched}+{points}")

    # 2b. 1-Tap SOS boost — an explicit emergency button must never triage GREEN
    if is_one_tap_sos:
        score += 55.0
        factors.append("ONE_TAP_SOS+55")

    # 3. Demographic vulnerability boosts (mirrors CHILD_MAX_AGE=12 / ELDER_MIN_AGE=60)
    age = victim_info.get('age', 30)
    try:
        age_num = float(age)
    except (TypeError, ValueError):
        age_num = 30
    if age_num <= 5:
        score += 25.0
        extracted_keywords.append(f"vulnerable_age_{victim_info.get('age')}")
        factors.append("AGE_CHILD_YOUNG+25")
    elif age_num <= 12:
        score += 20.0
        extracted_keywords.append(f"vulnerable_age_{victim_info.get('age')}")
        factors.append("AGE_CHILD+20")
    elif age_num >= 60:
        score += 20.0
        extracted_keywords.append(f"vulnerable_age_{victim_info.get('age')}")
        factors.append("AGE_ELDERLY+20")

    medical_conditions = victim_info.get('medical_conditions', [])
    if medical_conditions:
        score += 15.0
        extracted_keywords.append("pre_existing_conditions")
        factors.append("MEDICAL_CONDITIONS+15")

    medical_text = ' '.join(str(m).lower() for m in medical_conditions)
    for keywords, points, label in (
        (['pregnant', 'pregnancy'], 30.0, 'MEDICAL_PREGNANCY'),
        (['bleed', 'bleeding'], 25.0, 'MEDICAL_BLEEDING'),
        (['heart', 'cardiac'], 20.0, 'MEDICAL_CARDIAC'),
    ):
        matched = next((kw for kw in keywords if kw in medical_text), None)
        if matched:
            score += points
            factors.append(f"{label}:{matched}+{points}")

    # Cap score between 1 and 100
    final_score = min(100.0, max(1.0, score))

    # Classification Level — RED / YELLOW / GREEN (matches backend + siren check)
    if final_score >= 80.0:
        priority_label = "RED"
        urgency_level = "RED"
        recommended_action = "DISPATCH_BOAT_AND_HELICOPTER"
    elif final_score >= 50.0:
        priority_label = "YELLOW"
        urgency_level = "YELLOW"
        recommended_action = "DISPATCH_MEDICAL_AND_SHELTER"
    else:
        priority_label = "GREEN"
        urgency_level = "GREEN"
        recommended_action = "DISPATCH_RELIEF_FOOD"

    return {
        "sos_uuid": sos_payload.get("sos_uuid"),
        "priority_score": round(final_score, 1),
        "priority_label": priority_label,
        "urgency_level": urgency_level,
        "extracted_keywords": extracted_keywords,
        "factors": factors,
        "recommended_action": recommended_action
    }

if __name__ == "__main__":
    test_sos = {
        "sos_uuid": "test-uuid-1234",
        "victim_info": {
            "name": "Rajesh Sharma",
            "age": 62,
            "medical_conditions": ["Diabetic"]
        },
        "transcript": "पानी 5 फीट भर गया है, 3 लोग छत पर फंसे हैं"
    }
    result = evaluate_sos_urgency(test_sos)
    print("==========================================================================")
    print("[AI TRIAGE ENGINE] TEST RESULT:")
    print("==========================================================================")
    print(json.dumps(result, indent=2, ensure_ascii=False))
