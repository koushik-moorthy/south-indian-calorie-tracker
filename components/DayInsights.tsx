"use client";

import { useState } from "react";
import type { LogEntry, WeightEntry } from "@/lib/types";
import type { StoredPlan } from "@/lib/plan";
import { getInsights, totalCalories } from "@/lib/api";
import { todayKey, entriesForDay } from "@/lib/dates";
import { sumNutrition } from "@/lib/nutrition";
import { windowStats, type InsightsResult } from "@/lib/insights";
import { fastingForInsights, type FastingState } from "@/lib/fasting";

interface Props {
  entries: LogEntry[];
  weights: WeightEntry[];
  plan: StoredPlan | null;
  dailyGoal: number | null;
  fasting: FastingState;
}

export default function DayInsights({
  entries,
  weights,
  plan,
  dailyGoal,
  fasting,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightsResult | null>(null);

  async function handleEndDay() {
    setLoading(true);
    setError(null);
    try {
      const today = todayKey();
      const todayEntries = entriesForDay(entries, today);
      const currentWeight = weights.length
        ? weights[weights.length - 1].weightKg
        : plan?.profile.weightKg ?? null;

      setResult(
        await getInsights({
          dailyTarget: dailyGoal,
          tdee: plan?.result.tdee ?? null,
          goalWeightKg: plan?.profile.goalWeightKg ?? null,
          targetDate: plan?.profile.targetDate ?? null,
          currentWeightKg: currentWeight,
          today: {
            calories: totalCalories(todayEntries),
            macros: sumNutrition(todayEntries),
          },
          week: windowStats(entries, today, 7),
          month: windowStats(entries, today, 30),
          fasting: fastingForInsights(fasting, today, Date.now()),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate insights.");
    } finally {
      setLoading(false);
    }
  }

  const change = result?.projectedChangeKg ?? null;
  const gaining = change != null && change > 0;

  const rows: Array<[string, string | undefined]> = result
    ? [
        ["Today", result.day],
        ["This week", result.week],
        ["This month", result.month],
        ["Goal", result.goal],
      ]
    : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            End the day
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Get a quick read on today, your week, month, and goal.
          </p>
        </div>
        <button
          type="button"
          onClick={handleEndDay}
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Reviewing…" : "End my day"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          {result.headline && (
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {result.headline}
            </p>
          )}

          {change != null && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                gaining
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              }`}
            >
              {gaining ? "▲" : "▼"} {gaining ? "+" : ""}
              {change} kg
              <span className="font-normal opacity-80">from today&apos;s intake</span>
            </div>
          )}

          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(
              ([label, text]) =>
                text && (
                  <div key={label} className="py-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">
                      {label}
                    </dt>
                    <dd className="text-sm text-slate-700 dark:text-slate-300">{text}</dd>
                  </div>
                )
            )}
          </dl>

          <p className="text-xs text-slate-400">Estimates, not medical advice.</p>
        </div>
      )}
    </section>
  );
}
