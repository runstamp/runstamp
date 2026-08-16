/**
 * DOCX Accessibility Validator
 * =============================
 * WCAG-informed accessibility heuristics for StructuredDocument.
 * Checks 9 local rules covering headings, images, tables, metadata, lists, and
 * contrast. This is not a substitute for Word's Accessibility Checker or a
 * WCAG conformance audit.
 */

import {
  createAccessibilityReport as createCanonicalAccessibilityReport,
  type AccessibilityIssue,
  type AccessibilityIssueCode,
  type AccessibilityLocation,
} from "./protocol.js";
import type {
  StructuredDocument,
  StructuredElement,
  HeadingElement,
  ParagraphElement,
  ImageElement,
  TableElement,
  ContainerElement,
  TextRun,
} from '../types.js';
import type {
  AccessibilityReport,
  AccessibilityViolation,
  AccessibilityLevel,
} from './types.js';
import { parseColor, contrastRatio } from '../core/color-utils.js';

function mapLegacyViolationToCanonical(
  violation: AccessibilityViolation,
): AccessibilityIssue | undefined {
  let code: AccessibilityIssueCode | undefined;

  if (violation.code === 'HEADING_SKIP') {
    code = 'structure.heading_skipped';
  } else if (violation.code === 'IMG_ALT_MISSING' || violation.code === 'IMG_ALT_EMPTY') {
    code = 'image.alt_missing';
  } else if (violation.code === 'TABLE_HEADER_MISSING') {
    code = 'table.header_missing';
  } else if (violation.code === 'DOC_TITLE_MISSING') {
    code = 'document.title_missing';
  } else if (violation.code === 'DOC_LANG_MISSING') {
    code = 'document.language_missing';
  }

  if (!code) {
    return undefined;
  }

  const location: AccessibilityLocation | undefined =
    violation.pageIndex !== undefined || violation.elementPath
      ? {
          pageIndex: violation.pageIndex,
          elementPath: violation.elementPath,
        }
      : undefined;

  return {
    code,
    severity: 'warning',
    message: violation.message,
    location,
    suggestedFix: violation.remediation,
  };
}

// =============================================================================
// ELEMENT TRAVERSAL
// =============================================================================

/**
 * Walk all elements in a page recursively, calling the callback with each
 * element and its path string.
 */
function walkElements(
  elements: StructuredElement[],
  pageIndex: number,
  callback: (el: StructuredElement, path: string, pageIndex: number) => void,
  parentPath: string,
): void {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const path = `${parentPath}.elements[${i}]`;
    callback(el, path, pageIndex);
    if (el.type === 'container') {
      walkElements((el as ContainerElement).children, pageIndex, callback, path);
    }
  }
}

/**
 * Walk all elements across all pages.
 */
function walkDocument(
  doc: StructuredDocument,
  callback: (el: StructuredElement, path: string, pageIndex: number) => void,
): void {
  for (let p = 0; p < doc.pages.length; p++) {
    const page = doc.pages[p];
    walkElements(page.elements, p, callback, `page[${p}]`);
  }
}

// =============================================================================
// FAUX-LIST DETECTION PATTERNS
// =============================================================================

/** Bullet characters that indicate a faux-list paragraph */
const BULLET_CHARS = new Set(['\u2022', '\u25E6', '\u25AA', '-', '*']);

/** Regex for numbered faux-list patterns: "1.", "2.", "a.", "b.", "i.", "ii.", etc. */
const NUMBERED_PATTERN = /^(?:\d+\.|[a-z]\.|[ivxlcdm]+\.)\s/i;

/**
 * Check whether a paragraph's text looks like it starts with a faux-list marker.
 */
function isFauxListParagraph(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed) return false;

  // Check bullet chars
  if (BULLET_CHARS.has(trimmed[0])) return true;

  // Check numbered/lettered patterns
  if (NUMBERED_PATTERN.test(trimmed)) return true;

  return false;
}

// =============================================================================
// INDIVIDUAL RULE CHECKS
// =============================================================================

