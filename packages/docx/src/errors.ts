/**
 * Structured Error System for DOCX Generation
 * ============================================
 * Provides error codes, actionable messages, and recovery suggestions.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Error codes for programmatic handling.
 * Format: DOCX_[CATEGORY]_[SPECIFIC]
 */
export enum DOCXErrorCode {
  // Document validation errors (1xx)
  DOC_INVALID = 'DOCX_DOC_INVALID',
  DOC_NO_PAGES = 'DOCX_DOC_NO_PAGES',
  DOC_NO_DIMENSIONS = 'DOCX_DOC_NO_DIMENSIONS',
  DOC_INVALID_DIMENSIONS = 'DOCX_DOC_INVALID_DIMENSIONS',

  // Element errors (2xx)
  ELEMENT_UNKNOWN = 'DOCX_ELEMENT_UNKNOWN',
  ELEMENT_INVALID = 'DOCX_ELEMENT_INVALID',
  ELEMENT_MISSING_CONTENT = 'DOCX_ELEMENT_MISSING_CONTENT',
  ELEMENT_NOT_IMPLEMENTED = 'DOCX_ELEMENT_NOT_IMPLEMENTED',

  // Image errors (3xx)
  IMAGE_FETCH_FAILED = 'DOCX_IMAGE_FETCH_FAILED',
  IMAGE_TIMEOUT = 'DOCX_IMAGE_TIMEOUT',
  IMAGE_TOO_LARGE = 'DOCX_IMAGE_TOO_LARGE',
  IMAGE_INVALID_FORMAT = 'DOCX_IMAGE_INVALID_FORMAT',
  IMAGE_DECODE_FAILED = 'DOCX_IMAGE_DECODE_FAILED',
  IMAGE_CONVERSION_FAILED = 'DOCX_IMAGE_CONVERSION_FAILED',

  // Chart errors (4xx)
  CHART_NO_DATA = 'DOCX_CHART_NO_DATA',
  CHART_RENDER_FAILED = 'DOCX_CHART_RENDER_FAILED',
  CHART_INVALID_TYPE = 'DOCX_CHART_INVALID_TYPE',

  // Shape errors (5xx)
  SHAPE_NOT_SUPPORTED = 'DOCX_SHAPE_NOT_SUPPORTED',
  SHAPE_RENDER_FAILED = 'DOCX_SHAPE_RENDER_FAILED',

  // Table errors (6xx)
  TABLE_INVALID_STRUCTURE = 'DOCX_TABLE_INVALID_STRUCTURE',
  TABLE_CELL_MERGE_ERROR = 'DOCX_TABLE_CELL_MERGE_ERROR',
  TABLE_GRID_MISMATCH = 'TABLE_GRID_MISMATCH',

  // Style errors (7xx)
  STYLE_NOT_FOUND = 'DOCX_STYLE_NOT_FOUND',
  STYLE_INVALID = 'DOCX_STYLE_INVALID',
  INVALID_COLOR = 'INVALID_COLOR',
  INVALID_FONT_SIZE = 'INVALID_FONT_SIZE',

  // Resource limits
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  IMAGE_SIZE_EXCEEDED = 'IMAGE_SIZE_EXCEEDED',

  // Dependency errors (8xx)
  DEPENDENCY_MISSING = 'DOCX_DEPENDENCY_MISSING',
  DEPENDENCY_VERSION = 'DOCX_DEPENDENCY_VERSION',

  // Internal errors (9xx)
  INTERNAL_ERROR = 'DOCX_INTERNAL_ERROR',
  SERIALIZATION_FAILED = 'DOCX_SERIALIZATION_FAILED',
  RENDER_ABORTED = 'DOCX_RENDER_ABORTED',
}

/**
 * Warning codes for non-fatal issues.
 */
export enum DOCXWarningCode {
  // Document warnings
  DOC_NO_METADATA = 'DOCX_WARN_DOC_NO_METADATA',
  DOC_EMPTY_PAGE = 'DOCX_WARN_DOC_EMPTY_PAGE',

  // Element warnings
  ELEMENT_FALLBACK = 'DOCX_WARN_ELEMENT_FALLBACK',
  ELEMENT_TRUNCATED = 'DOCX_WARN_ELEMENT_TRUNCATED',

