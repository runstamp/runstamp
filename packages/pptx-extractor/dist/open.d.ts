export interface OpenedPptx {
    parts: Map<string, Buffer>;
    hasPart(path: string): boolean;
    getPart(path: string): Buffer | undefined;
    getPartText(path: string): string | undefined;
    listParts(): string[];
}
export interface OpenPptxLimits {
    /** Maximum number of file entries in the archive (default: 10000). */
    maxEntries?: number;
    /** Maximum total uncompressed size across all entries in bytes (default: 1 GiB). */
    maxTotalUncompressedBytes?: number;
}
export declare function openPptx(buffer: Buffer, limits?: OpenPptxLimits): Promise<OpenedPptx>;
//# sourceMappingURL=open.d.ts.map