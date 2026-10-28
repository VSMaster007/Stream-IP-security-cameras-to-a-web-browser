export function sanitizeLog(value: string): string {
  return value
    .replace(/rtsps?:\/\/\S+/gi, "rtsp://[redacted]")
    .replace(/((?:password|pass|token|secret)=)[^\s&]+/gi, "$1[redacted]");
}

export function logError(message: string): void {
  console.error(sanitizeLog(message));
}
