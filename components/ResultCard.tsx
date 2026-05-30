"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult, Confidence } from "@/lib/types";
import { scaleResult } from "@/lib/scale";
import NutritionBreakdown from "./NutritionBreakdown";

interface Props {
  result: AnalysisResult;
  onAdd: (result: AnalysisResult) => void;
  saving?: boolean;
}

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

const MIN_SERVINGS = 0.5;

export default function ResultCard({ result, onAdd, saving = false }: Props) {
  // A serving multiplier applied on top of the analyzed amount (e.g. "I ate 2").
  const [servings, setServings] = useState(1);

  // Reset to a single serving whenever a fresh analysis arrives.
  useEffect(() => setServings(1), [result]);

  const factor = Number.isFinite(servings) && servings > 0 ? servings : 1;
  const scaled = useMemo(() => scaleResult(result, factor), [result, factor]);
  const adjusted = factor !== 1;

  function step(delta: number) {
    setServings((s) => Math.max(MIN_SERVINGS, Math.round((s + delta) * 2) / 2));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {result.foodName}
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${confidenceStyles[result.confidence]}`}
        >
          {result.confidence} confidence
        </span>
      </div>

      <dl className="divide-y divide-slate-100 dark:divide-slate-800">
        <Row label="Serving Size" value={result.servingSize} />
        <Row label="Quantity" value={String(scaled.quantity)} />
        <Row label="Calories" value={`${scaled.calories.toLocaleString()} kcal`} />
      </dl>

      {result.notes && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {result.notes}
        </p>
      )}

      {/* Servings adjuster */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
        <div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Servings
          </span>
          {adjusted && (
            <span className="ml-2 text-xs text-slate-400">×{factor} of analyzed amount</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-0.5)}
            disabled={factor <= MIN_SERVINGS}
            aria-label="Decrease servings"
            className="h-8 w-8 rounded-md border border-slate-300 text-lg leading-none text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            −
          </button>
          <input
            type="number"
            inputMode="decimal"
            min={MIN_SERVINGS}
            step={0.5}
            value={servings}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              setServings(Number.isFinite(n) && n > 0 ? n : MIN_SERVINGS);
            }}
            aria-label="Servings"
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-brand-500/30"
          />
          <button
            type="button"
            onClick={() => step(0.5)}
            aria-label="Increase servings"
            className="h-8 w-8 rounded-md border border-slate-300 text-lg leading-none text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <NutritionBreakdown nutrition={scaled.nutrition} />
      </div>

      <button
        type="button"
        onClick={() => onAdd(scaled)}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {saving ? "Saving…" : "Add to Daily Log"}
      </button>
    </div>
  );
}
