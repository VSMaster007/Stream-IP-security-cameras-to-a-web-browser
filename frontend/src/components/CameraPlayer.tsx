import { useEffect, useRef } from "react";
import { MediaMTXWebRTCReader } from "../lib/mediamtx/reader.js";
import type { PlaybackState } from "../types/playback.js";

export interface CameraPlayerProps {
  whepUrl: string;
  sessionId: number;
  onPlaybackState: (state: PlaybackState, detail?: string) => void;
}

export function CameraPlayer({ whepUrl, sessionId, onPlaybackState }: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlaybackStateRef = useRef(onPlaybackState);
  onPlaybackStateRef.current = onPlaybackState;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    onPlaybackStateRef.current("connecting");
    const reader = new MediaMTXWebRTCReader({
      url: whepUrl,
      automaticRetry: false,
      onError: (err) => {
        const offline = err.toLowerCase().includes("stream not found");
        onPlaybackStateRef.current(offline ? "offline" : "error", err);
      },
      onTrack: (event) => {
        const stream = event.streams[0];
        if (stream) {
          video.srcObject = stream;
        }
      },
    });

    const handlePlaying = () => {
      onPlaybackStateRef.current("live");
    };
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("playing", handlePlaying);
      reader.close();
      video.srcObject = null;
    };
  }, [whepUrl, sessionId]);

  return (
    <video
      ref={videoRef}
      className="camera-video"
      muted
      autoPlay
      playsInline
      controls
      aria-label="Camera video"
    />
  );
}
