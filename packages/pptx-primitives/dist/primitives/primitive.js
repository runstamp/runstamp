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
// ---------------------------------------------------------------------------
// Reliability helpers for primitive authors
// ---------------------------------------------------------------------------
/** Narrow a PrimitiveResult to `fit` or throw. Useful in tests. */
export function assertFit(result) {
    if (result.overflow.kind === "fit")
        return;
    if (result.overflow.kind === "compressed")
        return;
    throw new Error(`[primitive] expected fit, got ${result.overflow.kind}: ` +
        JSON.stringify(result.overflow));
}
/** Assert that the primitive produced at least one node. Guards against
 *  "silent degradation": a primitive that returns zero nodes when it
 *  should have emitted *something* is a bug, not an aesthetic choice. */
export function assertNonEmpty(result, context) {
    if (result.nodes.length === 0) {
        throw new Error(`[primitive] ${context} emitted zero nodes`);
    }
}
//# sourceMappingURL=primitive.js.map