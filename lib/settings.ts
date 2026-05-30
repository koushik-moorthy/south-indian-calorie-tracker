export const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Popular vision-capable chat models shown in the Settings dropdown. All
 * support image input and JSON output, which the app relies on. Users can
 * still pick "Custom…" to enter any other model their key has access to.
 */
export const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "gpt-4o-mini", label: "GPT-4o mini — fast & affordable (recommended)" },
  { value: "gpt-4o", label: "GPT-4o — most capable multimodal" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini — balanced" },
  { value: "gpt-4.1", label: "GPT-4.1 — high accuracy" },
  { value: "gpt-4.1-nano", label: "GPT-4.1 nano — cheapest" },
];

import type { StoredPlan } from "./plan";
import type { FastingState } from "./fasting";

/** Per-user settings as returned by /api/settings (never includes the raw key). */
export interface UserSettings {
  hasKey: boolean;
  model: string;
  dailyGoal: number | null;
  plan: StoredPlan | null;
  fasting: FastingState | null;
}
