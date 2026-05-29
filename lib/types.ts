export type Confidence = "high" | "medium" | "low";

/**
 * Nutrition breakdown for the full quantity analyzed. Any value the model
 * cannot reasonably estimate is `null` and hidden in the UI.
 * Macros are in grams; micros are in milligrams.
 */
export interface Nutrition {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
}

/**
 * Normalized analysis result used everywhere in the UI.
 * Both the text and image API routes return this shape.
 */
export interface AnalysisResult {
  foodName: string;
  quantity: number;
  servingSize: string;
  calories: number;
  confidence: Confidence;
  notes: string;
  nutrition: Nutrition;
}

/** A single item saved to today's log in localStorage. */
export interface LogEntry {
  id: string;
  foodName: string;
  calories: number;
  nutrition: Nutrition;
  addedAt: number; // epoch ms
}

/** Standard error payload returned by the API routes. */
export interface ApiError {
  error: string;
}
