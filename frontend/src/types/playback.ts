export type PlaybackState =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline"
  | "error";

export interface PlaybackUpdate {
  state: PlaybackState;
  detail: string | null;
}
