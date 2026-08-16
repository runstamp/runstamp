// Every AgentThemePreset must resolve to a distinct token set. If
// someone adds a new preset name to AgentThemePresetSchema but forgets
// to wire AGENT_THEME_PRESET_OVERRIDES, the resolve path falls through
// to the base tokens and produces a silent duplicate of default-navy.
// This test pins the invariant.

import { describe, expect, it } from "vitest";
import {
  resolveAgentDesignTokens,
} from "../src/interpreter/design-tokens.js";
import { AgentThemePresetSchema } from "../src/interpreter/design-tokens.js";

describe("preset uniqueness", () => {
  const allPresets = AgentThemePresetSchema.options;

  it("has at least 7 presets", () => {
    expect(allPresets.length).toBeGreaterThanOrEqual(7);
  });

  it("every preset resolves to a unique color signature", () => {
    const signatures = new Map<string, string>(); // signature → preset
    for (const preset of allPresets) {
      const tokens = resolveAgentDesignTokens({ theme: preset });
      const sig = JSON.stringify({
        dark1: tokens.colors.themeDark1,
        light1: tokens.colors.themeLight1,
        accent: tokens.colors.accent,
        body: tokens.colors.slideBackground,
      });
      const collision = signatures.get(sig);
      if (collision) {
        throw new Error(
          `Preset "${preset}" has identical color signature to "${collision}". Did you forget an AGENT_THEME_PRESET_OVERRIDES entry?`,
        );
      }
      signatures.set(sig, preset);
    }
  });

  it("every preset provides a non-empty chart palette of at least 2 colors", () => {
    for (const preset of allPresets) {
      const tokens = resolveAgentDesignTokens({ theme: preset });
      expect(
        tokens.colors.chartPalette.length,
        `${preset} chart palette`,
      ).toBeGreaterThanOrEqual(2);
      for (const color of tokens.colors.chartPalette) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6,8}$/);
      }
    }
  });

  it("every preset produces a non-empty font scheme", () => {
    for (const preset of allPresets) {
      const tokens = resolveAgentDesignTokens({ theme: preset });
      expect(tokens.typography.titleFontFamily, `${preset} title font`).toBeTruthy();
      expect(tokens.typography.bodyFontFamily, `${preset} body font`).toBeTruthy();
    }
  });
});
