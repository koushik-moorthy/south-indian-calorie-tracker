"use client";

import { useState } from "react";

interface Props {
  /** Add the entry straight to today's log. Resolves once saved. */
  onAdd: (foodName: string, calories: number) => Promise<void>;
}

export default function ManualEntryForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);

    const food = name.trim();
    const kcal = parseInt(calories, 10);
    if (!food) {
      setError("Enter a food name.");
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setError("Enter calories (0 or more).");
      return;
    }

    setSaving(true);
    try {
      await onAdd(food, kcal);
      setName("");
      setCalories("");
      setSavedMsg(`Added “${food}” to today's log.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to your log.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Add Manually
      </span>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSavedMsg(null);
          }}
          placeholder="Food name (e.g. Chicken biryani)"
          autoComplete="off"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/30"
        />
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={calories}
          onChange={(e) => {
            setCalories(e.target.value);
            setSavedMsg(null);
          }}
          placeholder="kcal"
          aria-label="Calories"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-24 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/30"
        />
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedMsg && <p className="text-sm text-green-600">{savedMsg}</p>}
    </form>
  );
}
