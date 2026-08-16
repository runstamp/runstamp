import type { ChartData, ChartDataTable, ChartSeries } from "../../types/ast.js";
import { escapeXmlAttr } from "../drawing/textUtils.js";
import { ooxmlBool, ooxmlTextFontSize } from "../xmlValues.js";
import {
  CAT_AX_ID,
  SEC_VAL_AX_ID,
  VAL_AX_ID,
} from "./chartXmlShared.js";
import {
  generateDataLabelsXml,
  generateSeriesEntries,
  generateSingleSeries,
} from "./chartXmlSeries.js";

export function generateBarChart(chartData: ChartData): string {
  const grouping = chartData.barGrouping ?? "clustered";
  const barDir = chartData.barDirection ?? "col";
  let xml = `      <c:barChart>\n`;
  xml += `        <c:barDir val="${barDir}"/>\n`;
  xml += `        <c:grouping val="${grouping}"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  xml += generateSeriesEntries(chartData, { allowMarker: false });
  xml += generateDataLabelsXml(chartData.dataLabels);

  if (chartData.gapWidth !== undefined) {
    xml += `        <c:gapWidth val="${chartData.gapWidth}"/>\n`;
  }
  if (chartData.overlap !== undefined) {
    xml += `        <c:overlap val="${chartData.overlap}"/>\n`;
  }

  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:barChart>\n`;
  return xml;
}

export function generateLineChart(chartData: ChartData): string {
  const grouping = chartData.lineGrouping ?? "standard";
  let xml = `      <c:lineChart>\n`;
  xml += `        <c:grouping val="${grouping}"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  xml += generateSeriesEntries(chartData, {
    smooth: chartData.smooth,
    defaultMarker: chartData.marker,
    // PowerPoint for Mac rejects native line-chart data-label blocks that
    // currently validate structurally but still fail to open reliably.
    allowDataLabels: false,
  });

  xml += `        <c:marker val="${chartData.marker ? "1" : "0"}"/>\n`;
  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:lineChart>\n`;
  return xml;
}

export function generatePieChart(chartData: ChartData): string {
  let xml = `      <c:pieChart>\n`;
  xml += `        <c:varyColors val="1"/>\n`;

  const series = chartData.series ?? [];
  if (series.length > 0) {
    xml += generateSingleSeries(chartData, series[0], 0, true);
  }
  xml += generateDataLabelsXml(chartData.dataLabels);

  if (chartData.firstSliceAng !== undefined) {
    xml += `        <c:firstSliceAng val="${chartData.firstSliceAng}"/>\n`;
  }

  xml += `      </c:pieChart>\n`;
  return xml;
}

export function generateAreaChart(chartData: ChartData): string {
  const grouping = chartData.areaGrouping ?? "standard";
  let xml = `      <c:areaChart>\n`;
  xml += `        <c:grouping val="${grouping}"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  xml += generateSeriesEntries(chartData, { allowMarker: false });
  const lastCategoryIndex = (chartData.categories?.length ?? 0) - 1;
  xml += generateDataLabelsXml(
    chartData.dataLabels,
    lastCategoryIndex >= 2 ? [0, lastCategoryIndex] : [],
  );

  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:areaChart>\n`;
  return xml;
}

export function generateDoughnutChart(chartData: ChartData): string {
  let xml = `      <c:doughnutChart>\n`;
  xml += `        <c:varyColors val="1"/>\n`;

  if (chartData.series && chartData.series.length > 0) {
    xml += generateSingleSeries(chartData, chartData.series[0], 0, true);
  }
  xml += generateDataLabelsXml(chartData.dataLabels);

  xml += `        <c:holeSize val="${chartData.holeSize ?? 50}"/>\n`;
  if (chartData.firstSliceAng !== undefined) {
    xml += `        <c:firstSliceAng val="${chartData.firstSliceAng}"/>\n`;
  }
  xml += `      </c:doughnutChart>\n`;
  return xml;
}

export function generateRadarChart(chartData: ChartData): string {
  let style = chartData.radarStyle ?? "marker";
  if (style === "radar") style = "marker";

  let xml = `      <c:radarChart>\n`;
  xml += `        <c:radarStyle val="${style}"/>\n`;
  xml += `        <c:varyColors val="0"/>\n`;

  xml += generateSeriesEntries(chartData);
  xml += generateDataLabelsXml(chartData.dataLabels);

  xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
  xml += `        <c:axId val="${VAL_AX_ID}"/>\n`;
  xml += `      </c:radarChart>\n`;
  return xml;
}

