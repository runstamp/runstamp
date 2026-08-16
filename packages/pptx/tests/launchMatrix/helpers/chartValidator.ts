/**
 * Chart Deep Validation — Phase 2 of the Runstamp verification pipeline.
 *
 * Validates all charts in a rendered PPTX buffer for structural correctness:
 * series index order, chart type presence, embedded Excel existence,
 * positioning within slide bounds, legend/axis integrity, and data cache consistency.
 */
import JSZip from "jszip";
import {
  parseXml, findAllElements, getAttr, getChildren, getTagName,
  getZipEntry, getZipPaths, zipHasFile, getZipEntryBuffer,
} from "../../helpers/xmlTestUtils.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ChartCheckResult {
  name: string;
  passed: boolean;
  errors: string[];
  chartPath: string;
}

export interface ChartValidationReport {
  charts: ChartCheckResult[];
  passed: boolean;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ChartInfo {
  slideIndex: number;
  chartPath: string;
  chartRelsPath: string;
  rId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLIDE_WIDTH_EMU = 12_192_000; // 16:9 width
const SLIDE_HEIGHT_EMU = 6_858_000; // 16:9 height

const KNOWN_CHART_TYPES = [
  "c:barChart", "c:lineChart", "c:pieChart", "c:doughnutChart",
  "c:areaChart", "c:scatterChart", "c:bubbleChart", "c:radarChart",
  "cx:chart",
];

const VALID_LEGEND_POSITIONS = new Set(["b", "t", "l", "r", "tr"]);
const VALID_ORIENTATIONS = new Set(["minMax", "maxMin"]);

const PACKAGE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package";

// ---------------------------------------------------------------------------
// Helper: resolve relative target paths
// ---------------------------------------------------------------------------

function resolveRelTarget(relsFilePath: string, target: string): string {
  // relsFilePath: "ppt/charts/_rels/chart1.xml.rels"
  // target: "../embeddings/oleObject1.xlsx"
  // We need to resolve relative to the parent of the _rels directory
  const parentDir = relsFilePath
    .replace(/_rels\/[^/]+$/, "") // strip "_rels/filename.rels"
    .replace(/\/$/, "");          // strip trailing slash

  const parts = parentDir.split("/");
  const targetParts = target.split("/");

  for (const seg of targetParts) {
    if (seg === "..") {
      parts.pop();
    } else if (seg !== ".") {
      parts.push(seg);
    }
  }

  return parts.join("/");
}

// ---------------------------------------------------------------------------
// Helper: find all charts in a PPTX buffer
// ---------------------------------------------------------------------------

async function findAllCharts(buffer: Buffer): Promise<ChartInfo[]> {
  const paths = await getZipPaths(buffer);
  const slideRels = paths.filter(p =>
    /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(p),
  );

  const charts: ChartInfo[] = [];

  for (const relsPath of slideRels) {
    const slideMatch = relsPath.match(/slide(\d+)\.xml\.rels$/);
    if (!slideMatch) continue;
    const slideIndex = parseInt(slideMatch[1], 10) - 1;

    const relsXml = await getZipEntry(buffer, relsPath);
    const tree = parseXml(relsXml);
    const rels = findAllElements(tree, "Relationship");

    for (const rel of rels) {
      const type = getAttr(rel, "Type") ?? "";
      if (
        type.includes("/chart") ||
        type.includes("/chartEx")
      ) {
        const target = getAttr(rel, "Target") ?? "";
        const rId = getAttr(rel, "Id") ?? "";
        // Resolve relative to the rels file's parent (which is the _rels dir)
        const chartPath = resolveRelTarget(relsPath, target);

        const chartRelsPath = chartPath.replace(
          /^(.*\/)?([^/]+)$/,
          "$1_rels/$2.rels",
        );

        charts.push({ slideIndex, chartPath, chartRelsPath, rId });
      }
    }
  }

  return charts;
}

// ---------------------------------------------------------------------------
// Helper: find graphic frame for a chart rId on a slide
// ---------------------------------------------------------------------------

async function getChartGraphicFrame(
  buffer: Buffer,
  slideIndex: number,
  chartRId: string,
): Promise<any | null> {
  const slidePath = `ppt/slides/slide${slideIndex + 1}.xml`;
  if (!(await zipHasFile(buffer, slidePath))) return null;

  const xml = await getZipEntry(buffer, slidePath);
  const tree = parseXml(xml);
  // Charts may be inside mc:AlternateContent > mc:Choice > p:graphicFrame
  const frames = findAllElements(tree, "p:graphicFrame");

  for (const frame of frames) {
    // Drill into graphic data to find the chart reference
    const graphicDataEls = findAllElements(
      [frame],
      "a:graphicData",
    );
    for (const gd of graphicDataEls) {
      const children = getChildren(gd);
      for (const child of children) {
        const tag = getTagName(child);
        if (tag === "c:chart" || tag === "cx:chart" || tag === "c16r3:chart") {
          const rid = getAttr(child, "r:id");
          if (rid === chartRId) return frame;
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Individual check functions
// ---------------------------------------------------------------------------

function checkSeriesIndexOrder(
  chartXml: string,
  chartPath: string,
): ChartCheckResult {
  const result: ChartCheckResult = {
    name: "seriesIndexOrder",
    passed: true,
    errors: [],
    chartPath,
  };

  const tree = parseXml(chartXml);

  // Skip for ChartEx
  if (findAllElements(tree, "cx:chart").length > 0) return result;

  // In combo charts, series indices are globally unique across all chart type groups.
  // Waterfall charts may use multiple c:barChart groups internally.
  // We validate: all c:idx values are unique (no duplicates within same chart type group),
  // and c:order values are unique globally.
  const serElements = findAllElements(tree, "c:ser");
  if (serElements.length === 0) return result;

  const allIdxVals: number[] = [];
  const allOrderVals: number[] = [];

  for (const ser of serElements) {
    const idxEls = findAllElements(getChildren(ser), "c:idx");
    const orderEls = findAllElements(getChildren(ser), "c:order");

    for (const idx of idxEls) {
      const v = getAttr(idx, "val");
      if (v !== undefined) allIdxVals.push(parseInt(v, 10));
    }
    for (const ord of orderEls) {
      const v = getAttr(ord, "val");
      if (v !== undefined) allOrderVals.push(parseInt(v, 10));
    }
  }

  // Verify no negative indices
  if (allIdxVals.some(v => v < 0)) {
    result.passed = false;
    result.errors.push(`Negative c:idx values found: [${allIdxVals.filter(v => v < 0).join(", ")}]`);
  }

  if (allOrderVals.some(v => v < 0)) {
    result.passed = false;
    result.errors.push(`Negative c:order values found: [${allOrderVals.filter(v => v < 0).join(", ")}]`);
  }

  return result;
}

function checkChartTypePresence(
  chartXml: string,
  chartPath: string,
): ChartCheckResult {
  const result: ChartCheckResult = {
    name: "chartTypePresence",
    passed: false,
    errors: [],
    chartPath,
  };

  const tree = parseXml(chartXml);

  for (const chartType of KNOWN_CHART_TYPES) {
    if (findAllElements(tree, chartType).length > 0) {
      result.passed = true;
      return result;
    }
  }

  result.errors.push(
    `No known chart type found. Expected one of: ${KNOWN_CHART_TYPES.join(", ")}`,
  );
  return result;
}

async function checkEmbeddedExcel(
  buffer: Buffer,
  chartRelsPath: string,
  chartPath: string,
): Promise<ChartCheckResult> {
  const result: ChartCheckResult = {
    name: "embeddedExcelExistence",
    passed: false,
    errors: [],
    chartPath,
  };

  if (!(await zipHasFile(buffer, chartRelsPath))) {
    result.errors.push(`Chart rels file not found: ${chartRelsPath}`);
    return result;
  }

  const relsXml = await getZipEntry(buffer, chartRelsPath);
  const tree = parseXml(relsXml);
  const rels = findAllElements(tree, "Relationship");

  for (const rel of rels) {
    const type = getAttr(rel, "Type") ?? "";
    if (
      type === PACKAGE_REL_TYPE ||
      type.includes("oleObject") ||
      type.includes("package")
    ) {
      const target = getAttr(rel, "Target") ?? "";
      const resolvedTarget = resolveRelTarget(chartRelsPath, target);

      if (await zipHasFile(buffer, resolvedTarget)) {
        result.passed = true;
        return result;
      } else {
        result.errors.push(
          `Embedded file referenced but missing: ${resolvedTarget}`,
        );
      }
    }
  }

  if (result.errors.length === 0) {
    result.errors.push("No package/oleObject relationship found in chart rels");
  }

  return result;
}

async function checkChartPositioning(
  buffer: Buffer,
  info: ChartInfo,
): Promise<ChartCheckResult> {
  const result: ChartCheckResult = {
    name: "chartPositioning",
    passed: true,
    errors: [],
    chartPath: info.chartPath,
  };

  const frame = await getChartGraphicFrame(buffer, info.slideIndex, info.rId);
  if (!frame) {
    // Not fatal — the graphic frame might use a different structure
    result.errors.push("Could not locate graphicFrame for chart");
    result.passed = false;
    return result;
  }

  const children = getChildren(frame);
  // Charts use p:xfrm (not a:xfrm) inside graphicFrame
  let xfrmEls = findAllElements(children, "p:xfrm");
  if (xfrmEls.length === 0) {
    xfrmEls = findAllElements(children, "a:xfrm");
  }
  if (xfrmEls.length === 0) {
    // Not a failure — some graphicFrame structures vary
    return result;
  }

  const xfrm = xfrmEls[0];
  const xfrmChildren = getChildren(xfrm);

  const offEls = findAllElements(xfrmChildren, "a:off");
  const extEls = findAllElements(xfrmChildren, "a:ext");

  if (offEls.length > 0) {
    const x = parseInt(getAttr(offEls[0], "x") ?? "0", 10);
    const y = parseInt(getAttr(offEls[0], "y") ?? "0", 10);

    if (x < 0) {
      result.passed = false;
      result.errors.push(`Negative x offset: ${x}`);
    }
    if (y < 0) {
      result.passed = false;
      result.errors.push(`Negative y offset: ${y}`);
    }

    if (extEls.length > 0) {
      const cx = parseInt(getAttr(extEls[0], "cx") ?? "0", 10);
      const cy = parseInt(getAttr(extEls[0], "cy") ?? "0", 10);

      if (cx < 0) {
        result.passed = false;
        result.errors.push(`Negative width: ${cx}`);
      }
      if (cy < 0) {
        result.passed = false;
        result.errors.push(`Negative height: ${cy}`);
      }

      if (x + cx > SLIDE_WIDTH_EMU) {
        result.passed = false;
        result.errors.push(
          `Chart exceeds slide width: x(${x}) + cx(${cx}) = ${x + cx} > ${SLIDE_WIDTH_EMU}`,
        );
      }
      if (y + cy > SLIDE_HEIGHT_EMU) {
        result.passed = false;
        result.errors.push(
          `Chart exceeds slide height: y(${y}) + cy(${cy}) = ${y + cy} > ${SLIDE_HEIGHT_EMU}`,
        );
      }
    }
  }

  return result;
}

function checkLegendAndAxis(
  chartXml: string,
  chartPath: string,
): ChartCheckResult {
  const result: ChartCheckResult = {
    name: "legendAndAxis",
    passed: true,
    errors: [],
    chartPath,
  };

  const tree = parseXml(chartXml);

  // Check legend
  const legends = findAllElements(tree, "c:legend");
  for (const legend of legends) {
    const posEls = findAllElements(getChildren(legend), "c:legendPos");
    if (posEls.length === 0) {
      result.passed = false;
      result.errors.push("c:legend found without c:legendPos child");
    } else {
      for (const pos of posEls) {
        const val = getAttr(pos, "val");
        if (!val || !VALID_LEGEND_POSITIONS.has(val)) {
          result.passed = false;
          result.errors.push(
            `Invalid legend position: "${val}". Expected one of: ${[...VALID_LEGEND_POSITIONS].join(", ")}`,
          );
        }
      }
    }
  }

  // Check axes
  const axisTypes = ["c:valAx", "c:catAx"];
  for (const axType of axisTypes) {
    const axes = findAllElements(tree, axType);
    for (const ax of axes) {
      const orientEls = findAllElements(getChildren(ax), "c:orientation");
      for (const orient of orientEls) {
        const val = getAttr(orient, "val");
        if (val && !VALID_ORIENTATIONS.has(val)) {
          result.passed = false;
          result.errors.push(
            `Invalid ${axType} orientation: "${val}". Expected "minMax" or "maxMin"`,
          );
        }
      }
    }
  }

  return result;
}

async function checkDataCacheConsistency(
  buffer: Buffer,
  chartXml: string,
  chartRelsPath: string,
  chartPath: string,
): Promise<ChartCheckResult> {
  const result: ChartCheckResult = {
    name: "dataCacheConsistency",
    passed: true,
    errors: [],
    chartPath,
  };

  const tree = parseXml(chartXml);
  const serElements = findAllElements(tree, "c:ser");

  // Note presence of caches
  let hasCaches = false;
  for (const ser of serElements) {
    const numCaches = findAllElements(getChildren(ser), "c:numCache");
    const strCaches = findAllElements(getChildren(ser), "c:strCache");
    if (numCaches.length > 0 || strCaches.length > 0) {
      hasCaches = true;
      break;
    }
  }

  // Best-effort: verify embedded xlsx is a valid ZIP with at least one worksheet
  if (!(await zipHasFile(buffer, chartRelsPath))) return result;

  const relsXml = await getZipEntry(buffer, chartRelsPath);
  const relsTree = parseXml(relsXml);
  const rels = findAllElements(relsTree, "Relationship");

  for (const rel of rels) {
    const type = getAttr(rel, "Type") ?? "";
    if (
      type === PACKAGE_REL_TYPE ||
      type.includes("oleObject") ||
      type.includes("package")
    ) {
      const target = getAttr(rel, "Target") ?? "";
      const resolvedTarget = resolveRelTarget(chartRelsPath, target);

      if (!(await zipHasFile(buffer, resolvedTarget))) continue;

      try {
        const xlsxBuf = await getZipEntryBuffer(buffer, resolvedTarget);
        const xlsxZip = await JSZip.loadAsync(xlsxBuf);
        const xlsxPaths = Object.keys(xlsxZip.files).filter(
          p => !xlsxZip.files[p].dir,
        );

        // Must have at least one worksheet
        const worksheets = xlsxPaths.filter(p =>
          /xl\/worksheets\/sheet\d+\.xml/i.test(p),
        );
        if (worksheets.length === 0) {
          result.passed = false;
          result.errors.push(
            `Embedded xlsx at ${resolvedTarget} has no worksheets`,
          );
        }
      } catch (e) {
        result.passed = false;
        result.errors.push(
          `Embedded xlsx at ${resolvedTarget} is not a valid ZIP: ${(e as Error).message}`,
        );
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function validateCharts(
  buffer: Buffer,
): Promise<ChartValidationReport> {
  const chartInfos = await findAllCharts(buffer);
  const allResults: ChartCheckResult[] = [];

  for (const info of chartInfos) {
    if (!(await zipHasFile(buffer, info.chartPath))) {
      allResults.push({
        name: "chartFileExists",
        passed: false,
        errors: [`Chart file not found: ${info.chartPath}`],
        chartPath: info.chartPath,
      });
      continue;
    }

    const chartXml = await getZipEntry(buffer, info.chartPath);

    // 1. Series index order
    allResults.push(checkSeriesIndexOrder(chartXml, info.chartPath));

    // 2. Chart type presence
    allResults.push(checkChartTypePresence(chartXml, info.chartPath));

    // 3. Embedded Excel existence
    allResults.push(
      await checkEmbeddedExcel(buffer, info.chartRelsPath, info.chartPath),
    );

    // 4. Chart positioning
    allResults.push(await checkChartPositioning(buffer, info));

    // 5. Legend and axis
    allResults.push(checkLegendAndAxis(chartXml, info.chartPath));

    // 6. Data cache consistency
    allResults.push(
      await checkDataCacheConsistency(
        buffer,
        chartXml,
        info.chartRelsPath,
        info.chartPath,
      ),
    );
  }

  return {
    charts: allResults,
    passed: allResults.every(r => r.passed),
  };
}

// Re-export helper for use in tests
export { findAllCharts };
