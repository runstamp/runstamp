/**
 * Edge case tests for chart rendering.
 */
import { describe, it, expect } from "vitest";
import { PaperEngine } from "../../../src/engine.js";
import { makeDoc } from "../helpers/templateHelpers.js";
import {
  assertValidPptx, assertNoCorruption, assertChartExists, assertChartSeriesCount,
} from "../helpers/verificationUtils.js";
import type { PaperSlide, PaperChart } from "../../../src/types/ast.js";

function chartSlide(chartData: any): PaperSlide {
  return {
    type: "Slide",
    children: [{
      type: "Chart",
      style: { position: "absolute", top: 40, left: 40, width: 880, height: 450 },
      chartData,
    } as PaperChart],
  };
}

describe("Chart Edge Cases", () => {
  // T-CHART-01: Chart with 1 data point
  it("T-CHART-01: chart with 1 data point renders", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "bar",
      categories: ["Solo"],
      series: [{ name: "S1", values: [42] }],
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertChartExists(buffer, 0, "bar");
  });

  // T-CHART-02: Chart with 50+ data points
  it("T-CHART-02: chart with 50+ data points renders", async () => {
    const categories = Array.from({ length: 52 }, (_, i) => `W${i + 1}`);
    const values = Array.from({ length: 52 }, (_, i) => Math.sin(i / 5) * 100);
    const doc = makeDoc([chartSlide({
      chartType: "line",
      categories,
      series: [{ name: "Weekly", values }],
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-CHART-03: Chart with 10 series
  it("T-CHART-03: chart with 10 series renders", async () => {
    const series = Array.from({ length: 10 }, (_, i) => ({
      name: `Series ${i + 1}`,
      values: [10 + i, 20 + i, 30 + i],
    }));
    const doc = makeDoc([chartSlide({
      chartType: "bar",
      categories: ["Q1", "Q2", "Q3"],
      series,
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertChartSeriesCount(buffer, 0, 10);
  });

  // T-CHART-04: All negative values bar chart
  it("T-CHART-04: all negative values bar chart renders", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "bar",
      categories: ["A", "B", "C", "D"],
      series: [{ name: "Loss", values: [-50, -120, -30, -80] }],
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-CHART-05: Values in billions
  it("T-CHART-05: billion-scale values render", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "bar",
      categories: ["AAPL", "MSFT", "GOOG"],
      series: [{ name: "Market Cap", values: [2.8e9, 2.5e9, 1.7e9] }],
      valueAxis: { numberFormat: "$#,##0,,\"B\"" },
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-CHART-06: Waterfall with mixed positive/negative
  it("T-CHART-06: waterfall with mixed positive/negative renders", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "waterfall",
      waterfallData: {
        categories: ["Start", "Growth", "Loss", "Recovery", "End"],
        values: [1000, 500, -300, 200, 0],
        totalIndices: [0, 4],
        increaseColor: "#00B050",
        decreaseColor: "#C00000",
        totalColor: "#003DA5",
        connectorLines: true,
      },
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });

  // T-CHART-07: Combo chart with dual axis
  it("T-CHART-07: combo chart with dual axis renders", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "bar",
      categories: ["Jan", "Feb", "Mar", "Apr"],
      series: [
        { name: "Revenue", values: [100, 120, 90, 150], targetAxis: "primary" },
        { name: "Margin %", values: [22, 25, 18, 28], overrideType: "line", targetAxis: "secondary" },
      ],
      secondaryValueAxis: { title: "Margin %", numberFormat: "0%" },
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertChartExists(buffer, 0, "combo");
  });

  // T-CHART-08: Pie chart with 15 slices
  it("T-CHART-08: pie chart with 15 slices renders", async () => {
    const categories = Array.from({ length: 15 }, (_, i) => `Segment ${i + 1}`);
    const values = Array.from({ length: 15 }, (_, i) => 10 + i * 3);
    const doc = makeDoc([chartSlide({
      chartType: "pie",
      categories,
      series: [{ name: "Share", values }],
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertChartExists(buffer, 0, "pie");
  });

  // T-CHART-09: Doughnut chart with holeSize 70
  it("T-CHART-09: doughnut chart with holeSize 70 renders", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "doughnut",
      holeSize: 70,
      categories: ["Complete", "Remaining"],
      series: [{ name: "Progress", values: [72, 28] }],
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
    await assertChartExists(buffer, 0, "doughnut");
  });

  // T-CHART-10: Chart with all zero values
  it("T-CHART-10: chart with all zero values renders", async () => {
    const doc = makeDoc([chartSlide({
      chartType: "bar",
      categories: ["A", "B", "C"],
      series: [{ name: "Zeros", values: [0, 0, 0] }],
    })]);
    const buffer = await PaperEngine.render(doc);
    await assertValidPptx(buffer);
  });
});
