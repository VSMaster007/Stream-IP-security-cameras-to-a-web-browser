export type SourceMode = "demo" | "rtsp";
export type SourceState = "ready" | "offline" | "unknown";
export type Reachability = "reachable" | "unreachable" | "skipped";

export interface Camera {
  id: string;
  name: string;
  path: string;
  sourceMode: SourceMode;
  whepUrl: string;
}

export interface CameraStatus {
  id: string;
  sourceState: SourceState;
  reachability: Reachability;
  tracks: string[];
  detail: string;
  checkedAt: string;
}
