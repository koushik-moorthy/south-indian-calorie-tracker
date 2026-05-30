"use client";

import { useState } from "react";
import type { WeightEntry } from "@/lib/types";
import type { PlanProfile, StoredPlan } from "@/lib/plan";
import { createPlan, saveSettings } from "@/lib/api";
import { todayKey } from "@/lib/dates";
import BmiBar from "./BmiBar";
import ProgressChart from "./ProgressChart";
import WeightCheckIn from "./WeightCheckIn";
import PlanForm from "./PlanForm";

interface Props {
  plan: StoredPlan | null;
  weights: WeightEntry[];
  onPlanSaved: (stored: StoredPlan) => void;
  onAddWeight: (weightKg: number) => Promise<void>;
  onRemoveWeight: (id: string) => Promise<void>;
}

export default function PlanPanel({
  plan,
  weights,
  onPlanSaved,
  onAddWeight,
  onRemoveWeight,
}: Props) {
  const [open, setOpen] = useState(!plan);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(profile: PlanProfile) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createPlan(profile);
      const stored: StoredPlan = {
        profile,
        result,
        startWeightKg: profile.weightKg,
        startDate: todayKey(),
        createdAt: new Date().toISOString(),
      };
      await saveSettings({ plan: stored, dailyGoal: result.dailyCalories });
      onPlanSaved(stored);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build your plan.");
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = editing || !plan;
  const latestWeight = weights.length ? weights[weights.length - 1].weightKg : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          🎯 Your Plan
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              plan
                ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            {plan ? `${plan.result.dailyCalories.toLocaleString()} kcal/day` : "Set up"}
          </span>
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          {showForm ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter your details and goal — we&apos;ll estimate a safe daily calorie
                target and chart your progress.
              </p>
              <PlanForm
                initial={plan?.profile ?? null}
                submitting={submitting}
                error={error}
                onSubmit={handleSubmit}
                onCancel={plan ? () => setEditing(false) : undefined}
              />
            </>
          ) : (
            plan && (
              <PlanSummary
                plan={plan}
                weights={weights}
                latestWeight={latestWeight}
                onEdit={() => setEditing(true)}
                onAddWeight={onAddWeight}
                onRemoveWeight={onRemoveWeight}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function PlanSummary({
  plan,
  weights,
  latestWeight,
  onEdit,
  onAddWeight,
  onRemoveWeight,
}: {
  plan: StoredPlan;
  weights: WeightEntry[];
  latestWeight: number | null;
  onEdit: () => void;
  onAddWeight: (weightKg: number) => Promise<void>;
  onRemoveWeight: (id: string) => Promise<void>;
}) {
  const { profile, result } = plan;
  const currentWeight = latestWeight ?? profile.weightKg;
  const losing = result.weeklyRateKg < 0;
  const rateAbs = Math.abs(result.weeklyRateKg);
  const maintenance = result.tdee;
  const calorieDiff = maintenance != null ? maintenance - result.dailyCalories : null;

  return (
    <div className="space-y-4">
      {/* Headline target */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Daily target</p>
          <p className="text-3xl font-bold text-brand-600 dark:text-brand-500">
            {result.dailyCalories.toLocaleString()}
            <span className="ml-1 text-base font-normal text-slate-400">kcal</span>
          </p>
          {rateAbs > 0 && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {losing ? "Lose" : "Gain"} ~{rateAbs} kg/week → {profile.goalWeightKg} kg by{" "}
              {profile.targetDate}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Edit plan
        </button>
      </div>

      {/* Maintenance + deficit/surplus, as tidy stat tiles */}
      {maintenance != null && (
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Maintenance</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {maintenance.toLocaleString()}
              <span className="ml-0.5 text-xs font-normal text-slate-400">kcal/day</span>
            </div>
          </div>
          {calorieDiff != null && Math.abs(calorieDiff) >= 25 && (
            <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Daily {calorieDiff > 0 ? "deficit" : "surplus"}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {Math.abs(calorieDiff).toLocaleString()}
                <span className="ml-0.5 text-xs font-normal text-slate-400">kcal</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!result.feasible && result.adjustedTargetDate && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          That timeframe needs a faster-than-safe pace. A realistic target date is{" "}
          <span className="font-semibold">{result.adjustedTargetDate}</span>.
        </p>
      )}

      {/* BMI now + at goal */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BmiBar weightKg={currentWeight} heightCm={profile.heightCm} label="BMI now" />
        <BmiBar weightKg={profile.goalWeightKg} heightCm={profile.heightCm} label="BMI at goal" />
      </div>

      {/* Daily macro targets */}
      {result.macros && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {([
            ["Protein", result.macros.protein_g],
            ["Carbs", result.macros.carbs_g],
            ["Fat", result.macros.fat_g],
            ["Fiber", result.macros.fiber_g],
            ["Sugar", result.macros.sugar_g],
          ] as const).map(([label, g]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {g}
                <span className="ml-0.5 text-xs font-normal text-slate-400">g</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      {result.summary && (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {result.summary}
        </p>
      )}

      {/* Progress chart */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Progress
        </h3>
        <ProgressChart
          startWeightKg={plan.startWeightKg}
          goalWeightKg={profile.goalWeightKg}
          startDate={plan.startDate}
          targetDate={profile.targetDate}
          weights={weights}
        />
      </div>

      <WeightCheckIn weights={weights} onAdd={onAddWeight} onRemove={onRemoveWeight} />

      <p className="text-xs text-slate-400">
        {result.safetyNote ? `${result.safetyNote} ` : ""}These are estimates, not medical
        advice — consult a professional before significant changes.
      </p>
    </div>
  );
}
