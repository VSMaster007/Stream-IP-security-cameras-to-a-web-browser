# Backend API

The API serves metadata and source health. It does not carry video. The browser opens `whepUrl` directly against MediaMTX.

## `GET /api/health`

```json
{
  "status": "ok",
  "timestamp": "2026-10-28T08:00:00.000Z",
  "uptimeSeconds": 12.4
}
```

This only means the Node.js process answered. It does not mean the camera or the WebRTC session is healthy.

## `GET /api/cameras`

Returns the one configured camera. The response includes the public WHEP URL and the source mode (`demo` or `rtsp`). It never includes `RTSP_URL`, a username, a password, or `MEDIAMTX_API_URL`.

## `GET /api/cameras/:id/status`

`:id` must match `CAMERA_ID`. Any other well-formed id returns 404. An id with unsupported characters returns 400.

```json
{
  "id": "cam1",
  "sourceState": "ready",
  "reachability": "skipped",
  "tracks": ["H264", "Opus"],
  "detail": "Source is online",
  "checkedAt": "2026-10-28T08:00:00.000Z"
}
```

`sourceState` is derived from MediaMTX `GET /v3/paths/get/{name}`:

| Control API result | `sourceState` |
| --- | --- |
| `online` or deprecated `ready` is true | `ready` |
| The API answers and the path is not online, including HTTP 404 | `offline` |
| Timeout, connection failure, or HTTP 5xx | `unknown` |

A timeout is not reported as `offline`. The camera may still be publishing while the Control API is unreachable.

In `rtsp` mode the backend also opens a short TCP connection to the host and port parsed from `RTSP_URL`. The result is `reachability`: `reachable`, `unreachable`, or `skipped` in demo mode. The host is not included in the JSON. Reachability does not change `sourceState`.

Errors use `{ "error": { "code", "message" } }`. Unexpected failures return `internal_error` and the server log is passed through a redaction filter before it is printed.

The server listens on `BACKEND_HOST` and `BACKEND_PORT`, which default to `127.0.0.1:3001`. CORS allows only `CORS_ORIGIN`.
