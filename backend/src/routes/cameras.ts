import { Router } from "express";
import type { AppConfig } from "../config/environment.js";
import { parseRtspUrl } from "../config/environment.js";
import { HttpError } from "../httpError.js";
import type { PathStatusClient } from "../services/mediamtxService.js";

const CAMERA_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export interface CameraRouteDependencies {
  env: AppConfig;
  media: PathStatusClient;
  checkReachability: (hostname: string, port: number, timeoutMs: number) => Promise<boolean>;
  now?: () => Date;
}

export function camerasRouter(dependencies: CameraRouteDependencies): Router {
  const router = Router();
  const now = dependencies.now ?? (() => new Date());

  router.get("/cameras", (_request, response) => {
    const { env } = dependencies;
    response.json({
      cameras: [
        {
          id: env.CAMERA_ID,
          name: env.CAMERA_NAME,
          path: env.CAMERA_ID,
          sourceMode: env.STREAM_SOURCE_MODE,
          whepUrl: env.WHEP_URL,
        },
      ],
    });
  });

  router.get("/cameras/:id/status", async (request, response, next) => {
    try {
      const id = request.params.id;
      if (typeof id !== "string" || !CAMERA_ID_PATTERN.test(id)) {
        throw new HttpError(400, "invalid_camera_id", "Camera id is invalid");
      }
      if (id !== dependencies.env.CAMERA_ID) {
        throw new HttpError(404, "camera_not_found", "Camera was not found");
      }

      const source = await dependencies.media.getPath(id);
      const reachability = await readReachability(dependencies);
      response.json({
        id,
        sourceState: source.sourceState,
        reachability,
        tracks: source.tracks,
        detail: source.detail,
        checkedAt: now().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function readReachability(
  dependencies: CameraRouteDependencies,
): Promise<"reachable" | "unreachable" | "skipped"> {
  if (dependencies.env.STREAM_SOURCE_MODE !== "rtsp") {
    return "skipped";
  }
  const target = parseRtspUrl(dependencies.env.RTSP_URL);
  if (!target) {
    return "unreachable";
  }
  const reachable = await dependencies.checkReachability(
    target.hostname,
    target.port,
    dependencies.env.MEDIAMTX_API_TIMEOUT_MS,
  );
  return reachable ? "reachable" : "unreachable";
}
