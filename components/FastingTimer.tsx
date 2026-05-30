"use client";

import { useEffect, useState } from "react";
import {
  FASTING_PRESETS,
  elapsedSeconds,
  formatDuration,
  progressPct,
  type FastingState,
} from "@/lib/fasting";
import { todayKey } from "@/lib/dates";

interface Props {
  fasting: FastingState;
  /** Persist + update the fasting state. */
  onChange: (next: FastingState) => void;
}

/** Format a Date as a value for <input type="datetime-local"> (local time). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const timeInputClass =
  "rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30";
const linkClass =
  "text-xs font-medium text-brand-700 hover:underline dark:text-brand-500";

export default function FastingTimer({ fasting, onChange }: Props) {
  const active = Boolean(fasting.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const presetSelected = FASTING_PRESETS.includes(fasting.targetHours);
  const [customMode, setCustomMode] = useState(!presetSelected);
  const [customInput, setCustomInput] = useState(String(fasting.targetHours));

  const [manualStart, setManualStart] = useState(false);
  const [startTimeVal, setStartTimeVal] = useState("");
  const [manualEnd, setManualEnd] = useState(false);
  const [endTimeVal, setEndTimeVal] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Tick every second while a fast is running.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const elapsed = active && fasting.startedAt ? elapsedSeconds(fasting.startedAt, now) : 0;
  const pct = progressPct(elapsed, fasting.targetHours);
  const reached = elapsed >= fasting.targetHours * 3600;

  function start() {
    setError(null);
    const startMs = manualStart && startTimeVal ? new Date(startTimeVal).getTime() : Date.now();
    if (!Number.isFinite(startMs)) {
      setError("Enter a valid start time.");
      return;
    }
    if (startMs > Date.now() + 60_000) {
      setError("Start time can't be in the future.");
      return;
    }
    setNow(Date.now());
    setManualStart(false);
    onChange({ ...fasting, startedAt: new Date(startMs).toISOString() });
  }

  function end() {
    if (!fasting.startedAt) return;
    setError(null);
    const startMs = Date.parse(fasting.startedAt);
    const endMs = manualEnd && endTimeVal ? new Date(endTimeVal).getTime() : Date.now();
    if (!Number.isFinite(endMs)) {
      setError("Enter a valid end time.");
      return;
    }
    if (endMs > Date.now() + 60_000) {
      setError("End time can't be in the future.");
      return;
    }
    if (endMs < startMs) {
      setError("End time must be after the start time.");
      return;
    }
    setManualEnd(false);
    onChange({
      ...fasting,
      startedAt: null,
      lastEndedAt: new Date(endMs).toISOString(),
      lastDurationSec: Math.floor((endMs - startMs) / 1000),
    });
  }

  function setTarget(hours: number) {
    if (!Number.isFinite(hours) || hours <= 0 || hours > 48) return;
    onChange({ ...fasting, targetHours: Math.round(hours) });
  }

  function toggleManualStart() {
    setError(null);
    setManualStart((on) => {
      if (!on) setStartTimeVal(toLocalInput(new Date()));
      return !on;
    });
  }
  function toggleManualEnd() {
    setError(null);
    setManualEnd((on) => {
      if (!on) setEndTimeVal(toLocalInput(new Date()));
      return !on;
    });
  }

  const lastToday =
    fasting.lastEndedAt != null &&
    fasting.lastDurationSec != null &&
    todayKey(Date.parse(fasting.lastEndedAt)) === todayKey();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fasting</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {active ? "Fast in progress — keep going!" : "Pick a window and start your fast."}
          </p>
        </div>
        {active ? (
          <button
            type="button"
            onClick={end}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            End fast
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Start fast
          </button>
        )}
      </div>

      {/* Window picker + optional manual start time (when idle) */}
      {!active && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="fast-window" className="text-sm text-slate-600 dark:text-slate-400">
              Window
            </label>
            <select
              id="fast-window"
              value={customMode ? "custom" : String(fasting.targetHours)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") {
                  setCustomMode(true);
                } else {
                  setCustomMode(false);
                  setTarget(Number(v));
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
            >
              {FASTING_PRESETS.map((h) => (
                <option key={h} value={h}>
                  {h}:{24 - h} · {h}h fast
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {customMode && (
              <input
                type="number"
                min={1}
                max={48}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onBlur={() => setTarget(parseInt(customInput, 10))}
                placeholder="Hours"
                aria-label="Custom fasting hours"
                className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleManualStart} className={linkClass}>
              {manualStart ? "Use current time" : "Set start time"}
            </button>
            {manualStart && (
              <input
                type="datetime-local"
                value={startTimeVal}
                max={toLocalInput(new Date())}
                onChange={(e) => setStartTimeVal(e.target.value)}
                aria-label="Fast start time"
                className={timeInputClass}
              />
            )}
          </div>
        </div>
      )}

      {/* Live timer + optional manual end time (when active) */}
      {active && (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-500">
              {formatDuration(elapsed)}
            </span>
            <span className="text-xs text-slate-400">
              of {fasting.targetHours}h{reached ? " · goal reached 🎉" : ""}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${reached ? "bg-green-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" onClick={toggleManualEnd} className={linkClass}>
              {manualEnd ? "End now instead" : "Set end time"}
            </button>
            {manualEnd && (
              <input
                type="datetime-local"
                value={endTimeVal}
                max={toLocalInput(new Date())}
                onChange={(e) => setEndTimeVal(e.target.value)}
                aria-label="Fast end time"
                className={timeInputClass}
              />
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!active && lastToday && fasting.lastDurationSec != null && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Last fast today: <span className="font-medium">{formatDuration(fasting.lastDurationSec)}</span>{" "}
          (target {fasting.targetHours}h).
        </p>
      )}
    </section>
  );
}
