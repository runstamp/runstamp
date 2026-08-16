// src/ooxml/chart/chartExXml.ts — ChartEx XML emitter for modern chart types
// (treemap, sunburst, histogram, box & whisker)
// Uses cx:chartSpace namespace (PowerPoint 2016+)

import type { ChartData, TreemapCategory, TreemapData, SunburstData, HistogramData, BoxWhiskerData, ChartDataLabels } from "../../types/ast.js";
import { escapeXml, escapeXmlAttr } from "../drawing/textUtils.js";
import { toHex } from "../drawing/math.js";
import { ooxmlTextFontSize } from "../xmlValues.js";
export { isChartExType } from "./chartCapabilities.js";

// ---------------------------------------------------------------------------
// Hierarchy flattening for treemap/sunburst
// ---------------------------------------------------------------------------

interface FlatLeaf {
  path: string[];  // [leafName, parentName, grandparentName, ...]
  value: number;
  color?: string;
}

/**
 * Flattens hierarchical TreemapCategory[] into leaf nodes with ancestor paths.
 * path[0] = leaf name, path[1] = parent, path[2] = grandparent, etc.
 */
export function flattenHierarchy(categories: TreemapCategory[], ancestors: string[] = []): FlatLeaf[] {
  const leaves: FlatLeaf[] = [];
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      leaves.push(...flattenHierarchy(cat.children, [cat.name, ...ancestors]));
    } else {
      leaves.push({ path: [cat.name, ...ancestors], value: cat.value ?? 0, color: cat.color });
    }
  }
  return leaves;
}

/**
 * Generates complete <cx:chartSpace> XML for a ChartEx chart.
 */
export function generateChartExXml(chartData: ChartData, excelRId: string): string {
  switch (chartData.chartType) {
    case "treemap":
      return generateTreemapXml(chartData.treemapData!, excelRId, chartData);
    case "sunburst":
      return generateSunburstXml(chartData.sunburstData!, excelRId, chartData);
    case "histogram":
      return generateHistogramXml(chartData.histogramData!, excelRId, chartData);
    case "boxWhisker":
      return generateBoxWhiskerXml(chartData.boxWhiskerData!, excelRId, chartData);
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function chartExPreamble(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<cx:chartSpace xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">\n`;
}

function emitExternalData(excelRId: string): string {
  return `    <cx:externalData r:id="${excelRId}"/>\n`;
}

function emitStrDimLevels(leaves: FlatLeaf[], maxDepth: number): string {
  let xml = `      <cx:strDim type="cat">\n`;
  for (let level = 0; level < maxDepth; level++) {
    xml += `        <cx:lvl ptCount="${leaves.length}">\n`;
    for (let i = 0; i < leaves.length; i++) {
      const name = level < leaves[i].path.length ? leaves[i].path[level] : "";
      xml += `          <cx:pt idx="${i}">${escapeXml(name)}</cx:pt>\n`;
    }
    xml += `        </cx:lvl>\n`;
  }
  xml += `      </cx:strDim>\n`;
  return xml;
}

function emitNumDimValues(values: number[]): string {
  let xml = `      <cx:numDim type="val">\n`;
  xml += `        <cx:lvl ptCount="${values.length}">\n`;
  for (let i = 0; i < values.length; i++) {
    xml += `          <cx:pt idx="${i}">${values[i]}</cx:pt>\n`;
  }
  xml += `        </cx:lvl>\n`;
  xml += `      </cx:numDim>\n`;
  return xml;
}

function emitDataLabels(dataLabels?: ChartDataLabels): string {
  if (!dataLabels) return "";
  const pos = dataLabels.position ?? "ctr";
  const showVal = dataLabels.showVal ? "1" : "0";
  const showCat = dataLabels.showCatName ? "1" : "0";
  const showSer = dataLabels.showSerName ? "1" : "0";

  let xml = `          <cx:dataLabels pos="${pos}">\n`;
  xml += `            <cx:visibility seriesName="${showSer}" categoryName="${showCat}" value="${showVal}"/>\n`;
  xml += `          </cx:dataLabels>\n`;
  return xml;
}

function emitDataPointColors(leaves: FlatLeaf[]): string {
  let xml = "";
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].color) {
      const c = toHex(leaves[i].color!);
      xml += `          <cx:dataPt idx="${i}">\n`;
      xml += `            <cx:spPr>\n`;
      xml += `              <a:solidFill><a:srgbClr val="${c}"/></a:solidFill>\n`;
      xml += `            </cx:spPr>\n`;
      xml += `          </cx:dataPt>\n`;
    }
  }
  return xml;
}

