import { describe, expect, it } from "vitest";

import { compareLosses, createLoss, hasDroppedLoss, lossSeverityRank, sortLosses } from "../loss.js";
import type { Loss } from "../loss.js";
import type { Locator } from "../locator.js";

const ARTIFACT = `sha256:${"3".repeat(64)}`;

function slide(index: number): Locator {
  return { artifact: ARTIFACT, domain: "pptx", path: [{ kind: "slide", index }] };
}

function loss(overrides: Partial<Loss> & Pick<Loss, "code" | "severity" | "subject">): Loss {
  return createLoss({
    message: "loss",
    ...overrides,
  });
}

describe("createLoss", () => {
  it("defaults avoidable to false and omits absent optionals", () => {
    const l = createLoss({
      code: "pptx/CHART_FLATTENED",
      severity: "degraded",
      subject: "chart on slide 2",
      message: "Chart was flattened to an image.",
    });
    expect(l.avoidable).toBe(false);
    expect("locator" in l).toBe(false);
    expect("remediation" in l).toBe(false);
  });

  it("carries remediation when the loss is avoidable (R19)", () => {
    const l = createLoss({
      code: "pdf/VECTOR_RASTERIZED",
      severity: "degraded",
      subject: "vector artwork",
      message: "Rasterized at 300dpi.",
      avoidable: true,
      remediation: "Set rasterizeVectors to false.",
    });
    expect(l.avoidable).toBe(true);
    expect(l.remediation).toBe("Set rasterizeVectors to false.");
  });
});

describe("lossSeverityRank", () => {
  it("ranks dropped as most severe", () => {
    expect(lossSeverityRank("dropped")).toBeGreaterThan(lossSeverityRank("degraded"));
    expect(lossSeverityRank("degraded")).toBeGreaterThan(lossSeverityRank("substituted"));
  });
});

describe("compareLosses / sortLosses (R18)", () => {
  it("orders by locator first, numerically by ordinal", () => {
    const input = [
      loss({ code: "pptx/X", severity: "dropped", subject: "s", locator: slide(10) }),
      loss({ code: "pptx/X", severity: "dropped", subject: "s", locator: slide(2) }),
    ];
    expect(sortLosses(input).map((l) => l.locator?.path[0]?.index)).toEqual([2, 10]);
  });

  it("sorts positioned losses ahead of unpositioned ones", () => {
    const positioned = loss({ code: "pptx/X", severity: "dropped", subject: "s", locator: slide(9) });
    const floating = loss({ code: "pptx/X", severity: "dropped", subject: "s" });
    expect(compareLosses(positioned, floating)).toBeLessThan(0);
    expect(compareLosses(floating, positioned)).toBeGreaterThan(0);
  });

  it("orders most severe first when locators tie", () => {
    const input = [
      loss({ code: "pptx/X", severity: "substituted", subject: "s" }),
      loss({ code: "pptx/X", severity: "dropped", subject: "s" }),
      loss({ code: "pptx/X", severity: "degraded", subject: "s" }),
    ];
    expect(sortLosses(input).map((l) => l.severity)).toEqual(["dropped", "degraded", "substituted"]);
  });

  it("keeps emission order for losses that are otherwise identical", () => {
    // Consecutive characters in one run share locator, severity, code and
    // subject. Ordering them by message would sort by code point rather than
    // document order, so the tie must resolve to the order they were emitted.
    const input = [
      loss({ code: "pdf/G", severity: "dropped", subject: "text character", message: "漢" }),
      loss({ code: "pdf/G", severity: "dropped", subject: "text character", message: "字" }),
    ];
    expect(sortLosses(input).map((l) => l.message)).toEqual(["漢", "字"]);
    // Still a stable, repeatable order — which is what C12 actually requires.
    expect(sortLosses(sortLosses(input)).map((l) => l.message)).toEqual(["漢", "字"]);
  });

  it("falls back to code then subject for a total order", () => {
    const input = [
      loss({ code: "pptx/B", severity: "dropped", subject: "z" }),
      loss({ code: "pptx/B", severity: "dropped", subject: "a" }),
      loss({ code: "pptx/A", severity: "dropped", subject: "z" }),
    ];
    expect(sortLosses(input).map((l) => `${l.code}:${l.subject}`)).toEqual([
      "pptx/A:z",
      "pptx/B:a",
      "pptx/B:z",
    ]);
  });

  it("produces an identical ledger regardless of discovery order", () => {
    const a = loss({ code: "pptx/X", severity: "dropped", subject: "s", locator: slide(1) });
    const b = loss({ code: "pptx/Y", severity: "degraded", subject: "t", locator: slide(0) });
    const c = loss({ code: "pptx/Z", severity: "substituted", subject: "u" });

    expect(sortLosses([a, b, c])).toEqual(sortLosses([c, b, a]));
    expect(sortLosses([b, a, c])).toEqual(sortLosses([a, c, b]));
  });

  it("does not mutate its input", () => {
    const input = [
      loss({ code: "pptx/B", severity: "substituted", subject: "s" }),
      loss({ code: "pptx/A", severity: "dropped", subject: "s" }),
    ];
    const snapshot = [...input];
    sortLosses(input);
    expect(input).toEqual(snapshot);
  });
});

describe("hasDroppedLoss", () => {
  it("detects an outright drop, which is what lossPolicy failOnDropped keys on", () => {
    expect(hasDroppedLoss([loss({ code: "pptx/X", severity: "degraded", subject: "s" })])).toBe(false);
    expect(hasDroppedLoss([loss({ code: "pptx/X", severity: "dropped", subject: "s" })])).toBe(true);
    expect(hasDroppedLoss([])).toBe(false);
  });
});
