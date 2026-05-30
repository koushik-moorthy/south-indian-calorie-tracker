import { describe, it, expect } from "vitest";
import { scaleResult } from "@/lib/scale";
import type { AnalysisResult } from "@/lib/types";

const base: AnalysisResult = {
  foodName: "Idli",
  quantity: 2,
  servingSize: "2 idlis",
  calories: 130,
  confidence: "high",
  notes: "Standard medium idlis",
  nutrition: {
    protein_g: 4.5,
    carbs_g: 26,
    fat_g: 0.4,
    fiber_g: 1.2,
    sugar_g: 0.5,
  },
};

describe("scaleResult", () => {
  it("scales calories, quantity, and every nutrient by the factor", () => {
    const r = scaleResult(base, 2);
    expect(r.calories).toBe(260);
    expect(r.quantity).toBe(4);
    expect(r.nutrition.protein_g).toBe(9);
    expect(r.nutrition.carbs_g).toBe(52);
    expect(r.nutrition.fiber_g).toBe(2.4);
    expect(r.nutrition.sugar_g).toBe(1);
  });

  it("keeps null nutrients null", () => {
    const r = scaleResult(
      { ...base, nutrition: { ...base.nutrition, protein_g: null } },
      3
    );
    expect(r.nutrition.protein_g).toBeNull();
    expect(r.nutrition.carbs_g).toBe(78);
  });

  it("rounds calories to a whole number", () => {
    const r = scaleResult({ ...base, calories: 7 }, 0.5);
    expect(r.calories).toBe(4); // 3.5 -> 4
  });

  it("preserves descriptive fields", () => {
    const r = scaleResult(base, 2);
    expect(r.foodName).toBe("Idli");
    expect(r.servingSize).toBe("2 idlis");
    expect(r.confidence).toBe("high");
  });

  it("falls back to a factor of 1 for invalid input", () => {
    for (const bad of [0, -2, NaN, Infinity]) {
      const r = scaleResult(base, bad as number);
      expect(r.calories).toBe(130);
      expect(r.nutrition.protein_g).toBe(4.5);
    }
  });

  it("does not mutate the original result", () => {
    scaleResult(base, 5);
    expect(base.calories).toBe(130);
    expect(base.nutrition.protein_g).toBe(4.5);
  });
});
