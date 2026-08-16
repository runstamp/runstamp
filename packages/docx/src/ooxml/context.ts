import type { StructuredDocument } from '../types.js';
import type { ResolvedRevisionInfo } from '../core/revision-tracker.js';
import type { NativeOOXMLSerializerOptions } from './native-serializer.js';
import { ContentTypesRegistry } from './content-types.js';
import type { DeterministicContext } from './deterministic.js';
import { RelationshipManager } from './relationships.js';
import type { ResourceLimits } from './resource-limits.js';
import { NumberingRegistry } from './numbering.js';
import type { NativeComment } from './comments.js';
import { RevisionIdAllocator } from './revision-id-allocator.js';
import { Errors } from '../errors.js';

export interface NativeMediaPart {
  path: string;
  filename: string;
  relationshipId: string;
  contentType: string;
  extension: string;
  buffer: Buffer;
}

export interface NativeXmlPart {
  path: string;
  xml: string;
  relationshipsPath?: string;
  relationshipsXml?: string;
}

export interface NativeNote {
  id: number;
  text: string;
}

export interface NativeBookmark {
  id: number;
  name: string;
}

export interface NativeTocEntry extends NativeBookmark {
  text: string;
  level: number;
  pageNumber: string;
}

export interface ExternalImageFetchLease {
  /** Aggregate wall time still available when this fetch starts. */
  remainingTimeMs: number;
  /** Aggregate byte capacity still available when this fetch starts. */
  remainingBytes: number;
  /** Release the concurrency slot and charge elapsed time/downloaded bytes. */
  release(fetchedBytes?: number): void;
}

const DEFAULT_MAX_TOTAL_EXTERNAL_FETCH_TIME_MS = 30_000;
const DEFAULT_MAX_TOTAL_EXTERNAL_FETCH_BYTES = 50 * 1024 * 1024;

