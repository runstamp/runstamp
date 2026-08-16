/**
 * Vector Shadow Physics (Doc 2, Section 2)
 * ========================================
 *
 * Implements SVG filter-based shadows that render as true vectors,
 * avoiding the blurry rasterization of CSS box-shadow.
 *
 * Doc 2: "The engine intercepts component shadows and translates them
 * into SVG <filter> definitions using feGaussianBlur and feOffset."
 */

import { ShadowConfig, ShadowFilter } from "./types";
import { hexToRgb } from "./design-tokens";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default shadow configuration */
export const DEFAULT_SHADOW: ShadowConfig = {
  offsetX: 0,
  offsetY: 2,
  blur: 4,
  spread: 0,
  color: "#000000",
  opacity: 0.15,
  inset: false,
};

/** Shadow presets for common use cases */
export const SHADOW_PRESETS = {
  /** Subtle elevation shadow */
  sm: {
    offsetX: 0,
    offsetY: 1,
    blur: 2,
    spread: 0,
    color: "#000000",
    opacity: 0.1,
    inset: false,
  } as ShadowConfig,

  /** Standard card shadow */
  md: {
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
    color: "#000000",
    opacity: 0.15,
    inset: false,
  } as ShadowConfig,

  /** Elevated shadow */
  lg: {
    offsetX: 0,
    offsetY: 8,
    blur: 16,
    spread: 0,
    color: "#000000",
    opacity: 0.2,
    inset: false,
  } as ShadowConfig,

  /** Floating shadow */
  xl: {
    offsetX: 0,
    offsetY: 16,
    blur: 32,
    spread: 0,
    color: "#000000",
    opacity: 0.25,
    inset: false,
  } as ShadowConfig,

  /** Inner shadow (inset) */
  inset: {
    offsetX: 0,
    offsetY: 2,
    blur: 4,
    spread: 0,
    color: "#000000",
    opacity: 0.1,
    inset: true,
  } as ShadowConfig,
};

// =============================================================================
// SHADOW FILTER GENERATOR
// =============================================================================

let shadowFilterCounter = 0;

/**
 * ShadowFilterGenerator - Creates SVG filters for premium shadows
 *
 * Doc 2: "The 'Shadow Scale' Constant - To prevent shadows from looking
 * different at various page sizes, the engine calculates the 'Shadow Spread'
 * as a percentage of the Layout Base Units (LBU)."
 */
export class ShadowFilterGenerator {
  private filterCache: Map<string, ShadowFilter> = new Map();

  /**
   * Generate a unique filter ID
   */
  private generateFilterId(): string {
    return `shadow-filter-${++shadowFilterCounter}`;
  }

  /**
   * Generate a cache key for a shadow config
   */
  private getCacheKey(config: ShadowConfig): string {
    return JSON.stringify(config);
  }

  /**
   * Generate SVG filter for a shadow
   *
   * Doc 2: "feGaussianBlur and feOffset" with "color-interpolation-filters='sRGB'"
   * to prevent the "grey-block" artifact.
   */
  generateShadowFilter(config: ShadowConfig = DEFAULT_SHADOW): ShadowFilter {
    const cacheKey = this.getCacheKey(config);

    if (this.filterCache.has(cacheKey)) {
      return this.filterCache.get(cacheKey)!;
    }

    const filterId = this.generateFilterId();
    const rgb = hexToRgb(config.color);

    // Calculate filter region (must be large enough to contain the shadow)
    const filterExtent =
      Math.max(
        Math.abs(config.offsetX) + config.blur + config.spread,
        Math.abs(config.offsetY) + config.blur + config.spread,
      ) * 2;

    const filterPadding = filterExtent / 100; // As percentage

    // Doc 2: "color-interpolation-filters='sRGB'" prevents grey-block artifacts
    const filterDef = `
<filter id="${filterId}" 
        x="${-filterPadding * 100}%" y="${-filterPadding * 100}%" 
        width="${(1 + filterPadding * 2) * 100}%" height="${(1 + filterPadding * 2) * 100}%"
        color-interpolation-filters="sRGB">
  ${config.inset ? this.generateInsetShadowElements(config, rgb) : this.generateDropShadowElements(config, rgb)}
</filter>`.trim();

    const filter: ShadowFilter = {
      filterId,
      filterDef,
      cssFilter: `url(#${filterId})`,
    };

    this.filterCache.set(cacheKey, filter);
    return filter;
  }

