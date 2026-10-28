import { CameraPlayer } from "./CameraPlayer.js";
import { StreamStatus } from "./StreamStatus.js";
import type { Camera, CameraStatus, Reachability, SourceState } from "../types/camera.js";
import type { PlaybackState } from "../types/playback.js";

interface CameraCardProps {
  camera: Camera;
  status: CameraStatus | null;
  statusError: string | null;
  playbackState: PlaybackState;
  playbackDetail: string | null;
  sessionId: number;
  refreshing: boolean;
  onPlaybackState: (state: PlaybackState, detail?: string) => void;
  onRefresh: () => void;
  onRetryPlayback: () => void;
}

export function CameraCard({
  camera,
  status,
  statusError,
  playbackState,
  playbackDetail,
  sessionId,
  refreshing,
  onPlaybackState,
  onRefresh,
  onRetryPlayback,
}: CameraCardProps) {
  const sourceState: SourceState | "checking" = status?.sourceState ?? (statusError ? "unknown" : "checking");
  const reachability: Reachability | null = status?.reachability ?? null;
  return (
    <article className="camera-card">
      <header className="camera-heading">
        <div>
          <p className="eyebrow">{camera.sourceMode === "demo" ? "Demo source" : "RTSP source"}</p>
          <h2>{camera.name}</h2>
        </div>
        <dl className="camera-meta">
          <div>
            <dt>Camera</dt>
            <dd>{camera.id}</dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd>{camera.path}</dd>
          </div>
        </dl>
      </header>
      <CameraPlayer
        whepUrl={camera.whepUrl}
        sessionId={sessionId}
        onPlaybackState={onPlaybackState}
      />
      <StreamStatus
        sourceState={sourceState}
        reachability={reachability}
        playbackState={playbackState}
        playbackDetail={playbackDetail}
        checkedAt={status?.checkedAt ?? null}
        statusError={statusError}
      />
      <div className="actions">
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
        <button type="button" onClick={onRetryPlayback}>
          Retry playback
        </button>
      </div>
      <details className="troubleshooting">
        <summary>Troubleshooting</summary>
        <ul>
          <li>Source health comes from MediaMTX. Playback comes from the browser video element.</li>
          <li>A healthy API response does not mean the video is live.</li>
          <li>Demo mode needs the FFmpeg publisher. Do not run it while a real camera uses cam1.</li>
          <li>The browser must reach the WHEP URL and UDP port 8189. MediaMTX does not transcode.</li>
          {status && status.tracks.length > 0 ? <li>Reported tracks: {status.tracks.join(", ")}</li> : null}
        </ul>
      </details>
    </article>
  );
}
