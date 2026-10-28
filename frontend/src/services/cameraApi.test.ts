import { afterEach, describe, expect, it, vi } from "vitest";
import { apiBaseUrl, fetchCameraStatus, fetchCameras } from "./cameraApi.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("camera API client", () => {
  it("uses the local API when no base URL is configured", () => {
    expect(apiBaseUrl()).toBe("http://127.0.0.1:3001");
  });

  it("parses a camera list and rejects an unexpected payload", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        cameras: [
          {
            id: "cam1",
            name: "Office Camera",
            path: "cam1",
            sourceMode: "demo",
            whepUrl: "http://127.0.0.1:8889/cam1/whep",
            rtspUrl: "rtsp://admin:secret@10.0.0.5/live",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const cameras = await fetchCameras();
    expect(cameras).toEqual([
      {
        id: "cam1",
        name: "Office Camera",
        path: "cam1",
        sourceMode: "demo",
        whepUrl: "http://127.0.0.1:8889/cam1/whep",
      },
    ]);
    expect(JSON.stringify(cameras)).not.toContain("secret");

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ cameras: [{ id: "cam1" }] })));
    await expect(fetchCameras()).rejects.toThrow("unexpected camera list");
  });

  it("parses source status and reports API failures without the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          id: "cam1",
          sourceState: "ready",
          reachability: "skipped",
          tracks: ["H264"],
          detail: "Source is online",
          checkedAt: "2026-10-28T08:00:00.000Z",
        }),
      ),
    );
    await expect(fetchCameraStatus("cam1")).resolves.toMatchObject({ sourceState: "ready" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rtsp://admin:secret@10.0.0.5/live", { status: 500 })),
    );
    await expect(fetchCameraStatus("cam1")).rejects.toThrow("failed (500)");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
