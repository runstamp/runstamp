/**
 * `@runstamp/pdf/ops` — the OC-1 operation surface for the `pdf` domain.
 *
 * Every export here is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * These are thin adapters over the existing engine — no rendering logic is
 * reimplemented here. The legacy exports on the package root keep working
 * unchanged for the deprecation window.
 */

import {
  createArtifactBytes,
  hashBytes,
  hashValue,
  runOperation,
  MEDIA_TYPES,
  requireBytes,
} from "@runstamp/contract";
import type {
  ArtifactBytes,
  OperationOptions,
  OperationResult,
} from "@runstamp/contract";

import { classifyWarning } from "./losses.js";
import { PDF_EVIDENCE } from "./evidence.js";
import { PdfEngine } from "../engine.js";
import { validatePdfBuffer } from "../phase10-validate.js";
import { extractPdfSignatures } from "../phase10-validate.js";
import { repairPdfBuffer } from "../phase10-repair.js";
import { linearizePdfBuffer } from "../phase9-stream.js";
import type { PdfDocument } from "../engine.js";
import type { PdfRenderOptions } from "../phase9-types.js";

const DOMAIN = "pdf" as const;

// Version is read at build time from the package manifest by the release script;
// keeping it a literal avoids a JSON import assertion in the published ESM output.
const ENGINE = { name: "@runstamp/pdf", version: "1.0.0" } as const;

function toBuffer(bytes: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

/**
 * Memoized, lazy byte resolution.
 *
 * Resolution has to happen *inside* `runOperation` — from `inputHash` or
 * `execute` — so that a caller passing something other than bytes gets a typed
 * failure with a remediation rather than a raw `TypeError`. Binding the buffer
 * eagerly, before `runOperation` is entered, puts the throw back outside the
 * guard and reintroduces the R4 violation this replaced.
 */
function lazyBuffer(input: unknown): () => Buffer {
  let cached: Buffer | undefined;
  return () => (cached ??= toBuffer(requireBytes(input)));
}

/** Options accepted by `render`, layered on the shared operation options. */
export interface PdfRenderOpOptions extends OperationOptions {
  readonly render?: PdfRenderOptions;
}

/**
 * Structured document → native PDF bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.pdf", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
export async function render(
  input: PdfDocument,
  options?: PdfRenderOpOptions,
): Promise<OperationResult<ArtifactBytes>> {
  // Memoized so the locators below can bind to the input hash without hashing
  // twice — and still computed lazily, inside the harness guard, because hashing
  // an arbitrary caller value can itself throw (R4).
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "pdf.render",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const artifact = inputHash();
      const renderOptions: PdfRenderOptions = {
        ...options?.render,
        deterministic: context.deterministic,
        // R16: the engine detects every fidelity deviation here and would
        // otherwise report it to nobody. Without this the envelope would claim
        // `losses: []` for a document whose characters were replaced with "?".
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.render?.onInputWarning?.(warning);
        },
      };
      const buffer = await PdfEngine.render(input, renderOptions);
      const value = createArtifactBytes(buffer, MEDIA_TYPES.pdf, "pdf");
      return { value, outputHash: value.hash };
    },
  });
}

export interface PdfValidationReport {
  readonly valid: boolean;
  /** The engine's native validation summary, unmodified. */
  readonly summary: unknown;
}

/** Inspect PDF bytes for conformance defects. Never mutates the input. */
export async function validate(
  input: Uint8Array | Buffer,
  options?: OperationOptions,
): Promise<OperationResult<PdfValidationReport>> {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "pdf.validate",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    ...(options !== undefined ? { options } : {}),
    execute: async () => {
      const summary = (await validatePdfBuffer(buffer())) as { issues?: unknown[] };
      const issueCount = Array.isArray(summary.issues) ? summary.issues.length : 0;
      return { value: { valid: issueCount === 0, summary } };
    },
  });
}

/**
 * Repair defects in PDF bytes.
 *
 * Every change the repairer makes is reported as a `substituted` loss, so a caller
 * can see exactly what was altered rather than receiving silently-rewritten bytes.
 */