export function generateDataTableXml(dt: ChartDataTable): string {
  let xml = `      <c:dTable>\n`;
  xml += `        <c:showHorzBorder val="${ooxmlBool(dt.showHorzBorder !== false)}"/>\n`;
  xml += `        <c:showVertBorder val="${ooxmlBool(dt.showVertBorder !== false)}"/>\n`;
  xml += `        <c:showOutline val="${ooxmlBool(dt.showOutline !== false)}"/>\n`;
  xml += `        <c:showKeys val="${ooxmlBool(dt.showKeys)}"/>\n`;
  if (dt.fontFamily || dt.fontSize) {
    const sz = ooxmlTextFontSize(dt.fontSize ?? 10, 10);
    const ff = dt.fontFamily ?? "Calibri";
    xml += `        <c:txPr>\n`;
    xml += `          <a:bodyPr/>\n`;
    xml += `          <a:lstStyle/>\n`;
    xml += `          <a:p>\n`;
    xml += `            <a:pPr><a:defRPr sz="${sz}"><a:latin typeface="${escapeXmlAttr(ff)}"/></a:defRPr></a:pPr>\n`;
    xml += `            <a:endParaRPr lang="en-US" dirty="0"/>\n`;
    xml += `          </a:p>\n`;
    xml += `        </c:txPr>\n`;
  }
  xml += `      </c:dTable>\n`;
  return xml;
}

export function generateComboChart(chartData: ChartData): string {
  const series = chartData.series ?? [];
  const groups = new Map<
    string,
    { series: ChartSeries; originalIndex: number }[]
  >();
  for (let i = 0; i < series.length; i++) {
    const effectiveType = series[i].overrideType ?? chartData.chartType;
    if (!groups.has(effectiveType)) groups.set(effectiveType, []);
    groups.get(effectiveType)!.push({ series: series[i], originalIndex: i });
  }

  let xml = "";
  for (const [chartType, entries] of groups) {
    const usesSecondary = entries.some(
      (entry) => entry.series.targetAxis === "secondary",
    );
    const axIdVal = usesSecondary ? SEC_VAL_AX_ID : VAL_AX_ID;

    switch (chartType) {
      case "bar": {
        const barDir = chartData.barDirection ?? "col";
        xml += `      <c:barChart>\n`;
        xml += `        <c:barDir val="${barDir}"/>\n`;
        xml += `        <c:grouping val="${chartData.barGrouping ?? "clustered"}"/>\n`;
        xml += `        <c:varyColors val="0"/>\n`;
        for (const entry of entries) {
          xml += generateSingleSeries(
            chartData,
            entry.series,
            entry.originalIndex,
            false,
            { allowMarker: false },
          );
        }
        xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
        xml += `        <c:axId val="${axIdVal}"/>\n`;
        xml += `      </c:barChart>\n`;
        break;
      }
      case "line": {
        xml += `      <c:lineChart>\n`;
        xml += `        <c:grouping val="${chartData.lineGrouping ?? "standard"}"/>\n`;
        xml += `        <c:varyColors val="0"/>\n`;
        for (const entry of entries) {
          xml += generateSingleSeries(
            chartData,
            entry.series,
            entry.originalIndex,
            false,
            { smooth: chartData.smooth, defaultMarker: chartData.marker },
          );
        }
        xml += `        <c:marker val="${chartData.marker ? "1" : "0"}"/>\n`;
        xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
        xml += `        <c:axId val="${axIdVal}"/>\n`;
        xml += `      </c:lineChart>\n`;
        break;
      }
      case "area": {
        xml += `      <c:areaChart>\n`;
        xml += `        <c:grouping val="${chartData.areaGrouping ?? "standard"}"/>\n`;
        xml += `        <c:varyColors val="0"/>\n`;
        for (const entry of entries) {
          xml += generateSingleSeries(
            chartData,
            entry.series,
            entry.originalIndex,
            false,
            { allowMarker: false },
          );
        }
        xml += `        <c:axId val="${CAT_AX_ID}"/>\n`;
        xml += `        <c:axId val="${axIdVal}"/>\n`;
        xml += `      </c:areaChart>\n`;
        break;
      }
    }
  }

  return xml;
}
