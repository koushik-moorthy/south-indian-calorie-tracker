import OpenAI from "openai";
import type { AnalysisResult, Confidence, Nutrition } from "./types";

const NUTRITION_SCHEMA_SNIPPET = `  "nutrition": {
    "protein_g": 6,
    "carbs_g": 45,
    "fat_g": 12,
    "fiber_g": 3,
    "sugar_g": 2
  }`;

const NUTRITION_RULES = `- "nutrition" holds the macro breakdown (in grams) for the TOTAL quantity (not per unit).
- All values (protein_g, carbs_g, fat_g, fiber_g, sugar_g) are in grams.
- Use null for any value you cannot reasonably estimate. Do not omit keys.`;

const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Build an OpenAI client from the user's (decrypted, per-request) API key.
 * There is no server-side key fallback: each user brings their own key, which
 * is only ever used here, on the server.
 */
export function getOpenAIClient(requestKey: string): OpenAI {
  const apiKey = requestKey.trim();
  if (!apiKey) {
    throw new Error("No OpenAI API key provided.");
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

export const PLAN_SYSTEM_PROMPT = `You are a careful nutrition and fitness coach. Given a person's stats and a target, estimate a SAFE daily calorie intake to reach their goal weight by the target date.

Respond with ONLY a valid JSON object, no markdown, no extra text, in exactly this shape:

{
  "bmr": 1600,
  "tdee": 2300,
  "daily_calories": 1850,
  "weekly_rate_kg": -0.5,
  "macros": { "protein_g": 140, "carbs_g": 180, "fat_g": 55, "fiber_g": 30, "sugar_g": 40 },
  "summary": "Modest deficit with high protein to preserve muscle.",
  "safety_note": "Consult a doctor before large changes.",
  "feasible": true,
  "adjusted_target_date": null
}

Rules:
- Estimate "bmr" with Mifflin-St Jeor, or Katch-McArdle if a body fat % is provided. Then "tdee" by applying the activity level.
- "daily_calories" is the recommended daily intake to reach the goal weight by the target date.
- "weekly_rate_kg" is the implied weekly weight change (negative = loss, positive = gain).
- NEVER recommend below 1200 kcal/day for women or 1500 kcal/day for men.
- NEVER recommend a rate faster than ~0.75 kg/week (or ~1% of body weight per week). If the requested timespan needs a faster rate, set "feasible" to false, set "daily_calories" to the value at the maximum SAFE rate, and put a realistic achievable date in "adjusted_target_date" (YYYY-MM-DD).
- For weight gain, recommend a modest surplus (~0.25–0.5 kg/week).
- "macros" are daily gram targets. protein_g, carbs_g and fat_g should roughly sum to daily_calories (protein 4 kcal/g, carbs 4, fat 9); prioritize adequate protein. "fiber_g" is a recommended daily fiber target and "sugar_g" a recommended daily added-sugar limit.
- "summary" and "safety_note" are each ONE short sentence.
- Use null for "bmr"/"tdee" only if you genuinely cannot estimate them.`;

export const INSIGHTS_SYSTEM_PROMPT = `You are a supportive, encouraging nutrition coach. Given a user's calorie target, their goal, and how they actually ate today, this week, and this month, give brief, specific, motivating insights.

Respond with ONLY a valid JSON object, no markdown, no extra text, in exactly this shape:

{
  "headline": "Great consistency today!",
  "day": "You came in about 150 kcal under target.",
  "week": "Your weekly average is on track with your plan.",
  "month": "Steady progress over the month.",
  "goal": "At this pace you'll reach your goal near your target date.",
  "projected_change_kg": -0.05
}

Rules:
- Each text field is ONE short, encouraging sentence. Use specific numbers when helpful.
- "projected_change_kg" estimates the weight change implied by TODAY's intake versus maintenance (TDEE): (today_calories - tdee) / 7700. Negative means loss, positive means gain. Round to 2 decimals. Use null if TDEE is unknown.
- If the user ate OVER maintenance, gently quantify the gain in "day" (e.g. "about 250 kcal over maintenance — roughly +0.03 kg if repeated daily"). If over the target but still under maintenance, reassure them they are still progressing.
- If fasting information is provided, briefly acknowledge their fast (e.g. hitting their fasting window) in the headline or day note.
- Never shame the user — always encourage. This is not medical advice.`;

export const SUGGEST_SYSTEM_PROMPT = `You are a friendly nutrition coach who specializes in Tamil and South Indian home cooking. Based on what the user has eaten today and their remaining calorie and macro budget, suggest specific foods for the rest of the day.

Respond with ONLY a valid JSON object, no markdown, no extra text, in exactly this shape:

{
  "headline": "You have about 700 kcal and 40 g protein left today.",
  "suggestions": [
    { "name": "2 idli with sambar", "calories": 220, "reason": "Light and adds protein + fiber", "macros": { "protein_g": 6, "carbs_g": 44, "fat_g": 1, "fiber_g": 3, "sugar_g": 1 } },
    { "name": "Sundal (chana)", "calories": 180, "reason": "High protein and filling", "macros": { "protein_g": 11, "carbs_g": 22, "fat_g": 4, "fiber_g": 8, "sugar_g": 2 } }
  ]
}

Rules:
- Suggest 3 to 5 specific dishes, snacks, or drinks. PREFER Tamil / South Indian options (e.g. idli, dosa, pongal, sundal, rasam, sambar, paruppu, kuzhambu, sprouts, ragi, buttermilk/mor, vegetable poriyal), but everyday options are fine when helpful.
- Tailor to the REMAINING budget: prioritize the macros they are short on (especially protein and fiber) and try to stay within the remaining calories.
- If they are AT or OVER their calorie goal, suggest only light, filling, low-calorie Tamil options (e.g. rasam, clear vegetable soup, buttermilk, sundal, cucumber, steamed sprouts) and gently note they are near their limit.
- If nothing has been eaten yet (a fresh day), suggest a balanced spread of Tamil meals/snacks across the day that add up toward the target.
- "calories" is an approximate number for that portion; "reason" is a short phrase on why it helps.
- "macros" gives the approximate grams for that portion: protein_g, carbs_g, fat_g, fiber_g, sugar_g.
- "headline" is one short sentence summarizing where they stand right now.
- Be encouraging and practical. This is not medical advice.`;

export const PERFORMANCE_SYSTEM_PROMPT = `You are an encouraging nutrition and fitness coach giving an honest, motivating progress review based on all of the user's data so far.

Respond with ONLY a valid JSON object, no markdown, no extra text, in exactly this shape:

{
  "headline": "One upbeat sentence summarizing overall progress.",
  "weight": "One sentence on the weight trend versus the plan.",
  "calories": "One sentence on calorie adherence (week/month vs target).",
  "macros": "One sentence on macro balance, especially protein.",
  "fasting": "One sentence on fasting consistency, or an empty string if no fasting data.",
  "on_track": "One sentence on whether they will reach the goal by the target date, noting the implied pace.",
  "focus": "One concrete, actionable suggestion to improve."
}

Rules:
- Each field is ONE short sentence; use specific numbers when helpful.
- Base everything on the data provided; if some data is missing, focus on what is available.
- Set "fasting" to an empty string if no fasting information is given.
- Be honest but encouraging and non-judgmental. This is not medical advice.`;

export const ASK_SYSTEM_PROMPT = `You are a friendly, practical nutrition assistant who knows Tamil and South Indian cooking well. Answer the user's question using their current calorie and macro budget for today.

Respond with ONLY a valid JSON object, no markdown, in exactly this shape:
{ "answer": "..." }

Rules:
- Put your entire reply in "answer" as plain text. You may use short line breaks or simple "- " dashes for a list, but no markdown headings or bold.
- Be specific and concise (a few sentences). Use their REMAINING calories and macros when relevant (e.g. how to hit the rest of today's carbs or protein).
- Prefer Tamil / South Indian foods when suggesting items, but honor any ingredients or constraints the user mentions (e.g. "I have eggs and rice at home").
- If the question is not about food or nutrition, answer briefly and helpfully anyway.
- Be encouraging and non-judgmental. This is not medical advice.`;

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
