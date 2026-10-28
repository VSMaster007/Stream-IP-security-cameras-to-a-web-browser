import { describe, expect, it } from "vitest";
import { MAX_AUTOMATIC_RETRIES, RETRY_DELAYS_MS, retryDelayMs } from "./backoff.js";

describe("retryDelayMs", () => {
  it("follows 1, 2, 4, 8, 16, then 30 seconds before jitter", () => {
    expect(RETRY_DELAYS_MS).toEqual([1000, 2000, 4000, 8000, 16000, 30000]);
    expect(MAX_AUTOMATIC_RETRIES).toBe(10);
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
      expect(retryDelayMs(attempt, () => 0)).toBe(RETRY_DELAYS_MS[attempt]);
    }
    expect(retryDelayMs(9, () => 0)).toBe(30000);
  });

  it("adds bounded jitter", () => {
    expect(retryDelayMs(0, () => 0.999)).toBe(1200);
    expect(retryDelayMs(5, () => 0.999)).toBe(30250);
  });
});
