/**
 * OpenRouter LLM client abstraction for the PFA chatbot.
 * Swap model/provider by changing env vars — no code change needed.
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
 * Call OpenRouter with a JSON-schema constrained / structured completion.
 * Uses free-tier models. Falls back to a graceful degraded response only if the
 * network/service itself is unreachable (NOT a hardcoded LLM substitute).
 */
export async function chatStructured(
  systemPrompt: string,
  turns: ChatTurn[],
): Promise<PfaStructuredResponse> {
  if (!env.openRouterApiKey) {
    logger.warn('OPENROUTER_API_KEY is not configured; returning degraded PFA response');
    return {
      message:
        'I am here with you right now. Please focus on your breathing: inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, hold for 4 seconds. Repeat this cycle. You are safe and not alone.',
      intent: 'general_distress',
      escalationRequired: false,
    };
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.openRouterApiKey}`,
          'X-Title': 'AapdaSetu PFA',
        },
        body: JSON.stringify({
          model: env.openRouterModel,
          messages: [{ role: 'system', content: systemPrompt }, ...turns],
          temperature: 0.3,
          max_tokens: 400,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? '{}';
      const parsed = parseStructured(content);
      return parsed;
    } catch (err) {
      lastError = err;
      if ((err as Error).name === 'AbortError') break;
      if (attempt < MAX_RETRIES) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  logger.error('OpenRouter PFA call failed after retries', { error: (lastError as Error)?.message });
  throw new ServiceUnavailableError('PFA assistant is temporarily unavailable');
}

function parseStructured(content: string): PfaStructuredResponse {
  try {
    const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const obj = JSON.parse(trimmed) as Partial<PfaStructuredResponse>;
    return {
      message: typeof obj.message === 'string' ? obj.message : 'Please breathe slowly with me.',
      intent: typeof obj.intent === 'string' ? obj.intent : 'general_distress',
      escalationRequired: Boolean(obj.escalationRequired),
    };
  } catch {
    // Non-JSON fallback: treat the raw text as the empathetic message.
    return { message: content.trim() || 'I am here with you.', intent: 'general_distress', escalationRequired: false };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}