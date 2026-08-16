/**
 * chartBlock — thin pass-through to the engine's native chart renderer.
 *
 * Unlike waterfallBars (which we draw manually with View + Text nodes so
 * the aesthetic bends entirely to tokens), chartBlock delegates to the
 * engine's real chart pipeline — categories, series, axes, legends, the
 * whole cx:chart XML. This is necessary for line charts, scatter,
 * stacked bar, pie, etc. where manual rectangle rendering doesn't cut it.
 *
 * What this primitive adds on top of raw ChartData:
 *   - Auto-fills series colors from `palette` when caller omits them,
 *     cycling accent → muted → faint so charts are token-consistent.
 *   - Auto-fills font families from `type.body` on axes/legend/title so
 *     chart typography matches the deck.
 *
 * Callers pass a `ChartData`-shaped object (schema lives in the engine,
 * not here). Anything the caller sets explicitly wins — the primitive
 * only fills in blanks. This preserves the "open token schema" contract
 * while still giving aesthetic coherence by default.
 *
 * Content adaptation: none. Charts render at the region size they're
 * given; the engine handles its own internal layout.
 */
export const chartBlock = (input, tokens, region) => {
    const nodes = [];
    const chartData = input.preserveCallerStyling
        ? input.chartData
        : applyTokens(input.chartData, tokens);
    nodes.push({
        kind: "chart",
        rect: region,
        chartData,
        ...(input.altText ? { altText: input.altText } : {}),
    });
    return { nodes, overflow: { kind: "fit" } };
};
// ---------------------------------------------------------------------------
// Token application
// ---------------------------------------------------------------------------
function applyTokens(chartData, tokens) {
    if (!chartData || typeof chartData !== "object")
        return chartData;
    const cd = chartData;
    const paletteCycle = [
        tokens.palette.accent,
        tokens.palette.muted,
        tokens.palette.faint,
        tokens.palette.foreground,
    ];
    const family = tokens.type.body.family;
    const axisFontSize = Math.max(tokens.type.caption.size, 9);
    // Fill series colors when missing.
    let series = cd.series;
    if (Array.isArray(series)) {
        series = series.map((s, i) => {
            const seriesObj = s;
            if (seriesObj.color)
                return seriesObj;
            return { ...seriesObj, color: paletteCycle[i % paletteCycle.length] };
        });
    }
    // Font family on title.
    let title = cd.title;
    if (title && !title.fontFamily) {
        title = { ...title, fontFamily: family, fontColor: title.fontColor ?? tokens.palette.foreground };
    }
    // Font family on axes.
    const fillAxis = (axis) => {
        if (!axis)
            return axis;
        const next = { ...axis };
        if (!next.fontFamily)
            next.fontFamily = family;
        if (!next.fontSize)
            next.fontSize = axisFontSize;
        if (!next.fontColor)
            next.fontColor = tokens.palette.muted;
        return next;
    };
    const categoryAxis = fillAxis(cd.categoryAxis);
    const valueAxis = fillAxis(cd.valueAxis);
    // Legend font family.
    let legend = cd.legend;
    if (legend && !legend.fontFamily) {
        legend = { ...legend, fontFamily: family, fontSize: legend.fontSize ?? axisFontSize, fontColor: legend.fontColor ?? tokens.palette.muted };
    }
    return {
        ...cd,
        ...(series !== undefined ? { series } : {}),
        ...(title ? { title } : {}),
        ...(categoryAxis ? { categoryAxis } : {}),
        ...(valueAxis ? { valueAxis } : {}),
        ...(legend ? { legend } : {}),
    };
}
//# sourceMappingURL=chartBlock.js.map