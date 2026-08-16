import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const STORE_MODULE_PATH = resolve(
  process.cwd(),
  "platform/app/lib/pptx/validationRecordStore.ts",
);

async function importFreshStoreModule() {
  delete (globalThis as Record<string, unknown>).__validationRecordStore;
  vi.resetModules();
  return import(pathToFileURL(STORE_MODULE_PATH).href);
}

const tempDirs: string[] = [];

afterEach(async () => {
  delete process.env.VALIDATION_RECORD_BACKEND;
  delete process.env.RUNSTAMP_VALIDATION_RECORDS_DIR;
  delete (globalThis as Record<string, unknown>).__validationRecordStore;

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("validation record store", () => {
  it("persists and reloads desktop validation records with artifact routes", async () => {
    const recordsDir = await mkdtemp(join(tmpdir(), "runstamp-validation-records-"));
    const artifactDir = await mkdtemp(join(tmpdir(), "runstamp-validation-artifacts-"));
    tempDirs.push(recordsDir, artifactDir);

    await writeFile(join(artifactDir, "generated.pptx"), Buffer.from("pptx"));
    await writeFile(join(artifactDir, "powerpoint-export.pdf"), Buffer.from("pdf"));
    await writeFile(join(artifactDir, "powerpoint-saved-copy.pptx"), Buffer.from("saved"));
    await writeFile(join(artifactDir, "repair-dialog.txt"), Buffer.from("repair"));

    process.env.VALIDATION_RECORD_BACKEND = "filesystem";
    process.env.RUNSTAMP_VALIDATION_RECORDS_DIR = recordsDir;

    const { validationRecordStore } = await importFreshStoreModule();
    const record = await validationRecordStore.save({
      validationId: "record-123",
      artifactDir,
      artifacts: {
        generatedPptxPath: join(artifactDir, "generated.pptx"),
        pdfPath: join(artifactDir, "powerpoint-export.pdf"),
        savedCopyPath: join(artifactDir, "powerpoint-saved-copy.pptx"),
        screenshotPath: join(artifactDir, "repair-dialog.txt"),
      },
      summary: {
        status: "failed",
        available: true,
        backend: "powerpoint_macos",
        platform: "macos",
        checks: [
          {
            id: "desktop.open",
            passed: false,
            severity: "error",
            message: "PowerPoint desktop could not open the generated deck.",
          },
        ],
        failureCount: 1,
        details: ["open failed"],
      },
    });

    expect(record.id).toBe("record-123");
    expect(record.recordUrl).toBe("/api/validate/record-123");
    expect(record.summary.recordUrl).toBe("/api/validate/record-123");
    expect(record.summary.artifactPaths?.pdfPath).toBe(
      "/api/validate/record-123/artifacts/pdf_export",
    );
    expect(record.artifacts.map((artifact: { id: string }) => artifact.id)).toEqual([
      "generated_pptx",
      "pdf_export",
      "saved_copy",
      "repair_dialog",
    ]);

    const fetched = await validationRecordStore.get("record-123");
    expect(fetched?.summary.recordUrl).toBe("/api/validate/record-123");
    expect(fetched?.artifacts[1]?.url).toBe("/api/validate/record-123/artifacts/pdf_export");

    const pdfArtifact = await validationRecordStore.readArtifact("record-123", "pdf_export");
    expect(pdfArtifact?.contentType).toBe("application/pdf");
    expect(pdfArtifact?.buffer.toString("utf8")).toBe("pdf");
  });
});
