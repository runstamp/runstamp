/**
 * DOCX Template Hydrator
 *
 * Core engine for the template hydration (patch) system.
 * Accepts a .docx buffer + data map, finds {{placeholder}} patterns,
 * replaces them with content, and returns a modified .docx buffer.
 *
 * Per PRD §4: User uploads a .docx with Mustache placeholders.
 * Engine unzips, finds placeholders, replaces with text or generated
 * OOXML (tables, images), preserving all template styling.
 */

import JSZip from 'jszip';
import { DOCXError, DOCXErrorCode } from '../errors.js';
import { getScannableParts, type PlaceholderMatch } from './placeholder-scanner';
import {
  createRelationshipManager,
  type HydrationValue,
} from './ooxml-injector';
import {
  hydrateXmlPartWithTree,
  resolveTemplateValue,
  scanXmlForPlaceholdersTree,
} from './tree-walker';

const DETERMINISTIC_ZIP_DATE = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));
const DEFAULT_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

export interface HydrationImageLimits {
  /** Maximum decoded bytes for a single inserted image. */
  maxImageBytes?: number;
  /** Maximum decoded bytes across all inserted images. */
  maxTotalImageBytes?: number;
  /** Allowed data URI MIME types for inserted images. */
  allowedMimeTypes?: string[];
}

/** Resource ceilings applied before an untrusted DOCX template is processed. */
export interface HydrationArchiveLimits {
  /** Maximum compressed template size. Default: 25 MiB. */
  maxCompressedBytes?: number;
  /** Maximum number of ZIP entries, including directories. Default: 2,048. */
  maxEntries?: number;
  /** Maximum expanded bytes for any single file part. Default: 16 MiB. */
  maxPartBytes?: number;
  /** Maximum expanded bytes across all file parts. Default: 100 MiB. */
  maxTotalExpandedBytes?: number;
}

const DEFAULT_ARCHIVE_LIMITS: Required<HydrationArchiveLimits> = {
  maxCompressedBytes: 25 * 1024 * 1024,
  maxEntries: 2_048,
  maxPartBytes: 16 * 1024 * 1024,
  maxTotalExpandedBytes: 100 * 1024 * 1024,
};

export interface HydrationReplacementTelemetry {
  placeholder: string;
  part: string;
  path: string;
  runRange: string;
  replacementKind: string;
}

export interface HydrationUnfilledTelemetry {
  placeholder: string;
  part: string;
  path: string;
  mode: 'keep' | 'remove';
}

export interface HydrationWarningTelemetry {
  code: string;
  part: string;
  path: string;
  recovery?: string;
}

export interface HydrationTelemetry {
  replaced: HydrationReplacementTelemetry[];
  unfilled: HydrationUnfilledTelemetry[];
  warnings: HydrationWarningTelemetry[];
}

/** Options for template hydration */
export interface HydrationOptions {
  /** Whether to throw on missing placeholders (default: false — leaves them as-is) */
  strictMode?: boolean;
  /** Whether to remove unfilled placeholders (default: false) */
  removeUnfilled?: boolean;
  /** Template marker dialect to process. Default: auto-detect. */
  syntax?: "mustache" | "office" | "auto";
  /** Whether zip entry timestamps are normalized for byte-reproducible hydration output. Default: true. */
  deterministicZip?: boolean;
  /** Resource limits for image insertions during hydration. */
  imageLimits?: HydrationImageLimits;
  /** Resource limits for the input DOCX ZIP archive. */
  archiveLimits?: HydrationArchiveLimits;
}

/** Result of template hydration */
export interface HydrationResult {
  /** The hydrated DOCX buffer */
  buffer: Buffer;
  /** Placeholders that were found and replaced */
  replaced: string[];
  /** Placeholders found in template but not in data */
  unfilled: string[];
  /** Warnings generated during hydration */
  warnings: string[];
  /** Structured telemetry for reviewerless hydration gates */
  telemetry: HydrationTelemetry;
  /** Statistics */
  stats: {
    totalPlaceholders: number;
    replacedCount: number;
    unfilledCount: number;
    processingTimeMs: number;
    fileSizeBytes: number;
  };
}

function makeMissingPlaceholderError(syntax: HydrationOptions['syntax'], key: string): DOCXError {
  return new DOCXError(
    DOCXErrorCode.DOC_INVALID,
    `Missing data for placeholder: ${syntax === "office" ? `{d.${key}}` : `{{${key}}}`}`,
    {
      recovery: 'Provide a value under the matching key in the hydration data, or disable strictMode.',
      context: { placeholder: key },
    },
  );
}

