import { afterEach, describe, expect, it, vi } from "vitest";
import { setDeterministicMode, SpreadsheetEngine } from "../src/index.js";
import { createRepresentativeWorkbook } from "./representative-workbook.js";

describe("deterministic workbook rendering", () => {
  afterEach(() => vi.useRealTimers());

  it("renders a representative workbook byte-identically twice in one process", async () => {
    setDeterministicMode(true);

    const buf1 = await SpreadsheetEngine.render(createRepresentativeWorkbook());
    const buf2 = await SpreadsheetEngine.render(createRepresentativeWorkbook());

    expect(buf1.equals(buf2)).toBe(true);
  });

  it("repairs a workbook byte-identically across wall-clock times", async () => {
    const input = await SpreadsheetEngine.render(createRepresentativeWorkbook());

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-08-14T01:00:00.000Z"));
    const first = await SpreadsheetEngine.repair(input, { deterministic: true });
    vi.setSystemTime(new Date("2031-03-09T17:42:16.000Z"));
    const second = await SpreadsheetEngine.repair(input, { deterministic: true });

    expect(first.buffer.equals(second.buffer)).toBe(true);
  });
});
