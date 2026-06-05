# Add Meals to Past Days Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user add meals to a previously-viewed day; the day shown in the log navigator becomes the single "active day" that all three entry forms log to.

**Architecture:** Lift the `selectedDay` state from `DailyLog` into `HomeClient` so the log navigator and the entry forms share one day. Two new pure date helpers handle (a) building an epoch-ms timestamp for a past day and (b) validating an incoming `addedAt`. The `POST /api/log` route accepts an optional `addedAt` and sets `created_at` from it; otherwise behavior is unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase JS, Vitest.

**Testing note:** `vitest.config.ts` includes only `lib/**/*.test.ts`. Both new helpers live in `lib/dates.ts` and are tested in `lib/dates.test.ts`. The route delegates its validation to the tested `isoFromAddedAt` helper, so no (un-runnable) `app/` test is added.

---

### Task 1: `timestampForDayKey` helper

**Files:**
- Modify: `lib/dates.ts`
- Test: `lib/dates.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/dates.test.ts` (and add `timestampForDayKey` to the existing import from `@/lib/dates` at the top of the file):

```ts
describe("timestampForDayKey", () => {
  it("round-trips through dayKey", () => {
    const ts = timestampForDayKey("2024-03-15");
    expect(dayKey(ts)).toBe("2024-03-15");
  });

  it("uses the current wall-clock time on the target day", () => {
    const now = new Date(2025, 0, 1, 14, 30, 45); // 14:30:45 local
    const ts = timestampForDayKey("2024-07-09", now);
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(6); // July
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(45);
  });

  it("round-trips across month and year boundaries", () => {
    expect(dayKey(timestampForDayKey("2024-12-31"))).toBe("2024-12-31");
    expect(dayKey(timestampForDayKey("2025-01-01"))).toBe("2025-01-01");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/dates.test.ts`
