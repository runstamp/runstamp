export const PRESENTATION_XML = "ppt/presentation.xml";
export const CONTENT_TYPES_XML = "[Content_Types].xml";
export function listSlideParts(opened) {
    return opened
        .listParts()
        .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
        .sort((a, b) => slideNumber(a) - slideNumber(b));
}
function slideNumber(path) {
    const m = /slide(\d+)\.xml$/.exec(path);
    return m ? Number(m[1]) : 0;
}
export function assertValidPptx(opened) {
    if (!opened.hasPart(CONTENT_TYPES_XML)) {
        throw new Error(`PPTX missing required part: ${CONTENT_TYPES_XML}`);
    }
    if (!opened.hasPart(PRESENTATION_XML)) {
        throw new Error(`PPTX missing required part: ${PRESENTATION_XML}`);
    }
}
//# sourceMappingURL=parts.js.map