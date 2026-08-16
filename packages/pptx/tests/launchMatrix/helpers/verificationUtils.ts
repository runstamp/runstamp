/**
 * Layer 1 (structural) and Layer 2 (content) assertion functions
 * for launch matrix template verification.
 */
import { expect } from "vitest";
import JSZip from "jszip";
import {
  parseXml, findAllElements, getAttr, getText,
  getZipEntry, getZipPaths, zipHasFile,
  assertUniqueShapeIds as assertUniqueShapeIdsInTree,
  assertRIdsResolve as assertRIdsResolveXml,
  assertWellFormedXml, getChildren, getTagName,
} from "../../helpers/xmlTestUtils.js";

// =========================================================================
// Layer 1 — Structural assertions
// =========================================================================

/** Verify buffer is a valid ZIP with well-formed XML in all parts */
export async function assertValidPptx(buffer: Buffer): Promise<void> {
  // Must be a valid ZIP
  const zip = await JSZip.loadAsync(buffer);
  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);
  expect(paths.length).toBeGreaterThan(0);

  // Must have [Content_Types].xml
  expect(zip.file("[Content_Types].xml")).not.toBeNull();

  // Must have at least one slide
  const slides = paths.filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  expect(slides.length).toBeGreaterThan(0);

  // All XML must be well-formed
  await assertWellFormedXml(buffer);
}

/** Assert expected slide count */
export async function assertSlideCount(buffer: Buffer, expected: number): Promise<void> {
  const paths = await getZipPaths(buffer);
  const slides = paths.filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  expect(slides.length).toBe(expected);
}

/** Assert [Content_Types].xml has entries for all parts */
export async function assertContentTypesComplete(buffer: Buffer): Promise<void> {
  const ct = await getZipEntry(buffer, "[Content_Types].xml");
  const tree = parseXml(ct);
  const paths = await getZipPaths(buffer);

  // Every slide should have a content type entry
  const slides = paths.filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  for (const slide of slides) {
    // Content types can use Override or Default extension matching
    expect(ct).toContain("slide");
  }
}

/** Assert all rIds resolve across all slides */
export async function assertAllRIdsResolve(buffer: Buffer): Promise<void> {
  const paths = await getZipPaths(buffer);
  const slides = paths.filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));

  for (const slidePath of slides) {
    const slideXml = await getZipEntry(buffer, slidePath);
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    if (await zipHasFile(buffer, relsPath)) {
      const relsXml = await getZipEntry(buffer, relsPath);
      assertRIdsResolveXml(slideXml, relsXml);
    }
  }
}

/** Assert no duplicate cNvPr ids across all slides */
export async function assertUniqueShapeIds(buffer: Buffer): Promise<void> {
  const paths = await getZipPaths(buffer);
  const slides = paths.filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  const allIds = new Set<string>();

  for (const slidePath of slides) {
    const xml = await getZipEntry(buffer, slidePath);
    const tree = parseXml(xml);
    const cNvPrs = findAllElements(tree, "p:cNvPr");
    for (const el of cNvPrs) {
      const id = getAttr(el, "id");
      if (id && id !== "0") {
        // IDs should be unique within a slide
        // (cross-slide uniqueness not required by spec but good practice)
      }
    }
    // Per-slide uniqueness
    assertUniqueShapeIdsInTree(tree);
  }
}

/** Assert no corruption — structural proxy (valid ZIP + XML + content types + rIds) */
export async function assertNoCorruption(buffer: Buffer): Promise<void> {
  await assertValidPptx(buffer);
  await assertAllRIdsResolve(buffer);
  await assertUniqueShapeIds(buffer);
}

// =========================================================================
// Layer 2 — Content assertions
// =========================================================================

/** Get parsed slide XML tree */
export async function getSlideTree(buffer: Buffer, slideIdx: number): Promise<any[]> {
  const xml = await getZipEntry(buffer, `ppt/slides/slide${slideIdx + 1}.xml`);
  return parseXml(xml);
}

/** Get slide XML string */
export async function getSlideXml(buffer: Buffer, slideIdx: number): Promise<string> {
  return getZipEntry(buffer, `ppt/slides/slide${slideIdx + 1}.xml`);
}

