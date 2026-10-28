import { useEffect, useRef, useState } from "react";
import { MAX_AUTOMATIC_RETRIES, retryDelayMs } from "../lib/backoff.js";
import type { PlaybackState } from "../types/playback.js";

export interface PlaybackRecovery {
  sessionId: number;
  playbackState: PlaybackState;
  playbackDetail: string | null;
  onPlaybackState: (state: PlaybackState, detail?: string) => void;
  retryNow: () => void;
}

interface PlaybackRecoveryOptions {
  delayMs?: (attempt: number) => number;
  maxRetries?: number;
}

export function usePlaybackRecovery(options: PlaybackRecoveryOptions = {}): PlaybackRecovery {
  const delayMs = options.delayMs ?? ((attempt: number) => retryDelayMs(attempt));
  const maxRetries = options.maxRetries ?? MAX_AUTOMATIC_RETRIES;
  const [sessionId, setSessionId] = useState(1);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [playbackDetail, setPlaybackDetail] = useState<string | null>(null);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(delayMs);
  const maxRef = useRef(maxRetries);
  delayRef.current = delayMs;
  maxRef.current = maxRetries;

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const onPlaybackState = (state: PlaybackState, detail?: string) => {
    if (state === "live") {
      attempts.current = 0;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setPlaybackState("live");
      setPlaybackDetail(null);
      return;
    }

    if (state !== "error" && state !== "offline") {
      setPlaybackState(state);
      setPlaybackDetail(detail ?? null);
      return;
    }

    if (attempts.current >= maxRef.current) {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      setPlaybackState(state);
      setPlaybackDetail(detail ?? null);
      return;
    }

    const delay = delayRef.current(attempts.current);
    attempts.current += 1;
    setPlaybackState("reconnecting");
    setPlaybackDetail(detail ?? null);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      setSessionId((current) => current + 1);
    }, delay);
  };

  const retryNow = () => {
    attempts.current = 0;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setPlaybackDetail(null);
    setPlaybackState("connecting");
    setSessionId((current) => current + 1);
  };

  return { sessionId, playbackState, playbackDetail, onPlaybackState, retryNow };
}
