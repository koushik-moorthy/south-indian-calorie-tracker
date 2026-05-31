"use client";

import { useState } from "react";

interface Props {
  goal: number | null;
  consumed: number;
  onSave: (goal: number | null) => Promise<void>;
}

export default function DailyGoal({ goal, consumed, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setInput(goal ? String(goal) : "");
    setError(null);
    setEditing(true);
  }

  async function save(value: number | null) {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(input, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a goal greater than 0.");
      return;
    }
    await save(n);
  }

  // ---- Edit / set form ----
  if (editing || goal === null) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Daily Calorie Goal</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Set a goal and watch it count down as you log food.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 2000"
            autoFocus={editing}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">kcal / day</span>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save goal"}
          </button>
          {goal !== null && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          )}
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>
    );
  }

  // ---- Summary view ----
  const remaining = goal - consumed;
  const over = remaining < 0;
  const pct = Math.min(100, Math.max(0, (consumed / goal) * 100));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daily Calorie Goal</h2>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={startEdit}
            className="font-medium text-brand-700 hover:underline dark:text-brand-500"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => save(null)}
            disabled={saving}
            className="font-medium text-slate-400 hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {over ? "Over by" : "Remaining"}
          </p>
          <p
            className={`text-3xl font-bold ${over ? "text-red-600 dark:text-red-400" : "text-brand-600 dark:text-brand-500"}`}
          >
            {Math.abs(remaining)}
            <span className="ml-1 text-base font-normal text-slate-400">kcal</span>
          </p>
        </div>
        <p className="text-right text-sm text-slate-500 dark:text-slate-400">
          {consumed} of {goal} kcal
        </p>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-brand-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
