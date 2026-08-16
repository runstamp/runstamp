/**
 * Batch DOCX Generation
 *
 * Sequential batch rendering and hydration with ZIP output,
 * custom file naming, and error isolation.
 */

import JSZip from 'jszip';
import { renderToDocx, hydrateDocx } from './render.js';
import type { DocxDocument } from './schema.js';
import type { BatchOptions, BatchResult, BatchItemResult } from './types.js';
import { DOCXError } from './errors.js';

const DETERMINISTIC_ZIP_DATE = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));

// =============================================================================
// TEMPLATE MERGING
// =============================================================================

/**
 * Walk a nested object to resolve a dotted path like "address.city".
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;
  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Escape a string value for safe insertion into a JSON-stringified string.
 * The value will be spliced into an already-serialized JSON string,
 * so all JSON-special characters must be escaped.
 */
function escapeJsonString(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    switch (ch) {
      case 0x22: // "
        result += '\\"';
        break;
      case 0x5c: // \
        result += '\\\\';
        break;
      case 0x0a: // \n
        result += '\\n';
        break;
      case 0x0d: // \r
        result += '\\r';
        break;
      case 0x09: // \t
        result += '\\t';
        break;
      default:
        if (ch < 0x20) {
          // Control characters → \uXXXX
          result += '\\u' + ch.toString(16).padStart(4, '0');
        } else {
          result += value[i];
        }
    }
  }
  return result;
}

/**
 * Convert an arbitrary value to a string safe for JSON insertion.
 */
function resolveValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return escapeJsonString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // object / array
  return escapeJsonString(JSON.stringify(value));
}

/**
 * Clone a DocxDocument via JSON round-trip, replacing {{key}} placeholders
 * with values from the data object.
 */
