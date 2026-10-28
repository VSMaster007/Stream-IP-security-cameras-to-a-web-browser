import { describe, expect, it } from "vitest";
import { nodeEngine, projectName } from "./version.js";

describe("project foundation", () => {
  it("identifies the portfolio project", () => {
    expect(projectName).toBe("ip-camera-rtsp-webrtc-dashboard");
    expect(nodeEngine.startsWith(">=")).toBe(true);
  });
});