  /**
   * Generate filter elements for drop shadow
   */
  private generateDropShadowElements(
    config: ShadowConfig,
    rgb: { r: number; g: number; b: number },
  ): string {
    return `
  <!-- Shadow offset -->
  <feOffset in="SourceAlpha" dx="${config.offsetX}" dy="${config.offsetY}" result="offsetShadow"/>
  
  <!-- Gaussian blur for soft shadow -->
  <feGaussianBlur in="offsetShadow" stdDeviation="${config.blur / 2}" result="blurShadow"/>
  
  ${
    config.spread > 0
      ? `
  <!-- Spread/dilate the shadow -->
  <feMorphology in="blurShadow" operator="dilate" radius="${config.spread}" result="spreadShadow"/>
  `
      : "<!-- No spread -->"
  }
  
  <!-- Apply shadow color -->
  <feFlood flood-color="rgb(${rgb.r}, ${rgb.g}, ${rgb.b})" flood-opacity="${config.opacity}" result="shadowColor"/>
  
  <!-- Composite color with blur -->
  <feComposite in="shadowColor" in2="${config.spread > 0 ? "spreadShadow" : "blurShadow"}" operator="in" result="coloredShadow"/>
  
  <!-- Merge shadow with source graphic -->
  <feMerge>
    <feMergeNode in="coloredShadow"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>`.trim();
  }

  /**
   * Generate filter elements for inset shadow
   */
  private generateInsetShadowElements(
    config: ShadowConfig,
    rgb: { r: number; g: number; b: number },
  ): string {
    return `
  <!-- Inset shadow: invert the alpha -->
  <feOffset in="SourceAlpha" dx="${config.offsetX}" dy="${config.offsetY}" result="offsetShadow"/>
  <feGaussianBlur in="offsetShadow" stdDeviation="${config.blur / 2}" result="blurShadow"/>
  
  <!-- Create inverse mask -->
  <feComposite in="blurShadow" in2="SourceAlpha" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="invertedShadow"/>
  
  <!-- Apply color -->
  <feFlood flood-color="rgb(${rgb.r}, ${rgb.g}, ${rgb.b})" flood-opacity="${config.opacity}" result="shadowColor"/>
  <feComposite in="shadowColor" in2="invertedShadow" operator="in" result="coloredShadow"/>
  
  <!-- Clip to source bounds -->
  <feComposite in="coloredShadow" in2="SourceAlpha" operator="in" result="clippedShadow"/>
  
  <!-- Merge with source -->
  <feMerge>
    <feMergeNode in="SourceGraphic"/>
    <feMergeNode in="clippedShadow"/>
  </feMerge>`.trim();
  }

  /**
   * Generate multiple shadow filters for layered effect
   */
  generateMultiShadowFilter(configs: ShadowConfig[]): ShadowFilter {
    if (configs.length === 0) {
      return this.generateShadowFilter(DEFAULT_SHADOW);
    }

    if (configs.length === 1) {
      return this.generateShadowFilter(configs[0]);
    }

    const filterId = this.generateFilterId();

    // Calculate total filter extent
    let maxExtent = 0;
    for (const config of configs) {
      const extent = Math.max(
        Math.abs(config.offsetX) + config.blur + config.spread,
        Math.abs(config.offsetY) + config.blur + config.spread,
      );
      maxExtent = Math.max(maxExtent, extent);
    }

    const filterPadding = (maxExtent * 2) / 100;

    // Generate individual shadow elements
    const shadowElements = configs
      .map((config, index) => {
        const rgb = hexToRgb(config.color);
        const resultName = `shadow${index}`;

        return `
  <!-- Shadow ${index + 1} -->
  <feOffset in="SourceAlpha" dx="${config.offsetX}" dy="${config.offsetY}" result="${resultName}Offset"/>
  <feGaussianBlur in="${resultName}Offset" stdDeviation="${config.blur / 2}" result="${resultName}Blur"/>
  <feFlood flood-color="rgb(${rgb.r}, ${rgb.g}, ${rgb.b})" flood-opacity="${config.opacity}" result="${resultName}Color"/>
  <feComposite in="${resultName}Color" in2="${resultName}Blur" operator="in" result="${resultName}"/>`;
      })
      .join("\n");

    // Create merge nodes
    const mergeNodes = configs
      .map((_, index) => `    <feMergeNode in="shadow${index}"/>`)
      .join("\n");

    const filterDef = `
<filter id="${filterId}" 
        x="${-filterPadding * 100}%" y="${-filterPadding * 100}%" 
        width="${(1 + filterPadding * 2) * 100}%" height="${(1 + filterPadding * 2) * 100}%"
        color-interpolation-filters="sRGB">
${shadowElements}
  
  <!-- Merge all shadows with source -->
  <feMerge>
${mergeNodes}
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`.trim();

    return {
      filterId,
      filterDef,
      cssFilter: `url(#${filterId})`,
    };
  }

