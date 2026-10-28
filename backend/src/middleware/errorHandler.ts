import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../httpError.js";
import { logError } from "../logging.js";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  if (response.headersSent) {
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.publicMessage },
    });
    return;
  }

  const detail = error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
  logError(`request failed: ${detail}`);
  response.status(500).json({
    error: { code: "internal_error", message: "Internal server error" },
  });
}
