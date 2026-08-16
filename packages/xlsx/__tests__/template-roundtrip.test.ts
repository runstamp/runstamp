import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetTemplateAssemblyError } from "../src/index.js";
import type { SpreadsheetDocument, SpreadsheetTemplateIndex } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("Template roundtrip", () => {
  it("render -> parse -> inspect: sheet count matches", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sales",
          rows: [
            { cells: [{ value: "Product" }, { value: "Revenue" }] },
            { cells: [{ value: "Widget" }, { value: 1000 }] },
          ],
        },
        {
          name: "Costs",
          rows: [
            { cells: [{ value: "Item" }, { value: "Amount" }] },
            { cells: [{ value: "Rent" }, { value: 500 }] },
          ],
        },
        {
          name: "Summary",
          rows: [
            { cells: [{ value: "Total" }, { formula: "SUM(Sales!B2,Costs!B2)" }] },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const template = await SpreadsheetEngine.parseTemplate(buffer);
    const report = SpreadsheetEngine.inspectTemplate(template);

    expect(template.sheets).toHaveLength(3);
    expect(template.sheets.map((s) => s.name)).toEqual(["Sales", "Costs", "Summary"]);
    expect(report.sheetInventory).toHaveLength(3);
    // The formula is in the second cell (B1), not A1
    expect(template.sheets[2]?.formulaCells).toContain("B1");
  });

  it("template with named ranges preserved through roundtrip", async () => {
    const doc: SpreadsheetDocument = {
      namedRanges: [
        { name: "Revenue", ref: "Sheet1!$B$2" },
        { name: "Expenses", ref: "Sheet1!$B$3" },
      ],
      sheets: [
        {
          name: "Sheet1",
          rows: [
            { cells: [{ value: "Metric" }, { value: "Value" }] },
            { cells: [{ value: "Revenue" }, { value: 42000 }] },
            { cells: [{ value: "Expenses" }, { value: 18000 }] },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const template = await SpreadsheetEngine.parseTemplate(buffer);

    expect(template.namedRanges).toHaveLength(3);
    expect(template.namedRanges.map((nr) => nr.name)).toEqual(
      expect.arrayContaining(["Revenue", "Expenses", "_xlnm.Print_Area"]),
    );
    const revenueRange = template.namedRanges.find((nr) => nr.name === "Revenue");
    expect(revenueRange?.ref).toContain("$B$2");
  });

  it("template with comments preserved as parts", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sheet1",
          rows: [
            {
              cells: [
                { value: "Important", comment: { text: "Review this", author: "Jake" } },
                { value: "Normal" },
              ],
            },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const template = await SpreadsheetEngine.parseTemplate(buffer);

    // Comments should be preserved as opaque parts or recognized parts
    const hasCommentPart = template.partNames.some((p) => p.includes("comments"));
    expect(hasCommentPart).toBe(true);
  });

  it("template parse -> assemble with cell injection -> validate output", async () => {
    const doc: SpreadsheetDocument = {
      namedRanges: [
        { name: "Target", ref: "Data!$B$2" },
      ],
      sheets: [
        {
          name: "Data",
          rows: [
            { cells: [{ value: "Label" }, { value: "Value" }] },
            { cells: [{ value: "Placeholder" }, { value: 0 }] },
          ],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const template = await SpreadsheetEngine.parseTemplate(buffer);

    const assembled = await SpreadsheetEngine.assembleFromTemplate(template, {
      namedRanges: {
        Target: 99999,
      },
      cells: {
        Data: {
          A2: "Updated Label",
        },
      },
    });

    const sheetXml = await readZipEntry(assembled, "xl/worksheets/sheet1.xml");
    const sharedStringsXml = await readZipEntry(assembled, "xl/sharedStrings.xml");
    expect(sheetXml).toContain("99999");
    expect(sheetXml).toContain("Updated Label");
    expect(sharedStringsXml.match(/<\?xml/g)).toHaveLength(1);

    const summary = await SpreadsheetEngine.validate(assembled);
    expect(summary.verdict).toBe("clean");
  });

  it("assembling from a template index with missing source parts throws TEMPLATE_SOURCE_MISSING", async () => {
    // Create a fake template index that has no source parts in the WeakMap
    const fakeIndex: SpreadsheetTemplateIndex = {
      partNames: [],
      relationships: [],
      sheets: [],
      namedRanges: [],
      tables: [],
      styles: { numFmtCount: 0, fontCount: 0, fillCount: 0, borderCount: 0, cellXfCount: 0 },
      preservedOpaqueParts: [],
      sanitization: { actions: [] },
    };

    await expect(
      SpreadsheetEngine.assembleFromTemplate(fakeIndex, {}),
    ).rejects.toThrow(SpreadsheetTemplateAssemblyError);

    try {
      await SpreadsheetEngine.assembleFromTemplate(fakeIndex, {});
    } catch (error) {
      expect(error).toBeInstanceOf(SpreadsheetTemplateAssemblyError);
      const assemblyError = error as SpreadsheetTemplateAssemblyError;
      expect(assemblyError.issues[0]?.code).toBe("TEMPLATE_SOURCE_MISSING");
      expect(assemblyError.issues[0]?.message).toContain("garbage collected");
    }
  });

  it("rejects template assembly when a defined name references a missing sheet", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
    zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
  <definedNames>
    <definedName name="BrokenRange">MissingSheet!$A$1</definedName>
  </definedNames>
</workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
    zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Hello</t></is></c></row>
  </sheetData>
</worksheet>`);
    zip.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font/></fonts>
  <fills count="1"><fill/></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf/></cellXfs>
</styleSheet>`);
    zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"/>`);
    zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"/>`);

    const template = await SpreadsheetEngine.parseTemplate(await zip.generateAsync({ type: "nodebuffer" }));
    await expect(
      SpreadsheetEngine.assembleFromTemplate(template, {}),
    ).rejects.toThrow(/MissingSheet/);
  });
});
