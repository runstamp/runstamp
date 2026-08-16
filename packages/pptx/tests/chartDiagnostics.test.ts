import { describe, expect, it } from "vitest";
import {
  collectAbsoluteDocumentLayoutDebug,
  validateAbsoluteDocumentLayout,
} from "../src/layout/absoluteSafety.js";
import { collectChartFitDiagnostics } from "../src/layout/chartDiagnostics.js";
import { computeClassicChartLayout } from "../src/ooxml/chart/chartLayout.js";
import { resolveChartAnnotations } from "../src/ooxml/chart/resolveAnnotations.js";
import type { PaperChart, PaperDocument } from "../src/types/ast.js";

function chart(overrides: Partial<PaperChart["chartData"]> = {}, style: PaperChart["style"] = {}): PaperChart {
  return {
    type: "Chart",
    style: {
      position: "absolute",
      left: 80,
      top: 90,
      width: 680,
      height: 300,
      ...style,
    },
    chartData: {
      chartType: "bar",
      barDirection: "col",
      categories: ["Q1", "Q2", "Q3", "Q4"],
      series: [
        { name: "Plan", values: [12, 18, 22, 27] },
        { name: "Actual", values: [10, 20, 25, 31] },
      ],
      legend: { position: "bottom" },
      title: { text: "Native chart" },
      valueAxis: { min: 0, max: 40 },
      ...overrides,
    },
  };
}

describe("chart layout diagnostics", () => {
  it("exposes plot, legend, title, and annotation boxes", () => {
    const node = chart({
      annotations: [
        {
          kind: "trendArrow",
          from: { categoryIndex: 0, seriesIndex: 1 },
          to: { categoryIndex: 3, seriesIndex: 1 },
          label: "+21 pts",
        },
      ],
    });

    const diagnostics = collectChartFitDiagnostics(node);

    expect(diagnostics?.plotArea).toBeDefined();
    expect(diagnostics?.legendBox).toBeDefined();
    expect(diagnostics?.titleBox).toBeDefined();
    expect(diagnostics?.annotationBoxes).toHaveLength(1);
    expect(diagnostics?.issues).toHaveLength(0);
  });

  it("places chart annotation labels with clearance from the chart marks", () => {
    const frame = { left: 70, top: 104, width: 820, height: 340 };
    const node = chart({
      categories: ["Baseline", "Pilot", "Scale", "Operate", "Renew"],
      series: [
        { name: "Plan", values: [18, 23, 29, 34, 38] },
        { name: "Actual", values: [16, 25, 32, 39, 44] },
      ],
      annotations: [
        {
          kind: "trendArrow",
          from: { categoryIndex: 0, seriesIndex: 1 },
          to: { categoryIndex: 4, seriesIndex: 1 },
          label: "+28 pts",
          labelFontSize: 10,
        },
        {
          kind: "targetLine",
          value: 35,
          label: "GA bar",
          labelFontSize: 9,
        },
      ],
      valueAxis: { min: 0, max: 50 },
    }, frame);

    const resolved = resolveChartAnnotations(node.chartData, {
      x: node.style.left!,
      y: node.style.top!,
      width: node.style.width!,
      height: node.style.height!,
    });

    expect(resolved.labels).toHaveLength(2);
    const trendLabel = resolved.labels.find((label) => label.content === "+28 pts")!;
    const targetLabel = resolved.labels.find((label) => label.content === "GA bar")!;
    const trendLineMidY = (resolved.connectors[0].start.y + resolved.connectors[0].end.y) / 2;
    expect(trendLabel.style!.top! + trendLabel.style!.height!).toBeLessThanOrEqual(trendLineMidY - 10);
    expect(targetLabel.style!.top! + targetLabel.style!.height!).toBeLessThanOrEqual(resolved.connectors[1].start.y - 8);
    const layout = computeClassicChartLayout(node.chartData, { width: frame.width, height: frame.height })!;
    const finalBarTop = frame.top + layout.plotAreaPx.top + ((50 - 44) / 50) * layout.plotAreaPx.height;
    expect(targetLabel.style!.top! + targetLabel.style!.height!).toBeLessThanOrEqual(finalBarTop - 8);
    expect(targetLabel.style!.left! + targetLabel.style!.width!).toBeLessThanOrEqual(resolved.connectors[1].end.x - 8);
  });

  it("reports dense chart label collision risk with visual issue rects", () => {
    const categories = Array.from({ length: 18 }, (_, index) => `Very long market segment ${index + 1}`);
    const doc: PaperDocument = {
      type: "Document",
      slideSize: { width: 960, height: 540 },
      slides: [{
        type: "Slide",
        children: [
          chart({
            categories,
            series: [{ name: "Value", values: categories.map((_, index) => index + 1) }],
            dataLabels: { showVal: true, position: "outEnd", fontSize: 11 },
            legend: { position: "none" },
          }, { width: 420, height: 220 }),
        ],
      }],
    };

    const issues = validateAbsoluteDocumentLayout(doc);
    const debug = collectAbsoluteDocumentLayoutDebug(doc);

    expect(issues.some((issue) => issue.code === "CHART_LABEL_COLLISION")).toBe(true);
    expect(debug[0].nodes[0].chartFit?.labelCollisionRisk).toBe(true);
    expect(debug[0].issues.find((issue) => issue.code === "CHART_LABEL_COLLISION")?.rect).toBeDefined();
  });
});
