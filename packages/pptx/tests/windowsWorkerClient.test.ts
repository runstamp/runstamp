import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MODULE_PATH = resolve(
  process.cwd(),
  "platform/app/lib/sotaLab/windowsWorkerClient.ts",
);

async function importClientModule() {
  return import(pathToFileURL(MODULE_PATH).href);
}

let server: ReturnType<typeof createServer> | null = null;
let baseUrl = "";

beforeEach(async () => {
  server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.headers["x-runstamp-worker-secret"] !== "test-secret") {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (req.url === "/health") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        status: "ok",
        workerVersion: "test-worker",
        platform: "win32",
        powerpointAvailable: true,
        details: ["healthy"],
      }));
      return;
    }

    if (req.url === "/validate" && req.method === "POST") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        worker: {
          status: "ok",
          workerVersion: "test-worker",
          platform: "win32",
          powerpointAvailable: true,
          details: [],
        },
        targetResult: {
          target: "windows_powerpoint",
          status: "passed",
          failureCount: 0,
          checks: [],
          artifacts: [],
        },
      }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise<void>((resolvePromise) => {
    server?.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind mock server.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
  process.env.RUNSTAMP_WINDOWS_WORKER_URL = baseUrl;
  process.env.RUNSTAMP_WINDOWS_WORKER_SECRET = "test-secret";
});

afterEach(async () => {
  delete process.env.RUNSTAMP_WINDOWS_WORKER_URL;
  delete process.env.RUNSTAMP_WINDOWS_WORKER_SECRET;
  await new Promise<void>((resolvePromise, reject) => {
    if (!server) {
      resolvePromise();
      return;
    }
    server.close((error) => error ? reject(error) : resolvePromise());
  });
  server = null;
});

describe("Windows worker client", () => {
  it("reports health when the worker is configured and reachable", async () => {
    const { probeWindowsWorkerHealth } = await importClientModule();

    const health = await probeWindowsWorkerHealth();
    expect(health.configured).toBe(true);
    expect(health.reachable).toBe(true);
    expect(health.health?.workerVersion).toBe("test-worker");
  });

  it("surfaces auth failures from validate requests", async () => {
    const { runWindowsDesktopValidation } = await importClientModule();
    process.env.RUNSTAMP_WINDOWS_WORKER_SECRET = "wrong-secret";

    await expect(runWindowsDesktopValidation({
      runId: "run-1",
      deckName: "Fixture",
      pptxBase64: Buffer.from("pptx").toString("base64"),
      requestedChecks: ["open", "repair_dialog", "pdf_export", "save_copy_roundtrip"],
    })).rejects.toThrow(/Unauthorized/);
  });
});
