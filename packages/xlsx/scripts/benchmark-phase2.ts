import { renderPhase2BenchmarkReport } from "../src/benchmarks/phase2.js";

const iterationsFlagIndex = process.argv.indexOf("--iterations");
const iterations = iterationsFlagIndex >= 0
  ? Number(process.argv[iterationsFlagIndex + 1])
  : 3;

const report = await renderPhase2BenchmarkReport(
  Number.isFinite(iterations) && iterations > 0 ? iterations : 3,
);
console.log(report);
