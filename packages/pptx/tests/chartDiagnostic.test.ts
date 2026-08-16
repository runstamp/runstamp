import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import { compileAgentDocument } from "../src/interpreter/interpreter.js";
import type { PaperDocument } from "../src/types/ast.js";

// ---------------------------------------------------------------------------
// Helper: unzip a PPTX buffer and return file contents
// ---------------------------------------------------------------------------

async function unzipPptx(buf: Buffer): Promise<Map<string, Buffer | string>> {
  const zip = await JSZip.loadAsync(buf);
  const entries = new Map<string, Buffer | string>();
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      entries.set(path, await file.async("text"));
    } else {
      entries.set(path, await file.async("nodebuffer"));
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Test 1: Direct PaperDocument with chart
// ---------------------------------------------------------------------------

describe("Chart PPTX Integrity — Direct PaperDocument", () => {
  it("generates valid chart structure for a simple bar chart", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Chart",
              style: {
                position: "absolute",
                top: 50,
                left: 50,
                width: 400,
                height: 300,
              },
              chartData: {
                chartType: "bar",
                categories: ["Q1", "Q2", "Q3"],
                series: [
                  { name: "Revenue", values: [100, 200, 300] },
                ],
              },
            },
          ],
        },
      ],
    };

    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    // 1. Check content types
    const contentTypes = files.get("[Content_Types].xml") as string;
    expect(contentTypes).toBeDefined();
    expect(contentTypes).toContain("chart1.xml");
    expect(contentTypes).toContain("drawingml.chart+xml");
    // Style/colors no longer generated (removed for PowerPoint Mac compat)
    expect(contentTypes).not.toContain("chartstyle+xml");
    expect(contentTypes).not.toContain("chartcolorstyle+xml");
    expect(contentTypes).toContain("xlsx");

    // 2. Check slide rels references chart
    const slideRels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    expect(slideRels).toBeDefined();
    expect(slideRels).toContain("chart1.xml");
    expect(slideRels).toContain("/officeDocument/2006/relationships/chart");

    // 3. Extract chart rId from slide rels
    const chartRelMatch = slideRels.match(/Id="(rId\d+)"[^>]*chart1\.xml/);
    expect(chartRelMatch).toBeTruthy();
    const chartRId = chartRelMatch![1];

    // 4. Check slide XML references the same rId
    const slideXml = files.get("ppt/slides/slide1.xml") as string;
    expect(slideXml).toBeDefined();
    expect(slideXml).toContain(`r:id="${chartRId}"`);
    expect(slideXml).toContain("graphicFrame");

    // 5. Check chart XML exists and has external data ref
    const chartXml = files.get("ppt/charts/chart1.xml") as string;
    expect(chartXml).toBeDefined();
    expect(chartXml).toContain("c:chartSpace");
    expect(chartXml).toContain("c:externalData");
    expect(chartXml).toContain('r:id="rId1"');

    // 6. Check chart rels has Excel reference
    const chartRels = files.get("ppt/charts/_rels/chart1.xml.rels") as string;
    expect(chartRels).toBeDefined();
    expect(chartRels).toContain("chart1.xlsx");
    expect(chartRels).toContain("rId1");
    // Style/colors companion files no longer generated (PowerPoint Mac compat fix)
    expect(chartRels).not.toContain("style1.xml");
    expect(chartRels).not.toContain("colors1.xml");

    // 7. Check Excel file exists and is valid ZIP
    const xlsxBuf = files.get("ppt/embeddings/chart1.xlsx") as Buffer;
    expect(xlsxBuf).toBeDefined();
    expect(xlsxBuf.length).toBeGreaterThan(0);
    // Verify it's a valid ZIP (starts with PK header)
    expect(xlsxBuf[0]).toBe(0x50); // 'P'
    expect(xlsxBuf[1]).toBe(0x4b); // 'K'

    // 8. Style and colors files should NOT exist (removed for PowerPoint Mac compat)
    expect(files.has("ppt/charts/style1.xml")).toBe(false);
    expect(files.has("ppt/charts/colors1.xml")).toBe(false);

    // 9. Check no duplicate rIds in slide rels
    const rIdMatches = slideRels.matchAll(/Id="(rId\d+)"/g);
    const rIds = [...rIdMatches].map(m => m[1]);
    const uniqueRIds = new Set(rIds);
    expect(rIds.length).toBe(uniqueRIds.size); // No duplicates
  });

  it("handles multiple charts on one slide", async () => {
    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Chart",
              style: { position: "absolute", top: 50, left: 50, width: 400, height: 250 },
              chartData: {
                chartType: "bar",
                categories: ["A", "B"],
                series: [{ name: "S1", values: [10, 20] }],
              },
            },
            {
              type: "Chart",
              style: { position: "absolute", top: 300, left: 50, width: 400, height: 250 },
              chartData: {
                chartType: "line",
                categories: ["X", "Y"],
                series: [{ name: "S2", values: [30, 40] }],
              },
            },
          ],
        },
      ],
    };

    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    // Both charts exist
    expect(files.has("ppt/charts/chart1.xml")).toBe(true);
    expect(files.has("ppt/charts/chart2.xml")).toBe(true);
    expect(files.has("ppt/embeddings/chart1.xlsx")).toBe(true);
    expect(files.has("ppt/embeddings/chart2.xlsx")).toBe(true);

    // Both charts referenced in slide rels
    const slideRels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    expect(slideRels).toContain("chart1.xml");
    expect(slideRels).toContain("chart2.xml");

    // No duplicate rIds
    const rIdMatches = slideRels.matchAll(/Id="(rId\d+)"/g);
    const rIds = [...rIdMatches].map(m => m[1]);
    expect(rIds.length).toBe(new Set(rIds).size);

    // Each chart has different rId
    const chart1Match = slideRels.match(/Id="(rId\d+)"[^>]*chart1\.xml/);
    const chart2Match = slideRels.match(/Id="(rId\d+)"[^>]*chart2\.xml/);
    expect(chart1Match![1]).not.toBe(chart2Match![1]);
  });

  it("handles chart + image on same slide", async () => {
    // Use 1x1 transparent PNG
    const px1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==";

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Image",
              style: { position: "absolute", top: 10, left: 10, width: 100, height: 100 },
              src: px1,
            },
            {
              type: "Chart",
              style: { position: "absolute", top: 120, left: 50, width: 400, height: 300 },
              chartData: {
                chartType: "pie",
                categories: ["A", "B", "C"],
                series: [{ name: "Sales", values: [30, 50, 20] }],
              },
            },
          ],
        },
      ],
    };

    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    const slideRels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    expect(slideRels).toBeDefined();

    // Image should be rId2 (first media), chart should be rId3
    expect(slideRels).toContain("image");
    expect(slideRels).toContain("chart1.xml");

    // No duplicate rIds
    const rIdMatches = slideRels.matchAll(/Id="(rId\d+)"/g);
    const rIds = [...rIdMatches].map(m => m[1]);
    expect(rIds.length).toBe(new Set(rIds).size);

    // The chart rId in rels must match the rId in slide XML
    const chartRelMatch = slideRels.match(/Id="(rId\d+)"[^>]*chart1\.xml/);
    const slideXml = files.get("ppt/slides/slide1.xml") as string;
    expect(slideXml).toContain(`r:id="${chartRelMatch![1]}"`);
  });
});

