import {
  createAccessibilityReport as createCanonicalAccessibilityReport,
  type AccessibilityIssue,
  type AccessibilityIssueCode,
  type AccessibilityLocation,
  type AccessibilityReport as CanonicalAccessibilityReport,
  type AccessibilitySummary as CanonicalAccessibilitySummary,
} from "./accessibility-contract.js";
import type { PaperDocument, PaperNode, PaperSlide } from "../types/ast.js";

export type AccessibilityLevel = "A" | "AA" | "AAA";

export type AccessibilityViolationCode =
  | "ALT_TEXT_MISSING"
  | "EMPTY_ALT_TEXT"
  | "TABLE_HEADER_MISSING"
  | "SLIDE_TITLE_MISSING"
  | "DOC_TITLE_MISSING"
  | "DOC_LANG_MISSING"
  | "READING_ORDER_VISUAL_MISMATCH"
  | "CONTRAST_RATIO";

export interface AccessibilityViolation {
  code: AccessibilityViolationCode;
  severity: "error" | "warning";
  message: string;
  slideIndex?: number;
  elementPath?: string;
  remediation: string;
}

export interface AccessibilityReport extends CanonicalAccessibilityReport {
  score: number;
  level: AccessibilityLevel;
  violations: AccessibilityViolation[];
  warnings: AccessibilityViolation[];
  summary: CanonicalAccessibilitySummary & {
    totalElements: number;
    withAltText: number;
    withoutAltText: number;
    decorativeMarked: number;
    tablesWithHeaders: number;
    tablesWithoutHeaders: number;
    slidesWithTitle: number;
    slidesWithoutTitle: number;
    languageSet: boolean;
    documentTitleSet: boolean;
  };
}

function normalizeDocumentMetadata(doc: PaperDocument): PaperDocument {
  const accessibilityConfig =
    doc.accessible && doc.accessible !== true ? doc.accessible : undefined;
  if (!accessibilityConfig) {
    return doc;
  }

  if (accessibilityConfig.language === undefined && accessibilityConfig.title === undefined) {
    return doc;
  }

  return {
    ...doc,
    meta: {
      ...doc.meta,
      language: accessibilityConfig.language ?? doc.meta?.language,
      title: accessibilityConfig.title ?? doc.meta?.title,
    },
  };
}

function mapLegacyViolationToCanonical(
  violation: AccessibilityViolation,
): AccessibilityIssue | undefined {
  let code: AccessibilityIssueCode | undefined;
  if (violation.code === "ALT_TEXT_MISSING" || violation.code === "EMPTY_ALT_TEXT") {
    code = "image.alt_missing";
  } else if (violation.code === "TABLE_HEADER_MISSING") {
    code = "table.header_missing";
  } else if (violation.code === "DOC_TITLE_MISSING") {
    code = "document.title_missing";
  } else if (violation.code === "DOC_LANG_MISSING") {
    code = "document.language_missing";
  }

  if (!code) {
    return undefined;
  }

  const location: AccessibilityLocation | undefined =
    violation.slideIndex !== undefined || violation.elementPath
      ? {
          slideIndex: violation.slideIndex,
          elementPath: violation.elementPath,
        }
      : undefined;

  return {
    code,
    severity: code === "document.title_missing" ? "warning" : violation.severity,
    message: violation.message,
    location,
    suggestedFix: violation.remediation,
  };
}

function walkNodes(
  nodes: PaperNode[],
  callback: (node: PaperNode, path: string) => void,
  parentPath = "",
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const path = parentPath ? `${parentPath}.children[${i}]` : `children[${i}]`;
    callback(node, path);
    if (node.type === "View" && node.children) {
      walkNodes(node.children, callback, path);
    } else if (node.type === "Group" && node.children) {
      walkNodes(node.children, callback, path);
    }
  }
}

function hasTextNode(nodes: PaperNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "Text") return true;
    if (node.type === "View" && node.children && hasTextNode(node.children)) return true;
    if (node.type === "Group" && node.children && hasTextNode(node.children)) return true;
  }
  return false;
}

const ALT_TEXT_TYPES = new Set(["Image", "Chart", "View", "Table", "Connector", "Group", "Video", "Audio"]);

