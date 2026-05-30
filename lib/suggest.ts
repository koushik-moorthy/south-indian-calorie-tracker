import type { Nutrition } from "./types";
import type { PlanMacros } from "./plan";

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
      };
    })
    .filter((s) => s.name.length > 0)
    .slice(0, 6);

  return { headline: str(data.headline), suggestions };
}
