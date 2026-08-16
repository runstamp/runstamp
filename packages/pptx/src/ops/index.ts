/**
 * `@runstamp/pptx/ops` — the OC-1 operation surface for the `pptx` domain.
 *
 * Every export is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * Thin adapters over the existing engine — no rendering logic is reimplemented.
 * The legacy exports on the package root keep working unchanged through the
 * deprecation window.
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
import { PaperEngine } from "../engine.js";
import { validatePptxStructure, repairPptxStructure } from "../index.js";
import type { EngineRenderOptions, RenderInput } from "../engine.js";
import type { EnginePdfRenderOptions } from "../converter/pptx-to-pdf.js";

const DOMAIN = "pptx" as const;

// Read from the manifest by the release script; a literal here avoids a JSON
// import assertion in the published ESM output.
const ENGINE = { name: "@runstamp/pptx", version: "1.0.0" } as const;

/**
 * Core's own `PaperError` is a different class from the contract's, so the
 * bridge is told which legacy table to consult rather than inferring it.
 */
const ERROR_CONTEXT = { model: "core", domain: DOMAIN } as const;

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
export interface PptxRenderOpOptions extends OperationOptions {
  readonly render?: EngineRenderOptions;
}

/**
 * Structured document → native PPTX bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.pptx", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
export async function render(
  input: RenderInput,
  options?: PptxRenderOpOptions,
): Promise<OperationResult<ArtifactBytes>> {
  // Memoized so locators bind to the same hash without hashing twice, and lazy
  // so a value that cannot be canonicalized fails as a result, not a throw (R4).
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "pptx.render",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const artifact = inputHash();
      const buffer = await PaperEngine.render(input, {
        ...options?.render,
        deterministic: context.deterministic,
        // R16: the engine knows which properties the writer will drop and would
        // otherwise report it only to a logger.
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.render?.onInputWarning?.(warning);
        },
      });
      const value = createArtifactBytes(buffer, MEDIA_TYPES.pptx, "pptx");
      return { value, outputHash: value.hash };
    },
  });
}

export interface PptxValidationReport {
  readonly valid: boolean;
  /** The engine's native structural report, unmodified. */
  readonly summary: unknown;
}

/** Inspect PPTX bytes for structural defects. Never mutates the input. */
export async function validate(
  input: Uint8Array | Buffer,
  options?: OperationOptions,
): Promise<OperationResult<PptxValidationReport>> {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "pptx.validate",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async () => {
      const summary = (await validatePptxStructure(buffer())) as { issues?: unknown[]; ok?: boolean };
      const issueCount = Array.isArray(summary.issues) ? summary.issues.length : 0;
      return { value: { valid: summary.ok ?? issueCount === 0, summary } };
    },
  });
}

/**
 * Repair structural defects in PPTX bytes.
 *
 * Every change is reported as a loss, so a caller sees exactly what was altered
 * rather than receiving silently-rewritten bytes.
 */
export async function repair(
  input: Uint8Array | Buffer,
  options?: OperationOptions,
): Promise<OperationResult<ArtifactBytes>> {
  const buffer = lazyBuffer(input);
  return runOperation({
    operation: "pptx.repair",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const artifact = hashBytes(buffer());
      const result = (await repairPptxStructure(buffer())) as {
        buffer?: Buffer;
        actions?: { code?: string; description?: string; path?: string }[];
      };
      for (const action of result.actions ?? []) {
        const { loss, diagnostic } = classifyWarning(
          {
            code: action.code ?? "PPTX_UNKNOWN_REPAIR",
            message: action.description ?? `Repair applied: ${action.code ?? "unknown"}`,
            ...(action.path !== undefined ? { path: action.path } : {}),
          },
          artifact,
        );
        if (loss) context.addLoss(loss);
        if (diagnostic) context.addDiagnostic(diagnostic);
      }
      const value = createArtifactBytes(result.buffer ?? buffer(), MEDIA_TYPES.pptx, "pptx");
      return { value, outputHash: value.hash };
    },
  });
}

/** Cross-format conversion. Today only PPTX → PDF. */
export async function convert(
  input: RenderInput,
  options?: OperationOptions & { readonly to?: "pdf"; readonly pdf?: EnginePdfRenderOptions },
): Promise<OperationResult<ArtifactBytes>> {
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));
  const target = options?.to ?? "pdf";

  return runOperation({
    operation: "pptx.convert.pdf",
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
      // EnginePdfRenderOptions has no `deterministic` field; the converter
      // inherits the process flag, which `runOperation` has already resolved.
      const buffer = await PaperEngine.renderToPdf(input, {
        ...options?.pdf,
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.pdf?.onInputWarning?.(warning);
        },
      });
      const value = createArtifactBytes(buffer, MEDIA_TYPES.pdf, "pdf");
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
