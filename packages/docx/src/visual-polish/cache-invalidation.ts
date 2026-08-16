/**
 * Height Cache Invalidation (Doc 1, Section 5)
 * ============================================
 *
 * Implements smart cache invalidation based on layout-impacting tokens.
 *
 * Doc 1: "The engine generates a Layout-Impacting Hash based only on
 * tokens that affect height (Spacing, Typography)."
 *
 * - Color changes = Fast Pass (reuse cached heights)
 * - Typography/Spacing changes = Safe Pass (re-measure everything)
 */

import {
  Theme,
  ThemeTokens,
  TokenCategory,
  LayoutImpact,
  CacheInvalidation,
} from "./types";
import { designTokenManager } from "./design-tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Tokens that affect layout (require re-measurement) */
const LAYOUT_IMPACTING_TOKENS: Set<string> = new Set([
  // Spacing
  "grid-base",
  "container-padding",
  "table-cell-y",
  "table-cell-x",
  "section-gap",
  "paragraph-gap",
  "spacing-xs",
  "spacing-sm",
  "spacing-md",
  "spacing-lg",

  // Typography
  "font-heading",
  "font-body",
  "font-mono",
  "scale-ratio",
  "base-size",
  "line-height",
  "letter-spacing",
  "heading-line-height",
  "font-weight-normal",
  "font-weight-bold",

  // Geometry (borders can affect layout)
  "border-width",
]);

/** Tokens that don't affect layout (visual only) */
const NON_LAYOUT_TOKENS: Set<string> = new Set([
  // Colors
  "brand-primary",
  "brand-secondary",
  "text-main",
  "text-muted",
  "bg-surface",
  "bg-surface-alt",
  "accent",
  "semantic-success",
  "semantic-warning",
  "semantic-error",
  "chart-sequence",
  "table-border",
  "table-header-bg",
  "table-stripe",

  // Geometry (visual only)
  "radius-sm",
  "radius-md",
  "radius-lg",
]);

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Generate a simple hash from a string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Generate deterministic hash from layout-impacting tokens only
 */
function generateLayoutHash(tokens: ThemeTokens): string {
  const layoutValues: string[] = [];

  // Extract spacing tokens
  for (const [key, value] of Object.entries(tokens.spacing)) {
    if (LAYOUT_IMPACTING_TOKENS.has(key)) {
      layoutValues.push(`${key}:${value}`);
    }
  }

  // Extract typography tokens
  for (const [key, value] of Object.entries(tokens.typography)) {
    if (LAYOUT_IMPACTING_TOKENS.has(key)) {
      layoutValues.push(`${key}:${JSON.stringify(value)}`);
    }
  }

  // Extract geometry tokens
  if (tokens.geometry) {
    for (const [key, value] of Object.entries(tokens.geometry)) {
      if (LAYOUT_IMPACTING_TOKENS.has(key)) {
        layoutValues.push(`${key}:${value}`);
      }
    }
  }

  // Sort for determinism
  layoutValues.sort();

  return hashString(layoutValues.join("|"));
}

// =============================================================================
// CACHE INVALIDATION MANAGER
// =============================================================================

/**
 * HeightCacheInvalidator - Determines when to invalidate cached measurements
 */
export class HeightCacheInvalidator {
  private previousTheme: Theme | null = null;
  private previousLayoutHash: string | null = null;
  private heightCache: Map<string, number> = new Map();

  constructor() {
    // Initialize with current theme
    const theme = designTokenManager.getTheme();
    this.previousTheme = JSON.parse(JSON.stringify(theme));
    this.previousLayoutHash = generateLayoutHash(theme.tokens);
  }

  /**
   * Check if cache should be invalidated based on theme change
   */
  checkInvalidation(newTheme: Theme): CacheInvalidation {
    const newLayoutHash = generateLayoutHash(newTheme.tokens);
    const changedCategories = this.getChangedCategories(newTheme);

    // Check if any layout-impacting tokens changed
    const layoutChanged = this.previousLayoutHash !== newLayoutHash;

    // Determine impact level
    let impact: LayoutImpact;
    if (!layoutChanged && changedCategories.length === 0) {
      impact = "none";
    } else if (layoutChanged) {
      impact = "full";
    } else {
      impact = "partial";
    }

    const result: CacheInvalidation = {
      shouldClear: layoutChanged,
      impact,
      changedCategories,
      layoutHash: newLayoutHash,
      previousHash: this.previousLayoutHash || undefined,
    };

    // Update state
    this.previousTheme = JSON.parse(JSON.stringify(newTheme));
    this.previousLayoutHash = newLayoutHash;

    // Clear cache if needed
    if (result.shouldClear) {
      this.clearCache();
    }

    return result;
  }

  /**
   * Get categories that changed between themes
   */
  private getChangedCategories(newTheme: Theme): TokenCategory[] {
    if (!this.previousTheme) {
      return ["color", "spacing", "typography", "geometry"];
    }

    const categories = new Set<TokenCategory>();

    // Check color changes
    const oldColors = JSON.stringify(this.previousTheme.tokens.colors);
    const newColors = JSON.stringify(newTheme.tokens.colors);
    if (oldColors !== newColors) {
      categories.add("color");
    }

    // Check spacing changes
    const oldSpacing = JSON.stringify(this.previousTheme.tokens.spacing);
    const newSpacing = JSON.stringify(newTheme.tokens.spacing);
    if (oldSpacing !== newSpacing) {
      categories.add("spacing");
    }

    // Check typography changes
    const oldTypo = JSON.stringify(this.previousTheme.tokens.typography);
    const newTypo = JSON.stringify(newTheme.tokens.typography);
    if (oldTypo !== newTypo) {
      categories.add("typography");
    }

    // Check geometry changes
    const oldGeom = JSON.stringify(this.previousTheme.tokens.geometry);
    const newGeom = JSON.stringify(newTheme.tokens.geometry);
    if (oldGeom !== newGeom) {
      categories.add("geometry");
    }

    return Array.from(categories);
  }

