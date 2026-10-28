import cors from "cors";
import express, { type Express } from "express";
import type { AppConfig } from "./config/environment.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { camerasRouter, type CameraRouteDependencies } from "./routes/cameras.js";
import { healthRouter } from "./routes/health.js";
import { createMediaMtxClient, type PathStatusClient } from "./services/mediamtxService.js";
import { checkTcpReachable } from "./services/reachability.js";

export interface CreateAppOptions {
  env: AppConfig;
  media?: PathStatusClient;
  checkReachability?: CameraRouteDependencies["checkReachability"];
  now?: () => Date;
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin(requestOrigin, callback) {
        if (requestOrigin === options.env.CORS_ORIGIN) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ["GET"],
    }),
  );
  app.use("/api", healthRouter());
  app.use(
    "/api",
    camerasRouter({
      env: options.env,
      media:
        options.media ??
        createMediaMtxClient({
          apiUrl: options.env.MEDIAMTX_API_URL,
          timeoutMs: options.env.MEDIAMTX_API_TIMEOUT_MS,
        }),
      checkReachability: options.checkReachability ?? checkTcpReachable,
      ...(options.now ? { now: options.now } : {}),
    }),
  );
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: "not_found", message: "Resource was not found" },
    });
  });
  app.use(errorHandler);
  return app;
}
