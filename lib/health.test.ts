import { describe, it, expect } from "vitest";
import { bmi, bmiCategory, expectedWeight } from "@/lib/health";

describe("bmi", () => {
  it("computes weight(kg) / height(m)^2 to one decimal", () => {
    expect(bmi(80, 178)).toBe(25.2);
    expect(bmi(60, 170)).toBe(20.8);
  });

  it("returns 0 for invalid height", () => {
    expect(bmi(80, 0)).toBe(0);
  });
});

describe("bmiCategory", () => {
  it("classifies by WHO thresholds, inclusive at the lower bound", () => {
    expect(bmiCategory(17)).toBe("Underweight");
    expect(bmiCategory(18.5)).toBe("Normal");
    expect(bmiCategory(22)).toBe("Normal");
    expect(bmiCategory(25)).toBe("Overweight");
    expect(bmiCategory(27)).toBe("Overweight");
    expect(bmiCategory(30)).toBe("Obese");
    expect(bmiCategory(32)).toBe("Obese");
  });
});

describe("expectedWeight", () => {
  const start = "2024-01-01";
  const target = "2024-01-11"; // 10 days later

  it("returns the start weight on the start date", () => {
    expect(expectedWeight(80, 78, start, target, start)).toBe(80);
  });

  it("returns the goal weight on the target date", () => {
    expect(expectedWeight(80, 78, start, target, target)).toBe(78);
  });

  it("interpolates linearly between the dates", () => {
    expect(expectedWeight(80, 78, start, target, "2024-01-06")).toBe(79);
  });

  it("clamps before the start and after the target", () => {
    expect(expectedWeight(80, 78, start, target, "2023-12-30")).toBe(80);
    expect(expectedWeight(80, 78, start, target, "2024-02-01")).toBe(78);
  });
});
