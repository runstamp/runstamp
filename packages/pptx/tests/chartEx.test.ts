// Quick smoke test for ChartEx modern chart types
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { getZipEntry } from "./helpers/xmlTestUtils.js";
import JSZip from "jszip";

setDeterministicMode(true);

describe("ChartEx — Modern Chart Types", () => {
  it("treemap chart generates valid ChartEx XML and OPC structure", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Chart" as const,
          chartData: {
            chartType: "treemap" as const,
            treemapData: {
              categories: [
                { name: "Tech", children: [
                  { name: "Software", value: 100, color: "#4472C4" },
                  { name: "Hardware", value: 80 }
                ]},
                { name: "Finance", children: [
                  { name: "Banking", value: 60 },
                  { name: "Insurance", value: 40 }
                ]}
              ]
            }
          },
          style: { width: 400, height: 300 }
        }]
      }]
    };

    const buf = await PaperEngine.render(doc as any);
    expect(buf.length).toBeGreaterThan(0);

    // ChartEx file exists
    const chartExXml = await getZipEntry(buf, "ppt/charts/chartEx1.xml");
    expect(chartExXml).toContain("cx:chartSpace");
    expect(chartExXml).toContain('layoutId="treemap"');
    expect(chartExXml).toContain("Software");
    expect(chartExXml).toContain("Hardware");
    expect(chartExXml).toContain("Banking");
    expect(chartExXml).toContain('<cx:dataId val="0"/>');
    expect(chartExXml).toContain('<cx:lvl ptCount="4">');

    // ChartEx rels
    const chartExRels = await getZipEntry(buf, "ppt/charts/_rels/chartEx1.xml.rels");
    expect(chartExRels).toContain("chartEx1.xlsx");

    // Excel embedding
    const zip = await JSZip.loadAsync(buf);
    const excelExists = zip.file("ppt/embeddings/chartEx1.xlsx");
    expect(excelExists).not.toBeNull();

    // Content types include ChartEx
    const ct = await getZipEntry(buf, "[Content_Types].xml");
    expect(ct).toContain("chartEx1.xml");
    expect(ct).toContain("application/vnd.ms-office.chartex+xml");

    // Slide rels reference ChartEx
    const slideRels = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    expect(slideRels).toContain("chartEx");
    expect(slideRels).toContain("2014/relationships/chartEx");

    // Slide XML uses ChartEx graphicFrame URI
    const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");
    expect(slideXml).toContain("2014/chartex");

    // No classic chart files
    expect(zip.file("ppt/charts/chart1.xml")).toBeNull();
  });

  it("sunburst chart generates valid ChartEx XML", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Chart" as const,
          chartData: {
            chartType: "sunburst" as const,
            sunburstData: {
              categories: [
                { name: "Americas", children: [
                  { name: "US", value: 200 },
                  { name: "Canada", value: 100 }
                ]},
                { name: "EMEA", children: [
                  { name: "UK", value: 80 },
                  { name: "Germany", value: 60 }
                ]}
              ]
            }
          },
          style: { width: 400, height: 300 }
        }]
      }]
    };

    const buf = await PaperEngine.render(doc as any);
    const chartExXml = await getZipEntry(buf, "ppt/charts/chartEx1.xml");
    expect(chartExXml).toContain('layoutId="sunburst"');
    expect(chartExXml).toContain("Americas");
    expect(chartExXml).toContain("US");
  });

  it("histogram chart generates valid ChartEx XML", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Chart" as const,
          chartData: {
            chartType: "histogram" as const,
            histogramData: {
              values: [10, 20, 30, 15, 25, 35, 40, 22, 28, 33],
              binCount: 5,
              color: "#ED7D31"
            }
          },
          style: { width: 400, height: 300 }
        }]
      }]
    };

    const buf = await PaperEngine.render(doc as any);
    const chartExXml = await getZipEntry(buf, "ppt/charts/chartEx1.xml");
    expect(chartExXml).toContain('layoutId="clusteredColumn"');
    expect(chartExXml).toContain("ED7D31");
    expect(chartExXml).toContain('<cx:dataId val="0"/>');
  });

  it("boxWhisker chart generates valid ChartEx XML", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [{
          type: "Chart" as const,
          chartData: {
            chartType: "boxWhisker" as const,
            boxWhiskerData: {
              categories: ["Q1", "Q2", "Q3"],
              series: [
                { name: "Revenue", values: [10, 20, 30, 15, 25, 35], color: "#4472C4" },
                { name: "Cost", values: [5, 15, 25, 10, 20, 30], color: "#ED7D31" }
              ],
              quartileMethod: "exclusive",
              showOutliers: true,
              showMeanMarker: true
            }
          },
          style: { width: 400, height: 300 }
        }]
      }]
    };

    const buf = await PaperEngine.render(doc as any);
    const chartExXml = await getZipEntry(buf, "ppt/charts/chartEx1.xml");
    expect(chartExXml).toContain('layoutId="boxWhisker"');
    expect(chartExXml).toContain("Revenue");
    expect(chartExXml).toContain("Cost");
  });

  it("mixed classic + ChartEx charts on same slide use separate counters", async () => {
    const doc = {
      type: "Document" as const,
      meta: {},
      slides: [{
        type: "Slide" as const,
        children: [
          {
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["A", "B"],
              series: [{ name: "S1", values: [10, 20] }]
            },
            style: { width: 300, height: 200 }
          },
          {
            type: "Chart" as const,
            chartData: {
              chartType: "treemap" as const,
              treemapData: {
                categories: [
                  { name: "X", value: 100 },
                  { name: "Y", value: 200 }
                ]
              }
            },
            style: { width: 300, height: 200 }
          }
        ]
      }]
    };

    const buf = await PaperEngine.render(doc as any);
    const zip = await JSZip.loadAsync(buf);

    // Classic chart exists
    const chart1 = await getZipEntry(buf, "ppt/charts/chart1.xml");
    expect(chart1).toContain("c:barChart");

    // ChartEx exists
    const chartEx1 = await getZipEntry(buf, "ppt/charts/chartEx1.xml");
    expect(chartEx1).toContain("cx:chartSpace");

    // Both Excel files exist
    expect(zip.file("ppt/embeddings/chart1.xlsx")).not.toBeNull();
    expect(zip.file("ppt/embeddings/chartEx1.xlsx")).not.toBeNull();

    // Content types have both
    const ct = await getZipEntry(buf, "[Content_Types].xml");
    expect(ct).toContain("chart1.xml");
    expect(ct).toContain("chartEx1.xml");
    expect(ct).toContain("drawingml.chart+xml");
    expect(ct).toContain("chartex+xml");

    // Slide rels have both types
    const slideRels = await getZipEntry(buf, "ppt/slides/_rels/slide1.xml.rels");
    expect(slideRels).toContain("relationships/chart");
    expect(slideRels).toContain("relationships/chartEx");
  });
});
