import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";
import { readZipEntry } from "./helpers.js";
import { validateSpreadsheetDocument } from "../src/validation/spreadsheet-schema.js";

async function getSheet1Xml(doc: SpreadsheetDocument): Promise<string> {
  const buffer = await SpreadsheetEngine.render(doc, { deterministic: true });
  return readZipEntry(buffer, "xl/worksheets/sheet1.xml");
}

describe("sheet protection", () => {
  it("produces <sheetProtection sheet=\"1\"/> for protection: { sheet: true }", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        protection: { sheet: true },
      }],
    });

    expect(xml).toContain(`<sheetProtection sheet="1"/>`);
  });

  it("default protection (empty object) enables sheet protection", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        protection: {},
      }],
    });

    expect(xml).toContain(`sheet="1"`);
    expect(xml).toContain("<sheetProtection");
  });

  it("includes password hash in XML", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        protection: { password: "test" },
      }],
    });

    expect(xml).toContain(`password="`);
    expect(xml).not.toContain(`password="test"`);
    expect(xml).toContain("<sheetProtection");
  });

  it("hashes 'password' to E8B5 (legacy Excel XOR hash)", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        protection: { password: "password" },
      }],
    });

    expect(xml).toContain(`password="E8B5"`);
  });

  it("serializes specific permission attributes", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        protection: {
          formatCells: false,
          insertRows: true,
          selectLockedCells: true,
          sort: false,
        },
      }],
    });

    expect(xml).toContain(`formatCells="0"`);
    expect(xml).toContain(`insertRows="1"`);
    expect(xml).toContain(`selectLockedCells="1"`);
    expect(xml).toContain(`sort="0"`);
    expect(xml).toContain(`sheet="1"`);
  });

  it("cell-level locked: true combined with sheet protection", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{
          cells: [{
            value: "Locked",
            style: { protection: { locked: true } },
          }],
        }],
        protection: { sheet: true },
      }],
    });

    expect(xml).toContain("<sheetProtection");
    expect(xml).toContain(`sheet="1"`);
    // Cell should have a style index applied (s="...")
    expect(xml).toMatch(/<c r="A1"[^>]*s="/);
  });

  it("validation accepts the protection field", () => {
    const doc = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        protection: {
          password: "secret",
          sheet: true,
          formatCells: false,
          selectLockedCells: true,
        },
      }],
    };

    const result = validateSpreadsheetDocument(doc);
    expect(result.sheets[0].protection).toBeDefined();
    expect(result.sheets[0].protection!.password).toBe("secret");
    expect(result.sheets[0].protection!.sheet).toBe(true);
    expect(result.sheets[0].protection!.formatCells).toBe(false);
  });

  it("sheetProtection appears between autoFilter and mergeCells in XML order", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [
          { cells: [{ value: "A", colSpan: 2 }, { value: null }] },
          { cells: [{ value: "C" }, { value: "D" }] },
        ],
        protection: { sheet: true },
      }],
    });

    const protectionIndex = xml.indexOf("<sheetProtection");
    const mergeCellsIndex = xml.indexOf("<mergeCells");

    expect(protectionIndex).toBeGreaterThan(-1);
    expect(mergeCellsIndex).toBeGreaterThan(-1);
    expect(protectionIndex).toBeLessThan(mergeCellsIndex);
  });
});
