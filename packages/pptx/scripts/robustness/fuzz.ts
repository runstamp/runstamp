import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { TEST_LICENSE_KEY, TEST_PUBLIC_KEY_PEM } from "../../../../scripts/test-license-fixture.mjs";
import { PaperEngine } from "../../src/engine.js";
import { PaperError } from "../../src/errors.js";
import { setDeterministicMode } from "../../src/deterministicMode.js";
import { validatePptxStructure } from "../../src/quality/structuralValidation.js";
import type { PaperDocument, PaperNode } from "../../src/types/ast.js";

interface FuzzCase {
  seed: number;
  family: "paper" | "agent" | "invalid";
  description: string;
  document: unknown;
  expectPaperError?: boolean;
}

interface FuzzResult {
  seed: number;
  family: FuzzCase["family"] | "mutation";
  id: string;
  status: "pass" | "fail";
  error?: string;
  artifactPath?: string;
}

interface MutationCase {
  id: string;
  mutate(zip: JSZip): Promise<void>;
  expectedFinding: string;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)];
}

function dataUriPng(): string {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
}

function buildPaperDocument(seed: number): PaperDocument {
  const rng = mulberry32(seed);
  const children: PaperNode[] = [
    {
      type: "Text",
      content: `Fuzz seed ${seed}`,
      style: {
        position: "absolute",
        left: 48,
        top: 36,
        width: 520,
        height: 72,
        fontSize: 24 + Math.floor(rng() * 12),
      },
    },
  ];

  const families = ["table", "chart", "image", "connector", "cjk"] as const;
  for (const family of families) {
    if (rng() < 0.45) continue;
    if (family === "table") {
      children.push({
        type: "Table",
        tableData: {
          columns: [120, 120],
          rows: [
            { cells: [{ text: "Metric" }, { text: "Value" }] },
            { cells: [{ text: "Seed" }, { text: String(seed) }] },
          ],
        },
        style: { position: "absolute", left: 64, top: 130, width: 260, height: 110 },
      });
    } else if (family === "chart") {
      children.push({
        type: "Chart",
        chartData: {
          chartType: pick(rng, ["bar", "line", "pie"] as const),
          categories: ["A", "B", "C"],
          series: [{ name: "Series", values: [rng() * 10, rng() * 10, rng() * 10] }],
        },
        style: { position: "absolute", left: 360, top: 124, width: 360, height: 250 },
      });
    } else if (family === "image") {
      children.push({
        type: "Image",
        src: dataUriPng(),
        style: { position: "absolute", left: 720, top: 42, width: 80, height: 80 },
      });
    } else if (family === "connector") {
      children.push({
        type: "Connector",
        connectorType: pick(rng, ["straight", "elbow", "curved"] as const),
        start: { x: 90, y: 420 },
        end: { x: 360 + Math.floor(rng() * 120), y: 420 + Math.floor(rng() * 40) },
        lineWidth: 2,
        lineColor: "#0F172A",
      });
    } else {
      children.push({
        type: "Text",
        content: "RTL אבג CJK 日本語 emoji text",
        style: { position: "absolute", left: 64, top: 470, width: 620, height: 44, fontSize: 18 },
      });
    }
  }

  return {
    type: "Document",
    meta: { title: `Fuzz ${seed}` },
    slides: [{ type: "Slide", children }],
  };
}

function buildAgentDocument(seed: number): unknown {
  const rng = mulberry32(seed);
  return {
    type: "presentation",
    version: "1.0",
    presentationTitle: `Agent fuzz ${seed}`,
    companyName: "Runstamp",
    theme: pick(rng, ["default-navy", "editorial-serif", "monochrome", "terminal"] as const),
    slides: [
      {
        pattern: pick(rng, ["title", "statement", "dashboard", "comparison", "bullets"] as const),
        content: {
          title: `Agent fuzz ${seed}`,
          subtitle: "seed stable fuzz replay",
          bulletPoints: ["one", "two", "three"],
        },
      },
    ],
  };
}

