# IP Camera RTSP-to-WebRTC Dashboard

A local dashboard for one RTSP camera. MediaMTX ingests the camera, or an FFmpeg test pattern, and the browser plays the result with WebRTC. The Node API reports health and source status. It does not proxy the video.

This is a portfolio project for explaining a real streaming path. The default deployment is local development. It is not a production video platform, and it does not support more than the single configured camera `cam1`.

## What is implemented

- RTSP ingest through MediaMTX v1.21.3, either by pulling one camera or by accepting the demo publisher
- An H.264 Baseline + Opus test pattern, started with Docker Compose profile `demo`
- Browser playback with the official MediaMTX WebRTC reader over WHEP
- A React dashboard with source health, playback state, refresh, and manual retry
- Bounded automatic reconnect: 1, 2, 4, 8, 16, then 30 seconds, with jitter, capped at 10 attempts
- Separate backend, source, and playback states
- Docker Compose with loopback port bindings and an internal Control API
- Unit tests plus an opt-in demo-stack integration test

## Architecture

```text
RTSP Camera or FFmpeg Demo Source
                 |
                 | RTSP
                 v
          +-------------+
          |   MediaMTX  |
          | Media Server|
          +-------------+
             |       |
             | WebRTC / WHEP
             |       +------------------+
             v                          v
       Browser Player            Node.js Backend
             |                          |
             +------------+-------------+
                          |
                     React Dashboard
```

The longer explanation is in [docs/streaming-workflow.md](docs/streaming-workflow.md) and [docs/architecture.md](docs/architecture.md).

## Stack

- React 19, TypeScript, and Vite 7
- Node.js 22.23.4, TypeScript, and Express 4
- Zod 3 for configuration and response checks
- MediaMTX 1.21.3
- FFmpeg from Alpine 3.22.2 for the demo publisher
- nginx 1.28.0 for the built dashboard
- Docker Compose v2
- Vitest, Supertest, and Playwright (system Google Chrome)

No PostgreSQL, Redis, or Kubernetes.

## Prerequisites

- Node.js 22 LTS (`.nvmrc` is `22.23.4`) and npm 10
- Docker Engine with Compose, for the container workflow
- FFmpeg on the host only if you run `./demo/publish.sh` outside Docker
- Google Chrome, for `npm run test:integration`

## Quick start

Demo mode, no camera:

```bash
cp .env.example .env
docker compose --profile demo up --build
```

Open `http://127.0.0.1:5173`. The API is `http://127.0.0.1:3001`. The browser opens `http://127.0.0.1:8889/cam1/whep` itself.

```bash
docker compose logs -f
docker compose --profile demo down
```

If `8889` or `8189` is already in use, that command cannot bind the port. See [docs/troubleshooting.md](docs/troubleshooting.md). `npm run test:integration` moves the host WebRTC ports to `18889` and `18189` in that situation.

Node-only development still needs a MediaMTX process and, for pictures, the demo publisher:

```bash
npm install
npm run dev
```

`npm run dev` serves the API on `http://127.0.0.1:3001` and Vite on `http://127.0.0.1:5173`. Setup details are in [docs/setup.md](docs/setup.md).

## Real camera

Leave the `demo` profile stopped. In `.env`:

```dotenv
STREAM_SOURCE_MODE=rtsp
CAMERA_NAME=Office Camera
RTSP_URL=rtsp://USERNAME:PASSWORD@CAMERA_HOST:554/STREAM_PATH
```

Then `docker compose up --build`. Compose copies `RTSP_URL` into `MTX_PATHS_CAM1_SOURCE`. Use the camera's LAN address, not `127.0.0.1`. The camera must already send a browser-playable codec. MediaMTX does not transcode. The API never returns the RTSP URL.

For a browser on another machine, set `WEBRTC_ADDITIONAL_HOSTS` to this host's LAN address, publish TCP `8889` and UDP `8189` on that address, and add the remote page origin to `webrtcAllowOrigins`. Rebuild the frontend if `VITE_API_BASE_URL` changes. TURN is not included. Details are in [docs/setup.md](docs/setup.md).

## Environment

