import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CameraPlayer } from "./CameraPlayer.js";
import type { MediaMTXWebRTCReaderConfig } from "../lib/mediamtx/reader.js";
import type { PlaybackState } from "../types/playback.js";

const created = vi.hoisted(() => [] as Array<{ conf: MediaMTXWebRTCReaderConfig; close: ReturnType<typeof vi.fn> }>);

vi.mock("../lib/mediamtx/reader.js", () => {
  return {
    MediaMTXWebRTCReader: class {
      conf: MediaMTXWebRTCReaderConfig;
      close = vi.fn();
      constructor(conf: MediaMTXWebRTCReaderConfig) {
        this.conf = conf;
        created.push(this);
      }
    },
  };
});

describe("CameraPlayer", () => {
  it("starts a WHEP reader and becomes live only after the video plays", () => {
    created.length = 0;
    const states: PlaybackState[] = [];
    render(
      <CameraPlayer
        whepUrl="http://127.0.0.1:8889/cam1/whep"
        sessionId={1}
        onPlaybackState={(state) => {
          states.push(state);
        }}
      />,
    );

    expect(created).toHaveLength(1);
    const reader = created[0];
    expect(reader?.conf.url).toBe("http://127.0.0.1:8889/cam1/whep");
    expect(reader?.conf.automaticRetry).toBe(false);
    expect(states).toEqual(["connecting"]);

    const stream = { id: "demo" } as unknown as MediaStream;
    reader?.conf.onTrack?.({ streams: [stream] } as unknown as RTCTrackEvent);
    const video = screen.getByLabelText("Camera video") as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
    expect(states).toEqual(["connecting"]);

    video.dispatchEvent(new Event("playing"));
    expect(states).toEqual(["connecting", "live"]);
  });

  it("reports stream-not-found as offline and other reader errors as error", () => {
    created.length = 0;
    const states: Array<{ state: PlaybackState; detail?: string }> = [];
    render(
      <CameraPlayer
        whepUrl="http://127.0.0.1:8889/cam1/whep"
        sessionId={1}
        onPlaybackState={(state, detail) => {
          states.push(detail === undefined ? { state } : { state, detail });
        }}
      />,
    );
    created[0]?.conf.onError?.("stream not found");
    expect(states.at(-1)).toEqual({ state: "offline", detail: "stream not found" });
    created[0]?.conf.onError?.("bad status code 500");
    expect(states.at(-1)?.state).toBe("error");
  });

  it("closes the reader and clears the media stream on unmount", () => {
    created.length = 0;
    const view = render(
      <CameraPlayer
        whepUrl="http://127.0.0.1:8889/cam1/whep"
        sessionId={1}
        onPlaybackState={() => undefined}
      />,
    );
    const reader = created[0];
    const video = screen.getByLabelText("Camera video") as HTMLVideoElement;
    reader?.conf.onTrack?.({
      streams: [{ id: "demo" } as unknown as MediaStream],
    } as unknown as RTCTrackEvent);
    view.unmount();
    expect(reader?.close).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it("opens a new reader when the session id changes and closes the previous one", () => {
    created.length = 0;
    function Harness() {
      const [sessionId, setSessionId] = useState(1);
      return (
        <>
          <button type="button" onClick={() => setSessionId(2)}>
            retry
          </button>
          <CameraPlayer
            whepUrl="http://127.0.0.1:8889/cam1/whep"
            sessionId={sessionId}
            onPlaybackState={() => undefined}
          />
        </>
      );
    }
    render(<Harness />);
    const first = created[0];
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(first?.close).toHaveBeenCalledOnce();
    expect(created).toHaveLength(2);
  });
});
