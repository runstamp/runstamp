import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifySizeEfficiencyStatus,
  loadExcelJsBenchmarkModule,
} from "../src/benchmarks/phase2.js";

describe("Phase 2 benchmark classification", () => {
  it("reports target-mismatch size debt as a warning while preserving real failures", () => {
    expect(classifySizeEfficiencyStatus(2 * 1024, 3 * 1024, {
      classification: "benchmark-target-mismatch-candidate",
    })).toBe("pass");

    expect(classifySizeEfficiencyStatus(4 * 1024, 3 * 1024, {
      classification: "benchmark-target-mismatch-candidate",
    })).toBe("warn");

    expect(classifySizeEfficiencyStatus(4 * 1024, 3 * 1024, {
      classification: "active-performance-debt",
    })).toBe("fail");

    expect(classifySizeEfficiencyStatus(4 * 1024, 3 * 1024)).toBe("fail");
  });

  it("loads an explicitly configured ExcelJS benchmark module", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "runstamp-exceljs-loader-"));
    const modulePath = join(tempDir, "exceljs.mjs");
    await writeFile(modulePath, "export default { Workbook: class Workbook {} };\n");

    try {
      const loaded = await loadExcelJsBenchmarkModule({
        envModulePath: modulePath,
        packageRequireBase: "/var/empty/runstamp-xlsx-missing/package.json",
        tempRequireBase: "/var/empty/runstamp-xlsx-missing-temp/package.json",
      });

      expect(loaded.status).toBe("loaded");
      expect(loaded.module?.Workbook).toBeTypeOf("function");
      expect(loaded.source).toContain("RUNSTAMP_XLSX_EXCELJS_MODULE_PATH");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("returns an actionable missing ExcelJS baseline message", async () => {
    const missing = await loadExcelJsBenchmarkModule({
      packageRequireBase: false,
      tempRequireBase: false,
    });

    expect(missing.status).toBe("missing");
    expect(missing.message).toContain("ExcelJS competitor baseline unavailable");
    expect(missing.message).toContain("RUNSTAMP_XLSX_EXCELJS_MODULE_PATH");
  });
});
