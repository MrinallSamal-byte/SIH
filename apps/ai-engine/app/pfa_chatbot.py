import sys
import json

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

class PFAChatbotEngine:
    """
    Feature 11: AI-Powered Psychological First Aid (PFA) Chatbot
    Provides grounding conversations, breathing exercises, and panic reduction to trapped victims.
    """
    @staticmethod
    def get_pfa_response(user_message, victim_name="Friend"):
        msg = user_message.lower()
        
        if "panic" in msg or "scared" in msg or "डर" in msg or "घबराहट" in msg:
            reply = (
                f"I hear you, {victim_name}. Please take a slow, deep breath in... hold for 4 seconds... and exhale slowly. "
                "You are not alone. Our rescue teams have received your SOS and are actively navigating towards your area. "
                "Let's try a 5-4-3-2-1 grounding exercise together: Name 5 things you can see around you right now."
            )
            exercise_type = "BREATHING_AND_GROUNDING"
        elif "water" in msg or "roof" in msg or "पानी" in msg:
            reply = (
                f"Stay on the roof or highest sturdy point, {victim_name}. Do not touch electrical wires or submerged sockets. "
                "Keep your phone battery saved by closing background apps. Help is on the way."
            )
            exercise_type = "SURVIVAL_SAFETY_GUIDANCE"
        else:
            reply = (
                f"Hello {victim_name}, I am your AapdaSetu emergency companion. I am here with you while rescue is en route. "
                "How are you feeling right now? Is anyone injured?"
            )
            exercise_type = "EMPATHETIC_LISTENING"
            
        return {
            "chatbot_reply": reply,
            "exercise_type": exercise_type,
            "safety_checklist": ["Stay dry", "Save battery", "Keep whistle or flashlight ready"]
        }

if __name__ == "__main__":
    result = PFAChatbotEngine.get_pfa_response("मुझे बहुत डर लग रहा है, पानी बढ़ रहा है", "Rajesh")
    print("==========================================================================")
    print("[AI PFA CHATBOT] RESPONSE:")
    print("==========================================================================")
    print(json.dumps(result, indent=2, ensure_ascii=False))
