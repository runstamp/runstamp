import { renderPhase1BenchmarkReport } from "../src/benchmarks/report.js";

const iterationsFlagIndex = process.argv.indexOf("--iterations");
const iterations = iterationsFlagIndex >= 0
  ? Number(process.argv[iterationsFlagIndex + 1])
  : 10;

const report = await renderPhase1BenchmarkReport(Number.isFinite(iterations) && iterations > 0 ? iterations : 10);
console.log(report);
