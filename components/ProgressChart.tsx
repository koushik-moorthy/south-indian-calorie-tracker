"use client";

import type { WeightEntry } from "@/lib/types";
import { todayKey } from "@/lib/dates";

interface Props {
  startWeightKg: number;
  goalWeightKg: number;
  startDate: string; // "YYYY-MM-DD"
  targetDate: string; // "YYYY-MM-DD"
  weights: WeightEntry[];
}

// Fixed coordinate space; the SVG scales responsively via viewBox.
const W = 340;
const H = 180;
const PAD = { l: 36, r: 12, t: 14, b: 22 };

function dayIndex(key: string, startKey: string): number {
  const [ay, am, ad] = startKey.split("-").map(Number);
  const [by, bm, bd] = key.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export default function ProgressChart({
  startWeightKg,
  goalWeightKg,
  startDate,
  targetDate,
  weights,
}: Props) {
  const today = todayKey();
  const totalDays = Math.max(1, dayIndex(targetDate, startDate));
  const todayIdx = dayIndex(today, startDate);

  const points = weights
    .map((w) => ({ idx: dayIndex(w.recordedOn, startDate), kg: w.weightKg }))
    .sort((a, b) => a.idx - b.idx);

  const xMax = Math.max(totalDays, todayIdx, ...points.map((p) => p.idx), 1);

  const allWeights = [startWeightKg, goalWeightKg, ...points.map((p) => p.kg)];
  let yMin = Math.min(...allWeights);
  let yMax = Math.max(...allWeights);
  if (yMax - yMin < 2) {
    yMin -= 1;
    yMax += 1;
  } else {
    yMin -= 0.6;
    yMax += 0.6;
  }

  const X = (idx: number) => PAD.l + (idx / xMax) * (W - PAD.l - PAD.r);
  const Y = (kg: number) =>
    PAD.t + (1 - (kg - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const projStart = { x: X(0), y: Y(startWeightKg) };
  const projEnd = { x: X(totalDays), y: Y(goalWeightKg) };

  const actualPath = points.map((p) => `${X(p.idx)},${Y(p.kg)}`).join(" ");
  const showToday = todayIdx >= 0 && todayIdx <= xMax;
  const latest = points.length ? points[points.length - 1] : null;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Projected and actual weight over time"
      >
        {/* y-axis gridlines + labels (start / goal weight) */}
        {[yMax, (yMax + yMin) / 2, yMin].map((kg, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={Y(kg)}
              y2={Y(kg)}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={1}
            />
            <text
              x={PAD.l - 5}
              y={Y(kg) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px]"
            >
              {kg.toFixed(0)}
            </text>
          </g>
        ))}

        {/* goal level */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={Y(goalWeightKg)}
          y2={Y(goalWeightKg)}
          className="stroke-green-500/60"
          strokeWidth={1}
          strokeDasharray="2 3"
        />

        {/* today marker */}
        {showToday && (
          <line
            x1={X(todayIdx)}
            x2={X(todayIdx)}
            y1={PAD.t}
            y2={H - PAD.b}
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth={1}
          />
        )}

        {/* projected trajectory */}
        <line
          x1={projStart.x}
          y1={projStart.y}
          x2={projEnd.x}
          y2={projEnd.y}
          className="stroke-slate-400"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
        />

        {/* actual check-ins */}
        {points.length > 1 && (
          <polyline
            points={actualPath}
            fill="none"
            className="stroke-brand-500"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={X(p.idx)}
            cy={Y(p.kg)}
            r={3}
            className="fill-brand-500"
          />
        ))}

        {/* start + goal endpoints */}
        <circle cx={projStart.x} cy={projStart.y} r={3} className="fill-slate-400" />
        <circle cx={projEnd.x} cy={projEnd.y} r={3.5} className="fill-green-500" />

        {/* x-axis date labels */}
        <text x={PAD.l} y={H - 6} textAnchor="start" className="fill-slate-400 text-[9px]">
          {startDate.slice(5)}
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="fill-slate-400 text-[9px]">
          {targetDate.slice(5)}
        </text>
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-slate-400" style={{ borderTop: "2px dashed" }} />
          Projected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-500" />
          Your check-ins
        </span>
        {latest && (
          <span className="ml-auto">
            Latest: <span className="font-semibold text-slate-700 dark:text-slate-200">{latest.kg} kg</span>
          </span>
        )}
      </div>
    </div>
  );
}
