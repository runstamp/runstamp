/**
 * Shared text-width + text-height estimators.
 *
 * Primitives use these to size content before committing coordinates to
 * the AST. The estimates are conservative (tend to over-estimate) so that
 * layouts that pass estimate-based checks also pass the engine's real
 * metric pass. This is the cheap first-pass substitute for calling into
 * the engine's font metrics.
 *
 * Two paths:
 *   1. **Empirical** — `WIDTH_RATIO_BY_FAMILY` lookup × char count, plus a
 *      simple word-break line counter. Always available, no font I/O.
 *   2. **Real metrics** — when a `MetricsProvider` is wired up (either
 *      passed explicitly or attached to the resolved tokens via
 *      `attachMetricsProvider`), the estimators delegate to the
 *      provider's `measureWidthPx` / `lineHeightPx` callbacks. This is
 *      what fontkit-backed callers use to get exact glyph-advance width
 *      and font-derived line heights instead of family heuristics.
 *
 * Each estimator accepts a `MetricsProvider | ResolvedTokens | null`
 * second arg. Passing tokens directly is the common case — primitives
 * already have them — and the helper looks up the attached provider via
 * `getMetricsProvider`. Passing a provider explicitly is for tests or
 * non-tokens callers.
 */
import { getMetricsProvider, } from "./metricsProvider.js";
/**
 * Per-family average glyph-width ratio, empirically tuned against PPTX
 * renders of each family at 10–14pt. Unknown families use the generic
 * fallback. Used only when no MetricsProvider is supplied.
 */
const WIDTH_RATIO_BY_FAMILY = {
    "Helvetica Neue": 0.50,
    "Helvetica": 0.50,
    "Arial": 0.52,
    "Inter": 0.49,
    "IBM Plex Sans": 0.51,
    "IBM Plex Mono": 0.60,
    "Courier New": 0.60,
    "Roboto": 0.50,
    "Söhne": 0.49,
    // Serifs
    "Georgia": 0.53,
    "Baskerville": 0.52,
    "Bodoni": 0.48,
    "Times New Roman": 0.50,
};
const DEFAULT_WIDTH_RATIO = 0.52;
const PX_PER_PT = 96 / 72;
function resolveProvider(source) {
    if (!source)
        return null;
    if (typeof source === "function")
        return source;
    return getMetricsProvider(source);
}
function getMetrics(source, family) {
    const provider = resolveProvider(source);
    return provider ? provider(family) : null;
}
/** Estimated rendered width in px.
 *
 * When the metrics source provides `measureWidthPx`, the result is the
 * font's actual glyph-advance sum (plus letter-spacing tracking). Otherwise
 * the empirical ratio table is used. */
export function estimateTextWidth(input, source) {
    const metrics = getMetrics(source, input.family);
    const tracking = input.letterSpacing ?? 0;
    const trackingTotal = Math.max(0, input.content.length - 1) * tracking;
    if (metrics?.measureWidthPx) {
        // Real measurement. Apply the same uppercase/digits-only adjustments
        // as the empirical path so callers get consistent ordering between
        // measurements with and without a provider.
        const text = input.uppercase ? input.content.toUpperCase() : input.content;
        return metrics.measureWidthPx(text, input.sizePt) + trackingTotal;
    }
    const base = metrics?.avgWidthRatio
        ?? WIDTH_RATIO_BY_FAMILY[input.family]
        ?? DEFAULT_WIDTH_RATIO;
    const ratio = input.uppercase
        ? base * 1.08 // caps are ~8% wider on average
        : input.digitsOnly
            ? base * 0.96 // monospaced figures on most fonts are narrower
            : base;
    return input.content.length * input.sizePt * PX_PER_PT * ratio + trackingTotal;
}
/**
 * Estimated rendered line height in **pixels** for a single line.
 *
 * Resolution order:
 *   1. Explicit `lineHeightPt` (caller override, always wins).
 *   2. Provider's `lineHeightPx(sizePt)` when available.
 *   3. Heuristic `sizePt * 1.2`.
 *
 * The input `lineHeightPt` (and the token schema) is in points (PPTX
 * convention); slide-space rects are in pixels.
 */
export function estimateLineHeight(sizePt, lineHeightPt, source, family) {
    if (lineHeightPt !== undefined)
        return lineHeightPt * PX_PER_PT;
    if (source && family) {
        const metrics = getMetrics(source, family);
        if (metrics?.lineHeightPx)
            return metrics.lineHeightPx(sizePt);
    }
    return sizePt * 1.2 * PX_PER_PT;
}
/**
 * Rough line-breaking estimator. Returns the number of lines a content
 * string will consume inside a `width` (px) container at the given font
 * metrics. Breaks only at whitespace; does not hyphenate.
 *
 * When a provider supplies `measureWidthPx`, individual word widths are
 * computed by the font; otherwise the empirical ratio table is used.
 * Either way the algorithm is the same — only the per-word width source
 * changes.
 */
