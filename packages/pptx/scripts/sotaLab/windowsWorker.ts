import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diffNormalizedPackages,
  inspectChartInventory,
  type ChartInventory,
} from "../../src/index.ts";
import type {
  SotaTargetCheck,
  WindowsWorkerArtifactPayload,
  WindowsWorkerChartProbeRequest,
  WindowsWorkerChartProbeResponse,
  WindowsWorkerHealth,
  WindowsWorkerTargetResponse,
  WindowsWorkerValidateRequest,
  WindowsWorkerValidateResponse,
} from "../../platform/app/lib/sotaLab/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WINDOWS_ORACLE_SCRIPT = resolve(
  __dirname,
  "../../tools/powerpoint-oracle/Invoke-PowerPointOracle.ps1",
);
const CHART_PROBE_SCRIPT = resolve(
  __dirname,
  "../../tools/powerpoint-oracle/Invoke-ChartEditabilityProbe.ps1",
);
const WORKER_VERSION = "local-sota-v1";

interface DesktopOracleResult {
  available: boolean;
  fixtureId: string;
  passed: boolean;
  failures: string[];
  pdfPath?: string;
  savedCopyPath?: string;
  screenshotPath?: string;
  details?: string[];
}

interface ChartProbeResult {
  available: boolean;
  passed: boolean;
  probedCount: number;
  failures: string[];
  details?: string[];
}

function execFileAsync(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolvePromise, reject) => {
    execFile(command, args, { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const secret = process.env.RUNSTAMP_WINDOWS_WORKER_SECRET?.trim();
  if (!secret) {
    sendJson(res, 500, { error: "RUNSTAMP_WINDOWS_WORKER_SECRET is not configured." });
    return false;
  }
  if (req.headers["x-runstamp-worker-secret"] !== secret) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

async function isPowerPointAvailable(): Promise<boolean> {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "(Get-Command powerpnt.exe -ErrorAction SilentlyContinue) -ne $null",
    ]);
    return /true/i.test(stdout);
  } catch {
    return false;
  }
}

async function buildHealth(): Promise<WindowsWorkerHealth> {
  const powerpointAvailable = await isPowerPointAvailable();
  return {
    status: process.platform === "win32" && powerpointAvailable ? "ok" : "error",
    workerVersion: WORKER_VERSION,
    platform: process.platform,
    powerpointAvailable,
    details: process.platform === "win32"
      ? powerpointAvailable
        ? ["Windows worker is ready to automate Microsoft PowerPoint."]
        : ["Microsoft PowerPoint was not found on this Windows worker."]
      : ["Windows worker must run on a win32 host."],
  };
}

async function runDesktopOracle(inputPptx: string, artifactDir: string, fixtureId: string) {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    WINDOWS_ORACLE_SCRIPT,
    "-FixtureId",
    fixtureId,
    "-InputPptx",
    inputPptx,
    "-ArtifactDir",
    artifactDir,
  ]);
  return JSON.parse(stdout) as DesktopOracleResult;
}

async function runChartProbe(inputPptx: string) {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    CHART_PROBE_SCRIPT,
    "-InputPptx",
    inputPptx,
  ]);
  return JSON.parse(stdout) as ChartProbeResult;
}

function buildDesktopChecks(result: {
  openPassed: boolean;
  repairDialogDetected: boolean;
  pdfExportPassed: boolean;
  saveCopyRoundTripPassed: boolean;
}): SotaTargetCheck[] {
  return [
    {
      id: "desktop.open",
      passed: result.openPassed,
      severity: result.openPassed ? "info" : "error",
      message: result.openPassed
        ? "Windows PowerPoint opened the generated deck."
        : "Windows PowerPoint could not open the generated deck.",
    },
    {
      id: "desktop.repair_dialog",
      passed: !result.repairDialogDetected,
      severity: result.repairDialogDetected ? "error" : "info",
      message: result.repairDialogDetected
        ? "Windows PowerPoint displayed a repair dialog."
        : "No repair dialog was detected on Windows PowerPoint open.",
    },
    {
      id: "desktop.pdf_export",
      passed: result.pdfExportPassed,
      severity: result.pdfExportPassed ? "info" : "error",
      message: result.pdfExportPassed
        ? "Windows PowerPoint exported the deck to PDF."
        : "Windows PowerPoint failed to export the deck to PDF.",
    },
    {
      id: "desktop.save_copy_roundtrip",
      passed: result.saveCopyRoundTripPassed,
      severity: result.saveCopyRoundTripPassed ? "info" : "error",
      message: result.saveCopyRoundTripPassed
        ? "Windows PowerPoint SaveCopyAs completed without normalized package rewrites."
        : "Windows PowerPoint SaveCopyAs failed or rewrote the package unexpectedly.",
    },
  ];
}

