import type { LogEntry, Nutrition } from "./types";
import { dayKey, shiftDayKey } from "./dates";
import type { FastingSummary } from "./fasting";

export interface WindowStats {
  daysLogged: number;
  totalCalories: number;
  avgCalories: number;
}

/**
 * Aggregate calories over the last `days` calendar days ending at `endKey`
 * (inclusive). `avgCalories` averages over the days that actually have entries.
 */
export function windowStats(
  entries: LogEntry[],
  endKey: string,
  days: number
): WindowStats {
  const startKey = shiftDayKey(endKey, -(days - 1));
  const days_ = new Set<string>();
  let total = 0;
  for (const e of entries) {
    const k = dayKey(e.addedAt);
    if (k >= startKey && k <= endKey) {
      days_.add(k);
      total += e.calories || 0;
    }
  }
  const daysLogged = days_.size;
  return {
    daysLogged,
    totalCalories: total,
    avgCalories: daysLogged ? Math.round(total / daysLogged) : 0,
  };
}

/** Payload sent to /api/insights describing how the user has been eating. */
export interface InsightsInput {
  dailyTarget: number | null;
  tdee: number | null;
  goalWeightKg: number | null;
  targetDate: string | null;
  currentWeightKg: number | null;
  today: {
    calories: number;
    macros: Nutrition;
  };
  week: WindowStats;
  month: WindowStats;
  fasting?: FastingSummary | null;
}

export interface InsightsResult {
  headline: string;
  day: string;
  week: string;
  month: string;
  goal: string;
  projectedChangeKg: number | null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Normalize the model's insights JSON into a safe, trimmed shape. */
export function parseInsights(raw: string): InsightsResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The model returned invalid insights. Please try again.");
  }

  const str = (v: unknown) => String(v ?? "").trim();
  const change = toNumber(data.projected_change_kg);

  return {
    headline: str(data.headline),
    day: str(data.day),
    week: str(data.week),
    month: str(data.month),
    goal: str(data.goal),
    projectedChangeKg: change != null ? Math.round(change * 100) / 100 : null,
  };
}
