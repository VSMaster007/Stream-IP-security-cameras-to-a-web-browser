import net from "node:net";
import { describe, expect, it } from "vitest";
import { checkTcpReachable } from "./reachability.js";

describe("checkTcpReachable", () => {
  it("reports an open local port and a closed local port", async () => {
    const server = net.createServer((socket) => {
      socket.end();
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("test server did not bind a TCP port");
    }

    await expect(checkTcpReachable("127.0.0.1", address.port, 500)).resolves.toBe(true);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await expect(checkTcpReachable("127.0.0.1", address.port, 500)).resolves.toBe(false);
  });
});
