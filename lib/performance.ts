import type { Nutrition, WeightEntry } from "./types";
import type { PlanMacros } from "./plan";
import type { WindowStats } from "./insights";
import type { FastingSummary } from "./fasting";
import { expectedWeight } from "./health";

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface WeightProgress {
  changeKg: number; // current - start (negative = lost)
  toGoalKg: number; // current - goal (remaining)
  expectedKg: number; // where the plan says they should be today
  vsPlanKg: number; // current - expected (+ = heavier than planned)
  pctToGoal: number; // 0..100 progress from start toward goal
}

export function weightProgress(args: {
  startKg: number;
  goalKg: number;
  currentKg: number;
  startDate: string;
  targetDate: string;
  todayKey: string;
}): WeightProgress {
  const { startKg, goalKg, currentKg, startDate, targetDate, todayKey } = args;
  const expected = expectedWeight(startKg, goalKg, startDate, targetDate, todayKey);
  const span = startKg - goalKg;
  const pct = span === 0 ? 100 : ((startKg - currentKg) / span) * 100;
  return {
    changeKg: round1(currentKg - startKg),
    toGoalKg: round1(currentKg - goalKg),
    expectedKg: expected,
    vsPlanKg: round1(currentKg - expected),
    pctToGoal: Math.min(100, Math.max(0, Math.round(pct))),
  };
}

/** Weekly weight-change rate (kg/week) from the first and last check-in. */
export function weeklyRateFromCheckins(weights: WeightEntry[]): number | null {
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) =>
    a.recordedOn < b.recordedOn ? -1 : a.recordedOn > b.recordedOn ? 1 : 0
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = daysBetween(first.recordedOn, last.recordedOn);
  if (days <= 0) return null;
  return round1(((last.weightKg - first.weightKg) / days) * 7);
}

/** Everything the performance review needs, computed on the client. */
export interface PerformanceInput {
  hasPlan: boolean;
  daysIntoPlan: number | null;
  daysToTarget: number | null;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  goalWeightKg: number | null;
  changeKg: number | null;
  vsPlanKg: number | null;
  recentRateKgPerWeek: number | null;
  pctToGoal: number | null;
  bmiNow: number | null;
  bmiGoal: number | null;
  dailyTarget: number | null;
  tdee: number | null;
  todayCalories: number;
  todayMacros: Nutrition;
  macroTargets: PlanMacros | null;
  week: WindowStats;
  month: WindowStats;
  fasting?: FastingSummary | null;
}

export interface PerformanceResult {
  headline: string;
  weight: string;
  calories: string;
  macros: string;
  fasting: string;
  onTrack: string;
  focus: string;
}

/** Normalize the model's performance-review JSON into trimmed sections. */
export function parsePerformance(raw: string): PerformanceResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The model returned an invalid review. Please try again.");
  }
  const str = (v: unknown) => String(v ?? "").trim();
  return {
    headline: str(data.headline),
    weight: str(data.weight),
    calories: str(data.calories),
    macros: str(data.macros),
    fasting: str(data.fasting),
    onTrack: str(data.on_track),
    focus: str(data.focus),
  };
}
