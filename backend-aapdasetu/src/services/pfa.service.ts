/**
 * Psychological First Aid (PFA) chatbot service.
 * Uses the real OpenRouter LLM via the adapter abstraction; intent detection is
 * reinforced deterministically (panic / disorientation / general distress) so the
 * guided protocols from the PRD (4-second box breathing, 5-4-3-2-1 grounding)
 * are always available even before LLM credentials are configured.
 */
import { chatStructured, ChatTurn } from '../adapters/openrouter.client.js';
import { env } from '../config/env.js';

export type PfaIntent =
  | 'panic_hyperventilation'
  | 'disorientation'
  | 'general_distress'
  | 'emergency'
  | 'greeting'
  | 'unsupported';

export interface PfaReply {
  message: string;
  intent: PfaIntent;
  escalationRequired: boolean;
  protocol?: 'box_breathing' | 'grounding_521' | 'empathetic' | 'none';
}

const SYSTEM_PROMPT = `You are "Sahayak", the Psychological First Aid and Disaster Survival companion of the AapdaSetu relief platform.
Your job is to support a person who is panicking, trapped, injured, drowning, disoriented, or distressed during a disaster.
Rules:
- Always respond in the same language the user writes in (English, Hindi, or Odia).
- Provide the best, most actionable survival, first aid, and calming guidance possible.
- If the user describes a physical emergency, drowning, fire, collapse, severe bleeding, or chest pain:
  1. Give immediate life-saving physical steps (e.g. for drowning: float on back, starfish pose, keep chin up, do not fight current).
  2. Set escalationRequired to true.
  3. Tell them that Emergency Ambulance & Disaster Rescue helpline 108 / 112 is available.
- If the user is panicking or hyperventilating, guide the 4-second box breathing protocol:
  inhale 4 seconds, hold 4 seconds, exhale 4 seconds, hold 4 seconds.
- If the user is disoriented, guide the 5-4-3-2-1 sensory grounding technique:
  name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.
- Never claim to be a doctor. Never invent false claims.
- If the user mentions self-harm or suicide: stay supportive and non-judgmental, urge them to call Tele-MANAS 14416 (24x7) or emergency 112, and NEVER provide methods or instructions for self-harm.
Respond ONLY with a JSON object of this exact shape:
{"message": "...", "intent": "<short lowercase_snake_case intent of your choice>", "escalationRequired": false}`;

const GUIDED_PROTOCOLS: Record<string, { intent: PfaIntent; protocol: 'box_breathing' | 'grounding_521' }> = {
  panic_hyperventilation: { intent: 'panic_hyperventilation', protocol: 'box_breathing' },
  disorientation: { intent: 'disorientation', protocol: 'grounding_521' },
};