// ---------------------------------------------------------------------------
// Test 2: AgentDocument → compileAgentDocument → PaperEngine (demo path)
// ---------------------------------------------------------------------------

describe("Chart PPTX Integrity — AgentDocument Path (demo)", () => {
  it("generates valid PPTX from chart-focus AgentSlide", async () => {
    const agentDoc = {
      presentationTitle: "Revenue Report",
      slides: [
        {
          pattern: "chart-focus" as const,
          content: {
            title: "Quarterly Revenue",
            chart: {
              type: "bar" as const,
              series: [
                {
                  name: "2025",
                  dataPoints: [
                    { category: "Q1", value: 120 },
                    { category: "Q2", value: 180 },
                    { category: "Q3", value: 240 },
                    { category: "Q4", value: 310 },
                  ],
                },
              ],
            },
          },
        },
      ],
    };

    const doc = compileAgentDocument(agentDoc);
    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    // Chart should exist
    const contentTypes = files.get("[Content_Types].xml") as string;
    expect(contentTypes).toContain("chart1.xml");
    expect(contentTypes).toContain("xlsx");

    // Slide rels should reference chart
    const slideRels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    expect(slideRels).toContain("chart");

    // Chart XML should exist
    const chartXml = files.get("ppt/charts/chart1.xml") as string;
    expect(chartXml).toBeDefined();
    expect(chartXml).toContain("c:chartSpace");
    expect(chartXml).toContain("c:barChart");

    // Chart rels should reference Excel
    const chartRels = files.get("ppt/charts/_rels/chart1.xml.rels") as string;
    expect(chartRels).toContain("chart1.xlsx");

    // Excel should exist
    const xlsxBuf = files.get("ppt/embeddings/chart1.xlsx") as Buffer;
    expect(xlsxBuf).toBeDefined();
    expect(xlsxBuf.length).toBeGreaterThan(0);

    // No duplicate rIds in slide rels
    const rIdMatches = slideRels.matchAll(/Id="(rId\d+)"/g);
    const rIds = [...rIdMatches].map(m => m[1]);
    expect(rIds.length).toBe(new Set(rIds).size);
  });

  it("generates valid multi-slide deck with mix of chart and non-chart slides", async () => {
    const agentDoc = {
      presentationTitle: "Full Deck",
      slides: [
        {
          pattern: "title" as const,
          content: { title: "Revenue Report 2025" },
        },
        {
          pattern: "chart-focus" as const,
          content: {
            title: "Revenue by Quarter",
            chart: {
              type: "bar" as const,
              series: [
                {
                  name: "Revenue",
                  dataPoints: [
                    { category: "Q1", value: 100 },
                    { category: "Q2", value: 200 },
                  ],
                },
              ],
            },
          },
        },
        {
          pattern: "bullets" as const,
          content: {
            title: "Summary",
            bulletPoints: ["Growth is strong", "Q2 doubled Q1"],
          },
        },
        {
          pattern: "chart-focus" as const,
          content: {
            title: "Profit Margin",
            chart: {
              type: "line" as const,
              series: [
                {
                  name: "Margin",
                  dataPoints: [
                    { category: "Q1", value: 15 },
                    { category: "Q2", value: 22 },
                  ],
                },
              ],
            },
          },
        },
      ],
    };

    const doc = compileAgentDocument(agentDoc);
    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    // Both charts should exist
    expect(files.has("ppt/charts/chart1.xml")).toBe(true);
    expect(files.has("ppt/charts/chart2.xml")).toBe(true);
    expect(files.has("ppt/embeddings/chart1.xlsx")).toBe(true);
    expect(files.has("ppt/embeddings/chart2.xlsx")).toBe(true);

    // Content types should list both
    const contentTypes = files.get("[Content_Types].xml") as string;
    expect(contentTypes).toContain("chart1.xml");
    expect(contentTypes).toContain("chart2.xml");

    // Slide 2 rels should have chart1
    const slide2Rels = files.get("ppt/slides/_rels/slide2.xml.rels") as string;
    expect(slide2Rels).toContain("chart1.xml");

    // Slide 4 rels should have chart2
    const slide4Rels = files.get("ppt/slides/_rels/slide4.xml.rels") as string;
    expect(slide4Rels).toContain("chart2.xml");

    // Non-chart slides should NOT reference charts
    const slide1Rels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    expect(slide1Rels).not.toContain("chart");
    const slide3Rels = files.get("ppt/slides/_rels/slide3.xml.rels") as string;
    expect(slide3Rels).not.toContain("chart");

    // Verify no duplicate rIds within each slide
    for (let i = 1; i <= 4; i++) {
      const rels = files.get(`ppt/slides/_rels/slide${i}.xml.rels`) as string;
      const rIdMatches = rels.matchAll(/Id="(rId\d+)"/g);
      const rIds = [...rIdMatches].map(m => m[1]);
      expect(rIds.length).toBe(new Set(rIds).size);
    }

    // Verify chart rId consistency (XML references match rels)
    for (const [slideNum, chartNum] of [[2, 1], [4, 2]] as [number, number][]) {
      const rels = files.get(`ppt/slides/_rels/slide${slideNum}.xml.rels`) as string;
      const chartMatch = rels.match(new RegExp(`Id="(rId\\d+)"[^>]*chart${chartNum}\\.xml`));
      expect(chartMatch).toBeTruthy();
      const slideXml = files.get(`ppt/slides/slide${slideNum}.xml`) as string;
      expect(slideXml).toContain(`r:id="${chartMatch![1]}"`);
    }
  });

  it("chart-focus with KPI sidebar generates valid PPTX", async () => {
    const agentDoc = {
      presentationTitle: "KPI + Chart",
      slides: [
        {
          pattern: "chart-focus" as const,
          content: {
            title: "Revenue with KPIs",
            chart: {
              type: "bar" as const,
              series: [
                {
                  name: "2025",
                  dataPoints: [
                    { category: "Q1", value: 120 },
                    { category: "Q2", value: 180 },
                  ],
                },
              ],
            },
            kpis: [
              { label: "Total Revenue", value: "$4.2M" },
              { label: "Growth", value: "+12%" },
            ],
          },
        },
      ],
    };

    const doc = compileAgentDocument(agentDoc);
    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    // Chart should exist and be valid
    const chartXml = files.get("ppt/charts/chart1.xml") as string;
    expect(chartXml).toBeDefined();
    expect(chartXml).toContain("c:barChart");

    // No duplicate rIds
    const slideRels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    const rIdMatches = slideRels.matchAll(/Id="(rId\d+)"/g);
    const rIds = [...rIdMatches].map(m => m[1]);
    expect(rIds.length).toBe(new Set(rIds).size);
  });
});

