/**
 * Input Sanitization
 * ==================
 * Functions to sanitize and validate input data for safe document generation.
 */

import type { PolyglotNode, Rect } from './types';
import { getErrorCollector } from './error-handler';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum allowed text content length (1MB worth of characters) */
const MAX_TEXT_LENGTH = 1_000_000;

/** Maximum allowed node tree depth */
const MAX_NODE_DEPTH = 100;

/** Maximum coordinate values */
const MAX_X = 10000;
const MAX_Y = 100000;
const MAX_DIMENSION = 10000;
function isDisallowedControlCharacter(code: number): boolean {
  return (code >= 0 && code <= 8)
    || code === 11
    || code === 12
    || (code >= 14 && code <= 31);
}

// =============================================================================
// TEXT SANITIZATION
// =============================================================================

/**
 * Sanitize text content by removing null bytes and limiting length
 */
export function sanitizeTextContent(text: string | undefined | null): string {
  if (text === null || text === undefined) {
    return '';
  }

  // Remove null bytes (can cause issues in XML)
  let sanitized = text.replace(/\0/g, '');

  // Limit length
  if (sanitized.length > MAX_TEXT_LENGTH) {
    const errorCollector = getErrorCollector();
    errorCollector.addWarning(
      `Text content truncated from ${sanitized.length} to ${MAX_TEXT_LENGTH} characters`
    );
    sanitized = sanitized.slice(0, MAX_TEXT_LENGTH);
  }

  return sanitized;
}

/**
 * Check if a string contains potentially problematic characters
 */
export function hasProblematicCharacters(text: string): boolean {
  // Check for null bytes, control characters (except newlines/tabs)
  return Array.from(text).some((char) => isDisallowedControlCharacter(char.charCodeAt(0)));
}

// =============================================================================
// RECT SANITIZATION
// =============================================================================

/**
 * Sanitize a Rect by clamping values to safe ranges
 */
export function sanitizeRect(rect: Rect | undefined): Rect {
  if (!rect) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const errorCollector = getErrorCollector();
  let hasIssues = false;

  // Clamp x coordinate
  let x = rect.x;
  if (isNaN(x) || !isFinite(x)) {
    x = 0;
    hasIssues = true;
  } else if (x < 0) {
    x = 0;
    hasIssues = true;
  } else if (x > MAX_X) {
    x = MAX_X;
    hasIssues = true;
  }

  // Clamp y coordinate
  let y = rect.y;
  if (isNaN(y) || !isFinite(y)) {
    y = 0;
    hasIssues = true;
  } else if (y < 0) {
    y = 0;
    hasIssues = true;
  } else if (y > MAX_Y) {
    y = MAX_Y;
    hasIssues = true;
  }

  // Clamp width
  let width = rect.width;
  if (isNaN(width) || !isFinite(width)) {
    width = 0;
    hasIssues = true;
  } else if (width < 0) {
    width = 0;
    hasIssues = true;
  } else if (width > MAX_DIMENSION) {
    width = MAX_DIMENSION;
    hasIssues = true;
  }

  // Clamp height
  let height = rect.height;
  if (isNaN(height) || !isFinite(height)) {
    height = 0;
    hasIssues = true;
  } else if (height < 0) {
    height = 0;
    hasIssues = true;
  } else if (height > MAX_DIMENSION) {
    height = MAX_DIMENSION;
    hasIssues = true;
  }

  if (hasIssues) {
    errorCollector.addWarning(
      `Rect values clamped: original (${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}) -> (${x}, ${y}, ${width}, ${height})`
    );
  }

  return { x, y, width, height };
}

// =============================================================================
// NODE SANITIZATION
// =============================================================================

/**
 * Sanitize a PolyglotNode tree, fixing issues and limiting depth
 */
export function sanitizeNode(
  node: PolyglotNode,
  depth: number = 0
): PolyglotNode {
  const errorCollector = getErrorCollector();

  // Prevent infinite recursion
  if (depth > MAX_NODE_DEPTH) {
    errorCollector.addWarning(
      `Node tree depth exceeded ${MAX_NODE_DEPTH}, truncating at node ${node.id}`
    );
    return {
      ...node,
      children: [], // Truncate children
    };
  }

  // Create sanitized copy
  const sanitized: PolyglotNode = {
    ...node,
    rect: sanitizeRect(node.rect),
  };

  // Sanitize text content
  if (sanitized.textContent) {
    sanitized.textContent = {
      ...sanitized.textContent,
      plain: sanitizeTextContent(sanitized.textContent.plain),
    };

    // Sanitize spans if present
    if (sanitized.textContent.spans) {
      sanitized.textContent.spans = sanitized.textContent.spans.map(span => ({
        ...span,
        text: sanitizeTextContent(span.text),
      }));
    }
  }

  // Sanitize alt text
  if (sanitized.altText) {
    sanitized.altText = sanitizeTextContent(sanitized.altText);
  }

  // Recursively sanitize children
  if (sanitized.children && sanitized.children.length > 0) {
    sanitized.children = sanitized.children.map(child =>
      sanitizeNode(child, depth + 1)
    );
  }

  return sanitized;
}

// =============================================================================
// NUMERIC SANITIZATION
// =============================================================================

/**
 * Safely divide two numbers, returning a fallback on division by zero
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback: number = 0
): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return fallback;
  }
  const result = numerator / denominator;
  if (!isFinite(result)) {
    return fallback;
  }
  return result;
}

/**
 * Clamp a number to a range
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Ensure a value is a valid positive number
 */
export function ensurePositive(value: number, fallback: number = 0): number {
  if (isNaN(value) || !isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const SANITIZER_LIMITS = {
  MAX_TEXT_LENGTH,
  MAX_NODE_DEPTH,
  MAX_X,
  MAX_Y,
  MAX_DIMENSION,
};
