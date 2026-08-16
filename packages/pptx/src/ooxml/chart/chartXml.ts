// src/ooxml/chart/chartXml.ts — Full chart XML emitter

import type { ChartData } from "../../types/ast.js";
import type { ChartFrameSize } from "./chartLayout.js";
import {
  generateCategoryAxis,
  generateSecondaryCategoryAxis,
  generateSecondaryValueAxis,
  generateValueAxis,
  generateXValueAxis,
  generateYValueAxis,
} from "./chartXmlAxes.js";
import {
  generateBubbleChart,
  generateScatterChart,
} from "./chartXmlXY.js";
import {
  generateAreaChart,
  generateBarChart,
  generateComboChart,
  generateDataTableXml,
  generateDoughnutChart,
  generateLineChart,
  generatePieChart,
  generateRadarChart,
} from "./chartXmlClassic.js";
import {
  generateAreaSpPr,
  generateLegend,
  generatePlotAreaLayout,
  generateTitle,
} from "./chartXmlDecor.js";
import {
  generateFunnelChart,
  generateStockChart,
  generateWaterfallChart,
} from "./chartXmlSpecial.js";

/**
 * Generates complete <c:chartSpace> XML for a chart.
 */
export function generateChartXml(
  chartData: ChartData,
  excelRId: string,
  frame?: ChartFrameSize,
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`;
  xml += `  <c:date1904 val="0"/>\n`;
  xml += `  <c:lang val="en-US"/>\n`;
  xml += `  <c:roundedCorners val="0"/>\n`;
  xml += `  <c:chart>\n`;

  // Title
  if (chartData.title?.text) {
    xml += generateTitle(chartData);
  } else {
    xml += `    <c:autoTitleDeleted val="1"/>\n`;
  }

  xml += `    <c:plotArea>\n`;
  xml += generatePlotAreaLayout(chartData, frame);

  // Combo chart detection
  const isCombo =
    chartData.series?.some((s) => s.overrideType !== undefined) ?? false;

  // Chart type dispatch
  if (isCombo) {
    xml += generateComboChart(chartData);
  } else {
    switch (chartData.chartType) {
      case "bar":
        xml += generateBarChart(chartData);
        break;
      case "line":
        xml += generateLineChart(chartData);
        break;
      case "pie":
        xml += generatePieChart(chartData);
        break;
      case "area":
        xml += generateAreaChart(chartData);
        break;
      case "doughnut":
        xml += generateDoughnutChart(chartData);
        break;
      case "scatter":
        xml += generateScatterChart(chartData);
        break;
      case "bubble":
        xml += generateBubbleChart(chartData);
        break;
      case "radar":
        xml += generateRadarChart(chartData);
        break;
      case "waterfall":
        xml += generateWaterfallChart(chartData);
        break;
      case "stock":
        xml += generateStockChart(chartData);
        break;
      case "funnel":
        xml += generateFunnelChart(chartData);
        break;
    }
  }

  // Axes (ECMA-376 CT_PlotArea: chartType → axes → dTable → spPr)
  if (chartData.chartType === "scatter" || chartData.chartType === "bubble") {
    xml += generateXValueAxis(chartData);
    xml += generateYValueAxis(chartData);
  } else if (
    chartData.chartType !== "pie" &&
    chartData.chartType !== "doughnut"
  ) {
    const barDir =
      chartData.chartType === "funnel"
        ? "bar"
        : chartData.chartType === "waterfall" || chartData.chartType === "stock"
          ? "col"
          : chartData.barDirection;
    xml += generateCategoryAxis(chartData, barDir);
    xml += generateValueAxis(chartData, barDir);
    // Secondary axis for combo charts
    const hasSecondaryAxis =
      isCombo && chartData.series?.some((s) => s.targetAxis === "secondary");
    if (hasSecondaryAxis) {
      xml += generateSecondaryCategoryAxis(chartData, barDir);
      xml += generateSecondaryValueAxis(chartData);
    }
  }

  // Data table (ECMA-376: after axes)
  if (chartData.dataTable) {
    xml += generateDataTableXml(chartData.dataTable);
  }

  xml += `      ${generateAreaSpPr(chartData.plotArea)}\n`;
  xml += `    </c:plotArea>\n`;

  // Legend
  xml += generateLegend(chartData, frame);

  xml += `    <c:plotVisOnly val="1"/>\n`;
  if (chartData.dispBlanksAs) {
    xml += `    <c:dispBlanksAs val="${chartData.dispBlanksAs}"/>\n`;
  }
  xml += `  </c:chart>\n`;

  // Chart area styling
  if (chartData.chartArea) {
    xml += `  ${generateAreaSpPr(chartData.chartArea)}\n`;
  }

  // External data link
  xml += `  <c:externalData r:id="${excelRId}">\n`;
  xml += `    <c:autoUpdate val="0"/>\n`;
  xml += `  </c:externalData>\n`;

  // Print settings (always present in PowerPoint-generated chart files)
  xml += `  <c:printSettings>\n`;
  xml += `    <c:headerFooter/>\n`;
  xml += `    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>\n`;
  xml += `    <c:pageSetup/>\n`;
  xml += `  </c:printSettings>\n`;

  // User shapes (annotations)
  if (chartData.annotations && chartData.annotations.length > 0) {
    xml += `  <c:userShapes r:id="rId2"/>\n`;
  }

  xml += `</c:chartSpace>`;
  return xml;
}

export { colLetter } from "./chartXmlShared.js";
export { generateChartDrawingXml } from "./chartXmlDecor.js";