function emitLegend(chartData: ChartData): string {
  const legend = chartData.legend;
  if (legend?.position === "none") return "";
  const posMap: Record<string, string> = { bottom: "b", top: "t", left: "l", right: "r" };
  const pos = posMap[legend?.position ?? "bottom"] ?? "b";
  return `    <cx:legend pos="${pos}" align="ctr" overlay="0"/>\n`;
}

function emitTitle(chartData: ChartData): string {
  if (!chartData.title?.text) return "";
  const t = chartData.title;
  const fontSize = ooxmlTextFontSize(t.fontSize ?? 14, 14);
  const bold = t.bold ? ` b="1"` : "";
  const fontFamily = t.fontFamily ?? "Calibri";
  let colorXml = `<a:srgbClr val="000000"/>`;
  if (t.fontColor) {
    colorXml = `<a:srgbClr val="${toHex(t.fontColor)}"/>`;
  }

  let xml = `    <cx:title>\n`;
  xml += `      <cx:tx>\n`;
  xml += `        <cx:rich>\n`;
  xml += `          <a:bodyPr/>\n`;
  xml += `          <a:lstStyle/>\n`;
  xml += `          <a:p>\n`;
  xml += `            <a:r>\n`;
  xml += `              <a:rPr lang="en-US" sz="${fontSize}"${bold}>\n`;
  xml += `                <a:solidFill>${colorXml}</a:solidFill>\n`;
  xml += `                <a:latin typeface="${escapeXmlAttr(fontFamily)}"/>\n`;
  xml += `              </a:rPr>\n`;
  xml += `              <a:t>${escapeXml(t.text!)}</a:t>\n`;
  xml += `            </a:r>\n`;
  xml += `          </a:p>\n`;
  xml += `        </cx:rich>\n`;
  xml += `      </cx:tx>\n`;
  xml += `    </cx:title>\n`;
  return xml;
}

// ---------------------------------------------------------------------------
// Treemap
// ---------------------------------------------------------------------------

function generateTreemapXml(data: TreemapData, excelRId: string, chartData: ChartData): string {
  const leaves = flattenHierarchy(data.categories);
  const maxDepth = Math.max(...leaves.map(l => l.path.length), 1);

  let xml = chartExPreamble();

  // chartData section
  xml += `  <cx:chartData>\n`;
  xml += emitExternalData(excelRId);
  xml += `    <cx:data id="0">\n`;
  xml += emitStrDimLevels(leaves, maxDepth);
  xml += emitNumDimValues(leaves.map(l => l.value));
  xml += `    </cx:data>\n`;
  xml += `  </cx:chartData>\n`;

  // chart section
  xml += `  <cx:chart>\n`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>\n`;
  xml += `      <cx:plotAreaRegion>\n`;
  xml += `        <cx:series layoutId="treemap">\n`;
  xml += emitDataPointColors(leaves);
  xml += emitDataLabels(data.dataLabels);
  xml += `          <cx:dataId val="0"/>\n`;
  xml += `        </cx:series>\n`;
  xml += `      </cx:plotAreaRegion>\n`;
  xml += `    </cx:plotArea>\n`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>\n`;

  xml += `</cx:chartSpace>`;
  return xml;
}

// ---------------------------------------------------------------------------
// Sunburst
// ---------------------------------------------------------------------------

function generateSunburstXml(data: SunburstData, excelRId: string, chartData: ChartData): string {
  const leaves = flattenHierarchy(data.categories);
  const maxDepth = Math.max(...leaves.map(l => l.path.length), 1);

  let xml = chartExPreamble();

  xml += `  <cx:chartData>\n`;
  xml += emitExternalData(excelRId);
  xml += `    <cx:data id="0">\n`;
  xml += emitStrDimLevels(leaves, maxDepth);
  xml += emitNumDimValues(leaves.map(l => l.value));
  xml += `    </cx:data>\n`;
  xml += `  </cx:chartData>\n`;

  xml += `  <cx:chart>\n`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>\n`;
  xml += `      <cx:plotAreaRegion>\n`;
  xml += `        <cx:series layoutId="sunburst">\n`;
  xml += emitDataPointColors(leaves);
  xml += emitDataLabels(data.dataLabels);
  xml += `          <cx:dataId val="0"/>\n`;
  xml += `        </cx:series>\n`;
  xml += `      </cx:plotAreaRegion>\n`;
  xml += `    </cx:plotArea>\n`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>\n`;

  xml += `</cx:chartSpace>`;
  return xml;
}

