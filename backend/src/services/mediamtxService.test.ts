import { describe, expect, it } from "vitest";
import { createMediaMtxClient, mapPath, type FetchLike } from "./mediamtxService.js";

const secretUrl = "rtsp://user:camera-password@10.0.0.8/live";

describe("mapPath", () => {
  it("maps an online path to ready and keeps only codec names", () => {
    const status = mapPath({
      online: true,
      ready: true,
      source: { type: "rtspSource", url: secretUrl },
      tracks2: [{ codec: "H264" }, { codec: "Opus" }],
    });
    expect(status).toEqual({
      sourceState: "ready",
      tracks: ["H264", "Opus"],
      detail: "Source is online",
    });
    expect(JSON.stringify(status)).not.toContain("camera-password");
    expect(JSON.stringify(status)).not.toContain(secretUrl);
  });

  it("maps a configured but offline path to offline", () => {
    expect(mapPath({ online: false, ready: false, tracks: [] }).sourceState).toBe("offline");
  });

  it("does not treat a deprecated ready flag as offline when online is true", () => {
    expect(mapPath({ online: true, ready: false }).sourceState).toBe("ready");
  });

  it("returns unknown when the payload has no readiness fields", () => {
    expect(mapPath({ name: "cam1" }).sourceState).toBe("unknown");
  });
});

describe("createMediaMtxClient", () => {
  it("returns offline when MediaMTX reports the path is missing", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: secretUrl }),
    });
    const status = await createMediaMtxClient({
      apiUrl: "http://mediamtx:9997",
      timeoutMs: 200,
      fetchImpl,
    }).getPath("cam1");
    expect(status.sourceState).toBe("offline");
    expect(JSON.stringify(status)).not.toContain("camera-password");
  });

  it("returns unknown when the control API responds with a server error", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "database password=hunter2" }),
    });
    const status = await createMediaMtxClient({
      apiUrl: "http://127.0.0.1:9997/",
      timeoutMs: 200,
      fetchImpl,
    }).getPath("cam1");
    expect(status).toMatchObject({ sourceState: "unknown" });
    expect(JSON.stringify(status)).not.toContain("hunter2");
  });

  it("returns unknown when the control API times out", async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    const status = await createMediaMtxClient({
      apiUrl: "http://127.0.0.1:9997",
      timeoutMs: 20,
      fetchImpl,
    }).getPath("cam1");
    expect(status).toEqual({
      sourceState: "unknown",
      tracks: [],
      detail: "MediaMTX control API timed out",
    });
  });

  it("returns unknown when the control API cannot be contacted", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error(`connect ECONNREFUSED ${secretUrl}`);
    };
    const status = await createMediaMtxClient({
      apiUrl: "http://127.0.0.1:9997",
      timeoutMs: 200,
      fetchImpl,
    }).getPath("cam1");
    expect(status.sourceState).toBe("unknown");
    expect(status.detail).toBe("MediaMTX control API is unavailable");
    expect(JSON.stringify(status)).not.toContain("camera-password");
  });
});
