/**
 * Token resolver.
 *
 * Takes a partial TokenBundle (or an opaque `unknown` from an external
 * source) and returns fully-populated ResolvedTokens.
 *
 * Responsibilities:
 *   1. Validate the caller bundle against TokenBundleSchema (strict).
 *      Unknown keys = hard error — we refuse to swallow author typos.
 *   2. Deep-merge against the bootstrap default. The caller wins on
 *      collisions; omitted keys inherit.
 *   3. Validate the merged object against ResolvedTokensSchema (strict).
 *      Catches merge accidents where the result no longer satisfies the
 *      resolved shape.
 *   4. Eager-parse every rule pattern. Malformed rules fail here, not at
 *      render time, so a bad bundle surfaces before any slide is composed.
 *
 * Deliberately NOT here:
 *   - Font availability check. That lives in the render path where we
 *     know what engine mode is active.
 *   - Aesthetic opinion. The resolver accepts any schema-valid bundle;
 *     there is no "is this bundle Bain-shaped or LG-shaped" logic.
 */
import { type ResolvedTokens, type TokenBundle } from "./schema.js";
import { type TokenWarning } from "./fonts.js";
export interface ResolveOptions {
    /**
     * If true (default), the resolver eagerly parses every rule pattern in
     * the resolved bundle to surface grammar errors up front. Only disable
     * for diagnostics (e.g., rendering a default bundle for inspection).
     */
    validateRules?: boolean;
    /**
     * Called once per non-fatal warning emitted during resolution. Currently:
     *   - font availability (FONT_NOT_BUNDLED / FONT_NOT_EMBEDDED)
     *
     * Warnings never throw; callers decide whether to surface them, fail
     * fast, or ignore. Omit the callback to silently accept.
     */
    onWarning?: (warning: TokenWarning) => void;
}
/** Resolver error. Distinct from ZodError so callers can route them. */
export declare class TokenResolveError extends Error {
    readonly issues: Array<{
        path: string;
        message: string;
    }>;
    constructor(message: string, issues: Array<{
        path: string;
        message: string;
    }>);
}
/**
 * Resolve a partial bundle against defaults. The single public entrypoint.
 */
export declare function resolveTokens(input: TokenBundle | unknown, options?: ResolveOptions): ResolvedTokens;
//# sourceMappingURL=resolve.d.ts.map