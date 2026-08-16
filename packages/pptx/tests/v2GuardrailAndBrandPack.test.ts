import { describe, expect, it } from "vitest";
import {
  buildUnsupportedV2PolicyResult,
  buildV2PolicyResult,
  buildV2PreflightValidationSummary,
  buildV2RenderValidationSummary,
} from "../../../platform/app/lib/v2/preflight";
import { inferArchetypeKey } from "../../../platform/app/lib/v2/brandPacks";

describe("V2 guardrail policy", () => {
  it("marks blocking findings and next actions deterministically", () => {
    const policy = buildV2PolicyResult({
      deckScore: 72,
      documentVerdict: "pass",
      validationMode: "structural",
      findings: [
        {
          code: "BRAND_MISSING",
          severity: "error",
          category: "brand",
          blocking: true,
          slideIndex: 0,
          componentPath: "slides[0]",
          message: "Missing brand token",
          machineFixHint: "Attach the active brand pack.",
          recommendedAction: "Attach the active brand pack before render.",
        },
      ],
    }, {
      preflightPolicy: {
        renderIfScoreAbove: 80,
      },
      requestedValidationMode: "structural",
    });

    expect(policy).toMatchObject({
      allowedToRender: false,
      blocking: true,
      blockingCodes: ["BRAND_MISSING"],
      blockingFindingCount: 1,
      deckScoreThresholdMet: false,
      validationMode: "structural",
    });
    expect(policy.reasons.map((reason) => reason.code)).toEqual([
      "DECK_SCORE_THRESHOLD_NOT_MET",
      "BLOCKING_FINDINGS_PRESENT",
    ]);
    expect(policy.nextActions).toContain("Attach the active brand pack before render.");
  });

  it("builds an unsupported validation decision without pretending preflight ran", () => {
    const policy = buildUnsupportedV2PolicyResult("desktop_async");

    expect(policy).toMatchObject({
      allowedToRender: false,
      blocking: true,
      validationMode: "desktop_async",
      unsupportedModes: ["desktop_async"],
    });
    expect(policy.reasons[0]?.code).toBe("UNSUPPORTED_VALIDATION_MODE");
  });

  it("summarizes desktop_blocking as deferred during preflight and executed during render", () => {
    expect(buildV2PreflightValidationSummary("desktop_blocking")).toMatchObject({
      requestedMode: "desktop_blocking",
      executedModes: [],
      deferredModes: ["desktop_blocking"],
    });

    expect(buildV2RenderValidationSummary("desktop_blocking", { renderCompleted: true })).toMatchObject({
      requestedMode: "desktop_blocking",
      executedModes: ["structural", "desktop_blocking"],
      deferredModes: [],
    });
  });
});

describe("brand-pack archetype inference", () => {
  it("recognizes market-map and tombstone-grid layouts from runtime-safe signals", () => {
    expect(inferArchetypeKey({
      name: "Market Landscape",
      placeholders: [
        { type: "title" },
        { type: "obj" },
      ],
    } as any)).toBe("market-map");

    expect(inferArchetypeKey({
      name: "Transactions Tombstones",
      placeholders: [
        { type: "title" },
        { type: "body" },
        { type: "pic" },
      ],
    } as any)).toBe("tombstone-grid");
  });

  it("recognizes timeline and kpi-grid layouts from placeholder geometry when naming is generic", () => {
    expect(inferArchetypeKey({
      name: "Executive Sequence",
      placeholders: [
        { type: "title", x: 0, y: 0, cx: 400, cy: 80 },
        { type: "body", x: 20, y: 180, cx: 180, cy: 120 },
        { type: "body", x: 260, y: 184, cx: 180, cy: 120 },
        { type: "body", x: 500, y: 188, cx: 180, cy: 120 },
      ],
    } as any)).toBe("timeline");

    expect(inferArchetypeKey({
      name: "Quarterly Summary",
      placeholders: [
        { type: "title", x: 0, y: 0, cx: 400, cy: 80 },
        { type: "body", x: 20, y: 160, cx: 220, cy: 140 },
        { type: "body", x: 280, y: 160, cx: 220, cy: 140 },
        { type: "body", x: 20, y: 340, cx: 220, cy: 140 },
        { type: "body", x: 280, y: 340, cx: 220, cy: 140 },
      ],
    } as any)).toBe("kpi-grid");
  });
});
