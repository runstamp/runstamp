/**
 * `@runstamp/xlsx/ops` — the OC-1 operation surface for the `xlsx` domain.
 *
 * Every export is a canonical verb (OC-1 §4) with the identical signature
 * `(input, options?) => Promise<OperationResult<T>>`. No verb throws for a
 * document condition; failures arrive as `{ ok: false }` with a namespaced code
 * and an actionable remediation.
 *
 * Thin adapters over the existing engine — no spreadsheet logic is
 * reimplemented. The legacy exports on the package root keep working unchanged
 * through the deprecation window.
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
  OperationContext,
  OperationOptions,
  OperationResult,
} from "@runstamp/contract";

import { classifyWarning } from "./losses.js";
import { XLSX_WORKFLOW } from "./workflow.js";
import { SpreadsheetEngine } from "../spreadsheet-engine.js";
import {
  repairSpreadsheetBuffer,
  validateSpreadsheetBuffer,
} from "../quality/workbook-quality.js";
import { lintSpreadsheetDocument } from "../quality/lint.js";
import { SpreadsheetDocumentSchema } from "../validation/spreadsheet-schema.js";
import type { SpreadsheetDocument, SpreadsheetRenderOptions } from "../types/spreadsheet-ast.js";

const DOMAIN = "xlsx" as const;

// Read from the manifest by the release script; a literal here avoids a JSON
// import assertion in the published ESM output.
const ENGINE = { name: "@runstamp/xlsx", version: "1.0.0" } as const;

/**
 * The spreadsheet engine keys its errors on class name rather than a `code`
 * field, so the interop bridge selects the table by model rather than by code.
 */
const ERROR_CONTEXT = { model: "xlsx", domain: DOMAIN } as const;

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
export interface XlsxRenderOpOptions extends OperationOptions {
  readonly render?: SpreadsheetRenderOptions;
}

/**
 * Structured document → native XLSX bytes.
 *
 * @example
 * const result = await render(document);
 * if (result.ok) writeFileSync("out.xlsx", result.value.bytes);
 * else console.error(result.error.code, result.error.remediation);
 */
export async function render(
  input: SpreadsheetDocument,
  options?: XlsxRenderOpOptions,
): Promise<OperationResult<ArtifactBytes>> {
  // Memoized so locators bind to the same hash without hashing twice, and lazy
  // so a value that cannot be canonicalized fails as a result, not a throw (R4).
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "xlsx.render",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context) => {
      const artifact = inputHash();
      const buffer = await SpreadsheetEngine.render(input, {
        ...options?.render,
        deterministic: context.deterministic,
        // R16: the engine detects every input coercion here and would otherwise
        // report it to nobody.
        onInputWarning: (warning) => {
          const { loss, diagnostic } = classifyWarning(warning, artifact);
          if (loss) context.addLoss(loss);
          if (diagnostic) context.addDiagnostic(diagnostic);
          options?.render?.onInputWarning?.(warning);
        },
      });
      const value = createArtifactBytes(buffer, MEDIA_TYPES.xlsx, "xlsx");
      return { value, outputHash: value.hash };
    },
  });
}

export interface XlsxValidationReport {
  readonly valid: boolean;
  /** The engine's native lint or buffer-validation summary, unmodified. */
  readonly summary: unknown;
}

/**
 * Check a document or workbook bytes for defects. Never mutates the input.
 *
 * A structured document is linted; bytes are inspected as a package.
 */
export async function validate(
  input: SpreadsheetDocument | Uint8Array | Buffer,
  options?: OperationOptions,
): Promise<OperationResult<XlsxValidationReport>> {
  const isBytes = input instanceof Uint8Array || Buffer.isBuffer(input);
  const buffer = isBytes ? toBuffer(input) : undefined;

  return runOperation({
    operation: "xlsx.validate",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => (buffer === undefined ? hashValue(input) : hashBytes(buffer)),
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async () => {
      if (buffer !== undefined) {
        const summary = (await validateSpreadsheetBuffer(buffer)) as { findings?: unknown[] };
        const findings = Array.isArray(summary.findings) ? summary.findings.length : 0;
        return { value: { valid: findings === 0, summary } };
      }
      const parsed = SpreadsheetDocumentSchema.safeParse(input);
      if (!parsed.success) {
        return {
          value: {
            valid: false,
            summary: {
              findings: parsed.error.issues.map((issue) => ({
                code: "XLSX_SCHEMA_INVALID",
                message: issue.message,
                path: issue.path,
              })),
            },
          },
        };
      }
      const summary = lintSpreadsheetDocument(parsed.data as SpreadsheetDocument) as {
        findings?: unknown[];
      };
      const findings = Array.isArray(summary.findings) ? summary.findings.length : 0;
      return { value: { valid: findings === 0, summary } };
    },
  });
}

/**
 * Repair defects in workbook bytes.
 *
 * Every change the repairer makes is reported as a loss, so a caller sees
 * exactly what was altered or removed rather than receiving silently-rewritten
 * bytes. Stripped macros and external connections are `dropped`, not merely
 * degraded — the content is gone.
 */
export async function repair(
  input: Uint8Array | Buffer,
  options?: OperationOptions,
): Promise<OperationResult<ArtifactBytes>> {
  const buffer = lazyBuffer(input);

  return runOperation({
    operation: "xlsx.repair",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash: () => hashBytes(buffer()),
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async (context: OperationContext) => {
      const artifact = hashBytes(buffer());
      const result = (await repairSpreadsheetBuffer(buffer())) as {
        buffer?: Buffer;
        actions?: { code?: string; description?: string; path?: string }[];
      };
      for (const action of result.actions ?? []) {
        const { loss, diagnostic } = classifyWarning(
          {
            code: action.code ?? "XLSX_UNKNOWN_REPAIR",
            message: action.description ?? `Repair applied: ${action.code ?? "unknown"}`,
            ...(action.path !== undefined ? { path: action.path } : {}),
          },
          artifact,
        );
        if (loss) context.addLoss(loss);
        if (diagnostic) context.addDiagnostic(diagnostic);
      }
      const value = createArtifactBytes(result.buffer ?? buffer(), MEDIA_TYPES.xlsx, "xlsx");
      return { value, outputHash: value.hash };
    },
  });
}

/** A cheap structural read of what a render would cost, without rendering. */
export async function inspect(
  input: SpreadsheetDocument,
  options?: OperationOptions,
): Promise<OperationResult<unknown>> {
  let cached: string | undefined;
  const inputHash = (): string => (cached ??= hashValue(input));

  return runOperation({
    operation: "xlsx.inspect",
    domain: DOMAIN,
    engine: ENGINE,
    inputHash,
    errorContext: ERROR_CONTEXT,
    ...(options !== undefined ? { options } : {}),
    execute: async () => ({ value: SpreadsheetEngine.plan(input) }),
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
// Projected from the embedded structured-workflow extension (./workflow.ts).
// ---------------------------------------------------------------------------

export const parse = XLSX_WORKFLOW.ops.parse as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;

export const transform = XLSX_WORKFLOW.ops.transform as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;

export const convert = XLSX_WORKFLOW.ops.convert as (
  input: unknown,
  options?: OperationOptions & Record<string, unknown>,
) => Promise<OperationResult<unknown>>;
