"use client";

import { useState } from "react";
import type { LogEntry, WeightEntry } from "@/lib/types";
import type { StoredPlan } from "@/lib/plan";
import type { FastingState } from "@/lib/fasting";
import { getPerformance, totalCalories } from "@/lib/api";
import { todayKey, entriesForDay } from "@/lib/dates";
import { sumNutrition } from "@/lib/nutrition";
import { windowStats } from "@/lib/insights";
import { bmi } from "@/lib/health";
import { fastingForInsights } from "@/lib/fasting";
import {
  weightProgress,
  weeklyRateFromCheckins,
  type PerformanceResult,
} from "@/lib/performance";

interface Props {
  entries: LogEntry[];
  weights: WeightEntry[];
  plan: StoredPlan | null;
  dailyGoal: number | null;
  fasting: FastingState;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export default function PerformanceReview({
  entries,
  weights,
  plan,
  dailyGoal,
  fasting,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PerformanceResult | null>(null);

  async function handleReview() {
    setLoading(true);
    setError(null);
    try {
      const today = todayKey();
      const todayEntries = entriesForDay(entries, today);
      const latestWeight = weights.length ? weights[weights.length - 1].weightKg : null;

      let planFields = {
        daysIntoPlan: null as number | null,
        daysToTarget: null as number | null,
        startWeightKg: null as number | null,
        currentWeightKg: latestWeight,
        goalWeightKg: null as number | null,
        changeKg: null as number | null,
        vsPlanKg: null as number | null,
        pctToGoal: null as number | null,
        bmiNow: null as number | null,
        bmiGoal: null as number | null,
      };

      if (plan) {
        const startKg = plan.startWeightKg;
        const goalKg = plan.profile.goalWeightKg;
        const currentKg = latestWeight ?? startKg;
        const wp = weightProgress({
          startKg,
          goalKg,
          currentKg,
          startDate: plan.startDate,
          targetDate: plan.profile.targetDate,
          todayKey: today,
        });
        planFields = {
          daysIntoPlan: daysBetween(plan.startDate, today),
          daysToTarget: daysBetween(today, plan.profile.targetDate),
          startWeightKg: startKg,
          currentWeightKg: currentKg,
          goalWeightKg: goalKg,
          changeKg: wp.changeKg,
          vsPlanKg: wp.vsPlanKg,
          pctToGoal: wp.pctToGoal,
          bmiNow: bmi(currentKg, plan.profile.heightCm) || null,
          bmiGoal: bmi(goalKg, plan.profile.heightCm) || null,
        };
      }

      setResult(
        await getPerformance({
          hasPlan: Boolean(plan),
          ...planFields,
          recentRateKgPerWeek: weeklyRateFromCheckins(weights),
          dailyTarget: dailyGoal,
          tdee: plan?.result.tdee ?? null,
          todayCalories: totalCalories(todayEntries),
          todayMacros: sumNutrition(todayEntries),
          macroTargets: plan?.result.macros ?? null,
          week: windowStats(entries, today, 7),
          month: windowStats(entries, today, 30),
          fasting: fastingForInsights(fasting, today, Date.now()),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate your review.");
    } finally {
      setLoading(false);
    }
  }

  const rows: Array<[string, string]> = result
    ? [
        ["Weight", result.weight],
        ["Calories", result.calories],
        ["Macros", result.macros],
        ["Fasting", result.fasting],
        ["On track", result.onTrack],
        ["Focus", result.focus],
      ]
    : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            How am I doing?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A full review of your progress so far.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReview}
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Reviewing…" : "Get insights"}
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