function buildInvalidDocument(seed: number): unknown {
  const rng = mulberry32(seed);
  return {
    type: "Document",
    meta: { title: `Invalid fuzz ${seed}` },
    slideSize: {
      width: rng() < 0.5 ? 0 : 50000,
      height: 540,
    },
    slides: [{ type: "Slide", children: [{ type: "Text", content: "invalid" }] }],
  };
}

function buildCases(): FuzzCase[] {
  const cases: FuzzCase[] = [];
  const basePaper = 0x71a2f00d;
  const baseAgent = 0x4a9e1701;
  const baseInvalid = 0x1badf00d;

  for (let i = 0; i < 16; i += 1) {
    const seed = basePaper + i;
    cases.push({
      seed,
      family: "paper",
      description: "PaperDocument mixed native component render",
      document: buildPaperDocument(seed),
    });
  }
  for (let i = 0; i < 12; i += 1) {
    const seed = baseAgent + i;
    cases.push({
      seed,
      family: "agent",
      description: "AgentDocument compile and render",
      document: buildAgentDocument(seed),
    });
  }
  for (let i = 0; i < 8; i += 1) {
    const seed = baseInvalid + i;
    cases.push({
      seed,
      family: "invalid",
      description: "Invalid resource limits reject before archive generation",
      document: buildInvalidDocument(seed),
      expectPaperError: true,
    });
  }

  return cases;
}

async function runValidCase(testCase: FuzzCase, outputDir: string): Promise<FuzzResult> {
  const artifactPath = resolve(outputDir, `${testCase.family}-${testCase.seed}.pptx`);
  const buffer = await PaperEngine.render(testCase.document, {
    validationMode: "structural",
    layoutValidation: "off",
  });
  await writeFile(artifactPath, buffer);
  const validation = await validatePptxStructure(buffer);
  if (validation.status !== "passed") {
    return {
      seed: testCase.seed,
      family: testCase.family,
      id: `${testCase.family}-${testCase.seed}`,
      status: "fail",
      error: `Structural validation failed with ${validation.failureCount} issue(s).`,
      artifactPath,
    };
  }
  return {
    seed: testCase.seed,
    family: testCase.family,
    id: `${testCase.family}-${testCase.seed}`,
    status: "pass",
    artifactPath,
  };
}

async function runInvalidCase(testCase: FuzzCase): Promise<FuzzResult> {
  try {
    await PaperEngine.render(testCase.document, { layoutValidation: "off" });
    return {
      seed: testCase.seed,
      family: testCase.family,
      id: `${testCase.family}-${testCase.seed}`,
      status: "fail",
      error: "Expected PaperError, but render completed.",
    };
  } catch (error) {
    if (error instanceof PaperError) {
      return {
        seed: testCase.seed,
        family: testCase.family,
        id: `${testCase.family}-${testCase.seed}`,
        status: "pass",
      };
    }
    return {
      seed: testCase.seed,
      family: testCase.family,
      id: `${testCase.family}-${testCase.seed}`,
      status: "fail",
      error: `Expected PaperError, got ${error instanceof Error ? error.name : typeof error}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const mutationCases: MutationCase[] = [
  {
    id: "add-untyped-package-part",
    expectedFinding: "missing a matching",
    async mutate(zip) {
      zip.file("ppt/unknown/data.bin", Buffer.from("untyped"));
    },
  },
  {
    id: "duplicate-slide-relationship-id",
    expectedFinding: "Duplicate relationship Id",
    async mutate(zip) {
      const relsPath = "ppt/slides/_rels/slide1.xml.rels";
      const xml = await zip.file(relsPath)!.async("string");
      zip.file(relsPath, xml.replace("</Relationships>", `  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/missing.png"/>\n</Relationships>`));
    },
  },
  {
    id: "broken-slide-relationship-target",
    expectedFinding: "missing target",
    async mutate(zip) {
      const relsPath = "ppt/slides/_rels/slide1.xml.rels";
      const xml = await zip.file(relsPath)!.async("string");
      zip.file(relsPath, xml.replace("../slideLayouts/slideLayout1.xml", "../slideLayouts/missing.xml"));
    },
  },
];

