import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, __resetRateLimits } from "@/lib/rateLimit";

beforeEach(() => {
  __resetRateLimits();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to the limit, then blocks within the window", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit("k", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    expect(rateLimit("k", 1, 1_000).ok).toBe(true);
    expect(rateLimit("k", 1, 1_000).ok).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(rateLimit("k", 1, 1_000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(rateLimit("a", 1, 60_000).ok).toBe(true);
    expect(rateLimit("a", 1, 60_000).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000).ok).toBe(true);
  });
});
