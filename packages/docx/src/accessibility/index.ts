/**
 * DOCX Accessibility Module
 * =========================
 * Pro-gated accessibility validation for StructuredDocument.
 */

import { validateAccessibility as _validate } from './validator.js';
import { remediateAccessibility as _remediate } from './remediator.js';
import { docxToStructured } from '../adapters/docx-to-structured.js';
import { DocxDocumentSchema, type DocxDocument } from '../schema.js';
import type { StructuredDocument } from '../types.js';

export type {
  AccessibilityReport,
  AccessibilityViolation,
  AccessibilityLevel,
  DocxAccessibilityViolationCode,
} from './types.js';
export type { AccessibilityRemediationResult } from './remediator.js';

function isDocxDocument(input: unknown): input is DocxDocument {
  return Boolean(input)
    && typeof input === 'object'
    && !Array.isArray(input)
    && (input as { type?: unknown }).type === 'DocxDocument';
}

function normalizeInput(input: StructuredDocument | DocxDocument): {
  document: StructuredDocument;
  accessibilityConfig: { title?: string; language?: string } | undefined;
} {
  if (isDocxDocument(input)) {
    const parsed = DocxDocumentSchema.parse(input);
    const accessibilityConfig = parsed.accessible && parsed.accessible !== true
      ? {
          title: parsed.accessible.title,
          language: parsed.accessible.language,
        }
      : undefined;

    return {
      document: docxToStructured(parsed),
      accessibilityConfig,
    };
  }

  return {
    document: input,
    accessibilityConfig: undefined,
  };
}

export function validateAccessibility(
  input: StructuredDocument | DocxDocument,
): import('./types.js').AccessibilityReport {
  return _validate(normalizeInput(input).document);
}

export function remediateAccessibility(
  input: StructuredDocument | DocxDocument,
): import('./remediator.js').AccessibilityRemediationResult {
  const normalized = normalizeInput(input);
  return _remediate(normalized.document, normalized.accessibilityConfig);
}
