import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  AgentDocumentSchema,
  PaperDocumentSchema,
  PaperEngine,
  anonymizeCorpusValue,
  applyElasticPagination,
  classifyFailureFamilies,
  compileAgentDocument,
} from "../../src/index.js";
import type { PaperDocument } from "../../src/index.js";

interface CliOptions {
  inputPath?: string;
  modulePath?: string;
  exportName?: string;
  outDir?: string;
  caseId?: string;
  title?: string;
  render: boolean;
  repair: boolean;
  errorMessage?: string;
}

interface NormalizedInput {
  rawInput: unknown;
  normalizedDoc?: PaperDocument;
  inputType: "paperDocument" | "agentDocument" | "invalid";
  validationIssues?: Array<{ path: string; message: string }>;
}

function parseArgs(args: string[]): CliOptions {
  const getValue = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    inputPath: getValue("--input"),
    modulePath: getValue("--module"),
    exportName: getValue("--export") ?? "default",
    outDir: getValue("--out"),
    caseId: getValue("--id"),
    title: getValue("--title"),
    errorMessage: getValue("--error"),
    render: args.includes("--render"),
    repair: args.includes("--repair"),
  };
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function loadRawInput(options: CliOptions): Promise<unknown> {
  if (options.modulePath) {
    const resolved = resolve(options.modulePath);
    const mod = await import(pathToFileURL(resolved).href);
    const source = mod[options.exportName ?? "default"];
    if (source === undefined) {
      throw new Error(`Module ${resolved} does not export "${options.exportName}"`);
    }
    return typeof source === "function" ? await source() : source;
  }

  if (options.inputPath) {
    return JSON.parse(readFileSync(resolve(options.inputPath), "utf8"));
  }

  throw new Error("Pass either --input <jsonPath> or --module <path> [--export <name>]");
}

function normalizeInput(rawInput: unknown): NormalizedInput {
  const agentParse = AgentDocumentSchema.safeParse(rawInput);
  if (agentParse.success) {
    return {
      rawInput,
      normalizedDoc: applyElasticPagination(compileAgentDocument(agentParse.data)),
      inputType: "agentDocument",
    };
  }

  const paperParse = PaperDocumentSchema.safeParse(rawInput);
  if (paperParse.success) {
    return {
      rawInput,
      normalizedDoc: applyElasticPagination(paperParse.data),
      inputType: "paperDocument",
    };
  }

  return {
    rawInput,
    inputType: "invalid",
    validationIssues: agentParse.error.issues.slice(0, 20).map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    })),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rawInput = await loadRawInput(options);
  const normalized = normalizeInput(rawInput);

  const baseId = options.caseId
    ?? options.title
    ?? options.modulePath
    ?? options.inputPath
    ?? "corpus-case";
  const caseId = slugify(basename(baseId).replace(/\.[^.]+$/, "")) || "corpus-case";
  const rootDir = resolve(options.outDir ?? "tests/desktopValidation/corpus/ingested", caseId);
  const assetsDir = join(rootDir, "assets");
  mkdirSync(assetsDir, { recursive: true });

  const anonymized = anonymizeCorpusValue(rawInput);
  for (const asset of anonymized.binaries) {
    writeFileSync(join(assetsDir, asset.key), asset.buffer);
  }
  writeFileSync(
    join(rootDir, "input.anonymized.json"),
    JSON.stringify(anonymized.document, null, 2),
  );

  let qualityReport: Awaited<ReturnType<typeof PaperEngine.preflight>> | undefined;
  let generatedPath: string | undefined;
  let renderError: string | undefined;

  if (normalized.normalizedDoc) {
    qualityReport = await PaperEngine.preflight(normalized.normalizedDoc);

    if (options.render) {
      try {
        const result = await PaperEngine.renderWithQualityReport(
          normalized.normalizedDoc,
          undefined,
          {
            validationMode: "structural",
            repairMode: options.repair ? "structural" : "none",
          },
        );
        generatedPath = join(rootDir, "generated.pptx");
        writeFileSync(generatedPath, result.pptx);
        writeFileSync(
          join(rootDir, "validation.json"),
          JSON.stringify(result.qualityReport, null, 2),
        );
        qualityReport = result.qualityReport;
      } catch (error) {
        renderError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const families = normalized.normalizedDoc
    ? classifyFailureFamilies(
      normalized.normalizedDoc,
      qualityReport,
      options.errorMessage ?? renderError,
    )
    : ["malformed_ast"];

  const metadata = {
    id: caseId,
    title: options.title ?? caseId,
    createdAt: new Date().toISOString(),
    inputType: normalized.inputType,
    families,
    validationIssues: normalized.validationIssues,
    qualityReport,
    renderError: options.errorMessage ?? renderError,
    assets: anonymized.binaries.map((asset) => ({
      key: asset.key,
      sha256: asset.sha256,
      byteLength: asset.byteLength,
    })),
    generatedPath,
  };

  writeFileSync(join(rootDir, "case.json"), JSON.stringify(metadata, null, 2));
  console.log(JSON.stringify({ rootDir, metadata }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
