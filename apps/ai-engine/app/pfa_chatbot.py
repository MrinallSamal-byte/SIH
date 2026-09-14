import sys
import json
import os
import re
import urllib.request
import urllib.error

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")  # ponytail: committed key scrubbed; set via env only
FREE_MODELS = [
    "nvidia/nemotron-3.5-lightning:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openai/gpt-oss-20b:free",
]

class PFAChatbotEngine:
    """
    AapdaMitra AI: 24/7 Intelligent Disaster Survival, Triage & Psychological First Aid Engine.
    Powered by NVIDIA Nemotron 3.5 Free via OpenRouter with offline safety fallback.
    """
    @staticmethod
    def get_pfa_response(user_message, victim_name="Friend"):
        # Strict Guardrail: Check for off-topic non-emergency queries (coding, palindrome, math, etc.)
        unrelated_pattern = r"\b(palindrom[a-z]*|reverse\s*(a\s*)?(string|word|number|array|list)|write\s*code|give\s*code|py\s*code|python|java\s*code|javascript|c\+\+|cpp|csharp|golang|rust|programming|algorithm|leetcode|hackerrank|homework|assignment|solve\s*equation|essay|poem|poetry|joke|song|movie|game|recipe|how\s*to\s*cook)\b"
        disaster_pattern = r"\b(flood|water|bleed|blood|cut|drown|sinking|cardiac|heart|snake|burn|fracture|chok|help|rescue|shelter|track|sos|report|aapdasetu|emergency|danger|pain|hurt|wound|panic|fire|earthquake|collapse|trapped|missing|damage|helpline|112|108|डर|घबराहट|बाढ़|खून|सांप|आग)\b"
        if re.search(unrelated_pattern, user_message, re.I) and not re.search(disaster_pattern, user_message, re.I):
            return {
                "chatbot_reply": "I am AapdaMitra AI, dedicated exclusively to disaster emergencies, medical first aid, crisis safety, and AapdaSetu platform assistance. I cannot answer programming, academic, or unrelated general questions. Please let me know what emergency or safety assistance you need.",
                "exercise_type": "DISASTER_TRIAGE_AND_SURVIVAL",
                "safety_checklist": ["Prioritize life safety", "Keep battery saved", "National Emergency: 112 | Ambulance: 108"]
            }

        # Try OpenRouter LLM first if API key is configured; fallback to local rules if unset or unavailable
        if OPENROUTER_API_KEY:
            prompt_system = (
                "You are AapdaMitra AI (आपदामित्र), an elite, compassionate, and highly intelligent 24/7 Disaster Survival, "
                "Emergency Medical Triage, and Psychological First Aid AI Companion for the AapdaSetu platform. "
                "STRICT GUARDRAILS: You must ONLY answer questions related to active disasters, extreme weather, physical safety, "
                "medical first aid, psychological crisis grounding, and AapdaSetu platform relief. NEVER answer coding, programming, "
                "palindrome, homework, math, or general trivia questions. If asked an off-topic question, politely decline. "
                "Prioritize life safety with 3-4 bold, concise steps first. Provide medical triage (bleeding, CPR, burns, choking, snakebites) "
                "and psychological grounding (4-4-4 box breathing). Highlight emergency numbers 112 and 108. Respond in user's language."
            )

            for model in FREE_MODELS:
                try:
                    payload = json.dumps({
                        "model": model,
                        "messages": [
                            {"role": "system", "content": prompt_system},
                            {"role": "user", "content": f"Victim name is {victim_name}. Situation: {user_message}"}
                        ],
                        "temperature": 0.4,
                        "max_tokens": 1024
                    }).encode("utf-8")

                    req = urllib.request.Request(
                        "https://openrouter.ai/api/v1/chat/completions",
                        data=payload,
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://aapdasetu.in",
                            "X-Title": "AapdaSetu AI Disaster Engine"
                        },
                        method="POST"
                    )

                    with urllib.request.urlopen(req, timeout=12) as response:
                        if response.status == 200:
                            data = json.loads(response.read().decode("utf-8"))
                            raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                            clean_content = re.sub(r"<think>[\s\S]*?</think>", "", raw_content).strip()
                            if clean_content:
                                msg_lower = user_message.lower() + " " + clean_content.lower()
                                exercise = "4-4-4_BOX_BREATHING" if any(w in msg_lower for w in ["panic", "scared", "fear", "breathe", "डर", "घबराहट"]) else None
                                return {
                                    "chatbot_reply": clean_content,
                                    "exercise_type": exercise or "DISASTER_TRIAGE_AND_SURVIVAL",
                                    "safety_checklist": ["Prioritize life safety", "Keep battery saved", "National Emergency: 112 | Ambulance: 108"]
                                }
                except Exception as e:
                    continue

        # Local Safety Fallback
        msg = user_message.lower()
        if "panic" in msg or "scared" in msg or "डर" in msg or "घबराहट" in msg:
            reply = (
                f"I hear you, {victim_name}. Please take a slow, deep breath in... hold for 4 seconds... and exhale slowly. "
                "You are not alone. Our rescue teams have received your SOS and are actively navigating towards your area. "
                "Let's try a 4-4-4 box breathing and 5-4-3-2-1 grounding exercise together: Name 5 things you can see around you right now."
            )
            exercise_type = "BREATHING_AND_GROUNDING"
        elif "water" in msg or "flood" in msg or "roof" in msg or "पानी" in msg or "बाढ़" in msg:
            reply = (
                f"🛑 **IMMEDIATE ACTION FOR FLOOD SAFETY ({victim_name}):**\n"
                "1. Move immediately to the highest sturdy level or roof.\n"
                "2. **NEVER touch electricity or sockets** if floors are wet or submerged.\n"
                "3. Do not walk or drive through moving water—just 6 inches can knock down an adult.\n"
                "4. Signal rescue teams with a flashlight, whistle, or bright cloth.\n"
                "Emergency Helpline: Dial **112** (National Emergency) or **108** (Ambulance)."
            )
            exercise_type = "SURVIVAL_SAFETY_GUIDANCE"
        elif "bleed" in msg or "blood" in msg or "wound" in msg or "खून" in msg or "चोट" in msg:
            reply = (
                f"🚨 **IMMEDIATE FIRST AID FOR BLEEDING ({victim_name}):**\n"
                "1. Apply direct, firm, continuous pressure with a clean cloth or bandage.\n"
                "2. Elevate the injured limb above heart level if no fracture is suspected.\n"
                "3. Do **NOT** remove embedded objects—bandage around them.\n"
                "4. Keep the victim warm and lying down to prevent shock.\n"
                "Call Medical Ambulance **108** immediately."
            )
            exercise_type = "MEDICAL_FIRST_AID"
        else:
            reply = (
                f"Namaste {victim_name}, I am AapdaMitra AI, your 24/7 disaster survival and emergency triage companion. "
                "I am here to guide you with survival tactics, emergency first aid, and rescue escalation (112 / 108). "
                "How are you and your family right now? Is anyone trapped or injured?"
            )
            exercise_type = "EMPATHETIC_LISTENING"

        return {
            "chatbot_reply": reply,
            "exercise_type": exercise_type,
            "safety_checklist": ["Stay in safe high area", "Save mobile battery", "Call 112 / 108 for emergency rescue"]
        }

if __name__ == "__main__":
    result = PFAChatbotEngine.get_pfa_response("Water is entering my house and I feel panicked", "Rahul")
    print("==========================================================================")
    print("[AAPDAMITRA AI CHATBOT] RESPONSE:")
    print("==========================================================================")
    print(json.dumps(result, indent=2, ensure_ascii=False))
