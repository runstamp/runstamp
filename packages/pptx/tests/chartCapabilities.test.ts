import { describe, expect, it } from "vitest";

import {
  getChartCapabilityProfile,
  getChartExcelLayout,
  isChartExType,
  isPieLikeChartType,
  isXYChartType,
  supportsPerSeriesMarker,
  usesClassicAxes,
  usesSyntheticSpacerSeries,
  usesValueAxesOnly,
} from "../src/ooxml/chart/chartCapabilities.js";

describe("chart capability map", () => {
  it("classifies ChartEx charts centrally", () => {
    expect(isChartExType("treemap")).toBe(true);
    expect(isChartExType("sunburst")).toBe(true);
    expect(isChartExType("histogram")).toBe(true);
    expect(isChartExType("boxWhisker")).toBe(true);
    expect(isChartExType("bar")).toBe(false);
  });

  it("captures Excel layout families for specialized charts", () => {
    expect(getChartExcelLayout("scatter")).toBe("xy");
    expect(getChartExcelLayout("bubble")).toBe("xy");
    expect(getChartExcelLayout("waterfall")).toBe("waterfall");
    expect(getChartExcelLayout("stock")).toBe("stock");
    expect(getChartExcelLayout("funnel")).toBe("funnel");
    expect(getChartExcelLayout("treemap")).toBe("hierarchy");
    expect(getChartExcelLayout("histogram")).toBe("histogram");
    expect(getChartExcelLayout("boxWhisker")).toBe("boxWhisker");
  });

  it("captures renderer and OOXML behavior flags", () => {
    expect(isPieLikeChartType("pie")).toBe(true);
    expect(isPieLikeChartType("doughnut")).toBe(true);
    expect(isPieLikeChartType("bar")).toBe(false);

    expect(isXYChartType("scatter")).toBe(true);
    expect(isXYChartType("bubble")).toBe(true);
    expect(isXYChartType("line")).toBe(false);

    expect(usesClassicAxes("bar")).toBe(true);
    expect(usesClassicAxes("waterfall")).toBe(true);
    expect(usesClassicAxes("pie")).toBe(false);

    expect(usesValueAxesOnly("scatter")).toBe(true);
    expect(usesValueAxesOnly("bubble")).toBe(true);
    expect(usesValueAxesOnly("bar")).toBe(false);

    expect(supportsPerSeriesMarker("line")).toBe(true);
    expect(supportsPerSeriesMarker("radar")).toBe(true);
    expect(supportsPerSeriesMarker("bar")).toBe(false);

    expect(usesSyntheticSpacerSeries("waterfall")).toBe(true);
    expect(usesSyntheticSpacerSeries("funnel")).toBe(true);
    expect(usesSyntheticSpacerSeries("stock")).toBe(false);
  });

  it("exposes a stable profile for downstream callers", () => {
    expect(getChartCapabilityProfile("treemap")).toEqual({
      chartType: "treemap",
      family: "chartex",
      excelLayout: "hierarchy",
      usesClassicAxes: false,
      usesValueAxesOnly: false,
      isPieLike: false,
      supportsPerSeriesMarker: false,
      usesSyntheticSpacerSeries: false,
    });
  });
});
