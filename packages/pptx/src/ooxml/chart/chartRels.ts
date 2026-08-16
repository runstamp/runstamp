// src/ooxml/chart/chartRels.ts — Chart relationship generator
import { generateRelationshipsXml, type PackageRelationship } from "../packageManifest.js";

const REL_TYPES = {
  package: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package",
  chartUserShapes: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartUserShapes",
} as const;

/**
 * Generates .rels for ChartEx charts (no style/colors needed for modern chart types).
 */
export function generateChartExRels(excelRelPath: string): string {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES.package, target: excelRelPath },
  ]);
}

/**
 * Generates simple .rels for a classic chart — only the embedded Excel workbook.
 * No style/colors companion files (avoids srgbClr/schemeClr mismatch that
 * triggers PowerPoint Mac repair dialog).
 */
export function generateChartRelsSimple(excelRelPath: string): string {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES.package, target: excelRelPath },
  ]);
}

/**
 * Generates simple .rels for a chart with Excel and chartDrawing (annotations),
 * but no style/colors companion files.
 */
export function generateChartRelsWithDrawingSimple(excelRelPath: string, drawingRelPath: string): string {
  const relationships: PackageRelationship[] = [
    { id: "rId1", type: REL_TYPES.package, target: excelRelPath },
    { id: "rId2", type: REL_TYPES.chartUserShapes, target: drawingRelPath },
  ];
  return generateRelationshipsXml(relationships);
}
