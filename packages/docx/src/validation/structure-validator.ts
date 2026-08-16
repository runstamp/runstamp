/**
 * Structure Validator for DOCX
 *
 * Validates document structure for DOCX compatibility.
 * Detects issues that could cause problems in Word.
 */

import { SemanticElement, SemanticType } from '../semantic-types';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  element: SemanticElement;
  message: string;
  suggestion: string;
}

export interface ValidationError {
  element: SemanticElement;
  message: string;
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validates document structure for DOCX compatibility.
 */
export function validateStructure(elements: SemanticElement[]): ValidationResult {
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];

  // Track heading levels for hierarchy validation
  let lastHeadingLevel = 0;

  function validate(element: SemanticElement, depth: number = 0): void {
    // Check heading hierarchy
    if (element.type === 'heading' && element.attributes.headingLevel) {
      const level = element.attributes.headingLevel;

      if (level > lastHeadingLevel + 1 && lastHeadingLevel > 0) {
        warnings.push({
          element,
          message: `Heading level ${level} skips level ${lastHeadingLevel + 1}`,
          suggestion: `Consider using H${lastHeadingLevel + 1} for better document structure`,
        });
      }

      lastHeadingLevel = level;
    }

    // Check for empty content
    if (element.content === '' && element.children.length === 0) {
      if (!['section', 'list'].includes(element.type)) {
        warnings.push({
          element,
          message: `Empty ${element.type} element`,
          suggestion: 'Remove empty elements or add content',
        });
      }
    }

    // Check for deeply nested lists
    if (element.type === 'list') {
      const nestingDepth = countListNesting(element);
      if (nestingDepth > 9) {
        errors.push({
          element,
          message: `List nesting depth ${nestingDepth} exceeds DOCX limit of 9`,
        });
      } else if (nestingDepth > 5) {
        warnings.push({
          element,
          message: `Deep list nesting (${nestingDepth} levels)`,
          suggestion: 'Consider flattening the list structure',
        });
      }
    }

    // Check for code blocks without language
    if (element.type === 'codeBlock' && !element.attributes.language) {
      warnings.push({
        element,
        message: 'Code block without language specification',
        suggestion: 'Add language class for proper formatting',
      });
    }

    // Check for very long paragraphs
    if (element.type === 'paragraph' && element.content.length > 5000) {
      warnings.push({
        element,
        message: `Very long paragraph (${element.content.length} characters)`,
        suggestion: 'Consider breaking into smaller paragraphs for readability',
      });
    }

    // Check for nested tables (not well supported in DOCX)
    if (element.type === 'table' && depth > 0) {
      const parentTypes = getAncestorTypes(element, elements);
      if (parentTypes.includes('table')) {
        warnings.push({
          element,
          message: 'Nested table detected',
          suggestion: 'Nested tables may not render correctly in Word',
        });
      }
    }

    // Recurse into children
    for (const child of element.children) {
      validate(child, depth + 1);
    }
  }

