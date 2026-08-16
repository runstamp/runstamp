/**
 * VLT Invariant Validator
 * =======================
 * Validates that VLT structure meets required invariants before serialization.
 * This catches layout bugs that would result in visually broken output.
 */

import type { PolyglotDocument, PolyglotNode, PolyglotPage, PageDimensions } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  nodeType?: string;
  nodePath?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    nodesChecked: number;
    errorsFound: number;
    warningsFound: number;
  };
}

// =============================================================================
// INVARIANT CHECKS
// =============================================================================

/**
 * Check that table row children are horizontally adjacent
 * (same Y coordinate, increasing X coordinates, no overlap)
 */
function checkRowChildrenHorizontal(
  node: PolyglotNode,
  path: string,
  issues: ValidationIssue[]
): void {
  if (node.type !== 'row' || !node.children || node.children.length < 2) {
    return;
  }

  const cells = node.children.filter(c => c.type === 'cell');
  if (cells.length < 2) return;

  // Check all cells have same Y
  const firstY = cells[0].rect.y;
  for (let i = 1; i < cells.length; i++) {
    if (Math.abs(cells[i].rect.y - firstY) > 1) { // Allow 1px tolerance
      issues.push({
        severity: 'error',
        code: 'ROW_CELLS_NOT_HORIZONTAL',
        message: `Table row cells are not horizontally aligned (Y varies: ${firstY} vs ${cells[i].rect.y})`,
        nodeType: 'row',
        nodePath: path,
        details: {
          expectedY: firstY,
          actualY: cells[i].rect.y,
          cellIndex: i,
        },
      });
    }
  }

  // Check cells are in increasing X order with no gaps
  let expectedX = cells[0].rect.x;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const actualX = cell.rect.x;

    if (i > 0 && Math.abs(actualX - expectedX) > 2) { // Allow 2px tolerance
      issues.push({
        severity: 'warning',
        code: 'ROW_CELLS_GAP',
        message: `Gap or overlap between table cells (expected X=${expectedX.toFixed(0)}, actual X=${actualX.toFixed(0)})`,
        nodeType: 'row',
        nodePath: path,
        details: {
          cellIndex: i,
          expectedX,
          actualX,
          gap: actualX - expectedX,
        },
      });
    }

    expectedX = actualX + cell.rect.width;
  }
}

/**
 * Check that dimensions are positive and reasonable
 */
function checkPositiveDimensions(
  node: PolyglotNode,
  path: string,
  issues: ValidationIssue[]
): void {
  if (node.rect.width <= 0) {
    issues.push({
      severity: 'error',
      code: 'ZERO_WIDTH',
      message: `Node has zero or negative width: ${node.rect.width}`,
      nodeType: node.type,
      nodePath: path,
      details: { width: node.rect.width },
    });
  }

  if (node.rect.height <= 0) {
    issues.push({
      severity: 'error',
      code: 'ZERO_HEIGHT',
      message: `Node has zero or negative height: ${node.rect.height}`,
      nodeType: node.type,
      nodePath: path,
      details: { height: node.rect.height },
    });
  }

  // Check for unreasonably large dimensions (> 10000px suggests a bug)
  if (node.rect.width > 10000 || node.rect.height > 10000) {
    issues.push({
      severity: 'warning',
      code: 'EXCESSIVE_SIZE',
      message: `Node has unusually large dimensions: ${node.rect.width}x${node.rect.height}`,
      nodeType: node.type,
      nodePath: path,
      details: { width: node.rect.width, height: node.rect.height },
    });
  }
}

/**
 * Check that node is within page bounds
 */
function checkWithinBounds(
  node: PolyglotNode,
  path: string,
  pageDimensions: PageDimensions,
  issues: ValidationIssue[]
): void {
  const pageWidth = pageDimensions.width;
  const pageHeight = pageDimensions.height;

  const nodeRight = node.rect.x + node.rect.width;
  const nodeBottom = node.rect.y + node.rect.height;

  // Allow small overflow (5px) for rounding errors
  const tolerance = 5;

  if (nodeRight > pageWidth + tolerance) {
    issues.push({
      severity: 'warning',
      code: 'OVERFLOW_RIGHT',
      message: `Node overflows page right edge by ${(nodeRight - pageWidth).toFixed(0)}px`,
      nodeType: node.type,
      nodePath: path,
      details: {
        nodeRight,
        pageWidth,
        overflow: nodeRight - pageWidth,
      },
    });
  }

  if (nodeBottom > pageHeight + tolerance) {
    issues.push({
      severity: 'warning',
      code: 'OVERFLOW_BOTTOM',
      message: `Node overflows page bottom edge by ${(nodeBottom - pageHeight).toFixed(0)}px`,
      nodeType: node.type,
      nodePath: path,
      details: {
        nodeBottom,
        pageHeight,
        overflow: nodeBottom - pageHeight,
      },
    });
  }

  if (node.rect.x < -tolerance) {
    issues.push({
      severity: 'warning',
      code: 'NEGATIVE_X',
      message: `Node has negative X position: ${node.rect.x}`,
      nodeType: node.type,
      nodePath: path,
      details: { x: node.rect.x },
    });
  }

  if (node.rect.y < -tolerance) {
    issues.push({
      severity: 'warning',
      code: 'NEGATIVE_Y',
      message: `Node has negative Y position: ${node.rect.y}`,
      nodeType: node.type,
      nodePath: path,
      details: { y: node.rect.y },
    });
  }
}

