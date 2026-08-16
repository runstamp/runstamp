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
import { BOOTSTRAP_TOKENS } from "./defaults.js";
import { ResolvedTokensSchema, TokenBundleSchema, } from "./schema.js";
import { parseRulePattern } from "./rulePattern.js";
import { auditFontAvailability } from "./fonts.js";
/** Resolver error. Distinct from ZodError so callers can route them. */
export class TokenResolveError extends Error {
    issues;
    constructor(message, issues) {
        super(`[tokens] ${message}\n  - ${issues.map((i) => `${i.path}: ${i.message}`).join("\n  - ")}`);
        this.issues = issues;
        this.name = "TokenResolveError";
    }
}
/**
 * Resolve a partial bundle against defaults. The single public entrypoint.
 */
export function resolveTokens(input, options = {}) {
    const parsed = TokenBundleSchema.safeParse(input);
    if (!parsed.success) {
        throw new TokenResolveError("input bundle failed validation", parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
        })));
    }
    const merged = deepMerge(BOOTSTRAP_TOKENS, parsed.data);
    const verified = ResolvedTokensSchema.safeParse(merged);
    if (!verified.success) {
        throw new TokenResolveError("resolved bundle failed post-merge validation (bug in defaults or merge logic)", verified.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
        })));
    }
    if (options.validateRules !== false) {
        validateRulesOrThrow(verified.data);
    }
    validateBulletDefaultsOrThrow(verified.data);
    if (options.onWarning) {
        for (const w of auditFontAvailability(verified.data)) {
            options.onWarning(w);
        }
    }
    return verified.data;
}
function validateBulletDefaultsOrThrow(resolved) {
    const { bullet } = resolved.ornament;
    if (bullet.scheme !== undefined && bullet.marker !== "autoNum" && bullet.nestedMarker !== "autoNum") {
        throw new TokenResolveError("bullet defaults failed validation", [
            {
                path: "ornament.bullet.scheme",
                message: "scheme is only valid when marker or nestedMarker is autoNum",
            },
        ]);
    }
    if ((bullet.marker === "autoNum" || bullet.nestedMarker === "autoNum") && bullet.scheme === undefined) {
        throw new TokenResolveError("bullet defaults failed validation", [
            {
                path: "ornament.bullet.scheme",
                message: "scheme is required when marker or nestedMarker is autoNum",
            },
        ]);
    }
}
/** Deep-merge rhs into lhs. Arrays are replaced, not concatenated.
 *  `undefined` on rhs means "inherit from lhs"; `null` means "explicit null". */
function deepMerge(lhs, rhs) {
    if (rhs === undefined)
        return lhs;
    if (rhs === null)
        return rhs;
    if (Array.isArray(rhs))
        return rhs;
    if (typeof rhs !== "object")
        return rhs;
    if (typeof lhs !== "object" || lhs === null || Array.isArray(lhs))
        return rhs;
    const result = { ...lhs };
    for (const [key, rValue] of Object.entries(rhs)) {
        const lValue = lhs[key];
        result[key] = deepMerge(lValue, rValue);
    }
    return result;
}
/** Eager rule-pattern validation. Throws TokenResolveError on first bad rule.
 *  Collecting all errors would be nicer, but rule authoring is caller-tier
 *  work — surfacing the first failure with a clear path is sufficient. */
function validateRulesOrThrow(resolved) {
    const rulesToCheck = [
        ["rules.title", resolved.rules.title],
        ["rules.section", resolved.rules.section],
        ["rules.divider", resolved.rules.divider],
        ["rules.edge", resolved.rules.edge],
        ["chrome.footer.topRule", resolved.chrome.footer.topRule],
    ];
    for (const [path, pattern] of rulesToCheck) {
        try {
            parseRulePattern(pattern, resolved.palette);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new TokenResolveError("rule pattern failed to parse", [
                { path, message },
            ]);
        }
    }
}
//# sourceMappingURL=resolve.js.map