function checkAltText(
  node: PaperNode,
  path: string,
  slideIndex: number,
  violations: AccessibilityViolation[],
): void {
  if (!ALT_TEXT_TYPES.has(node.type)) return;
  const n = node as { altText?: string; decorative?: boolean };
  if (n.decorative === true) return;

  if (n.altText === undefined || n.altText === null) {
    violations.push({
      code: "ALT_TEXT_MISSING",
      severity: "error",
      message: `${node.type} element at ${path} is missing alternative text.`,
      slideIndex,
      elementPath: path,
      remediation: "Add an altText property or mark the element as decorative.",
    });
  } else if (n.altText === "") {
    violations.push({
      code: "EMPTY_ALT_TEXT",
      severity: "warning",
      message: `${node.type} element at ${path} has empty alternative text.`,
      slideIndex,
      elementPath: path,
      remediation: "Provide a meaningful altText description or mark the element as decorative.",
    });
  }
}

function checkTableHeaders(
  node: PaperNode,
  path: string,
  slideIndex: number,
  violations: AccessibilityViolation[],
): void {
  if (node.type !== "Table") return;
  if (!node.tableData?.style?.firstRow) {
    violations.push({
      code: "TABLE_HEADER_MISSING",
      severity: "warning",
      message: `Table at ${path} does not have a header row defined.`,
      slideIndex,
      elementPath: path,
      remediation: "Set tableData.style.firstRow to true to designate the first row as a header.",
    });
  }
}

function checkSlideTitle(
  slide: PaperSlide,
  slideIndex: number,
  violations: AccessibilityViolation[],
): boolean {
  if (!hasTextNode(slide.children)) {
    violations.push({
      code: "SLIDE_TITLE_MISSING",
      severity: "warning",
      message: `Slide ${slideIndex + 1} has no text content that could serve as a title.`,
      slideIndex,
      elementPath: `slides[${slideIndex}]`,
      remediation: "Add a Text element to the slide to provide a title for screen readers.",
    });
    return false;
  }
  return true;
}

function checkDocTitle(doc: PaperDocument, violations: AccessibilityViolation[]): boolean {
  if (!doc.meta?.title) {
    violations.push({
      code: "DOC_TITLE_MISSING",
      severity: "error",
      message: "Document is missing a title in meta.title.",
      remediation: "Set meta.title to a descriptive document title.",
    });
    return false;
  }
  return true;
}

function checkDocLanguage(doc: PaperDocument, violations: AccessibilityViolation[]): boolean {
  if (!doc.meta?.language) {
    violations.push({
      code: "DOC_LANG_MISSING",
      severity: "warning",
      message: "Document language is not specified in meta.language.",
      remediation: "Set meta.language to a BCP 47 language tag (e.g. \"en\").",
    });
    return false;
  }
  return true;
}

interface PositionedElement {
  readingOrder: number;
  top: number;
  left: number;
}

function checkReadingOrder(
  slide: PaperSlide,
  slideIndex: number,
  violations: AccessibilityViolation[],
): void {
  const elements: PositionedElement[] = [];

  walkNodes(slide.children, (node, path) => {
    const n = node as { readingOrder?: number; style?: { top?: number; left?: number; position?: string } };
    if (n.readingOrder === undefined || n.readingOrder === null) return;
    const top = n.style?.top;
    const left = n.style?.left;
    if (top === undefined || left === undefined) return;
    elements.push({ readingOrder: n.readingOrder, top, left });
  });

  if (elements.length < 2) return;

  const byReadingOrder = [...elements].sort((a, b) => a.readingOrder - b.readingOrder);
  const byPosition = [...elements].sort((a, b) => a.top !== b.top ? a.top - b.top : a.left - b.left);

  let mismatches = 0;
  for (let i = 0; i < byReadingOrder.length; i++) {
    if (byReadingOrder[i] !== byPosition[i]) {
      mismatches++;
    }
  }

  if (mismatches > 0) {
    violations.push({
      code: "READING_ORDER_VISUAL_MISMATCH",
      severity: "warning",
      message: `Slide ${slideIndex + 1} has ${mismatches} element(s) where reading order contradicts visual position.`,
      slideIndex,
      elementPath: `slides[${slideIndex}]`,
      remediation: "Adjust readingOrder values to match the top-to-bottom, left-to-right visual layout.",
    });
  }
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | undefined {
  if (typeof hex !== "string") return undefined;
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]+$/.test(clean)) return undefined;

  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return undefined;
    return { r, g, b };
  }

  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return undefined;
    return { r, g, b };
  }

  return undefined;
}

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r / 255) + 0.7152 * linearize(g / 255) + 0.0722 * linearize(b / 255);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveBackgroundColor(slide: PaperSlide): string | undefined {
  if (slide.background?.type === "solid" && typeof slide.background.color === "string") {
    return slide.background.color;
  }
  return undefined;
}

