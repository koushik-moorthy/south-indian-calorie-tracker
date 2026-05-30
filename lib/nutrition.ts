import type { Nutrition } from "./types";

export interface NutrientField {
  key: keyof Nutrition;
  label: string;
  unit: "g";
}

/** Display metadata + ordering for every macro we track (all in grams). */
export const NUTRIENT_FIELDS: NutrientField[] = [
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sugar_g", label: "Sugar", unit: "g" },
];

const EMPTY: Nutrition = {
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  sugar_g: null,
};

/** True if at least one macro has a value. */
export function hasAnyNutrition(n: Nutrition | undefined | null): boolean {
  if (!n) return false;
  return NUTRIENT_FIELDS.some((f) => n[f.key] != null);
}

/**
 * Sum macros across log entries. A macro stays null only if NO entry reported
 * it; otherwise missing values count as 0 and the total is rounded to 1 dp.
 */
export function sumNutrition(items: Array<{ nutrition?: Nutrition }>): Nutrition {
  const totals: Nutrition = { ...EMPTY };
  for (const field of NUTRIENT_FIELDS) {
    let any = false;
    let sum = 0;
    for (const item of items) {
      const value = item.nutrition?.[field.key];
      if (value != null) {
        any = true;
        sum += value;
      }
    }
    if (any) {
      totals[field.key] = Math.round(sum * 10) / 10;
    }
  }
  return totals;
}
