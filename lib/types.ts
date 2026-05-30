export type Confidence = "high" | "medium" | "low";

/**
 * Macro breakdown (in grams) for the full quantity analyzed. Any value the
 * model cannot reasonably estimate is `null` and hidden in the UI.
 */
export interface Nutrition {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
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

/** A daily weight check-in for progress tracking. */
export interface WeightEntry {
  id: string;
  weightKg: number;
  recordedOn: string; // "YYYY-MM-DD"
}

/** Standard error payload returned by the API routes. */
export interface ApiError {
  error: string;
}
