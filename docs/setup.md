# Setup

## Local Node toolchain

```bash
nvm use
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

The dashboard listens on `http://127.0.0.1:5173`. The API listens on `http://127.0.0.1:3001` when `npm run dev` is started from the repository root. Copy `.env.example` to `.env` before starting the backend if you need values other than the defaults. The API contract is in [api.md](api.md).

## Environment

```bash
cp .env.example .env
```

Leave `STREAM_SOURCE_MODE=demo` until a camera URL is available. Real camera values stay in `.env` and are never returned by the API.

MediaMTX configuration is described in [mediamtx.md](mediamtx.md). The generated test stream is described in [../demo/README.md](../demo/README.md).

## Docker Compose

The Compose file runs four services:

| Service | Image | Host port |
| --- | --- | --- |
| MediaMTX v1.21.3 | `bluenviron/mediamtx:1.21.3` | `127.0.0.1:8889` (WebRTC HTTP) and `127.0.0.1:8189/udp` (ICE) |
| Backend | Node 22.23.4 | `127.0.0.1:3001` |
| Frontend | nginx 1.28.0 serving the Vite build | `127.0.0.1:5173` |
| Demo publisher | Alpine 3.22.2 with FFmpeg | none; profile `demo` only |

RTSP `:8554` and the Control API `:9997` are reachable only on the Compose network. The backend calls `http://mediamtx:9997`. Inside the backend container the process listens on `0.0.0.0:3001`; Compose publishes that port on `127.0.0.1` only.

The MediaMTX image is distroless, so it has no shell or HTTP client for a container healthcheck. The backend healthcheck calls `/api/health`. The frontend healthcheck requests the dashboard page. The demo service restarts until MediaMTX accepts the RTSP publish.

### Demo mode

Leave `RTSP_URL` empty. Compose then sets `MTX_PATHS_CAM1_SOURCE=publisher`, and the demo profile publishes the test pattern to `rtsp://mediamtx:8554/cam1`.

```bash
cp .env.example .env
docker compose --profile demo up --build
docker compose logs -f
docker compose --profile demo down
```

Open `http://127.0.0.1:5173`. The browser loads the page from nginx, calls the API on `http://127.0.0.1:3001`, and opens the WHEP session at `http://127.0.0.1:8889/cam1/whep`. Video packets do not pass through the backend.

`WEBRTC_ADDITIONAL_HOSTS` is copied to `MTX_WEBRTCADDITIONALHOSTS`. Keep it at `127.0.0.1` when the browser is on the same machine. For a browser on another LAN host, set it to this machine's LAN address, publish `8889/tcp` and `8189/udp` on that address, and add the remote page origin to `webrtcAllowOrigins` in `mediamtx/mediamtx.yml`. A remote client also needs a matching `WHEP_URL`, `CORS_ORIGIN`, and `VITE_API_BASE_URL`. The frontend value is baked in at image build time, so change it and rebuild the frontend image.

If another process already owns `8889` or `8189`, the default Compose command cannot bind those ports. Stop that process or change the published host ports. The ICE candidate uses the UDP port MediaMTX binds inside the container (`webrtcLocalUDPAddress`, `:8189`). The published host UDP port has to be the same number, unless you also set `MTX_WEBRTCLOCALUDPADDRESS` to the published port.

On this machine the default command built all three images and pulled `bluenviron/mediamtx:1.21.3`, then failed with `Bind for 0.0.0.0:8189 failed: port is already allocated`. An existing MediaMTX already owned `8554`, `8889`, `8189`, and `127.0.0.1:9997`. A temporary, uncommitted override published WebRTC HTTP on `127.0.0.1:18889` and ICE on `127.0.0.1:18189`, set `MTX_WEBRTCLOCALUDPADDRESS=:18189`, and pointed `WHEP_URL` at port `18889`. With that override the demo path reported `sourceState: ready` with H.264 and Opus tracks, `/api/health` returned ok, and the dashboard at `http://127.0.0.1:5173` played a 1280x720 test pattern. Refresh updated the last-checked time, and Retry playback returned to Live. The committed Compose file still uses `8889` and `8189`.

### Real camera

Do not start the `demo` profile. Put the camera URL in `.env` and switch the source mode:

```dotenv
STREAM_SOURCE_MODE=rtsp
CAMERA_NAME=Office Camera
RTSP_URL=rtsp://USERNAME:PASSWORD@CAMERA_HOST:554/STREAM_PATH
```

Compose passes that same URL to MediaMTX as `MTX_PATHS_CAM1_SOURCE`. The URL stays in the MediaMTX and backend process environments. The API returns camera name, id, source mode, and the browser WHEP URL. It does not return the RTSP URL.

Use the camera's LAN address. `127.0.0.1` inside the MediaMTX container is the container itself, not a camera running on the host. The camera must already emit a browser-compatible codec such as H.264; MediaMTX does not transcode.

```bash
docker compose up --build
```
