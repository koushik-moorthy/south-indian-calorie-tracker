import type { Nutrition } from "./types";

export type NutritionGroup = "macro" | "micro";

export interface NutrientField {
  key: keyof Nutrition;
  label: string;
  unit: "g" | "mg";
  group: NutritionGroup;
}

/** Display metadata + ordering for every nutrient we track. */
export const NUTRIENT_FIELDS: NutrientField[] = [
  { key: "protein_g", label: "Protein", unit: "g", group: "macro" },
  { key: "carbs_g", label: "Carbs", unit: "g", group: "macro" },
  { key: "fat_g", label: "Fat", unit: "g", group: "macro" },
  { key: "fiber_g", label: "Fiber", unit: "g", group: "macro" },
  { key: "sugar_g", label: "Sugar", unit: "g", group: "macro" },
  { key: "sodium_mg", label: "Sodium", unit: "mg", group: "micro" },
  { key: "potassium_mg", label: "Potassium", unit: "mg", group: "micro" },
  { key: "calcium_mg", label: "Calcium", unit: "mg", group: "micro" },
  { key: "iron_mg", label: "Iron", unit: "mg", group: "micro" },
];

const EMPTY: Nutrition = {
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  sugar_g: null,
  sodium_mg: null,
  potassium_mg: null,
  calcium_mg: null,
  iron_mg: null,
};

/** True if at least one nutrient has a value. */
export function hasAnyNutrition(n: Nutrition | undefined | null): boolean {
  if (!n) return false;
  return NUTRIENT_FIELDS.some((f) => n[f.key] != null);
}

/**
 * Sum nutrition across log entries. A nutrient stays null only if NO entry
 * reported it; otherwise missing values count as 0 and the total is rounded.
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
      const decimals = field.unit === "g" ? 1 : 0;
      const factor = 10 ** decimals;
      totals[field.key] = Math.round(sum * factor) / factor;
    }
  }
  return totals;
}
