"use client";

import { bmi as calcBmi, bmiCategory, type BmiCategory } from "@/lib/health";

const CATEGORY_COLOR: Record<BmiCategory, string> = {
  Underweight: "text-sky-600 dark:text-sky-400",
  Normal: "text-green-600 dark:text-green-400",
  Overweight: "text-amber-600 dark:text-amber-400",
  Obese: "text-red-600 dark:text-red-400",
};

const MIN = 15;
const MAX = 40;

/** Compact BMI readout: value + category over a slim color-zoned gauge. */
export default function BmiBar({
  weightKg,
  heightCm,
  label = "BMI",
}: {
  weightKg: number;
  heightCm: number;
  label?: string;
}) {
  const value = calcBmi(weightKg, heightCm);
  if (!value) return null;

  const category = bmiCategory(value);
  const pct = Math.min(100, Math.max(0, ((value - MIN) / (MAX - MIN)) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
        <span className="text-sm">
          <span className="font-bold text-slate-900 dark:text-slate-100">{value}</span>{" "}
          <span className={`font-medium ${CATEGORY_COLOR[category]}`}>{category}</span>
        </span>
      </div>
      <div
        className="relative mt-1.5 h-2 w-full rounded-full"
        style={{
          background: "linear-gradient(90deg,#38bdf8 0%,#22c55e 30%,#f59e0b 62%,#ef4444 100%)",
        }}
      >
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow dark:border-slate-900 dark:bg-white"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
