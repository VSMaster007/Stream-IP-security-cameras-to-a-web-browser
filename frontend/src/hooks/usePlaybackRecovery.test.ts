import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { retryDelayMs } from "../lib/backoff.js";
import { usePlaybackRecovery } from "./usePlaybackRecovery.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("usePlaybackRecovery", () => {
  it("reconnects with backoff, resets after live playback, and stops at the limit", async () => {
    vi.useFakeTimers();
    const hook = renderHook(() =>
      usePlaybackRecovery({
        delayMs: (attempt) => retryDelayMs(attempt, () => 0),
        maxRetries: 2,
      }),
    );

    act(() => {
      hook.result.current.onPlaybackState("error", "bad status code 500");
    });
    expect(hook.result.current.playbackState).toBe("reconnecting");
    expect(hook.result.current.sessionId).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(hook.result.current.sessionId).toBe(2);

    act(() => {
      hook.result.current.onPlaybackState("live");
    });
    expect(hook.result.current.playbackState).toBe("live");
    expect(hook.result.current.playbackDetail).toBeNull();

    act(() => {
      hook.result.current.onPlaybackState("offline", "stream not found");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(hook.result.current.sessionId).toBe(3);

    act(() => {
      hook.result.current.onPlaybackState("error", "again");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(hook.result.current.sessionId).toBe(4);

    act(() => {
      hook.result.current.onPlaybackState("error", "stopped");
    });
    expect(hook.result.current.playbackState).toBe("error");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(hook.result.current.sessionId).toBe(4);
  });

  it("starts a new session immediately on manual retry and cancels the timer", async () => {
    vi.useFakeTimers();
    const hook = renderHook(() =>
      usePlaybackRecovery({
        delayMs: () => 1000,
      }),
    );
    act(() => {
      hook.result.current.onPlaybackState("error", "boom");
    });
    act(() => {
      hook.result.current.retryNow();
    });
    expect(hook.result.current.sessionId).toBe(2);
    expect(hook.result.current.playbackState).toBe("connecting");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(hook.result.current.sessionId).toBe(2);
  });

  it("does not open another session after unmount", async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => usePlaybackRecovery({ delayMs: () => 1000 }));
    act(() => {
      hook.result.current.onPlaybackState("offline", "stream not found");
    });
    hook.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
  });
});
