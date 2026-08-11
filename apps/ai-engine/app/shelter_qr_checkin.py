"""
Feature 7: Dynamic QR Code Shelter Check-In System
Generates family QR codes and processes shelter check-in/check-out events.
"""
import sys
import json
import hashlib
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


class ShelterQRService:
    """Generates family QR codes and manages shelter digital registry."""
    
    shelters = {
        "SHELTER_SOL01": {"name": "Salt Lake Central Shelter", "capacity": 500, "current_occupancy": 342, "checked_in": []},
        "SHELTER_SOL02": {"name": "New Town Community Stadium", "capacity": 1200, "current_occupancy": 890, "checked_in": []},
    }
    
    @staticmethod
    def generate_family_qr_payload(family_head_name, aadhaar_last4, member_count, medical_flags=None):
        """Generates a deterministic QR code payload for a family unit."""
        raw = f"{family_head_name}:{aadhaar_last4}:{member_count}:{int(time.time())}"
        qr_hash = hashlib.sha256(raw.encode()).hexdigest()[:12].upper()
        
        payload = {
            "qr_code_id": f"AAPDA_QR_{qr_hash}",
            "family_head": family_head_name,
            "aadhaar_last4": aadhaar_last4,
            "member_count": member_count,
            "medical_flags": medical_flags or [],
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        return payload
    
    @classmethod
    def check_in_family(cls, qr_payload, shelter_id):
        """Processes a family QR scan at a shelter entrance."""
        shelter = cls.shelters.get(shelter_id)
        if not shelter:
            return {"error": f"Shelter {shelter_id} not found"}
        
        remaining = shelter["capacity"] - shelter["current_occupancy"]
        if qr_payload["member_count"] > remaining:
            return {
                "status": "SHELTER_FULL",
                "message": f"{shelter['name']} cannot accommodate {qr_payload['member_count']} members (only {remaining} spots left)",
                "redirect_shelter": "SHELTER_SOL02",
            }
        
        # Check for duplicate scan
        for entry in shelter["checked_in"]:
            if entry["qr_code_id"] == qr_payload["qr_code_id"]:
                return {"status": "ALREADY_CHECKED_IN", "qr_code_id": qr_payload["qr_code_id"]}
        
        shelter["current_occupancy"] += qr_payload["member_count"]
        shelter["checked_in"].append(qr_payload)
        
        return {
            "status": "CHECK_IN_SUCCESS",
            "shelter_name": shelter["name"],
            "shelter_id": shelter_id,
            "family_head": qr_payload["family_head"],
            "members_added": qr_payload["member_count"],
            "new_occupancy": shelter["current_occupancy"],
            "capacity": shelter["capacity"],
            "occupancy_percent": round(shelter["current_occupancy"] / shelter["capacity"] * 100, 1),
        }
    
    @classmethod
    def get_shelter_status(cls):
        """Returns live occupancy status for all shelters."""
        return {
            sid: {
                "name": s["name"],
                "capacity": s["capacity"],
                "current_occupancy": s["current_occupancy"],
                "occupancy_percent": round(s["current_occupancy"] / s["capacity"] * 100, 1),
                "families_checked_in": len(s["checked_in"]),
            }
            for sid, s in cls.shelters.items()
        }


if __name__ == "__main__":
    # 1. Generate family QR
    qr = ShelterQRService.generate_family_qr_payload(
        family_head_name="Rajesh Sharma",
        aadhaar_last4="9012",
        member_count=4,
        medical_flags=["Diabetic", "Infant under 2"]
    )
    print("==========================================================================")
    print("[QR SHELTER CHECK-IN] Step 1 - Generated Family QR Payload:")
    print("==========================================================================")
    print(json.dumps(qr, indent=2, ensure_ascii=False))
    
    # 2. Scan QR at shelter
    result = ShelterQRService.check_in_family(qr, "SHELTER_SOL01")
    print("\n[QR SHELTER CHECK-IN] Step 2 - Scanned at Shelter SOL01:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 3. Duplicate scan
    dup = ShelterQRService.check_in_family(qr, "SHELTER_SOL01")
    print("\n[QR SHELTER CHECK-IN] Step 3 - Duplicate scan attempt:")
    print(json.dumps(dup, indent=2, ensure_ascii=False))
    
    # 4. Shelter status
    status = ShelterQRService.get_shelter_status()
    print("\n[QR SHELTER CHECK-IN] Step 4 - Live Shelter Occupancy:")
    print(json.dumps(status, indent=2, ensure_ascii=False))
