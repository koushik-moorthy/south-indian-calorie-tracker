import { dayKey } from "./dates";

/** Current/last fasting state for a user. */
export interface FastingState {
  targetHours: number;
  startedAt: string | null; // ISO timestamp of the active fast, or null
  lastEndedAt: string | null; // ISO timestamp the last fast ended
  lastDurationSec: number | null; // duration of the last completed fast
}

/** Selectable preset windows (hours); users can also enter a custom value. */
export const FASTING_PRESETS = [12, 14, 16, 18, 20, 24];

export function defaultFasting(): FastingState {
  return { targetHours: 16, startedAt: null, lastEndedAt: null, lastDurationSec: null };
}

/** Whole seconds elapsed since an ISO start time (never negative). */
export function elapsedSeconds(startedAtISO: string, nowMs: number): number {
  const start = Date.parse(startedAtISO);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((nowMs - start) / 1000));
}

/** Format a number of seconds as "Hh MMm SSs". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

/** Elapsed time as a percentage of the target window, clamped to 0..100. */
export function progressPct(elapsedSec: number, targetHours: number): number {
  const target = targetHours * 3600;
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (elapsedSec / target) * 100));
}

export interface FastingSummary {
  status: "active" | "completed" | "none";
  hours: number;
  targetHours: number;
}

function hours1dp(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

/**
 * Summarize today's fasting for the end-of-day insights: an active fast (hours
 * so far), a fast completed earlier today, or none.
 */
export function fastingForInsights(
  state: FastingState,
  todayKey: string,
  nowMs: number
): FastingSummary {
  if (state.startedAt) {
    return {
      status: "active",
      hours: hours1dp(elapsedSeconds(state.startedAt, nowMs)),
      targetHours: state.targetHours,
    };
  }
  if (
    state.lastEndedAt &&
    state.lastDurationSec != null &&
    dayKey(Date.parse(state.lastEndedAt)) === todayKey
  ) {
    return {
      status: "completed",
      hours: hours1dp(state.lastDurationSec),
      targetHours: state.targetHours,
    };
  }
  return { status: "none", hours: 0, targetHours: state.targetHours };
}
