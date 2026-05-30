/**
 * Personalized calorie-plan types + a strict normalizer for the LLM response,
 * mirroring the approach in lib/openai.ts's parseAnalysis.
 */

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface PlanProfile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number | null;
  activityLevel: ActivityLevel;
  goalWeightKg: number;
  targetDate: string; // "YYYY-MM-DD"
}

export interface PlanMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
}

export interface PlanResult {
  dailyCalories: number;
  weeklyRateKg: number;
  bmr: number | null;
  tdee: number | null;
  macros: PlanMacros | null;
  summary: string;
  safetyNote: string;
  feasible: boolean;
  adjustedTargetDate: string | null;
}

/** A saved plan: the inputs, the computed result, and a baseline for the chart. */
export interface StoredPlan {
  profile: PlanProfile;
  result: PlanResult;
  startWeightKg: number;
  startDate: string; // "YYYY-MM-DD" the plan was created
  createdAt: string; // ISO timestamp
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function parseMacros(value: unknown): PlanMacros | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  const protein = toNumber(m.protein_g);
  const carbs = toNumber(m.carbs_g);
  const fat = toNumber(m.fat_g);
  const fiber = toNumber(m.fiber_g);
  const sugar = toNumber(m.sugar_g);
  if (protein == null || carbs == null || fat == null || fiber == null || sugar == null) {
    return null;
  }
  return {
    protein_g: Math.round(protein),
    carbs_g: Math.round(carbs),
    fat_g: Math.round(fat),
    fiber_g: Math.round(fiber),
    sugar_g: Math.round(sugar),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse the raw JSON returned by the model into a normalized PlanResult.
 * Daily calories are clamped UP to `calorieFloor` so the plan can never
 * recommend an unsafe deficit even if the model misbehaves.
 */
export function parsePlan(raw: string, opts: { calorieFloor: number }): PlanResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The model returned an invalid plan. Please try again.");
  }

  const rawCalories = toNumber(data.daily_calories) ?? opts.calorieFloor;
  const dailyCalories = Math.max(opts.calorieFloor, Math.round(rawCalories));

  const weeklyRate = toNumber(data.weekly_rate_kg) ?? 0;
  const adjusted = String(data.adjusted_target_date ?? "").trim();

  return {
    dailyCalories,
    weeklyRateKg: Math.round(weeklyRate * 100) / 100,
    bmr: toNumber(data.bmr) != null ? Math.round(toNumber(data.bmr) as number) : null,
    tdee: toNumber(data.tdee) != null ? Math.round(toNumber(data.tdee) as number) : null,
    macros: parseMacros(data.macros),
    summary: String(data.summary ?? "").trim(),
    safetyNote: String(data.safety_note ?? "").trim(),
    feasible: data.feasible === undefined ? true : Boolean(data.feasible),
    adjustedTargetDate: DATE_RE.test(adjusted) ? adjusted : null,
  };
}
