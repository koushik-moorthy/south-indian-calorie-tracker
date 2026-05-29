"use client";

import type { AnalysisResult, Confidence } from "@/lib/types";
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

export default function ResultCard({ result, onAdd, saving = false }: Props) {
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
        <Row label="Quantity" value={String(result.quantity)} />
        <Row label="Calories" value={`${result.calories} kcal`} />
      </dl>

      {result.notes && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {result.notes}
        </p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <NutritionBreakdown nutrition={result.nutrition} />
      </div>

      <button
        type="button"
        onClick={() => onAdd(result)}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {saving ? "Saving…" : "Add to Daily Log"}
      </button>
    </div>
  );
}
