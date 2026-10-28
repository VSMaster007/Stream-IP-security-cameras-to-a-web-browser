import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../demo/publish.sh",
);
const script = readFileSync(scriptPath, "utf8");

describe("demo publisher", () => {
  it("publishes browser-compatible H.264 and Opus over RTSP TCP", () => {
    expect(script).toContain("-c:v libx264");
    expect(script).toContain("-profile:v baseline");
    expect(script).toContain("-pix_fmt yuv420p");
    expect(script).toContain("-bf 0");
    expect(script).toContain("-c:a libopus");
    expect(script).toContain("-f rtsp");
    expect(script).toContain("-rtsp_transport tcp");
    expect(script).toContain("rtsp://127.0.0.1:8554/cam1");
  });
});
