/**
 * `@runstamp/docx/ops` — the OC-1 operation surface for the `docx` domain.
 *
 * Every export is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * These are thin adapters over the existing engine — no rendering logic is
 * reimplemented. The legacy exports on the package root keep working unchanged
 * through the deprecation window.
 */

import {
  createArtifactBytes,
  hashBytes,
  hashValue,
  runOperation,
  MEDIA_TYPES,
  PaperError,
  SCHEMA_REJECTED,
  requireBytes,
} from "@runstamp/contract";
import type {
  ArtifactBytes,
  OperationContext,
  OperationOptions,
  OperationResult,
} from "@runstamp/contract";

import { classifyWarning } from "./losses.js";
import { DOCX_CONTROLLED } from "./controlled.js";
import type { EngineWarning } from "./losses.js";
import {
  renderToDocx,
  renderToPdf,
  validateDocxDocument,
  renderHtmlToDocx,
} from "../render.js";
import { compareDocuments } from "../diff/compare-documents.js";
import { docxToStructured } from "../adapters/docx-to-structured.js";
import type { DocxWarning, RenderOptions, StructuredDocument, ValidationResult } from "../types.js";
import { DocxDocumentSchema, type DocxDocument, type HtmlDocxOptions } from "../schema.js";

const DOMAIN = "docx" as const;

// Read from the manifest by the release script; a literal here avoids a JSON
// import assertion in the published ESM output.
const ENGINE = { name: "@runstamp/docx", version: "1.0.0" } as const;

/** Errors the engine throws carry DOCXError's shape; the bridge maps them. */
const ERROR_CONTEXT = { model: "docx", domain: DOMAIN } as const;

function toBuffer(bytes: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

type DocxInput = DocxDocument | StructuredDocument;

/**
 * Feed the engine's in-band warnings into the ledger.
 *
 * `DocxResult.warnings` is where every fidelity deviation the serializer, the
 * PDF bridge and the hydrator detect already surfaces; without this the envelope
 * would claim `losses: []` for a document whose placeholders were never filled.
 */
function drainWarnings(
  warnings: readonly DocxWarning[] | undefined,
  artifact: string,
  context: OperationContext,
): void {
  for (const warning of warnings ?? []) {
    const { loss, diagnostic } = classifyWarning(warning as EngineWarning, artifact);
    if (loss) context.addLoss(loss);
    if (diagnostic) context.addDiagnostic(diagnostic);
  }
}

/** Options accepted by `render`, layered on the shared operation options. */
export interface DocxRenderOpOptions extends OperationOptions {
  readonly render?: RenderOptions;
}

/**
 * Structured document → native DOCX bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.docx", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
export async function render(
  input: DocxInput,
  options?: DocxRenderOpOptions,
): Promise<OperationResult<ArtifactBytes>> {
  // Memoized so locators bind to the same hash without hashing twice, and lazy
  // so a value that cannot be canonicalized fails as a result, not a throw (R4).
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "docx.render",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const artifact = inputHash();
      const result = await renderToDocx(input, {
        ...options?.render,
        deterministic: context.deterministic,
      });
      drainWarnings(result.warnings, artifact, context);
      const value = createArtifactBytes(result.buffer, MEDIA_TYPES.docx, "docx");
      return { value, outputHash: value.hash };
    },
  });
}

/** Native DOCX document model → the shared structured model. */
export async function parse(
  input: DocxDocument,
  options?: OperationOptions,
): Promise<OperationResult<StructuredDocument>> {
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "docx.parse",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const parsed = DocxDocumentSchema.safeParse(input);
      if (!parsed.success) {
        throw new PaperError({
          code: "docx/DOC_INVALID",
          message: "The DOCX document model does not match the required schema.",
          phase: "validation",
          remediation: "Validate the document model and correct the reported shape before parsing it.",
        });
      }
      const value = docxToStructured(parsed.data);
      if (context.deterministic) value.stats.extractionTimeMs = 0;
      return { value };
    },
  });
}

/** Check a document for defects. Never mutates the input. */
export async function validate(
  input: unknown,
  options?: OperationOptions,
): Promise<OperationResult<ValidationResult>> {
  return runOperation({
    operation: "docx.validate",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashValue(input),
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async () => ({ value: validateDocxDocument(input) }),
  });
}

/** The in-format mutations `transform` supports. */
export type DocxTransformPlan = { readonly kind: "hydrate"; readonly data: Record<string, unknown> };