  /**
   * Store height in cache
   */
  setHeight(key: string, height: number): void {
    this.heightCache.set(key, height);
  }

  /**
   * Get height from cache
   */
  getHeight(key: string): number | undefined {
    return this.heightCache.get(key);
  }

  /**
   * Check if height is cached
   */
  hasHeight(key: string): boolean {
    return this.heightCache.has(key);
  }

  /**
   * Clear the height cache
   */
  clearCache(): void {
    this.heightCache.clear();
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.heightCache.size;
  }

  /**
   * Get current layout hash
   */
  getCurrentLayoutHash(): string {
    return this.previousLayoutHash || "";
  }

  /**
   * Check if a specific token change would require re-measurement
   */
  isLayoutImpacting(tokenKey: string): boolean {
    return LAYOUT_IMPACTING_TOKENS.has(tokenKey);
  }

  /**
   * Perform a "Fast Pass" - color-only changes
   *
   * Doc 1: "If you change a Color token, the Paginator re-uses
   * the cached heights (Fast Pass)."
   */
  fastPass(colorChanges: Partial<Record<string, string>>): boolean {
    // Verify all changes are non-layout-impacting
    for (const key of Object.keys(colorChanges)) {
      if (this.isLayoutImpacting(key)) {
        return false; // Cannot do fast pass
      }
    }
    return true; // Fast pass is valid
  }

  /**
   * Perform a "Safe Pass" - typography/spacing changes
   *
   * Doc 1: "If you change a Typography or Spacing token, the Paginator
   * clears the cache and re-measures (Safe Pass)."
   */
  safePass(): void {
    this.clearCache();
  }

  /**
   * Get detailed cache statistics
   */
  getStats(): {
    cacheSize: number;
    layoutHash: string;
    layoutTokenCount: number;
    nonLayoutTokenCount: number;
  } {
    return {
      cacheSize: this.heightCache.size,
      layoutHash: this.previousLayoutHash || "",
      layoutTokenCount: LAYOUT_IMPACTING_TOKENS.size,
      nonLayoutTokenCount: NON_LAYOUT_TOKENS.size,
    };
  }
}

// =============================================================================
// THEME CHANGE DETECTOR
// =============================================================================

/**
 * ThemeChangeDetector - Detects and categorizes theme changes
 */
export class ThemeChangeDetector {
  private invalidator: HeightCacheInvalidator;

  constructor(invalidator?: HeightCacheInvalidator) {
    this.invalidator = invalidator || new HeightCacheInvalidator();
  }

  /**
   * Analyze a theme change
   */
  analyze(
    oldTheme: Theme,
    newTheme: Theme,
  ): {
    isLayoutChange: boolean;
    isColorChange: boolean;
    changedTokens: {
      key: string;
      category: TokenCategory;
      old: any;
      new: any;
    }[];
    recommendation: "fast-pass" | "safe-pass" | "no-change";
  } {
    const changedTokens: {
      key: string;
      category: TokenCategory;
      old: any;
      new: any;
    }[] = [];
    let isLayoutChange = false;
    let isColorChange = false;

    // Compare colors
    this.compareTokens(
      oldTheme.tokens.colors,
      newTheme.tokens.colors,
      "color",
      changedTokens,
    );

    // Compare spacing
    this.compareTokens(
      oldTheme.tokens.spacing,
      newTheme.tokens.spacing,
      "spacing",
      changedTokens,
    );

    // Compare typography
    this.compareTokens(
      oldTheme.tokens.typography,
      newTheme.tokens.typography,
      "typography",
      changedTokens,
    );

    // Compare geometry
    if (oldTheme.tokens.geometry && newTheme.tokens.geometry) {
      this.compareTokens(
        oldTheme.tokens.geometry,
        newTheme.tokens.geometry,
        "geometry",
        changedTokens,
      );
    }

    // Categorize changes
    for (const change of changedTokens) {
      if (this.invalidator.isLayoutImpacting(change.key)) {
        isLayoutChange = true;
      }
      if (change.category === "color") {
        isColorChange = true;
      }
    }

    // Determine recommendation
    let recommendation: "fast-pass" | "safe-pass" | "no-change";
    if (changedTokens.length === 0) {
      recommendation = "no-change";
    } else if (isLayoutChange) {
      recommendation = "safe-pass";
    } else {
      recommendation = "fast-pass";
    }

    return {
      isLayoutChange,
      isColorChange,
      changedTokens,
      recommendation,
    };
  }

  /**
   * Compare token objects and record changes
   */
  private compareTokens(
    oldTokens: Record<string, any>,
    newTokens: Record<string, any>,
    category: TokenCategory,
    changes: { key: string; category: TokenCategory; old: any; new: any }[],
  ): void {
    const allKeys = new Set([
      ...Object.keys(oldTokens),
      ...Object.keys(newTokens),
    ]);

    for (const key of allKeys) {
      const oldValue = oldTokens[key];
      const newValue = newTokens[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ key, category, old: oldValue, new: newValue });
      }
    }
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default height cache invalidator */
export const heightCacheInvalidator = new HeightCacheInvalidator();

/** Default theme change detector */
export const themeChangeDetector = new ThemeChangeDetector(
  heightCacheInvalidator,
);
