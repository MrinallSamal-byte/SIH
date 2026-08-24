import hashlib
import sys

# ponytail: DEMO STUBS — damage grading is filename-substring matching and the pHash is simulated;
# before wiring to real compensation payouts, replace with content-hash dedupe + a real vision model.
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def process_damage_photo(photo_filename, metadata, user_claimed_gps):
    """
    Feature 9: Crowdsourced AI Damage Assessment (Anti-Fraud Engine)
    Verifies EXIF metadata, checks pHash duplicates, and grades building damage.
    """
    # 1. EXIF Metadata Location & Timestamp Verification
    exif_gps = metadata.get("exif_gps", {})
    
    # Calculate GPS delta
    lat_diff = abs(exif_gps.get("lat", 0) - user_claimed_gps.get("lat", 0))
    lng_diff = abs(exif_gps.get("lng", 0) - user_claimed_gps.get("lng", 0))
    
    location_verified = (lat_diff < 0.01 and lng_diff < 0.01)
    
    # 2. Perceptual Hash (pHash) Anti-Fraud Duplicate Detection
    photo_hash = hashlib.sha256(photo_filename.encode('utf-8')).hexdigest()[:16]
    is_duplicate = (photo_hash == "a1b2c3d4e5f67890")  # Simulated existing database hash
    
    # 3. AI Computer Vision Damage Classification (ResNet50 Simulation)
    if "collapsed" in photo_filename.lower() or "destroyed" in photo_filename.lower():
        damage_grade = "FULLY_DESTROYED"
        eligible_compensation_inr = 400000  # Rs 4 Lakh (SDRF norms)
    elif "crack" in photo_filename.lower() or "flood" in photo_filename.lower():
        damage_grade = "MAJOR_STRUCTURAL_DAMAGE"
        eligible_compensation_inr = 130000  # Rs 1.3 Lakh
    else:
        damage_grade = "MINOR_DAMAGE"
        eligible_compensation_inr = 25000   # Rs 25k
        
    status = "VERIFIED_VALID" if (location_verified and not is_duplicate) else "FLAGGED_FRAUD_RISK"
    
    return {
        "photo_filename": photo_filename,
        "location_verified": location_verified,
        "is_duplicate_phash": is_duplicate,
        "anti_fraud_status": status,
        "ai_damage_grade": damage_grade,
        "eligible_compensation_inr": eligible_compensation_inr
    }

if __name__ == "__main__":
    result = process_damage_photo(
        "house_flood_destroyed_1.jpg",
        {"exif_gps": {"lat": 22.5726, "lng": 88.3639}, "exif_timestamp": "2026-07-27T10:00:00Z"},
        {"lat": 22.5725, "lng": 88.3638}
    )
    print("==========================================================================")
    print("[AI DAMAGE ASSESSMENT] TEST RESULT:")
    print("==========================================================================")
    import json
    print(json.dumps(result, indent=2))
