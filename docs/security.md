# Security

The default deployment is a local development dashboard. Running it in Docker does not make it production-ready.

## What the repository protects

- `.env` is gitignored. `.env.example` has placeholders only.
- The camera list and status responses omit the RTSP URL, username, password, and Control API address. Zod strips unknown fields such as an accidental `rtspUrl`.
- Invalid camera ids return 400. Any other well-formed id returns 404. There is no endpoint that accepts an RTSP URL from the browser.
- API errors do not return stack traces or upstream response text.
- Logs redact RTSP userinfo and `password=`, `token=`, and `secret=` assignments.
- CORS echoes `Access-Control-Allow-Origin` only when the request `Origin` is exactly `CORS_ORIGIN` (default `http://127.0.0.1:5173`).
- Compose publishes the backend, the dashboard, and the WebRTC ports on `127.0.0.1`. RTSP `:8554` and the Control API `:9997` stay on the Compose network.
- MediaMTX API permission is limited to loopback and private ranges. Publish and read permissions are limited to path `cam1`.
- The integration test forces `--env-file .env.example`, so a developer's camera URL is not used for that run.

A search of the tracked tree found RTSP userinfo only in tests and in the placeholder comment in `.env.example`. Those values are fixtures such as `camera-password`, not live credentials.

## What this MVP does not do

Anyone who can open the dashboard origin can request camera metadata and open the WHEP URL. There is no login, no playback authorization, and no HTTPS. WebRTC is unencrypted (`webrtcEncryption: false`) so a local browser can play it without certificates.

`RTSP_URL` is still visible to `docker inspect` and to the MediaMTX process environment when real-camera mode is used. That is how the pinned MediaMTX release receives `MTX_PATHS_CAM1_SOURCE`. Do not put a production camera password in a shell history or a committed file.

A remote client also needs a reachable ICE address. This project does not ship a TURN server. Opening `8889` and `8189` on a public interface without authentication exposes the stream.

## Production hardening before any real deployment

- Terminate HTTPS in front of the dashboard, the API, and the WebRTC HTTP listener.
- Require authentication and authorize each playback session.
- Keep the Control API and RTSP ingest off the public interface.
- Store the camera URL in a secret manager, not in a repository or a chat log.
- Restrict `webrtcAllowOrigins` and `CORS_ORIGIN` to the real dashboard origin.
- Set `WEBRTC_ADDITIONAL_HOSTS` to the address browsers can reach, and add TURN if those clients are behind NAT that blocks UDP.
- Monitor MediaMTX, the publisher or camera pull, and the API separately. Source `unknown` and playback `error` are different incidents.
- Review dependency advisories before exposing the Node process beyond loopback.

## Dependency advisories

`npm audit` on 28 October 2026 reported four advisories. `npm audit fix --force` was not run.

| Severity | Package | Advisory title | Where it sits |
| --- | --- | --- | --- |
| High | zod | Zod can exhaust memory while validating oversized constrained collections | Production dependency, Zod 3.25.76 |
| Moderate | @vitest/mocker | Vitest path traversal / arbitrary file read, and code injection via unauthenticated manual mock registration | Dev dependency |
| Critical | tinypool | Prototype pollution gadgets leading to remote code execution in worker options | Dev dependency, pulled in by Vitest |
| Critical | vitest | The two Vitest issues above, through `@vitest/mocker` and `tinypool` | Dev dependency |

The Vitest findings affect the test runner, not the dashboard image's production install. The backend image uses `npm ci --omit=dev`. The Zod finding is in the API process. The API schemas bound the strings they accept, and the process is bound to loopback by default. That is not a claim that the advisory is closed.
