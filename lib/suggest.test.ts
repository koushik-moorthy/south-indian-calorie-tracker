import { describe, it, expect } from "vitest";
import { parseSuggestions } from "@/lib/suggest";

describe("parseSuggestions", () => {
  it("parses the headline and suggestions, trimming, rounding, and macros", () => {
    const raw = JSON.stringify({
      headline: "  You have ~700 kcal left today.  ",
      suggestions: [
        {
          name: "  2 idli with sambar ",
          calories: 220.6,
          reason: "  adds protein  ",
          macros: { protein_g: 6, carbs_g: 44, fat_g: 1, fiber_g: 3, sugar_g: 1 },
        },
        { name: "Sundal", calories: "180", reason: "fiber + protein" },
      ],
    });
    const r = parseSuggestions(raw);
    expect(r.headline).toBe("You have ~700 kcal left today.");
    expect(r.suggestions).toHaveLength(2);
    expect(r.suggestions[0]).toEqual({
      name: "2 idli with sambar",
      calories: 221,
      reason: "adds protein",
      macros: { protein_g: 6, carbs_g: 44, fat_g: 1, fiber_g: 3, sugar_g: 1 },
    });
    expect(r.suggestions[1].calories).toBe(180);
    expect(r.suggestions[1].macros).toBeNull();
  });

  it("drops suggestions without a name and defaults calories to null", () => {
    const raw = JSON.stringify({ suggestions: [{ reason: "x" }, { name: "Rasam" }] });
    const r = parseSuggestions(raw);
    expect(r.suggestions).toHaveLength(1);
    expect(r.suggestions[0].name).toBe("Rasam");
    expect(r.suggestions[0].calories).toBeNull();
  });

  it("returns an empty list when none are provided", () => {
    expect(parseSuggestions(JSON.stringify({ headline: "hi" })).suggestions).toEqual([]);
  });

  it("caps the list at six suggestions", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `Dish ${i}` }));
    expect(parseSuggestions(JSON.stringify({ suggestions: many })).suggestions).toHaveLength(6);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseSuggestions("nope")).toThrow();
  });
});
