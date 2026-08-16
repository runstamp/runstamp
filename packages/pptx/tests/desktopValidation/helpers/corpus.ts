import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  AgentDocumentSchema,
  PaperDocumentSchema,
  PaperEngine,
  applyElasticPagination,
  compileAgentDocument,
} from "../../../src/index.js";
import type { EngineRenderOptions } from "../../../src/index.js";

export type ValidationMode =
  | "structural"
  | "desktop_open"
  | "pdf_render"
  | "roundtrip_diff";

export type CorpusInputType = "paperDocument" | "agentDocument" | "bufferBuilder";

export interface CorpusAcceptance {
  expectStructuralPass: boolean;
  expectDesktopOpenPass?: boolean;
}

export interface CorpusEntry {
  id: string;
  title: string;
  description?: string;
  source: {
    kind: "module";
    module: string;
    export: string;
    inputType: CorpusInputType;
  };
  expectedSlideCount: number;
  validationModes: ValidationMode[];
  acceptance: CorpusAcceptance;
  renderOptions?: Pick<
    EngineRenderOptions,
    "outputMode" | "maxFallbackLevel" | "validationMode" | "repairMode"
  >;
}

export interface CorpusManifest {
  version: number;
  fixtures: CorpusEntry[];
}

export interface BuiltCorpusFixture {
  entry: CorpusEntry;
  buffer: Buffer;
  slideCount: number;
  normalizedDoc?: unknown;
  sourceInput?: unknown;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST_PATH = resolve(__dirname, "../corpus/manifest.json");

function resolveManifestPath(manifestPath?: string): string {
  return manifestPath ? resolve(manifestPath) : DEFAULT_MANIFEST_PATH;
}

function resolveModulePath(basePath: string, modulePath: string): string {
  return isAbsolute(modulePath) ? modulePath : resolve(dirname(basePath), modulePath);
}

export function getDefaultManifestPath(): string {
  return DEFAULT_MANIFEST_PATH;
}

export function loadCorpusManifest(manifestPath?: string): CorpusManifest {
  const path = resolveManifestPath(manifestPath);
  return JSON.parse(readFileSync(path, "utf8")) as CorpusManifest;
}

export function getCorpusEntry(id: string, manifestPath?: string): CorpusEntry {
  const manifest = loadCorpusManifest(manifestPath);
  const entry = manifest.fixtures.find((fixture) => fixture.id === id);
  if (!entry) {
    throw new Error(`Unknown corpus fixture "${id}"`);
  }
  return entry;
}

export async function listCorpusEntries(manifestPath?: string): Promise<CorpusEntry[]> {
  return loadCorpusManifest(manifestPath).fixtures;
}

export async function buildCorpusFixture(
  entryOrId: CorpusEntry | string,
  manifestPath?: string,
): Promise<BuiltCorpusFixture> {
  const manifestFile = resolveManifestPath(manifestPath);
  const entry = typeof entryOrId === "string"
    ? getCorpusEntry(entryOrId, manifestFile)
    : entryOrId;

  const modulePath = resolveModulePath(manifestFile, entry.source.module);
  const mod = await import(pathToFileURL(modulePath).href);
  const sourceValue = mod[entry.source.export];

  if (sourceValue === undefined) {
    throw new Error(
      `Corpus module ${modulePath} does not export "${entry.source.export}"`,
    );
  }

  if (entry.source.inputType === "bufferBuilder") {
    if (typeof sourceValue !== "function") {
      throw new Error(`Fixture "${entry.id}" expects a buffer builder function export`);
    }
    const buffer = await sourceValue();
    return {
      entry,
      buffer,
      slideCount: entry.expectedSlideCount,
      sourceInput: "[bufferBuilder]",
    };
  }

  if (entry.source.inputType === "agentDocument") {
    const agentDoc = typeof sourceValue === "function" ? await sourceValue() : sourceValue;
    const parsed = AgentDocumentSchema.parse(agentDoc);
    const normalizedDoc = applyElasticPagination(compileAgentDocument(parsed));
    const buffer = await PaperEngine.render(normalizedDoc, entry.renderOptions);
    return {
      entry,
      buffer,
      slideCount: normalizedDoc.slides.length,
      normalizedDoc,
      sourceInput: parsed,
    };
  }

  const paperDoc = typeof sourceValue === "function" ? await sourceValue() : sourceValue;
  const parsed = PaperDocumentSchema.parse(paperDoc);
  const normalizedDoc = applyElasticPagination(parsed);
  const buffer = await PaperEngine.render(normalizedDoc, entry.renderOptions);
  return {
    entry,
    buffer,
    slideCount: normalizedDoc.slides.length,
    normalizedDoc,
    sourceInput: parsed,
  };
}

export function getCorpusArtifactsDir(rootDir?: string): string {
  return rootDir
    ? resolve(rootDir)
    : resolve(__dirname, "../artifacts");
}

export function getFixtureArtifactsDir(fixtureId: string, rootDir?: string): string {
  return join(getCorpusArtifactsDir(rootDir), fixtureId);
}
