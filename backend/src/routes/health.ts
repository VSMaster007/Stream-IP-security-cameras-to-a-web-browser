import { Router } from "express";

export function healthRouter(): Router {
  const router = Router();
  router.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime() * 10) / 10,
    });
  });
  return router;
}
