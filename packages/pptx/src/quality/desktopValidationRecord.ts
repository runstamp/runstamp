import { createHash } from "node:crypto";
import type {
  DesktopValidationBackend,
  DesktopValidationCheck,
  DesktopValidationPlatform,
  DesktopValidationSummary,
} from "./report.js";

export type DesktopValidationWorkerStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "worker_failed"
  | "timeout"
  | "unavailable";

export interface DesktopValidationArtifactPaths {
  generatedPptxPath?: string;
  pdfPath?: string;
  savedCopyPath?: string;
  screenshotPath?: string;
}

export interface DesktopValidationExportRecord {
  attempted: boolean;
  succeeded: boolean;
  artifactPath?: string;
  pageCount?: number;
  errors: string[];
}

export interface DesktopValidationSavedCopyRecord {
  attempted: boolean;
  succeeded: boolean;
  artifactPath?: string;
  normalizedPackageDiffPassed?: boolean;
  errors: string[];
}

export interface DesktopValidationRecord {
  id: string;
  contentHash: string;
  backend: DesktopValidationBackend;
  platform: DesktopValidationPlatform;
  workerVersion?: string;
  status: DesktopValidationWorkerStatus;
  requestedAt: string;
  completedAt?: string;
  opened: boolean;
  repairDialogDetected: boolean;
  pdfExport: DesktopValidationExportRecord;
  savedCopy: DesktopValidationSavedCopyRecord;
  checks: DesktopValidationCheck[];
  artifactPaths: DesktopValidationArtifactPaths;
  details: string[];
}

export function computeDesktopValidationContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function recordStatusToSummaryStatus(
  record: DesktopValidationRecord,
): DesktopValidationSummary["status"] {
  if (record.status === "passed") return "passed";
  if (record.status === "queued" || record.status === "running") return "not_run";
  return "failed";
}

function buildDefaultChecks(record: DesktopValidationRecord): DesktopValidationCheck[] {
  return [
    {
      id: "desktop.open",
      passed: record.opened,
      severity: record.opened ? "info" : "error",
      message: record.opened
        ? "Desktop worker opened the generated deck."
        : "Desktop worker could not open the generated deck.",
    },
    {
      id: "desktop.repair_dialog",
      passed: !record.repairDialogDetected,
      severity: record.repairDialogDetected ? "error" : "info",
      message: record.repairDialogDetected
        ? "Desktop worker detected a presentation repair dialog."
        : "Desktop worker did not detect a presentation repair dialog.",
    },
    {
      id: "desktop.pdf_export",
      passed: record.pdfExport.succeeded,
      severity: record.pdfExport.succeeded ? "info" : "error",
      message: record.pdfExport.succeeded
        ? "Desktop worker exported the generated deck to PDF."
        : "Desktop worker failed to export the generated deck to PDF.",
    },
    {
      id: "desktop.save_copy_roundtrip",
      passed: record.savedCopy.succeeded && record.savedCopy.normalizedPackageDiffPassed !== false,
      severity: record.savedCopy.succeeded && record.savedCopy.normalizedPackageDiffPassed !== false ? "info" : "error",
      message: record.savedCopy.succeeded && record.savedCopy.normalizedPackageDiffPassed !== false
        ? "Desktop worker saved a copy without normalized package regressions."
        : "Desktop worker failed the save-copy round-trip check.",
    },
  ];
}

export function desktopValidationRecordToSummary(
  record: DesktopValidationRecord,
  options?: { recordUrl?: string },
): DesktopValidationSummary {
  const checks = record.checks.length > 0 ? record.checks : buildDefaultChecks(record);
  return {
    status: recordStatusToSummaryStatus(record),
    available: record.status !== "unavailable",
    backend: record.backend,
    platform: record.platform,
    checks,
    failureCount: checks.filter((check) => !check.passed).length,
    details: record.details.length > 0 ? record.details : undefined,
    artifactPaths: {
      pdfPath: record.pdfExport.artifactPath ?? record.artifactPaths.pdfPath,
      savedCopyPath: record.savedCopy.artifactPath ?? record.artifactPaths.savedCopyPath,
      screenshotPath: record.artifactPaths.screenshotPath,
    },
    recordUrl: options?.recordUrl,
    recordedAt: record.completedAt ?? record.requestedAt,
  };
}