// Parity with the frontend detector (frontend-AapdaSetu/src/api/ai.ts). This
// deterministic layer is the safety net whenever the LLM is unconfigured or
// degraded — it must recognize emergencies in Hindi/Bengali/Odia and common
// transliterations, not just English. Matched with includes() (not \b): word
// boundaries miss "my hand burns" / "snake bit me", and missing an emergency
// is far worse than an occasional false positive.
const ESCALATION_KEYWORDS = [
  'bleed', 'blood', 'hemorrhage', 'unconscious', 'fainted', 'trapped',
  'drown', 'sinking', 'heart attack', 'chest pain', 'stroke', 'electrocute',
  'severe burn', 'fire', 'choking', 'snake', 'snakebite', 'poison', 'collapse',
  'debris', 'fracture', 'broken bone', 'crush', 'dying', 'flood rising', 'water level',
  "can't breathe", 'cant breathe', 'can not breathe', 'burn', 'sink', 'flooded',
  'electric shock', 'मदद',
  'खून', 'बेहोश', 'फंसा', 'डूब', 'हार्ट अटैक', 'सांप', 'आग', 'बिजली',
  'রক্ত', 'অজ্ঞান', 'আটকে', 'ডুব', 'সাপ', 'আগুন',
  'ରକ୍ତ', 'ଚେତାଶୂନ୍ୟ', 'ଫସିରହିଛି', 'ନିଆଁ',
  // Trapped (hi/bn/or native + Latin transliterations)
  'फंस गया', 'फंस गई', 'फंसा हुआ', 'मलबे में', 'fas gaya', 'fas gayi', 'fase hai', 'phansa', 'malbe me',
  'ধ্বসে', 'চাপা', 'atke ache', 'dhoshe', 'chapa poreche',
  'ମଳବା ତଳେ', 'ଚାପି ପଡ଼ିଛି', 'phansila', 'chapila',
  // Drowning
  'doob', 'doob raha', 'dub gaya', 'paani me gir', 'pani me doob',
  'ডুবে যাচ্ছে', 'jole dubche', 'dublo',
  'ବୁଡ଼ିଯାଉଛି', 'budi jauchhi',
  // Bleeding / blood
  'khoon', 'khoon beh', 'khoon nikal', 'ragat', 'rokto jhore',
  'खून निकल', 'रक्तस्राव', 'রক্তক্ষরণ', 'ରକ୍ତସ୍ରାବ', 'rakta sraba',
  // Unconscious
  'behosh', 'behos', 'hos nahi', 'ogyan hoye', 'অজ্ঞান হয়ে',
  'ଚେତା ନାହିଁ', 'chetala nahi',
  // Fire
  'aag lagi', 'aag lag', 'lagi aag', 'aagun lagche', 'agan lagiche',
  'ନିଆଁ ଲାଗିଛି', 'niam lagichi',
  // Collapse / rubble
  'building gira', 'ghar gira', 'deewar giri', 'malba', 'ध्वस्त', 'भवन गिरा',
  'ভবন ধসেছে', 'দেয়াল ভেঙে', 'bhavan dhaseche', 'deyal bhenge',
  'ଗୃହ ଧ୍ୱଂସ', 'ଦେଉଳି ଭାଙ୍ଗିଲା', 'griha dhwansa', 'deuli bhangila',
  // Water level rising / flood surge
  'पानी बढ़', 'पानी घुस', 'बाढ़', 'paani badh', 'pani badh', 'paani chadh', 'baadh aayi', 'barh aaya',
  'জল বাড়ছে', 'বন্যা', 'jol barche', 'banya ashe',
  'ପାଣି ବଢ଼ୁଛି', 'ପାଣି ଭରିବା', 'ବନ୍ୟା', 'pani badhuchhi', 'banya asuchi',
  // Chest pain / cardiac distress
  'छाती में दर्द', 'सीने में दर्द', 'chaati me dard', 'seene me dard',
  'বুকে ব্যথা', 'বুক ফাটা', 'শ্বাসকষ্ট', 'buke byatha', 'buker betha', 'shash koshto',
  'ଛାତି ଯନ୍ତ୍ରଣା', 'ଛାତି ବ୍ୟଥା', 'ଶ୍ୱାସ କଷ୍ଟ', 'chhati yantanara', 'shwas kasta',
];

// Parity with the frontend self-harm detector — the mandatory Tele-MANAS
// guidance must trigger in every language a citizen might type in.
const SELF_HARM_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'killing myself', 'end my life', 'end it all',
  'want to die', 'wanna die', 'better off dead', 'no reason to live', 'harm myself',
  'hurt myself', 'self harm', 'self-harm', 'selfharm', 'cut myself',
  'आत्महत्या', 'आत्मघाती', 'जान देना चाहता', 'जान देना चाहती', 'मरना चाहता', 'मरना चाहती',
  'जीना नहीं चाहता', 'जीना नहीं चाहती', 'खुदकुशी',
  'আত্মহত্যা', 'মরতে চাই', 'বাঁচতে চাই না',
  'ଆତ୍ମହତ୍ୟା', 'ମରିବାକୁ ଚାହୁଁଛି',
  'atmhatya', 'atmahatya', 'marna chahta', 'marna chahti', 'jeena nahi',
  'morto chai', 'banchte chai na',
];

const CRISIS_GUIDANCE =
  'If you are having thoughts of harming yourself, please call Tele-MANAS 14416 (24x7, free) or emergency 112 right now — you are not alone.';

function detectEmergency(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k));
}

