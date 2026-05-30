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

export default function FastingTimer({ fasting, onChange }: Props) {
  const active = Boolean(fasting.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const presetSelected = FASTING_PRESETS.includes(fasting.targetHours);
  const [customMode, setCustomMode] = useState(!presetSelected);
  const [customInput, setCustomInput] = useState(String(fasting.targetHours));

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
    setNow(Date.now());
    onChange({ ...fasting, startedAt: new Date().toISOString() });
  }
  function end() {
    if (!fasting.startedAt) return;
    onChange({
      ...fasting,
      startedAt: null,
      lastEndedAt: new Date().toISOString(),
      lastDurationSec: elapsedSeconds(fasting.startedAt, Date.now()),
    });
  }
  function setTarget(hours: number) {
    if (!Number.isFinite(hours) || hours <= 0 || hours > 48) return;
    onChange({ ...fasting, targetHours: Math.round(hours) });
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

      {/* Window picker (when idle) */}
      {!active && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
      )}

      {/* Live timer (when active) */}
      {active && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-500">
              {formatDuration(elapsed)}
            </span>
            <span className="text-xs text-slate-400">
              of {fasting.targetHours}h{reached ? " · goal reached 🎉" : ""}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${reached ? "bg-green-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {!active && lastToday && fasting.lastDurationSec != null && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Last fast today: <span className="font-medium">{formatDuration(fasting.lastDurationSec)}</span>{" "}
          (target {fasting.targetHours}h).
        </p>
      )}
    </section>
  );
}
