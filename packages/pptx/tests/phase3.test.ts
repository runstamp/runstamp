// Phase 3 smoke tests: Chart animations, secondary cat axis, chart annotations
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../src/engine.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import { getZipEntry } from "./helpers/xmlTestUtils.js";
import JSZip from "jszip";

setDeterministicMode(true);

describe("Phase 3 — Chart Enhancements", () => {
  describe("3A: Chart Animations", () => {
    it("chart with bySeries animation emits a valid timing tree without build-list corruption", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["Q1", "Q2", "Q3"],
              series: [
                { name: "Revenue", values: [100, 200, 300] },
                { name: "Profit", values: [50, 80, 120] },
              ],
            },
            chartAnimation: {
              buildType: "bySeries" as const,
              trigger: "onClick" as const,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      // Should have timing tree
      expect(slideXml).toContain("<p:timing>");
      expect(slideXml).toContain("clickEffect");
      expect(slideXml).not.toContain("<p:bldGraphic");
    });

    it("chart with byCategory animation still emits timing metadata", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "line" as const,
              categories: ["Jan", "Feb", "Mar"],
              series: [{ name: "Sales", values: [10, 20, 30] }],
            },
            chartAnimation: {
              buildType: "byCategory" as const,
              trigger: "afterPrevious" as const,
              duration: 750,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:timing>");
      expect(slideXml).toContain("afterEffect");
      expect(slideXml).not.toContain("<p:bldGraphic");
    });

    it("chart with byElement animation still emits timing metadata", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["A", "B"],
              series: [{ name: "S1", values: [10, 20] }],
            },
            chartAnimation: {
              buildType: "byElement" as const,
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const slideXml = await getZipEntry(buf, "ppt/slides/slide1.xml");

      expect(slideXml).toContain("<p:timing>");
      expect(slideXml).not.toContain("<p:bldGraphic");
    });
  });

  describe("3B: Secondary Category Axis", () => {
    it("combo chart emits secondary catAx and valAx", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["Q1", "Q2", "Q3"],
              series: [
                { name: "Revenue", values: [100, 200, 300] },
                { name: "Growth %", values: [5, 10, 15], overrideType: "line" as const, targetAxis: "secondary" as const },
              ],
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const chartXml = await getZipEntry(buf, "ppt/charts/chart1.xml");

      // Primary axes
      expect(chartXml).toContain("<c:catAx>");
      expect(chartXml).toContain("<c:valAx>");

      // Secondary category axis (axId 666666666)
      expect(chartXml).toContain('val="666666666"');

      // Secondary value axis (axId 555555555)
      expect(chartXml).toContain('val="555555555"');

      // Secondary value axis on right
      expect(chartXml).toContain('<c:axPos val="r"/>');

      // Both bar and line chart types
      expect(chartXml).toContain("<c:barChart>");
      expect(chartXml).toContain("<c:lineChart>");
    });

    it("secondary category axis uses custom config when provided", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["A", "B"],
              series: [
                { name: "S1", values: [10, 20] },
                { name: "S2", values: [5, 15], overrideType: "line" as const, targetAxis: "secondary" as const },
              ],
              secondaryCategoryAxis: {
                visible: true,
                title: "Secondary Categories",
              },
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const chartXml = await getZipEntry(buf, "ppt/charts/chart1.xml");

      // Should have secondary category axis with title
      expect(chartXml).toContain("Secondary Categories");
      // Should not be deleted since visible=true
      const catAxMatches = chartXml.match(/<c:catAx>/g);
      expect(catAxMatches?.length).toBe(2); // primary + secondary
    });
  });

  describe("3C: Chart Annotations", () => {
    it("chart with annotations generates drawing XML and userShapes ref", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["Q1", "Q2", "Q3"],
              series: [{ name: "Revenue", values: [100, 200, 300] }],
              annotations: [
                {
                  text: "Target: 250",
                  x: 60,
                  y: 30,
                  width: 25,
                  height: 10,
                  fontColor: "#FF0000",
                  bold: true,
                  fill: "#FFFFFF",
                  borderColor: "#000000",
                },
              ],
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const zip = await JSZip.loadAsync(buf);

      // Chart XML should reference userShapes
      const chartXml = await getZipEntry(buf, "ppt/charts/chart1.xml");
      expect(chartXml).toContain("<c:userShapes");
      expect(chartXml).toContain('r:id="rId2"');

      // Chart rels should have drawing relationship
      const chartRels = await getZipEntry(buf, "ppt/charts/_rels/chart1.xml.rels");
      expect(chartRels).toContain("chartUserShapes");
      expect(chartRels).toContain("drawing1.xml");

      // Drawing file should exist
      const drawingXml = await getZipEntry(buf, "ppt/drawings/drawing1.xml");
      expect(drawingXml).toContain("<c:userShapes");
      expect(drawingXml).toContain("cdr:relSizeAnchor");
      expect(drawingXml).toContain("Target: 250");
      expect(drawingXml).toContain("FF0000");
      expect(drawingXml).toContain('b="1"');
      expect(drawingXml).toContain("FFFFFF");

      // Content types should have drawing
      const ct = await getZipEntry(buf, "[Content_Types].xml");
      expect(ct).toContain("drawing1.xml");
      expect(ct).toContain("chartshapes+xml");
    });

    it("annotation with callout shape type", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "line" as const,
              categories: ["A", "B", "C"],
              series: [{ name: "S1", values: [10, 20, 15] }],
              annotations: [
                {
                  text: "Peak!",
                  x: 45,
                  y: 10,
                  shapeType: "wedgeRectCallout",
                  fontSize: 12,
                },
              ],
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const drawingXml = await getZipEntry(buf, "ppt/drawings/drawing1.xml");

      expect(drawingXml).toContain('prst="wedgeRectCallout"');
      expect(drawingXml).toContain("Peak!");
      expect(drawingXml).toContain('sz="900"'); // 12 * 75
    });

    it("multiple annotations on single chart", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["X", "Y"],
              series: [{ name: "S1", values: [10, 20] }],
              annotations: [
                { text: "Note 1", x: 10, y: 10 },
                { text: "Note 2", x: 50, y: 50 },
                { text: "Note 3", x: 80, y: 80, fill: "#FFFF00" },
              ],
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const drawingXml = await getZipEntry(buf, "ppt/drawings/drawing1.xml");

      expect(drawingXml).toContain("Note 1");
      expect(drawingXml).toContain("Note 2");
      expect(drawingXml).toContain("Note 3");
      expect(drawingXml).toContain("FFFF00");

      // Should have 3 relSizeAnchor elements
      const anchors = drawingXml.match(/cdr:relSizeAnchor/g);
      expect(anchors?.length).toBe(6); // 3 opening + 3 closing
    });

    it("chart without annotations has no userShapes or drawing", async () => {
      const doc = {
        type: "Document" as const,
        meta: {},
        slides: [{
          type: "Slide" as const,
          children: [{
            type: "Chart" as const,
            chartData: {
              chartType: "bar" as const,
              categories: ["A", "B"],
              series: [{ name: "S1", values: [10, 20] }],
            },
            style: { width: 400, height: 300 },
          }],
        }],
      };

      const buf = await PaperEngine.render(doc as any);
      const zip = await JSZip.loadAsync(buf);
      const chartXml = await getZipEntry(buf, "ppt/charts/chart1.xml");

      expect(chartXml).not.toContain("userShapes");
      expect(zip.file("ppt/drawings/drawing1.xml")).toBeNull();
    });
  });
});
