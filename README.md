# IP Camera RTSP-to-WebRTC Dashboard

A local monitoring dashboard that ingests one RTSP camera through [MediaMTX](https://mediamtx.org/) and plays the live video in a browser with WebRTC. A generated test stream is available when no physical camera is connected.

This repository is a portfolio project. The default deployment is for local development. It is not a production video platform.

## Stack

- React, TypeScript, and Vite
- Node.js 22 LTS, TypeScript, and Express
- Zod for configuration validation
- MediaMTX for RTSP ingest and WebRTC delivery
- FFmpeg for the demo publisher
- Docker Compose
- Vitest

## Prerequisites

- Node.js 22 LTS (`nvm use` reads `.nvmrc`)
- npm 10
- Docker Engine and Docker Compose, for the container workflow
- FFmpeg, only if you publish the demo stream outside Docker

## Scripts

From the repository root:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```

`npm run dev` starts the Vite dashboard on `http://127.0.0.1:5173`. Backend, MediaMTX, and demo-stream commands are added with their features and documented in `docs/setup.md`.

## Configuration

Copy the template and keep real values out of Git:

```bash
cp .env.example .env
```

`.env.example` contains placeholders only. Do not commit `.env` or a real `RTSP_URL`.

## License

MIT. See [LICENSE](LICENSE).