  /**
   * Generate CSS box-shadow equivalent for fallback
   */
  generateCSSFallback(config: ShadowConfig): string {
    const rgb = hexToRgb(config.color);
    const inset = config.inset ? "inset " : "";
    return `${inset}${config.offsetX}pt ${config.offsetY}pt ${config.blur}pt ${config.spread}pt rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${config.opacity})`;
  }

  /**
   * Generate SVG defs section with all cached filters
   */
  generateDefsSection(): string {
    const filters = Array.from(this.filterCache.values());
    if (filters.length === 0) {
      return "";
    }

    return `<defs>\n${filters.map((f) => f.filterDef).join("\n")}\n</defs>`;
  }

  /**
   * Clear the filter cache
   */
  clearCache(): void {
    this.filterCache.clear();
    shadowFilterCounter = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; filters: string[] } {
    return {
      size: this.filterCache.size,
      filters: Array.from(this.filterCache.keys()),
    };
  }
}

// =============================================================================
// SHADOW APPLICATOR
// =============================================================================

/**
 * ShadowApplicator - Applies shadows to SVG elements
 */
export class ShadowApplicator {
  private generator: ShadowFilterGenerator;
  private collectedFilters: ShadowFilter[] = [];

  constructor(generator?: ShadowFilterGenerator) {
    this.generator = generator || new ShadowFilterGenerator();
  }

  /**
   * Apply shadow to an SVG element string
   */
  applyShadow(
    svgElement: string,
    config: ShadowConfig = DEFAULT_SHADOW,
  ): {
    element: string;
    filter: ShadowFilter;
  } {
    const filter = this.generator.generateShadowFilter(config);
    this.collectedFilters.push(filter);

    // Add filter attribute to element
    const elementWithFilter = svgElement.replace(
      /^<(\w+)/,
      `<$1 filter="${filter.cssFilter}"`,
    );

    return {
      element: elementWithFilter,
      filter,
    };
  }

  /**
   * Generate a shadowed rect element
   */
  generateShadowedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    config: ShadowConfig = DEFAULT_SHADOW,
    additionalAttrs: Record<string, string> = {},
  ): { rect: string; filter: ShadowFilter } {
    const filter = this.generator.generateShadowFilter(config);
    this.collectedFilters.push(filter);

    const attrs = Object.entries(additionalAttrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");

    const rect = `<rect x="${x}" y="${y}" width="${width}" height="${height}" filter="${filter.cssFilter}" ${attrs}/>`;

    return { rect, filter };
  }

  /**
   * Get all filter definitions needed for collected shadows
   */
  getFilterDefs(): string {
    if (this.collectedFilters.length === 0) {
      return "";
    }

    const uniqueFilters = new Map<string, ShadowFilter>();
    for (const filter of this.collectedFilters) {
      uniqueFilters.set(filter.filterId, filter);
    }

    return `<defs>\n${Array.from(uniqueFilters.values())
      .map((f) => f.filterDef)
      .join("\n")}\n</defs>`;
  }

  /**
   * Reset collected filters
   */
  reset(): void {
    this.collectedFilters = [];
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

/** Default shadow filter generator */
export const shadowFilterGenerator = new ShadowFilterGenerator();

/** Default shadow applicator */
export const shadowApplicator = new ShadowApplicator(shadowFilterGenerator);