Expected: FAIL — `timestampForDayKey is not a function` / import has no such export.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/dates.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/dates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dates.ts lib/dates.test.ts
git commit -m "feat: add timestampForDayKey date helper"
```

---

### Task 2: `isoFromAddedAt` request-validation helper

**Files:**
- Modify: `lib/dates.ts`
- Test: `lib/dates.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/dates.test.ts` (add `isoFromAddedAt` to the `@/lib/dates` import):

```ts
describe("isoFromAddedAt", () => {
  it("converts a valid epoch-ms number to an ISO string", () => {
    const ms = Date.UTC(2024, 5, 9, 12, 0, 0);
    expect(isoFromAddedAt(ms)).toBe(new Date(ms).toISOString());
  });

  it("returns undefined for missing, non-numeric, or non-positive input", () => {
    expect(isoFromAddedAt(undefined)).toBeUndefined();
    expect(isoFromAddedAt(null)).toBeUndefined();
    expect(isoFromAddedAt("123")).toBeUndefined();
    expect(isoFromAddedAt(0)).toBeUndefined();
    expect(isoFromAddedAt(-5)).toBeUndefined();
    expect(isoFromAddedAt(Number.NaN)).toBeUndefined();
    expect(isoFromAddedAt(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/dates.test.ts`
Expected: FAIL — `isoFromAddedAt is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `lib/dates.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/dates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dates.ts lib/dates.test.ts
git commit -m "feat: add isoFromAddedAt validation helper"
```

---

### Task 3: POST /api/log honors `addedAt`

**Files:**
- Modify: `app/api/log/route.ts`

- [ ] **Step 1: Add the import**

At the top of `app/api/log/route.ts`, add an import for the helper (alongside the existing imports):

```ts
import { isoFromAddedAt } from "@/lib/dates";
```

- [ ] **Step 2: Widen the POST body type**

In the `POST` function, change the body type declaration:

```ts
  let body: { foodName?: string; calories?: number; nutrition?: Nutrition; addedAt?: number };
```

- [ ] **Step 3: Build the insert payload with optional created_at**

Replace the `insert({ ... })` object inside `POST`'s `try` block with:

```ts
    const createdAt = isoFromAddedAt(body.addedAt);
    const row: Record<string, unknown> = {
      user_id: auth.user.id,
      food_name: foodName,
      calories: Math.max(0, Math.round(Number(body.calories) || 0)),
      nutrition: body.nutrition ?? null,
    };
    if (createdAt) row.created_at = createdAt;

    const { data, error } = await auth.supabase
      .from(LOG_TABLE)
      .insert(row)
      .select("id, food_name, calories, nutrition, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json(rowToEntry(data as LogRow));
```

- [ ] **Step 4: Verify types compile**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add app/api/log/route.ts
git commit -m "feat: accept optional addedAt when logging an entry"
```

---

### Task 4: Client API passes `addedAt`

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Update `addLogEntry`**

Replace the existing `addLogEntry` in `lib/api.ts` with:

```ts
export async function addLogEntry(
  result: AnalysisResult,
  addedAt?: number
): Promise<LogEntry> {
  const res = await fetch("/api/log", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({
      foodName: result.foodName,
      calories: result.calories,
      nutrition: result.nutrition,
      ...(addedAt ? { addedAt } : {}),
    }),
  });
  if (!res.ok) throw await asError(res, "Could not add to your log.");
  return (await res.json()) as LogEntry;
}
```

- [ ] **Step 2: Update `addManualEntry`**

Replace the existing `addManualEntry` with:

```ts
/** Add an entry by hand (name + calories), skipping AI analysis. */
export async function addManualEntry(
  foodName: string,
  calories: number,
  addedAt?: number
): Promise<LogEntry> {
  const res = await fetch("/api/log", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ foodName, calories, ...(addedAt ? { addedAt } : {}) }),
  });
  if (!res.ok) throw await asError(res, "Could not add to your log.");
  return (await res.json()) as LogEntry;
}
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat: allow client log helpers to send addedAt"
```

---

### Task 5: DailyLog accepts selected-day props and always shows the navigator

**Files:**
- Modify: `components/DailyLog.tsx`

- [ ] **Step 1: Add props to the interface**

In `components/DailyLog.tsx`, add to `interface Props`:

```ts
  /** The active day key ("YYYY-MM-DD"), shared with the entry forms. */
  selectedDay: string;
  /** Change the active day. */
  onSelectDay: (key: string) => void;
```

- [ ] **Step 2: Use props instead of internal state**

Change the component signature to destructure the new props:

```ts
export default function DailyLog({
  entries,
  loading = false,
  onRemove,
  onUpdate,
  onClearDay,
  selectedDay,
  onSelectDay,
}: Props) {
```

Delete the line:

```ts
  const [selectedDay, setSelectedDay] = useState(() => todayKey());
```

Keep `const [editingId, setEditingId] = useState<string | null>(null);`. Update the `useState` import if it becomes unused — `editingId` still uses it, so leave the import. Remove the now-unused `todayKey`? It is still used via `const today = todayKey();` — keep it.

- [ ] **Step 3: Replace the three setSelectedDay callers**

- Previous-day button `onClick`:
  ```ts
              onClick={() => onSelectDay(shiftDayKey(selectedDay, -1))}
  ```
- "Jump to today" button `onClick`:
  ```ts
                  onClick={() => onSelectDay(today)}
  ```
- Next-day button `onClick`:
  ```ts
              onClick={() => onSelectDay(shiftDayKey(selectedDay, 1))}
  ```

- [ ] **Step 4: Always render the navigator (even with zero entries)**

Replace the loading/empty/content block. The current structure is:

```ts
      {loading ? (
        <p ...>Loading your log…</p>
      ) : entries.length === 0 ? (
        <p ...>No items yet. Analyze a food and add it to your log.</p>
      ) : (
        <>
          {/* Day navigator */}
          ...
        </>
      )}
```

Change it so the navigator + per-day body show whenever not loading (drop the
all-entries-empty branch; the per-day empty branch already handles "nothing on
this day"):

```ts
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading your log…</p>
      ) : (
        <>
          {/* Day navigator */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelectDay(shiftDayKey(selectedDay, -1))}
              aria-label="Previous day"
              className={navBtn}
            >
              ‹
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatDayLabel(selectedDay, today)}
              </div>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => onSelectDay(today)}
                  className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-500"
                >
                  Jump to today
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSelectDay(shiftDayKey(selectedDay, 1))}
              disabled={isToday}
              aria-label="Next day"
              className={navBtn}
            >
              ›
            </button>
          </div>

          {dayEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nothing logged on this day.
            </p>
          ) : (
            <>
              {/* existing table + totals + NutritionBreakdown block, unchanged */}
            </>
          )}

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
            <ExportButtons entries={entries} />
          </div>
        </>
      )}
```

Keep the existing table/totals/NutritionBreakdown JSX exactly as it is inside the
`dayEntries.length === 0 ? ... : ( ... )` block — only the surrounding
loading/empty branches change.

- [ ] **Step 5: Verify types compile**

Run: `npm run typecheck`
Expected: FAIL — `HomeClient` does not yet pass `selectedDay` / `onSelectDay` to `DailyLog`. This is expected and fixed in Task 6.

- [ ] **Step 6: Commit**

```bash
git add components/DailyLog.tsx
git commit -m "refactor: DailyLog takes selectedDay via props, always shows navigator"
```

---

### Task 6: HomeClient owns selectedDay, wires forms + goal + banner

**Files:**
- Modify: `components/HomeClient.tsx`

- [ ] **Step 1: Import the new helpers**

In `components/HomeClient.tsx`, update the dates import to include the helpers:

```ts
import { entriesForDay, todayKey, timestampForDayKey, formatDayLabel } from "@/lib/dates";
```

- [ ] **Step 2: Add selectedDay state**

Add alongside the other `useState` declarations (e.g. after the `entries` state):

```ts
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey());
```

- [ ] **Step 3: Compute addedAt in the add handlers**

Replace `handleAddToLog` and `handleManualAdd` with:

```ts
  async function handleAddToLog(r: AnalysisResult) {
    const today = todayKey();
    const addedAt = selectedDay === today ? undefined : timestampForDayKey(selectedDay);
    const saved = await addLogEntry(r, addedAt);
    setEntries((prev) => [...prev, saved]);
  }

  async function handleManualAdd(foodName: string, calories: number) {
    const today = todayKey();
    const addedAt = selectedDay === today ? undefined : timestampForDayKey(selectedDay);
    const saved = await addManualEntry(foodName, calories, addedAt);
    setEntries((prev) => [...prev, saved]);
  }
