"use client";

import { useState } from "react";
import type { LogEntry, Nutrition } from "@/lib/types";
import { totalCalories } from "@/lib/api";
import { sumNutrition } from "@/lib/nutrition";
import {
  todayKey,
  entriesForDay,
  shiftDayKey,
  formatDayLabel,
} from "@/lib/dates";
import NutritionBreakdown from "./NutritionBreakdown";
import ExportButtons from "./ExportButtons";
import LogEntryEditor from "./LogEntryEditor";

interface Props {
  /** All of the user's entries, across every day. */
  entries: LogEntry[];
  loading?: boolean;
  onRemove: (id: string) => void;
  /** Update a logged entry's name/calories/macros. */
  onUpdate: (
    id: string,
    patch: { foodName: string; calories: number; nutrition: Nutrition }
  ) => Promise<void>;
  /** Clear all entries on the given day key ("YYYY-MM-DD"). */
  onClearDay: (dayKey: string) => void;
}

export default function DailyLog({
  entries,
  loading = false,
  onRemove,
  onUpdate,
  onClearDay,
}: Props) {
  const [selectedDay, setSelectedDay] = useState(() => todayKey());
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = todayKey();
  const isToday = selectedDay === today;
  const dayEntries = entriesForDay(entries, selectedDay);
  const total = totalCalories(dayEntries);
  const dayNutrition = sumNutrition(dayEntries);

  const navBtn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Calorie Log
        </h2>
        {dayEntries.length > 0 && (
          <button
            type="button"
            onClick={() => onClearDay(selectedDay)}
            className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear this day
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
          {/* Day navigator */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedDay((k) => shiftDayKey(k, -1))}
              aria-label="Previous day"
              className={navBtn}
            >
              ‹
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatDayLabel(selectedDay, today)}
              </div>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(today)}
                  className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-500"
                >
                  Jump to today
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay((k) => shiftDayKey(k, 1))}
              disabled={isToday}
              aria-label="Next day"
              className={navBtn}
            >
              ›
            </button>
          </div>

          {dayEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nothing logged on this day.
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
                  {dayEntries.map((entry) =>
                    editingId === entry.id ? (
                      <tr key={entry.id}>
                        <td colSpan={3} className="py-2">
                          <LogEntryEditor
                            entry={entry}
                            onSave={(patch) => onUpdate(entry.id, patch)}
                            onClose={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={entry.id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-2.5 text-slate-800 dark:text-slate-200">
                          {entry.foodName}
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          {entry.calories.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => setEditingId(entry.id)}
                              aria-label={`Edit ${entry.foodName}`}
                              className="text-slate-400 transition hover:text-brand-600 dark:hover:text-brand-500"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemove(entry.id)}
                              aria-label={`Remove ${entry.foodName}`}
                              className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Total Calories
                </span>
                <span className="text-lg font-bold text-brand-600 dark:text-brand-500">
                  {total.toLocaleString()} kcal
                </span>
              </div>

              <div className="mt-4">
                <NutritionBreakdown
                  nutrition={dayNutrition}
                  title="Day Totals (estimated)"
                  compact
                />
              </div>
            </>
          )}

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <ExportButtons entries={entries} />
          </div>
        </>
      )}
    </section>
  );
}