  // Image warnings
  IMAGE_PLACEHOLDER = 'DOCX_WARN_IMAGE_PLACEHOLDER',
  IMAGE_RESIZED = 'DOCX_WARN_IMAGE_RESIZED',
  IMAGE_CONVERTED = 'DOCX_WARN_IMAGE_CONVERTED',

  // Chart warnings
  CHART_PLACEHOLDER = 'DOCX_WARN_CHART_PLACEHOLDER',
  CHART_DATA_TRUNCATED = 'DOCX_WARN_CHART_DATA_TRUNCATED',

  // Shape warnings
  SHAPE_PLACEHOLDER = 'DOCX_WARN_SHAPE_PLACEHOLDER',
  SHAPE_SIMPLIFIED = 'DOCX_WARN_SHAPE_SIMPLIFIED',

  // Style warnings
  STYLE_FALLBACK = 'DOCX_WARN_STYLE_FALLBACK',
  FONT_FALLBACK = 'DOCX_WARN_FONT_FALLBACK',

  // Performance warnings
  PERF_LARGE_DOCUMENT = 'DOCX_WARN_PERF_LARGE_DOCUMENT',
  PERF_MANY_IMAGES = 'DOCX_WARN_PERF_MANY_IMAGES',
}

// =============================================================================
// ERROR CLASS
// =============================================================================

/**
 * Structured DOCX error with code, message, and recovery suggestion.
 */
export class DOCXError extends Error {
  /** Error code for programmatic handling */
  readonly code: DOCXErrorCode;
  /** Human-readable recovery suggestion */
  readonly recovery?: string;
  /** Additional context about the error */
  readonly context?: Record<string, unknown>;
  /** Original error that caused this error */
  readonly originalCause?: Error;