```

- [ ] **Step 4: Add the "Adding to <day>" banner above the entry forms**

Find the `<div className="space-y-4">` that wraps the three form `<section>`s. Immediately before it, insert:

```tsx
          {selectedDay !== todayKey() && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
              <span className="font-medium text-brand-800 dark:text-brand-200">
                Adding to {formatDayLabel(selectedDay, todayKey())}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(todayKey())}
                className="font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                Jump to today
              </button>
            </div>
          )}
```

- [ ] **Step 5: Make the daily-goal total reflect the selected day**

Change the `DailyGoal` `consumed` prop from:

```tsx
              consumed={totalCalories(entriesForDay(entries, todayKey()))}
```

to:

```tsx
              consumed={totalCalories(entriesForDay(entries, selectedDay))}
```

- [ ] **Step 6: Pass selectedDay into DailyLog and the day label into ManualEntryForm**

Update the `<DailyLog ... />` usage to add the two props:

```tsx
            <DailyLog
              entries={entries}
              loading={logLoading}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
              onClearDay={handleClearDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
```

Update the `<ManualEntryForm ... />` usage to pass the active-day label:

```tsx
              <ManualEntryForm
                onAdd={handleManualAdd}
                dayLabel={formatDayLabel(selectedDay, todayKey())}
              />
```

- [ ] **Step 7: Verify types compile**

Run: `npm run typecheck`
Expected: FAIL — `ManualEntryForm` does not yet accept `dayLabel`. Fixed in Task 7.

- [ ] **Step 8: Commit**

```bash
git add components/HomeClient.tsx
git commit -m "feat: HomeClient shares selectedDay across forms, log, and goal"
```

---

### Task 7: ManualEntryForm day-aware success message

**Files:**
- Modify: `components/ManualEntryForm.tsx`

- [ ] **Step 1: Add the prop**

In `components/ManualEntryForm.tsx`, extend `interface Props`:

```ts
interface Props {
  /** Add the entry to the active day's log. Resolves once saved. */
  onAdd: (foodName: string, calories: number) => Promise<void>;
  /** Human label for the active day, e.g. "Today" or "Yesterday". */
  dayLabel: string;
}
```

Update the signature:

```ts
export default function ManualEntryForm({ onAdd, dayLabel }: Props) {
```

- [ ] **Step 2: Use the label in the success message**

Replace:

```ts
      setSavedMsg(`Added “${food}” to today's log.`);
```

with:

```ts
      setSavedMsg(`Added “${food}” to ${dayLabel}.`);
```

- [ ] **Step 3: Verify types and full test suite**

Run: `npm run typecheck`
Expected: PASS (all wiring now consistent).

Run: `npm run test`
Expected: PASS (all tests, including the new `lib/dates.test.ts` cases).

- [ ] **Step 4: Commit**

```bash
git add components/ManualEntryForm.tsx
git commit -m "feat: day-aware success message in manual entry form"
```

---

### Task 8: Manual verification & final check

**Files:** none (verification only)

- [ ] **Step 1: Build to catch any production-only issues**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Manual smoke test (dev server)**

Run: `npm run dev`, sign in, then verify:
1. Use the log's `‹` arrow to go to "Yesterday" — the "Adding to Yesterday" banner appears above the forms.
2. Add a manual entry — success message reads "Added "…" to Yesterday."; the item shows under Yesterday, not Today.
3. Add via text analysis while on Yesterday — it also lands on Yesterday.
4. The Daily Calorie Goal "consumed/remaining" reflects the selected day.
5. "Jump to today" (banner or navigator) returns to Today; a new entry has no `addedAt` and lands on Today as before.
6. The `›` next-day arrow is disabled on Today (future blocked).
7. On a brand-new/empty log the navigator is visible and a past day can be added to.

- [ ] **Step 3: Final commit (if any stray changes)**

```bash
git status
# commit only if there are intended, uncommitted changes
```
