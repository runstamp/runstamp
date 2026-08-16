import type { CompositionPrimitiveName } from "./composition.js";
export interface RegionSize {
    colSpan: number;
    rowSpan: number;
}
/**
 * Static minimum-region floor. Use {@link minRegionFor} to look up a primitive
 * with optional content-count context (n metrics, n rows, etc.).
 */
export declare const MIN_REGION_STATIC: Partial<Record<CompositionPrimitiveName, RegionSize>>;
/**
 * Variable minimum sizes — primitives whose floor depends on content count.
 * `n` is the relevant content count (metrics in a stack, rows in a table,
 * body items in a card, comparison items, steps in a timeline, etc.).
 */
export declare const MIN_REGION_VARIABLE: {
    readonly metricStack: (n: number) => RegionSize;
    readonly infoCard: (bodyItems: number) => RegionSize;
    readonly matrixTable: (rows: number, anyCellWraps?: boolean) => RegionSize;
};
/**
 * Look up the minimum region for a primitive. Pass `n` (or rows/anyCellWraps
 * for matrixTable) when the primitive's floor scales with content count;
 * otherwise the static floor is returned.
 *
 * Returns null for primitives with no defined floor (`imageBleed`,
 * `connectorLine`, `groupBorder`, `container`).
 */
export declare function minRegionFor(primitive: string, context?: {
    n?: number;
    anyCellWraps?: boolean;
}): RegionSize | null;
/**
 * Build a one-line remediation hint for a REGION_TOO_SMALL error. Used by
 * the layout safety pass to populate PaperErrorIssue.remediation.
 */
export declare function remediationFor(primitive: string, actual: {
    colSpan?: number;
    rowSpan?: number;
}, minimum: RegionSize): string;
//# sourceMappingURL=minRegion.d.ts.map