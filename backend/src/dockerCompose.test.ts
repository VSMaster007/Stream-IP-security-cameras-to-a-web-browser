import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Docker Compose", () => {
  const compose = read("docker-compose.yml");

  it("pins MediaMTX and publishes only the browser-facing WebRTC ports on loopback", () => {
    expect(compose).toContain("image: bluenviron/mediamtx:1.21.3");
    expect(compose).toContain("127.0.0.1:8889:8889");
    expect(compose).toContain("127.0.0.1:8189:8189/udp");
    expect(compose).toContain("127.0.0.1:3001:3001");
    expect(compose).toContain("127.0.0.1:5173:5173");
    expect(compose).not.toContain("9997:9997");
    expect(compose).not.toContain("8554:8554");
  });

  it("keeps the Control API on the Compose network and the demo publisher behind a profile", () => {
    expect(compose).toContain("MEDIAMTX_API_URL: http://mediamtx:9997");
    expect(compose).toContain('profiles: ["demo"]');
    expect(compose).toContain("RTSP_PUBLISH_URL: rtsp://mediamtx:8554/cam1");
    expect(compose).toContain("MTX_PATHS_CAM1_SOURCE: ${RTSP_URL:-publisher}");
  });

  it("pins the frontend and backend base images", () => {
    expect(read("backend/Dockerfile")).toContain("node:22.23.4-bookworm-slim");
    expect(read("frontend/Dockerfile")).toContain("node:22.23.4-bookworm-slim");
    expect(read("frontend/Dockerfile")).toContain("nginx:1.28.0-alpine");
    expect(read("demo/Dockerfile")).toContain("alpine:3.22.2");
  });
});
