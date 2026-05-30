"use client";

import { getAccessToken } from "./supabaseBrowser";
import type { AnalysisResult, ApiError, LogEntry } from "./types";
import type { UserSettings } from "./settings";

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

export async function analyzeImage(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("image", file);
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

export async function addLogEntry(result: AnalysisResult): Promise<LogEntry> {
  const res = await fetch("/api/log", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({
      foodName: result.foodName,
      calories: result.calories,
      nutrition: result.nutrition,
    }),
  });
  if (!res.ok) throw await asError(res, "Could not add to your log.");
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