  constructor(
    code: DOCXErrorCode,
    message: string,
    options?: {
      recovery?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'DOCXError';
    this.code = code;
    this.recovery = options?.recovery;
    this.context = options?.context;
    this.originalCause = options?.cause;
  }

  /**
   * Format error for logging with all details.
   */
  toDetailedString(): string {
    const parts = [
      `[${this.code}] ${this.message}`,
    ];
    if (this.recovery) {
      parts.push(`Recovery: ${this.recovery}`);
    }
    if (this.context) {
      parts.push(`Context: ${JSON.stringify(this.context)}`);
    }
    if (this.originalCause) {
      parts.push(`Caused by: ${this.originalCause}`);
    }
    return parts.join('\n');
  }

  /**
   * Convert to JSON for serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recovery: this.recovery,
      context: this.context,
    };
  }
}

// =============================================================================
// WARNING CLASS
// =============================================================================

/**
 * Structured warning for non-fatal issues.
 */
export interface DOCXWarning {
  /** Warning code for programmatic handling */
  code: DOCXWarningCode;
  /** Human-readable message */
  message: string;
  /** Recovery suggestion or workaround */
  recovery?: string;
  /** Location in document (e.g., "page 2, element 5") */
  location?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Create a warning object.
 */
export function createWarning(
  code: DOCXWarningCode,
  message: string,
  options?: {
    recovery?: string;
    location?: string;
    context?: Record<string, unknown>;
  }
): DOCXWarning {
  return {
    code,
    message,
    recovery: options?.recovery,
    location: options?.location,
    context: options?.context,
  };
}

/**
 * Format a warning for display.
 */
export function formatWarning(warning: DOCXWarning): string {
  const parts = [warning.message];
  if (warning.location) {
    parts[0] = `[${warning.location}] ${parts[0]}`;
  }
  if (warning.recovery) {
    parts.push(`Suggestion: ${warning.recovery}`);
  }
  return parts.join(' ');
}

// =============================================================================
// ERROR FACTORY FUNCTIONS
// =============================================================================

/**
 * Create common errors with consistent messages.
 */
export const Errors = {
  // Document errors
  invalidDocument: (reason: string) => new DOCXError(
    DOCXErrorCode.DOC_INVALID,
    `Invalid document: ${reason}`,
    { recovery: 'Ensure the document object has valid pages and metadata.' }
  ),

  noPages: () => new DOCXError(
    DOCXErrorCode.DOC_NO_PAGES,
    'Document has no pages',
    { recovery: 'Add at least one page to the document before serialization.' }
  ),

  noDimensions: () => new DOCXError(
    DOCXErrorCode.DOC_NO_DIMENSIONS,
    'Document dimensions not specified',
    { recovery: 'Set defaultDimensions.width and defaultDimensions.height on the document.' }
  ),

  invalidDimensions: (width: number, height: number) => new DOCXError(
    DOCXErrorCode.DOC_INVALID_DIMENSIONS,
    `Invalid dimensions: ${width}x${height}`,
    {
      recovery: 'Dimensions must be positive numbers representing points (1/72 inch).',
      context: { width, height },
    }
  ),

  // Element errors
  unknownElement: (elementType: string, location?: string) => new DOCXError(
    DOCXErrorCode.ELEMENT_UNKNOWN,
    `Unknown element type: ${elementType}`,
    {
      recovery: 'Use supported element types: paragraph, heading, text-run, code-block, page-break, divider, table, image, list, chart, shape, container.',
      context: { elementType, location },
    }
  ),

  elementNotImplemented: (elementType: string, location?: string) => new DOCXError(
    DOCXErrorCode.ELEMENT_NOT_IMPLEMENTED,
    `Element type is recognized but not implemented in this serializer: ${elementType}`,
    {
      recovery: 'Use a serializer phase that supports this element type or convert it to a supported fallback first.',
      context: { elementType, location },
    }
  ),

  // Image errors
  imageFetchFailed: (url: string, reason: string) => new DOCXError(
    DOCXErrorCode.IMAGE_FETCH_FAILED,
    `Failed to fetch image: ${reason}`,
    {
      recovery: 'Verify the URL is accessible and returns a valid image. Consider using a data URI instead.',
      context: { url },
    }
  ),

  imageTimeout: (url: string, timeoutMs: number) => new DOCXError(
    DOCXErrorCode.IMAGE_TIMEOUT,
    `Image fetch timed out after ${timeoutMs}ms`,
    {
      recovery: 'Increase the timeout in ImageFetchConfig or use a faster image source.',
      context: { url, timeoutMs },
    }
  ),

  imageTooLarge: (url: string, sizeBytes: number, maxBytes: number) => new DOCXError(
    DOCXErrorCode.IMAGE_TOO_LARGE,
    `Image exceeds size limit: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB (max: ${(maxBytes / 1024 / 1024).toFixed(2)}MB)`,
    {
      recovery: 'Reduce the image size or increase maxSize in ImageFetchConfig.',
      context: { url, sizeBytes, maxBytes },
    }
  ),

  imageDecodeFailed: (source: string) => new DOCXError(
    DOCXErrorCode.IMAGE_DECODE_FAILED,
    'Failed to decode image data',
    {
      recovery: 'Ensure the image data is valid base64-encoded image content.',
      context: { source: source.substring(0, 50) + '...' },
    }
  ),

  // Chart errors
  chartNoData: (chartId: string) => new DOCXError(
    DOCXErrorCode.CHART_NO_DATA,
    'Chart has no data series',
    {
      recovery: 'Add at least one data series with values to the chart.',
      context: { chartId },
    }
  ),

  // Shape errors
  shapeNotSupported: (shapeType: string) => new DOCXError(
    DOCXErrorCode.SHAPE_NOT_SUPPORTED,
    `Shape type not fully supported: ${shapeType}`,
    {
      recovery: 'Complex shapes are rendered as placeholders. Use rectangle, line, or provide a pre-rendered image.',
      context: { shapeType },
    }
  ),

  // Dependency errors
  dependencyMissing: (name: string, purpose: string) => new DOCXError(
    DOCXErrorCode.DEPENDENCY_MISSING,
    `Optional dependency "${name}" not found`,
    {
      recovery: `Install ${name} to enable ${purpose}: npm install ${name}`,
      context: { dependency: name, purpose },
    }
  ),

  // Internal errors
  internal: (message: string, cause?: Error) => new DOCXError(
    DOCXErrorCode.INTERNAL_ERROR,
    `Internal error: ${message}`,
    {
      recovery: 'This is a bug. Please report it at https://github.com/anthropics/runstamp/issues',
      cause,
    }
  ),
};

// =============================================================================
// WARNING FACTORY FUNCTIONS
// =============================================================================

/**
 * Create common warnings with consistent messages.
 */
export const Warnings = {
  // Document warnings
  noMetadata: () => createWarning(
    DOCXWarningCode.DOC_NO_METADATA,
    'Document has no metadata, using defaults',
    { recovery: 'Set document.metadata for better document properties.' }
  ),

  emptyPage: (pageNumber: number) => createWarning(
    DOCXWarningCode.DOC_EMPTY_PAGE,
    `Page ${pageNumber} has no content`,
    {
      location: `page ${pageNumber}`,
      recovery: 'Add elements to the page or remove it from the document.',
    }
  ),

  // Element warnings
  unknownElementFallback: (elementType: string, location: string) => createWarning(
    DOCXWarningCode.ELEMENT_FALLBACK,
    `Unknown element type "${elementType}" - skipped`,
    {
      location,
      recovery: 'Use supported element types or check for typos.',
    }
  ),

  // Image warnings
  imagePlaceholder: (reason: string, location?: string) => createWarning(
    DOCXWarningCode.IMAGE_PLACEHOLDER,
    `Image rendered as placeholder: ${reason}`,
    {
      location,
      recovery: 'Provide a valid image source (data URI or accessible URL).',
    }
  ),

  imageResized: (original: { width: number; height: number }, scaled: { width: number; height: number }) => createWarning(
    DOCXWarningCode.IMAGE_RESIZED,
    `Image resized from ${original.width}x${original.height} to ${scaled.width}x${scaled.height}`,
    { recovery: 'Pre-size images to avoid automatic resizing.' }
  ),

  imageConverted: (from: string, to: string) => createWarning(
    DOCXWarningCode.IMAGE_CONVERTED,
    `Image converted from ${from} to ${to} for Word compatibility`,
    { recovery: 'Use PNG or JPEG format for best compatibility.' }
  ),

  // Chart warnings
  chartPlaceholder: (chartType: string, reason: string) => createWarning(
    DOCXWarningCode.CHART_PLACEHOLDER,
    `Chart (${chartType}) rendered as placeholder: ${reason}`,
    { recovery: 'Register a chart renderer or provide chart data.' }
  ),

  // Shape warnings
  shapePlaceholder: (shapeType: string) => createWarning(
    DOCXWarningCode.SHAPE_PLACEHOLDER,
    `Shape (${shapeType}) rendered as placeholder - DOCX has limited native shape support`,
    { recovery: 'Use rectangle or line for native support, or install sharp for image fallback.' }
  ),

  // Style warnings
  fontFallback: (requested: string, fallback: string) => createWarning(
    DOCXWarningCode.FONT_FALLBACK,
    `Font "${requested}" not available, using "${fallback}"`,
    { recovery: 'Use standard fonts like Arial, Times New Roman, or Calibri.' }
  ),

  // Performance warnings
  largeDocument: (pageCount: number, elementCount: number) => createWarning(
    DOCXWarningCode.PERF_LARGE_DOCUMENT,
    `Large document: ${pageCount} pages, ${elementCount} elements`,
    { recovery: 'Consider using streaming generation for large documents.' }
  ),

  manyImages: (imageCount: number) => createWarning(
    DOCXWarningCode.PERF_MANY_IMAGES,
    `Document contains ${imageCount} images`,
    { recovery: 'Consider reducing image count or using smaller images for better performance.' }
  ),
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an error is a DOCXError.
 */
export function isDOCXError(error: unknown): error is DOCXError {
  return error instanceof DOCXError;
}

/**
 * Convert any error to a DOCXError.
 */
export function toDOCXError(error: unknown): DOCXError {
  if (isDOCXError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new DOCXError(
      DOCXErrorCode.INTERNAL_ERROR,
      error.message,
      { cause: error }
    );
  }
  return new DOCXError(
    DOCXErrorCode.INTERNAL_ERROR,
    String(error)
  );
}

/**
 * Collect warnings from multiple sources.
 */
export class WarningCollector {
  private warnings: DOCXWarning[] = [];

  add(warning: DOCXWarning): void {
    this.warnings.push(warning);
  }

  addLegacy(message: string, location?: string): void {
    // Convert legacy string warnings to structured format
    this.warnings.push({
      code: DOCXWarningCode.ELEMENT_FALLBACK,
      message,
      location,
    });
  }

  addAll(warnings: DOCXWarning[]): void {
    this.warnings.push(...warnings);
  }

  getWarnings(): DOCXWarning[] {
    return [...this.warnings];
  }

  getMessages(): string[] {
    return this.warnings.map(formatWarning);
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  clear(): void {
    this.warnings = [];
  }
}
