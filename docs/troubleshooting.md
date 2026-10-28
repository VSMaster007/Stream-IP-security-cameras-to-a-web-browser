# Troubleshooting

## The demo Compose command cannot bind port 8189 or 8889

`docker compose --profile demo up --build` publishes `127.0.0.1:8889` and `127.0.0.1:8189/udp`. On the machine used to verify this repository, that command built the images and then failed with `Bind for 0.0.0.0:8189 failed: port is already allocated`. An existing MediaMTX already owned `8554`, `8889`, `8189`, and `127.0.0.1:9997`. That process was left running.

`npm run test:integration` detects a busy `8889` or `8189` and republishes WebRTC HTTP on `18889` and ICE on `18189`, with `MTX_WEBRTCLOCALUDPADDRESS=:18189`. The committed Compose file still uses `8889` and `8189`. To use the default file, stop the other listener or change both the published UDP port and `webrtcLocalUDPAddress` together.

## The page loads and source health is Ready, but playback stays Connecting

The API being healthy does not start video. Check, in order:

1. The browser origin is allowed in `webrtcAllowOrigins`. A page on `http://127.0.0.1:5173` matches the committed config. Another host or port does not.
2. The WHEP URL in the camera card is reachable from the browser. Inside Compose the backend still returns a host URL such as `http://127.0.0.1:8889/cam1/whep`, not `http://mediamtx:8889`.
3. UDP `8189` on the advertised host is the port MediaMTX bound. Docker bridge addresses are disabled with `webrtcIPsFromInterfaces: false`.
4. The camera codec is one the browser can play. MediaMTX will not turn H.265 or MJPEG into H.264.

## Source health is Offline

MediaMTX answered, and `cam1` is not online. In demo mode the FFmpeg publisher is not connected. In real-camera mode the pull failed or the camera stopped. Do not run the `demo` profile while `RTSP_URL` is set. Both would target `cam1`.

## Source health is Unknown

The backend could not classify the Control API response. Typical causes are a timeout, a connection error, HTTP 5xx, or a body that is not JSON. That state does not mean the camera itself is offline. Confirm the backend is using `http://mediamtx:9997` inside Compose, or `http://127.0.0.1:9997` when MediaMTX runs on the host. The Control API is not published on the host by the Compose file.

## Real-camera URL uses 127.0.0.1

From inside the MediaMTX container, `127.0.0.1` is the container. Use the camera's LAN address. The backend reachability check uses the hostname from `RTSP_URL` and does not return that hostname to the browser.

## Playback recovers slowly, then stops

Automatic retries wait 1, 2, 4, 8, 16, and then 30 seconds, with a little jitter, and stop after 10 failures. Retry playback starts a new session immediately and resets that counter. A `live` video also resets it.

## Credentials in a log or a screenshot

The API is not supposed to return the RTSP URL. Logs redact `rtsp://` userinfo and assignments that look like passwords. A screenshot of `.env`, `docker compose config`, or a container environment can still show the camera URL, because Compose passes `RTSP_URL` into the MediaMTX and backend environments. Do not publish those outputs.
