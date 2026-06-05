# Add meals to past days

**Date:** 2026-06-05
**Status:** Approved

## Problem

Meals can only be logged to the current day. The server stamps `created_at` at
insert time, so all three entry forms (photo, text, manual) always land on
today. The `DailyLog` already lets a user *view* past days via a prev/next
navigator, but there is no way to *add* a forgotten meal to one of those days.

## Goal

Let the user add meals to a previous day. The day shown in the log's navigator
becomes the single "active day": new meals are logged to whatever day is being
viewed. Future days stay blocked; there is no limit on how far back the user can
go. All three add methods (photo, text, manual) honor the selected day.

## Design

### 1. Shared "selected day" state

`selectedDay` currently lives inside `DailyLog` as local `useState`. Lift it into
`HomeClient` so it is a single shared concept:

- `HomeClient` owns `selectedDay: string` (a `"YYYY-MM-DD"` key), defaulting to
  `todayKey()`.
- Pass `selectedDay` and a setter into `DailyLog`, replacing its internal state.
  `DailyLog`'s navigator behavior is otherwise unchanged.
- `DailyGoal`'s `consumed` value switches from
  `entriesForDay(entries, todayKey())` to `entriesForDay(entries, selectedDay)`,
  so the goal reflects the day currently in view.

### 2. Logging to the selected day

New helper in `lib/dates.ts`:

```ts
/** Epoch-ms for a day key at the current wall-clock time (local). */
export function timestampForDayKey(key: string, now?: number | Date): number
```

It parses the `"YYYY-MM-DD"` key and constructs a local `Date` for that day at
the current hours/minutes/seconds, then returns `.getTime()`. Because it is built
from local components, `dayKey(timestampForDayKey(key))` round-trips back to the
same key. Using the current time-of-day means several meals added to one past day
keep their natural insertion order (the log is ordered by `created_at` ascending).

API change — `POST /api/log` (`app/api/log/route.ts`):

- Accept an optional `addedAt` field (epoch ms) in the request body.
- When present and a finite, positive number, set `created_at` to
  `new Date(addedAt).toISOString()` on the inserted row.
- When absent or invalid, omit `created_at` and let the DB default (now) apply —
  identical to today's behavior.

Client change — `lib/api.ts`:

- `addLogEntry(result, addedAt?)` and `addManualEntry(foodName, calories, addedAt?)`
  gain an optional `addedAt` (epoch ms) that, when provided, is sent in the body.

`HomeClient` handlers:

- `handleAddToLog` and `handleManualAdd` compute `addedAt` from `selectedDay`:
  when `selectedDay === todayKey()`, pass nothing (server uses now); otherwise
  pass `timestampForDayKey(selectedDay)`.

### 3. UI affordance

The user must never be confused about which day a meal will land on.

- In `HomeClient`, when `selectedDay !== todayKey()`, render a small banner above
  the entry-form section: e.g. *"Adding to Yesterday"* / *"Adding to Mon, Jun 3"*
  (reuse `formatDayLabel`), with a "Jump to today" link that resets `selectedDay`.
- `ManualEntryForm`'s success message becomes day-aware. It currently hardcodes
  *"Added "X" to today's log."*; it should say *"Added "X" to Yesterday."* etc.
  This requires the form to know the active day label — pass a `dayLabel` prop
  (or the selected day key) down from `HomeClient`.
- `DailyLog` currently hides the day navigator when `entries.length === 0`. Make
  the navigator render even when there are no entries at all, so the user can
  navigate to (and add to) a past day on a fresh/empty log. The per-day empty
  state ("Nothing logged on this day.") still applies.

### 4. Out of scope / unchanged

- No new dependencies.
- Future dates remain blocked by the existing disabled "next" arrow.
- Editing, removing, clearing, and exporting entries are unchanged.
- `WeightEntry` and other features are untouched.

## Testing

- `lib/dates.test.ts`: `timestampForDayKey` round-trips through `dayKey`, and
  handles month/year rollover (e.g. a key in a different month/year).
- `app/api/log` POST `addedAt` path: honored when a valid number is supplied,
  ignored when absent or non-numeric. (Match the existing test style for the
  route, if present; otherwise cover the helper-level logic.)

## Acceptance criteria

1. Navigating to a previous day in the log and adding a meal (via any of the
   three forms) stores it on that day; it appears under that day and not today.
2. The "Adding to <day>" banner appears whenever a non-today day is selected and
   disappears (with a working "Jump to today") when today is active.
3. The daily-goal consumed total reflects the selected day.
4. Adding to today behaves exactly as before (no `addedAt` sent).
5. Future days cannot be selected or added to.
6. `npm run test` and `npm run typecheck` pass.
