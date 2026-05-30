import type { Nutrition } from "./types";
import type { PlanMacros } from "./plan";

const MACRO_KEYS: (keyof Nutrition)[] = [
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "sugar_g",
];

/** What the client sends to /api/suggest about today so far. */
export interface SuggestionInput {
  dailyTarget: number | null;
  consumedCalories: number;
  macroTargets: PlanMacros | null;
  consumedMacros: Nutrition;
}

export interface FoodSuggestion {
  name: string;
  calories: number | null;
  reason: string;
  macros: Nutrition | null;
}

export interface SuggestionsResult {
  headline: string;
  suggestions: FoodSuggestion[];
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Parse a per-suggestion macro object; null if no macro is present. */
function parseMacros(value: unknown): Nutrition | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  const out: Nutrition = {
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    sugar_g: null,
  };
  let any = false;
  for (const key of MACRO_KEYS) {
    const n = toNumber(m[key]);
    if (n != null && n >= 0) {
      out[key] = Math.round(n * 10) / 10;
      any = true;
    }
  }
  return any ? out : null;
}

/** Normalize the model's food-suggestion JSON into a safe, trimmed shape. */
export function parseSuggestions(raw: string): SuggestionsResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The model returned invalid suggestions. Please try again.");
  }

  const str = (v: unknown) => String(v ?? "").trim();
  const list = Array.isArray(data.suggestions) ? data.suggestions : [];

  const suggestions: FoodSuggestion[] = list
    .map((item) => {
      const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const cal = toNumber(o.calories);
      return {
        name: str(o.name),
        calories: cal != null ? Math.round(cal) : null,
        reason: str(o.reason),
        macros: parseMacros(o.macros),
      };
    })
    .filter((s) => s.name.length > 0)
    .slice(0, 6);

  return { headline: str(data.headline), suggestions };
}
