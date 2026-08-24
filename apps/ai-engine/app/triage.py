import sys
import json

# Ensure stdout uses UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def evaluate_sos_urgency(sos_payload):
    transcript = ((sos_payload.get('transcript') or '') + ' ' + (sos_payload.get('location') or {}).get('landmark', '')).lower()
    victim_info = sos_payload.get('victim_info', {})
    
    # 1. Base Score & Keyword Weighting
    score = 30.0
    extracted_keywords = []
    
    critical_keywords = {
        'drowning': 30.0,
        'trapped': 25.0,
        'submerged': 25.0,
        'roof': 20.0,
        'water 5ft': 25.0,
        'water 6ft': 30.0,
        'bleeding': 25.0,
        'diabetic': 15.0,
        'heart': 20.0,
        'pregnant': 25.0,
        'infant': 20.0
    }
    
    for kw, weight in critical_keywords.items():
        if kw in transcript:
            score += weight
            extracted_keywords.append(kw)
            
    # 2. Demographic Vulnerability Boost
    age = victim_info.get('age', 30)
    if age >= 60 or age <= 5:
        score += 20.0
        extracted_keywords.append(f"vulnerable_age_{age}")
        
    medical_conditions = victim_info.get('medical_conditions', [])
    if medical_conditions:
        score += 15.0
        extracted_keywords.append("pre_existing_conditions")
        
    # Cap score between 1 and 100
    final_score = min(100.0, max(1.0, score))
    
    # Classification Level
    if final_score >= 80.0:
        urgency_level = "CRITICAL_RED"
        recommended_action = "DISPATCH_BOAT_AND_HELICOPTER"
    elif final_score >= 50.0:
        urgency_level = "HIGH_YELLOW"
        recommended_action = "DISPATCH_MEDICAL_AND_SHELTER"
    else:
        urgency_level = "NORMAL_GREEN"
        recommended_action = "DISPATCH_RELIEF_FOOD"
        
    return {
        "sos_uuid": sos_payload.get("sos_uuid"),
        "priority_score": round(final_score, 1),
        "urgency_level": urgency_level,
        "extracted_keywords": extracted_keywords,
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
