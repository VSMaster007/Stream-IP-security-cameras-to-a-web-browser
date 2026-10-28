import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const configPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../mediamtx/mediamtx.yml",
);
const config = readFileSync(configPath, "utf8");

function activeLines(): string[] {
  return config
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("#");
    });
}

describe("MediaMTX v1.21.3 configuration", () => {
  it("pins the documented release in the file header", () => {
    expect(config).toContain("MediaMTX v1.21.3");
  });

  it("enables the internal control API and browser WebRTC listener", () => {
    const lines = activeLines();
    expect(lines).toContain("api: true");
    expect(lines).toContain("apiAddress: :9997");
    expect(lines).toContain("webrtc: true");
    expect(lines).toContain("webrtcAddress: :8889");
    expect(lines).toContain("webrtcLocalUDPAddress: :8189");
    expect(lines).toContain("rtspAddress: :8554");
    expect(lines).toContain("rtspTransports: [tcp]");
  });

  it("defines only the cam1 publisher path", () => {
    expect(config).toMatch(/^ {2}cam1:/m);
    expect(config).toContain("source: publisher");
    expect(config).not.toMatch(/^ {2}all_others:/m);
  });

  it("does not enable unused public protocols", () => {
    const lines = activeLines();
    expect(lines).toContain("rtmp: false");
    expect(lines).toContain("hls: false");
    expect(lines).toContain("srt: false");
    expect(lines).toContain("moq: false");
    expect(lines).toContain("playback: false");
  });

  it("restricts the control API to loopback and private networks", () => {
    expect(config).toContain("127.0.0.1");
    expect(config).toContain("10.0.0.0/8");
    expect(config).toContain("172.16.0.0/12");
    expect(config).toContain("192.168.0.0/16");
    expect(config).toContain("action: api");
  });

  it("allows the local dashboard origins to open WHEP sessions", () => {
    expect(config).toContain("http://127.0.0.1:5173");
    expect(config).toContain("http://localhost:5173");
  });
});
