/**
 * The result envelope every operation returns (OC-1 §3.2).
 *
 * The defining rule is **R4: operations never throw for a document condition.**
 * Bad input, an unsupported feature, a conformance violation, a resource limit —
 * all return `{ ok: false }`. Throwing is reserved for programmer error and host
 * failure. This is what lets an agent consume any operation without wrapping every
 * call in try/catch, and what lets the MCP projection hand a model a `remediation`
 * string it can act on in a single turn.
 */

import { PaperError } from "./errors.js";
import type { Diagnostic } from "./diagnostics.js";
import type { Loss } from "./loss.js";
import type { Receipt } from "./receipt.js";

export interface OperationSuccess<T> {
  readonly ok: true;
  readonly value: T;
  /** Faithfulness deviations. `[]` is a positive claim of full fidelity (R17). */
  readonly losses: readonly Loss[];
  readonly diagnostics: readonly Diagnostic[];
  readonly receipt: Receipt;
}

export interface OperationFailure {
  readonly ok: false;
  readonly error: PaperError;
  /** Losses accrued before failure, preserved for partial-progress diagnosis. */
  readonly losses: readonly Loss[];
  readonly diagnostics: readonly Diagnostic[];
  /** Present when enough of the operation ran to bind its inputs. */
  readonly receipt?: Receipt;
}

export type OperationResult<T> = OperationSuccess<T> | OperationFailure;

/**
 * The canonical operation signature (R1–R5): exactly two positional parameters,
 * always Promise-returning, never mutating its input.
 */
export type Operation<TInput, TOptions, TValue> = (
  input: TInput,
  options?: TOptions,
) => Promise<OperationResult<TValue>>;

export interface SuccessParts {
  readonly losses?: readonly Loss[];
  readonly diagnostics?: readonly Diagnostic[];
  readonly receipt: Receipt;
}

export interface FailureParts {
  readonly losses?: readonly Loss[];
  readonly diagnostics?: readonly Diagnostic[];
  readonly receipt?: Receipt;
}

export function ok<T>(value: T, parts: SuccessParts): OperationSuccess<T> {
  return {
    ok: true,
    value,
    losses: parts.losses ?? [],
    diagnostics: parts.diagnostics ?? [],
    receipt: parts.receipt,
  };
}

export function fail(error: PaperError, parts?: FailureParts): OperationFailure {
  return {
    ok: false,
    error,
    losses: parts?.losses ?? [],
    diagnostics: parts?.diagnostics ?? [],
    ...(parts?.receipt !== undefined ? { receipt: parts.receipt } : {}),
  };
}

export function isOk<T>(result: OperationResult<T>): result is OperationSuccess<T> {
  return result.ok;
}

export function isFail<T>(result: OperationResult<T>): result is OperationFailure {
  return !result.ok;
}

/**
 * Ergonomic escape hatch for call sites that prefer exceptions: returns the value
 * or throws the error. Operations themselves still never throw — this is opt-in,
 * at the boundary the caller chooses.
 */
export function unwrap<T>(result: OperationResult<T>): T {
  if (result.ok) return result.value;
  throw result.error;
}