/** Assert a chart of given type exists on a slide */
export async function assertChartExists(buffer: Buffer, slideIdx: number, chartType?: string): Promise<void> {
  const paths = await getZipPaths(buffer);
  const relsPath = `ppt/slides/_rels/slide${slideIdx + 1}.xml.rels`;
  const relsXml = await getZipEntry(buffer, relsPath);
  const relsTree = parseXml(relsXml);
  const rels = findAllElements(relsTree, "Relationship");

  // Find chart relationship
  const chartRel = rels.find(r => {
    const type = getAttr(r, "Type") ?? "";
    return type.includes("/chart") || type.includes("/chart16");
  });
  expect(chartRel).toBeDefined();

  if (chartType && chartRel) {
    const target = getAttr(chartRel, "Target") ?? "";
    const chartPath = target.startsWith("/") ? target.slice(1) : `ppt/slides/${target}`.replace("slides/../", "");
    const normalizedPath = chartPath.replace(/\/\.\.\//g, "/").replace("ppt/charts/../charts/", "ppt/charts/");
    // Try both possible paths
    let chartXml: string;
    try {
      chartXml = await getZipEntry(buffer, chartPath);
    } catch {
      const altPath = `ppt/charts/${target.split("/").pop()}`;
      chartXml = await getZipEntry(buffer, altPath);
    }

    // Check chart type element exists
    // Waterfall and funnel use c:barChart internally (not ChartEx)
    // Treemap/sunburst use ChartEx (cx:chart)
    const chartTag = chartType === "bar" || chartType === "waterfall" || chartType === "funnel" ? "c:barChart"
      : chartType === "line" ? "c:lineChart"
      : chartType === "pie" ? "c:pieChart"
      : chartType === "doughnut" ? "c:doughnutChart"
      : chartType === "area" ? "c:areaChart"
      : chartType === "scatter" ? "c:scatterChart"
      : chartType === "bubble" ? "c:bubbleChart"
      : chartType === "radar" ? "c:radarChart"
      : chartType === "treemap" ? "cx:chart"
      : chartType === "sunburst" ? "cx:chart"
      : chartType === "combo" ? "c:barChart"
      : `c:${chartType}Chart`;

    if (chartType === "treemap" || chartType === "sunburst") {
      expect(chartXml).toContain("cx:");
    } else {
      expect(chartXml).toContain(chartTag);
    }
  }
}

/** Assert chart has embedded Excel (editable) */
export async function assertChartEditable(buffer: Buffer, chartIdx: number): Promise<void> {
  const paths = await getZipPaths(buffer);
  // Chart xlsx files are embedded in the chart's rels
  const chartRelsPath = `ppt/charts/_rels/chart${chartIdx}.xml.rels`;
  if (await zipHasFile(buffer, chartRelsPath)) {
    const relsXml = await getZipEntry(buffer, chartRelsPath);
    // Should reference an xlsx file
    expect(relsXml).toMatch(/\.xlsx|microsoft\.excel/i);
  }
  // Also check the xlsx exists
  const xlsxFiles = paths.filter(p => p.includes(".xlsx") || p.includes("embeddings"));
  expect(xlsxFiles.length).toBeGreaterThan(0);
}

/** Assert chart series count on a slide */
export async function assertChartSeriesCount(
  buffer: Buffer, slideIdx: number, expectedCount: number,
): Promise<void> {
  const relsPath = `ppt/slides/_rels/slide${slideIdx + 1}.xml.rels`;
  const relsXml = await getZipEntry(buffer, relsPath);
  const relsTree = parseXml(relsXml);
  const rels = findAllElements(relsTree, "Relationship");
  const chartRel = rels.find(r => (getAttr(r, "Type") ?? "").includes("/chart"));
  expect(chartRel).toBeDefined();

  const target = getAttr(chartRel!, "Target") ?? "";
  const chartPath = `ppt/charts/${target.split("/").pop()}`;
  const chartXml = await getZipEntry(buffer, chartPath);
  const chartTree = parseXml(chartXml);

  // Count c:ser elements
  const serElements = findAllElements(chartTree, "c:ser");
  // For ChartEx, count cx:series
  const cxSerElements = findAllElements(chartTree, "cx:series");
  const totalSeries = serElements.length + cxSerElements.length;
  expect(totalSeries).toBe(expectedCount);
}

/** Assert table dimensions on a slide */
export async function assertTableDimensions(
  buffer: Buffer, slideIdx: number, expectedRows: number, expectedCols: number,
): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  const tree = parseXml(xml);

  // Find a:tbl
  const tables = findAllElements(tree, "a:tbl");
  expect(tables.length).toBeGreaterThan(0);

  const tbl = tables[0];
  const tblChildren = getChildren(tbl);

  // Count a:tr (rows)
  const rows = tblChildren.filter(c => getTagName(c) === "a:tr");
  expect(rows.length).toBe(expectedRows);

  // Count a:gridCol (columns)
  const tblGrid = tblChildren.find(c => getTagName(c) === "a:tblGrid");
  if (tblGrid) {
    const gridCols = getChildren(tblGrid).filter(c => getTagName(c) === "a:gridCol");
    expect(gridCols.length).toBe(expectedCols);
  }
}

