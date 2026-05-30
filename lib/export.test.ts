import { describe, it, expect } from "vitest";
import { entriesToCsv, entriesToJson } from "@/lib/export";
import type { LogEntry, Nutrition } from "@/lib/types";

const NUTRITION: Nutrition = {
  protein_g: 4.5,
  carbs_g: 26,
  fat_g: 0.4,
  fiber_g: 1.2,
  sugar_g: 0.5,
  sodium_mg: 200,
  potassium_mg: 90,
  calcium_mg: 12,
  iron_mg: 1.1,
};

const EMPTY_NUTRITION: Nutrition = {
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  sugar_g: null,
  sodium_mg: null,
  potassium_mg: null,
  calcium_mg: null,
  iron_mg: null,
};

function entry(partial: Partial<LogEntry>): LogEntry {
  return {
    id: "1",
    foodName: "Idli",
    calories: 130,
    nutrition: NUTRITION,
    addedAt: new Date(2024, 0, 5, 9, 5).getTime(),
    ...partial,
  };
}

describe("entriesToCsv", () => {
  it("starts with a header row", () => {
    const csv = entriesToCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,Time,Food,Calories,Protein (g),Carbs (g),Fat (g),Fiber (g),Sugar (g),Sodium (mg),Potassium (mg),Calcium (mg),Iron (mg)"
    );
  });

  it("emits only the header when there are no entries", () => {
    expect(entriesToCsv([]).split("\n")).toHaveLength(1);
  });

  it("writes the local date, time, food, calories and nutrients", () => {
    const csv = entriesToCsv([entry({})]);
    const row = csv.split("\n")[1];
    expect(row).toBe("2024-01-05,09:05,Idli,130,4.5,26,0.4,1.2,0.5,200,90,12,1.1");
  });

  it("leaves null nutrients as empty cells", () => {
    const csv = entriesToCsv([entry({ nutrition: EMPTY_NUTRITION })]);
    const row = csv.split("\n")[1];
    expect(row).toBe("2024-01-05,09:05,Idli,130,,,,,,,,,");
  });

  it("escapes commas and quotes in the food name", () => {
    const csv = entriesToCsv([entry({ foodName: 'Dosa, "special"' })]);
    const row = csv.split("\n")[1];
    expect(row.startsWith('2024-01-05,09:05,"Dosa, ""special""",130')).toBe(true);
  });
});

describe("entriesToJson", () => {
  it("returns parseable JSON with date, time, food, calories and nutrition", () => {
    const json = entriesToJson([entry({})]);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].date).toBe("2024-01-05");
    expect(parsed[0].time).toBe("09:05");
    expect(parsed[0].foodName).toBe("Idli");
    expect(parsed[0].calories).toBe(130);
    expect(parsed[0].nutrition.protein_g).toBe(4.5);
  });

  it("returns an empty array string for no entries", () => {
    expect(JSON.parse(entriesToJson([]))).toEqual([]);
  });
});
