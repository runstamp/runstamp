import { runExtension } from "@runstamp/protocol";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  SpreadsheetEngine,
  XlsxWorkflowError,
  createXlsxStructuredWorkflowExtension,
  exportXlsxWorkflow,
  importXlsxWorkflow,
  mapXlsxWorkflow,
  readXlsxWorkflow,
  verifyXlsxWorkflow,
  writeXlsxWorkflow,
} from "../src/index.js";
import type { SpreadsheetDocument, XlsxLocator } from "../src/index.js";

async function questionnaireWorkbook(): Promise<Buffer> {
  const document: SpreadsheetDocument = {
    namedRanges: [{ name: "ConfirmedAnswer", ref: "Questionnaire!$B$2" }],
    sheets: [
      {
        name: "Questionnaire",
        columns: [{ width: 24 }, { width: 30 }, { hidden: true }],
        dataValidations: [{ ref: "B2:B10", type: "list", formula1: ["Yes", "No", "N/A"] }],
        rows: [
          { cells: [{ value: "Security questionnaire", colSpan: 2, style: { font: { bold: true } } }] },
          { cells: [{ value: "Do you encrypt data?" }, { value: "No", style: { fill: { color: "FFF2CC" } }, comment: { author: "Reviewer", text: "Confirm with security" } }, { value: "internal" }] },
          { hidden: true, cells: [{ value: "Control" }, { formula: { expression: "IF(B2=\"Yes\",1,0)", cachedValue: 0 } }] },
        ],
      },
      { name: "Lookups", state: "veryHidden", rows: [{ cells: [{ value: "Yes" }, { value: "No" }] }] },
    ],
  };
  return SpreadsheetEngine.render(document, { deterministic: true });
}