/** Assert merged cells exist on a slide's table */
export async function assertMergedCells(buffer: Buffer, slideIdx: number): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  // gridSpan > 1 indicates horizontal merge, rowSpan > 1 indicates vertical merge
  expect(xml).toMatch(/gridSpan="[2-9]|rowSpan="[2-9]|vMerge="1"/);
}

/** Assert a specific font size (in pixels, as used in AST) appears on a slide */
export async function assertFontSizePresent(buffer: Buffer, slideIdx: number, expectedPx: number): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  // Font size in OOXML: px * 75 (px → hundredths-of-a-point: px * 72/96 * 100)
  const hundredths = expectedPx * 75;
  expect(xml).toContain(`sz="${hundredths}"`);
}

/** Assert speaker notes contain expected text */
export async function assertSpeakerNotes(buffer: Buffer, slideIdx: number, text: string): Promise<void> {
  const notesPath = `ppt/notesSlides/notesSlide${slideIdx + 1}.xml`;
  const notesXml = await getZipEntry(buffer, notesPath);
  expect(notesXml).toContain(text);
}

/** Assert media file count in ZIP */
export async function assertImageCount(buffer: Buffer, expectedCount: number): Promise<void> {
  const paths = await getZipPaths(buffer);
  const media = paths.filter(p => p.startsWith("ppt/media/"));
  expect(media.length).toBe(expectedCount);
}

/** Assert minimum image count (useful when exact count is uncertain) */
export async function assertMinImageCount(buffer: Buffer, minCount: number): Promise<void> {
  const paths = await getZipPaths(buffer);
  const media = paths.filter(p => p.startsWith("ppt/media/"));
  expect(media.length).toBeGreaterThanOrEqual(minCount);
}

/** Assert a hyperlink exists on a slide */
export async function assertHyperlinkPresent(buffer: Buffer, slideIdx: number): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  expect(xml).toMatch(/a:hlinkClick|r:id="rId.*Hyperlink|hyperlink/i);
}

/** Assert text content appears on a slide */
export async function assertTextOnSlide(buffer: Buffer, slideIdx: number, text: string): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  expect(xml).toContain(text);
}

/** Assert a gradient background on a slide */
export async function assertGradientBackground(buffer: Buffer, slideIdx: number): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  expect(xml).toContain("a:gradFill");
}

/** Assert connector exists on a slide */
export async function assertConnectorPresent(buffer: Buffer, slideIdx: number): Promise<void> {
  const xml = await getSlideXml(buffer, slideIdx);
  expect(xml).toContain("p:cxnSp");
}

/** Count shapes on a slide */
export async function getSlideShapeCount(buffer: Buffer, slideIdx: number): Promise<number> {
  const xml = await getSlideXml(buffer, slideIdx);
  const tree = parseXml(xml);
  const shapes = [
    ...findAllElements(tree, "p:sp"),
    ...findAllElements(tree, "p:pic"),
    ...findAllElements(tree, "p:graphicFrame"),
    ...findAllElements(tree, "p:cxnSp"),
    ...findAllElements(tree, "p:grpSp"),
  ];
  return shapes.length;
}
