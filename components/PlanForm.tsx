"use client";

import { useState } from "react";
import type { ActivityLevel, PlanProfile, Sex } from "@/lib/plan";

interface Props {
  initial?: PlanProfile | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (profile: PlanProfile) => void;
  onCancel?: () => void;
}

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary (little/no exercise)" },
  { value: "light", label: "Light (1–3 days/week)" },
  { value: "moderate", label: "Moderate (3–5 days/week)" },
  { value: "active", label: "Active (6–7 days/week)" },
  { value: "very_active", label: "Very active (hard daily training)" },
];

function defaultTargetDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 84); // ~12 weeks out
  return d.toISOString().slice(0, 10);
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30";
const labelClass = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400";

export default function PlanForm({
  initial,
  submitting = false,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [age, setAge] = useState(initial ? String(initial.age) : "");
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "male");
  const [heightCm, setHeightCm] = useState(initial ? String(initial.heightCm) : "");
  const [weightKg, setWeightKg] = useState(initial ? String(initial.weightKg) : "");
  const [bodyFatPct, setBodyFatPct] = useState(
    initial?.bodyFatPct != null ? String(initial.bodyFatPct) : ""
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initial?.activityLevel ?? "light"
  );
  const [goalWeightKg, setGoalWeightKg] = useState(
    initial ? String(initial.goalWeightKg) : ""
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? defaultTargetDate());
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    const fat = bodyFatPct.trim() === "" ? null : parseFloat(bodyFatPct);
    const profile: PlanProfile = {
      age: parseInt(age, 10),
      sex,
      heightCm: parseFloat(heightCm),
      weightKg: parseFloat(weightKg),
      bodyFatPct: fat,
      activityLevel,
      goalWeightKg: parseFloat(goalWeightKg),
      targetDate,
    };

    if (
      !Number.isFinite(profile.age) ||
      !Number.isFinite(profile.heightCm) ||
      !Number.isFinite(profile.weightKg) ||
      !Number.isFinite(profile.goalWeightKg)
    ) {
      setLocalError("Please fill in age, height, weight, and goal weight.");
      return;
    }
    onSubmit(profile);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="age" className={labelClass}>Age</label>
          <input id="age" type="number" min={13} max={100} value={age}
            onChange={(e) => setAge(e.target.value)} className={fieldClass} placeholder="30" />
        </div>
        <div>
          <label htmlFor="sex" className={labelClass}>Sex</label>
          <select id="sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)} className={fieldClass}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label htmlFor="height" className={labelClass}>Height (cm)</label>
          <input id="height" type="number" min={80} max={250} value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)} className={fieldClass} placeholder="175" />
        </div>
        <div>
          <label htmlFor="weight" className={labelClass}>Weight (kg)</label>
          <input id="weight" type="number" min={25} max={400} step={0.1} value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)} className={fieldClass} placeholder="80" />
        </div>
        <div>
          <label htmlFor="bodyfat" className={labelClass}>Body fat % (optional)</label>
          <input id="bodyfat" type="number" min={3} max={60} step={0.1} value={bodyFatPct}
            onChange={(e) => setBodyFatPct(e.target.value)} className={fieldClass} placeholder="e.g. 20" />
        </div>
        <div>
          <label htmlFor="goal" className={labelClass}>Goal weight (kg)</label>
          <input id="goal" type="number" min={25} max={400} step={0.1} value={goalWeightKg}
            onChange={(e) => setGoalWeightKg(e.target.value)} className={fieldClass} placeholder="72" />
        </div>
      </div>

      <div>
        <label htmlFor="activity" className={labelClass}>Activity level</label>
        <select id="activity" value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)} className={fieldClass}>
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="target" className={labelClass}>Target date</label>
        <input id="target" type="date" min={today} value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)} className={fieldClass} />
      </div>

      {(localError || error) && (
        <p className="text-sm text-red-600">{localError || error}</p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Building your plan…" : "Calculate my plan"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
