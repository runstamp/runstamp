import JSZip from "jszip";
import type { QualityReport } from "./report.js";

export type PptxEditableComponentKind =
  | "native_chart"
  | "native_table"
  | "native_bullet_paragraph"
  | "native_connector"
  | "preset_geometry"
  | "picture";

export interface PptxEditableComponentProbe {
  slideIndex: number;
  kind: PptxEditableComponentKind;
  count: number;
  native: boolean;
}

export interface PptxSlideEditabilityProbe {
  slideIndex: number;
  nativeChartCount: number;
  nativeTableCount: number;
  nativeBulletParagraphCount: number;
  nativeConnectorCount: number;
  presetGeometryCount: number;
  pictureCount: number;
  components: PptxEditableComponentProbe[];
}

export interface PptxEditabilityProbeReport {
  status: "passed" | "failed";
  slideCount: number;
  nativeComponentCount: number;
  visualOnlyComponentCount: number;
  slides: PptxSlideEditabilityProbe[];
  failures: string[];
}

export interface QualityReportWithEditabilityProbe extends QualityReport {
  editabilityProbe?: PptxEditabilityProbeReport;
}

function countMatches(xml: string, pattern: RegExp): number {
  return Array.from(xml.matchAll(pattern)).length;
}

function component(
  slideIndex: number,
  kind: PptxEditableComponentKind,
  count: number,
  native: boolean,
): PptxEditableComponentProbe[] {
  if (count <= 0) return [];
  return [{ slideIndex, kind, count, native }];
}

function inspectSlideXml(slideIndex: number, xml: string): PptxSlideEditabilityProbe {
  const nativeChartCount = countMatches(xml, /<c:chart\b/g);
  const nativeTableCount = countMatches(xml, /<a:tbl\b/g);
  const nativeBulletParagraphCount = countMatches(xml, /<a:(?:buChar|buAutoNum|buBlip)\b/g);
  const nativeConnectorCount = countMatches(xml, /<p:cxnSp\b/g);
  const presetGeometryCount = countMatches(xml, /<a:prstGeom\b/g);
  const pictureCount = countMatches(xml, /<p:pic\b/g);
  const components = [
    ...component(slideIndex, "native_chart", nativeChartCount, true),
    ...component(slideIndex, "native_table", nativeTableCount, true),
    ...component(slideIndex, "native_bullet_paragraph", nativeBulletParagraphCount, true),
    ...component(slideIndex, "native_connector", nativeConnectorCount, true),
    ...component(slideIndex, "preset_geometry", presetGeometryCount, true),
    ...component(slideIndex, "picture", pictureCount, false),
  ];

  return {
    slideIndex,
    nativeChartCount,
    nativeTableCount,
    nativeBulletParagraphCount,
    nativeConnectorCount,
    presetGeometryCount,
    pictureCount,
    components,
  };
}

export async function inspectPptxEditability(buffer: Buffer): Promise<PptxEditabilityProbeReport> {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const aIdx = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const bIdx = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return aIdx - bIdx;
    });

  const slides: PptxSlideEditabilityProbe[] = [];
  const failures: string[] = [];

  for (const path of slidePaths) {
    const slideIndex = Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? slides.length + 1) - 1;
    const entry = zip.file(path);
    if (!entry) {
      failures.push(`Missing slide XML at ${path}.`);
      continue;
    }
    slides.push(inspectSlideXml(slideIndex, await entry.async("string")));
  }

  const nativeComponentCount = slides.reduce((sum, slide) => (
    sum
    + slide.nativeChartCount
    + slide.nativeTableCount
    + slide.nativeBulletParagraphCount
    + slide.nativeConnectorCount
    + slide.presetGeometryCount
  ), 0);
  const visualOnlyComponentCount = slides.reduce((sum, slide) => sum + slide.pictureCount, 0);

  return {
    status: failures.length === 0 ? "passed" : "failed",
    slideCount: slidePaths.length,
    nativeComponentCount,
    visualOnlyComponentCount,
    slides,
    failures,
  };
}

export function mergeEditabilityProbeIntoQualityReport(
  report: QualityReport,
  editabilityProbe: PptxEditabilityProbeReport,
): QualityReportWithEditabilityProbe {
  return {
    ...report,
    editabilityProbe,
  };
}
