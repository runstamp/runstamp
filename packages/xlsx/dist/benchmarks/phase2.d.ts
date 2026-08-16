interface SpreadsheetRenderStageMetrics {
    worksheetSerializationTimeMs: number;
    stylesSerializationTimeMs: number;
    sharedStringsSerializationTimeMs: number;
    packageSerializationTimeMs: number;
    archiveFinalizationTimeMs: number;
}
interface SpreadsheetRenderKeyPartBytes {
    sheet1XmlBytes: number;
    stylesXmlBytes: number;
    sharedStringsXmlBytes: number;
    zipBytes: number;
    sheet1XmlCompressedBytes?: number;
    stylesXmlCompressedBytes?: number;
    sharedStringsXmlCompressedBytes?: number;
    sheet1XmlZipContributionBytes?: number;
    stylesXmlZipContributionBytes?: number;
    sharedStringsXmlZipContributionBytes?: number;
    otherZipContributionBytes?: number;
}

type Phase2BenchmarkStatus = "pass" | "warn" | "fail" | "blocked";
interface BenchmarkStats {
    p50: number;
    p95: number;
    max: number;
}
interface Phase2BenchmarkResult {
    id: string;
    group: "E" | "F" | "G" | "H";
    name: string;
    target: string;
    status: Phase2BenchmarkStatus;
    observed: string;
    notes?: string;
    diagnostics?: Phase2BenchmarkDiagnostics;
}
interface Phase2BenchmarkDiagnostics {
    bottleneck?: "serializer-bound" | "archive-bound" | "mixed";
    classification?: "active-performance-debt" | "benchmark-target-mismatch-candidate";
    payloadDominantPart?: "worksheet" | "styles" | "sharedStrings" | "other";
    practicalFloorGapBytes?: number;
    keyPartBytes?: SpreadsheetRenderKeyPartBytes;
    stageMetrics?: SpreadsheetRenderStageMetrics;
    stylePart?: {
        bytes: number;
        componentCounts: {
            numFmts: number;
            fonts: number;
            fills: number;
            borders: number;
            cellXfs: number;
            dxfs: number;
        };
        bytesPerCellXf: number;
        bytesPerStyleComponent: number;
    };
}
interface Phase2BenchmarkSummary {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    blocked: number;
}
interface Phase2BenchmarkReport {
    generatedAt: string;
    environment: {
        node: string;
        platform: string;
        arch: string;
    };
    summary: Phase2BenchmarkSummary;
    results: Phase2BenchmarkResult[];
}
declare function classifySizeEfficiencyStatus(value: number, max: number, diagnostics?: Phase2BenchmarkDiagnostics): Phase2BenchmarkStatus;
interface ExcelJsBenchmarkLoaderOptions {
    envModulePath?: string;
    packageRequireBase?: string | URL | false;
    tempRequireBase?: string | false;
}
interface ExcelJsBenchmarkModuleResult {
    status: "loaded" | "missing";
    module?: any;
    source?: string;
    message?: string;
}
declare function loadExcelJsBenchmarkModule(options?: ExcelJsBenchmarkLoaderOptions): Promise<ExcelJsBenchmarkModuleResult>;
declare function runPhase2BenchmarkSuite(iterations?: number): Promise<Phase2BenchmarkReport>;
declare function renderPhase2BenchmarkReport(iterations?: number): Promise<string>;

export { classifySizeEfficiencyStatus, loadExcelJsBenchmarkModule, renderPhase2BenchmarkReport, runPhase2BenchmarkSuite };
export type { BenchmarkStats, Phase2BenchmarkDiagnostics, Phase2BenchmarkReport, Phase2BenchmarkResult, Phase2BenchmarkStatus, Phase2BenchmarkSummary };
