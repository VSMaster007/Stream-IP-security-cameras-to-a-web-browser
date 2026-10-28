import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { loadEnvironment, type AppConfig } from "./config/environment.js";
import type { PathStatusClient, SourceStatus } from "./services/mediamtxService.js";

const password = "camera-password";

function demoEnv(overrides: NodeJS.ProcessEnv = {}): AppConfig {
  return loadEnvironment({
    STREAM_SOURCE_MODE: "demo",
    RTSP_URL: `rtsp://admin:${password}@10.1.1.5:554/Streaming/Channels/101`,
    ...overrides,
  });
}

function media(status: SourceStatus): PathStatusClient {
  return { getPath: async () => status };
}

describe("HTTP API", () => {
  it("reports backend health without claiming the camera is online", async () => {
    const response = await request(createApp({ env: demoEnv() })).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.uptimeSeconds).toEqual(expect.any(Number));
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns safe camera metadata and hides the RTSP URL", async () => {
    const response = await request(createApp({ env: demoEnv() })).get("/api/cameras");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      cameras: [
        {
          id: "cam1",
          name: "Demo Camera",
          path: "cam1",
          sourceMode: "demo",
          whepUrl: "http://127.0.0.1:8889/cam1/whep",
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain("10.1.1.5");
    expect(JSON.stringify(response.body)).not.toContain("9997");
  });

  it("rejects an invalid camera id", async () => {
    const response = await request(createApp({ env: demoEnv() })).get("/api/cameras/bad%20id/status");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_camera_id");
  });

  it("returns not found for an unknown camera id", async () => {
    const response = await request(createApp({ env: demoEnv() })).get("/api/cameras/cam2/status");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("camera_not_found");
  });

  it("returns the injected source state for cam1", async () => {
    const response = await request(
      createApp({
        env: demoEnv(),
        media: media({ sourceState: "ready", tracks: ["H264"], detail: "Source is online" }),
        now: () => new Date("2026-10-28T08:00:00.000Z"),
      }),
    ).get("/api/cameras/cam1/status");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "cam1",
      sourceState: "ready",
      reachability: "skipped",
      tracks: ["H264"],
      detail: "Source is online",
      checkedAt: "2026-10-28T08:00:00.000Z",
    });
  });

  it("checks TCP reachability only in rtsp mode and does not publish the host", async () => {
    const checkReachability = vi.fn(async () => false);
    const env = loadEnvironment({
      STREAM_SOURCE_MODE: "rtsp",
      CAMERA_NAME: "Office Camera",
      RTSP_URL: `rtsp://admin:${password}@10.1.1.5:554/live`,
    });
    const response = await request(
      createApp({
        env,
        media: media({ sourceState: "offline", tracks: [], detail: "Source is configured but not online" }),
        checkReachability,
      }),
    ).get("/api/cameras/cam1/status");
    expect(response.status).toBe(200);
    expect(response.body.reachability).toBe("unreachable");
    expect(response.body.sourceState).toBe("offline");
    expect(checkReachability).toHaveBeenCalledWith("10.1.1.5", 554, 2000);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain("10.1.1.5");
  });

  it("hides upstream exception text", async () => {
    const app = createApp({
      env: demoEnv(),
      media: {
        getPath: async () => {
          throw new Error(`dial failed rtsp://admin:${password}@10.1.1.5/live`);
        },
      },
    });
    const response = await request(app).get("/api/cameras/cam1/status");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "internal_error", message: "Internal server error" },
    });
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain("dial failed");
  });

  it("uses a restricted CORS origin", async () => {
    const response = await request(createApp({ env: demoEnv() }))
      .get("/api/health")
      .set("Origin", "http://127.0.0.1:5173");
    expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");

    const foreign = await request(createApp({ env: demoEnv() }))
      .get("/api/health")
      .set("Origin", "http://evil.example");
    expect(foreign.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
