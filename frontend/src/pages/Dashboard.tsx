import { useCallback, useEffect, useState } from "react";
import { CameraCard } from "../components/CameraCard.js";
import { ErrorMessage } from "../components/ErrorMessage.js";
import { fetchCameraStatus, fetchCameras } from "../services/cameraApi.js";
import type { Camera, CameraStatus } from "../types/camera.js";
import type { PlaybackState } from "../types/playback.js";

export function Dashboard() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<CameraStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [playbackDetail, setPlaybackDetail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(1);
  const [requestId, setRequestId] = useState(0);

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
        const camera = nextCameras[0];
        if (!camera) {
          setStatus(null);
          setStatusError(null);
          return;
        }
        try {
          const nextStatus = await fetchCameraStatus(camera.id, controller.signal);
          if (controller.signal.aborted) {
            return;
          }
          setStatus(nextStatus);
          setStatusError(null);
        } catch (error) {
          if (controller.signal.aborted || isAbort(error)) {
            return;
          }
          setStatus(null);
          setStatusError(error instanceof Error ? error.message : "Status check failed");
        }
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

  const refresh = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  const retryPlayback = useCallback(() => {
    setPlaybackState("idle");
    setPlaybackDetail(null);
    setSessionId((current) => current + 1);
  }, []);

  const onPlaybackState = useCallback((state: PlaybackState, detail?: string) => {
    setPlaybackState(state);
    setPlaybackDetail(detail ?? null);
  }, []);

  const camera = cameras[0];

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
            status={status}
            statusError={statusError}
            playbackState={playbackState}
            playbackDetail={playbackDetail}
            sessionId={sessionId}
            refreshing={refreshing}
            onPlaybackState={onPlaybackState}
            onRefresh={refresh}
            onRetryPlayback={retryPlayback}
          />
        ) : null}
      </main>
    </div>
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