async function toArtifactPayload(
  id: string,
  label: string,
  fileName: string,
  contentType: string,
  filePath: string,
): Promise<WindowsWorkerArtifactPayload> {
  const buffer = await readFile(filePath);
  return {
    id,
    label,
    fileName,
    contentType,
    base64: buffer.toString("base64"),
  };
}

function createInlineArtifact(
  id: string,
  label: string,
  fileName: string,
  contentType: string,
  content: string,
): WindowsWorkerArtifactPayload {
  return {
    id,
    label,
    fileName,
    contentType,
    base64: Buffer.from(content, "utf8").toString("base64"),
  };
}

function createBufferArtifact(
  id: string,
  label: string,
  fileName: string,
  contentType: string,
  buffer: Buffer,
): WindowsWorkerArtifactPayload {
  return {
    id,
    label,
    fileName,
    contentType,
    base64: buffer.toString("base64"),
  };
}

async function handleValidate(body: WindowsWorkerValidateRequest): Promise<WindowsWorkerValidateResponse> {
  const worker = await buildHealth();
  if (worker.status !== "ok") {
    return {
      worker,
      targetResult: {
        target: "windows_powerpoint",
        status: "error",
        failureCount: 1,
        checks: [
          {
            id: "windows_powerpoint.worker_unavailable",
            passed: false,
            severity: "error",
            message: worker.details[0] || "Windows worker is unavailable.",
          },
        ],
        details: worker.details,
        artifacts: [],
      },
    };
  }

  const artifactDir = await mkdtemp(join(tmpdir(), "runstamp-sota-windows-"));
  const inputPptx = join(artifactDir, "generated.pptx");
  const originalBuffer = Buffer.from(body.pptxBase64, "base64");
  await writeFile(inputPptx, originalBuffer);

  const oracle = await runDesktopOracle(inputPptx, artifactDir, body.runId);
  const details = [...(oracle.details ?? [])];
  let saveCopyRoundTripPassed = false;

  if (oracle.savedCopyPath) {
    try {
      const savedCopy = await readFile(oracle.savedCopyPath);
      const diff = await diffNormalizedPackages(originalBuffer, savedCopy);
      if (diff.passed) {
        saveCopyRoundTripPassed = true;
      } else {
        details.push(`Normalized SaveCopyAs diff detected ${diff.issues.length} issue(s).`);
      }
    } catch (error) {
      details.push(
        `Failed to read or diff the Windows PowerPoint SaveCopyAs output: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    details.push("Windows PowerPoint did not produce a SaveCopyAs output for round-trip comparison.");
  }

  const openPassed = !oracle.failures.includes("open_failed");
  const repairDialogDetected = oracle.failures.includes("repair_dialog_detected");
  const pdfExportPassed = !oracle.failures.includes("pdf_export_failed");
  const checks = buildDesktopChecks({
    openPassed,
    repairDialogDetected,
    pdfExportPassed,
    saveCopyRoundTripPassed,
  });

  const artifacts: WindowsWorkerArtifactPayload[] = [
    createBufferArtifact(
      "windows_generated_pptx",
      "Windows worker generated PPTX",
      "windows-generated.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      originalBuffer,
    ),
  ];

  if (oracle.pdfPath) {
    artifacts.push(await toArtifactPayload(
      "windows_pdf_export",
      "Windows PowerPoint PDF export",
      "windows-powerpoint-export.pdf",
      "application/pdf",
      oracle.pdfPath,
    ));
  }
  if (oracle.savedCopyPath) {
    artifacts.push(await toArtifactPayload(
      "windows_saved_copy",
      "Windows PowerPoint SaveCopyAs",
      "windows-powerpoint-saved-copy.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      oracle.savedCopyPath,
    ));
  }
  if (oracle.screenshotPath) {
    artifacts.push(await toArtifactPayload(
      "windows_repair_dialog",
      "Windows repair dialog capture",
      "windows-repair-dialog.txt",
      "text/plain; charset=utf-8",
      oracle.screenshotPath,
    ));
  }

  return {
    worker,
    targetResult: {
      target: "windows_powerpoint",
      status: checks.every((check) => check.passed) ? "passed" : "failed",
      failureCount: checks.filter((check) => !check.passed).length,
      checks,
      details,
      backend: "powerpoint_windows",
      platform: "windows",
      artifacts,
    },
  };
}

function buildChartProbeArtifact(chartInventory: ChartInventory, probeDetails: unknown) {
  return createInlineArtifact(
    "windows_chart_probe_report",
    "Windows chart editability probe report",
    "windows-chart-probe-report.json",
    "application/json; charset=utf-8",
    JSON.stringify({ chartInventory, probeDetails }, null, 2),
  );
}

async function handleChartEditability(
  body: WindowsWorkerChartProbeRequest,
): Promise<WindowsWorkerChartProbeResponse> {
  const worker = await buildHealth();
  const buffer = Buffer.from(body.pptxBase64, "base64");
  const chartInventory = await inspectChartInventory(buffer);

  if (worker.status !== "ok") {
    return {
      worker,
      chartInventory,
      targetResult: {
        target: "windows_chart_editability",
        status: "error",
        failureCount: 1,
        checks: [
          {
            id: "windows_chart_editability.worker_unavailable",
            passed: false,
            severity: "error",
            message: worker.details[0] || "Windows worker is unavailable.",
          },
        ],
        details: worker.details,
        artifacts: [buildChartProbeArtifact(chartInventory, { error: worker.details })],
      },
    };
  }

  if (!chartInventory.hasCharts) {
    return {
      worker,
      chartInventory,
      targetResult: {
        target: "windows_chart_editability",
        status: "skipped",
        failureCount: 0,
        checks: [
          {
            id: "windows_chart_editability.not_applicable",
            passed: true,
            severity: "info",
            message: "No chart parts were found in the PPTX package.",
          },
        ],
        details: ["Deck contains no charts, so Windows chart editability is not applicable."],
        artifacts: [buildChartProbeArtifact(chartInventory, { skipped: true })],
      },
    };
  }

  if (chartInventory.unsupportedCount > 0) {
    const unsupportedKinds = chartInventory.items
      .filter((item) => item.editabilitySupport === "unsupported")
      .map((item) => `${item.kind} (slide ${item.slideIndex + 1})`);

    return {
      worker,
      chartInventory,
      targetResult: {
        target: "windows_chart_editability",
        status: "unsupported",
        failureCount: 1,
        checks: [
          {
            id: "windows_chart_editability.unsupported_chart_family",
            passed: false,
            severity: "error",
            message: "This deck contains chart families the local Windows editability probe does not certify yet.",
          },
        ],
        details: [`Unsupported chart families: ${unsupportedKinds.join(", ")}`],
        artifacts: [buildChartProbeArtifact(chartInventory, { unsupportedKinds })],
        metadata: {
          unsupportedChartKinds: unsupportedKinds,
        },
      },
    };
  }

  const artifactDir = await mkdtemp(join(tmpdir(), "runstamp-sota-chart-probe-"));
  const inputPptx = join(artifactDir, "chart-probe.pptx");
  await writeFile(inputPptx, buffer);
  const probe = await runChartProbe(inputPptx);

  const workbookCheck: SotaTargetCheck = {
    id: "windows_chart_editability.embedded_workbook",
    passed: chartInventory.items.every((item) => item.embeddedWorkbook),
    severity: chartInventory.items.every((item) => item.embeddedWorkbook) ? "info" : "error",
    message: chartInventory.items.every((item) => item.embeddedWorkbook)
      ? "All classic chart parts include embedded workbook relationships."
      : "One or more classic chart parts are missing an embedded workbook relationship.",
  };
  const activateCheck: SotaTargetCheck = {
    id: "windows_chart_editability.chart_data_activate",
    passed: probe.passed,
    severity: probe.passed ? "info" : "error",
    message: probe.passed
      ? "Windows PowerPoint opened ChartData successfully for each probed chart."
      : "Windows PowerPoint could not open ChartData for one or more charts.",
  };
  const checks = [workbookCheck, activateCheck];

  return {
    worker,
    chartInventory,
    targetResult: {
      target: "windows_chart_editability",
      status: checks.every((check) => check.passed) ? "passed" : "failed",
      failureCount: checks.filter((check) => !check.passed).length,
      checks,
      details: [...(probe.details ?? []), ...probe.failures],
      backend: "powerpoint_windows",
      platform: "windows",
      artifacts: [buildChartProbeArtifact(chartInventory, probe)],
      metadata: {
        probedCount: probe.probedCount,
        supportedChartCount: chartInventory.supportedCount,
      },
    },
  };
}

async function main() {
  const port = Number(process.env.RUNSTAMP_WINDOWS_WORKER_PORT ?? "3210");
  const server = createServer(async (req, res) => {
    if (!req.url) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    if (!requireAuth(req, res)) {
      return;
    }

    try {
      if (req.method === "GET" && req.url === "/health") {
        sendJson(res, 200, await buildHealth());
        return;
      }

      if (req.method === "POST" && req.url === "/validate") {
        const body = await readJsonBody<WindowsWorkerValidateRequest>(req);
        sendJson(res, 200, await handleValidate(body));
        return;
      }

      if (req.method === "POST" && req.url === "/chart-editability") {
        const body = await readJsonBody<WindowsWorkerChartProbeRequest>(req);
        sendJson(res, 200, await handleChartEditability(body));
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  server.listen(port, () => {
    console.log(`Runstamp Windows worker listening on http://127.0.0.1:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
