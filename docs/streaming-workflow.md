# Streaming workflow

This is the path one camera frame takes from a source to the dashboard, and the decisions that keep those steps separate.

## 1. A source publishes or is pulled

Demo mode and real-camera mode never share `cam1` at the same time.

In demo mode, MediaMTX path `cam1` has `source: publisher`. The FFmpeg container connects to `rtsp://mediamtx:8554/cam1` and sends an H.264 Baseline / Opus test pattern. MediaMTX does not create that picture. FFmpeg does.

In real-camera mode, Compose sets `MTX_PATHS_CAM1_SOURCE` to the camera's RTSP URL. MediaMTX opens that URL itself and pulls the stream. The demo container stays off. `127.0.0.1` inside the MediaMTX container is the container, so the camera address has to be a LAN or DNS name the container can route to.

RTSP here is only the ingest hop. The browser never speaks RTSP.

## 2. MediaMTX owns the media

MediaMTX v1.21.3 accepts the RTSP session, records the path as online, and can hand the same tracks to a WebRTC reader. It does not transcode. If the camera sends H.265, MJPEG, or AAC, a browser can fail even though the path is online. The demo stream avoids that by encoding H.264 Baseline level 3.1, `yuv420p`, no B-frames, and Opus at 48 kHz.

## 3. The browser plays WebRTC through WHEP

The page gets `whepUrl` from `GET /api/cameras`. The official `MediaMTXWebRTCReader` then talks to MediaMTX directly:

1. `OPTIONS` on the WHEP URL reads the ICE servers from the `Link` header.
2. `POST` with `application/sdp` sends the browser offer. MediaMTX returns the answer and a session URL.
3. `PATCH` with `application/trickle-ice-sdpfrag` adds ICE candidates.
4. `DELETE` closes the session when the reader is replaced or the component unmounts.

The local WHEP URL is `http://127.0.0.1:8889/cam1/whep`. Since MediaMTX v1.21.1, that POST is rejected unless the page origin is in `webrtcAllowOrigins`. The committed config allows `http://127.0.0.1:5173` and `http://localhost:5173`.

Playback becomes `live` only after the HTML video element fires `playing`. A successful API response, or a received track, is not enough.

## 4. ICE, STUN, and TURN

WebRTC still has to move the media packets. MediaMTX is configured with `webrtcIPsFromInterfaces: false` and `webrtcAdditionalHosts: [127.0.0.1]`, so the candidate it offers is a host candidate on UDP `8189`, not a Docker bridge address the browser cannot reach.

On one machine that host candidate is sufficient. STUN is how a peer discovers a server-reflexive address behind NAT. TURN is a relay for networks that block UDP. This project does not run STUN or TURN servers. A browser on another network will not play video until `WEBRTC_ADDITIONAL_HOSTS`, the published UDP port, and possibly a TURN server match that network. Changing the published UDP port without also changing `webrtcLocalUDPAddress` makes the candidate point at the wrong port.

## 5. What the API is for

The backend reads the Control API at `http://mediamtx:9997` inside Compose, or `http://127.0.0.1:9997` for a local process. That port is not published by Compose.

`GET /api/cameras/cam1/status` maps the path like this:

| Control API result | `sourceState` |
| --- | --- |
| `online` or deprecated `ready` is true | `ready` |
| The API answered and the path is not online, including HTTP 404 | `offline` |
| Timeout, connection failure, HTTP 5xx, or unreadable JSON | `unknown` |

`unknown` is not treated as proof that the camera is down. A TCP reachability check of the RTSP host is a separate `reachability` field and does not change `sourceState`. Demo mode reports `skipped` because there is no camera host to probe.

The dashboard polls this about every five seconds. The next poll starts after the previous one finishes. An aborted or older response cannot overwrite a newer one. A failed poll keeps the last source state and shows an error string.

## 6. Reconnection

The vendored reader has `automaticRetry: false`, so it does not retry forever on its own. `usePlaybackRecovery` waits 1, 2, 4, 8, 16, then 30 seconds, plus up to 20 percent jitter, for at most 10 failures. `live` resets the counter. Retry playback cancels the timer and opens a new session immediately. Unmount clears the timer before another reader can be created.

## 7. How to talk about a failure

Ask which of the three states failed.

- `/api/health` fails: the backend process or its port is the problem.
- Source health is `offline`: MediaMTX is up and path `cam1` has no publisher or pull.
- Source health is `unknown`: the backend could not get a trustworthy answer from the Control API.
- Source health is `ready` and playback is `error` or stuck on `connecting`: the browser, WHEP origin, codec, or ICE path is the problem.
