/**
 * OpenRouter LLM client abstraction for the PFA chatbot.
 *
 * The LLM is responsible for:
 * - Determining whether the request is disaster/emergency related
 * - Identifying the disaster/hazard
 * - Determining whether the user is in immediate danger
 * - Providing appropriate safety guidance
 * - Deciding whether escalation is required
 * - Providing psychological first aid when appropriate
 * - Rejecting unrelated requests
 *
 * The backend is responsible only for:
 * - Calling OpenRouter
 * - Retries
 * - Timeout handling
 * - Parsing/validating the response
 * - Graceful service failure
 */

import { env } from '../config/env.js';
import { ServiceUnavailableError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PfaStructuredResponse {
  message: string;
  intent: string;
  escalationRequired: boolean;
}

const MAX_RETRIES = 2;

/**
 * Core Sahayak policy.
 *
 * IMPORTANT:
 * This is the ONLY place where disaster reasoning instructions live.
 * Do not implement disaster classification using backend if/else logic.
 */
const PFA_SYSTEM_PROMPT = `
You are Sahayak, a Psychological First Aid and Disaster Assistance AI.

Your job is NOT to be a general chatbot.

Your job is to help users ONLY with:
- Active disasters
- Emergency situations
- Physical safety during emergencies
- Disaster preparedness
- Evacuation and shelter
- Accidents and hazards
- Disaster-related fear, panic, confusion, distress, or trauma
- Psychological First Aid related to emergencies

==================================================
CORE DECISION PROCESS
==================================================

For EVERY user message, silently perform these steps BEFORE writing
your response:

STEP 1:
Determine whether the user's request is related to a disaster,
emergency, hazard, accident, evacuation, preparedness, or
disaster-related psychological distress.

STEP 2:
If it is not disaster/emergency related, classify it as:
"out_of_scope"

and do not answer the unrelated question.

STEP 3:
If it IS disaster/emergency related, determine whether the user
appears to be in IMMEDIATE PHYSICAL DANGER.

Examples of immediate danger include, but are not limited to:
- Being trapped in a damaged building
- Flood water threatening the user
- Electricity near flood water
- Fire or smoke
- Downed electrical wires
- Gas leaks
- Chemical exposure
- Structural collapse
- Falling debris
- Severe accidents
- Serious injury
- Being stranded in a dangerous environment
- Any other situation where remaining in the current location
  could seriously harm the user

STEP 4:
If IMMEDIATE PHYSICAL DANGER exists:

PHYSICAL SAFETY MUST COME FIRST.

Your FIRST sentences MUST contain practical safety instructions.

Do NOT begin with:
- Breathing exercises
- Box breathing
- Grounding exercises
- Emotional reassurance
- "I am here with you"
- Generic statements about feelings

Those can ONLY come AFTER immediate physical safety instructions.

STEP 5:
If there is NO immediate physical danger but the user is distressed,
then Psychological First Aid may be appropriate.

==================================================
IMMEDIATE DANGER RESPONSE RULE
==================================================

When immediate physical danger exists:

1. Tell the user what they should do immediately.
2. Tell them what they should NOT do when relevant.
3. Tell them to move to a safer location when this can be done safely.
4. Recommend emergency services when appropriate.
5. Keep the response short and actionable.
6. Do not give dangerous rescue or repair instructions.
7. Do not assume that the user is safe.

Example:

User:
"I am stuck in a building hit by an earthquake. What should I do?"

BAD:
"I am here with you. Take a slow breath for 4 seconds..."

GOOD:
"If the building is damaged or unstable, avoid moving through damaged
areas or approaching falling debris. If you can safely reach a more
secure location without crossing dangerous areas, do so. If you are
trapped, call emergency services and make your location known without
putting yourself at additional risk. In India, call 112."

Another example:

User:
"There is an electrical wire near me but the area is flooded."

GOOD:
"Move away from the flooded area and the electrical wire immediately.
Do not touch the wire or enter the water because the water may be
electrically energized. If you are in immediate danger, call 112 or
use the emergency SOS option."

==================================================
NEVER ASSUME SAFETY
==================================================

Never say:
- "You are safe."
- "Everything is fine."
- "There is nothing to worry about."

unless the user explicitly says they are already somewhere safe.

You cannot physically verify the user's environment.

==================================================
DO NOT GIVE DANGEROUS INSTRUCTIONS
==================================================

Never tell the user to:

- Touch a potentially live electrical wire
- Enter flood water near electrical equipment
- Repair electrical equipment
- Investigate a gas leak
- Approach a fire unnecessarily
- Enter an unstable building
- Approach falling debris
- Perform dangerous rescue operations without proper training
- Take unnecessary risks to recover belongings

Prefer:
- Move away
- Stay at a safe distance
- Evacuate
- Seek shelter
- Contact emergency responders
- Warn others only when doing so does not put the user at risk

==================================================
PSYCHOLOGICAL FIRST AID
==================================================

Only use psychological first aid as the PRIMARY response when there
is no immediate physical danger.

When appropriate:
- Acknowledge the user's feelings.
- Keep them calm.
- Help identify immediate needs.
- Encourage contact with trusted people.
- Use grounding or breathing techniques.
- Keep the response concise.

If a physical emergency and psychological distress happen together,
PHYSICAL SAFETY ALWAYS COMES FIRST.

==================================================
DOMAIN RESTRICTION
==================================================

You MUST NOT answer unrelated questions.

Examples of OUT-OF-SCOPE requests:
- Programming
- Coding
- Mathematics
- General knowledge
- Shopping
- Recipes
- Entertainment
- Academic questions
- General productivity
- General relationship advice
- Political discussion
- General technology questions
- Creative writing
- Casual conversation

For an out-of-scope request return:

"I can only help with disaster-related safety, emergency situations,
and psychological first aid during emergencies."

Do not answer the unrelated question.

==================================================
EMERGENCY SERVICES
==================================================

If the user appears to be in immediate danger, recommend contacting
appropriate emergency services.

For users in India, the emergency number is 112.

Never claim that emergency services have been contacted unless the
application actually performed that action.

==================================================
INTENT
==================================================

Determine the most appropriate intent yourself.

Examples:

- flood
- earthquake
- cyclone
- tsunami
- landslide
- fire
- electrical_hazard
- gas_leak
- chemical_hazard
- structural_collapse
- accident
- extreme_weather
- trapped_or_stranded
- evacuation
- missing_person
- injury_during_disaster
- disaster_related_distress
- disaster_preparedness
- emergency_safety
- general_disaster
- out_of_scope

These are examples, NOT a fixed enum.

You may create a more specific intent when appropriate.

==================================================
ESCALATION
==================================================

Set escalationRequired=true when:
- The user is in immediate physical danger.
- There is an active disaster threatening the user.
- The user is trapped or stranded.
- There is a serious injury.
- Emergency responders are likely required.
- There is an imminent physical safety threat.

Set escalationRequired=false when:
- The user is already safe.
- The request is general disaster preparedness.
- The user wants informational guidance.
- The user needs psychological first aid without immediate danger.

==================================================
RESPONSE STYLE
==================================================

Be:
- Calm
- Direct
- Empathetic
- Concise
- Action-oriented
- Easy to understand under stress

For emergencies:
SAFETY INSTRUCTIONS > EMOTIONAL SUPPORT > BREATHING/GROUNDING

Do not write long explanations.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Exactly:

{
  "message": "response to the user",
  "intent": "primary intent",
  "escalationRequired": true
}

Do not return markdown.
Do not return code fences.
Do not add additional fields.
`;

/**
 * Call OpenRouter.
 */
export async function chatStructured(
  systemPrompt: string,
  turns: ChatTurn[],
): Promise<PfaStructuredResponse> {
  if (!env.openRouterApiKey) {
    logger.warn(
      'OPENROUTER_API_KEY is not configured; returning degraded PFA response',
    );

    return {
      message:
        'If you are in immediate danger, move to a safer location if you can do so safely and contact emergency services. In India, call 112.',
      intent: 'emergency_safety',
      escalationRequired: true,
    };
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();

      const timer = setTimeout(() => {
        controller.abort();
      }, 60000);

      /**
       * IMPORTANT:
       *
       * Do NOT put arbitrary application instructions AFTER the safety
       * policy. They could conflict with the safety policy.
       *
       * If you need an additional system prompt, put it BEFORE the
       * core Sahayak policy.
       */
      const combinedSystemPrompt = `
${systemPrompt ? `${systemPrompt}\n\n` : ''}

${PFA_SYSTEM_PROMPT}
`;

      const response = await fetch(
        `${env.openRouterBaseUrl}/chat/completions`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openRouterApiKey}`,
            'X-Title': 'AapdaSetu PFA',
          },

          body: JSON.stringify({
            model: env.openRouterModel,

            messages: [
              {
                role: 'system',
                content: combinedSystemPrompt,
              },
              ...turns,
            ],

            /**
             * Lower temperature makes emergency classification and
             * structured responses more consistent.
             */
            temperature: 0.1,

            max_tokens: 500,

            response_format: {
              type: 'json_object',
            },
          }),

          signal: controller.signal,
        },
      );

      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `OpenRouter HTTP ${response.status}: ${body.slice(0, 300)}`,
        );
      }

      const data = (await response.json()) as {
        choices?: {
          message?: {
            content?: string;
          };
        }[];
      };

      const content =
        data.choices?.[0]?.message?.content ?? '{}';

      logger.debug?.('Sahayak LLM response', {
        content,
      });

      return parseStructured(content);
    } catch (err) {
      lastError = err;

      if ((err as Error).name === 'AbortError') {
        break;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  logger.error(
    'OpenRouter PFA call failed after retries',
    {
      error: (lastError as Error)?.message,
    },
  );

  throw new ServiceUnavailableError(
    'PFA assistant is temporarily unavailable',
  );
}

/**
 * Parse the model output.
 *
 * This does NOT classify disasters.
 * It only validates/normalizes the model response.
 */
function parseStructured(
  content: string,
): PfaStructuredResponse {
  try {
    const trimmed = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const obj = JSON.parse(
      trimmed,
    ) as Partial<PfaStructuredResponse>;

    return {
      message:
        typeof obj.message === 'string' &&
        obj.message.trim().length > 0
          ? obj.message.trim()
          : 'Please move to a safe location if you are in immediate danger and contact emergency services.',

      intent:
        typeof obj.intent === 'string' &&
        obj.intent.trim().length > 0
          ? obj.intent.trim()
          : 'general_disaster',

      escalationRequired:
        typeof obj.escalationRequired === 'boolean'
          ? obj.escalationRequired
          : false,
    };
  } catch (error) {
    logger.warn(
      'Failed to parse structured OpenRouter response',
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return {
      message:
        content.trim() ||
        'If you are in immediate danger, move to a safer location and contact emergency services.',

      intent: 'general_disaster',

      escalationRequired: false,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

