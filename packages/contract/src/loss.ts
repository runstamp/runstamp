/**
 * The loss ledger (OC-1 §3.5) — the contract's differentiating artifact.
 *
 * A `Loss` records that the operation could not faithfully preserve something.
 * The governing rule is **R16, no silent loss**: any transformation that does not
 * faithfully preserve its source must emit a Loss. An empty `losses` array is
 * therefore a positive, testable claim of full fidelity — not the absence of
 * information.
 *
 * This is what lets a buyer trust output without opening it, and it is the runtime
 * counterpart to the `losses.json` the extension factory already produces as
 * build-time evidence.
 */

import { compareLocators } from "./locator.js";
import type { Locator } from "./locator.js";
import type { ErrorCode, LossSeverity } from "./types.js";
import { LOSS_SEVERITY_ORDER } from "./types.js";

export interface Loss {
  readonly code: ErrorCode;
  readonly severity: LossSeverity;
  /** What was affected, in the caller's vocabulary (e.g. "embedded font Calibri"). */
  readonly subject: string;
  readonly message: string;
  /** Where it happened in the source. Required whenever positionally attributable. */
  readonly locator?: Locator;
  readonly expected?: string;
  readonly actual?: string;
  /** True when a supported option would have avoided this loss. */
  readonly avoidable: boolean;
  /** Names the option that would avoid it. Required when `avoidable` is true (R19). */
  readonly remediation?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface LossInit {
  readonly code: ErrorCode;
  readonly severity: LossSeverity;
  readonly subject: string;
  readonly message: string;
  readonly locator?: Locator;
  readonly expected?: string;
  readonly actual?: string;
  readonly avoidable?: boolean;
  readonly remediation?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export function createLoss(init: LossInit): Loss {
  const avoidable = init.avoidable ?? false;
  return {
    code: init.code,
    severity: init.severity,
    subject: init.subject,
    message: init.message,
    avoidable,
    ...(init.locator !== undefined ? { locator: init.locator } : {}),
    ...(init.expected !== undefined ? { expected: init.expected } : {}),
    ...(init.actual !== undefined ? { actual: init.actual } : {}),
    ...(init.remediation !== undefined ? { remediation: init.remediation } : {}),
    ...(init.details !== undefined ? { details: init.details } : {}),
  };
}

/** Rank a severity for comparison; higher means more severe. */
export function lossSeverityRank(severity: LossSeverity): number {
  return LOSS_SEVERITY_ORDER.indexOf(severity);
}

/**
 * Total ordering over losses (R18): by locator, then severity (most severe first),
 * then code, then subject. Deterministic and independent of discovery order, so
 * two runs over identical input produce an identical ledger.
 */
export function compareLosses(a: Loss, b: Loss): number {
  if (a.locator !== undefined && b.locator !== undefined) {
    const byLocator = compareLocators(a.locator, b.locator);
    if (byLocator !== 0) return byLocator;
  } else if (a.locator !== undefined) {
    return -1; // positioned losses sort ahead of unpositioned ones
  } else if (b.locator !== undefined) {
    return 1;
  }

  const bySeverity = lossSeverityRank(b.severity) - lossSeverityRank(a.severity);
  if (bySeverity !== 0) return bySeverity;

  if (a.code !== b.code) return a.code < b.code ? -1 : 1;
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;

  // Deliberately NOT a message comparison. Two losses that agree this far are
  // the same kind of loss at the same place — typically consecutive characters
  // in one text run — and sorting those by message text orders them by code
  // point, so "漢字" reports 字 before 漢. `Array.prototype.sort` is stable, so
  // returning 0 keeps emission order, which is document order. That is both
  // deterministic (C12) and the order a reader expects.
  return 0;
}

/** Return a new array sorted by {@link compareLosses}. Does not mutate the input. */
export function sortLosses(losses: readonly Loss[]): readonly Loss[] {
  return [...losses].sort(compareLosses);
}

/** True when any loss dropped content outright. */
export function hasDroppedLoss(losses: readonly Loss[]): boolean {
  return losses.some((loss) => loss.severity === "dropped");
}
