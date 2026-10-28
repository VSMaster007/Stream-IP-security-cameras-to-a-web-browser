import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/src/lib/mediamtx/reader.js",
);

describe("vendored MediaMTX reader", () => {
  const source = readFileSync(readerPath, "utf8");

  it("comes from MediaMTX v1.21.3 and keeps WHEP signaling", () => {
    expect(source).toContain("MediaMTX v1.21.3");
    expect(source).toContain('method: "POST"');
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("application/sdp");
    expect(source).toContain("export { MediaMTXWebRTCReader }");
  });

  it("can disable the upstream unbounded retry", () => {
    expect(source).toContain("conf.automaticRetry !== false");
    expect(source).toContain("retrying in some seconds");
  });
});