export function estimateLineCount(input, source) {
    // Break on whitespace AND on hyphens — PowerPoint and most text
    // engines treat hyphens as soft break points ("long-term" wraps as
    // "long-" / "term" if the line runs out before "term" fits). Treating
    // the whole hyphenated compound as one word causes us to under-count
    // lines and primitives like matrixTable then allocate too little
    // vertical space, producing visible bullet overlap downstream.
    const words = input.content
        .split(/\s+/u)
        .flatMap((chunk) => splitOnHyphens(chunk))
        .filter(Boolean);
    if (words.length === 0)
        return 0;
    const tracking = input.letterSpacing ?? 0;
    const metrics = getMetrics(source, input.family);
    let measureWord;
    let spaceWidth;
    if (metrics?.measureWidthPx) {
        measureWord = (word) => metrics.measureWidthPx(input.uppercase ? word.toUpperCase() : word, input.sizePt) +
            Math.max(0, word.length - 1) * tracking;
        spaceWidth = metrics.measureWidthPx(" ", input.sizePt);
    }
    else {
        const ratio = metrics?.avgWidthRatio
            ?? WIDTH_RATIO_BY_FAMILY[input.family]
            ?? DEFAULT_WIDTH_RATIO;
        const adjusted = input.uppercase ? ratio * 1.08 : ratio;
        measureWord = (word) => word.length * input.sizePt * PX_PER_PT * adjusted +
            Math.max(0, word.length - 1) * tracking;
        spaceWidth = input.sizePt * PX_PER_PT * adjusted * 0.33;
    }
    // Safety margin against the rect's effective wrap width. Even with
    // fontkit-perfect glyph advances, downstream renderers (PowerPoint,
    // LibreOffice) apply slightly different kerning + sub-pixel rounding,
    // so a string that measures 99% of the rect width here can still wrap
    // to the next line at render time. The 4-px buffer matches the gap
    // we've seen empirically between fontkit advance sums and the
    // renderer's actual line-break point.
    const wrapWidth = Math.max(0, input.width - 4);
    // Short-circuit: when fontkit can measure the whole content in one
    // shot AND that whole-string measurement fits in wrapWidth, return
    // 1 line. Word-by-word measurement loses cross-word kerning and
    // sums the un-kerned widths of each word + space, which can exceed
    // the kerned full-string width by 5–10%. Without this short-circuit
    // a sentence that fits as one line gets falsely wrapped to 2,
    // doubling the height estimate and triggering pagination on
    // matrixTable cells whose content actually fits at render time.
    if (metrics?.measureWidthPx) {
        const whole = metrics.measureWidthPx(input.uppercase ? input.content.toUpperCase() : input.content, input.sizePt);
        if (process.env.RUNSTAMP_DEBUG_LINECOUNT) {
            // eslint-disable-next-line no-console
            console.error(`  [LC] "${input.content.slice(0, 40)}" sz=${input.sizePt} fam=${input.family} whole=${whole} wrapW=${wrapWidth} →`, whole <= wrapWidth ? "1 (short-circuit)" : "fall-through");
        }
        if (whole + (Math.max(0, input.content.length - 1) * tracking) <= wrapWidth) {
            return 1;
        }
    }
    else if (process.env.RUNSTAMP_DEBUG_LINECOUNT) {
        // eslint-disable-next-line no-console
        console.error(`  [LC] "${input.content.slice(0, 40)}" — NO measureWidthPx`);
    }
    let lines = 1;
    let xOnLine = 0;
    for (const word of words) {
        const w = measureWord(word);
        const withLead = xOnLine === 0 ? w : w + spaceWidth;
        if (xOnLine + withLead > wrapWidth) {
            lines += 1;
            xOnLine = w;
        }
        else {
            xOnLine += withLead;
        }
    }
    return lines;
}
/** Keep the trailing hyphen on the left half so its width is counted on
 *  the original line (matching how PowerPoint renders the break). */
function splitOnHyphens(chunk) {
    if (!chunk.includes("-"))
        return [chunk];
    const out = [];
    const parts = chunk.split("-");
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].length === 0)
            continue;
        out.push(i < parts.length - 1 ? `${parts[i]}-` : parts[i]);
    }
    return out;
}
/**
 * Convenience: measure a string using a resolved type role. The provider
 * (when present) is read from the tokens via WeakMap lookup, so a single
 * `attachMetricsProvider(tokens, provider)` call upstream upgrades every
 * `measureByRole` call site automatically.
 */
export function measureByRole(content, role, tokens, opts = {}) {
    const typeRole = tokens.type[role];
    const width = estimateTextWidth({
        content,
        family: typeRole.family,
        sizePt: typeRole.size,
        letterSpacing: typeRole.letterSpacing,
        uppercase: typeRole.transform === "upper",
    }, tokens);
    const lines = opts.width !== undefined
        ? estimateLineCount({
            content,
            family: typeRole.family,
            sizePt: typeRole.size,
            letterSpacing: typeRole.letterSpacing,
            uppercase: typeRole.transform === "upper",
            width: opts.width,
        }, tokens)
        : 1;
    const lineHeight = estimateLineHeight(typeRole.size, typeRole.lineHeight, tokens, typeRole.family);
    return { width, lines, lineHeight };
}
/** Collapse a run array to a flat string for empirical estimators that
 *  don't care about per-run styling (e.g., line-count counters that just
 *  need the character stream). Run breaks add no whitespace. */
export function flattenRuns(runs) {
    let out = "";
    for (const run of runs)
        out += run.text;
    return out;
}
/** Sum estimated widths across a run array. Each run's font/size override
 *  is applied; runs without overrides fall through to the base TextNode
 *  style. Used by primitives that emit `runs: TextRun[]` and need to
 *  size their rect against the actual glyph stream. */
export function estimateRunsWidth(runs, base, source) {
    let total = 0;
    for (const run of runs) {
        total += estimateTextWidth({
            content: run.text,
            family: run.fontFamily ?? base.family,
            sizePt: run.fontSize ?? base.sizePt,
            letterSpacing: base.letterSpacing,
            uppercase: base.uppercase,
        }, source);
    }
    return total;
}
/**
 * Apply a type role's `transform` to text content.
 */
export function applyTypeTransform(content, transform) {
    switch (transform) {
        case "upper":
            return content.toUpperCase();
        case "lower":
            return content.toLowerCase();
        case "title":
            return content.replace(/\w\S*/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        default:
            return content;
    }
}
//# sourceMappingURL=estimateText.js.map