function detectSelfHarm(text: string): boolean {
  const lower = text.toLowerCase();
  return SELF_HARM_KEYWORDS.some((k) => lower.includes(k));
}

export async function getPfaReply(
  userMessage: string,
  history: ChatTurn[] = [],
): Promise<PfaReply> {
  const turns: ChatTurn[] = [...history.slice(-8), { role: 'user', content: userMessage }];

  const emergency = detectEmergency(userMessage);
  const selfHarm = detectSelfHarm(userMessage);
  const guided = matchGuidedProtocol(userMessage);

  try {
    const result = await chatStructured(SYSTEM_PROMPT, turns);
    const intent = normalizeIntent(result.intent);
    const protocol = GUIDED_PROTOCOLS[intent]?.protocol ?? 'none';
    // ponytail: LLM replies to self-harm must always carry the helpline even if the model omitted it
    let message = result.message;
    if (selfHarm && !message.includes('14416')) {
      message = `${message}\n\n${CRISIS_GUIDANCE}`;
    }
    return {
      message,
      intent,
      escalationRequired: result.escalationRequired || emergency || selfHarm,
      protocol,
    };
  } catch {
    // Degraded path: still provide the deterministic PRD protocols without the LLM.
    if (guided) {
      return {
        ...guided,
        message: selfHarm
          ? `${buildGuidedMessage(guided.protocol, userMessage)}\n\n${CRISIS_GUIDANCE}`
          : buildGuidedMessage(guided.protocol, userMessage),
        escalationRequired: emergency || selfHarm,
      };
    }
    return {
      message:
        'I am here with you. Please take a slow breath in for 4 seconds, hold for 4, breathe out for 4, hold for 4. If you are in danger, press the SOS button or call 112. If you are thinking of harming yourself, call Tele-MANAS at 14416 — you are not alone.',
      intent: 'general_distress',
      escalationRequired: emergency || selfHarm,
      protocol: 'box_breathing',
    };
  }
}

// ponytail: mapping-table ceiling — adapter open-vocab intents outside this table collapse to general_distress; revisit if the adapter taxonomy grows
const ADAPTER_INTENT_ROUTES: Record<string, PfaIntent> = {
  panic_hyperventilation: 'panic_hyperventilation',
  trapped_or_stranded: 'panic_hyperventilation',
  disorientation: 'disorientation',
  general_distress: 'general_distress',
  flood: 'general_distress',
  displaced: 'general_distress',
  disaster_related_distress: 'general_distress',
  emergency: 'emergency',
  emergency_safety: 'emergency',
  greeting: 'greeting',
  unsupported: 'unsupported',
  out_of_scope: 'unsupported',
};

function normalizeIntent(raw: string): PfaIntent {
  return ADAPTER_INTENT_ROUTES[raw.trim().toLowerCase()] ?? 'general_distress';
}

function matchGuidedProtocol(text: string): { intent: PfaIntent; protocol: 'box_breathing' | 'grounding_521' } | null {
  const lower = text.toLowerCase();
  const panic = ['panic', 'hyperventilat', 'cant breathe', 'can\'t breathe', 'can not breathe', 'anxious', 'shaking', 'breathing fast', 'heart racing'];
  const disorientation = ['confused', 'disoriented', 'dizzy', 'lost', 'where am i', 'don\'t know where', 'scared'];
  if (panic.some((k) => lower.includes(k))) return GUIDED_PROTOCOLS.panic_hyperventilation;
  if (disorientation.some((k) => lower.includes(k))) return GUIDED_PROTOCOLS.disorientation;
  return null;
}

function buildGuidedMessage(protocol: 'box_breathing' | 'grounding_521', _text: string): string {
  if (protocol === 'box_breathing') {
    return 'Let\'s breathe together. Inhale slowly for 4 seconds... hold for 4... exhale for 4... hold for 4. Repeat this box breathing cycle with me, at your own pace. You are safe.';
  }
  return 'Let\'s ground ourselves together. Name 5 things you can see. Now 4 things you can touch. 3 things you can hear. 2 things you can smell. 1 thing you can taste. Stay with me — you are safe.';
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(env.openRouterApiKey);
}