/**
 * Quality Checker
 * ===============
 * Validates PolyglotDocument structure and content quality.
 * Returns a quality score and detailed check results.
 */

import type { PolyglotDocument, PolyglotNode } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type QualitySeverity = 'critical' | 'major' | 'minor';

export interface QualityCheck {
  /** Unique check ID */
  id: string;
  /** Human-readable check name */
  name: string;
  /** Severity level */
  severity: QualitySeverity;
  /** Check function */
  check: (doc: PolyglotDocument) => QualityResult;
}

export interface QualityResult {
  /** Whether the check passed */
  passed: boolean;
  /** Failure message (if not passed) */
  message?: string;
  /** Additional details */
  details?: unknown;
}

export interface QualityCheckResult {
  check: QualityCheck;
  result: QualityResult;
}

export interface QualityReport {
  /** Overall quality score (0-100) */
  score: number;
  /** Whether the document passes minimum quality threshold */
  passed: boolean;
  /** Number of critical failures */
  criticalFailures: number;
  /** Number of major failures */
  majorFailures: number;
  /** Number of minor failures */
  minorFailures: number;
  /** Individual check results */
  results: QualityCheckResult[];
  /** Summary of issues */
  issues: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find all nodes in a document matching a predicate
 */
function findNodes(
  doc: PolyglotDocument,
  predicate: (node: PolyglotNode) => boolean
): PolyglotNode[] {
  const matches: PolyglotNode[] = [];

  function traverse(node: PolyglotNode) {
    if (predicate(node)) {
      matches.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const page of doc.pages) {
    traverse(page.content);
  }

  return matches;
}

/**
 * Count all nodes in a document
 */
function countNodes(doc: PolyglotDocument): number {
  let count = 0;

  function traverse(node: PolyglotNode) {
    count++;
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const page of doc.pages) {
    traverse(page.content);
  }

  return count;
}

// =============================================================================
// QUALITY CHECKS
// =============================================================================

export const QUALITY_CHECKS: QualityCheck[] = [
  // Critical checks
  {
    id: 'QC-01',
    name: 'Document has pages',
    severity: 'critical',
    check: (doc) => ({
      passed: doc.pages.length > 0,
      message: 'Document has no pages',
    }),
  },
  {
    id: 'QC-02',
    name: 'No empty pages',
    severity: 'critical',
    check: (doc) => {
      const emptyPages = doc.pages.filter(
        (p) => !p.content || !p.content.children || p.content.children.length === 0
      );
      // Allow pages with direct content (non-container root nodes)
      const reallyEmptyPages = emptyPages.filter(
        (p) => !p.content?.textContent?.plain && !p.content?.imageSrc
      );
      return {
        passed: reallyEmptyPages.length === 0,
        message: `${reallyEmptyPages.length} empty page(s) found`,
        details: reallyEmptyPages.map((p) => p.index),
      };
    },
  },
  {
    id: 'QC-03',
    name: 'Tables have rows',
    severity: 'critical',
    check: (doc) => {
      const emptyTables = findNodes(
        doc,
        (n) => n.type === 'table' && (!n.children || n.children.length === 0)
      );
      return {
        passed: emptyTables.length === 0,
        message: `${emptyTables.length} empty table(s) found`,
        details: emptyTables.map((t) => t.id),
      };
    },
  },
  {
    id: 'QC-04',
    name: 'Valid page dimensions',
    severity: 'critical',
    check: (doc) => {
      const invalidPages = doc.pages.filter(
        (p) =>
          !p.dimensions ||
          p.dimensions.width <= 0 ||
          p.dimensions.height <= 0
      );
      return {
        passed: invalidPages.length === 0,
        message: `${invalidPages.length} page(s) with invalid dimensions`,
        details: invalidPages.map((p) => p.index),
      };
    },
  },

  // Major checks
  {
    id: 'QC-05',
    name: 'Text nodes have content',
    severity: 'major',
    check: (doc) => {
      const emptyTexts = findNodes(
        doc,
        (n) =>
          (n.type === 'text' || n.type === 'paragraph' || n.type === 'heading') &&
          (!n.textContent || !n.textContent.plain || n.textContent.plain.trim() === '')
      );
      return {
        passed: emptyTexts.length === 0,
        message: `${emptyTexts.length} empty text node(s) found`,
        details: emptyTexts.map((t) => ({ id: t.id, type: t.type })),
      };
    },
  },
  {
    id: 'QC-06',
    name: 'Images have dimensions',
    severity: 'major',
    check: (doc) => {
      const badImages = findNodes(
        doc,
        (n) =>
          n.type === 'image' &&
          (!n.rect || n.rect.width <= 0 || n.rect.height <= 0)
      );
      return {
        passed: badImages.length === 0,
        message: `${badImages.length} image(s) without valid dimensions`,
        details: badImages.map((i) => i.id),
      };
    },
  },
  {
    id: 'QC-07',
    name: 'Images have source',
    severity: 'major',
    check: (doc) => {
      const noSourceImages = findNodes(
        doc,
        (n) => n.type === 'image' && !n.imageSrc && !n.imageData
      );
      return {
        passed: noSourceImages.length === 0,
        message: `${noSourceImages.length} image(s) without source`,
        details: noSourceImages.map((i) => i.id),
      };
    },
  },
  {
    id: 'QC-08',
    name: 'Table rows have cells',
    severity: 'major',
    check: (doc) => {
      const emptyRows = findNodes(
        doc,
        (n) =>
          n.type === 'row' &&
          (!n.children || n.children.filter((c) => c.type === 'cell').length === 0)
      );
      return {
        passed: emptyRows.length === 0,
        message: `${emptyRows.length} table row(s) without cells`,
        details: emptyRows.map((r) => r.id),
      };
    },
  },
  {
    id: 'QC-09',
    name: 'Lists have items',
    severity: 'major',
    check: (doc) => {
      const emptyLists = findNodes(
        doc,
        (n) =>
          n.type === 'list' &&
          (!n.children || n.children.filter((c) => c.type === 'list-item').length === 0)
      );
      return {
        passed: emptyLists.length === 0,
        message: `${emptyLists.length} empty list(s) found`,
        details: emptyLists.map((l) => l.id),
      };
    },
  },

  // Minor checks
  {
    id: 'QC-10',
    name: 'Nodes have valid rects',
    severity: 'minor',
    check: (doc) => {
      const invalidRects = findNodes(
        doc,
        (n) =>
          !n.rect ||
          isNaN(n.rect.x) ||
          isNaN(n.rect.y) ||
          isNaN(n.rect.width) ||
          isNaN(n.rect.height)
      );
      return {
        passed: invalidRects.length === 0,
        message: `${invalidRects.length} node(s) with invalid rect`,
        details: invalidRects.map((n) => n.id),
      };
    },
  },
  {
    id: 'QC-11',
    name: 'Headings have appropriate level',
    severity: 'minor',
    check: (doc) => {
      const badHeadings = findNodes(
        doc,
        (n) =>
          n.type === 'heading' &&
          n.docx?.headingLevel !== undefined &&
          (n.docx.headingLevel < 1 || n.docx.headingLevel > 6)
      );
      return {
        passed: badHeadings.length === 0,
        message: `${badHeadings.length} heading(s) with invalid level`,
        details: badHeadings.map((h) => ({
          id: h.id,
          level: h.docx?.headingLevel,
        })),
      };
    },
  },
  {
    id: 'QC-12',
    name: 'Document has metadata',
    severity: 'minor',
    check: (doc) => {
      const hasTitle = !!doc.metadata?.title;
      const hasAuthor = !!doc.metadata?.author;
      return {
        passed: hasTitle || hasAuthor,
        message: 'Document has no title or author metadata',
      };
    },
  },
  {
    id: 'QC-13',
    name: 'Reasonable node count',
    severity: 'minor',
    check: (doc) => {
      const nodeCount = countNodes(doc);
      const maxReasonable = 10000;
      return {
        passed: nodeCount <= maxReasonable,
        message: `Document has ${nodeCount} nodes (exceeds recommended ${maxReasonable})`,
        details: { nodeCount, max: maxReasonable },
      };
    },
  },
  {
    id: 'QC-14',
    name: 'Charts have data',
    severity: 'minor',
    check: (doc) => {
      const emptyCharts = findNodes(
        doc,
        (n) =>
          n.type === 'chart' &&
          (!n.chartData || !n.chartData.series || n.chartData.series.length === 0)
      );
      return {
        passed: emptyCharts.length === 0,
        message: `${emptyCharts.length} chart(s) without data`,
        details: emptyCharts.map((c) => c.id),
      };
    },
  },
];

// =============================================================================
// QUALITY CHECKER
// =============================================================================

/**
 * Run all quality checks on a document
 */
export function runQualityChecks(
  doc: PolyglotDocument,
  checks: QualityCheck[] = QUALITY_CHECKS
): QualityReport {
  const results: QualityCheckResult[] = checks.map((check) => ({
    check,
    result: check.check(doc),
  }));

  // Count failures by severity
  const criticalFailures = results.filter(
    (r) => r.check.severity === 'critical' && !r.result.passed
  ).length;
  const majorFailures = results.filter(
    (r) => r.check.severity === 'major' && !r.result.passed
  ).length;
  const minorFailures = results.filter(
    (r) => r.check.severity === 'minor' && !r.result.passed
  ).length;

  // Calculate score
  // Critical: -20 points each
  // Major: -10 points each
  // Minor: -5 points each
  const totalPenalty =
    criticalFailures * 20 + majorFailures * 10 + minorFailures * 5;
  const score = Math.max(0, 100 - totalPenalty);

  // Document passes if no critical failures and score >= 60
  const passed = criticalFailures === 0 && score >= 60;

  // Collect issue messages
  const issues = results
    .filter((r) => !r.result.passed)
    .map((r) => `[${r.check.severity.toUpperCase()}] ${r.check.name}: ${r.result.message}`);

  return {
    score,
    passed,
    criticalFailures,
    majorFailures,
    minorFailures,
    results,
    issues,
  };
}

/**
 * Quick check if a document meets minimum quality
 */
export function isDocumentValid(doc: PolyglotDocument): boolean {
  const report = runQualityChecks(doc);
  return report.passed;
}

/**
 * Get a summary string of quality issues
 */
export function getQualitySummary(doc: PolyglotDocument): string {
  const report = runQualityChecks(doc);

  if (report.passed && report.issues.length === 0) {
    return `Quality: ${report.score}/100 - All checks passed`;
  }

  const lines = [
    `Quality: ${report.score}/100 - ${report.passed ? 'PASSED' : 'FAILED'}`,
    `Critical: ${report.criticalFailures}, Major: ${report.majorFailures}, Minor: ${report.minorFailures}`,
  ];

  if (report.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of report.issues.slice(0, 10)) {
      lines.push(`  - ${issue}`);
    }
    if (report.issues.length > 10) {
      lines.push(`  ... and ${report.issues.length - 10} more`);
    }
  }

  return lines.join('\n');
}
