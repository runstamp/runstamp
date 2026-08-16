/**
 * Primitive contract.
 *
 * Every primitive in this package implements this interface. The contract
 * is load-bearing — it defines what reliability means at the aesthetic
 * layer:
 *
 *   1. A primitive is a pure function of (input, tokens, region).
 *      No module-level state, no date/random during render. Byte-repro
 *      is enforced at the engine boundary; primitives must not be the
 *      source of nondeterminism.
 *
 *   2. A primitive emits PrimitiveNode[] that fit within its allotted
 *      region OR returns an OverflowResult describing what didn't fit
 *      and what adaptation strategy the primitive is willing to accept.
 *      The compiler chooses how to resolve overflow (paginate, escalate
 *      to caller, etc.); primitives never silently clip.
 *
 *   3. A primitive reads from ResolvedTokens for every aesthetic choice.
 *      No hard-coded fonts, sizes, colors, rule widths, bullet markers.
 *      If a primitive needs a value the schema doesn't express, that is
 *      a schema gap — file it, fix the schema, iterate. Do not inline
 *      literals.
 *
 *   4. A primitive's public input type is strict. Optional fields have
 *      documented defaults; unknown fields fail validation at the
 *      compiler boundary.
 *
 *   5. A primitive may recursively call other primitives (composition).
 *      Sub-primitive regions are computed by the caller, not by the
 *      callee poking at the parent's layout state.
 */

import type { ResolvedTokens } from "../tokens/schema.js";
import type { PrimitiveNode, Rect } from "../layout/types.js";

// ---------------------------------------------------------------------------
// Overflow reporting
// ---------------------------------------------------------------------------

/**
 * Overflow outcome returned by a primitive when content did not fit within
 * the allotted region after applying its adaptation strategy.
 *
 *   fit       — all content placed; no adaptation needed.
 *   compressed — content fit, but the primitive compressed typography /
 *               spacing within its bounded range to achieve it. Acceptable.
 *   paginated  — content exceeded the region and the primitive recommends
 *               splitting across slides. `remaining` is what the compiler
 *               should render on a continuation slide.
 *   clipped   — LAST RESORT. Primitive could not fit, could not paginate,
 *               and clipped with ellipsis. Compiler treats this as a
 *               reliability violation under strict mode.
 */
export type OverflowResult =
  | { kind: "fit" }
  | {
      kind: "compressed";
      /** How much the primitive scaled type/spacing. 1.0 = no compression,
       *  <1.0 = shrunk. Lower bound is primitive-specific. */
      scale: number;
    }
  | {
      kind: "paginated";
      /** Opaque payload the primitive hands back to itself when the
       *  compiler invokes it a second time on the continuation slide. */
      remaining: unknown;
      /** Human-readable continuation label ("continued from slide N"). */
      continuationLabel?: string;
    }
  | {
      kind: "clipped";
      /** Number of content items that were truncated. */
      droppedCount: number;
      /** Short reason for diagnostics. */
      reason: string;
    };

// ---------------------------------------------------------------------------
// Primitive function shape
// ---------------------------------------------------------------------------

export interface PrimitiveResult {
  nodes: PrimitiveNode[];
  overflow: OverflowResult;
}

/**
 * A primitive is `(input, tokens, region) => PrimitiveResult`.
 *
 * The generic `TInput` is the primitive's caller-supplied content payload,
 * not its full parameter list. Tokens and region are always separate.
 */
export type Primitive<TInput> = (
  input: TInput,
  tokens: ResolvedTokens,
  region: Rect,
) => PrimitiveResult;

// ---------------------------------------------------------------------------
// Reliability helpers for primitive authors
// ---------------------------------------------------------------------------

/** Narrow a PrimitiveResult to `fit` or throw. Useful in tests. */
export function assertFit(result: PrimitiveResult): void {
  if (result.overflow.kind === "fit") return;
  if (result.overflow.kind === "compressed") return;
  throw new Error(
    `[primitive] expected fit, got ${result.overflow.kind}: ` +
      JSON.stringify(result.overflow),
  );
}

/** Assert that the primitive produced at least one node. Guards against
 *  "silent degradation": a primitive that returns zero nodes when it
 *  should have emitted *something* is a bug, not an aesthetic choice. */
export function assertNonEmpty(result: PrimitiveResult, context: string): void {
  if (result.nodes.length === 0) {
    throw new Error(`[primitive] ${context} emitted zero nodes`);
  }
}
