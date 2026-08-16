import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SotaTarget } from "../../platform/app/lib/sotaLab/types.ts";

interface CliOptions {
  fixtureId?: string;
  inputPath?: string;
  manifestPath?: string;
  outputMode?: "strict_editable" | "editable_preferred" | "visual_safe";
  targets?: SotaTarget[];
}

function parseTargets(value: string | undefined): SotaTarget[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item): item is SotaTarget =>
      item === "structural"
      || item === "mac_powerpoint"
      || item === "windows_powerpoint"
      || item === "windows_chart_editability"
    );
  return parsed.length > 0 ? parsed : undefined;
}

function parseArgs(args: string[]): CliOptions {
  const fixtureIdx = args.indexOf("--fixture");
  const inputIdx = args.indexOf("--input");
  const manifestIdx = args.indexOf("--manifest");
  const outputModeIdx = args.indexOf("--output-mode");
  const targetsIdx = args.indexOf("--targets");

  const outputMode = outputModeIdx >= 0 ? args[outputModeIdx + 1] : undefined;
  return {
    fixtureId: fixtureIdx >= 0 ? args[fixtureIdx + 1] : undefined,
    inputPath: inputIdx >= 0 ? args[inputIdx + 1] : undefined,
    manifestPath: manifestIdx >= 0 ? args[manifestIdx + 1] : undefined,
    outputMode: outputMode === "strict_editable"
      || outputMode === "editable_preferred"
      || outputMode === "visual_safe"
      ? outputMode
      : undefined,
    targets: parseTargets(targetsIdx >= 0 ? args[targetsIdx + 1] : undefined),
  };
}

function expectedSuccess(entry: { acceptance?: { expectStructuralPass: boolean; expectDesktopOpenPass?: boolean } }) {
  if (!entry.acceptance) return true;
  if (entry.acceptance.expectStructuralPass === false) return false;
  if (entry.acceptance.expectDesktopOpenPass === false) return false;
  return true;
}

async function main() {
  const corpusModule = await import("../../platform/app/lib/sotaLab/corpus.ts");
  const orchestratorModule = await import("../../platform/app/lib/sotaLab/orchestrator.ts");
  const { getDefaultSotaManifestPath, listSotaFixtures } = "default" in corpusModule
    ? corpusModule.default as typeof corpusModule
    : corpusModule;
  const { runSotaLab } = "default" in orchestratorModule
    ? orchestratorModule.default as typeof orchestratorModule
    : orchestratorModule;
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = options.manifestPath ?? getDefaultSotaManifestPath();

  if (!options.fixtureId && !options.inputPath) {
    throw new Error("Pass --fixture <id|all> or --input <path-to-document.json>");
  }

  if (options.inputPath) {
    const inputPath = resolve(options.inputPath);
    const body = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
    const result = await runSotaLab({
      documentBody: body,
      outputMode: options.outputMode,
      targets: options.targets,
    });

    console.log(JSON.stringify(result.run, null, 2));
    process.exit(result.run.aggregateVerdict === "passed" ? 0 : 1);
  }

  const fixtures = listSotaFixtures(manifestPath);
  const selected = options.fixtureId === "all"
    ? fixtures
    : fixtures.filter((fixture) => fixture.id === options.fixtureId);

  if (selected.length === 0) {
    throw new Error(`Unknown SOTA Lab fixture "${options.fixtureId}"`);
  }

  const results = [];
  let gateFailed = false;

  for (const fixture of selected) {
    const result = await runSotaLab({
      fixtureId: fixture.id,
      manifestPath,
      outputMode: options.outputMode,
      targets: options.targets,
    });
    const shouldPass = expectedSuccess(fixture);
    const didPass = result.run.aggregateVerdict === "passed";
    const matchesExpectation = shouldPass ? didPass : !didPass;
    if (!matchesExpectation) {
      gateFailed = true;
    }

    results.push({
      fixtureId: fixture.id,
      title: fixture.title,
      aggregateVerdict: result.run.aggregateVerdict,
      matchesExpectation,
      expectedSuccess: shouldPass,
      recordUrl: result.run.recordUrl,
      comparison: result.run.comparison ?? null,
    });
  }

  console.log(JSON.stringify({
    manifestPath,
    timestamp: new Date().toISOString(),
    results,
  }, null, 2));

  process.exit(gateFailed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
