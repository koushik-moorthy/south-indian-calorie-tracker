"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { analyzeText } from "@/lib/api";
import ResultCard from "./ResultCard";

interface Props {
  onAddToLog: (result: AnalysisResult) => Promise<void>;
}

export default function TextInputForm({ onAddToLog }: Props) {
  const [food, setFood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = food.trim();
    if (!trimmed) {
      setError("Please enter a food name.");
      return;
    }

    setLoading(true);
    try {
      setResult(await analyzeText(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(scaled: AnalysisResult) {
    setError(null);
    setAdding(true);
    try {
      await onAddToLog(scaled);
      setResult(null);
      setFood("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to your log.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="food" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Food Name
        </label>
        <input
          id="food"
          type="text"
          value={food}
          onChange={(e) => setFood(e.target.value)}
          placeholder="e.g. 2 idlis, 1 masala dosa, 3 chapatis"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/30"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze Food"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && <ResultCard result={result} onAdd={handleAdd} saving={adding} />}
    </div>
  );
}
