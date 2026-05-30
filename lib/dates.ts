/**
 * Local-day helpers for grouping log entries by calendar date.
 *
 * Entries are stored with a UTC timestamp but a calorie "day" is what the user
 * experiences locally, so every key is derived from local date components.
 * A day key is the string "YYYY-MM-DD".
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local-date key ("YYYY-MM-DD") for an epoch-ms value or a Date. */
export function dayKey(when: number | Date): string {
  const d = typeof when === "number" ? new Date(when) : when;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Day key for "now" (or a supplied reference time). */
export function todayKey(now: number | Date = Date.now()): string {
  return dayKey(now);
}

/** A day key shifted by a whole number of days (handles month/year rollover). */
export function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + deltaDays));
}

/** Entries whose local day matches the given key, preserving input order. */
export function entriesForDay<T extends { addedAt: number }>(
  entries: T[],
  key: string
): T[] {
  return entries.filter((e) => dayKey(e.addedAt) === key);
}

/** Unique day keys present in the entries, most recent first. */
export function listDayKeys(entries: { addedAt: number }[]): string[] {
  const keys = new Set<string>();
  for (const e of entries) keys.add(dayKey(e.addedAt));
  return [...keys].sort().reverse();
}

/** Human label for a day key relative to today: "Today", "Yesterday", or a date. */
export function formatDayLabel(key: string, today: string): string {
  if (key === today) return "Today";
  if (key === shiftDayKey(today, -1)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
