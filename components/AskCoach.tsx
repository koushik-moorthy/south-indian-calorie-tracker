"use client";

import { useState } from "react";
import type { LogEntry } from "@/lib/types";
import type { StoredPlan } from "@/lib/plan";
import { askCoach, totalCalories } from "@/lib/api";
import { todayKey, entriesForDay } from "@/lib/dates";
import { sumNutrition } from "@/lib/nutrition";

interface Props {
  entries: LogEntry[];
  plan: StoredPlan | null;
  dailyGoal: number | null;
}

interface Exchange {
  q: string;
  a: string;
}

export default function AskCoach({ entries, plan, dailyGoal }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    try {
      const today = todayKey();
      const todayEntries = entriesForDay(entries, today);
      const { answer } = await askCoach(q, {
        dailyTarget: dailyGoal,
        consumedCalories: totalCalories(todayEntries),
        macroTargets: plan?.result.macros ?? null,
        consumedMacros: sumNutrition(todayEntries),
      });
      setHistory((h) => [...h, { q, a: answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer your question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Ask the coach
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ask anything — answers use today&apos;s calories &amp; macros.
      </p>

      {history.length > 0 && (
        <div className="mt-4 space-y-3">
          {history.map((x, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {x.q}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {x.a}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How do I hit my remaining carbs? What can I make with eggs & rice?"
          aria-label="Ask a question"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
