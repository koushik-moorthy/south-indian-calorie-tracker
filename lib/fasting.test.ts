import { describe, it, expect } from "vitest";
import {
  elapsedSeconds,
  formatDuration,
  progressPct,
  fastingForInsights,
  defaultFasting,
  type FastingState,
} from "@/lib/fasting";

describe("elapsedSeconds", () => {
  it("counts whole seconds since the start", () => {
    const start = new Date(2024, 0, 10, 8, 0, 0);
    const now = new Date(2024, 0, 10, 10, 30, 15).getTime();
    expect(elapsedSeconds(start.toISOString(), now)).toBe(2 * 3600 + 30 * 60 + 15);
  });

  it("never goes negative", () => {
    const start = new Date(2024, 0, 10, 8, 0, 0);
    const now = new Date(2024, 0, 10, 7, 0, 0).getTime();
    expect(elapsedSeconds(start.toISOString(), now)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats seconds as Hh MMm SSs", () => {
    expect(formatDuration(0)).toBe("0h 00m 00s");
    expect(formatDuration(3661)).toBe("1h 01m 01s");
    expect(formatDuration(16 * 3600 + 5 * 60 + 9)).toBe("16h 05m 09s");
  });
});

describe("progressPct", () => {
  it("is the elapsed fraction of the target window, clamped to 0..100", () => {
    expect(progressPct(8 * 3600, 16)).toBe(50);
    expect(progressPct(20 * 3600, 16)).toBe(100);
    expect(progressPct(0, 16)).toBe(0);
  });
});

describe("fastingForInsights", () => {
  const today = "2024-01-10";

  it("reports an active fast in hours", () => {
    const start = new Date(2024, 0, 10, 6, 0, 0);
    const now = new Date(2024, 0, 10, 12, 0, 0).getTime(); // 6h in
    const state: FastingState = { ...defaultFasting(), targetHours: 16, startedAt: start.toISOString() };
    expect(fastingForInsights(state, today, now)).toEqual({
      status: "active",
      hours: 6,
      targetHours: 16,
    });
  });

  it("reports a fast completed earlier today", () => {
    const ended = new Date(2024, 0, 10, 13, 0, 0);
    const now = new Date(2024, 0, 10, 15, 0, 0).getTime();
    const state: FastingState = {
      targetHours: 16,
      startedAt: null,
      lastEndedAt: ended.toISOString(),
      lastDurationSec: 16 * 3600,
    };
    expect(fastingForInsights(state, today, now)).toEqual({
      status: "completed",
      hours: 16,
      targetHours: 16,
    });
  });

  it("reports none when no fast today", () => {
    const ended = new Date(2024, 0, 8, 13, 0, 0); // two days ago
    const now = new Date(2024, 0, 10, 15, 0, 0).getTime();
    const state: FastingState = {
      targetHours: 18,
      startedAt: null,
      lastEndedAt: ended.toISOString(),
      lastDurationSec: 18 * 3600,
    };
    expect(fastingForInsights(state, today, now)).toEqual({
      status: "none",
      hours: 0,
      targetHours: 18,
    });
  });
});