function mergeDataIntoTemplate(
  template: DocxDocument,
  data: Record<string, unknown>,
): DocxDocument {
  const json = JSON.stringify(template);
  const merged = json.replace(
    /\{\{([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\}\}/g,
    (_match, path: string) => {
      const value = getNestedValue(data, path);
      return resolveValue(value);
    },
  );
  return JSON.parse(merged) as DocxDocument;
}

// =============================================================================
// FILE NAMING
// =============================================================================

/**
 * Sanitize a string for use as a file name.
 */
function sanitizeFileName(name: string): string {
  let sanitized = "";
  for (const char of name) {
    const code = char.charCodeAt(0);
    const isReserved = '<>:"/\\|?*'.includes(char);
    const isControl = code >= 0 && code <= 0x1F;
    sanitized += isReserved || isControl ? "_" : char;
  }
  sanitized = sanitized.replace(/\s+/g, '_');
  if (sanitized.length > 200) sanitized = sanitized.slice(0, 200);
  if (!sanitized) sanitized = '_';
  return sanitized;
}

/**
 * Default file naming: uses name/title/id/fileName from the data item,
 * falling back to zero-padded index.
 */
function defaultFileName(item: Record<string, unknown>, index: number): string {
  for (const key of ['name', 'title', 'id', 'fileName']) {
    const val = item[key];
    if (typeof val === 'string' && val.length > 0) {
      return `${sanitizeFileName(val)}.docx`;
    }
  }
  return `document_${String(index + 1).padStart(4, '0')}.docx`;
}

// =============================================================================
// PARALLEL BATCH (worker-pool pattern)
// =============================================================================

/**
 * Execute batch items with configurable concurrency using a worker-pool pattern.
 * Results are written to a pre-allocated array to preserve original ordering.
 */
async function parallelBatch(
  data: Record<string, unknown>[],
  concurrency: number,
  fileNameFn: (item: Record<string, unknown>, index: number) => string,
  renderItem: (item: Record<string, unknown>, index: number) => Promise<Buffer>,
  onProgress?: (completed: number, total: number, current?: string) => void,
): Promise<BatchItemResult[]> {
  const results: BatchItemResult[] = new Array(data.length);
  let completed = 0;

  const queue = data.map((item, index) => ({ item, index }));
  const workers = Array.from(
    { length: Math.min(concurrency, data.length) },
    async () => {
      while (queue.length > 0) {
        const entry = queue.shift()!;
        const fileName = fileNameFn(entry.item, entry.index);
        try {
          const buffer = await renderItem(entry.item, entry.index);
          results[entry.index] = { index: entry.index, fileName, success: true, buffer };
        } catch (err) {
          results[entry.index] = {
            index: entry.index,
            fileName,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
        completed++;
        onProgress?.(completed, data.length, fileName);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

// =============================================================================
// BATCH RENDER
// =============================================================================

/**
 * Render a batch of data items against a DocxDocument template.
 * Each item's data is merged into template placeholders, then rendered to DOCX.
 *
 * @param template - DocxDocument with {{placeholder}} patterns in text fields
 * @param data - Array of data objects, one per output document
 * @param options - Batch options (file naming, output format, etc.)
 */
export async function batchRender(
  template: DocxDocument,
  data: Record<string, unknown>[],
  options?: BatchOptions,
): Promise<BatchResult> {
  if (!Array.isArray(data)) {
    throw new DOCXError(
      'DOC_INVALID' as any,
      'batchRender: data must be an array',
      { recovery: 'Pass an array of data objects.' },
    );
  }

  const output = options?.output ?? 'zip';

  // Empty array fast path
  if (data.length === 0) {
    let zip: Buffer | undefined;
    if (output === 'zip') {
      const emptyZip = new JSZip();
      zip = await emptyZip.generateAsync({ type: 'nodebuffer' });
    }
    return {
      results: [],
      zip,
      totalTime: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  const fileNameFn = options?.fileName ?? defaultFileName;
  const startTime = Date.now();
  const results: BatchItemResult[] = [];

  const concurrency = options?.concurrency ?? 1;

  if (concurrency > 1) {
    // Parallel rendering
    const items = await parallelBatch(
      data,
      concurrency,
      fileNameFn,
      async (item) => {
        const merged = mergeDataIntoTemplate(template, item);
        const result = await renderToDocx(merged);
        return result.buffer;
      },
      options?.onProgress,
    );
    results.push(...items);
  } else {
    // Sequential rendering (Free)
    for (let i = 0; i < data.length; i++) {
      const fileName = fileNameFn(data[i], i);
      try {
        const merged = mergeDataIntoTemplate(template, data[i]);
        const result = await renderToDocx(merged);
        results.push({ index: i, fileName, success: true, buffer: result.buffer });
      } catch (err) {
        results.push({
          index: i,
          fileName,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      options?.onProgress?.(i + 1, data.length, fileName);
    }
  }

  // Build ZIP if requested
  let zip: Buffer | undefined;
  if (output === 'zip') {
    const archive = new JSZip();
    for (const item of results) {
      if (item.success && item.buffer) {
        archive.file(item.fileName, item.buffer, { date: DETERMINISTIC_ZIP_DATE });
      }
    }
    zip = await archive.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return {
    results,
    zip,
    totalTime: Date.now() - startTime,
    successCount,
    failureCount,
  };
}

// =============================================================================
// BATCH HYDRATE
// =============================================================================

/**
 * Hydrate a batch of data items against an existing DOCX template buffer.
 * Each item is independently hydrated via hydrateDocx.
 *
 * @param templateBuffer - An existing .docx file buffer with {{placeholder}} patterns
 * @param data - Array of data objects, one per output document
 * @param options - Batch options (file naming, output format, etc.)
 */
export async function batchHydrate(
  templateBuffer: Buffer,
  data: Record<string, unknown>[],
  options?: BatchOptions,
): Promise<BatchResult> {
  if (!Array.isArray(data)) {
    throw new DOCXError(
      'DOC_INVALID' as any,
      'batchHydrate: data must be an array',
      { recovery: 'Pass an array of data objects.' },
    );
  }

  const output = options?.output ?? 'zip';

  // Empty array fast path
  if (data.length === 0) {
    let zip: Buffer | undefined;
    if (output === 'zip') {
      const emptyZip = new JSZip();
      zip = await emptyZip.generateAsync({ type: 'nodebuffer' });
    }
    return {
      results: [],
      zip,
      totalTime: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  const fileNameFn = options?.fileName ?? defaultFileName;
  const startTime = Date.now();
  const results: BatchItemResult[] = [];

  const concurrency = options?.concurrency ?? 1;

  if (concurrency > 1) {
    // Parallel hydration
    const items = await parallelBatch(
      data,
      concurrency,
      fileNameFn,
      async (item) => {
        const result = await hydrateDocx(templateBuffer, item);
        return result.buffer;
      },
      options?.onProgress,
    );
    results.push(...items);
  } else {
    // Sequential hydration (Free)
    for (let i = 0; i < data.length; i++) {
      const fileName = fileNameFn(data[i], i);
      try {
        const result = await hydrateDocx(templateBuffer, data[i]);
        results.push({ index: i, fileName, success: true, buffer: result.buffer });
      } catch (err) {
        results.push({
          index: i,
          fileName,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      options?.onProgress?.(i + 1, data.length, fileName);
    }
  }

  // Build ZIP if requested
  let zip: Buffer | undefined;
  if (output === 'zip') {
    const archive = new JSZip();
    for (const item of results) {
      if (item.success && item.buffer) {
        archive.file(item.fileName, item.buffer, { date: DETERMINISTIC_ZIP_DATE });
      }
    }
    zip = await archive.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return {
    results,
    zip,
    totalTime: Date.now() - startTime,
    successCount,
    failureCount,
  };
}
