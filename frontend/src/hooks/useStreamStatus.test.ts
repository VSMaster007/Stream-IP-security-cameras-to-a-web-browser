import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STATUS_POLL_INTERVAL_MS, useStreamStatus } from "./useStreamStatus.js";

const ready = {
  id: "cam1",
  sourceState: "ready",
  reachability: "skipped",
  tracks: ["H264"],
  detail: "Source is online",
  checkedAt: "2026-10-28T08:00:00.000Z",
};

const offline = {
  ...ready,
  sourceState: "offline",
  detail: "Source is configured but not online",
  checkedAt: "2026-10-28T08:00:05.000Z",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useStreamStatus", () => {
  it("polls about every five seconds and stops after unmount", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => json(ready));
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook(() => useStreamStatus("cam1"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status?.sourceState).toBe("ready");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    hook.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS * 3);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the last source state when a later poll fails", async () => {
    vi.useFakeTimers();
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        if (call === 1) {
          return json(ready);
        }
        return new Response("rtsp://admin:secret@10.0.0.8/live", { status: 503 });
      }),
    );

    const hook = renderHook(() => useStreamStatus("cam1"));
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS);
    });
    expect(hook.result.current.status?.sourceState).toBe("ready");
    expect(hook.result.current.error).toBe("The API request failed (503)");
    expect(hook.result.current.error).not.toContain("secret");
  });

  it("ignores a slow response after a newer refresh", async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          if (!resolveFirst) {
            resolveFirst = resolve;
            return;
          }
          resolve(json(offline));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const hook = renderHook(() => useStreamStatus("cam1"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      hook.result.current.refresh();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.current.status?.sourceState).toBe("offline");

    await act(async () => {
      resolveFirst?.(json(ready));
      await Promise.resolve();
    });
    expect(hook.result.current.status?.sourceState).toBe("offline");
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
