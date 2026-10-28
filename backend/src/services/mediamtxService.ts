export type SourceState = "ready" | "offline" | "unknown";

export interface SourceStatus {
  sourceState: SourceState;
  tracks: string[];
  detail: string;
}

export interface PathStatusClient {
  getPath(cameraId: string): Promise<SourceStatus>;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string, init: { signal: AbortSignal }) => Promise<FetchResponse>;

export function createMediaMtxClient(options: {
  apiUrl: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}): PathStatusClient {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  return {
    getPath(cameraId: string) {
      return readPath(fetchImpl, options.apiUrl, cameraId, options.timeoutMs);
    },
  };
}

async function readPath(
  fetchImpl: FetchLike,
  apiUrl: string,
  cameraId: string,
  timeoutMs: number,
): Promise<SourceStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${trimSlash(apiUrl)}/v3/paths/get/${encodeURIComponent(cameraId)}`, {
      signal: controller.signal,
    });
    if (response.status === 404) {
      return {
        sourceState: "offline",
        tracks: [],
        detail: "MediaMTX does not have this path",
      };
    }
    if (!response.ok) {
      return {
        sourceState: "unknown",
        tracks: [],
        detail: "MediaMTX control API returned an error",
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        sourceState: "unknown",
        tracks: [],
        detail: "MediaMTX control API returned an unreadable response",
      };
    }
    return mapPath(body);
  } catch (error) {
    if (isAbortError(error)) {
      return {
        sourceState: "unknown",
        tracks: [],
        detail: "MediaMTX control API timed out",
      };
    }
    return {
      sourceState: "unknown",
      tracks: [],
      detail: "MediaMTX control API is unavailable",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function mapPath(body: unknown): SourceStatus {
  if (!body || typeof body !== "object") {
    return {
      sourceState: "unknown",
      tracks: [],
      detail: "MediaMTX control API returned an unexpected response",
    };
  }
  const record = body as Record<string, unknown>;
  const hasOnline = typeof record.online === "boolean";
  const hasReady = typeof record.ready === "boolean";
  if (!hasOnline && !hasReady) {
    return {
      sourceState: "unknown",
      tracks: extractTracks(record),
      detail: "MediaMTX control API returned an unexpected response",
    };
  }
  const online = record.online === true || record.ready === true;
  return {
    sourceState: online ? "ready" : "offline",
    tracks: extractTracks(record),
    detail: online ? "Source is online" : "Source is configured but not online",
  };
}

function extractTracks(record: Record<string, unknown>): string[] {
  if (Array.isArray(record.tracks2)) {
    return record.tracks2.flatMap((track) => {
      if (!track || typeof track !== "object") {
        return [];
      }
      const codec = (track as { codec?: unknown }).codec;
      return typeof codec === "string" ? [codec] : [];
    });
  }
  if (Array.isArray(record.tracks)) {
    return record.tracks.filter((track): track is string => typeof track === "string");
  }
  return [];
}

function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
