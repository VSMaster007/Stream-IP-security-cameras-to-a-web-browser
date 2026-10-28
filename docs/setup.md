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

The dashboard listens on `http://127.0.0.1:5173`.

## Environment

```bash
cp .env.example .env
```

Leave `STREAM_SOURCE_MODE=demo` until a camera URL is available. Real camera values stay in `.env` and are never returned by the API.
