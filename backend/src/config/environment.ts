import { z } from "zod";

const cameraIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,64}$/, "CAMERA_ID must contain only letters, numbers, underscores, or hyphens");

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BACKEND_HOST: z.string().min(1).default("127.0.0.1"),
    BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    CAMERA_ID: cameraIdSchema.default("cam1"),
    CAMERA_NAME: z.string().trim().min(1).max(80).default("Demo Camera"),
    STREAM_SOURCE_MODE: z.enum(["demo", "rtsp"]).default("demo"),
    RTSP_URL: z.string().default(""),
    MEDIAMTX_API_URL: z.string().default("http://127.0.0.1:9997"),
    MEDIAMTX_API_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(2000),
    WHEP_URL: z.string().default("http://127.0.0.1:8889/cam1/whep"),
    CORS_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  })
  .superRefine((value, context) => {
    const apiUrl = parseHttpUrl(value.MEDIAMTX_API_URL);
    if (!apiUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MEDIAMTX_API_URL"],
        message: "MEDIAMTX_API_URL must be an http or https URL",
      });
    }

    const whepUrl = parseHttpUrl(value.WHEP_URL);
    if (!whepUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WHEP_URL"],
        message: "WHEP_URL must be an http or https URL",
      });
    } else if (whepUrl.pathname !== `/${value.CAMERA_ID}/whep`) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WHEP_URL"],
        message: "WHEP_URL path must be /<CAMERA_ID>/whep",
      });
    }

    const corsOrigin = parseHttpUrl(value.CORS_ORIGIN);
    if (!corsOrigin || corsOrigin.pathname !== "/") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN must be an http or https origin without a path",
      });
    }

    if (value.STREAM_SOURCE_MODE === "rtsp" && !parseRtspUrl(value.RTSP_URL)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RTSP_URL"],
        message: "STREAM_SOURCE_MODE=rtsp requires an rtsp:// or rtsps:// URL with a host",
      });
    }
  });

export type AppConfig = z.infer<typeof environmentSchema>;

export interface RtspTarget {
  hostname: string;
  port: number;
}

const KNOWN_KEYS = [
  "NODE_ENV",
  "BACKEND_HOST",
  "BACKEND_PORT",
  "CAMERA_ID",
  "CAMERA_NAME",
  "STREAM_SOURCE_MODE",
  "RTSP_URL",
  "MEDIAMTX_API_URL",
  "MEDIAMTX_API_TIMEOUT_MS",
  "WHEP_URL",
  "CORS_ORIGIN",
] as const;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const input: Record<string, string> = {};
  for (const key of KNOWN_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      input[key] = value;
    }
  }

  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${message}`);
  }
  return parsed.data;
}

export function parseRtspUrl(value: string): RtspTarget | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "rtsp:" && url.protocol !== "rtsps:") {
    return null;
  }
  if (!url.hostname) {
    return null;
  }
  const port = url.port === "" ? (url.protocol === "rtsps:" ? 322 : 554) : Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return { hostname: url.hostname, port };
}

function parseHttpUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  if (!url.hostname) {
    return null;
  }
  return url;
}
