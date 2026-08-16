import type { OpenedPptx } from "./open.js";
export interface ExtractedTextRun {
    text: string;
    fontFamily?: string;
    color?: string;
    sizePt?: number;
    bold?: boolean;
}
export interface ExtractedSlide {
    index: number;
    text: string;
    shapeCount: number;
    hasTable: boolean;
    hasChart: boolean;
    hasImage: boolean;
    background?: string;
    textRuns: ExtractedTextRun[];
    fillColors: string[];
}
export interface ExtractedIR {
    meta: {
        title?: string;
    };
    slideCount: number;
    slides: ExtractedSlide[];
}
export declare function extractToIR(opened: OpenedPptx): ExtractedIR;
//# sourceMappingURL=extract-ir.d.ts.map