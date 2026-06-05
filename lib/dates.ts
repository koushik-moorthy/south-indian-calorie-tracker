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

/**
 * Epoch-ms for a day key ("YYYY-MM-DD") at the current local wall-clock time.
 * Built from local components, so `dayKey(timestampForDayKey(key))` === key.
 * Using "now"'s time-of-day keeps several entries added to one past day in
 * insertion order (the log is sorted by created_at ascending).
 */
export function timestampForDayKey(key: string, now: number | Date = Date.now()): number {
  const ref = typeof now === "number" ? new Date(now) : now;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    ref.getHours(),
    ref.getMinutes(),
    ref.getSeconds(),
    ref.getMilliseconds()
  ).getTime();
}

/**
 * Validate an incoming `addedAt` (expected epoch-ms) and return it as an ISO
 * string suitable for a `created_at` column, or `undefined` when absent/invalid
 * (caller then lets the DB default apply).
 */
export function isoFromAddedAt(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return new Date(value).toISOString();
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
