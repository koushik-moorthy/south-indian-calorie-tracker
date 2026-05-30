"use client";

import type { Nutrition } from "@/lib/types";
import { NUTRIENT_FIELDS, hasAnyNutrition } from "@/lib/nutrition";

interface Props {
  nutrition: Nutrition;
  /** Heading text; pass null to render without a heading. */
  title?: string | null;
  compact?: boolean;
}

export default function NutritionBreakdown({
  nutrition,
  title = "Macros (estimated)",
  compact = false,
}: Props) {
  if (!hasAnyNutrition(nutrition)) return null;

  const fields = NUTRIENT_FIELDS.filter((f) => nutrition[f.key] != null);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {title && (
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {fields.map((f) => (
          <div
            key={f.key}
            className="rounded-lg bg-slate-50 px-3 py-2 text-center dark:bg-slate-800"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {nutrition[f.key]}
              <span className="ml-0.5 text-xs font-normal text-slate-400">{f.unit}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
