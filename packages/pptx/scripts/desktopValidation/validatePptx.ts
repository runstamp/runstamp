import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { TEST_LICENSE_KEY, TEST_PUBLIC_KEY_PEM } from "../../../../scripts/test-license-fixture.mjs";
import { validateCharts } from "../../tests/launchMatrix/helpers/chartValidator.js";
import { diagnose } from "../../tests/launchMatrix/helpers/diagnosisEngine.js";
import { validateStructure } from "../../tests/launchMatrix/helpers/structuralValidator.js";
import { analyzeDocumentCompatibility } from "../../src/compatibility/pptxCompatibility.js";
import {
  buildCorpusFixture,
  getCorpusArtifactsDir,
  listCorpusEntries,
} from "../../tests/desktopValidation/helpers/corpus.js";
import { validateWithOpenXmlSdk } from "../../tests/desktopValidation/helpers/openXmlSdkValidator.js";

interface CliOptions {
  fixtureId?: string;
  inputPath?: string;
  outDir?: string;
  strict: boolean;
  includeOpenXml: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const fixtureIdx = args.indexOf("--fixture");
  const inputIdx = args.indexOf("--input");
  const outIdx = args.indexOf("--out");
  return {
    fixtureId: fixtureIdx >= 0 ? args[fixtureIdx + 1] : undefined,
    inputPath: inputIdx >= 0 ? args[inputIdx + 1] : undefined,
    outDir: outIdx >= 0 ? args[outIdx + 1] : undefined,
    strict: args.includes("--strict"),
    includeOpenXml: args.includes("--openxml"),
  };
}

async function countSlides(buffer: Buffer): Promise<number> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).filter(
    (path) => !zip.files[path].dir && /^ppt\/slides\/slide\d+\.xml$/.test(path),
  ).length;
}

function toIssueCodes(
  report: Awaited<ReturnType<typeof validateStructure>>,
  chartReport: Awaited<ReturnType<typeof validateCharts>>,
  compatibility?: Awaited<ReturnType<typeof analyzeDocumentCompatibility>>,
): string[] {
  const codes = new Set<string>();
  for (const check of report.checks) {
    if (!check.passed) {
      codes.add(`structural:${check.name}`);
    }
  }
  for (const chart of chartReport.charts) {
    if (!chart.passed) {
      codes.add(`chart:${chart.name}`);
    }
  }
  if (compatibility) {
    if (compatibility.compatibilityVerdict !== "native_safe") {
      codes.add(`compatibility:${compatibility.compatibilityVerdict}`);
    }
    for (const slide of compatibility.slides) {
      if (slide.compatibilityVerdict !== "native_safe") {
        codes.add(`compatibility:slide-${slide.slideIndex + 1}:${slide.compatibilityVerdict}`);
      }
      for (const issue of slide.issues) {
        codes.add(issue.code);
      }
    }
  }
  return [...codes].sort();
}

async function validateBuffer(params: {
  name: string;
  buffer: Buffer;
  expectedSlideCount?: number;
  outDir: string;
  includeOpenXml: boolean;
  normalizedDoc?: any;
}) {
  mkdirSync(params.outDir, { recursive: true });
  const pptxPath = join(params.outDir, `${params.name}.pptx`);
  writeFileSync(pptxPath, params.buffer);

  const slideCount = await countSlides(params.buffer);
  const structural = await validateStructure(params.buffer);
  const charts = await validateCharts(params.buffer);
  const diagnosis = diagnose(structural, charts);
  const openXml = params.includeOpenXml
    ? await validateWithOpenXmlSdk(pptxPath)
    : undefined;
  const compatibility = params.normalizedDoc
    ? await analyzeDocumentCompatibility(params.normalizedDoc)
    : undefined;

  const result = {
    name: params.name,
    passed: structural.passed && charts.passed && (openXml ? (!openXml.available || openXml.passed) : true),
    slideCount,
    expectedSlideCount: params.expectedSlideCount,
    structural,
    charts,
    diagnosis,
    issueCodes: toIssueCodes(structural, charts, compatibility),
    compatibility,
    openXml,
    artifacts: {
      pptxPath,
      jsonPath: join(params.outDir, "validation.json"),
    },
  };

  writeFileSync(result.artifacts.jsonPath, JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  process.env.NODE_ENV ??= "test";
  process.env.RUNSTAMP_LICENSE_KEY ??= TEST_LICENSE_KEY;
  process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 ??= TEST_PUBLIC_KEY_PEM;
  const options = parseArgs(process.argv.slice(2));
  if (!options.fixtureId && !options.inputPath) {
    throw new Error("Pass --fixture <id|all> or --input <pptxPath>");
  }

  const artifactRoot = getCorpusArtifactsDir(options.outDir);
  mkdirSync(artifactRoot, { recursive: true });

  let results: unknown[] = [];
  let failed = false;

  if (options.inputPath) {
    const inputPath = resolve(options.inputPath);
    const buffer = await readFile(inputPath);
    const result = await validateBuffer({
      name: basename(inputPath, ".pptx"),
      buffer,
      outDir: join(artifactRoot, basename(inputPath, ".pptx")),
      includeOpenXml: options.includeOpenXml,
    });
    results = [result];
    failed = !result.passed;
  } else if (options.fixtureId === "all") {
    const entries = await listCorpusEntries();
    const builtResults = [];
    for (const entry of entries) {
      const built = await buildCorpusFixture(entry);
      const result = await validateBuffer({
        name: entry.id,
        buffer: built.buffer,
        expectedSlideCount: entry.expectedSlideCount,
        outDir: join(artifactRoot, entry.id),
        includeOpenXml: options.includeOpenXml,
        normalizedDoc: built.normalizedDoc,
      });
      builtResults.push({
        ...result,
        matchesSlideCount: result.slideCount === entry.expectedSlideCount,
        acceptance: entry.acceptance,
      });
      if (entry.acceptance.expectStructuralPass && !result.structural.passed) {
        failed = true;
      }
      if (result.slideCount !== entry.expectedSlideCount) {
        failed = true;
      }
    }
    results = builtResults;
  } else {
    const built = await buildCorpusFixture(options.fixtureId);
    const result = await validateBuffer({
      name: built.entry.id,
      buffer: built.buffer,
      expectedSlideCount: built.entry.expectedSlideCount,
      outDir: join(artifactRoot, built.entry.id),
      includeOpenXml: options.includeOpenXml,
      normalizedDoc: built.normalizedDoc,
    });
    results = [{
      ...result,
      matchesSlideCount: result.slideCount === built.entry.expectedSlideCount,
      acceptance: built.entry.acceptance,
    }];
    failed =
      (built.entry.acceptance.expectStructuralPass && !result.structural.passed) ||
      result.slideCount !== built.entry.expectedSlideCount;
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    artifactRoot,
    results,
  }, null, 2));

  if (options.strict && failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