/**
 * Rule 1: HEADING_SKIP (WCAG 1.3.1)
 * Heading levels must not skip (e.g. H1 -> H3 without H2).
 */
function checkHeadingHierarchy(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
): string[] {
  const headings: { level: number; path: string; pageIndex: number }[] = [];

  walkDocument(doc, (el, path, pageIndex) => {
    if (el.type === 'heading') {
      headings.push({ level: (el as HeadingElement).level, path, pageIndex });
    }
  });

  const skippedLevels: string[] = [];

  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const curr = headings[i];

    // A skip occurs when going to a deeper level and skipping intermediate levels
    if (curr.level > prev.level + 1) {
      const skipped: string[] = [];
      for (let lvl = prev.level + 1; lvl < curr.level; lvl++) {
        skipped.push(`H${lvl}`);
      }
      const skipDesc = `H${prev.level} -> H${curr.level}`;
      skippedLevels.push(skipDesc);

      violations.push({
        code: 'HEADING_SKIP',
        severity: 'error',
        message: `Heading hierarchy skips from H${prev.level} to H${curr.level} (missing ${skipped.join(', ')}).`,
        pageIndex: curr.pageIndex,
        elementPath: curr.path,
        wcagCriterion: '1.3.1',
        remediation: `Insert heading level(s) ${skipped.join(', ')} between H${prev.level} and H${curr.level}, or adjust the heading level.`,
      });
    }
  }

  return skippedLevels;
}

/**
 * Rule 2 & 3: IMG_ALT_MISSING / IMG_ALT_EMPTY (WCAG 1.1.1)
 */
function checkImageAlt(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
  summary: {
    imagesTotal: number;
    imagesWithAlt: number;
    imagesDecorativeMarked: number;
  },
): void {
  walkDocument(doc, (el, path, pageIndex) => {
    if (el.type !== 'image') return;
    const img = el as ImageElement;
    summary.imagesTotal++;

    if (img.decorative === true) {
      summary.imagesDecorativeMarked++;
      return;
    }

    if (img.alt === undefined || img.alt === null) {
      violations.push({
        code: 'IMG_ALT_MISSING',
        severity: 'error',
        message: `Image at ${path} is missing alternative text.`,
        pageIndex,
        elementPath: path,
        wcagCriterion: '1.1.1',
        remediation: 'Add an alt property with a meaningful description, or set decorative to true.',
      });
    } else if (img.alt === '') {
      summary.imagesWithAlt++; // counted as "has alt" but empty
      violations.push({
        code: 'IMG_ALT_EMPTY',
        severity: 'warning',
        message: `Image at ${path} has empty alternative text.`,
        pageIndex,
        elementPath: path,
        wcagCriterion: '1.1.1',
        remediation: 'Provide a meaningful alt text description, or set decorative to true if the image is purely decorative.',
      });
    } else {
      summary.imagesWithAlt++;
    }
  });
}

/**
 * Rule 4: TABLE_HEADER_MISSING (WCAG 1.3.1)
 */
function checkTableHeaders(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
  summary: { tablesTotal: number; tablesWithHeaders: number },
): void {
  walkDocument(doc, (el, path, pageIndex) => {
    if (el.type !== 'table') return;
    const table = el as TableElement;
    summary.tablesTotal++;

    if (!table.headerRowCount) {
      violations.push({
        code: 'TABLE_HEADER_MISSING',
        severity: 'warning',
        message: `Table at ${path} has no header rows defined.`,
        pageIndex,
        elementPath: path,
        wcagCriterion: '1.3.1',
        remediation: 'Set headerRowCount to at least 1 to designate header rows for screen readers.',
      });
    } else {
      summary.tablesWithHeaders++;
    }
  });
}

/**
 * Rule 5: TABLE_CAPTION_MISSING (WCAG 1.3.1)
 */
