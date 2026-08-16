/**
 * Polyglot Error Handler
 * ======================
 * Centralized error and warning collection for polyglot rendering.
 */

export type RenderPhase = 'parse' | 'layout' | 'paginate' | 'serialize';

export interface RenderError {
  phase: RenderPhase;
  nodeId?: string;
  nodeType?: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Collects errors and warnings during polyglot rendering.
 * Provides structured error reporting and recovery information.
 */
export class PolyglotErrorCollector {
  private errors: RenderError[] = [];
  private warnings: string[] = [];
  private validationErrors: ValidationError[] = [];

  /**
   * Add a render error
   */
  addError(error: RenderError): void {
    this.errors.push(error);
  }

  /**
   * Add a warning (non-fatal issue)
   */
  addWarning(message: string): void {
    this.warnings.push(message);
  }

  /**
   * Add a validation error
   */
  addValidationError(error: ValidationError): void {
    this.validationErrors.push(error);
  }

  /**
   * Check if any errors occurred
   */
  hasErrors(): boolean {
    return this.errors.length > 0 || this.validationErrors.length > 0;
  }

  /**
   * Check if any fatal (non-recoverable) errors occurred
   */
  hasFatalErrors(): boolean {
    return this.errors.some((e) => !e.recoverable);
  }

  /**
   * Check if validation passed
   */
  isValid(): boolean {
    return this.validationErrors.length === 0;
  }

  /**
   * Get all errors
   */
  getErrors(): RenderError[] {
    return [...this.errors];
  }

  /**
   * Get all warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Get all validation errors
   */
  getValidationErrors(): ValidationError[] {
    return [...this.validationErrors];
  }

  /**
   * Get a full error report
   */
  getReport(): {
    valid: boolean;
    errors: RenderError[];
    warnings: string[];
    validationErrors: ValidationError[];
    summary: string;
  } {
    const fatalCount = this.errors.filter((e) => !e.recoverable).length;
    const recoverableCount = this.errors.filter((e) => e.recoverable).length;

    let summary = '';
    if (this.validationErrors.length > 0) {
      summary += `${this.validationErrors.length} validation error(s). `;
    }
    if (fatalCount > 0) {
      summary += `${fatalCount} fatal error(s). `;
    }
    if (recoverableCount > 0) {
      summary += `${recoverableCount} recoverable error(s). `;
    }
    if (this.warnings.length > 0) {
      summary += `${this.warnings.length} warning(s).`;
    }
    if (!summary) {
      summary = 'No errors or warnings.';
    }

    return {
      valid: this.validationErrors.length === 0 && fatalCount === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      validationErrors: [...this.validationErrors],
      summary: summary.trim(),
    };
  }

  /**
   * Clear all collected errors and warnings
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
    this.validationErrors = [];
  }

  /**
   * Create error for failed component rendering
   */
  static componentError(
    componentName: string,
    error: Error,
    nodeId?: string
  ): RenderError {
    return {
      phase: 'parse',
      nodeId,
      nodeType: componentName,
      message: `Failed to render component "${componentName}": ${error.message}`,
      stack: error.stack,
      recoverable: true,
    };
  }

  /**
   * Create error for layout calculation failure
   */
  static layoutError(
    message: string,
    nodeId?: string,
    nodeType?: string
  ): RenderError {
    return {
      phase: 'layout',
      nodeId,
      nodeType,
      message,
      recoverable: true,
    };
  }

  /**
   * Create error for serialization failure
   */
  static serializeError(
    message: string,
    nodeId?: string,
    nodeType?: string,
    recoverable: boolean = false
  ): RenderError {
    return {
      phase: 'serialize',
      nodeId,
      nodeType,
      message,
      recoverable,
    };
  }
}

/**
 * Validate a polyglot document structure
 */
export function validateDocument(doc: unknown): {
  valid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!doc) {
    errors.push({ field: 'document', message: 'Document is null or undefined' });
    return { valid: false, errors };
  }

  const d = doc as Record<string, unknown>;

  if (!d.pages) {
    errors.push({ field: 'pages', message: 'Document has no pages array' });
  } else if (!Array.isArray(d.pages)) {
    errors.push({
      field: 'pages',
      message: 'pages must be an array',
      value: typeof d.pages,
    });
  } else if (d.pages.length === 0) {
    errors.push({ field: 'pages', message: 'Document has no pages' });
  }

  if (!d.pageDimensions) {
    errors.push({
      field: 'pageDimensions',
      message: 'Document has no pageDimensions',
    });
  } else {
    const dims = d.pageDimensions as Record<string, unknown>;
    if (typeof dims.width !== 'number' || dims.width <= 0) {
      errors.push({
        field: 'pageDimensions.width',
        message: 'pageDimensions.width must be a positive number',
        value: dims.width,
      });
    }
    if (typeof dims.height !== 'number' || dims.height <= 0) {
      errors.push({
        field: 'pageDimensions.height',
        message: 'pageDimensions.height must be a positive number',
        value: dims.height,
      });
    }
  }

  if (!d.format) {
    errors.push({ field: 'format', message: 'Document has no format specified' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a React element for polyglot rendering
 */
export function validateReactElement(element: unknown): {
  valid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (element === null || element === undefined) {
    errors.push({ field: 'element', message: 'React element is null or undefined' });
    return { valid: false, errors };
  }

  if (typeof element !== 'object') {
    errors.push({
      field: 'element',
      message: 'React element must be an object',
      value: typeof element,
    });
    return { valid: false, errors };
  }

  const el = element as Record<string, unknown>;

  if (!el.type && !el.props) {
    errors.push({
      field: 'element',
      message: 'React element must have type or props',
    });
  }

  return { valid: errors.length === 0, errors };
}

// Default global error collector instance
let globalErrorCollector: PolyglotErrorCollector | null = null;

/**
 * Get or create the global error collector
 */
export function getErrorCollector(): PolyglotErrorCollector {
  if (!globalErrorCollector) {
    globalErrorCollector = new PolyglotErrorCollector();
  }
  return globalErrorCollector;
}

/**
 * Reset the global error collector
 */
export function resetErrorCollector(): void {
  if (globalErrorCollector) {
    globalErrorCollector.clear();
  }
  globalErrorCollector = null;
}
