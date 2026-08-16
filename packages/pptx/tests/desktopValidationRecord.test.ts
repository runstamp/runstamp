import { describe, expect, it } from "vitest";
import {
  computeDesktopValidationContentHash,
  desktopValidationRecordToSummary,
  type DesktopValidationRecord,
} from "../src/quality/desktopValidationRecord.js";

describe("desktop validation record schema", () => {
  it("scopes cached records to a deterministic content hash", () => {
    const first = computeDesktopValidationContentHash(Buffer.from("deck-a"));
    const replay = computeDesktopValidationContentHash(Buffer.from("deck-a"));
    const second = computeDesktopValidationContentHash(Buffer.from("deck-b"));

    expect(first).toBe(replay);
    expect(first).not.toBe(second);
    expect(first).toHaveLength(64);
  });

  it("derives quality-report summaries from worker JSON records", () => {
    const record: DesktopValidationRecord = {
      id: "record-1",
      contentHash: computeDesktopValidationContentHash(Buffer.from("pptx")),
      backend: "libreoffice",
      platform: "linux",
      workerVersion: "mock-1",
      status: "failed",
      requestedAt: "2026-05-12T00:00:00.000Z",
      completedAt: "2026-05-12T00:00:02.000Z",
      opened: true,
      repairDialogDetected: false,
      pdfExport: {
        attempted: true,
        succeeded: true,
        artifactPath: "artifacts/export.pdf",
        pageCount: 3,
        errors: [],
      },
      savedCopy: {
        attempted: true,
        succeeded: false,
        artifactPath: "artifacts/roundtrip.pptx",
        normalizedPackageDiffPassed: false,
        errors: ["roundtrip changed relationships"],
      },
      checks: [],
      artifactPaths: { generatedPptxPath: "artifacts/generated.pptx" },
      details: ["normalized package diff failed"],
    };

    const summary = desktopValidationRecordToSummary(record, {
      recordUrl: "/api/validate/record-1",
    });

    expect(summary).toMatchObject({
      status: "failed",
      available: true,
      backend: "libreoffice",
      platform: "linux",
      failureCount: 1,
      recordUrl: "/api/validate/record-1",
      recordedAt: "2026-05-12T00:00:02.000Z",
    });
    expect(summary.checks.map((check) => check.id)).toEqual([
      "desktop.open",
      "desktop.repair_dialog",
      "desktop.pdf_export",
      "desktop.save_copy_roundtrip",
    ]);
    expect(summary.artifactPaths?.pdfPath).toBe("artifacts/export.pdf");
    expect(summary.artifactPaths?.savedCopyPath).toBe("artifacts/roundtrip.pptx");
  });
});