function useDeterministicZip(options: HydrationOptions): boolean {
  return options.deterministicZip !== false;
}

function fileOptions(options: HydrationOptions): JSZip.JSZipFileOptions | undefined {
  return useDeterministicZip(options) ? { date: DETERMINISTIC_ZIP_DATE } : undefined;
}

function normalizeExistingZipDates(zip: JSZip, options: HydrationOptions): void {
  if (!useDeterministicZip(options)) {
    return;
  }
  for (const entry of Object.values(zip.files)) {
    entry.date = DETERMINISTIC_ZIP_DATE;
  }
}

function archiveLimitError(
  message: string,
  context: Record<string, unknown>,
): DOCXError {
  return new DOCXError(DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED, message, {
    recovery: 'Use a smaller DOCX template or raise the matching archiveLimits ceiling after validating the source.',
    context,
  });
}

async function loadTemplateArchive(
  templateBuffer: Buffer | Uint8Array,
  configuredLimits?: HydrationArchiveLimits,
): Promise<JSZip> {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...configuredLimits };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw archiveLimitError(
        `Hydration archive limit "${name}" must be a non-negative safe integer.`,
        { limit: name, value },
      );
    }
  }
  if (templateBuffer.byteLength > limits.maxCompressedBytes) {
    throw archiveLimitError(
      `Hydration template exceeds compressed-size limit: ${templateBuffer.byteLength} bytes (max: ${limits.maxCompressedBytes}).`,
      { sizeBytes: templateBuffer.byteLength, maxBytes: limits.maxCompressedBytes },
    );
  }

  const zip = await JSZip.loadAsync(templateBuffer);
  const entries = Object.values(zip.files);
  if (entries.length > limits.maxEntries) {
    throw archiveLimitError(
      `Hydration template exceeds ZIP-entry limit: ${entries.length} entries (max: ${limits.maxEntries}).`,
      { entryCount: entries.length, maxEntries: limits.maxEntries },
    );
  }

  let totalExpandedBytes = 0;
  for (const entry of entries) {
    if (entry.dir) continue;

    // JSZip records the central-directory size before expansion. Treat it as
    // an early rejection signal, then verify the actual expanded byte count.
    const declaredBytes = (entry as unknown as { _data?: { uncompressedSize?: number } })
      ._data?.uncompressedSize;
    if (typeof declaredBytes === 'number' && declaredBytes > limits.maxPartBytes) {
      throw archiveLimitError(
        `Hydration template part "${entry.name}" exceeds expanded-size limit: ${declaredBytes} bytes (max: ${limits.maxPartBytes}).`,
        { part: entry.name, sizeBytes: declaredBytes, maxBytes: limits.maxPartBytes },
      );
    }
    if (typeof declaredBytes === 'number' && totalExpandedBytes + declaredBytes > limits.maxTotalExpandedBytes) {
      throw archiveLimitError(
        `Hydration template exceeds total expanded-size limit: more than ${limits.maxTotalExpandedBytes} bytes.`,
        { part: entry.name, maxBytes: limits.maxTotalExpandedBytes },
      );
    }

    const expanded = await entry.async('uint8array');
    if (expanded.byteLength > limits.maxPartBytes) {
      throw archiveLimitError(
        `Hydration template part "${entry.name}" exceeds expanded-size limit: ${expanded.byteLength} bytes (max: ${limits.maxPartBytes}).`,
        { part: entry.name, sizeBytes: expanded.byteLength, maxBytes: limits.maxPartBytes },
      );
    }
    totalExpandedBytes += expanded.byteLength;
    if (totalExpandedBytes > limits.maxTotalExpandedBytes) {
      throw archiveLimitError(
        `Hydration template exceeds total expanded-size limit: ${totalExpandedBytes} bytes (max: ${limits.maxTotalExpandedBytes}).`,
        { part: entry.name, sizeBytes: totalExpandedBytes, maxBytes: limits.maxTotalExpandedBytes },
      );
    }
  }

  return zip;
}