  for (const element of elements) {
    validate(element);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Count the maximum nesting depth of lists.
 */
function countListNesting(element: SemanticElement): number {
  if (element.type !== 'list' && element.type !== 'listItem') {
    return 0;
  }

  let maxChildDepth = 0;
  for (const child of element.children) {
    const childDepth = countListNesting(child);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }

  return element.type === 'list' ? maxChildDepth + 1 : maxChildDepth;
}

/**
 * Get ancestor element types (simplified - requires walking the tree).
 */
function getAncestorTypes(
  _element: SemanticElement,
  _allElements: SemanticElement[]
): SemanticType[] {
  // This is a simplified implementation
  // In practice, you'd need to track parent references during traversal
  return [];
}

// =============================================================================
// ADDITIONAL VALIDATORS
// =============================================================================

/**
 * Validate heading hierarchy for proper TOC generation.
 */
export function validateHeadingHierarchy(elements: SemanticElement[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const headings = flattenAndFilterByType(elements, 'heading');

  if (headings.length === 0) {
    return { valid: true, issues: [] };
  }

  // Check that document starts with H1
  const firstHeading = headings[0];
  if (firstHeading.attributes.headingLevel !== 1) {
    issues.push(
      `Document starts with H${firstHeading.attributes.headingLevel}, consider starting with H1`
    );
  }

  // Check for skipped levels
  let prevLevel = 0;
  for (const heading of headings) {
    const level = heading.attributes.headingLevel || 1;
    if (level > prevLevel + 1 && prevLevel > 0) {
      issues.push(
        `Heading "${heading.content.substring(0, 30)}..." skips from H${prevLevel} to H${level}`
      );
    }
    prevLevel = level;
  }

  // Check for multiple H1s
  const h1Count = headings.filter((h) => h.attributes.headingLevel === 1).length;
  if (h1Count > 1) {
    issues.push(`Document has ${h1Count} H1 headings, typically there should be only one`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate list structure.
 */
export function validateListStructure(elements: SemanticElement[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const lists = flattenAndFilterByType(elements, 'list');

  for (const list of lists) {
    // Check for empty lists
    if (list.children.length === 0) {
      issues.push('Empty list detected');
    }

    // Check for very long lists
    if (list.children.length > 50) {
      issues.push(`Very long list (${list.children.length} items) may be hard to read`);
    }

    // Check nesting depth
    const depth = countListNesting(list);
    if (depth > 5) {
      issues.push(`Deeply nested list (${depth} levels) may not render well`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate table structure for DOCX compatibility.
 */
export function validateTableStructure(elements: SemanticElement[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const tables = flattenAndFilterByType(elements, 'table');

  for (const table of tables) {
    // Check for very wide tables via children count
    const tableChildren = table.children.filter(c => c.type === 'listItem' || c.content);
    if (tableChildren.length > 10) {
      issues.push(`Table with ${tableChildren.length} children may have too many columns`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate image references.
 */
export function validateImages(elements: SemanticElement[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const images = flattenAndFilterByType(elements, 'image');

  for (const image of images) {
    // Check for missing alt text
    if (!image.content && !image.attributes) {
      issues.push('Image without alt text detected');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Flatten elements and filter by type.
 */
function flattenAndFilterByType(
  elements: SemanticElement[],
  type: SemanticType
): SemanticElement[] {
  const result: SemanticElement[] = [];

  function collect(el: SemanticElement) {
    if (el.type === type) {
      result.push(el);
    }
    for (const child of el.children) {
      collect(child);
    }
  }

  for (const el of elements) {
    collect(el);
  }

  return result;
}

/**
 * Run all validators and return combined results.
 */
export function validateAll(elements: SemanticElement[]): {
  structure: ValidationResult;
  headings: { valid: boolean; issues: string[] };
  lists: { valid: boolean; issues: string[] };
  tables: { valid: boolean; issues: string[] };
  images: { valid: boolean; issues: string[] };
  overallValid: boolean;
} {
  const structure = validateStructure(elements);
  const headings = validateHeadingHierarchy(elements);
  const lists = validateListStructure(elements);
  const tables = validateTableStructure(elements);
  const images = validateImages(elements);

  const overallValid =
    structure.valid &&
    headings.valid &&
    lists.valid &&
    tables.valid &&
    images.valid;

  return {
    structure,
    headings,
    lists,
    tables,
    images,
    overallValid,
  };
}

/**
 * Get a summary report of validation results.
 */
export function getValidationSummary(elements: SemanticElement[]): string {
  const results = validateAll(elements);
  const lines: string[] = [];

  lines.push(`Document Validation Summary`);
  lines.push(`==========================`);
  lines.push(``);
  lines.push(`Overall: ${results.overallValid ? 'VALID' : 'HAS ISSUES'}`);
  lines.push(``);

  // Structure
  lines.push(`Structure Validation:`);
  lines.push(`  - Errors: ${results.structure.errors.length}`);
  lines.push(`  - Warnings: ${results.structure.warnings.length}`);

  // Headings
  if (results.headings.issues.length > 0) {
    lines.push(``);
    lines.push(`Heading Issues:`);
    for (const issue of results.headings.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  // Lists
  if (results.lists.issues.length > 0) {
    lines.push(``);
    lines.push(`List Issues:`);
    for (const issue of results.lists.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  // Tables
  if (results.tables.issues.length > 0) {
    lines.push(``);
    lines.push(`Table Issues:`);
    for (const issue of results.tables.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  // Images
  if (results.images.issues.length > 0) {
    lines.push(``);
    lines.push(`Image Issues:`);
    for (const issue of results.images.issues) {
      lines.push(`  - ${issue}`);
    }
  }

  return lines.join('\n');
}
