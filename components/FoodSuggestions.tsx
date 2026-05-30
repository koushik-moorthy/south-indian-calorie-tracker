"use client";

import { useState } from "react";
import type { LogEntry } from "@/lib/types";
import type { StoredPlan } from "@/lib/plan";
import { getSuggestions, totalCalories } from "@/lib/api";
import { todayKey, entriesForDay } from "@/lib/dates";
import { sumNutrition } from "@/lib/nutrition";
import type { SuggestionsResult } from "@/lib/suggest";

interface Props {
  entries: LogEntry[];
  plan: StoredPlan | null;
  dailyGoal: number | null;
}

export default function FoodSuggestions({ entries, plan, dailyGoal }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionsResult | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const today = todayKey();
      const todayEntries = entriesForDay(entries, today);
      setResult(
        await getSuggestions({
          dailyTarget: dailyGoal,
          consumedCalories: totalCalories(todayEntries),
          macroTargets: plan?.result.macros ?? null,
          consumedMacros: sumNutrition(todayEntries),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get suggestions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            What should I eat?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tamil-style ideas based on what&apos;s left in your day.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Suggest foods"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          {result.headline && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {result.headline}
            </p>
          )}

          <ul className="space-y-2">
            {result.suggestions.map((s, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {s.name}
                  </span>
                  {s.calories != null && (
                    <span className="shrink-0 text-sm font-semibold text-brand-600 dark:text-brand-500">
                      ~{s.calories.toLocaleString()} kcal
                    </span>
                  )}
                </div>
                {s.reason && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.reason}</p>
                )}
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-400">Estimates, not medical advice.</p>
        </div>
      )}
    </section>
  );
}
