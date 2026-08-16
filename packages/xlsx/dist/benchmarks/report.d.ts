interface BenchmarkStats {
    p50: number;
    p95: number;
    max: number;
}
interface Phase1BenchmarkResult {
    name: string;
    stats: BenchmarkStats;
    rowsPerSecond: number;
    cellsPerSecond: number;
    fileSizeBytes: number;
    rssDeltaBytes: number;
}
declare function runRenderBenchmark(fixtureName: "large-10k" | "large-50k" | "large-100k", iterations?: number): Promise<Phase1BenchmarkResult>;
declare function runCorrectnessSweep(): Promise<{
    passed: number;
    total: number;
    failures: string[];
}>;
declare function renderPhase1BenchmarkReport(iterations?: number): Promise<string>;

export { renderPhase1BenchmarkReport, runCorrectnessSweep, runRenderBenchmark };
export type { BenchmarkStats, Phase1BenchmarkResult };
