/**
 * Non-fatal observations that are *not* faithfulness deviations (OC-1 §3.4).
 *
 * A diagnostic reports something the caller may want to know — a heuristic taken,
 * an auto-fit applied, a deprecation — where the output still faithfully
 * represents the input.
 *
 * The boundary against {@link import("./loss.js").Loss} is the single most
 * important judgement in the contract: **if the output no longer faithfully
 * represents the input, it is a Loss, not a Diagnostic.** When in doubt, it is a
 * Loss (R15). Clipped text and truncated tables are losses, not warnings.
 */

import type { DiagnosticSeverity, ErrorCode, ErrorPhase } from "./types.js";
import type { Locator } from "./locator.js";

export interface Diagnostic {
  readonly code: ErrorCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly phase: ErrorPhase;
  readonly locator?: Locator;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface DiagnosticInit {
  readonly code: ErrorCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly phase: ErrorPhase;
  readonly locator?: Locator;
  readonly details?: Readonly<Record<string, unknown>>;
}

export function createDiagnostic(init: DiagnosticInit): Diagnostic {
  return {
    code: init.code,
    severity: init.severity,
    message: init.message,
    phase: init.phase,
    ...(init.locator !== undefined ? { locator: init.locator } : {}),
    ...(init.details !== undefined ? { details: init.details } : {}),
  };
}
