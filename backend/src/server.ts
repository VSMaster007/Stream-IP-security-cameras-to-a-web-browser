import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { loadEnvironment } from "./config/environment.js";
import { logError } from "./logging.js";

loadLocalEnv();

const env = loadEnvironment();
const app = createApp({ env });
const server = app.listen(env.BACKEND_PORT, env.BACKEND_HOST, () => {
  console.log(`backend listening on http://${env.BACKEND_HOST}:${env.BACKEND_PORT}`);
});

function shutdown(signal: string): void {
  logError(`shutting down on ${signal}`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function loadLocalEnv(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(here, "../../.env"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }
}
