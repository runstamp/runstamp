/**
 * Shared operation options (OC-1 §3.8).
 *
 * This module replaces the three independent `isDeterministicModeEnabled()`
 * implementations in `packages/docx`, `packages/json-to-pdf` and `packages/xlsx`,
 * which had drifted into three different meanings of "deterministic mode".
 *
 * **The process default is `true`**, matching all three current implementations —
 * each initializes `deterministicMode = true`. Defaulting to `false` here would
 * silently flip behavior in three packages when they migrate in Phase 2. The
 * `setDeterministicMode` mutator and the seed concept (`resolveDeterministicSeed`
 * in docx, `deterministicPdfFileIdSeed` in pdf) are carried forward for the same
 * reason. Reading the environment is new and purely additive: none of the three
 * existing implementations consult it.
 */

import type { Diagnostic } from "./diagnostics.js";
import type { Loss } from "./loss.js";
import type { LossPolicy } from "./types.js";

export interface ResourceLimits {
  readonly maxInputBytes?: number;
  readonly maxOutputBytes?: number;
  readonly maxPages?: number;
  readonly maxElements?: number;
  readonly maxArchiveEntries?: number;
  /** Guards against zip bombs: decompressed bytes ÷ compressed bytes. */
  readonly maxExpansionRatio?: number;
  readonly maxDurationMs?: number;
}

export interface OperationOptions {
  /** Force byte-reproducible output. Defaults to true. */
  readonly deterministic?: boolean;
  /** Seed for deterministic identifier generation (file ids, relationship ids). */
  readonly deterministicSeed?: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly limits?: ResourceLimits;
  /** BCP-47 tag. Affects formatting only, never structure. */
  readonly locale?: string;
  /** Streaming sink; the result still carries the complete array. */
  readonly onDiagnostic?: (diagnostic: Diagnostic) => void;
  /** Streaming sink; the result still carries the complete array. */
  readonly onLoss?: (loss: Loss) => void;
  /** How losses affect the success decision. Defaults to "collect". */
  readonly lossPolicy?: LossPolicy;
}

/**
 * The hashable projection of {@link OperationOptions}.
 *
 * Callbacks and the AbortSignal are excluded deliberately: they are not
 * serializable and do not affect the output bytes, so including them would make
 * `optionsHash` unstable for identical work.
 */
export interface EffectiveOptions {
  readonly deterministic: boolean;
  readonly lossPolicy: LossPolicy;
  readonly deterministicSeed?: string;
  readonly timeoutMs?: number;
  readonly limits?: ResourceLimits;
  readonly locale?: string;
}

export const DEFAULT_DETERMINISTIC = true;
export const DEFAULT_LOSS_POLICY: LossPolicy = "collect";

const TRUTHY = new Set(["1", "true", "on", "yes"]);
const FALSY = new Set(["0", "false", "off", "no"]);

/**
 * The minimal shape of a determinism holder.
 *
 * Structurally identical to `DeterministicModeManager` in `packages/core`, which
 * this deliberately duck-types rather than re-declares.
 */
export interface DeterministicModeHolder {
  setDeterministicMode(enabled: boolean): void;
  isDeterministicMode(): boolean;
}

/**
 * The default holder lives on the global symbol registry rather than in a module
 * variable — and it shares `packages/core`'s existing key, so all implementations
 * observe one flag.
 *
 * This is not incidental. Core documents the bug that forced it: the lite bundle
 * code-splits, so a module-local flag gave the caller's `setDeterministicMode(true)`
 * and the archive zipper's read two *different* module instances, and the zipper
 * silently stamped entries with the wall clock. The same hazard applies to any
 * duplicated install of this package, so the contract adopts the same fix.
 *
 * The key string is frozen at the Runstamp rename and must stay byte-identical
 * to core's. It is a cross-realm registry key, not a brand string; renaming
 * either copy splits the flag in two and silently restores the bug. Do not
 * rename.
 */
const DEFAULT_MANAGER_KEY = Symbol.for("paperjsx.deterministicMode.defaultManager");

function getDefaultHolder(): DeterministicModeHolder {
  const scope = globalThis as Record<symbol, unknown>;
  const existing = scope[DEFAULT_MANAGER_KEY] as DeterministicModeHolder | undefined;
  if (existing) return existing;

  let enabled = DEFAULT_DETERMINISTIC;
  const created: DeterministicModeHolder = {
    setDeterministicMode(value: boolean): void {
      enabled = value;
    },
    isDeterministicMode(): boolean {
      return enabled;
    },
  };
  scope[DEFAULT_MANAGER_KEY] = created;
  return created;
}

/**
 * Process-wide default for deterministic mode.
 *
 * Preserved from the package-level implementations so their call sites keep
 * working unchanged when they migrate onto the contract.
 */
export function setDeterministicMode(enabled = true): void {
  getDefaultHolder().setDeterministicMode(enabled);
}

/** Reset the process default. Intended for tests. */
export function resetDeterministicMode(): void {
  getDefaultHolder().setDeterministicMode(DEFAULT_DETERMINISTIC);
}

function environmentDeterministic(): boolean | undefined {
  const raw = globalThis.process?.env?.RUNSTAMP_DETERMINISTIC;
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return undefined; // unrecognized values are ignored rather than guessed at
}

/**
 * Resolve deterministic mode. Precedence (R28):
 * explicit option → `RUNSTAMP_DETERMINISTIC` → process default (initially true).
 */
export function isDeterministicModeEnabled(options?: OperationOptions): boolean {
  if (options?.deterministic !== undefined) return options.deterministic;
  return environmentDeterministic() ?? getDefaultHolder().isDeterministicMode();
}

/**
 * Apply defaults and drop non-serializable fields, yielding the value that
 * `optionsHash` is computed over.
 */
export function resolveOptions(options?: OperationOptions): EffectiveOptions {
  return {
    deterministic: isDeterministicModeEnabled(options),
    lossPolicy: options?.lossPolicy ?? DEFAULT_LOSS_POLICY,
    ...(options?.deterministicSeed !== undefined
      ? { deterministicSeed: options.deterministicSeed }
      : {}),
    ...(options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    ...(options?.limits !== undefined ? { limits: options.limits } : {}),
    ...(options?.locale !== undefined ? { locale: options.locale } : {}),
  };
}