export async function repair(
  input: Uint8Array | Buffer,
  options?: OperationOptions,
): Promise<OperationResult<ArtifactBytes>> {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "pdf.repair",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const result = (await repairPdfBuffer(buffer())) as {
        buffer?: Buffer;
        actions?: { type?: string; description?: string }[];
      };
      for (const action of result.actions ?? []) {
        context.addLoss({
          code: "pdf/REPAIR_APPLIED",
          severity: "substituted",
          subject: action.type ?? "pdf structure",
          message: action.description ?? `Repair applied: ${action.type ?? "unknown"}`,
          avoidable: false,
          details: { action },
        });
      }
      const repaired = result.buffer ?? buffer();
      const value = createArtifactBytes(repaired, MEDIA_TYPES.pdf, "pdf");
      return { value, outputHash: value.hash };
    },
  });
}

/** The in-format mutations `transform` supports. */
export type PdfTransformPlan = { readonly kind: "linearize" };

/** Bounded in-format mutation of PDF bytes. */
export async function transform(
  input: Uint8Array | Buffer,
  options?: OperationOptions & { readonly plan?: PdfTransformPlan },
): Promise<OperationResult<ArtifactBytes>> {
  const buffer = lazyBuffer(input);
  const plan = options?.plan ?? { kind: "linearize" };
  return runOperation({
    operation: "pdf.transform",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    ...(options !== undefined ? { options } : {}),
    execute: async () => {
      if (plan.kind !== "linearize") {
        // Reaches the caller as a typed failure, not a throw.
        throw Object.assign(new Error(`Unsupported transform plan "${String(plan.kind)}".`), {
          code: "UNSUPPORTED_PLAN",
        });
      }
      const linearized = await linearizePdfBuffer(buffer());
      const value = createArtifactBytes(linearized, MEDIA_TYPES.pdf, "pdf");
      return { value, outputHash: value.hash };
    },
  });
}

/** What `extract` can pull out of a PDF. */
export type PdfExtractSelector = "signatures";

export interface PdfExtraction {
  readonly selector: PdfExtractSelector;
  readonly items: readonly unknown[];
}

/** Pull typed content out of PDF bytes. */
export async function extract(
  input: Uint8Array | Buffer,
  options?: OperationOptions & { readonly selector?: PdfExtractSelector },
): Promise<OperationResult<PdfExtraction>> {
  const buffer = lazyBuffer(input);
  const selector = options?.selector ?? "signatures";
  return runOperation({
    // The qualified name, not the base verb: a receipt naming `pdf.extract`
    // cannot be resolved against the registry, which knows only
    // `pdf.extract.signatures`. Provenance that cannot identify the operation
    // that produced it is not provenance.
    operation: `pdf.extract.${selector}`,
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    ...(options !== undefined ? { options } : {}),
    execute: async () => {
      if (selector !== "signatures") {
        throw Object.assign(new Error(`Unsupported extract selector "${String(selector)}".`), {
          code: "UNSUPPORTED_SELECTOR",
        });
      }
      return { value: { selector, items: extractPdfSignatures(buffer()) } };
    },
  });
}

// Re-exported so a consumer never needs a second install to type a result (R37).
//
// Types only: R35 keeps this surface to canonical verbs and types, so the
// `isOk`/`isFail`/`unwrap` helpers live on `@runstamp/contract` rather than here.
// Nothing is lost — R6 makes `ok` the sole discriminant, so `if (result.ok)`
// narrows without any helper at all.
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
// Projected from the embedded PDF evidence extension (see ./evidence.ts).
//
// These verbs are generated from a manifest rather than hand-written, so they
// pick up the receipt, the determinism claim and the loss ledger through the
// same `runOperation` path as everything else on this surface.
// ---------------------------------------------------------------------------

export const redact = PDF_EVIDENCE.ops.redact as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;

export const convert = PDF_EVIDENCE.ops.convert as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;

export const inspect = PDF_EVIDENCE.ops.inspect as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;