function checkTableCaptions(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
  summary: { tablesWithCaptions: number },
): void {
  walkDocument(doc, (el, path, pageIndex) => {
    if (el.type !== 'table') return;
    const table = el as TableElement;

    if (!table.caption && !table.tableCaption) {
      violations.push({
        code: 'TABLE_CAPTION_MISSING',
        severity: 'warning',
        message: `Table at ${path} has no caption or tableCaption.`,
        pageIndex,
        elementPath: path,
        wcagCriterion: '1.3.1',
        remediation: 'Add a caption or tableCaption property to describe the table\'s purpose.',
      });
    } else {
      summary.tablesWithCaptions++;
    }
  });
}

/**
 * Rule 6: DOC_TITLE_MISSING (WCAG 2.4.2)
 */
function checkDocTitle(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
): boolean {
  if (!doc.metadata.title) {
    violations.push({
      code: 'DOC_TITLE_MISSING',
      severity: 'error',
      message: 'Document is missing a title in metadata.title.',
      wcagCriterion: '2.4.2',
      remediation: 'Set metadata.title to a descriptive document title.',
    });
    return false;
  }
  return true;
}

/**
 * Rule 7: DOC_LANG_MISSING (WCAG 3.1.1)
 */
function checkDocLanguage(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
): boolean {
  const lang = (doc.metadata as any).language;
  if (!lang) {
    violations.push({
      code: 'DOC_LANG_MISSING',
      severity: 'error',
      message: 'Document language is not specified in metadata.language.',
      wcagCriterion: '3.1.1',
      remediation: 'Set metadata.language to a BCP 47 language tag (e.g. "en-US").',
    });
    return false;
  }
  return true;
}

/**
 * Rule 8: LIST_SEMANTIC_MISSING (WCAG 1.3.1)
 * Detect paragraphs that look like list items but aren't inside a list element.
 */
function checkFauxLists(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
): void {
  walkDocument(doc, (el, path, pageIndex) => {
    if (el.type !== 'paragraph') return;
    const para = el as ParagraphElement;

    if (isFauxListParagraph(para.text)) {
      violations.push({
        code: 'LIST_SEMANTIC_MISSING',
        severity: 'warning',
        message: `Paragraph at ${path} appears to be a list item but is not inside a list element.`,
        pageIndex,
        elementPath: path,
        wcagCriterion: '1.3.1',
        remediation: 'Convert faux-list paragraphs to proper list elements for correct semantic structure.',
      });
    }
  });
}

/**
 * Rule 9: CONTRAST_INSUFFICIENT (WCAG 1.4.3)
 * Check text runs where both foreground and background colors are explicitly set.
 */
function checkContrast(
  doc: StructuredDocument,
  violations: AccessibilityViolation[],
): number {
  let contrastIssues = 0;

  /**
   * Check a single text run for contrast issues.
   */
  function checkRun(
    run: TextRun,
    path: string,
    pageIndex: number,
    runIndex: number,
  ): void {
    // Only check if both colors are explicitly set
    if (!run.color || !run.backgroundColor) return;

    const fgHex = parseColor(run.color);
    const bgHex = parseColor(run.backgroundColor);
    if (!fgHex || !bgHex) return;

    const ratio = contrastRatio(fgHex, bgHex);

    // Determine if text is "large" per WCAG:
    // >= 18pt, or >= 14pt bold
    const isLarge = run.fontSize >= 18 ||
      (run.fontSize >= 14 && (run.fontWeight === 'bold' || (typeof run.fontWeight === 'number' && run.fontWeight >= 700)));

    const threshold = isLarge ? 3 : 4.5;

    if (ratio < threshold) {
      contrastIssues++;
      violations.push({
        code: 'CONTRAST_INSUFFICIENT',
        severity: 'warning',
        message: `Text run at ${path}.runs[${runIndex}] has contrast ratio ${ratio.toFixed(2)}:1 (requires ${threshold}:1 for ${isLarge ? 'large' : 'normal'} text).`,
        pageIndex,
        elementPath: `${path}.runs[${runIndex}]`,
        wcagCriterion: '1.4.3',
        remediation: `Increase contrast between text color (#${fgHex}) and background (#${bgHex}) to at least ${threshold}:1.`,
      });
    }
  }

  walkDocument(doc, (el, path, pageIndex) => {
    // Check runs on heading, paragraph, text-run elements
    if (el.type === 'heading' || el.type === 'paragraph' || el.type === 'text-run') {
      const runs = (el as HeadingElement | ParagraphElement).runs;
      if (runs) {
        for (let i = 0; i < runs.length; i++) {
          checkRun(runs[i], path, pageIndex, i);
        }
      }
    }

    // Check runs inside shape text
    if (el.type === 'shape' && (el as any).runs) {
      const runs = (el as any).runs as TextRun[];
      for (let i = 0; i < runs.length; i++) {
        checkRun(runs[i], path, pageIndex, i);
      }
    }
  });

  return contrastIssues;
}

