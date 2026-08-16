/**
 * The determinism and provenance receipt (OC-1 §3.7).
 *
 * A receipt makes reproducibility *observable*: the platform already tests
 * determinism, but never returned proof of it, so a caller had no way to verify
 * what they received. `deterministic: true` is a falsifiable claim, verified by
 * the two-process byte-identity gate (C7); asserting it without that gate passing
 * is itself a contract violation.
 */

import { contractViolation } from "./errors.js";
import { hashValue } from "./canonical.js";
import { resolveOptions } from "./options.js";
import type { EffectiveOptions, OperationOptions } from "./options.js";
import { CONTRACT_VERSION } from "./version.js";
import type { ContractVersion } from "./version.js";
import type { ErrorDomain, NondeterminismSource, OperationName } from "./types.js";

export interface ToolVersion {
  readonly name: string;
  readonly version: string;
}

export interface EngineIdentity {
  readonly name: string;
  readonly version: string;
}

export interface Receipt {
  readonly contractVersion: ContractVersion;
  readonly operation: OperationName;
  readonly domain: ErrorDomain;
  readonly engine: EngineIdentity;
  /** `sha256:<hex>` of the input. */
  readonly inputHash: string;
  /** `sha256:<hex>` of the *effective* options, after defaults are applied. */
  readonly optionsHash: string;
  /** `sha256:<hex>` of the produced bytes, when the operation produced any. */
  readonly outputHash?: string;
  /**
   * True ⇒ identical (`inputHash`, `optionsHash`, `engine.version`) yields an
   * identical `outputHash`.
   */
  readonly deterministic: boolean;
  /** Non-deterministic inputs actually consumed. Non-empty when not deterministic. */
  readonly nondeterminismSources: readonly NondeterminismSource[];
  /** External tools or oracles invoked, with pinned versions. */
  readonly tools?: readonly ToolVersion[];
  /** Omitted entirely in deterministic mode — a timestamp would break byte-identity. */
  readonly producedAt?: string;
}

export interface BuildReceiptInit {
  readonly operation: OperationName;
  readonly domain: ErrorDomain;
  readonly engine: EngineIdentity;
  readonly inputHash: string;
  /** Supply either the resolved options or the raw options to resolve. */
  readonly options?: OperationOptions;
  readonly effectiveOptions?: EffectiveOptions;
  readonly outputHash?: string;
  readonly nondeterminismSources?: readonly NondeterminismSource[];
  readonly tools?: readonly ToolVersion[];
  /**
   * Wall-clock stamp for non-deterministic runs. Ignored when deterministic.
   * Injected rather than read from the clock so this module stays pure.
   */
  readonly producedAt?: string;
}

/**
 * Build a receipt, enforcing the two honesty rules that make it worth anything:
 * `producedAt` is omitted (not zeroed) under determinism (R25), and a
 * non-deterministic receipt must name at least one actual source (R26).
 */
export function buildReceipt(init: BuildReceiptInit): Receipt {
  const effective = init.effectiveOptions ?? resolveOptions(init.options);
  const deterministic = effective.deterministic;
  const sources = init.nondeterminismSources ?? [];

  if (!deterministic && sources.length === 0) {
    throw contractViolation(
      "A non-deterministic receipt must name at least one nondeterminism source. " +
        "If the operation is in fact reproducible, set deterministic to true instead.",
      { operation: init.operation },
    );
  }
  if (deterministic && sources.length > 0) {
    throw contractViolation(
      "A deterministic receipt cannot declare nondeterminism sources: " +
        `received [${sources.join(", ")}] for ${init.operation}.`,
      { operation: init.operation, sources },
    );
  }

  const receipt: {
    -readonly [K in keyof Receipt]: Receipt[K];
  } = {
    contractVersion: CONTRACT_VERSION,
    operation: init.operation,
    domain: init.domain,
    engine: init.engine,
    inputHash: init.inputHash,
    optionsHash: hashValue(effective),
    deterministic,
    nondeterminismSources: sources,
  };

  if (init.outputHash !== undefined) receipt.outputHash = init.outputHash;
  if (init.tools !== undefined) receipt.tools = init.tools;
  // R25: omit the key entirely under determinism rather than emitting a zero value.
  if (!deterministic && init.producedAt !== undefined) receipt.producedAt = init.producedAt;

  return receipt;
}
