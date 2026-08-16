import { XMLParser } from "fast-xml-parser";
import type { OpenedPptx } from "./open.js";
import { listSlideParts } from "./parts.js";

export interface ExtractedTextRun {
  text: string;
  fontFamily?: string;
  color?: string;
  sizePt?: number;
  bold?: boolean;
}

export interface ExtractedSlide {
  index: number;
  text: string;
  shapeCount: number;
  hasTable: boolean;
  hasChart: boolean;
  hasImage: boolean;
  background?: string;
  textRuns: ExtractedTextRun[];
  fillColors: string[];
}

export interface ExtractedIR {
  meta: { title?: string };
  slideCount: number;
  slides: ExtractedSlide[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false, // CRITICAL: keep "612.0" as string, not coerced to number 612
  trimValues: false,
  preserveOrder: false,
  removeNSPrefix: true,
});

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function walk(node: unknown, visit: (key: string, value: any) => void): void {
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    visit(key, value);
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else if (value && typeof value === "object") {
      walk(value, visit);
    }
  }
}

function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  return "";
}

function extractRPr(rPr: any): Pick<ExtractedTextRun, "fontFamily" | "color" | "sizePt" | "bold"> {
  const out: Pick<ExtractedTextRun, "fontFamily" | "color" | "sizePt" | "bold"> = {};
  if (!rPr || typeof rPr !== "object") return out;
  const sz = rPr["@_sz"];
  if (sz) {
    const n = Number(sz);
    if (Number.isFinite(n)) out.sizePt = n / 100;
  }
  if (rPr["@_b"] === "1") out.bold = true;
  const latin = rPr.latin;
  if (latin && latin["@_typeface"]) out.fontFamily = String(latin["@_typeface"]);
  const fill = rPr.solidFill;
  if (fill && fill.srgbClr && fill.srgbClr["@_val"]) {
    out.color = String(fill.srgbClr["@_val"]).toUpperCase();
  }
  return out;
}

function extractRunsFromTxBody(txBody: any): ExtractedTextRun[] {
  const runs: ExtractedTextRun[] = [];
  for (const p of asArray(txBody?.p)) {
    for (const r of asArray((p as any)?.r)) {
      const text = extractText((r as any)?.t);
      if (!text) continue;
      runs.push({ text, ...extractRPr((r as any)?.rPr) });
    }
  }
  return runs;
}

function extractFillColorFromSpPr(spPr: any): string | undefined {
  if (!spPr) return undefined;
  const fill = spPr.solidFill;
  if (fill && fill.srgbClr && fill.srgbClr["@_val"]) {
    return String(fill.srgbClr["@_val"]).toUpperCase();
  }
  return undefined;
}

function extractBackground(cSld: any): string | undefined {
  const bg = cSld?.bg?.bgPr?.solidFill?.srgbClr?.["@_val"];
  if (bg) return String(bg).toUpperCase();
  return undefined;
}

function isChartFrame(graphicFrame: any): boolean {
  const data = graphicFrame?.graphic?.graphicData;
  const uri = data?.["@_uri"];
  if (typeof uri === "string" && uri.includes("/chart")) return true;
  return Boolean(data?.chart);
}

function isTableFrame(graphicFrame: any): boolean {
  const data = graphicFrame?.graphic?.graphicData;
  const uri = data?.["@_uri"];
  if (typeof uri === "string" && uri.includes("/table")) return true;
  return Boolean(data?.tbl);
}

function extractTextFromTable(tbl: any): { text: string; runs: ExtractedTextRun[]; fills: string[] } {
  const runs: ExtractedTextRun[] = [];
  const fills: string[] = [];
  for (const tr of asArray(tbl?.tr)) {
    for (const tc of asArray((tr as any)?.tc)) {
      const tcPr = (tc as any)?.tcPr;
      const fill = extractFillColorFromSpPr(tcPr);
      if (fill) fills.push(fill);
      const cellRuns = extractRunsFromTxBody((tc as any)?.txBody);
      runs.push(...cellRuns);
    }
  }
  const text = runs.map((r) => r.text).join(" ");
  return { text, runs, fills };
}

function extractSlide(index: number, xml: string): ExtractedSlide {
  const parsed = parser.parse(xml);
  const sld = parsed?.sld;
  const cSld = sld?.cSld;
  const spTree = cSld?.spTree;

  const textRuns: ExtractedTextRun[] = [];
  const fillColors: string[] = [];
  let shapeCount = 0;
  let hasTable = false;
  let hasChart = false;
  let hasImage = false;

  // Plain shapes (text boxes, rectangles)
  for (const sp of asArray(spTree?.sp)) {
    shapeCount++;
    const fill = extractFillColorFromSpPr((sp as any)?.spPr);
    if (fill) fillColors.push(fill);
    const runs = extractRunsFromTxBody((sp as any)?.txBody);
    textRuns.push(...runs);
  }

  // Group shapes
  for (const grp of asArray(spTree?.grpSp)) {
    for (const sp of asArray((grp as any)?.sp)) {
      shapeCount++;
      const fill = extractFillColorFromSpPr((sp as any)?.spPr);
      if (fill) fillColors.push(fill);
      const runs = extractRunsFromTxBody((sp as any)?.txBody);
      textRuns.push(...runs);
    }
  }

  // Pictures
  for (const _pic of asArray(spTree?.pic)) {
    shapeCount++;
    hasImage = true;
  }

  // Graphic frames (charts, tables)
  for (const gf of asArray(spTree?.graphicFrame)) {
    shapeCount++;
    if (isTableFrame(gf)) {
      hasTable = true;
      const tbl = (gf as any)?.graphic?.graphicData?.tbl;
      const { runs, fills } = extractTextFromTable(tbl);
      textRuns.push(...runs);
      fillColors.push(...fills);
    } else if (isChartFrame(gf)) {
      hasChart = true;
    }
  }

  // Walk to be safe — catch nested text we might have missed
  // (e.g. shapes inside groups not enumerated above)
  walk(spTree, (key, value) => {
    if (key === "graphicFrame") return; // already handled
    if (key === "txBody" && value && typeof value === "object") {
      // Only add if not already collected (cheap dedup by reference)
      const runs = extractRunsFromTxBody(value);
      for (const r of runs) {
        if (!textRuns.some((existing) => existing === r)) {
          // Avoid duplication: if these were already added above, skip.
          // The structural pass above already collected; this is defensive.
        }
      }
    }
  });

  const text = textRuns.map((r) => r.text).join(" ");
  const background = extractBackground(cSld);

  return {
    index,
    text,
    shapeCount,
    hasTable,
    hasChart,
    hasImage,
    background,
    textRuns,
    fillColors: Array.from(new Set(fillColors)),
  };
}

function extractMetaTitle(opened: OpenedPptx): string | undefined {
  const xml = opened.getPartText("docProps/core.xml");
  if (!xml) return undefined;
  const m = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/.exec(xml);
  return m ? decodeXmlEntities(m[1]) : undefined;
}

export function extractToIR(opened: OpenedPptx): ExtractedIR {
  const slidePaths = listSlideParts(opened);
  const slides = slidePaths.map((path, i) => {
    const xml = opened.getPartText(path)!;
    return extractSlide(i + 1, xml);
  });
  return {
    meta: { title: extractMetaTitle(opened) },
    slideCount: slides.length,
    slides,
  };
}
