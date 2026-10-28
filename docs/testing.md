# Testing

`npm test` runs the backend and frontend unit tests. Those tests mock the MediaMTX Control API and the WebRTC reader. They do not start Docker.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Demo stack integration

`npm run test:integration` builds and starts Compose profile `demo`, waits until `cam1` is `ready` with H.264 and Opus, plays the dashboard in headless Chrome through Playwright, stops the publisher and expects `offline`, starts the publisher and expects `ready` again, then runs `docker compose --profile demo down`.

The script always interpolates `.env.example`, so a local `.env` camera URL is not used. If host ports `8889` or `8189` are already taken, it publishes WebRTC HTTP on `127.0.0.1:18889` and ICE on `127.0.0.1:18189`, and sets `MTX_WEBRTCLOCALUDPADDRESS=:18189` so the ICE candidate matches. Ports `3001` and `5173` must be free. Playwright uses the installed Google Chrome channel rather than a downloaded browser.

This check needs Docker and Chrome. It is separate from `npm test` because it takes over those host ports for the duration of the run.

A local run found `8889` and `8189` already allocated, switched to `18889` and `18189`, and passed. Headless Chrome reached Live with a 1280-pixel-wide video. After the publisher stopped, the API reported `offline`. After it started again, the API reported `ready`. The script then removed the Compose project.
