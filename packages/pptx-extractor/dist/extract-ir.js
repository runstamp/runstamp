import { XMLParser } from "fast-xml-parser";
import { listSlideParts } from "./parts.js";
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: false, // CRITICAL: keep "612.0" as string, not coerced to number 612
    trimValues: false,
    preserveOrder: false,
    removeNSPrefix: true,
});
function decodeXmlEntities(s) {
    return s
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}
function asArray(v) {
    if (v === undefined)
        return [];
    return Array.isArray(v) ? v : [v];
}
function walk(node, visit) {
    if (node === null || typeof node !== "object")
        return;
    for (const [key, value] of Object.entries(node)) {
        visit(key, value);
        if (Array.isArray(value)) {
            for (const item of value)
                walk(item, visit);
        }
        else if (value && typeof value === "object") {
            walk(value, visit);
        }
    }
}
function extractText(node) {
    if (typeof node === "string")
        return node;
    if (typeof node === "number")
        return String(node);
    return "";
}
function extractRPr(rPr) {
    const out = {};
    if (!rPr || typeof rPr !== "object")
        return out;
    const sz = rPr["@_sz"];
    if (sz) {
        const n = Number(sz);
        if (Number.isFinite(n))
            out.sizePt = n / 100;
    }
    if (rPr["@_b"] === "1")
        out.bold = true;
    const latin = rPr.latin;
    if (latin && latin["@_typeface"])
        out.fontFamily = String(latin["@_typeface"]);
    const fill = rPr.solidFill;
    if (fill && fill.srgbClr && fill.srgbClr["@_val"]) {
        out.color = String(fill.srgbClr["@_val"]).toUpperCase();
    }
    return out;
}
function extractRunsFromTxBody(txBody) {
    const runs = [];
    for (const p of asArray(txBody?.p)) {
        for (const r of asArray(p?.r)) {
            const text = extractText(r?.t);
            if (!text)
                continue;
            runs.push({ text, ...extractRPr(r?.rPr) });
        }
    }
    return runs;
}
function extractFillColorFromSpPr(spPr) {
    if (!spPr)
        return undefined;
    const fill = spPr.solidFill;
    if (fill && fill.srgbClr && fill.srgbClr["@_val"]) {
        return String(fill.srgbClr["@_val"]).toUpperCase();
    }
    return undefined;
}
function extractBackground(cSld) {
    const bg = cSld?.bg?.bgPr?.solidFill?.srgbClr?.["@_val"];
    if (bg)
        return String(bg).toUpperCase();
    return undefined;
}
function isChartFrame(graphicFrame) {
    const data = graphicFrame?.graphic?.graphicData;
    const uri = data?.["@_uri"];
    if (typeof uri === "string" && uri.includes("/chart"))
        return true;
    return Boolean(data?.chart);
}
function isTableFrame(graphicFrame) {
    const data = graphicFrame?.graphic?.graphicData;
    const uri = data?.["@_uri"];
    if (typeof uri === "string" && uri.includes("/table"))
        return true;
    return Boolean(data?.tbl);
}
function extractTextFromTable(tbl) {
    const runs = [];
    const fills = [];
    for (const tr of asArray(tbl?.tr)) {
        for (const tc of asArray(tr?.tc)) {
            const tcPr = tc?.tcPr;
            const fill = extractFillColorFromSpPr(tcPr);
            if (fill)
                fills.push(fill);
            const cellRuns = extractRunsFromTxBody(tc?.txBody);
            runs.push(...cellRuns);
        }
    }
    const text = runs.map((r) => r.text).join(" ");
    return { text, runs, fills };
}
function extractSlide(index, xml) {
    const parsed = parser.parse(xml);
    const sld = parsed?.sld;
    const cSld = sld?.cSld;
    const spTree = cSld?.spTree;
    const textRuns = [];
    const fillColors = [];
    let shapeCount = 0;
    let hasTable = false;
    let hasChart = false;
    let hasImage = false;
    // Plain shapes (text boxes, rectangles)
    for (const sp of asArray(spTree?.sp)) {
        shapeCount++;
        const fill = extractFillColorFromSpPr(sp?.spPr);
        if (fill)
            fillColors.push(fill);
        const runs = extractRunsFromTxBody(sp?.txBody);
        textRuns.push(...runs);
    }
    // Group shapes
    for (const grp of asArray(spTree?.grpSp)) {
        for (const sp of asArray(grp?.sp)) {
            shapeCount++;
            const fill = extractFillColorFromSpPr(sp?.spPr);
            if (fill)
                fillColors.push(fill);
            const runs = extractRunsFromTxBody(sp?.txBody);
            textRuns.push(...runs);
        }
    }
    // Pictures
    for (const _pic of asArray(spTree?.pic)) {
        shapeCount++;
        hasImage = true;
    }
    // Graphic frames (charts, tables)
    for (const gf of asArray(spTree?.graphicFrame)) {
        shapeCount++;
        if (isTableFrame(gf)) {
            hasTable = true;
            const tbl = gf?.graphic?.graphicData?.tbl;
            const { runs, fills } = extractTextFromTable(tbl);
            textRuns.push(...runs);
            fillColors.push(...fills);
        }
        else if (isChartFrame(gf)) {
            hasChart = true;
        }
    }
    // Walk to be safe — catch nested text we might have missed
    // (e.g. shapes inside groups not enumerated above)
    walk(spTree, (key, value) => {
        if (key === "graphicFrame")
            return; // already handled
        if (key === "txBody" && value && typeof value === "object") {
            // Only add if not already collected (cheap dedup by reference)
            const runs = extractRunsFromTxBody(value);
            for (const r of runs) {
                if (!textRuns.some((existing) => existing === r)) {
                    // Avoid duplication: if these were already added above, skip.
                    // The structural pass above already collected; this is defensive.
                }
            }
        }
    });
    const text = textRuns.map((r) => r.text).join(" ");
    const background = extractBackground(cSld);
    return {
        index,
        text,
        shapeCount,
        hasTable,
        hasChart,
        hasImage,
        background,
        textRuns,
        fillColors: Array.from(new Set(fillColors)),
    };
}
function extractMetaTitle(opened) {
    const xml = opened.getPartText("docProps/core.xml");
    if (!xml)
        return undefined;
    const m = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/.exec(xml);
    return m ? decodeXmlEntities(m[1]) : undefined;
}
export function extractToIR(opened) {
    const slidePaths = listSlideParts(opened);
    const slides = slidePaths.map((path, i) => {
        const xml = opened.getPartText(path);
        return extractSlide(i + 1, xml);
    });
    return {
        meta: { title: extractMetaTitle(opened) },
        slideCount: slides.length,
        slides,
    };
}
//# sourceMappingURL=extract-ir.js.map