| Variable | Purpose |
| --- | --- |
| `STREAM_SOURCE_MODE` | `demo` or `rtsp` |
| `CAMERA_ID` | Stable id and MediaMTX path. Default `cam1` |
| `CAMERA_NAME` | Display name |
| `RTSP_URL` | Camera URL. Required for `rtsp`. Empty in demo mode |
| `BACKEND_HOST` / `BACKEND_PORT` | API listen address. Compose uses `0.0.0.0` inside the container and publishes `127.0.0.1:3001` |
| `CORS_ORIGIN` | Only this origin may call the API |
| `MEDIAMTX_API_URL` | Control API. Compose uses `http://mediamtx:9997` |
| `MEDIAMTX_API_TIMEOUT_MS` | Control API timeout |
| `WHEP_URL` | Browser-facing playback URL. Path must be `/<CAMERA_ID>/whep` |
| `WEBRTC_ADDITIONAL_HOSTS` | ICE host advertised by MediaMTX |
| `VITE_API_BASE_URL` | Public API URL baked into the frontend at build time |

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run test:integration
```

`npm test` does not start Docker. The integration script, the tests it runs, and the local result are in [docs/testing.md](docs/testing.md).

## Repository layout

```text
backend/            Express API
frontend/           React dashboard and vendored MediaMTX reader
mediamtx/           Pinned v1.21.3 config
demo/               FFmpeg publisher
docs/               Architecture, setup, workflow, API, security
tests/integration/  Demo stack and Chrome playback check
docker-compose.yml
```

Supporting docs: [API](docs/api.md), [MediaMTX](docs/mediamtx.md), [player](docs/webrtc-player.md), [security](docs/security.md), [troubleshooting](docs/troubleshooting.md), [screenshots](docs/screenshots/README.md).

## Verification and limits

This is the local demo dashboard on 28 October 2026. The picture is the FFmpeg test pattern. Source health is Ready and browser playback is Live at the same time. The video element was 1280 by 720. No physical camera was connected.

![Demo Camera live, with source health Ready and browser playback Live](docs/evidence/demo-live.png)

At the same time, `GET http://127.0.0.1:3001/api/cameras/cam1/status` returned:

```json
{"id":"cam1","sourceState":"ready","reachability":"skipped","tracks":["H264","Opus"],"detail":"Source is online"}
```

`reachability` is `skipped` because demo mode has no camera host to probe.

These checks were actually run on this repository:

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed. The unit run was 38 backend tests and 20 frontend tests.
- `npm run test:integration` passed. Default ports `8889` and `8189` were busy, so the script used `18889` and `18189`. Headless Chrome reached Live at 1280 pixels wide. Stopping the publisher produced `offline`. Starting it again produced `ready`.
- `docker compose --env-file .env.example --profile demo up --build -d` built `bluenviron/mediamtx:1.21.3`, the backend, the frontend, and the demo image, then failed to bind UDP `8189` because another process already had it.
- The same images, with a temporary port override, served the dashboard. Source health was Ready, playback was Live, Refresh updated the last-checked time, and Retry playback returned to Live.

The screenshot above is from that override: the dashboard is on `http://127.0.0.1:5173`, and playback uses `http://127.0.0.1:18889/cam1/whep` with ICE UDP `18189`. The committed Compose file still publishes `8889` and `8189`. A remote LAN client and a physical camera were not part of the run.

## Security

Read [docs/security.md](docs/security.md) before exposing any port beyond loopback. There is no authentication. `npm audit` reported one high-severity Zod advisory in the API and three Vitest advisories in the dev tree. `npm audit fix --force` was not applied.

## Suggested GitHub topics

These are suggestions for the repository settings page. This project does not change GitHub settings.

`ip-camera` `rtsp` `webrtc` `whep` `mediamtx` `ffmpeg` `react` `typescript` `docker-compose`

## Later work

- More than one camera, after the API, player, and tests actually cover it
- Authentication and playback authorization
- HTTPS and encrypted WebRTC
- A TURN server for clients off the host
- A transcoder for cameras that do not already send H.264
- Dependency upgrades that close the Zod advisory without a forced breaking change

## License

MIT. See [LICENSE](LICENSE).