describe("A02 XLSX structured workflow", () => {
  it("inspects, maps, reads, writes, and verifies a buyer questionnaire", async () => {
    const original = await questionnaireWorkbook();
    const imported = await importXlsxWorkflow(original, { artifactId: "questionnaire" });
    expect(imported.inspection.sheets.map((sheet) => [sheet.name, sheet.state])).toEqual([
      ["Questionnaire", "visible"],
      ["Lookups", "veryHidden"],
    ]);
    expect(imported.inspection.sheets[0]).toMatchObject({
      mergedRanges: ["A1:B1"],
      hiddenRows: [3],
      hiddenColumns: [{ min: 3, max: 3 }],
      validations: [expect.objectContaining({ ref: "B2:B10", type: "list" })],
    });
    const [answer] = mapXlsxWorkflow(imported, [{ id: "answer", kind: "namedRange", name: "ConfirmedAnswer" }]);
    expect(answer?.locator).toEqual({ artifactId: "questionnaire", scheme: "xlsx.a1", value: ["Questionnaire", "B2"] });
    expect(readXlsxWorkflow(imported, [answer!.locator])[0]).toMatchObject({ value: "No", styleId: expect.any(Number) });

    const updated = await writeXlsxWorkflow(imported, [{
      locator: answer!.locator,
      value: "Yes",
      comment: { author: "Analyst", text: "Confirmed 2026-08-10" },
    }]);
    expect(readXlsxWorkflow(updated, [answer!.locator])[0]?.value).toBe("Yes");
    expect(updated.inspection.sheets[0]?.comments).toEqual([
      expect.objectContaining({ text: "Confirmed 2026-08-10", author: "Analyst" }),
    ]);
    const verdict = verifyXlsxWorkflow(imported, updated, { allowedCells: [answer!.locator] });
    expect(verdict).toMatchObject({ status: "PASS", issues: [] });
  });

  it("preserves 1904 date mode, locale number formats, formulas, caches, tables, and named ranges", async () => {
    const buffer = await SpreadsheetEngine.render({
      date1904: true,
      namedRanges: [{ name: "GrossMargin", ref: "Financials!$C$2" }],
      sheets: [{
        name: "Financials",
        state: "visible",
        rows: [
          { cells: [{ value: "Revenue" }, { value: "Cost" }, { value: "Margin" }] },
          { cells: [{ value: 1000, style: { numberFormat: "#,##0.00 [$€-407]" } }, { value: 400 }, { formula: { expression: "A2-B2", cachedValue: 600 }, style: { numberFormat: "0.0%" } }] },
        ],
        tables: [{ name: "FinancialTable", ref: "A1:C2" }],
      }],
    }, { deterministic: true });
    const imported = await importXlsxWorkflow(buffer, { artifactId: "finance" });
    expect(imported.inspection.date1904).toBe(true);
    expect(imported.inspection.tables).toEqual([expect.objectContaining({ name: "FinancialTable", sheetName: "Financials", ref: "A1:C2" })]);
    const targets = mapXlsxWorkflow(imported, [
      { id: "margin", kind: "namedRange", name: "GrossMargin" },
      { id: "table", kind: "table", name: "FinancialTable" },
    ]);
    expect(targets.map((target) => target.locator.value)).toEqual([["Financials", "C2"], ["Financials", "A1:C2"]]);
    expect(readXlsxWorkflow(imported, [targets[0]!.locator])[0]).toMatchObject({ formula: "A2-B2", cachedValue: 600 });
    const exported = await exportXlsxWorkflow(imported);
    const roundTrip = await importXlsxWorkflow(exported, { artifactId: "finance" });
    expect(verifyXlsxWorkflow(imported, roundTrip, { allowedCells: [] }).status).toBe("PASS");
  });

  it("maps an unrelated inventory table and range", async () => {
    const buffer = await SpreadsheetEngine.render({ sheets: [{ name: "Stock", rows: [
      { cells: [{ value: "SKU" }, { value: "Qty" }] },
      { cells: [{ value: "A-1" }, { value: 12 }] },
    ], tables: [{ name: "Inventory", ref: "A1:B2" }] }] }, { deterministic: true });
    const document = await importXlsxWorkflow(buffer, { artifactId: "inventory" });
    const mapped = mapXlsxWorkflow(document, [
      { id: "all", kind: "table", name: "inventory" },
      { id: "qty", kind: "a1", sheet: "Stock", ref: "B2" },
    ]);
    expect(readXlsxWorkflow(document, mapped.map((entry) => entry.locator))).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: "A-1" }),
      expect.objectContaining({ value: 12 }),
    ]));
  });

  it("rejects formula injection, unsafe XML, resource exhaustion, and cancellation", async () => {
    const source = await importXlsxWorkflow(await questionnaireWorkbook(), { artifactId: "hostile" });
    const target: XlsxLocator = { artifactId: "hostile", scheme: "xlsx.a1", value: ["Questionnaire", "B2"] };
    await expect(writeXlsxWorkflow(source, [{ locator: target, value: " =HYPERLINK(\"https://evil.invalid\")" }])).rejects.toMatchObject({ code: "XLSX_FORMULA_INJECTION" });
    await expect(importXlsxWorkflow(source.buffer, { maxInputBytes: 10 })).rejects.toMatchObject({ code: "XLSX_BUDGET_EXCEEDED" });
    const controller = new AbortController();
    controller.abort("cancelled by test");
    await expect(importXlsxWorkflow(source.buffer, { signal: controller.signal })).rejects.toMatchObject({ code: "XLSX_ABORTED" });

    const zip = await JSZip.loadAsync(source.buffer);
    zip.file("xl/workbook.xml", "<!DOCTYPE workbook [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><workbook>&xxe;</workbook>");
    await expect(importXlsxWorkflow(await zip.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "XLSX_XML_UNSAFE" });

    const unsafeZip = new JSZip();
    unsafeZip.file("../xl/workbook.xml", "<workbook/>");
    await expect(importXlsxWorkflow(await unsafeZip.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "XLSX_ARCHIVE_UNSAFE" });

    const encryptedZip = await JSZip.loadAsync(source.buffer);
    encryptedZip.file("EncryptedPackage", Buffer.from("ciphertext"));
    await expect(importXlsxWorkflow(await encryptedZip.generateAsync({ type: "nodebuffer" }))).rejects.toMatchObject({ code: "XLSX_ENCRYPTED_UNSUPPORTED" });
  });

  it("preserves macro bytes opaquely and warns on external links without fetching", async () => {
    const base = await questionnaireWorkbook();
    const zip = await JSZip.loadAsync(base);
    const macro = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    zip.file("xl/vbaProject.bin", macro);
    const relPath = "xl/_rels/workbook.xml.rels";
    const rels = await zip.file(relPath)!.async("string");
    zip.file(relPath, rels.replace("</Relationships>", '<Relationship Id="rIdExternal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink" Target="https://example.invalid/source.xlsx" TargetMode="External"/></Relationships>'));
    const input = await zip.generateAsync({ type: "nodebuffer" });
    const imported = await importXlsxWorkflow(input, { artifactId: "macro" });
    expect(imported.inspection.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      "XLSX_MACRO_PRESERVED_OPAQUE",
      "XLSX_EXTERNAL_LINK_PRESERVED",
    ]));
    const output = await exportXlsxWorkflow(imported);
    const outputZip = await JSZip.loadAsync(output);
    expect(await outputZip.file("xl/vbaProject.bin")!.async("nodebuffer")).toEqual(macro);
  });

  it("emits deterministic bytes in separate workflow instances", async () => {
    const source = await questionnaireWorkbook();
    const first = await exportXlsxWorkflow(await importXlsxWorkflow(source, { artifactId: "determinism" }));
    const second = await exportXlsxWorkflow(await importXlsxWorkflow(source, { artifactId: "determinism" }));
    expect(first.equals(second)).toBe(true);
    const zip = await JSZip.loadAsync(first);
    expect(Object.values(zip.files).some((entry) => entry.dir)).toBe(false);
  });

  it("composes through the EX01 runner with budget and progress contracts", async () => {
    const source = await questionnaireWorkbook();
    const progress: number[] = [];
    const context = {
      runId: "a02-composition",
      seed: "a02",
      now: "2026-08-10T00:00:00.000Z",
      network: "disabled" as const,
      budget: { maxInputBytes: 10_000_000, maxOutputBytes: 10_000_000, maxEntries: 100_000, maxDepth: 16, timeoutMs: 10_000 },
    };
    const result = await runExtension(createXlsxStructuredWorkflowExtension(), {
      schemaVersion: 1,
      extensionId: "runstamp.xlsx.structured-workflow",
      operation: "inspect",
      input: { workbookBase64: source.toString("base64"), artifactId: "composition" },
      context,
    }, { onProgress: (update) => progress.push(update.completed) });
    expect(result.status).toBe("ok");
    expect(progress).toEqual([0, 1]);

    const readResult = await runExtension(createXlsxStructuredWorkflowExtension(), {
      schemaVersion: 1,
      extensionId: "runstamp.xlsx.structured-workflow",
      operation: "read",
      input: {
        workbookBase64: source.toString("base64"),
        artifactId: "composition",
        locators: [{ artifactId: "composition", scheme: "xlsx.a1", value: ["Questionnaire", "A2"] }],
      },
      context: { ...context, runId: "a02-composition-read" },
    });
    expect(readResult.status).toBe("ok");
  });

  it("uses explicit trusted formula writes and never recalculates arbitrary formulas", async () => {
    const source = await importXlsxWorkflow(await questionnaireWorkbook(), { artifactId: "formula" });
    const target: XlsxLocator = { artifactId: "formula", scheme: "xlsx.a1", value: ["Questionnaire", "B2"] };
    const updated = await writeXlsxWorkflow(source, [{ locator: target, formula: { expression: "=1+1", cachedValue: 2 } }]);
    expect(readXlsxWorkflow(updated, [target])[0]).toMatchObject({ formula: "1+1", cachedValue: 2 });
    expect(updated.inspection.warnings.some((warning) => warning.code === "XLSX_FORMULA_NOT_RECALCULATED")).toBe(true);
  });

  it("rejects locators from another artifact", async () => {
    const source = await importXlsxWorkflow(await questionnaireWorkbook(), { artifactId: "one" });
    expect(() => readXlsxWorkflow(source, [{ artifactId: "two", scheme: "xlsx.a1", value: ["Questionnaire", "B2"] }])).toThrow(XlsxWorkflowError);
  });
});