async function runMutationCases(outputDir: string): Promise<FuzzResult[]> {
  const baseBuffer = await PaperEngine.render(buildPaperDocument(0x9e3779b9), {
    validationMode: "structural",
    layoutValidation: "off",
  });
  const results: FuzzResult[] = [];

  for (const mutation of mutationCases) {
    const zip = await JSZip.loadAsync(baseBuffer);
    await mutation.mutate(zip);
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const artifactPath = resolve(outputDir, `mutation-${mutation.id}.pptx`);
    await writeFile(artifactPath, buffer);
    const validation = await validatePptxStructure(buffer);
    const text = JSON.stringify(validation);
    const passed = validation.status === "failed" && text.includes(mutation.expectedFinding);
    results.push({
      seed: 0,
      family: "mutation",
      id: mutation.id,
      status: passed ? "pass" : "fail",
      error: passed ? undefined : `Mutation was not caught with expected finding "${mutation.expectedFinding}".`,
      artifactPath,
    });
  }

  return results;
}

async function main(): Promise<void> {
  process.env.NODE_ENV ??= "test";
  process.env.RUNSTAMP_LICENSE_KEY ??= TEST_LICENSE_KEY;
  process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 ??= TEST_PUBLIC_KEY_PEM;
  const seedArgIndex = process.argv.indexOf("--seed");
  const seedFilter = seedArgIndex >= 0 ? Number(process.argv[seedArgIndex + 1]) : undefined;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = resolve(process.cwd(), "outputs", "pptx-robustness", `fuzz-${timestamp}`);
  await mkdir(outputDir, { recursive: true });

  const results: FuzzResult[] = [];
  setDeterministicMode(true);
  try {
    const cases = Number.isFinite(seedFilter)
      ? buildCases().filter((testCase) => testCase.seed === seedFilter)
      : buildCases();
    for (const testCase of cases) {
      try {
        results.push(testCase.expectPaperError
          ? await runInvalidCase(testCase)
          : await runValidCase(testCase, outputDir));
      } catch (error) {
        results.push({
          seed: testCase.seed,
          family: testCase.family,
          id: `${testCase.family}-${testCase.seed}`,
          status: "fail",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (!Number.isFinite(seedFilter)) {
      results.push(...await runMutationCases(outputDir));
    }
  } finally {
    setDeterministicMode(false);
  }

  const failures = results.filter((result) => result.status === "fail");
  const report = {
    status: failures.length === 0 ? "pass" : "fail",
    generatedAt: new Date().toISOString(),
    outputDir,
    caseCount: results.length,
    failureCount: failures.length,
    results,
    crashingSeeds: failures.map((failure) => ({
      id: failure.id,
      seed: failure.seed,
      family: failure.family,
      error: failure.error,
      artifactPath: failure.artifactPath,
      replay: `pnpm --filter @runstamp/pptx pptx:robustness:fuzz -- --seed ${failure.seed}`,
    })),
  };

  await writeFile(resolve(outputDir, "fuzz-report.json"), JSON.stringify(report, null, 2));
  await writeFile(resolve(outputDir, "crashing-seeds.json"), JSON.stringify(report.crashingSeeds, null, 2));
  await writeFile(resolve(outputDir, "fuzz-report.md"), [
    "# PPTX Robustness Fuzz Report",
    "",
    `Status: ${report.status}`,
    `Cases: ${report.caseCount}`,
    `Failures: ${report.failureCount}`,
    "",
    "## Failures",
    failures.length === 0
      ? "- none"
      : failures.map((failure) => `- ${failure.id}: ${failure.error ?? "failed"}`).join("\n"),
    "",
  ].join("\n"));

  if (failures.length > 0) {
    throw new Error(`PPTX robustness fuzz failed with ${failures.length} failure(s). See ${outputDir}`);
  }

  console.log(`PPTX robustness fuzz proof pack: ${outputDir} (pass)`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
