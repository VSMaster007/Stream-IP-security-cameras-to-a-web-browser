import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

vi.mock("./lib/mediamtx/reader.js", () => {
  return {
    MediaMTXWebRTCReader: class {
      close(): void {}
      constructor() {}
    },
  };
});

describe("App", () => {
  it("renders the project title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/api/cameras")) {
          return new Response(
            JSON.stringify({
              cameras: [
                {
                  id: "cam1",
                  name: "Demo Camera",
                  path: "cam1",
                  sourceMode: "demo",
                  whepUrl: "http://127.0.0.1:8889/cam1/whep",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            id: "cam1",
            sourceState: "unknown",
            reachability: "skipped",
            tracks: [],
            detail: "MediaMTX control API is unavailable",
            checkedAt: "2026-10-28T08:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "IP Camera RTSP-to-WebRTC Dashboard" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Demo Camera" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
