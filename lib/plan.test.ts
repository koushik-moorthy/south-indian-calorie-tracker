import { describe, it, expect } from "vitest";
import { parsePlan } from "@/lib/plan";

const full = JSON.stringify({
  daily_calories: 1850.4,
  weekly_rate_kg: -0.5,
  bmr: 1600,
  tdee: 2300,
  macros: { protein_g: 140, carbs_g: 180, fat_g: 55, fiber_g: 30, sugar_g: 40 },
  summary: "  Lose about 0.5 kg per week.  ",
  safety_note: "  Stay hydrated.  ",
  feasible: true,
  adjusted_target_date: null,
});

describe("parsePlan", () => {
  it("parses and normalizes a full response", () => {
    const p = parsePlan(full, { calorieFloor: 1500 });
    expect(p.dailyCalories).toBe(1850);
    expect(p.weeklyRateKg).toBe(-0.5);
    expect(p.bmr).toBe(1600);
    expect(p.tdee).toBe(2300);
    expect(p.macros).toEqual({
      protein_g: 140,
      carbs_g: 180,
      fat_g: 55,
      fiber_g: 30,
      sugar_g: 40,
    });
    expect(p.summary).toBe("Lose about 0.5 kg per week.");
    expect(p.safetyNote).toBe("Stay hydrated.");
    expect(p.feasible).toBe(true);
    expect(p.adjustedTargetDate).toBeNull();
  });

  it("clamps daily calories up to the safety floor", () => {
    const p = parsePlan(JSON.stringify({ daily_calories: 900 }), { calorieFloor: 1500 });
    expect(p.dailyCalories).toBe(1500);
  });

  it("defaults feasible to true and reads an adjusted target date", () => {
    const a = parsePlan(JSON.stringify({ daily_calories: 2000 }), { calorieFloor: 1500 });
    expect(a.feasible).toBe(true);

    const b = parsePlan(
      JSON.stringify({
        daily_calories: 2000,
        feasible: false,
        adjusted_target_date: "2024-09-01",
      }),
      { calorieFloor: 1500 }
    );
    expect(b.feasible).toBe(false);
    expect(b.adjustedTargetDate).toBe("2024-09-01");
  });

  it("returns null macros when the breakdown is incomplete", () => {
    const p = parsePlan(
      JSON.stringify({ daily_calories: 2000, macros: { protein_g: 140 } }),
      { calorieFloor: 1500 }
    );
    expect(p.macros).toBeNull();
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePlan("not json", { calorieFloor: 1500 })).toThrow();
  });
});
