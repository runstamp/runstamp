import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStructure } from "../../tests/launchMatrix/helpers/structuralValidator.js";
import {
  buildCorpusFixture,
  getCorpusArtifactsDir,
} from "../../tests/desktopValidation/helpers/corpus.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));

function parseArgs(args: string[]) {
  const fixtureIdx = args.indexOf("--fixture");
  const portIdx = args.indexOf("--port");
  return {
    fixtureId: fixtureIdx >= 0 ? args[fixtureIdx + 1] : "classic-chart",
    port: portIdx >= 0 ? Number(args[portIdx + 1]) : 3011,
    reuseServer: args.includes("--reuse-server"),
  };
}

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    const contentType = response.headers.get("content-type") ?? "unknown";
    const snippet = raw.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `${context} returned non-JSON response (${response.status}, ${contentType}): ${snippet}`,
    );
  }
}

function findPlatformDir(): string {
  const candidates = [
    resolve(scriptDir, "../../../../platform"),
    resolve(process.cwd(), "../../platform"),
    resolve(process.cwd(), "platform"),
  ];

  const platformDir = candidates.find((candidate) => existsSync(join(candidate, "app")));
  if (!platformDir) {
    throw new Error(
      `Platform workspace not found. Checked: ${candidates.join(", ")}`,
    );
  }

  return platformDir;
}

async function main() {
  const { fixtureId, port, reuseServer } = parseArgs(process.argv.slice(2));
  const built = await buildCorpusFixture(fixtureId);
  if (built.entry.source.inputType === "bufferBuilder") {
    throw new Error("Platform smoke requires a JSON-serializable paper/agent document fixture");
  }
  if (built.entry.source.inputType === "paperDocument") {
    const sourceDoc = built.sourceInput as { template?: unknown };
    if (sourceDoc && sourceDoc.template) {
      throw new Error(`Fixture "${fixtureId}" contains a template buffer and cannot be posted through Studio JSON routes`);
    }
  }

  let server: ReturnType<typeof spawn> | null = null;
  if (!reuseServer) {
    const platformDir = findPlatformDir();
    const nextBin = resolve(platformDir, "node_modules/.bin/next");
    if (!existsSync(nextBin)) {
      throw new Error(
        `Platform dependencies are not installed in ${platformDir}. Run install in /platform first.`,
      );
    }

    server = spawn(nextBin, ["dev", "-p", String(port)], {
      cwd: platformDir,
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "development" },
    });
  }

  try {
    await waitFor(`http://127.0.0.1:${port}/studio`, 120_000);

    const payload = built.entry.renderOptions
      ? {
          document: built.sourceInput,
          ...built.entry.renderOptions,
        }
      : built.sourceInput;
    const previewResponse = await fetch(`http://127.0.0.1:${port}/api/compile-pptx?withPreview=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const previewJson = await parseJsonResponse<{
      pptx: string;
      preview: string | null;
      error?: string;
    }>(previewResponse, "compile-pptx?withPreview");
    if (!previewResponse.ok) {
      throw new Error(
        `Studio preview failed with ${previewResponse.status}${previewJson.error ? `: ${previewJson.error}` : ""}`,
      );
    }

    const compileResponse = await fetch(`http://127.0.0.1:${port}/api/compile-pptx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!compileResponse.ok) {
      throw new Error(`Studio compile failed with ${compileResponse.status}`);
    }
    const pptxBuffer = Buffer.from(await compileResponse.arrayBuffer());
    const structural = await validateStructure(pptxBuffer);

    const compilePreviewResponse = await fetch(`http://127.0.0.1:${port}/api/compile-pptx?withPreview=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const compilePreviewJson = await parseJsonResponse<{
      pptx: string;
      preview: string | null;
      error?: string;
    }>(compilePreviewResponse, "compile-pptx?withPreview");
    if (!compilePreviewResponse.ok) {
      throw new Error(
        `Studio compile preview failed with ${compilePreviewResponse.status}${compilePreviewJson.error ? `: ${compilePreviewJson.error}` : ""}`,
      );
    }

    const artifactsDir = join(getCorpusArtifactsDir(), "platform-smoke", fixtureId);
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, "generated.pptx"), pptxBuffer);
    const report = {
      fixtureId,
      previewSlideCount: built.slideCount,
      expectedSlideCount: built.slideCount,
      previewCount: previewJson.preview ? 1 : 0,
      compileWithPreviewReturnedPreview: Boolean(previewJson.preview) && Boolean(compilePreviewJson.preview),
      compileWithPreviewReturnedPptx:
        typeof previewJson.pptx === "string" &&
        previewJson.pptx.length > 0 &&
        typeof compilePreviewJson.pptx === "string" &&
        compilePreviewJson.pptx.length > 0,
      structuralPassed: structural.passed,
    };
    writeFileSync(join(artifactsDir, "platform-smoke.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    if (
      report.previewSlideCount !== built.slideCount ||
      report.previewCount < 1 ||
      !report.compileWithPreviewReturnedPreview ||
      !report.compileWithPreviewReturnedPptx ||
      !report.structuralPassed
    ) {
      process.exit(1);
    }
  } finally {
    server?.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
