import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

function buildPivotWorkbook(overrides?: Partial<SpreadsheetDocument>): SpreadsheetDocument {
  const document: SpreadsheetDocument = {
    sheets: [
      {
        name: "Data",
        rows: [
          { cells: [{ value: "Region" }, { value: "Quarter" }, { value: "Revenue" }, { value: "Units" }] },
          { cells: [{ value: "East" }, { value: "Q1" }, { value: 120 }, { value: 10 }] },
          { cells: [{ value: "East" }, { value: "Q2" }, { value: 140 }, { value: 12 }] },
          { cells: [{ value: "West" }, { value: "Q1" }, { value: 90 }, { value: 8 }] },
          { cells: [{ value: "West" }, { value: "Q2" }, { value: 160 }, { value: 14 }] },
          { cells: [{ value: "North" }, { value: "Q1" }, { value: 110 }, { value: 9 }] },
        ],
        charts: [
          {
            type: "col",
            title: "Source Revenue",
            series: [{ name: "Revenue", categories: "Data!$A$2:$A$6", values: "Data!$C$2:$C$6" }],
            anchor: { from: { col: 5, row: 0 }, to: { col: 12, row: 16 } },
          },
        ],
      },
      {
        name: "Analysis",
        rows: [],
        pivotTables: [
          {
            name: "SalesPivot",
            sourceSheet: "Data",
            sourceRef: "A1:D6",
            targetCell: "F2",
            rowFields: [{ name: "Region", subtotals: false }],
            columnFields: [{ name: "Quarter", subtotals: ["sum", "max"] }],
            filterFields: ["Units"],
            valueFields: [
              { name: "Revenue", summarizeBy: "sum", title: "Total Revenue" },
              { name: "Units", summarizeBy: "average", title: "Avg Units" },
              { name: "Margin", summarizeBy: "sum", title: "Margin" },
            ],
            calculatedFields: [
              { name: "Margin", formula: "Revenue*0.1" },
            ],
            style: {
              name: "PivotStyleMedium9",
              showRowStripes: true,
              showColumnHeaders: true,
            },
          },
        ],
        pivotCharts: [
          {
            pivotTable: "SalesPivot",
            type: "col",
            title: "Revenue Pivot Chart",
            anchor: { from: { col: 0, row: 0 }, to: { col: 8, row: 18 } },
            style: { showLegend: true },
          },
        ],
      },
    ],
  };

  return {
    ...document,
    ...overrides,
  };
}

