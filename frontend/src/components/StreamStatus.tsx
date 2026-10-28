import type { Reachability, SourceState } from "../types/camera.js";
import type { PlaybackState } from "../types/playback.js";

interface StreamStatusProps {
  sourceState: SourceState | "checking";
  reachability: Reachability | null;
  playbackState: PlaybackState;
  playbackDetail: string | null;
  checkedAt: string | null;
  statusError: string | null;
}

const sourceLabels: Record<SourceState | "checking", string> = {
  checking: "Checking",
  ready: "Ready",
  offline: "Offline",
  unknown: "Unknown",
};

const playbackLabels: Record<PlaybackState, string> = {
  idle: "Idle",
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
  error: "Error",
};

export function StreamStatus({
  sourceState,
  reachability,
  playbackState,
  playbackDetail,
  checkedAt,
  statusError,
}: StreamStatusProps) {
  const checkedLabel = formatCheckedAt(checkedAt);
  return (
    <section className="status-grid" aria-label="Stream status">
      <article>
        <p className="status-label">Source health</p>
        <p className={`status-value state-${sourceState}`}>{sourceLabels[sourceState]}</p>
      </article>
      <article>
        <p className="status-label">Browser playback</p>
        <p className={`status-value state-${playbackState}`}>{playbackLabels[playbackState]}</p>
      </article>
      <article>
        <p className="status-label">Last checked</p>
        <p className="status-value">{checkedLabel}</p>
      </article>
      <article>
        <p className="status-label">Camera network</p>
        <p className="status-value">{reachabilityLabel(reachability)}</p>
      </article>
      {statusError ? <p className="status-note">{statusError}</p> : null}
      {playbackDetail ? <p className="status-note">{playbackDetail}</p> : null}
    </section>
  );
}

function reachabilityLabel(reachability: Reachability | null): string {
  if (reachability === "reachable") {
    return "Reachable";
  }
  if (reachability === "unreachable") {
    return "Unreachable";
  }
  if (reachability === "skipped") {
    return "Not checked";
  }
  return "Waiting";
}

function formatCheckedAt(value: string | null): string {
  if (!value) {
    return "Not checked yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
