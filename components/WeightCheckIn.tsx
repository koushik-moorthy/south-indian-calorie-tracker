"use client";

import { useState } from "react";
import type { WeightEntry } from "@/lib/types";
import { todayKey, formatDayLabel } from "@/lib/dates";

interface Props {
  weights: WeightEntry[];
  onAdd: (weightKg: number) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export default function WeightCheckIn({ weights, onAdd, onRemove }: Props) {
  const today = todayKey();
  const todayEntry = weights.find((w) => w.recordedOn === today) ?? null;

  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recent = [...weights].reverse().slice(0, 5);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const kg = parseFloat(value);
    if (!Number.isFinite(kg) || kg < 25 || kg > 400) {
      setError("Enter a weight between 25 and 400 kg.");
      return;
    }
    setSaving(true);
    try {
      await onAdd(kg);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Daily weight check-in
        </h4>
        {todayEntry && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
            Today: {todayEntry.weightKg} kg
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step={0.1}
          min={25}
          max={400}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={todayEntry ? `Update (${todayEntry.weightKg})` : "Today's weight (kg)"}
          className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : todayEntry ? "Update" : "Log"}
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      {recent.length > 0 && (
        <ul className="mt-3 space-y-1">
          {recent.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
            >
              <span>{formatDayLabel(w.recordedOn, today)}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {w.weightKg} kg
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(w.id)}
                  aria-label={`Remove check-in for ${w.recordedOn}`}
                  className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
