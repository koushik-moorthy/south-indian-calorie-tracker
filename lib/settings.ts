export const DEFAULT_MODEL = "gpt-4o-mini";

/** A few common vision-capable chat models, offered as suggestions in the UI. */
export const MODEL_SUGGESTIONS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
];

/** Per-user settings as returned by /api/settings (never includes the raw key). */
export interface UserSettings {
  hasKey: boolean;
  model: string;
  dailyGoal: number | null;
}
