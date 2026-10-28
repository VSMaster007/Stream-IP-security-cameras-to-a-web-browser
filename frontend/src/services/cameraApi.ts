import { z } from "zod";
import type { Camera, CameraStatus } from "../types/camera.js";

const cameraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  sourceMode: z.enum(["demo", "rtsp"]),
  whepUrl: z.string().url(),
});

const cameraListSchema = z.object({
  cameras: z.array(cameraSchema),
});

const statusSchema = z.object({
  id: z.string().min(1),
  sourceState: z.enum(["ready", "offline", "unknown"]),
  reachability: z.enum(["reachable", "unreachable", "skipped"]),
  tracks: z.array(z.string()),
  detail: z.string(),
  checkedAt: z.string().min(1),
});

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const value = typeof configured === "string" && configured.length > 0
    ? configured
    : "http://127.0.0.1:3001";
  return value.replace(/\/$/, "");
}

export async function fetchCameras(signal?: AbortSignal): Promise<Camera[]> {
  const response = await readJson(`${apiBaseUrl()}/api/cameras`, signal);
  const parsed = cameraListSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("The API returned an unexpected camera list");
  }
  return parsed.data.cameras;
}

export async function fetchCameraStatus(id: string, signal?: AbortSignal): Promise<CameraStatus> {
  const response = await readJson(`${apiBaseUrl()}/api/cameras/${encodeURIComponent(id)}/status`, signal);
  const parsed = statusSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("The API returned an unexpected camera status");
  }
  return parsed.data;
}

async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    const init: RequestInit = { headers: { Accept: "application/json" } };
    if (signal) {
      init.signal = signal;
    }
    response = await fetch(url, init);
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }
    throw new Error("The API could not be reached");
  }
  if (!response.ok) {
    throw new Error(`The API request failed (${response.status})`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error("The API returned an unreadable response");
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
