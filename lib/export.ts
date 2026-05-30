import type { LogEntry, Nutrition } from "./types";
import { dayKey } from "./dates";

/** Nutrient columns, in the order they appear in exports. */
const NUTRIENT_COLUMNS: Array<{ key: keyof Nutrition; header: string }> = [
  { key: "protein_g", header: "Protein (g)" },
  { key: "carbs_g", header: "Carbs (g)" },
  { key: "fat_g", header: "Fat (g)" },
  { key: "fiber_g", header: "Fiber (g)" },
  { key: "sugar_g", header: "Sugar (g)" },
  { key: "sodium_mg", header: "Sodium (mg)" },
  { key: "potassium_mg", header: "Potassium (mg)" },
  { key: "calcium_mg", header: "Calcium (mg)" },
  { key: "iron_mg", header: "Iron (mg)" },
];

const CSV_HEADER = ["Date", "Time", "Food", "Calories", ...NUTRIENT_COLUMNS.map((c) => c.header)];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local "HH:MM" for an epoch-ms value. */
function localTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Quote a CSV cell only when it contains a comma, quote, or newline. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Render the log as CSV text (header row plus one row per entry). */
export function entriesToCsv(entries: LogEntry[]): string {
  const rows = [CSV_HEADER.join(",")];
  for (const e of entries) {
    const cells = [
      dayKey(e.addedAt),
      localTime(e.addedAt),
      csvCell(e.foodName),
      String(e.calories),
      ...NUTRIENT_COLUMNS.map((c) => {
        const v = e.nutrition?.[c.key];
        return v == null ? "" : String(v);
      }),
    ];
    rows.push(cells.join(","));
  }
  return rows.join("\n");
}

/** Render the log as pretty-printed JSON with local date/time per entry. */
export function entriesToJson(entries: LogEntry[]): string {
  const items = entries.map((e) => ({
    date: dayKey(e.addedAt),
    time: localTime(e.addedAt),
    foodName: e.foodName,
    calories: e.calories,
    nutrition: e.nutrition,
  }));
  return JSON.stringify(items, null, 2);
}
