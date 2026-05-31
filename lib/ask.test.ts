import { describe, it, expect } from "vitest";
import { parseAnswer } from "@/lib/ask";

describe("parseAnswer", () => {
  it("extracts and trims the answer", () => {
    expect(parseAnswer(JSON.stringify({ answer: "  Try a bowl of sundal.  " })).answer).toBe(
      "Try a bowl of sundal."
    );
  });

  it("defaults to an empty string when missing", () => {
    expect(parseAnswer(JSON.stringify({})).answer).toBe("");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseAnswer("nope")).toThrow();
  });
});
