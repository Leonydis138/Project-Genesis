import { GoogleGenAI } from '@google/genai';

let genAIClient: GoogleGenAI | null = null;
let last503Timestamp = 0;
const COOLDOWN_DURATION_MS = 20000; // 20-second cooldown if 503 is detected

export function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export function isGeminiInCooldown(): boolean {
  return Date.now() - last503Timestamp < COOLDOWN_DURATION_MS;
}

export interface GenerationOptions {
  temperature?: number;
  topP?: number;
  systemInstruction?: string;
  maxOutputTokens?: number;
  skipIfCooldown?: boolean;
}

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

/**
 * Robust Gemini content generation with multi-model fallback,
 * exponential backoff retry for 503/429 spikes, and cooldown management.
 */
export async function generateContentWithRetry(
  prompt: string,
  options: GenerationOptions = {}
): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) {
    return null;
  }

  // If in cooldown from recent 503 spike and skip requested (e.g. background self-play)
  if (options.skipIfCooldown && isGeminiInCooldown()) {
    return null;
  }

  const modelsToTry = isGeminiInCooldown()
    ? ['gemini-3.1-flash-lite', 'gemini-flash-latest']
    : CANDIDATE_MODELS;

  for (const modelName of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const config: any = {};
        if (options.temperature !== undefined) config.temperature = options.temperature;
        if (options.topP !== undefined) config.topP = options.topP;
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
        if (options.maxOutputTokens) config.maxOutputTokens = options.maxOutputTokens;

        const res = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        const text = res.text?.trim();
        if (text) {
          return text;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const is503 = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');
        const is429 = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');

        if (is503) {
          last503Timestamp = Date.now();
        }

        if ((is503 || is429) && attempts < maxAttempts) {
          // Exponential backoff before retrying
          const backoff = attempts * 600 + Math.floor(Math.random() * 300);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        // On 503 or 429, try next fallback model in CANDIDATE_MODELS
        if (is503 || is429) {
          break;
        }

        // For other unrecoverable errors (e.g. invalid arguments), break
        break;
      }
    }
  }

  return null;
}