describe("Pivot table support", () => {
  it("serializes pivot cache, pivot table, workbook wiring, and linked pivot chart parts", async () => {
    const buffer = await SpreadsheetEngine.render(buildPivotWorkbook());

    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");
    expect(contentTypes).toContain('PartName="/xl/pivotTables/pivotTable1.xml"');
    expect(contentTypes).toContain('PartName="/xl/pivotCache/pivotCacheDefinition1.xml"');
    expect(contentTypes).toContain('PartName="/xl/pivotCache/pivotCacheRecords1.xml"');

    const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");
    expect(workbookXml).toContain("<pivotCaches>");
    expect(workbookXml).toContain('cacheId="1"');
    expect(workbookXml).toContain('r:id="rIdPivotCache1"');

    const workbookRels = await readZipEntry(buffer, "xl/_rels/workbook.xml.rels");
    expect(workbookRels).toContain("relationships/pivotCacheDefinition");
    expect(workbookRels).toContain('Target="pivotCache/pivotCacheDefinition1.xml"');

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet2.xml");
    expect(sheetXml).not.toContain("pivotTableDefinition");

    const sheetRels = await readZipEntry(buffer, "xl/worksheets/_rels/sheet2.xml.rels");
    expect(sheetRels).toContain("relationships/pivotTable");
    expect(sheetRels).toContain('Target="../pivotTables/pivotTable1.xml"');

    const pivotTableRels = await readZipEntry(buffer, "xl/pivotTables/_rels/pivotTable1.xml.rels");
    expect(pivotTableRels).toContain("relationships/pivotCacheDefinition");
    expect(pivotTableRels).toContain('Target="../pivotCache/pivotCacheDefinition1.xml"');

    const pivotTableXml = await readZipEntry(buffer, "xl/pivotTables/pivotTable1.xml");
    expect(pivotTableXml).toContain('name="SalesPivot"');
    expect(pivotTableXml).toContain('cacheId="1"');
    expect(pivotTableXml).toContain('<colFields count="2">');
    expect(pivotTableXml).toContain('<field x="-2"/>');
    expect(pivotTableXml).toContain('defaultSubtotal="0"');
    expect(pivotTableXml).toContain('sumSubtotal="1"');
    expect(pivotTableXml).toContain('maxSubtotal="1"');
    expect(pivotTableXml).toContain('subtotal="sum"');
    expect(pivotTableXml).toContain('subtotal="avg"');
    expect(pivotTableXml).toContain('PivotStyleMedium9');

    const cacheDefinitionXml = await readZipEntry(buffer, "xl/pivotCache/pivotCacheDefinition1.xml");
    expect(cacheDefinitionXml).toContain('<worksheetSource sheet="Data" ref="A1:D6"/>');
    expect(cacheDefinitionXml).toContain('name="Margin"');
    expect(cacheDefinitionXml).toContain('formula="Revenue*0.1"');

    const cacheDefinitionRels = await readZipEntry(buffer, "xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels");
    expect(cacheDefinitionRels).toContain("relationships/pivotCacheRecords");
    expect(cacheDefinitionRels).toContain('Target="pivotCacheRecords1.xml"');

    const cacheRecordsXml = await readZipEntry(buffer, "xl/pivotCache/pivotCacheRecords1.xml");
    expect(cacheRecordsXml).toContain('count="5"');
    expect(cacheRecordsXml).toContain('<s v="East"/>');
    expect(cacheRecordsXml).toContain('<n v="120"/>');

    const sourceChartXml = await readZipEntry(buffer, "xl/charts/chart1.xml");
    expect(sourceChartXml).not.toContain("<c:pivotSource>");

    const pivotChartXml = await readZipEntry(buffer, "xl/charts/chart2.xml");
    expect(pivotChartXml).toContain("<c:pivotSource>");
    expect(pivotChartXml).toContain("<c:name>SalesPivot</c:name>");
    expect(pivotChartXml).toContain("Revenue Pivot Chart");
  });

  it("supports an explicit row-oriented synthetic Values axis", async () => {
    const document = buildPivotWorkbook();
    document.sheets[1]!.pivotTables![0]!.valuesAxis = "row";

    const buffer = await SpreadsheetEngine.render(document);
    const pivotTableXml = await readZipEntry(buffer, "xl/pivotTables/pivotTable1.xml");

    expect(pivotTableXml).toContain('dataOnRows="1"');
    expect(pivotTableXml).toContain('<rowFields count="2">');
    expect(pivotTableXml).toContain('<field x="-2"/>');
  });

  it("validates pivot field references and pivot chart linkage", () => {
    const invalidPivotField = buildPivotWorkbook();
    invalidPivotField.sheets[1]!.pivotTables![0]!.valueFields = [{ name: "MissingField" }];
    expect(() => SpreadsheetEngine.validateDocument(invalidPivotField)).toThrow(/unknown field/i);

    const invalidPivotChart = buildPivotWorkbook();
    invalidPivotChart.sheets[1]!.pivotCharts = [{ pivotTable: "MissingPivot", type: "col", anchor: { from: { col: 0, row: 0 } } }];
    expect(() => SpreadsheetEngine.validateDocument(invalidPivotChart)).toThrow(/missing pivot table/i);
  });

  it("rejects pivot chart dimensions that exceed drawing bounds", () => {
    const invalidPivotChart = buildPivotWorkbook();
    invalidPivotChart.sheets[1]!.pivotCharts = [{
      pivotTable: "SalesPivot",
      type: "col",
      anchor: { from: { col: 0, row: 0 } },
      width: 5_000,
      height: 256,
    }];
    expect(() => SpreadsheetEngine.validateDocument(invalidPivotChart)).toThrow(/Drawing dimensions/);
  });
});