/**
 * Check table structure integrity
 */
function checkTableStructure(
  node: PolyglotNode,
  path: string,
  issues: ValidationIssue[]
): void {
  if (node.type !== 'table') return;

  const rows = node.children?.filter(c => c.type === 'row') || [];

  if (rows.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'EMPTY_TABLE',
      message: 'Table has no rows',
      nodeType: 'table',
      nodePath: path,
    });
    return;
  }

  // Check all rows have same number of cells (accounting for colspan)
  const cellCounts = rows.map(row => {
    const cells = row.children?.filter(c => c.type === 'cell') || [];
    return cells.reduce((sum, cell) => sum + (cell.colSpan || 1), 0);
  });

  const expectedCols = cellCounts[0];
  for (let i = 1; i < cellCounts.length; i++) {
    if (cellCounts[i] !== expectedCols) {
      issues.push({
        severity: 'warning',
        code: 'INCONSISTENT_COLUMNS',
        message: `Table rows have inconsistent column counts: row 0 has ${expectedCols}, row ${i} has ${cellCounts[i]}`,
        nodeType: 'table',
        nodePath: path,
        details: {
          expectedCols,
          rowIndex: i,
          actualCols: cellCounts[i],
        },
      });
    }
  }

  // Check table width equals sum of first row cell widths
  if (rows[0].children && rows[0].children.length > 0) {
    const cells = rows[0].children.filter(c => c.type === 'cell');
    const sumCellWidths = cells.reduce((sum, cell) => sum + cell.rect.width, 0);
    const tableWidth = node.rect.width;

    if (Math.abs(sumCellWidths - tableWidth) > 5) { // 5px tolerance
      issues.push({
        severity: 'warning',
        code: 'TABLE_WIDTH_MISMATCH',
        message: `Table width (${tableWidth.toFixed(0)}) doesn't match sum of cell widths (${sumCellWidths.toFixed(0)})`,
        nodeType: 'table',
        nodePath: path,
        details: {
          tableWidth,
          sumCellWidths,
          difference: tableWidth - sumCellWidths,
        },
      });
    }
  }
}

// =============================================================================
// WALKER
// =============================================================================

function walkNode(
  node: PolyglotNode,
  path: string,
  pageDimensions: PageDimensions,
  issues: ValidationIssue[],
  stats: { nodesChecked: number }
): void {
  stats.nodesChecked++;

  // Run all checks
  checkPositiveDimensions(node, path, issues);
  checkWithinBounds(node, path, pageDimensions, issues);
  checkRowChildrenHorizontal(node, path, issues);
  checkTableStructure(node, path, issues);

  // Recurse into children
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childPath = `${path}/${child.type}[${i}]`;
      walkNode(child, childPath, pageDimensions, issues, stats);
    }
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Validate a single page's VLT structure
 */
export function validatePage(
  page: PolyglotPage,
  pageIndex: number
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const stats = { nodesChecked: 0, errorsFound: 0, warningsFound: 0 };

  const path = `page[${pageIndex}]`;
  walkNode(page.content, path, page.dimensions, issues, stats);

  stats.errorsFound = issues.filter(i => i.severity === 'error').length;
  stats.warningsFound = issues.filter(i => i.severity === 'warning').length;

  return {
    valid: stats.errorsFound === 0,
    issues,
    stats,
  };
}

/**
 * Validate entire VLT document
 */
export function validateVLT(doc: PolyglotDocument): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  let totalNodesChecked = 0;

  for (let i = 0; i < doc.pages.length; i++) {
    const pageResult = validatePage(doc.pages[i], i);
    allIssues.push(...pageResult.issues);
    totalNodesChecked += pageResult.stats.nodesChecked;
  }

  const errorsFound = allIssues.filter(i => i.severity === 'error').length;
  const warningsFound = allIssues.filter(i => i.severity === 'warning').length;

  return {
    valid: errorsFound === 0,
    issues: allIssues,
    stats: {
      nodesChecked: totalNodesChecked,
      errorsFound,
      warningsFound,
    },
  };
}

/**
 * Validate VLT and throw if invalid (use before serialization)
 */
export function assertVLTValid(doc: PolyglotDocument): void {
  const result = validateVLT(doc);

  if (!result.valid) {
    const errorMessages = result.issues
      .filter(i => i.severity === 'error')
      .map(i => `  - [${i.code}] ${i.message}`)
      .join('\n');

    throw new Error(
      `VLT validation failed with ${result.stats.errorsFound} error(s):\n${errorMessages}`
    );
  }
}

/**
 * Log validation results (for debugging)
 */
export function logValidationResult(result: ValidationResult): void {
  console.log(`VLT Validation: ${result.valid ? 'PASSED' : 'FAILED'}`);
  console.log(`  Nodes checked: ${result.stats.nodesChecked}`);
  console.log(`  Errors: ${result.stats.errorsFound}`);
  console.log(`  Warnings: ${result.stats.warningsFound}`);

  if (result.issues.length > 0) {
    console.log('\nIssues:');
    for (const issue of result.issues) {
      const prefix = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${prefix} [${issue.code}] ${issue.message}`);
      if (issue.nodePath) {
        console.log(`     at ${issue.nodePath}`);
      }
    }
  }
}