function checkContrastRatio(
  node: PaperNode,
  path: string,
  slideIndex: number,
  slide: PaperSlide,
  violations: AccessibilityViolation[],
): void {
  if (node.type !== "Text") return;

  const textColor = node.style?.color;
  if (typeof textColor !== "string") return;

  const fgParsed = parseHexColor(textColor);
  if (!fgParsed) return;

  // Check parent backgroundColor — walk up isn't available, so check slide background
  const bgHex = resolveBackgroundColor(slide);
  if (!bgHex) return;

  const bgParsed = parseHexColor(bgHex);
  if (!bgParsed) return;

  const fgLum = relativeLuminance(fgParsed.r, fgParsed.g, fgParsed.b);
  const bgLum = relativeLuminance(bgParsed.r, bgParsed.g, bgParsed.b);
  const ratio = contrastRatio(fgLum, bgLum);

  if (ratio < 3) {
    violations.push({
      code: "CONTRAST_RATIO",
      severity: "error",
      message: `Text at ${path} has a contrast ratio of ${ratio.toFixed(2)}:1, below the 3:1 minimum.`,
      slideIndex,
      elementPath: path,
      remediation: "Increase the contrast between text color and background to at least 3:1.",
    });
  } else if (ratio < 4.5) {
    violations.push({
      code: "CONTRAST_RATIO",
      severity: "warning",
      message: `Text at ${path} has a contrast ratio of ${ratio.toFixed(2)}:1, below the 4.5:1 WCAG AA threshold for normal text.`,
      slideIndex,
      elementPath: path,
      remediation: "Increase the contrast between text color and background to at least 4.5:1 for WCAG AA compliance.",
    });
  }
}

export function validateAccessibility(doc: PaperDocument): AccessibilityReport {
  const normalized = normalizeDocumentMetadata(doc);
  const all: AccessibilityViolation[] = [];

  let totalElements = 0;
  let withAltText = 0;
  let withoutAltText = 0;
  let decorativeMarked = 0;
  let tablesWithHeaders = 0;
  let tablesWithoutHeaders = 0;
  let slidesWithTitle = 0;
  let slidesWithoutTitle = 0;

  const documentTitleSet = checkDocTitle(normalized, all);
  const languageSet = checkDocLanguage(normalized, all);

  for (let slideIndex = 0; slideIndex < normalized.slides.length; slideIndex++) {
    const slide = normalized.slides[slideIndex];

    if (checkSlideTitle(slide, slideIndex, all)) {
      slidesWithTitle++;
    } else {
      slidesWithoutTitle++;
    }

    checkReadingOrder(slide, slideIndex, all);

    walkNodes(slide.children, (node, path) => {
      const fullPath = `slides[${slideIndex}].${path}`;
      totalElements++;

      if (ALT_TEXT_TYPES.has(node.type)) {
        const n = node as { altText?: string; decorative?: boolean };
        if (n.decorative === true) {
          decorativeMarked++;
        } else if (n.altText && n.altText.length > 0) {
          withAltText++;
        } else {
          withoutAltText++;
        }
      }

      if (node.type === "Table") {
        if (node.tableData?.style?.firstRow) {
          tablesWithHeaders++;
        } else {
          tablesWithoutHeaders++;
        }
      }

      checkAltText(node, fullPath, slideIndex, all);
      checkTableHeaders(node, fullPath, slideIndex, all);
      checkContrastRatio(node, fullPath, slideIndex, slide, all);
    });
  }

  const errors = all.filter(v => v.severity === "error");
  const warnings = all.filter(v => v.severity === "warning");
  const score = Math.max(0, Math.min(100, 100 - (errors.length * 10) - (warnings.length * 3)));
  const canonicalIssues = all
    .map((violation) => mapLegacyViolationToCanonical(violation))
    .filter((issue): issue is AccessibilityIssue => issue !== undefined);
  const canonicalReport = createCanonicalAccessibilityReport({
    format: "pptx",
    issues: canonicalIssues,
    standard: "WCAG 2.2 AA",
  });

  let level: AccessibilityLevel = "A";
  if (score >= 95 && errors.length === 0) level = "AAA";
  else if (score >= 80 && errors.length === 0) level = "AA";

  return {
    ...canonicalReport,
    score,
    level,
    violations: errors,
    warnings,
    summary: {
      ...canonicalReport.summary,
      totalElements,
      withAltText,
      withoutAltText,
      decorativeMarked,
      tablesWithHeaders,
      tablesWithoutHeaders,
      slidesWithTitle,
      slidesWithoutTitle,
      languageSet,
      documentTitleSet,
    },
  };
}
