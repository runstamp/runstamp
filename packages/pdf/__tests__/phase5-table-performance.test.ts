import { analyzePhase5Document } from "../src/phase5-table-layout.js";
import { createPerformanceTableDocument } from "../scripts/phase5-fixtures.js";

describe("Phase 5 table performance", () => {
  it("analyzes a 1,000-row table within a practical time budget", async () => {
    const started = performance.now();
    const analysis = await analyzePhase5Document(createPerformanceTableDocument());
    const elapsed = performance.now() - started;

    expect(analysis.pages.length).toBeGreaterThan(10);
    expect(analysis.tables[0]?.totalBodyRows).toBe(1000);
    expect(elapsed).toBeLessThan(5000);
  }, 15000);
});