/**
 * Cross-format conversion. Today only DOCX → PDF.
 *
 * Every approximation the PDF bridge makes is reported as a loss, so a caller
 * can see what changed rather than receiving silently-different output.
 */
export async function convert(
  input: DocxInput,
  options?: DocxRenderOpOptions & { readonly to?: "pdf" },
): Promise<OperationResult<ArtifactBytes>> {
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));
  const target = options?.to ?? "pdf";

  return runOperation({
    operation: "docx.convert.pdf",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      if (target !== "pdf") {
        // Reaches the caller as a typed failure, not a throw.
        throw Object.assign(new Error(`Unsupported conversion target "${String(target)}".`), {
          code: "UNSUPPORTED_FEATURE",
        });
      }
      const artifact = inputHash();
      const result = await renderToPdf(input, {
        ...options?.render,
        deterministic: context.deterministic,
      });
      drainWarnings(result.warnings, artifact, context);
      const value = createArtifactBytes(result.buffer, MEDIA_TYPES.pdf, "pdf");
      return { value, outputHash: value.hash };
    },
  });
}

export interface DocxDiffValue {
  /** The revised document with tracked changes applied. */
  readonly artifact: ArtifactBytes;
  readonly changes: readonly unknown[];
  readonly summary: string;
  readonly statistics: unknown;
}

/** Semantic comparison of two DOCX files, as tracked changes. */
export async function diff(
  input: readonly [Uint8Array | Buffer, Uint8Array | Buffer],
  options?: OperationOptions & { readonly author?: string; readonly date?: string },
): Promise<OperationResult<DocxDiffValue>> {
  // Lazy for the same reason as the single-buffer verbs: indexing and coercing
  // here, outside `runOperation`, made every hostile input throw a raw TypeError
  // instead of returning a typed failure (R4).
  const pair = (): readonly [Buffer, Buffer] => {
    if (!Array.isArray(input) || input.length !== 2) {
      throw new PaperError({
        message: `docx.diff compares two documents, but received ${Array.isArray(input) ? `an array of ${String(input.length)}` : "a non-array input"}.`,
        code: SCHEMA_REJECTED,
        phase: "validation",
        remediation: "Pass exactly two rendered documents as [before, after], each a Uint8Array or Buffer.",
      });
    }
    return [toBuffer(requireBytes(input[0])), toBuffer(requireBytes(input[1]))];
  };

  return runOperation({
    operation: "docx.diff",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => {
      const [before, after] = pair();
      return hashValue([hashBytes(before), hashBytes(after)]);
    },
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const [before, after] = pair();
      const result = await compareDocuments(before, after, {
        ...(options?.author !== undefined ? { author: options.author } : {}),
        ...(options?.date !== undefined ? { date: options.date } : {}),
        deterministic: context.deterministic,
      });
      const artifact = createArtifactBytes(result.buffer, MEDIA_TYPES.docx, "docx");
      return {
        value: {
          artifact,
          changes: result.changes,
          summary: result.summary,
          statistics: result.statistics,
        },
        outputHash: artifact.hash,
      };
    },
  });
}

/** HTML → native DOCX bytes. Unsupported constructs are reported as losses. */
export async function transform(
  input: string,
  options?: OperationOptions & { readonly html?: HtmlDocxOptions },
): Promise<OperationResult<ArtifactBytes>> {
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "docx.transform.html",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const artifact = inputHash();
      const result = await renderHtmlToDocx(input, options?.html);
      drainWarnings(result.warnings, artifact, context);
      const value = createArtifactBytes(result.buffer, MEDIA_TYPES.docx, "docx");
      return { value, outputHash: value.hash };
    },
  });
}

// Re-exported so a consumer never needs a second install to type a result (R37).
// Types only: R35 keeps this surface to canonical verbs and types, so the
// `isOk`/`isFail`/`unwrap` helpers stay on `@runstamp/contract`. Nothing is lost
// — R6 makes `ok` the sole discriminant, so `if (result.ok)` narrows unaided.
export type {
  ArtifactBytes,
  Diagnostic,
  Loss,
  Locator,
  OperationOptions,
  OperationResult,
  PaperError,
  Receipt,
} from "@runstamp/contract";

// ---------------------------------------------------------------------------
// Projected from the embedded controlled-document extension (./controlled.ts).
// ---------------------------------------------------------------------------

export const redact = DOCX_CONTROLLED.ops.redact as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;

export const inspect = DOCX_CONTROLLED.ops.inspect as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;
