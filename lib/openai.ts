import OpenAI from "openai";
import type { AnalysisResult, Confidence, Nutrition } from "./types";

const NUTRITION_SCHEMA_SNIPPET = `  "nutrition": {
    "protein_g": 6,
    "carbs_g": 45,
    "fat_g": 12,
    "fiber_g": 3,
    "sugar_g": 2,
    "sodium_mg": 450,
    "potassium_mg": 200,
    "calcium_mg": 30,
    "iron_mg": 1.5
  }`;

const NUTRITION_RULES = `- "nutrition" holds the macro and micro breakdown for the TOTAL quantity (not per unit).
- Macros (protein_g, carbs_g, fat_g, fiber_g, sugar_g) are in grams; micros (sodium_mg, potassium_mg, calcium_mg, iron_mg) are in milligrams.
- Use null for any nutrition value you cannot reasonably estimate. Do not omit keys.`;

const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Build an OpenAI client. A key supplied from the UI (per-request) takes
 * precedence; otherwise we fall back to the server-side OPENAI_API_KEY.
 * The key is only ever used here, on the server.
 */
export function getOpenAIClient(requestKey?: string): OpenAI {
  const apiKey = (requestKey && requestKey.trim()) || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No OpenAI API key found. Add one in Settings, or set OPENAI_API_KEY in .env.local."
    );
  }
  return new OpenAI({ apiKey });
}

/** Resolve the model: UI choice first, then env, then a sane default. */
export function resolveModel(requestModel?: string): string {
  return (
    (requestModel && requestModel.trim()) ||
    process.env.OPENAI_MODEL ||
    DEFAULT_MODEL
  );
}

/** A low temperature is rejected by newer models (gpt-5 / o-series). */
function isTemperatureUnsupported(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /temperature/i.test(message) && /support|unsupported/i.test(message);
}

/**
 * Run a JSON-mode chat completion and return the raw content string.
 * We request a low temperature for more consistent nutrition estimates, but
 * some models (gpt-5 / o-series) only allow the default — so if that specific
 * error comes back, we transparently retry without the temperature option.
 */
export async function runJsonCompletion(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const base = {
    model,
    response_format: { type: "json_object" as const },
    messages,
  };
  try {
    const completion = await client.chat.completions.create({
      ...base,
      temperature: 0.2,
    });
    return completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    if (!isTemperatureUnsupported(err)) throw err;
    const completion = await client.chat.completions.create(base);
    return completion.choices[0]?.message?.content ?? "";
  }
}

export const TEXT_SYSTEM_PROMPT = `You are a nutrition expert specializing in Indian and South Indian cuisine.

The user will describe a food item and quantity in plain text (for example "2 idlis" or "1 masala dosa").

Estimate the calories and respond with ONLY a valid JSON object, no markdown, no extra text, in exactly this shape:

{
  "food_name": "Masala Dosa",
  "quantity": 1,
  "serving_size": "1 dosa",
  "calories": 320,
  "confidence": "high",
  "notes": "Standard restaurant serving",
${NUTRITION_SCHEMA_SNIPPET}
}

Rules:
- "quantity" is a number reflecting how many units the user described.
- "calories" is the TOTAL estimated calories for the full quantity described.
- "confidence" must be one of: "high", "medium", "low".
- "notes" is one short sentence explaining the estimate or assumptions.
${NUTRITION_RULES}
- If the input is not food, set calories to 0, confidence to "low", all nutrition values to null, and explain in notes.`;

export const IMAGE_SYSTEM_PROMPT = `You are a nutrition expert specializing in Indian and South Indian cuisine.

Analyze the uploaded food image.

Identify the food and respond with ONLY a valid JSON object, no markdown, no extra text, in exactly this shape:

{
  "food_name": "Idli",
  "quantity": 2,
  "serving_size": "2 idlis",
  "estimated_calories": 130,
  "confidence": "high",
  "assumptions": "Standard medium-sized idlis",
${NUTRITION_SCHEMA_SNIPPET}
}

Rules:
- "quantity" is the number of food units visible in the image.
- "estimated_calories" is the TOTAL estimated calories for everything visible.
- "confidence" must be one of: "high", "medium", "low".
- "assumptions" is one short sentence describing what you assumed.
${NUTRITION_RULES}
- If the image does not contain food, set estimated_calories to 0, confidence to "low", all nutrition values to null, and explain in assumptions.`;

function normalizeConfidence(value: unknown): Confidence {
  const v = String(value || "").toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "medium";
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a single nutrient value: null when missing/unknown, else a rounded number. */
function toNullableNumber(value: unknown, decimals = 0): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return null;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function parseNutrition(value: unknown): Nutrition {
  const n = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    protein_g: toNullableNumber(n.protein_g, 1),
    carbs_g: toNullableNumber(n.carbs_g, 1),
    fat_g: toNullableNumber(n.fat_g, 1),
    fiber_g: toNullableNumber(n.fiber_g, 1),
    sugar_g: toNullableNumber(n.sugar_g, 1),
    sodium_mg: toNullableNumber(n.sodium_mg),
    potassium_mg: toNullableNumber(n.potassium_mg),
    calcium_mg: toNullableNumber(n.calcium_mg),
    iron_mg: toNullableNumber(n.iron_mg, 1),
  };
}

/**
 * Parse the raw JSON string returned by the model into our normalized shape.
 * Accepts both the text-prompt keys (calories/notes) and the image-prompt
 * keys (estimated_calories/assumptions). Throws if the JSON is unusable.
 */
export function parseAnalysis(raw: string): AnalysisResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The model returned an invalid response. Please try again.");
  }

  const foodName = String(data.food_name || "").trim();
  if (!foodName) {
    throw new Error("Could not identify the food. Please try again.");
  }

  return {
    foodName,
    quantity: toNumber(data.quantity, 1) || 1,
    servingSize: String(data.serving_size || "").trim() || "1 serving",
    calories: Math.max(0, Math.round(toNumber(data.calories ?? data.estimated_calories))),
    confidence: normalizeConfidence(data.confidence),
    notes: String(data.notes ?? data.assumptions ?? "").trim(),
    nutrition: parseNutrition(data.nutrition),
  };
}