function nonNegativeBudget(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

/**
 * Serialization context (Phase 4.2 decomposed).
 *
 * The context is a large object but mutations are channeled through
 * explicit methods instead of raw field pushes. Every "who wrote this
 * warning?" or "who flipped usesFields?" question is answerable with a
 * grep for the method name: `recordWarning`, `markFieldUse`, etc.
 *
 * Raw arrays remain on the context for backwards-compat / read access,
 * but new code must mutate only through the methods.
 */
export interface SerializationContext {
  document: StructuredDocument;
  options: NativeOOXMLSerializerOptions;
  deterministic: DeterministicContext;
  limits: ResourceLimits;
  contentTypes: ContentTypesRegistry;
  documentRelationships: RelationshipManager;
  activeRelationships: RelationshipManager;
  numberingRegistry: NumberingRegistry;

  // --- Accumulated outputs (read-only from the outside; push via methods) ---
  mediaParts: NativeMediaPart[];
  xmlParts: NativeXmlPart[];
  footnotes: NativeNote[];
  endnotes: NativeNote[];
  comments: NativeComment[];
  warnings: string[];
  headingBookmarks: Map<string, NativeBookmark>;
  tocEntries: NativeTocEntry[];

  // --- Feature-flag observations (read via fields, set via methods) ---
  usesFields: boolean;
  usesEvenOddHeaders: boolean;

  // --- Derived totals ---
  totalMediaBytes: number;
  externalImageFetchesInFlight: number;
  totalExternalImageFetchTimeMs: number;
  totalExternalImageFetchBytes: number;

  // --- Revisions ---
  revisionInfo?: ResolvedRevisionInfo;
  commentsEnabled: boolean;
  deterministicExternalFetchDisabled: boolean;
  readonly revisionIdAllocator: RevisionIdAllocator;
  allocateRevisionId(revision?: { id?: number }): number;

  // --- Mutation methods (preferred API for internal code) ---

  /** Record a non-fatal warning string. Canonical codes are applied later. */
  recordWarning(message: string): void;

  /**
   * Register an added media part and grow the totalMediaBytes counter.
   * Enforces maxTotalMediaBytes automatically.
   */
  addMediaPart(part: NativeMediaPart): void;

  /** Register a finished XML part that will be written to the ZIP. */
  addXmlPart(part: NativeXmlPart): void;

  /** Register a footnote/endnote. */
  addFootnote(note: NativeNote): void;
  addEndnote(note: NativeNote): void;

  /** Register a native comment (pro-only). */
  addComment(comment: NativeComment): void;

  /** Signal that the document emits {@code <w:instrText>} fields — drives settings.xml `updateFields`. */
  markFieldUse(): void;

  /** Signal that at least one section references even/odd headers — drives `evenAndOddHeaders` in settings. */
  markEvenOddHeaders(): void;

  /**
   * Reserve one external image fetch slot. Returns the remaining aggregate
   * budgets and a release callback that charges this fetch to the render.
   * Native renders are usually sequential, but the explicit counter keeps
   * future parallel image work bounded by the same release gate.
   */
  acquireExternalImageFetch(url: string): ExternalImageFetchLease;
}

export interface SerializationContextOptions {
  document: StructuredDocument;
  options: NativeOOXMLSerializerOptions;
  deterministic: DeterministicContext;
  limits: ResourceLimits;
  contentTypes: ContentTypesRegistry;
  documentRelationships: RelationshipManager;
  deterministicExternalFetchDisabled?: boolean;
  revisionInfo?: ResolvedRevisionInfo;
  commentsEnabled?: boolean;
  reservedRevisionIds?: Iterable<number>;
}

export function createSerializationContext(input: SerializationContextOptions): SerializationContext {
  const revisionIdAllocator = new RevisionIdAllocator({
    reserved: input.reservedRevisionIds,
  });

  const ctx: SerializationContext = {
    document: input.document,
    options: input.options,
    deterministic: input.deterministic,
    limits: input.limits,
    contentTypes: input.contentTypes,
    documentRelationships: input.documentRelationships,
    activeRelationships: input.documentRelationships,
    numberingRegistry: new NumberingRegistry(
      input.deterministic,
      input.options.startAbstractNumId,
      input.options.startNumId,
    ),
    mediaParts: [],
    xmlParts: [],
    footnotes: [],
    endnotes: [],
    comments: [],
    revisionInfo: input.revisionInfo,
    commentsEnabled: input.commentsEnabled ?? false,
    deterministicExternalFetchDisabled: input.deterministicExternalFetchDisabled ?? true,
    revisionIdAllocator,
    allocateRevisionId(revision) {
      return revisionIdAllocator.allocate(revision);
    },
    headingBookmarks: new Map(),
    tocEntries: [],
    warnings: [...input.document.warnings],
    totalMediaBytes: 0,
    externalImageFetchesInFlight: 0,
    totalExternalImageFetchTimeMs: 0,
    totalExternalImageFetchBytes: 0,
    usesFields: false,
    usesEvenOddHeaders: false,

    recordWarning(message: string) {
      ctx.warnings.push(message);
    },

    addMediaPart(part: NativeMediaPart) {
      const newTotal = ctx.totalMediaBytes + part.buffer.length;
      if (newTotal > ctx.limits.maxTotalMediaBytes) {
        throw Errors.imageTooLarge('total-media', newTotal, ctx.limits.maxTotalMediaBytes);
      }
      ctx.totalMediaBytes = newTotal;
      ctx.mediaParts.push(part);
    },

    addXmlPart(part: NativeXmlPart) {
      ctx.xmlParts.push(part);
    },

    addFootnote(note: NativeNote) {
      ctx.footnotes.push(note);
    },

    addEndnote(note: NativeNote) {
      ctx.endnotes.push(note);
    },

    addComment(comment: NativeComment) {
      ctx.comments.push(comment);
    },

    markFieldUse() {
      ctx.usesFields = true;
    },

    markEvenOddHeaders() {
      ctx.usesEvenOddHeaders = true;
    },

    acquireExternalImageFetch(url: string) {
      const maxConcurrent = Math.max(1, input.options.imageFetch?.maxConcurrentExternalFetches ?? 1);
      const maxTotalTimeMs = nonNegativeBudget(
        input.options.imageFetch?.maxTotalExternalFetchTimeMs,
        DEFAULT_MAX_TOTAL_EXTERNAL_FETCH_TIME_MS,
      );
      const maxTotalBytes = nonNegativeBudget(
        input.options.imageFetch?.maxTotalExternalFetchBytes,
        DEFAULT_MAX_TOTAL_EXTERNAL_FETCH_BYTES,
      );
      const remainingTimeMs = maxTotalTimeMs - ctx.totalExternalImageFetchTimeMs;
      const remainingBytes = maxTotalBytes - ctx.totalExternalImageFetchBytes;

      if (remainingTimeMs <= 0) {
        throw Errors.imageFetchFailed(
          url,
          `External image fetch time budget exhausted (${ctx.totalExternalImageFetchTimeMs}ms / ${maxTotalTimeMs}ms)`,
        );
      }
      if (remainingBytes <= 0) {
        throw Errors.imageFetchFailed(
          url,
          `External image fetch byte budget exhausted (${ctx.totalExternalImageFetchBytes} / ${maxTotalBytes} bytes)`,
        );
      }
      if (ctx.externalImageFetchesInFlight >= maxConcurrent) {
        throw Errors.imageFetchFailed(
          url,
          `External image fetch concurrency exceeded (${ctx.externalImageFetchesInFlight + 1} > ${maxConcurrent})`,
        );
      }

      ctx.externalImageFetchesInFlight += 1;
      // lint-allow-nondeterministic: fetch-budget timing only; never written to OOXML
      const startedAt = Date.now();
      let released = false;
      return {
        remainingTimeMs,
        remainingBytes,
        release(fetchedBytes = 0) {
          if (released) {
            return;
          }
          released = true;
          ctx.externalImageFetchesInFlight = Math.max(0, ctx.externalImageFetchesInFlight - 1);
          // lint-allow-nondeterministic: fetch-budget timing only; never written to OOXML
          const elapsedMs = Math.max(0, Date.now() - startedAt);
          ctx.totalExternalImageFetchTimeMs += elapsedMs;
          ctx.totalExternalImageFetchBytes += Math.max(0, fetchedBytes);

          if (ctx.totalExternalImageFetchTimeMs > maxTotalTimeMs) {
            throw Errors.imageFetchFailed(
              url,
              `External image fetch time budget exceeded (${ctx.totalExternalImageFetchTimeMs}ms > ${maxTotalTimeMs}ms)`,
            );
          }
          if (ctx.totalExternalImageFetchBytes > maxTotalBytes) {
            throw Errors.imageFetchFailed(
              url,
              `External image fetch byte budget exceeded (${ctx.totalExternalImageFetchBytes} > ${maxTotalBytes} bytes)`,
            );
          }
        },
      };
    },
  };

  return ctx;
}

export function withActiveRelationships<T>(
  context: SerializationContext,
  relationships: RelationshipManager,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = context.activeRelationships;
  context.activeRelationships = relationships;
  return callback().finally(() => {
    context.activeRelationships = previous;
  });
}
