/**
 * @runstamp/docx - Core Engine Utilities
 * =======================================
 * Extracted from @runstamp/converter polyglot core.
 * Pure engine utilities with no React/DOM dependencies.
 */

// Standalone modules (no internal deps)
export * from './error-handler';
export * from './performance-monitor';
export * from './pagination-constants';
export * from './types';

// Depends on error-handler
export * from './text-measurer';
export * from './color-utils';

// Depends on types + error-handler
export * from './sanitizer';

// Depends on types
export * from './quality-checker';

// Depends on multiple core files
export * from './paginator';
export * from './chunked-paginator';

// DOCX-specific
export * from './word-styles';

// Coordinates subsystem
export * from './coordinates';

// Chart support (depends on jszip)
export * from './chart-transpiler';

// Revision tracking (self-contained)
export * from './revision-tracker';

// VLT validation (depends on types)
export * from './vlt-validator';