function parseDataImage(
  source: string,
  limits: HydrationImageLimits | undefined,
  totalBytes: { value: number },
): { bytes: Buffer; extension: 'png' | 'jpg'; contentType: string } {
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/i.exec(source);
  if (!match) {
    throw new DOCXError(
      DOCXErrorCode.IMAGE_INVALID_FORMAT,
      'Hydration image sources must be base64 data URIs.',
      {
        recovery: 'Provide image data as data:image/png;base64,... or data:image/jpeg;base64,... for deterministic hydration.',
        context: { source: source.slice(0, 80) },
      },
    );
  }

  const mimeType = match[1].toLowerCase();
  const allowedMimeTypes = limits?.allowedMimeTypes ?? [...DEFAULT_IMAGE_MIME_TYPES];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new DOCXError(
      DOCXErrorCode.IMAGE_INVALID_FORMAT,
      `Unsupported hydration image MIME type: ${mimeType}`,
      {
        recovery: `Use one of: ${allowedMimeTypes.join(', ')}.`,
        context: { mimeType },
      },
    );
  }

  const bytes = Buffer.from(match[2], 'base64');
  if (limits?.maxImageBytes !== undefined && bytes.length > limits.maxImageBytes) {
    throw new DOCXError(
      DOCXErrorCode.IMAGE_SIZE_EXCEEDED,
      `Hydration image exceeds per-image limit: ${bytes.length} bytes (max: ${limits.maxImageBytes}).`,
      {
        recovery: 'Reduce the image size or raise imageLimits.maxImageBytes.',
        context: { sizeBytes: bytes.length, maxBytes: limits.maxImageBytes },
      },
    );
  }

  const nextTotal = totalBytes.value + bytes.length;
  if (limits?.maxTotalImageBytes !== undefined && nextTotal > limits.maxTotalImageBytes) {
    throw new DOCXError(
      DOCXErrorCode.RESOURCE_LIMIT_EXCEEDED,
      `Hydration images exceed total media limit: ${nextTotal} bytes (max: ${limits.maxTotalImageBytes}).`,
      {
        recovery: 'Reduce inserted images or raise imageLimits.maxTotalImageBytes.',
        context: { sizeBytes: nextTotal, maxBytes: limits.maxTotalImageBytes },
      },
    );
  }
  totalBytes.value = nextTotal;

  return {
    bytes,
    extension: mimeType === 'image/jpeg' ? 'jpg' : 'png',
    contentType: mimeType,
  };
}

function insertRelationshipXml(relsXml: string, id: string, type: string, target: string): string {
  const relEntry = `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`;
  return relsXml.replace('</Relationships>', `${relEntry}\n</Relationships>`);
}

function ensureContentTypeDefaultXml(xml: string, extension: string, contentType: string): string {
  if (xml.includes(`Extension="${extension}"`)) {
    return xml;
  }
  return xml.replace(
    '</Types>',
    `<Default Extension="${extension}" ContentType="${contentType}"/>\n</Types>`,
  );
}

function getTemplatePartPaths(zip: JSZip): string[] {
  const parts = new Set(getScannableParts());
  for (const path of Object.keys(zip.files)) {
    if (/^word\/(?:header|footer)\d+\.xml$/.test(path)) {
      parts.add(path);
    }
    if (/^word\/(?:footnotes|endnotes|comments)\.xml$/.test(path)) {
      parts.add(path);
    }
  }
  return [...parts];
}

/**
 * Hydrate a DOCX template with data.
 *
 * @param templateBuffer - The original .docx file as a Buffer
 * @param data - Key-value map where keys match placeholder names
 * @param options - Hydration options
 * @returns The modified .docx buffer with placeholders replaced
 */
