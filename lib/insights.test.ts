import { describe, it, expect } from "vitest";
import { windowStats, parseInsights } from "@/lib/insights";
import type { LogEntry, Nutrition } from "@/lib/types";

const NUT: Nutrition = {
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  sugar_g: null,
};

function entry(dateParts: [number, number, number], calories: number): LogEntry {
  const [y, m, d] = dateParts;
  return {
    id: `${y}-${m}-${d}-${calories}`,
    foodName: "x",
    calories,
    nutrition: NUT,
    addedAt: new Date(y, m - 1, d, 12).getTime(),
  };
}

describe("windowStats", () => {
  const entries: LogEntry[] = [
    entry([2024, 1, 10], 100),
    entry([2024, 1, 10], 200), // Jan 10 total 300
    entry([2024, 1, 9], 400), // Jan 9
    entry([2024, 1, 1], 999), // Jan 1 (outside a 7-day window ending Jan 10)
  ];

  it("aggregates the last N days ending at the given key", () => {
    const w = windowStats(entries, "2024-01-10", 7);
    expect(w.daysLogged).toBe(2);
    expect(w.totalCalories).toBe(700);
    expect(w.avgCalories).toBe(350);
  });

  it("includes older days within a larger window", () => {
    const w = windowStats(entries, "2024-01-10", 30);
    expect(w.daysLogged).toBe(3);
    expect(w.totalCalories).toBe(1699);
    expect(w.avgCalories).toBe(566); // 1699 / 3
  });

  it("returns zeros when nothing is logged", () => {
    expect(windowStats([], "2024-01-10", 7)).toEqual({
      daysLogged: 0,
      totalCalories: 0,
      avgCalories: 0,
    });
  });
});

describe("parseInsights", () => {
  it("parses, trims, and rounds the projected change", () => {
    const raw = JSON.stringify({
      headline: "  Nice work today!  ",
      day: " Slightly under target. ",
      week: " On track. ",
      month: " Trending down. ",
      goal: " You're 30% there. ",
      projected_change_kg: -0.073,
    });
    const r = parseInsights(raw);
    expect(r.headline).toBe("Nice work today!");
    expect(r.day).toBe("Slightly under target.");
    expect(r.projectedChangeKg).toBe(-0.07);
  });

  it("defaults missing fields to empty strings and null change", () => {
    const r = parseInsights(JSON.stringify({ headline: "Hi" }));
    expect(r.day).toBe("");
    expect(r.projectedChangeKg).toBeNull();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseInsights("oops")).toThrow();
  });
});