// ---------------------------------------------------------------------------
// Histogram
// ---------------------------------------------------------------------------

function generateHistogramXml(data: HistogramData, excelRId: string, chartData: ChartData): string {
  const values = data.values;

  let xml = chartExPreamble();

  xml += `  <cx:chartData>\n`;
  xml += emitExternalData(excelRId);
  xml += `    <cx:data id="0">\n`;
  xml += emitNumDimValues(values);
  xml += `    </cx:data>\n`;
  xml += `  </cx:chartData>\n`;

  xml += `  <cx:chart>\n`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>\n`;
  xml += `      <cx:plotAreaRegion>\n`;
  xml += `        <cx:series layoutId="clusteredColumn">\n`;

  // Series color
  if (data.color) {
    const c = toHex(data.color);
    xml += `          <cx:spPr>\n`;
    xml += `            <a:solidFill><a:srgbClr val="${c}"/></a:solidFill>\n`;
    xml += `          </cx:spPr>\n`;
  }

  xml += emitDataLabels(data.dataLabels);
  xml += `          <cx:dataId val="0"/>\n`;
  xml += `        </cx:series>\n`;
  xml += `      </cx:plotAreaRegion>\n`;
  xml += `    </cx:plotArea>\n`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>\n`;

  xml += `</cx:chartSpace>`;
  return xml;
}

// ---------------------------------------------------------------------------
// Box & Whisker
// ---------------------------------------------------------------------------

function generateBoxWhiskerXml(data: BoxWhiskerData, excelRId: string, chartData: ChartData): string {
  let xml = chartExPreamble();

  xml += `  <cx:chartData>\n`;
  xml += emitExternalData(excelRId);

  // One data block per series — each series provides raw data points
  // Categories are repeated to distribute values across groups
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];
    xml += `    <cx:data id="${i}">\n`;

    // Category dimension: repeat categories to match values length
    if (data.categories.length > 0) {
      xml += `      <cx:strDim type="cat">\n`;
      xml += `        <cx:lvl ptCount="${series.values.length}">\n`;
      for (let j = 0; j < series.values.length; j++) {
        const catIdx = j % data.categories.length;
        xml += `          <cx:pt idx="${j}">${escapeXml(data.categories[catIdx])}</cx:pt>\n`;
      }
      xml += `        </cx:lvl>\n`;
      xml += `      </cx:strDim>\n`;
    }

    // Value dimension
    xml += `      <cx:numDim type="val">\n`;
    xml += `        <cx:lvl ptCount="${series.values.length}">\n`;
    for (let j = 0; j < series.values.length; j++) {
      xml += `          <cx:pt idx="${j}">${series.values[j]}</cx:pt>\n`;
    }
    xml += `        </cx:lvl>\n`;
    xml += `      </cx:numDim>\n`;

    xml += `    </cx:data>\n`;
  }

  xml += `  </cx:chartData>\n`;

  xml += `  <cx:chart>\n`;
  xml += emitTitle(chartData);
  xml += `    <cx:plotArea>\n`;
  xml += `      <cx:plotAreaRegion>\n`;

  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];
    xml += `        <cx:series layoutId="boxWhisker">\n`;

    // Series name
    xml += `          <cx:tx>\n`;
    xml += `            <cx:txData><cx:v>${escapeXml(series.name)}</cx:v></cx:txData>\n`;
    xml += `          </cx:tx>\n`;

    // Series color
    if (series.color) {
      const c = toHex(series.color);
      xml += `          <cx:spPr>\n`;
      xml += `            <a:solidFill><a:srgbClr val="${c}"/></a:solidFill>\n`;
      xml += `          </cx:spPr>\n`;
    }

    xml += emitDataLabels(data.dataLabels);
    xml += `          <cx:dataId val="${i}"/>\n`;
    xml += `        </cx:series>\n`;
  }

  xml += `      </cx:plotAreaRegion>\n`;
  xml += `    </cx:plotArea>\n`;
  xml += emitLegend(chartData);
  xml += `  </cx:chart>\n`;

  xml += `</cx:chartSpace>`;
  return xml;
}