export async function hydrateTemplate(
  templateBuffer: Buffer | Uint8Array,
  data: Record<string, HydrationValue>,
  options: HydrationOptions = {}
): Promise<HydrationResult> {
  // lint-allow-nondeterministic: perf timer only; value surfaces in stats, not output bytes
  const startTime = Date.now();
  const warnings: string[] = [];
  const replaced: string[] = [];
  const unfilled: string[] = [];
  const telemetry: HydrationTelemetry = { replaced: [], unfilled: [], warnings: [] };
  const totalInsertedImageBytes = { value: 0 };

  // 1. Unzip the DOCX
  const zip = await loadTemplateArchive(templateBuffer, options.archiveLimits);
  normalizeExistingZipDates(zip, options);

  // 2. Scan all relevant parts for placeholders
  const scannableParts = getTemplatePartPaths(zip);
  const allPlaceholders: PlaceholderMatch[] = [];
  const syntax = options.syntax ?? "auto";

  for (const partPath of scannableParts) {
    const file = zip.file(partPath);
    if (!file) continue;

    const content = await file.async('string');
    const matches = scanXmlForPlaceholdersTree(content, partPath, syntax);
    allPlaceholders.push(...matches);
  }

  // 3. Determine unique placeholder keys
  const uniqueKeys = [...new Set(allPlaceholders.map(p => p.key))];
  const syntaxByKey = new Map(allPlaceholders.map((placeholder) => [placeholder.key, placeholder.syntax]));

  // 4. Check for missing data.
  // `key in data` is the wrong check for dotted paths like "customer.name"
  // because `data` holds the nested value under a two-level object.
  // Resolve through the same path walker used by the actual replacement
  // pass so the unfilled list stays truthful.
  for (const key of uniqueKeys) {
    const resolved = resolveTemplateValue(data, key);
    if (resolved === undefined) {
      unfilled.push(key);
      if (options.strictMode) {
        throw makeMissingPlaceholderError(syntaxByKey.get(key) ?? syntax, key);
      }
    }
  }

  // 5. Process each part that contains placeholders
  const partsWithPlaceholders = [...new Set(allPlaceholders.map(p => p.filePath))];
  let imageCounter = 1;

  for (const partPath of partsWithPlaceholders) {
    const file = zip.file(partPath);
    if (!file) continue;

    // Create a RelationshipManager for this part to track image relationships
    const relManager = createRelationshipManager(100 + imageCounter);

    const content = hydrateXmlPartWithTree(await file.async('string'), {
      partPath,
      syntax,
      data,
      hydrationOptions: options,
      relationshipManager: relManager,
      telemetry,
      markReplaced(key: string) {
      if (!replaced.includes(key)) {
        replaced.push(key);
      }
      },
    });

    // Write back to zip
    zip.file(partPath, content, fileOptions(options));

    // If images were added, wire up relationships and media files
    const newRels = relManager.getRelationships();
    if (newRels.length > 0) {
      // Determine the .rels file path for this part
      const partDir = partPath.substring(0, partPath.lastIndexOf('/') + 1);
      const partName = partPath.substring(partPath.lastIndexOf('/') + 1);
      const relsPath = `${partDir}_rels/${partName}.rels`;

      // Read existing .rels or create minimal one
      let relsXml: string;
      const relsFile = zip.file(relsPath);
      if (relsFile) {
        relsXml = await relsFile.async('string');
      } else {
        relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n</Relationships>';
      }

      // Add new relationship entries and write image data
      for (const rel of newRels) {
        const image = parseDataImage(rel.target, options.imageLimits, totalInsertedImageBytes);
        const imageFileName = `image${imageCounter++}.${image.extension}`;
        const mediaPath = `word/media/${imageFileName}`;

        zip.file(mediaPath, image.bytes, fileOptions(options));
        relsXml = insertRelationshipXml(relsXml, rel.id, rel.type, `media/${imageFileName}`);
      }

      zip.file(relsPath, relsXml, fileOptions(options));

      // Ensure [Content_Types].xml has the inserted image defaults.
      const contentTypesFile = zip.file('[Content_Types].xml');
      if (contentTypesFile) {
        let ctXml = await contentTypesFile.async('string');
        for (const rel of newRels) {
          const image = parseDataImage(rel.target, options.imageLimits, { value: 0 });
          ctXml = ensureContentTypeDefaultXml(ctXml, image.extension, image.contentType);
        }
        zip.file('[Content_Types].xml', ctXml, fileOptions(options));
      }
    }
  }

  // 6. Re-zip
  const outputBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // lint-allow-nondeterministic: perf timer diff
  const processingTimeMs = Date.now() - startTime;

  return {
    buffer: outputBuffer,
    replaced,
    unfilled,
    warnings,
    telemetry,
    stats: {
      totalPlaceholders: allPlaceholders.length,
      replacedCount: replaced.length,
      unfilledCount: unfilled.length,
      processingTimeMs,
      fileSizeBytes: outputBuffer.length,
    },
  };
}

/**
 * Scan a DOCX template to list all placeholders without replacing them.
 * Useful for UI to show available fields.
 */
export async function scanTemplate(
  templateBuffer: Buffer | Uint8Array,
  syntax: "mustache" | "office" | "auto" = "auto",
  archiveLimits?: HydrationArchiveLimits,
): Promise<{
  placeholders: PlaceholderMatch[];
  uniqueKeys: string[];
}> {
  const zip = await loadTemplateArchive(templateBuffer, archiveLimits);
  const scannableParts = getTemplatePartPaths(zip);
  const allPlaceholders: PlaceholderMatch[] = [];

  for (const partPath of scannableParts) {
    const file = zip.file(partPath);
    if (!file) continue;

    const content = await file.async('string');
    const matches = scanXmlForPlaceholdersTree(content, partPath, syntax);
    allPlaceholders.push(...matches);
  }

  const uniqueKeys = [...new Set(allPlaceholders.map(p => p.key))];

  return { placeholders: allPlaceholders, uniqueKeys };
}
