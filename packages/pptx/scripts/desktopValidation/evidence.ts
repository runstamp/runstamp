import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { getDefaultManifestPath } from "../../tests/desktopValidation/helpers/corpus.js";

export interface NormalizedOracleResult {
  fixtureId: string;
  expectedPass: boolean;
  inputSha256: string;
  inputByteLength: number;
  passed: boolean;
  repairPromptDetected: boolean;
  structuralPassed: boolean;
  roundTripSha256: string | null;
  roundTripByteLength: number | null;
  failures: string[];
  inputSlideCount: number;
  roundTripSlideCount: number | null;
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function corpusManifestSha256(): string {
  return sha256Buffer(readFileSync(getDefaultManifestPath()));
}

export interface PptxInventory {
  slides: number;
  charts: number;
  media: number;
  embeddings: number;
  emptyRelationshipDirectories: string[];
}

export async function inspectPptx(buffer: Buffer): Promise<PptxInventory> {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.entries(zip.files);
  const paths = files.filter(([, entry]) => !entry.dir).map(([entryPath]) => entryPath);
  const emptyRelationshipDirectories = files
    .filter(([entryPath, entry]) => entry.dir && (entryPath.endsWith("_rels/") || entryPath.endsWith("embeddings/")))
    .map(([entryPath]) => entryPath)
    .filter((directory) => !paths.some((entryPath) => entryPath.startsWith(directory)));
  return {
    slides: paths.filter((entryPath) => /^ppt\/slides\/slide\d+\.xml$/u.test(entryPath)).length,
    charts: paths.filter((entryPath) => /^ppt\/charts\/chart\d+\.xml$/u.test(entryPath)).length,
    media: paths.filter((entryPath) => entryPath.startsWith("ppt/media/")).length,
    embeddings: paths.filter((entryPath) => entryPath.startsWith("ppt/embeddings/")).length,
    emptyRelationshipDirectories,
  };
}

export function createNormalizedOracleEvidence(
  platform: "windowsPowerPoint" | "macPowerPoint" | "googleSlides",
  results: NormalizedOracleResult[],
  oracleAvailable: boolean,
) {
  return {
    schemaVersion: 1,
    platform,
    oracleAvailable,
    generatedAt: new Date().toISOString(),
    corpusManifestSha256: corpusManifestSha256(),
    results,
    // Human-readable only. GA recomputes these counts from results.
    summary: {
      positiveFixtures: results.filter((result) => result.expectedPass).length,
      cleanPositiveFixtures: results.filter((result) => result.expectedPass && result.passed).length,
      detectedNegativeControls: results.filter((result) => !result.expectedPass && !result.passed).length,
    },
  };
}
