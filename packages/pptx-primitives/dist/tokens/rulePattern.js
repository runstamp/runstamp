/**
 * Rule-pattern grammar.
 *
 * A compound rule is a sequence of one or more ruled lines stacked
 * vertically, separated by a gap. The grammar supports the two canonical
 * cases we need to express:
 *
 *   "1px solid #E5E5E5"                           single hairline
 *   "2px solid #000"                              single thick rule
 *   "3px solid #DA291C + 1px solid #CCCCCC gap:1" stacked pair (Bain bar)
 *   "1px solid token:rule"                        color resolved from palette
 *   "none"                                        no rule
 *
 * Grammar:
 *
 *   pattern   = "none" | line ( ws "+" ws line )* ( ws "gap:" number )?
 *   line      = width ws style ws color
 *   width     = number "px"
 *   style     = "solid" | "dashed" | "dotted"
 *   color     = hex | "token:" <roleName>
 *
 * Colors may reference palette roles via "token:<role>" (e.g.,
 * "token:rule", "token:accent"). Primitives resolve these at render time
 * by looking up the ResolvedTokens.palette.
 */
const STYLE_VALUES = new Set(["solid", "dashed", "dotted"]);
/** Thrown when a rule pattern is malformed. Callers MUST surface this;
 *  silent fallback to `none` would hide real authoring errors. */
export class RulePatternError extends Error {
    pattern;
    constructor(message, pattern) {
        super(`[rulePattern] ${message}: ${JSON.stringify(pattern)}`);
        this.pattern = pattern;
        this.name = "RulePatternError";
    }
}
/**
 * Parse a rule pattern string against a resolved palette.
 *
 * Returns `null` for `"none"` (so callers can skip rendering) rather than
 * throwing — "none" is a valid, expected value.
 */
export function parseRulePattern(pattern, palette) {
    const trimmed = pattern.trim();
    if (trimmed === "" || trimmed === "none")
        return null;
    // Split off an optional trailing "gap:N".
    const gapMatch = trimmed.match(/\bgap:\s*(\d+(?:\.\d+)?)\s*$/u);
    const gap = gapMatch ? Number(gapMatch[1]) : 0;
    const body = gapMatch ? trimmed.slice(0, gapMatch.index).trim() : trimmed;
    const segments = body.split(/\s*\+\s*/u);
    const lines = segments.map((seg) => parseLine(seg, palette, pattern));
    const totalHeight = lines.reduce((acc, l) => acc + l.width, 0) + gap * Math.max(0, lines.length - 1);
    return { lines, gap, totalHeight };
}
function parseLine(segment, palette, wholePattern) {
    // "<N>px <style> <color>" — tolerant of extra whitespace.
    const match = segment.trim().match(/^(\d+(?:\.\d+)?)px\s+([a-z]+)\s+(.+)$/u);
    if (!match) {
        throw new RulePatternError(`rule segment must be "<width>px <style> <color>", got ${JSON.stringify(segment)}`, wholePattern);
    }
    const widthNum = Number(match[1]);
    const style = match[2];
    if (!STYLE_VALUES.has(style)) {
        throw new RulePatternError(`unknown style ${JSON.stringify(style)}`, wholePattern);
    }
    const color = resolveColor(match[3].trim(), palette, wholePattern);
    return { width: widthNum, style: style, color };
}
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;
function resolveColor(raw, palette, wholePattern) {
    if (HEX_RE.test(raw))
        return raw;
    if (raw.startsWith("token:")) {
        const role = raw.slice("token:".length).trim();
        const value = palette[role];
        if (typeof value !== "string" || !HEX_RE.test(value)) {
            throw new RulePatternError(`unknown or non-hex palette role ${JSON.stringify(role)}`, wholePattern);
        }
        return value;
    }
    throw new RulePatternError(`color must be hex (#RGB/#RRGGBB) or token:<role>, got ${JSON.stringify(raw)}`, wholePattern);
}
//# sourceMappingURL=rulePattern.js.map