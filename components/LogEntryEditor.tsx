"use client";

import { useState } from "react";
import type { LogEntry, Nutrition } from "@/lib/types";
import { NUTRIENT_FIELDS } from "@/lib/nutrition";

interface Props {
  entry: LogEntry;
  onSave: (patch: {
    foodName: string;
    calories: number;
    nutrition: Nutrition;
  }) => Promise<void>;
  onClose: () => void;
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30";

export default function LogEntryEditor({ entry, onSave, onClose }: Props) {
  const [name, setName] = useState(entry.foodName);
  const [calories, setCalories] = useState(String(entry.calories));
  const [macros, setMacros] = useState<Record<keyof Nutrition, string>>(() => {
    const init = {} as Record<keyof Nutrition, string>;
    for (const f of NUTRIENT_FIELDS) {
      const v = entry.nutrition?.[f.key];
      init[f.key] = v != null ? String(v) : "";
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const food = name.trim();
    const kcal = parseInt(calories, 10);
    if (!food) {
      setError("Food name can't be empty.");
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setError("Enter calories (0 or more).");
      return;
    }

    const nutrition = {} as Nutrition;
    for (const f of NUTRIENT_FIELDS) {
      const raw = macros[f.key].trim();
      if (raw === "") {
        nutrition[f.key] = null;
        continue;
      }
      const n = parseFloat(raw);
      nutrition[f.key] = Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
    }

    setSaving(true);
    try {
      await onSave({ foodName: food, calories: kcal, nutrition });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/10"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Food name"
          aria-label="Food name"
          className={`flex-1 ${fieldClass}`}
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="kcal"
          aria-label="Calories"
          className={`sm:w-24 ${fieldClass}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {NUTRIENT_FIELDS.map((f) => (
          <label key={f.key} className="text-xs text-slate-500 dark:text-slate-400">
            {f.label} ({f.unit})
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={macros[f.key]}
              onChange={(e) => setMacros((m) => ({ ...m, [f.key]: e.target.value }))}
              aria-label={f.label}
              className={`mt-0.5 ${fieldClass}`}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
