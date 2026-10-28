import { spawn } from "node:child_process";
import { createSocket } from "node:dgram";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = path.resolve(import.meta.dirname, "../..");
const apiBase = "http://127.0.0.1:3001";
const dashboardUrl = "http://127.0.0.1:5173";

function portBusy(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(true));
    server.listen({ port, host: "0.0.0.0", exclusive: true }, () => {
      server.close(() => resolve(false));
    });
  });
}

function udpBusy(port) {
  return new Promise((resolve) => {
    const socket = createSocket("udp4");
    socket.once("error", () => resolve(true));
    socket.bind({ port, address: "0.0.0.0", exclusive: true }, () => {
      socket.close(() => resolve(false));
    });
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: { ...process.env, ...options.env },
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function composeArgs(overrideFile) {
  const args = ["compose", "--env-file", ".env.example", "-f", "docker-compose.yml"];
  if (overrideFile) {
    args.push("-f", overrideFile);
  }
  args.push("--profile", "demo");
  return args;
}

async function compose(overrideFile, commandArgs) {
  const result = await run("docker", [...composeArgs(overrideFile), ...commandArgs]);
  if (result.code !== 0) {
    throw new Error(`docker compose ${commandArgs.join(" ")} exited ${result.code}`);
  }
}

async function waitForSourceState(expected, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBase}/api/cameras/cam1/status`);
      const body = await response.text();
      if (body.includes("rtsp://") || /password|secret|token/i.test(body)) {
        throw new Error("status response contained a credential marker");
      }
      const parsed = JSON.parse(body);
      last = `${response.status} ${parsed.sourceState ?? "missing"}`;
      if (response.ok && parsed.sourceState === expected) {
        return parsed;
      }
    } catch (error) {
      last = error instanceof Error ? error.message : "request failed";
    }
    await delay(1000);
  }
  throw new Error(`timed out waiting for sourceState ${expected}; last result: ${last}`);
}

async function choosePorts() {
  const defaultsBusy = (await portBusy(8889)) || (await udpBusy(8189));
  if (!defaultsBusy) {
    return { httpPort: 8889, udpPort: 8189, overrideFile: null };
  }
  if ((await portBusy(18889)) || (await udpBusy(18189))) {
    throw new Error("WebRTC ports 8889/8189 and fallback ports 18889/18189 are both busy");
  }
  const directory = mkdtempSync(path.join(tmpdir(), "ip-camera-integration-"));
  const overrideFile = path.join(directory, "override.yml");
  writeFileSync(
    overrideFile,
    [
      "services:",
      "  mediamtx:",
      "    environment:",
      '      MTX_WEBRTCLOCALUDPADDRESS: ":18189"',
      "    ports: !override",
      '      - "127.0.0.1:18889:8889"',
      '      - "127.0.0.1:18189:18189/udp"',
      "  backend:",
      "    environment:",
      "      WHEP_URL: http://127.0.0.1:18889/cam1/whep",
      "",
    ].join("\n"),
  );
  console.log("Default WebRTC ports are busy. Using host ports 18889 and 18189.");
  return { httpPort: 18889, udpPort: 18189, overrideFile };
}

async function main() {
  if ((await portBusy(3001)) || (await portBusy(5173))) {
    throw new Error("127.0.0.1:3001 or 127.0.0.1:5173 is already in use");
  }

  const ports = await choosePorts();
  let started = false;
  try {
    started = true;
    await compose(ports.overrideFile, ["up", "--build", "-d"]);
    const ready = await waitForSourceState("ready", 60000);
    if (!Array.isArray(ready.tracks) || !ready.tracks.includes("H264") || !ready.tracks.includes("Opus")) {
      throw new Error(`ready source did not report H264 and Opus tracks: ${JSON.stringify(ready.tracks)}`);
    }
    console.log(`source ready on WebRTC host port ${ports.httpPort}, ICE UDP ${ports.udpPort}`);

    const playback = await run(
      "npx",
      ["playwright", "test", "--config", "tests/integration/playwright.config.mjs"],
      { env: { DASHBOARD_URL: dashboardUrl } },
    );
    if (playback.code !== 0) {
      throw new Error("browser playback test failed");
    }

    await compose(ports.overrideFile, ["stop", "demo"]);
    await waitForSourceState("offline", 30000);
    console.log("source reported offline after the publisher stopped");

    await compose(ports.overrideFile, ["start", "demo"]);
    await waitForSourceState("ready", 30000);
    console.log("source recovered after the publisher restarted");
  } finally {
    if (started) {
      await run("docker", [...composeArgs(ports.overrideFile), "down"]);
    }
    if (ports.overrideFile) {
      rmSync(path.dirname(ports.overrideFile), { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "integration failed";
  console.error(message);
  process.exitCode = 1;
});
