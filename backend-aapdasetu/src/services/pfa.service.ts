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
Respond ONLY with a JSON object of this exact shape:
{"message": "...", "intent": "panic_hyperventilation|disorientation|general_distress|emergency|greeting|unsupported", "escalationRequired": false}`;

const GUIDED_PROTOCOLS: Record<string, { intent: PfaIntent; protocol: 'box_breathing' | 'grounding_521' }> = {
  panic_hyperventilation: { intent: 'panic_hyperventilation', protocol: 'box_breathing' },
  disorientation: { intent: 'disorientation', protocol: 'grounding_521' },
};

const ESCALATION_KEYWORDS = [
  'bleeding',
  'chest pain',
  'can\'t breathe',
  'can not breathe',
  'cant breathe',
  'heart attack',
  'unconscious',
  'fire',
  'burn',
  'trapped',
  'flooded',
  'drown',
  'drowning',
  'sink',
  'sinking',
  'electric shock',
  'snake bite',
  'डूब',
  'आग',
  'मदद'
];

function detectEmergency(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k));
}

export async function getPfaReply(
  userMessage: string,
  history: ChatTurn[] = [],
): Promise<PfaReply> {
  const turns: ChatTurn[] = [...history.slice(-8), { role: 'user', content: userMessage }];

  const emergency = detectEmergency(userMessage);
  const guided = matchGuidedProtocol(userMessage);

  try {
    const result = await chatStructured(SYSTEM_PROMPT, turns);
    const intent = normalizeIntent(result.intent);
    const protocol = GUIDED_PROTOCOLS[intent]?.protocol ?? 'none';
    return {
      message: result.message,
      intent,
      escalationRequired: result.escalationRequired || emergency,
      protocol,
    };
  } catch {
    // Degraded path: still provide the deterministic PRD protocols without the LLM.
    if (guided) {
      return { ...guided, message: buildGuidedMessage(guided.protocol, userMessage), escalationRequired: emergency };
    }
    return {
      message:
        'I am here with you. Please take a slow breath in for 4 seconds, hold for 4, breathe out for 4, hold for 4. If you are in danger, press the SOS button or call 112.',
      intent: 'general_distress',
      escalationRequired: emergency,
      protocol: 'box_breathing',
    };
  }
}

function normalizeIntent(raw: string): PfaIntent {
  const known: PfaIntent[] = [
    'panic_hyperventilation',
    'disorientation',
    'general_distress',
    'emergency',
    'greeting',
    'unsupported',
  ];
  return known.includes(raw as PfaIntent) ? (raw as PfaIntent) : 'general_distress';
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