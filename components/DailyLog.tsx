"use client";

import type { LogEntry } from "@/lib/types";
import { totalCalories } from "@/lib/api";
import { sumNutrition } from "@/lib/nutrition";
import NutritionBreakdown from "./NutritionBreakdown";

interface Props {
  entries: LogEntry[];
  loading?: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function DailyLog({
  entries,
  loading = false,
  onRemove,
  onClear,
}: Props) {
  const total = totalCalories(entries);
  const dailyNutrition = sumNutrition(entries);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Today&apos;s Calories</h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear Log
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading your log…</p>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No items yet. Analyze a food and add it to your log.
        </p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 font-medium">Food Item</th>
                <th className="py-2 text-right font-medium">Calories</th>
                <th className="py-2 text-right font-medium sr-only">Remove</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2.5 text-slate-800 dark:text-slate-200">{entry.foodName}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                    {entry.calories}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      aria-label={`Remove ${entry.foodName}`}
                      className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Total Calories</span>
            <span className="text-lg font-bold text-brand-600 dark:text-brand-500">{total} kcal</span>
          </div>

          <div className="mt-4">
            <NutritionBreakdown
              nutrition={dailyNutrition}
              title="Daily Totals (estimated)"
              compact
            />
          </div>
        </>
      )}
    </section>
  );
}
