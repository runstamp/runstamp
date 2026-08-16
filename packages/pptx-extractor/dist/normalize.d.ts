import type { OpenedPptx } from "./open.js";
export interface NormalizationOptions {
    stripVolatileMetadata?: boolean;
}
export declare function normalizeXml(path: string, raw: Buffer): string;
export interface NormalizedPart {
    path: string;
    kind: "xml" | "binary";
    hash: string;
    size: number;
}
export declare function normalizeForHash(opened: OpenedPptx): {
    digest: string;
    parts: NormalizedPart[];
};
//# sourceMappingURL=normalize.d.ts.map