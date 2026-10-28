import { useCallback, useEffect, useState } from "react";
import { CameraCard } from "../components/CameraCard.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { usePlaybackRecovery } from "../hooks/usePlaybackRecovery.js";
import { useStreamStatus } from "../hooks/useStreamStatus.js";
import { fetchCameras } from "../services/cameraApi.js";
import type { Camera } from "../types/camera.js";

export function Dashboard() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);
  const camera = cameras[0];
  const monitored = useStreamStatus(camera?.id ?? null);
  const playback = usePlaybackRecovery();

  useEffect(() => {
    const controller = new AbortController();
    const initialRequest = requestId === 0;
    if (!initialRequest) {
      setRefreshing(true);
    }

    void (async () => {
      try {
        const nextCameras = await fetchCameras(controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setCameras(nextCameras);
        setLoadError(null);
        setPhase("ready");
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) {
          return;
        }
        setPhase("error");
        setLoadError(error instanceof Error ? error.message : "The dashboard could not load");
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false);
        }
      }
    })();

    return () => controller.abort();
  }, [requestId]);

  const refreshStatus = monitored.refresh;
  const refresh = useCallback(() => {
    setRequestId((current) => current + 1);
    refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local video gateway</p>
          <h1>IP Camera RTSP-to-WebRTC Dashboard</h1>
        </div>
        <p className="topbar-note">One configured camera. Video is delivered by MediaMTX, not by the API.</p>
      </header>
      <main>
        {phase === "loading" ? <p className="loading-panel">Loading camera</p> : null}
        {phase === "error" && loadError ? (
          <ErrorMessage title="Dashboard unavailable" message={loadError} onRetry={refresh} />
        ) : null}
        {phase === "ready" && !camera ? (
          <section className="empty-panel">
            <h2>No camera is configured</h2>
            <p>The API returned an empty camera list.</p>
          </section>
        ) : null}
        {phase === "ready" && camera ? (
          <CameraCard
            camera={camera}
            status={monitored.status}
            statusError={monitored.error}
            playbackState={playback.playbackState}
            playbackDetail={playback.playbackDetail}
            sessionId={playback.sessionId}
            refreshing={refreshing}
            onPlaybackState={playback.onPlaybackState}
            onRefresh={refresh}
            onRetryPlayback={playback.retryNow}
          />
        ) : null}
      </main>
    </div>
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
