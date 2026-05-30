import type { AnalysisResult, Nutrition } from "./types";

/** Macros are all in grams, kept to 1 decimal place when scaling. */
const DECIMALS: Record<keyof Nutrition, number> = {
  protein_g: 1,
  carbs_g: 1,
  fat_g: 1,
  fiber_g: 1,
  sugar_g: 1,
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Return a copy of an analysis result with calories, quantity, and every
 * non-null nutrient multiplied by `factor` (e.g. the user ate 2× the analyzed
 * serving). Null nutrients stay null. Invalid factors fall back to 1, and the
 * original result is never mutated.
 */
export function scaleResult(result: AnalysisResult, factor: number): AnalysisResult {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;

  const nutrition = { ...result.nutrition };
  (Object.keys(nutrition) as (keyof Nutrition)[]).forEach((key) => {
    const value = nutrition[key];
    if (value != null) nutrition[key] = round(value * f, DECIMALS[key]);
  });

  return {
    ...result,
    quantity: round(result.quantity * f, 2),
    calories: Math.max(0, Math.round(result.calories * f)),
    nutrition,
  };
}