// ---------------------------------------------------------------------------
// Test 3: rId collision edge cases
// ---------------------------------------------------------------------------

describe("Chart rId collision detection", () => {
  it("no rId collision when chart + SVG on same slide", async () => {
    // Create an image with svgSrc to trigger SVG rId assignment
    const svgData = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>').toString("base64")}`;
    const pngData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==";

    const doc: PaperDocument = {
      type: "Document",
      meta: {},
      slides: [
        {
          type: "Slide",
          children: [
            {
              type: "Image",
              style: { position: "absolute", top: 10, left: 10, width: 100, height: 100 },
              src: pngData,
              svgSrc: svgData,
            },
            {
              type: "Chart",
              style: { position: "absolute", top: 120, left: 50, width: 400, height: 300 },
              chartData: {
                chartType: "bar",
                categories: ["A", "B"],
                series: [{ name: "S1", values: [10, 20] }],
              },
            },
          ],
        },
      ],
    };

    const buf = await PaperEngine.render(doc);
    const files = await unzipPptx(buf);

    // All files should exist
    const slideRels = files.get("ppt/slides/_rels/slide1.xml.rels") as string;
    expect(slideRels).toBeDefined();

    // CRITICAL: No duplicate rIds
    const rIdMatches = slideRels.matchAll(/Id="(rId\d+)"/g);
    const rIds = [...rIdMatches].map(m => m[1]);
    const uniqueRIds = new Set(rIds);
    // Debug: show what's colliding
    if (rIds.length !== uniqueRIds.size) {
      console.log("SLIDE RELS (SVG+Chart collision):\n", slideRels);
    }
    expect(rIds.length).toBe(uniqueRIds.size);

    // Chart should be properly referenced
    expect(slideRels).toContain("chart1.xml");

    // SVG should be referenced
    expect(slideRels).toContain(".svg");

    // The chart rId in the XML must match the rels
    const chartRelMatch = slideRels.match(/Id="(rId\d+)"[^>]*chart1\.xml/);
    const slideXml = files.get("ppt/slides/slide1.xml") as string;
    expect(slideXml).toContain(`r:id="${chartRelMatch![1]}"`);
  });
});