// =============================================================================
// MAIN VALIDATOR
// =============================================================================

/**
 * Run DOCX accessibility heuristics over a StructuredDocument.
 * Returns a detailed report with score, violations, warnings, and summary.
 */
export function validateAccessibility(doc: StructuredDocument): AccessibilityReport {
  const allViolations: AccessibilityViolation[] = [];

  // Summary counters
  let totalElements = 0;
  const imageSummary = { imagesTotal: 0, imagesWithAlt: 0, imagesDecorativeMarked: 0 };
  const tableSummary = { tablesTotal: 0, tablesWithHeaders: 0, tablesWithCaptions: 0 };

  // Count total elements
  walkDocument(doc, () => { totalElements++; });

  // Rule 1: Heading hierarchy
  const skippedHeadingLevels = checkHeadingHierarchy(doc, allViolations);

  // Rule 2 & 3: Image alt text
  checkImageAlt(doc, allViolations, imageSummary);

  // Rule 4: Table headers
  checkTableHeaders(doc, allViolations, tableSummary);

  // Rule 5: Table captions
  checkTableCaptions(doc, allViolations, tableSummary);

  // Rule 6: Document title
  const documentTitleSet = checkDocTitle(doc, allViolations);

  // Rule 7: Document language
  const documentLanguageSet = checkDocLanguage(doc, allViolations);

  // Rule 8: Faux-list detection
  checkFauxLists(doc, allViolations);

  // Rule 9: Contrast
  const colorContrastIssues = checkContrast(doc, allViolations);

  // Separate errors and warnings
  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');
  const canonicalIssues = allViolations
    .map((violation) => mapLegacyViolationToCanonical(violation))
    .filter((issue): issue is AccessibilityIssue => issue !== undefined);
  const canonicalReport = createCanonicalAccessibilityReport({
    format: 'docx',
    issues: canonicalIssues,
    standard: 'Runstamp DOCX accessibility heuristics (WCAG-informed)',
  });

  // Scoring: 100 - (errors * 10) - (warnings * 3), clamped to [0, 100]
  const score = Math.max(0, Math.min(100, 100 - (errors.length * 10) - (warnings.length * 3)));

  // Heuristic rating retained for API compatibility. These labels do not
  // constitute WCAG conformance levels.
  let level: AccessibilityLevel = 'A';
  if (score >= 95 && errors.length === 0) level = 'AAA';
  else if (score >= 80 && errors.length === 0) level = 'AA';

  return {
    ...canonicalReport,
    score,
    level,
    violations: errors,
    warnings,
    summary: {
      ...canonicalReport.summary,
      totalElements,
      imagesTotal: imageSummary.imagesTotal,
      imagesWithAlt: imageSummary.imagesWithAlt,
      imagesDecorativeMarked: imageSummary.imagesDecorativeMarked,
      tablesTotal: tableSummary.tablesTotal,
      tablesWithHeaders: tableSummary.tablesWithHeaders,
      tablesWithCaptions: tableSummary.tablesWithCaptions,
      headingHierarchyValid: skippedHeadingLevels.length === 0,
      documentTitleSet,
      documentLanguageSet,
      colorContrastIssues,
      skippedHeadingLevels,
    },
  };
}
