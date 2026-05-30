import { describe, it, expect } from "vitest";
import {
  dayKey,
  todayKey,
  shiftDayKey,
  entriesForDay,
  listDayKeys,
  formatDayLabel,
} from "@/lib/dates";

describe("dayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(dayKey(new Date(2024, 0, 5, 9, 0))).toBe("2024-01-05");
    expect(dayKey(new Date(2024, 11, 25, 23, 59))).toBe("2024-12-25");
  });

  it("accepts an epoch milliseconds value", () => {
    const ms = new Date(2024, 5, 9, 12).getTime();
    expect(dayKey(ms)).toBe("2024-06-09");
  });
});

describe("todayKey", () => {
  it("matches dayKey of the supplied 'now'", () => {
    const now = new Date(2025, 2, 3, 7, 15);
    expect(todayKey(now)).toBe("2025-03-03");
  });
});

describe("shiftDayKey", () => {
  it("moves forward and backward across month and leap boundaries", () => {
    expect(shiftDayKey("2024-01-31", 1)).toBe("2024-02-01");
    expect(shiftDayKey("2024-03-01", -1)).toBe("2024-02-29"); // 2024 is a leap year
    expect(shiftDayKey("2024-12-31", 1)).toBe("2025-01-01");
  });
});

describe("entriesForDay", () => {
  it("returns only entries whose local day matches the key", () => {
    const a = { addedAt: new Date(2024, 0, 5, 8).getTime() };
    const b = { addedAt: new Date(2024, 0, 6, 8).getTime() };
    expect(entriesForDay([a, b], "2024-01-05")).toEqual([a]);
  });
});

describe("listDayKeys", () => {
  it("returns unique day keys, most recent first", () => {
    const e1 = { addedAt: new Date(2024, 0, 5, 8).getTime() };
    const e2 = { addedAt: new Date(2024, 0, 5, 20).getTime() };
    const e3 = { addedAt: new Date(2024, 0, 7, 8).getTime() };
    expect(listDayKeys([e1, e2, e3])).toEqual(["2024-01-07", "2024-01-05"]);
  });

  it("returns an empty array for no entries", () => {
    expect(listDayKeys([])).toEqual([]);
  });
});

describe("formatDayLabel", () => {
  it("labels today and yesterday relative to the reference key", () => {
    expect(formatDayLabel("2024-01-10", "2024-01-10")).toBe("Today");
    expect(formatDayLabel("2024-01-09", "2024-01-10")).toBe("Yesterday");
  });

  it("returns a readable, distinct label for other days", () => {
    const label = formatDayLabel("2024-01-01", "2024-01-10");
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Yesterday");
    expect(label.length).toBeGreaterThan(0);
  });
});
