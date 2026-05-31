import { describe, it, expect } from "vitest";
import {
  weightProgress,
  weeklyRateFromCheckins,
  parsePerformance,
} from "@/lib/performance";
import type { WeightEntry } from "@/lib/types";

describe("weightProgress", () => {
  it("computes change, remaining, expected, vs-plan, and percent to goal", () => {
    const p = weightProgress({
      startKg: 80,
      goalKg: 72,
      currentKg: 78,
      startDate: "2024-01-01",
      targetDate: "2024-03-01", // 60 days (2024 is a leap year)
      todayKey: "2024-01-31", // 30 days in → halfway
    });
    expect(p.changeKg).toBe(-2);
    expect(p.toGoalKg).toBe(6);
    expect(p.expectedKg).toBe(76);
    expect(p.vsPlanKg).toBe(2); // 2 kg heavier than the plan expects
    expect(p.pctToGoal).toBe(25); // lost 2 of 8 kg
  });
});

describe("weeklyRateFromCheckins", () => {
  it("derives kg/week from the first and last check-in", () => {
    const weights: WeightEntry[] = [
      { id: "a", recordedOn: "2024-01-01", weightKg: 80 },
      { id: "b", recordedOn: "2024-01-15", weightKg: 78.6 },
    ];
    expect(weeklyRateFromCheckins(weights)).toBe(-0.7); // -1.4 kg / 14 days * 7
  });

  it("returns null with fewer than two check-ins", () => {
    expect(weeklyRateFromCheckins([])).toBeNull();
    expect(
      weeklyRateFromCheckins([{ id: "a", recordedOn: "2024-01-01", weightKg: 80 }])
    ).toBeNull();
  });
});

describe("parsePerformance", () => {
  it("parses and trims all sections", () => {
    const raw = JSON.stringify({
      headline: "  Solid progress!  ",
      weight: " Down 2 kg, slightly behind plan. ",
      calories: " Averaging under target. ",
      macros: " Protein is a bit low. ",
      fasting: " Consistent 16h fasts. ",
      on_track: " On track for your date. ",
      focus: " Add a protein source at lunch. ",
    });
    const r = parsePerformance(raw);
    expect(r.headline).toBe("Solid progress!");
    expect(r.weight).toBe("Down 2 kg, slightly behind plan.");
    expect(r.onTrack).toBe("On track for your date.");
    expect(r.focus).toBe("Add a protein source at lunch.");
  });

  it("defaults missing sections to empty strings", () => {
    const r = parsePerformance(JSON.stringify({ headline: "Hi" }));
    expect(r.weight).toBe("");
    expect(r.macros).toBe("");
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePerformance("nope")).toThrow();
  });
});
