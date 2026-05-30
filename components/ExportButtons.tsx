"use client";

import type { LogEntry } from "@/lib/types";
import { entriesToCsv, entriesToJson } from "@/lib/export";
import { downloadTextFile } from "@/lib/download";
import { todayKey } from "@/lib/dates";

/** Download buttons for the full log (all days), as CSV or JSON. */
export default function ExportButtons({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;

  const stamp = todayKey();
  const btn =
    "rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Export log</span>
      <button
        type="button"
        className={btn}
        onClick={() =>
          downloadTextFile(`calories-${stamp}.csv`, "text/csv;charset=utf-8", entriesToCsv(entries))
        }
      >
        CSV
      </button>
      <button
        type="button"
        className={btn}
        onClick={() =>
          downloadTextFile(
            `calories-${stamp}.json`,
            "application/json",
            entriesToJson(entries)
          )
        }
      >
        JSON
      </button>
    </div>
  );
}
