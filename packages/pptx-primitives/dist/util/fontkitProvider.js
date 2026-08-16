/**
 * Fontkit-backed metrics provider.
 *
 * Built once per render from the caller's font buffers. Returns a
 * synchronous `MetricsProvider` closure that primitives can consult during
 * layout. The async work (parsing fonts) happens before primitives run;
 * the provider itself never awaits.
 *
 * Conventions:
 *   - One entry per (family, style). Bold/italic variants are separate
 *     entries flagged via the `bold`/`italic` booleans. The default
 *     resolution always picks the regular weight; callers requesting bold
 *     metrics for layout purposes (heavy titles inflate widths) can pass
 *     a `weight: "bold"` row whose `family` matches what
 *     `tokens.type.X.family` references.
 *   - Multiple buffers for the same family are merged: regular metrics
 *     win for the `avgWidthRatio` baseline; the regular face also drives
 *     `lineHeightPx`. Width measurements always select the closest face
 *     to the requested run (treated as regular here — Phase 5 doesn't
 *     yet expose the requested weight to the provider; reserved for
 *     when primitives forward style hints).
 *
 * The `avgWidthRatio` derived here uses the OS/2 table's `xAvgCharWidth`
 * when available, otherwise samples a representative ASCII string. Both
 * fall back gracefully — the provider never throws on a malformed font;
 * it returns `null` for unknown families and lets the empirical table
 * take over.
 */
import * as fontkit from "fontkit";
const PX_PER_PT = 96 / 72;
/** Canonical sample for `avgWidthRatio` derivation. Mix of common letters,
 *  digits, punctuation; weighted toward the lowercase alphabet that
 *  dominates body text. */
const SAMPLE_RUN = "the quick brown fox jumps over the lazy dog 0123456789 ,.!?'-";
function createFace(buffer) {
    // fontkit accepts a Buffer; coerce Uint8Array if the caller passed one.
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const raw = fontkit.create(buf);
    const font = "fonts" in raw ? raw.fonts[0] : raw;
    const unitsPerEm = font.unitsPerEm;
    const ascent = font.ascent;
    const descent = font.descent; // typically negative
    const lineGap = font.lineGap ?? 0;
    const lineHeightUnits = ascent - descent + lineGap;
    // Prefer OS/2 xAvgCharWidth when present; falls back to a sample run
    // through font.layout(). The sample path also handles fonts with
    // missing OS/2 metadata.
    let avgWidthUnits = 0;
    const os2 = font["OS/2"];
    if (os2?.xAvgCharWidth && os2.xAvgCharWidth > 0) {
        avgWidthUnits = os2.xAvgCharWidth;
    }
    else {
        const run = font.layout(SAMPLE_RUN);
        const total = run.glyphs.reduce((sum, g) => sum + g.advanceWidth, 0);
        avgWidthUnits = total / Math.max(1, SAMPLE_RUN.length);
    }
    // avgWidthRatio is "px per pt at default 96/72". We want
    // ratio = (px per char per pt). px/char/pt = (units/char) / unitsPerEm
    // (a glyph advance of 500 units at unitsPerEm=1000 means 0.5em per glyph,
    // which at 1pt = 1px/PX_PER_PT pt-to-px gives 0.5/PX_PER_PT * PX_PER_PT
    // = 0.5 in size-px). Net: avgWidthRatio is dimensionless em-fraction.
    const avgWidthRatio = avgWidthUnits / unitsPerEm;
    const ascenderRatio = ascent / unitsPerEm;
    const descenderRatio = Math.abs(descent) / unitsPerEm;
    return { font, unitsPerEm, lineHeightUnits, avgWidthRatio, ascenderRatio, descenderRatio };
}
/**
 * Build a synchronous `MetricsProvider` from a list of font buffers.
 *
 * The function does the parsing work eagerly — `fontkit.create()` is
 * synchronous given a buffer — so the returned provider has zero async
 * surface. Callers responsible for buffer I/O should fetch / read fonts
 * before calling.
 *
 * Multiple entries for the same family are accepted; the regular face
 * (no `bold` and no `italic`) is preferred for the family's glyph
 * metrics. If only a non-regular face is supplied, that one is used.
 */
export function buildFontkitMetricsProvider(fonts) {
    // Family → preferred face. We stash by-style faces too in case future
    // primitives want them; today the lookup is family-only.
    const families = new Map();
    for (const entry of fonts) {
        let face;
        try {
            face = createFace(entry.buffer);
        }
        catch {
            // Malformed buffers fall through silently — the provider returns
            // null for that family and the empirical table takes over.
            continue;
        }
        const isRegular = !entry.bold && !entry.italic;
        const existing = families.get(entry.family);
        if (!existing || isRegular) {
            families.set(entry.family, face);
        }
    }
    return (family) => {
        const face = families.get(family);
        if (!face)
            return null;
        return {
            avgWidthRatio: face.avgWidthRatio,
            ascenderRatio: face.ascenderRatio,
            descenderRatio: face.descenderRatio,
            measureWidthPx: (text, sizePt) => {
                if (text.length === 0)
                    return 0;
                const run = face.font.layout(text);
                const totalUnits = run.glyphs.reduce((sum, g) => sum + g.advanceWidth, 0);
                // (units / unitsPerEm) gives em-fraction; em-fraction × sizePt is pt;
                // pt × PX_PER_PT is px.
                return (totalUnits / face.unitsPerEm) * sizePt * PX_PER_PT;
            },
            lineHeightPx: (sizePt) => (face.lineHeightUnits / face.unitsPerEm) * sizePt * PX_PER_PT,
        };
    };
}
//# sourceMappingURL=fontkitProvider.js.map