"use client";

import { getAccessToken } from "./supabaseBrowser";
import type { AnalysisResult, ApiError, LogEntry, Nutrition, WeightEntry } from "./types";
import type { UserSettings } from "./settings";
import type { PlanProfile, PlanResult, StoredPlan } from "./plan";
import type { InsightsInput, InsightsResult } from "./insights";
import type { SuggestionInput, SuggestionsResult } from "./suggest";
import type { FastingState } from "./fasting";
import type { PerformanceInput, PerformanceResult } from "./performance";
import type { AskResult } from "./ask";

async function authHeaders(json = false): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function asError(res: Response, fallback: string): Promise<Error> {
  try {
    const data = (await res.json()) as ApiError;
    return new Error(data.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

// ---- Analysis ----

export async function analyzeText(food: string): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze-text", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ food }),
  });
  if (!res.ok) throw await asError(res, "Failed to analyze food.");
  return (await res.json()) as AnalysisResult;
}

export async function analyzeImage(file: File, note?: string): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("image", file);
  if (note && note.trim()) form.append("note", note.trim());
  const res = await fetch("/api/analyze-image", {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw await asError(res, "Failed to analyze image.");
  return (await res.json()) as AnalysisResult;
}

// ---- Daily log ----

export async function fetchLog(): Promise<LogEntry[]> {
  const res = await fetch("/api/log", { headers: await authHeaders() });
  if (!res.ok) throw await asError(res, "Could not load your log.");
  return (await res.json()) as LogEntry[];
}

export async function addLogEntry(
  result: AnalysisResult,
  addedAt?: number
): Promise<LogEntry> {
  const res = await fetch("/api/log", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({
      foodName: result.foodName,
      calories: result.calories,
      nutrition: result.nutrition,
      ...(addedAt ? { addedAt } : {}),
    }),
  });
  if (!res.ok) throw await asError(res, "Could not add to your log.");
  return (await res.json()) as LogEntry;
}

/** Add an entry by hand (name + calories), skipping AI analysis. */
export async function addManualEntry(
  foodName: string,
  calories: number,
  addedAt?: number
): Promise<LogEntry> {
  const res = await fetch("/api/log", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ foodName, calories, ...(addedAt ? { addedAt } : {}) }),
  });
  if (!res.ok) throw await asError(res, "Could not add to your log.");
  return (await res.json()) as LogEntry;
}

/** Update a logged entry's name, calories, and/or macros. */
export async function updateLogEntry(
  id: string,
  patch: { foodName?: string; calories?: number; nutrition?: Nutrition | null }
): Promise<LogEntry> {
  const res = await fetch("/api/log", {
    method: "PATCH",
    headers: await authHeaders(true),
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw await asError(res, "Could not update the item.");
  return (await res.json()) as LogEntry;
}

export async function removeLogEntry(id: string): Promise<void> {
  const res = await fetch(`/api/log?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw await asError(res, "Could not remove the item.");
}

// ---- Settings ----

export async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch("/api/settings", { headers: await authHeaders() });
  if (!res.ok) throw await asError(res, "Could not load settings.");
  return (await res.json()) as UserSettings;
}

export async function saveSettings(input: {
  apiKey?: string;
  model?: string;
  dailyGoal?: number | null;
  plan?: StoredPlan | null;
  fasting?: FastingState | null;
}): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await asError(res, "Could not save settings.");
}

export function totalCalories(entries: LogEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.calories || 0), 0);
}

// ---- Plan ----

export async function createPlan(profile: PlanProfile): Promise<PlanResult> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw await asError(res, "Could not build your plan.");
  return (await res.json()) as PlanResult;
}

// ---- Weight check-ins ----

export async function fetchWeights(): Promise<WeightEntry[]> {
  const res = await fetch("/api/weight", { headers: await authHeaders() });
  if (!res.ok) throw await asError(res, "Could not load your weight history.");
  return (await res.json()) as WeightEntry[];
}

export async function addWeight(
  weightKg: number,
  recordedOn?: string
): Promise<WeightEntry> {
  const res = await fetch("/api/weight", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ weightKg, recordedOn }),
  });
  if (!res.ok) throw await asError(res, "Could not save your weight.");
  return (await res.json()) as WeightEntry;
}

export async function removeWeight(id: string): Promise<void> {
  const res = await fetch(`/api/weight?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw await asError(res, "Could not remove the check-in.");
}

// ---- Insights ----

export async function getInsights(input: InsightsInput): Promise<InsightsResult> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await asError(res, "Could not generate insights.");
  return (await res.json()) as InsightsResult;
}

// ---- Food suggestions ----

export async function getSuggestions(
  input: SuggestionInput
): Promise<SuggestionsResult> {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await asError(res, "Could not get suggestions.");
  return (await res.json()) as SuggestionsResult;
}

export async function askCoach(
  question: string,
  context: SuggestionInput
): Promise<AskResult> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ question, context }),
  });
  if (!res.ok) throw await asError(res, "Could not answer your question.");
  return (await res.json()) as AskResult;
}

// ---- Performance review ----

export async function getPerformance(
  input: PerformanceInput
): Promise<PerformanceResult> {
  const res = await fetch("/api/performance", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await asError(res, "Could not generate your review.");
  return (await res.json()) as PerformanceResult;
}
