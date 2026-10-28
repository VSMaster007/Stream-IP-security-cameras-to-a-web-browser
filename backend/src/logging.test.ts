import { describe, expect, it, vi } from "vitest";
import { sanitizeLog } from "./logging.js";

describe("sanitizeLog", () => {
  it("removes RTSP credentials and password assignments", () => {
    const sanitized = sanitizeLog(
      "connect rtsp://admin:camera-password@10.1.1.5/live password=camera-password",
    );
    expect(sanitized).not.toContain("camera-password");
    expect(sanitized).toContain("rtsp://[redacted]");
    expect(sanitized).toContain("password=[redacted]");
  });
});

describe("error logging", () => {
  it("does not print secrets when an unexpected error is logged", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { errorHandler } = await import("./middleware/errorHandler.js");
    const response = {
      headersSent: false,
      status(code: number) {
        expect(code).toBe(500);
        return this;
      },
      json(body: unknown) {
        expect(JSON.stringify(body)).not.toContain("camera-password");
      },
    };
    errorHandler(
      new Error("rtsp://admin:camera-password@10.1.1.5/live"),
      {} as never,
      response as never,
      (() => undefined) as never,
    );
    const logged = errorSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).not.toContain("camera-password");
    errorSpy.mockRestore();
  });
});
