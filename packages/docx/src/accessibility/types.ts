/**
 * DOCX Accessibility Validator Types
 * ===================================
 * WCAG-based accessibility validation for StructuredDocument.
 */

import type {
  AccessibilityIssue,
  AccessibilityReport as CanonicalAccessibilityReport,
  AccessibilitySummary as CanonicalAccessibilitySummary,
} from "./protocol.js";

export type AccessibilityLevel = 'A' | 'AA' | 'AAA';

export type DocxAccessibilityViolationCode =
  | 'HEADING_SKIP'
  | 'IMG_ALT_MISSING'
  | 'IMG_ALT_EMPTY'
  | 'TABLE_HEADER_MISSING'
  | 'TABLE_CAPTION_MISSING'
  | 'DOC_TITLE_MISSING'
  | 'DOC_LANG_MISSING'
  | 'LIST_SEMANTIC_MISSING'
  | 'CONTRAST_INSUFFICIENT';

export interface AccessibilityViolation {
  code: DocxAccessibilityViolationCode;
  severity: 'error' | 'warning';
  message: string;
  pageIndex?: number;
  elementPath?: string;
  wcagCriterion: string;
  remediation: string;
}

export interface AccessibilityReport extends CanonicalAccessibilityReport {
  score: number;
  level: AccessibilityLevel;
  violations: AccessibilityViolation[];
  warnings: AccessibilityViolation[];
  issues: AccessibilityIssue[];
  summary: CanonicalAccessibilitySummary & {
    totalElements: number;
    imagesTotal: number;
    imagesWithAlt: number;
    imagesDecorativeMarked: number;
    tablesTotal: number;
    tablesWithHeaders: number;
    tablesWithCaptions: number;
    headingHierarchyValid: boolean;
    documentTitleSet: boolean;
    documentLanguageSet: boolean;
    colorContrastIssues: number;
    skippedHeadingLevels: string[];
  };
}
