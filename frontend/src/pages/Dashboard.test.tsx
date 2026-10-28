import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard.js";

const created = vi.hoisted(() => [] as Array<{ url: string }>);

vi.mock("../lib/mediamtx/reader.js", () => {
  return {
    MediaMTXWebRTCReader: class {
      close = vi.fn();
      constructor(conf: { url: string }) {
        created.push({ url: conf.url });
      }
    },
  };
});

const camera = {
  id: "cam1",
  name: "Office Camera",
  path: "cam1",
  sourceMode: "demo",
  whepUrl: "http://127.0.0.1:8889/cam1/whep",
};

const status = {
  id: "cam1",
  sourceState: "ready",
  reachability: "skipped",
  tracks: ["H264"],
  detail: "Source is online",
  checkedAt: "2026-10-28T08:00:00.000Z",
};

function mockApi(options?: { cameras?: unknown; status?: unknown; failList?: boolean }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (options?.failList) {
        throw new Error("offline");
      }
      if (url.endsWith("/api/cameras")) {
        return json(options?.cameras ?? { cameras: [camera] });
      }
      return json(options?.status ?? status);
    }),
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    created.length = 0;
    vi.unstubAllGlobals();
  });

  it("shows camera metadata, source health, and the player", async () => {
    mockApi();
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: "IP Camera RTSP-to-WebRTC Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Loading camera")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Office Camera" })).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(await screen.findByText("Connecting")).toBeInTheDocument();
    expect(screen.getByLabelText("Camera video")).toBeInTheDocument();
    expect(created[0]?.url).toBe(camera.whepUrl);
    expect(screen.queryByText("rtsp://")).not.toBeInTheDocument();
  });

  it("shows an error state when the camera list cannot be loaded", async () => {
    mockApi({ failList: true });
    render(<Dashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The API could not be reached");
    mockApi();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Office Camera" })).toBeInTheDocument();
  });

  it("shows an empty state when no camera is configured", async () => {
    mockApi({ cameras: { cameras: [] } });
    render(<Dashboard />);
    expect(await screen.findByRole("heading", { name: "No camera is configured" })).toBeInTheDocument();
  });

  it("restarts playback when retry is clicked", async () => {
    mockApi();
    render(<Dashboard />);
    await screen.findByRole("heading", { name: "Office Camera" });
    expect(created).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry playback" }));
    expect(created).toHaveLength(2);
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
