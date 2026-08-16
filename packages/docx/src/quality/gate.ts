import { createHash } from "node:crypto";
import type {
  FindingCode,
  QualityFinding,
  QualityReport,
  RenderWithQualityResult,
  RepairEntry,
} from "./types.js";
import {
  validateDocxBuffer,
  type OoxmlValidationResult,
} from "../core/ooxml-output-validator.js";
import { checkDocxQuality } from "./reporter.js";

export interface DocxRenderStatsForQualityGate {
  renderTimeMs?: number;
  pageCount?: number;
  elementCount?: number;
  imageCount?: number;
  tableCount?: number;
  chartCount?: number;
  fileSizeBytes?: number;
  xmlTimeMs?: number;
  zipTimeMs?: number;
}

export interface DocxExpectedSemanticManifest {
  id?: string;
  expectedFindingCodes?: FindingCode[];
  forbiddenFindingCodes?: FindingCode[];
  expectedText?: string[];
  [key: string]: unknown;
}

export interface DocxQualityGateInput {
  buffer: Buffer | Uint8Array;
  renderStats?: DocxRenderStatsForQualityGate;
  expectedSemanticManifest?: DocxExpectedSemanticManifest;
}

export interface DocxQualityGateArtifactHashes {
  inputSha256: string;
  outputSha256: string;
  qualitySha256: string;
  manifestSha256: string;
  strictValidationSha256: string;
}

export interface DocxQualityGateManifest {
  schemaVersion: 1;
  engine: "docx";
  accepted: boolean;
  rejected: boolean;
  verdict: QualityReport["verdict"];
  repairRisk: QualityReport["repairRisk"];
  renderStats: DocxRenderStatsForQualityGate;
  strictValidationOk: boolean;
  strictIssueCount: number;
  findingCodes: FindingCode[];
  repairStrategies: string[];
  expectedSemanticManifest?: DocxExpectedSemanticManifest;
  artifactHashes: Omit<DocxQualityGateArtifactHashes, "manifestSha256">;
}

export interface DocxQualityGateSidecars {
  quality: QualityReport;
  manifest: DocxQualityGateManifest;
  strictValidation: OoxmlValidationResult;
}

export interface DocxQualityGateResult extends RenderWithQualityResult {
  accepted: boolean;
  rejected: boolean;
  verdict: QualityReport["verdict"];
  findings: QualityFinding[];
  repairs: RepairEntry[];
  artifactHashes: DocxQualityGateArtifactHashes;
  strictValidation: OoxmlValidationResult;
  initialStrictValidation: OoxmlValidationResult;
  expectedSemanticManifest?: DocxExpectedSemanticManifest;
  sidecars: DocxQualityGateSidecars;
}

export interface DocxQualityGate {
  run(input: DocxQualityGateInput): Promise<DocxQualityGateResult>;
}

function sha256(value: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function manifestExpectationRejected(
  findings: QualityFinding[],
  manifest: DocxExpectedSemanticManifest | undefined,
): boolean {
  if (!manifest) {
    return false;
  }

  const actualCodes = new Set(findings.map((finding) => finding.code));
  const missingExpected = (manifest.expectedFindingCodes ?? []).some((code) => !actualCodes.has(code));
  const foundForbidden = (manifest.forbiddenFindingCodes ?? []).some((code) => actualCodes.has(code));
  return missingExpected || foundForbidden;
}

function isRejectedVerdict(verdict: QualityReport["verdict"]): boolean {
  return verdict === "rejected" || verdict === "visual_fallback";
}

export async function runDocxQualityGate(input: DocxQualityGateInput): Promise<DocxQualityGateResult> {
  const inputBuffer = Buffer.from(input.buffer);
  const renderStats = input.renderStats ?? {};
  const initialStrictValidation = await validateDocxBuffer(inputBuffer);
  const qualityResult = await checkDocxQuality(inputBuffer, renderStats.renderTimeMs ?? 0);
  const strictValidation = await validateDocxBuffer(qualityResult.output);
  const rejected = (
    !strictValidation.ok ||
    isRejectedVerdict(qualityResult.quality.verdict) ||
    manifestExpectationRejected(qualityResult.quality.findings, input.expectedSemanticManifest)
  );
  const accepted = !rejected;

  const manifestWithoutHash: DocxQualityGateManifest = {
    schemaVersion: 1,
    engine: "docx",
    accepted,
    rejected,
    verdict: qualityResult.quality.verdict,
    repairRisk: qualityResult.quality.repairRisk,
    renderStats,
    strictValidationOk: strictValidation.ok,
    strictIssueCount: strictValidation.issues.length,
    findingCodes: qualityResult.quality.findings.map((finding) => finding.code),
    repairStrategies: qualityResult.quality.repairLog.map((entry) => entry.strategy),
    ...(input.expectedSemanticManifest ? { expectedSemanticManifest: input.expectedSemanticManifest } : {}),
    artifactHashes: {
      inputSha256: sha256(inputBuffer),
      outputSha256: sha256(qualityResult.output),
      qualitySha256: sha256(stableJson(qualityResult.quality)),
      strictValidationSha256: sha256(stableJson(strictValidation)),
    },
  };
  const manifestSha256 = sha256(stableJson(manifestWithoutHash));
  const artifactHashes: DocxQualityGateArtifactHashes = {
    ...manifestWithoutHash.artifactHashes,
    manifestSha256,
  };
  const manifest: DocxQualityGateManifest = {
    ...manifestWithoutHash,
    artifactHashes: {
      inputSha256: artifactHashes.inputSha256,
      outputSha256: artifactHashes.outputSha256,
      qualitySha256: artifactHashes.qualitySha256,
      strictValidationSha256: artifactHashes.strictValidationSha256,
    },
  };

  return {
    output: qualityResult.output,
    quality: qualityResult.quality,
    accepted,
    rejected,
    verdict: qualityResult.quality.verdict,
    findings: qualityResult.quality.findings,
    repairs: qualityResult.quality.repairLog,
    artifactHashes,
    strictValidation,
    initialStrictValidation,
    ...(input.expectedSemanticManifest ? { expectedSemanticManifest: input.expectedSemanticManifest } : {}),
    sidecars: {
      quality: qualityResult.quality,
      manifest,
      strictValidation,
    },
  };
}

export const DocxQualityGate: DocxQualityGate = Object.freeze({
  run: runDocxQualityGate,
});
