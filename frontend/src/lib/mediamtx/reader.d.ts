export interface MediaMTXWebRTCReaderConfig {
  url: string;
  user?: string;
  pass?: string;
  token?: string;
  /** Upstream retries forever when this is omitted or true. */
  automaticRetry?: boolean;
  onError?: (err: string) => void;
  onTrack?: (evt: RTCTrackEvent) => void;
  onDataChannel?: (evt: RTCDataChannelEvent) => void;
}

export declare class MediaMTXWebRTCReader {
  constructor(conf: MediaMTXWebRTCReaderConfig);
  close(): void;
}
