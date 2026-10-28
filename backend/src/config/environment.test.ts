import { describe, expect, it } from "vitest";
import { loadEnvironment, parseRtspUrl } from "./environment.js";

describe("loadEnvironment", () => {
  it("accepts demo mode without an RTSP URL", () => {
    const env = loadEnvironment({ STREAM_SOURCE_MODE: "demo", RTSP_URL: "" });
    expect(env.STREAM_SOURCE_MODE).toBe("demo");
    expect(env.CAMERA_ID).toBe("cam1");
    expect(env.BACKEND_PORT).toBe(3001);
    expect(env.WHEP_URL).toBe("http://127.0.0.1:8889/cam1/whep");
  });

  it("accepts a real camera URL and keeps the raw value only in config", () => {
    const env = loadEnvironment({
      STREAM_SOURCE_MODE: "rtsp",
      RTSP_URL: "rtsp://user:secret@camera.local:554/live",
    });
    expect(env.STREAM_SOURCE_MODE).toBe("rtsp");
    expect(parseRtspUrl(env.RTSP_URL)).toEqual({ hostname: "camera.local", port: 554 });
  });

  it("rejects RTSP mode when the URL has no host and does not echo the secret", () => {
    const secret = "SuperSecretValue";
    expect(() =>
      loadEnvironment({
        STREAM_SOURCE_MODE: "rtsp",
        RTSP_URL: `rtsp://user:${secret}@/live`,
      }),
    ).toThrow(/RTSP_URL/);
    try {
      loadEnvironment({
        STREAM_SOURCE_MODE: "rtsp",
        RTSP_URL: `rtsp://user:${secret}@/live`,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).not.toContain("user:");
    }
  });

  it("rejects a WHEP URL that does not match the camera id", () => {
    expect(() =>
      loadEnvironment({
        CAMERA_ID: "cam1",
        WHEP_URL: "http://127.0.0.1:8889/other/whep",
      }),
    ).toThrow(/WHEP_URL/);
  });

  it("rejects an invalid camera id", () => {
    expect(() => loadEnvironment({ CAMERA_ID: "../etc" })).toThrow(/CAMERA_ID/);
  });
});

describe("parseRtspUrl", () => {
  it("defaults the RTSP port to 554", () => {
    expect(parseRtspUrl("rtsps://camera.local/stream")).toEqual({
      hostname: "camera.local",
      port: 322,
    });
    expect(parseRtspUrl("http://camera.local/stream")).toBeNull();
  });
});
