import { createHash } from "node:crypto";
import type { QualityReport } from "./report.js";
import type { PaperDocument, PaperNode } from "../types/ast.js";

export type FailureFamily =
  | "long_text"
  | "tables"
  | "mixed_fonts"
  | "chartex"
  | "template_mutation"
  | "media"
  | "comments_notes"
  | "animations"
  | "malformed_ast"
  | "chart_layout"
  | "font_substitution"
  | "template_placeholder";

export interface CorpusBinaryAsset {
  key: string;
  buffer: Buffer;
  sha256: string;
  byteLength: number;
}

export interface CorpusAnonymizeResult {
  document: unknown;
  binaries: CorpusBinaryAsset[];
}

const CHART_EX_TYPES = new Set([
  "treemap",
  "sunburst",
  "histogram",
  "boxWhisker",
]);

const TEXT_KEYS = new Set([
  "content",
  "text",
  "title",
  "subject",
  "description",
  "notes",
  "altText",
  "subtitle",
  "author",
  "company",
  "comments",
]);

const URL_KEYS = new Set(["src", "url", "href"]);

function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function maskFreeformString(value: string): string {
  return value.replace(/[A-Z]/g, "X")
    .replace(/[a-z]/g, "x")
    .replace(/[0-9]/g, "0");
}

function anonymizeUrl(value: string): string {
  if (value.startsWith("data:")) {
    const mime = value.slice(5, value.indexOf(";")) || "application/octet-stream";
    return `data:${mime};base64,REDACTED`;
  }
  if (/^https?:\/\//i.test(value)) {
    return "https://redacted.invalid/asset";
  }
  return maskFreeformString(value);
}

function visitNode(
  value: unknown,
  key: string | undefined,
  binaries: CorpusBinaryAsset[],
): unknown {
  if (Buffer.isBuffer(value)) {
    const assetKey = key === "template"
      ? "template.pptx"
      : `binary-${binaries.length + 1}.bin`;
    binaries.push({
      key: assetKey,
      buffer: value,
      sha256: hashBuffer(value),
      byteLength: value.byteLength,
    });
    return {
      $binary: assetKey,
      sha256: hashBuffer(value),
      byteLength: value.byteLength,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => visitNode(entry, key, binaries));
  }

  if (typeof value === "string") {
    if (key && URL_KEYS.has(key)) return anonymizeUrl(value);
    if (key && TEXT_KEYS.has(key)) return maskFreeformString(value);
    return value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = visitNode(childValue, childKey, binaries);
  }
  return result;
}

export function anonymizeCorpusValue(value: unknown): CorpusAnonymizeResult {
  const binaries: CorpusBinaryAsset[] = [];
  return {
    document: visitNode(value, undefined, binaries),
    binaries,
  };
}

export function anonymizeCorpusDocument(doc: PaperDocument): CorpusAnonymizeResult {
  return anonymizeCorpusValue(doc);
}

function walkNodes(
  nodes: PaperNode[] | undefined,
  visit: (node: PaperNode) => void,
): void {
  if (!nodes) return;
  for (const node of nodes) {
    visit(node);
    if ("children" in node && Array.isArray(node.children)) {
      walkNodes(node.children, visit);
    }
  }
}

export function classifyFailureFamilies(
  doc: PaperDocument,
  qualityReport?: QualityReport,
  errorMessage?: string,
): FailureFamily[] {
  const families = new Set<FailureFamily>();
  const fontFamilies = new Set<string>();
  let longestText = 0;

  if (doc.template) families.add("template_mutation");
  if (doc.slides.some(slide => slide.notes)) families.add("comments_notes");
  if (doc.slides.some(slide => slide.transition)) families.add("animations");
  if (doc.slides.some(slide => (slide as { comments?: unknown[] }).comments?.length)) {
    families.add("comments_notes");
  }

  for (const slide of doc.slides) {
    walkNodes(slide.children, (node) => {
      if (node.type === "Text") {
        const text = typeof node.content === "string"
          ? node.content
          : Array.isArray(node.content)
            ? node.content.map(run => run.text).join("")
            : "";
        longestText = Math.max(longestText, text.length);
        if (node.style?.fontFamily) fontFamilies.add(node.style.fontFamily);
      }
      if (node.type === "View") {
        if (node.textStyle?.fontFamily) fontFamilies.add(node.textStyle.fontFamily);
        if (typeof node.textContent === "string") {
          longestText = Math.max(longestText, node.textContent.length);
        }
      }
      if (node.type === "Table") families.add("tables");
      if (node.type === "Chart") {
        if (CHART_EX_TYPES.has(node.chartData.chartType)) families.add("chartex");
      }
      if (node.type === "Image" || node.type === "Video" || node.type === "Audio") {
        families.add("media");
      }
      if ("placeholder" in node && node.placeholder) {
        families.add("template_mutation");
      }
      if ("animations" in node && Array.isArray((node as { animations?: unknown[] }).animations) && (node as { animations?: unknown[] }).animations!.length > 0) {
        families.add("animations");
      }
    });

    if (slide.background?.type === "image") families.add("media");
  }

  if (longestText >= 300 || doc.slides.length >= 10) families.add("long_text");
  if (fontFamilies.size >= 3) families.add("mixed_fonts");

  for (const slide of qualityReport?.slideReports ?? []) {
    for (const issue of slide.issues) {
      if (issue.issueClass === "chart_layout_risk") families.add("chart_layout");
      if (issue.issueClass === "font_substitution_risk") families.add("font_substitution");
      if (issue.issueClass === "template_placeholder_risk") families.add("template_placeholder");
    }
  }

  if (qualityReport?.templateReport?.templateSupportLevel === "unsafe") {
    families.add("template_placeholder");
  }

  if (errorMessage && /validation failed|invalid paperdocument|zod|schema/i.test(errorMessage)) {
    families.add("malformed_ast");
  }

  return [...families].sort();
}
