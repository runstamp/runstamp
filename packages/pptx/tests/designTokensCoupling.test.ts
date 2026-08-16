// WS-3: token coupling coverage. Every token in SCALE_TYPOGRAPHY_KEYS +
// SCALE_LAYOUT_KEYS + DENSITY_LAYOUT_KEYS must actually vary when the
// corresponding control is pushed. A regression here (forgetting to add
// a new token to a multiplier set) means a user pushing scale="lg"
// silently gets a partial scale-up — the exact root cause of the PRD's
// `trueclara-v2-agent.pptx` breakage.

import { describe, expect, it, vi } from "vitest";
import {
  resolveAgentDesignTokens,
} from "../src/interpreter/design-tokens.js";
import * as loggerModule from "../src/logger.js";

function get(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key];
  return typeof v === "number" ? v : undefined;
}

describe("design token coupling coverage (WS-3)", () => {
  describe("scale multiplier propagation", () => {
    // DEFAULT_SCALE is "lg" — compare xl > default > sm.
    const base = resolveAgentDesignTokens({ theme: "default-navy" });
    const lg = resolveAgentDesignTokens({
      theme: "default-navy",
      designTokens: { scale: "xl" },
    });
    const sm = resolveAgentDesignTokens({
      theme: "default-navy",
      designTokens: { scale: "sm" },
    });

    // Typography keys that must scale
    const TYPOGRAPHY_KEYS = [
      "heroTitleSize",
      "heroSubtitleSize",
      "headerSize",
      "subheaderSize",
      "footerSize",
      "sectionTitleSize",
      "sectionSubtitleSize",
      "statementBodySize",
      "bulletListSize",
      "bulletsProseSize",
      "comparisonBodySize",
      "kpiGradientLabelSize",
      "kpiLabelSize",
      "kpiValueSize",
      "kpiSublabelSize",
      "chartTitleSize",
      "chartLegendSize",
      "chartDataLabelSize",
      "chartPieDataLabelSize",
    ] as const;

    for (const key of TYPOGRAPHY_KEYS) {
      it(`typography.${key} scales up under scale="lg" and down under "sm"`, () => {
        const baseVal = get(base.typography as unknown as Record<string, unknown>, key);
        const lgVal = get(lg.typography as unknown as Record<string, unknown>, key);
        const smVal = get(sm.typography as unknown as Record<string, unknown>, key);
        expect(baseVal, `base ${key}`).toBeDefined();
        expect(lgVal, `lg ${key}`).toBeDefined();
        expect(smVal, `sm ${key}`).toBeDefined();
        expect(lgVal!).toBeGreaterThan(baseVal!);
        expect(smVal!).toBeLessThan(baseVal!);
      });
    }

    // Framing layout tokens — base values large enough that the 8% scale
    // step moves them strictly. Users pushing scale=xl expect these to
    // grow; if a new framing token is forgotten here, the PRD's
    // `trueclara-v2-agent.pptx` style breakage recurs.
    const LAYOUT_KEYS = [
      "titlePaddingTop",
      "titlePaddingBottom",
      "contentPaddingTop",
      "contentPaddingBottom",
      "titleDividerMarginTop",
      "titleDividerMarginBottom",
      "sectionDividerMarginTop",
      "sectionDividerMarginBottom",
      "statementParagraphGap",
      "bodyTopWithSubtitle",
      "bodyTopWithoutSubtitle",
      "bodyHeight",
      "chartHeight",
      "dashboardGap",
      "comparisonGap",
      "comparisonColumnGap",
      "kpiCardHeight",
      "kpiCardPadding",
      "bulletsBottomMargin",
      "bulletsHeightWithProse",
      "proseOffsetAfterBullets",
      "headerTop",
      "subheaderTop",
      "footerBottom",
      // WS-3: visual ornaments with default magnitudes large enough to move
      "titleDividerWidth",
      "sectionDividerWidth",
    ] as const;

    for (const key of LAYOUT_KEYS) {
      it(`layout.${key} scales with typography`, () => {
        const baseVal = get(base.layout as unknown as Record<string, unknown>, key);
        const lgVal = get(lg.layout as unknown as Record<string, unknown>, key);
        expect(baseVal, `base ${key}`).toBeDefined();
        expect(lgVal, `xl ${key}`).toBeDefined();
        expect(lgVal!).toBeGreaterThan(baseVal!);
      });
    }

    // Tiny-magnitude ornaments (accentBarHeight=4, titleDividerHeight=3,
    // sectionDividerHeight=3 in the default preset). These are in
    // SCALE_LAYOUT_KEYS so the multiplier is applied, but rounding may
    // absorb the 8% step at their default sizes. What we can assert
    // monotonically: under shape/density combinations, these stay
    // positive and finite across all scale values.
    const TINY_ORNAMENTS = ["accentBarHeight", "titleDividerHeight", "sectionDividerHeight"] as const;
    for (const key of TINY_ORNAMENTS) {
      it(`layout.${key} stays positive and finite across scales`, () => {
        for (const scale of ["sm", "md", "lg", "xl"] as const) {
          const resolved = resolveAgentDesignTokens({
            theme: "default-navy",
            designTokens: { scale },
          });
          const value = get(resolved.layout as unknown as Record<string, unknown>, key);
          expect(value, `scale=${scale} ${key}`).toBeDefined();
          expect(Number.isFinite(value!)).toBe(true);
          expect(value!).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("density multiplier propagation", () => {
    const balanced = resolveAgentDesignTokens({ theme: "default-navy" });
    const spacious = resolveAgentDesignTokens({
      theme: "default-navy",
      designTokens: { density: "spacious" },
    });
    const compact = resolveAgentDesignTokens({
      theme: "default-navy",
      designTokens: { density: "compact" },
    });

    const DENSITY_KEYS = [
      "paddingX",
      "paddingTop",
      "paddingBottom",
      "titlePaddingX",
      "contentPaddingX",
      "dashboardGap",
      "comparisonGap",
      "kpiCardHeight",
      "kpiCardPadding",
      "headerLeft",
      "contentWidth",
      "dashboardKpiPanelWidthWithChart",
      "dashboardChartWidthWithKpis",
      "chartFocusSidebarWidth",
    ] as const;

    for (const key of DENSITY_KEYS) {
      it(`layout.${key} varies under density="spacious" vs "compact"`, () => {
        const baselineVal = get(balanced.layout as unknown as Record<string, unknown>, key);
        const spaciousVal = get(spacious.layout as unknown as Record<string, unknown>, key);
        const compactVal = get(compact.layout as unknown as Record<string, unknown>, key);
        expect(baselineVal, `balanced ${key}`).toBeDefined();
        expect(spaciousVal, `spacious ${key}`).toBeDefined();
        expect(compactVal, `compact ${key}`).toBeDefined();
        expect(spaciousVal!).toBeGreaterThan(baselineVal!);
        expect(compactVal!).toBeLessThan(baselineVal!);
      });
    }
  });

  describe("shape multiplier propagation", () => {
    it("shape=\"round\" produces a larger kpiShapeAdjustment than \"sharp\"", () => {
      const sharp = resolveAgentDesignTokens({
        theme: "default-navy",
        designTokens: { shape: "sharp" },
      });
      const round = resolveAgentDesignTokens({
        theme: "default-navy",
        designTokens: { shape: "round" },
      });
      expect(round.effects.kpiShapeAdjustment).toBeGreaterThan(
        sharp.effects.kpiShapeAdjustment,
      );
    });

    it("shape=\"sharp\" resolves cardShapeType to \"rect\"", () => {
      const sharp = resolveAgentDesignTokens({
        theme: "default-navy",
        designTokens: { shape: "sharp" },
      });
      expect(sharp.semantic.cardShapeType).toBe("rect");
    });

    it("shape=\"round\" or \"soft\" resolves cardShapeType to \"roundRect\"", () => {
      const round = resolveAgentDesignTokens({
        theme: "default-navy",
        designTokens: { shape: "round" },
      });
      const soft = resolveAgentDesignTokens({
        theme: "default-navy",
        designTokens: { shape: "soft" },
      });
      expect(round.semantic.cardShapeType).toBe("roundRect");
      expect(soft.semantic.cardShapeType).toBe("roundRect");
    });
  });

  describe("atomic-override warnings (WS-3)", () => {
    function captureWarnings(fn: () => void): string[] {
      const warn = vi.fn();
      const orig = loggerModule.getLogger();
      const spy = vi.spyOn(loggerModule, "getLogger").mockReturnValue({
        ...orig,
        warn,
      } as ReturnType<typeof loggerModule.getLogger>);
      try {
        fn();
      } finally {
        spy.mockRestore();
      }
      return warn.mock.calls
        .map((args) => (typeof args[0] === "string" ? args[0] : ""))
        .filter((msg) => msg.length > 0);
    }

    it("warns when scale is non-default and a typography override is present", () => {
      const msgs = captureWarnings(() => {
        resolveAgentDesignTokens({
          theme: "default-navy",
          designTokens: {
            scale: "sm",
            typography: { kpiValueSize: 44 },
          },
        });
      });
      expect(msgs.some((m) => m.includes("scale=\"sm\"") && m.includes("kpiValueSize"))).toBe(true);
    });

    it("warns when scale is non-default and a framing layout override is present", () => {
      const msgs = captureWarnings(() => {
        resolveAgentDesignTokens({
          theme: "default-navy",
          designTokens: {
            scale: "xl",
            layout: { contentPaddingTop: 120 },
          },
        });
      });
      expect(msgs.some((m) => m.includes("scale=\"xl\"") && m.includes("contentPaddingTop"))).toBe(true);
    });

    it("warns when density is non-default and a density-tracked layout override is present", () => {
      const msgs = captureWarnings(() => {
        resolveAgentDesignTokens({
          theme: "default-navy",
          designTokens: {
            density: "compact",
            layout: { contentPaddingX: 120 },
          },
        });
      });
      expect(msgs.some((m) => m.includes("density=\"compact\"") && m.includes("contentPaddingX"))).toBe(true);
    });

    it("does NOT warn when scale/density are at default values even with overrides", () => {
      // Default scale is "lg", density "balanced" — overrides in that
      // state do not defeat anything because no multiplier is active.
      const msgs = captureWarnings(() => {
        resolveAgentDesignTokens({
          theme: "default-navy",
          designTokens: {
            typography: { kpiValueSize: 44 },
            layout: { contentPaddingX: 120 },
          },
        });
      });
      expect(msgs.every((m) => !m.includes("[design-tokens]"))).toBe(true);
    });
  });

  describe("216-combination smoke (scale × density × shape × preset)", () => {
    // Every combination must resolve without throwing and produce a valid
    // ResolvedAgentDesignTokens shape. This catches any preset × control
    // interaction that produces NaN/undefined downstream.
    const SCALES = ["sm", "md", "lg", "xl"] as const;
    const DENSITIES = ["compact", "balanced", "spacious"] as const;
    const SHAPES = ["sharp", "soft", "round"] as const;
    const PRESETS = [
      "default-navy",
      "editorial-serif",
      "monochrome",
      "dark-punch",
      "midnight",
      "terminal",
      "editorial-wide",
    ] as const;

    it("resolves cleanly across all 7×4×3×3 = 252 combinations", () => {
      let combos = 0;
      for (const theme of PRESETS) {
        for (const scale of SCALES) {
          for (const density of DENSITIES) {
            for (const shape of SHAPES) {
              const out = resolveAgentDesignTokens({
                theme,
                designTokens: { scale, density, shape },
              });
              // Sanity: every layout token is a finite positive number.
              for (const [key, value] of Object.entries(out.layout)) {
                if (typeof value === "number") {
                  expect(Number.isFinite(value), `${theme}/${scale}/${density}/${shape}: layout.${key}`).toBe(true);
                  expect(value > 0 || key === "chartFocusSidebarLeft", `${theme}/${scale}/${density}/${shape}: layout.${key}`).toBe(true);
                }
              }
              combos += 1;
            }
          }
        }
      }
      expect(combos).toBe(7 * 4 * 3 * 3);
    });
  });
});
