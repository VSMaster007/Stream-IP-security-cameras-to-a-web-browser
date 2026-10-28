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
