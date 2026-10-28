import { useCallback, useEffect, useState } from "react";
import { fetchCameraStatus } from "../services/cameraApi.js";
import type { CameraStatus } from "../types/camera.js";

export const STATUS_POLL_INTERVAL_MS = 5000;

export interface StreamStatusMonitor {
  status: CameraStatus | null;
  error: string | null;
  refresh: () => void;
}

export function useStreamStatus(cameraId: string | null): StreamStatusMonitor {
  const [status, setStatus] = useState<CameraStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!cameraId) {
      setStatus(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active: AbortController | undefined;

    const poll = async () => {
      const requestGeneration = ++generation;
      active?.abort();
      const controller = new AbortController();
      active = controller;
      try {
        const next = await fetchCameraStatus(cameraId, controller.signal);
        if (cancelled || requestGeneration !== generation) {
          return;
        }
        setStatus(next);
        setError(null);
      } catch (caught) {
        if (cancelled || requestGeneration !== generation || isAbort(caught)) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "Status check failed");
      }
      if (!cancelled && requestGeneration === generation) {
        timer = setTimeout(() => {
          void poll();
        }, STATUS_POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      generation += 1;
      active?.abort();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [cameraId, refreshToken]);

  return { status, error, refresh };
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
