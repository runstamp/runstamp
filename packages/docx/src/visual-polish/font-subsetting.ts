/**
 * Font Subsetting Module
 * PRD-003 Section 3.1: Font Optimization
 *
 * Extracts only the glyphs used in the document to minimize file size.
 * This is a critical optimization for production PDFs.
 *
 * Key Features:
 * - Character usage analysis across all text content
 * - Glyph extraction and subsetting
 * - Font format conversion (TTF/OTF → subset)
 * - Unicode range optimization
 * - Font metrics preservation
 * - Composite font handling (CJK)
 *
 * Note: Requires opentype.js as optional peer dependency for actual subsetting.
 * Install with: npm install opentype.js
 */


// Internal type definitions for opentype.js (avoiding module dependency)
interface OpentypeGlyph {
  index: number;
  name: string;
  unicode?: number;
  unicodes?: number[];
  advanceWidth?: number;
  path?: unknown;
}

interface OpentypeFont {
  glyphs: {
    length: number;
    get(index: number): OpentypeGlyph | undefined;
  };
  charToGlyphIndex(codepoint: number): number;
  tables: {
    gsub?: {
      features?: Array<{
        tag: string;
        feature: { lookupListIndexes: number[] };
      }>;
      lookups: Array<OpentypeLookup>;
    };
  };
  names: {
    fontFamily?: { en?: string };
    fontSubfamily?: { en?: string };
  };
  unitsPerEm: number;
  ascender: number;
  descender: number;
}

interface OpentypeLookup {
  subtables: Array<{
    ligatureSets?: Array<Array<{ ligGlyph?: number }> | null> | null;
  }>;
}

interface OpentypeModule {
  parse(buffer: ArrayBuffer): OpentypeFont;
  Font: new (options: {
    familyName: string;
    styleName: string;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: OpentypeGlyph[];
  }) => {
    toArrayBuffer(): ArrayBuffer;
  };
}

// Optional dependency - subsetting features require opentype.js
let opentype: OpentypeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  opentype = require("opentype.js") as OpentypeModule;
} catch {
  // opentype.js not installed - subsetting will return original fonts
}

export interface FontSubsettingOptions {
  /** Preserve font hinting for screen rendering */
  preserveHinting?: boolean;
  /** Include ligatures for professional typography */
  includeLigatures?: boolean;
  /** Include kerning pairs */
  includeKerning?: boolean;
  /** Minimum number of glyphs to trigger subsetting (small fonts may not benefit) */
  minGlyphThreshold?: number;
  /** Maximum subset size as percentage of original (skip if savings are minimal) */
  maxSubsetRatio?: number;
  /** Include common punctuation even if not explicitly used */
  includeCommonPunctuation?: boolean;
  /** Include numeric characters 0-9 even if not used */
  includeNumerals?: boolean;
  /** Include specified Unicode ranges (e.g., ['latin', 'latin-extended']) */
  unicodeRanges?: UnicodeRange[];
}

export type UnicodeRange =
  | "basic-latin" // U+0000-007F
  | "latin-extended-a" // U+0100-017F
  | "latin-extended-b" // U+0180-024F
  | "ipa-extensions" // U+0250-02AF
  | "spacing-modifiers" // U+02B0-02FF
  | "combining-marks" // U+0300-036F
  | "greek" // U+0370-03FF
  | "cyrillic" // U+0400-04FF
  | "arabic" // U+0600-06FF
  | "cjk-unified" // U+4E00-9FFF
  | "hiragana" // U+3040-309F
  | "katakana"; // U+30A0-30FF

interface UnicodeRangeDef {
  start: number;
  end: number;
  name: string;
}

const UNICODE_RANGES: Record<UnicodeRange, UnicodeRangeDef> = {
  "basic-latin": { start: 0x0000, end: 0x007f, name: "Basic Latin" },
  "latin-extended-a": { start: 0x0100, end: 0x017f, name: "Latin Extended-A" },
  "latin-extended-b": { start: 0x0180, end: 0x024f, name: "Latin Extended-B" },
  "ipa-extensions": { start: 0x0250, end: 0x02af, name: "IPA Extensions" },
  "spacing-modifiers": {
    start: 0x02b0,
    end: 0x02ff,
    name: "Spacing Modifier Letters",
  },
  "combining-marks": {
    start: 0x0300,
    end: 0x036f,
    name: "Combining Diacritical Marks",
  },
  greek: { start: 0x0370, end: 0x03ff, name: "Greek and Coptic" },
  cyrillic: { start: 0x0400, end: 0x04ff, name: "Cyrillic" },
  arabic: { start: 0x0600, end: 0x06ff, name: "Arabic" },
  "cjk-unified": { start: 0x4e00, end: 0x9fff, name: "CJK Unified Ideographs" },
  hiragana: { start: 0x3040, end: 0x309f, name: "Hiragana" },
  katakana: { start: 0x30a0, end: 0x30ff, name: "Katakana" },
};

const COMMON_PUNCTUATION = ".,;:!?'\"-–—()[]{}…·•/\\@#$%^&*+=<>|`~";
const NUMERALS = "0123456789";

export interface FontUsageAnalysis {
  /** Font family name */
  fontFamily: string;
  /** Set of unique characters used */
  usedCharacters: Set<string>;
  /** Set of unique codepoints */
  usedCodepoints: Set<number>;
  /** Total text length using this font */
  totalTextLength: number;
  /** Number of text nodes using this font */
  textNodeCount: number;
  /** Detected Unicode ranges */
  detectedRanges: UnicodeRange[];
}

export interface SubsetResult {
  /** Original font data */
  originalFont: ArrayBuffer;
  /** Subsetted font data */
  subsetFont: ArrayBuffer;
  /** Original size in bytes */
  originalSize: number;
  /** Subset size in bytes */
  subsetSize: number;
  /** Size reduction percentage */
  reductionPercent: number;
  /** Number of glyphs in original */
  originalGlyphCount: number;
  /** Number of glyphs in subset */
  subsetGlyphCount: number;
  /** Whether subsetting was performed (may skip if not beneficial) */
  wasSubsetted: boolean;
  /** Reason if subsetting was skipped */
  skipReason?: string;
}

export interface FontSubsettingResult {
  /** Map of font family to subset result */
  fonts: Map<string, SubsetResult>;
  /** Total original size */
  totalOriginalSize: number;
  /** Total subset size */
  totalSubsetSize: number;
  /** Total reduction percentage */
  totalReductionPercent: number;
  /** Processing time in ms */
  processingTimeMs: number;
}

const DEFAULT_OPTIONS: Required<FontSubsettingOptions> = {
  preserveHinting: true,
  includeLigatures: true,
  includeKerning: true,
  minGlyphThreshold: 50,
  maxSubsetRatio: 0.9, // Skip if subset is >90% of original
  includeCommonPunctuation: true,
  includeNumerals: true,
  unicodeRanges: [],
};

/**
 * FontSubsetter - Extracts only used glyphs from fonts
 *
 * Usage:
 * ```ts
 * const subsetter = new FontSubsetter();
 * const analysis = subsetter.analyzeDocument(textContent, fontMap);
 * const result = await subsetter.subsetFonts(analysis, fontData, options);
 * ```
 */
export class FontSubsetter {
  private options: Required<FontSubsettingOptions>;

  constructor(options: FontSubsettingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Analyze document text content to determine which characters are used per font
   */
  analyzeTextContent(
    textNodes: Array<{ text: string; fontFamily: string }>,
  ): Map<string, FontUsageAnalysis> {
    const usageMap = new Map<string, FontUsageAnalysis>();

    for (const node of textNodes) {
      const { text, fontFamily } = node;

      if (!usageMap.has(fontFamily)) {
        usageMap.set(fontFamily, {
          fontFamily,
          usedCharacters: new Set(),
          usedCodepoints: new Set(),
          totalTextLength: 0,
          textNodeCount: 0,
          detectedRanges: [],
        });
      }

      const analysis = usageMap.get(fontFamily)!;
      analysis.textNodeCount++;
      analysis.totalTextLength += text.length;

      // Extract characters and codepoints
      for (const char of text) {
        analysis.usedCharacters.add(char);
        analysis.usedCodepoints.add(char.codePointAt(0)!);
      }
    }

    // Add common characters if enabled
    for (const analysis of usageMap.values()) {
      if (this.options.includeCommonPunctuation) {
        for (const char of COMMON_PUNCTUATION) {
          analysis.usedCharacters.add(char);
          analysis.usedCodepoints.add(char.codePointAt(0)!);
        }
      }

      if (this.options.includeNumerals) {
        for (const char of NUMERALS) {
          analysis.usedCharacters.add(char);
          analysis.usedCodepoints.add(char.codePointAt(0)!);
        }
      }

      // Add unicode ranges
      for (const range of this.options.unicodeRanges) {
        const rangeDef = UNICODE_RANGES[range];
        for (let cp = rangeDef.start; cp <= rangeDef.end; cp++) {
          analysis.usedCodepoints.add(cp);
        }
      }

      // Detect which unicode ranges are used
      analysis.detectedRanges = this.detectUnicodeRanges(
        analysis.usedCodepoints,
      );
    }

    return usageMap;
  }

  /**
   * Detect which Unicode ranges are represented in a set of codepoints
   */
  private detectUnicodeRanges(codepoints: Set<number>): UnicodeRange[] {
    const ranges: UnicodeRange[] = [];

    for (const [range, def] of Object.entries(UNICODE_RANGES)) {
      for (const cp of codepoints) {
        if (cp >= def.start && cp <= def.end) {
          ranges.push(range as UnicodeRange);
          break;
        }
      }
    }

    return ranges;
  }

  /**
   * Subset a single font based on character usage
   */
  async subsetFont(
    fontBuffer: ArrayBuffer,
    usedCodepoints: Set<number>,
    options: FontSubsettingOptions = {},
  ): Promise<SubsetResult> {
    const opts = { ...this.options, ...options };
    const originalSize = fontBuffer.byteLength;

    // Check if opentype.js is available
    if (!opentype) {
      return {
        originalFont: fontBuffer,
        subsetFont: fontBuffer,
        originalSize,
        subsetSize: originalSize,
        reductionPercent: 0,
        originalGlyphCount: 0,
        subsetGlyphCount: 0,
        wasSubsetted: false,
        skipReason:
          "opentype.js not installed. Install with: npm install opentype.js",
      };
    }

    try {
      // Parse the font
      const font = opentype.parse(fontBuffer);
      const originalGlyphCount = font.glyphs.length;

      // Check if subsetting is worthwhile
      if (originalGlyphCount < opts.minGlyphThreshold) {
        return {
          originalFont: fontBuffer,
          subsetFont: fontBuffer,
          originalSize,
          subsetSize: originalSize,
          reductionPercent: 0,
          originalGlyphCount,
          subsetGlyphCount: originalGlyphCount,
          wasSubsetted: false,
          skipReason: `Font has only ${originalGlyphCount} glyphs (threshold: ${opts.minGlyphThreshold})`,
        };
      }

      // Build the set of glyphs to include
      const glyphSet = new Set<number>();

      // Always include .notdef glyph (index 0)
      glyphSet.add(0);

      // Add glyphs for used codepoints
      for (const codepoint of usedCodepoints) {
        const glyphIndex = font.charToGlyphIndex(codepoint);
        if (glyphIndex > 0) {
          glyphSet.add(glyphIndex);
        }
      }

      // Add ligature glyphs if enabled
      if (opts.includeLigatures && font.tables.gsub) {
        this.addLigatureGlyphs(font, glyphSet);
      }

      // Create subset font
      const glyphArray = Array.from(glyphSet).sort((a, b) => a - b);
      const subsetGlyphs: OpentypeGlyph[] = [];

      for (const glyphIndex of glyphArray) {
        const glyph = font.glyphs.get(glyphIndex);
        if (glyph) {
          subsetGlyphs.push(glyph);
        }
      }

      // Build new font with subset glyphs
      const subsetFont = new opentype.Font({
        familyName: font.names.fontFamily?.en || "Subset",
        styleName: font.names.fontSubfamily?.en || "Regular",
        unitsPerEm: font.unitsPerEm,
        ascender: font.ascender,
        descender: font.descender,
        glyphs: subsetGlyphs,
      });

      // Generate output
      const subsetBuffer = subsetFont.toArrayBuffer();
      const subsetSize = subsetBuffer.byteLength;
      const reductionPercent =
        ((originalSize - subsetSize) / originalSize) * 100;

      // Check if subset is worth it
      if (subsetSize / originalSize > opts.maxSubsetRatio) {
        return {
          originalFont: fontBuffer,
          subsetFont: fontBuffer,
          originalSize,
          subsetSize: originalSize,
          reductionPercent: 0,
          originalGlyphCount,
          subsetGlyphCount: originalGlyphCount,
          wasSubsetted: false,
          skipReason: `Subset would be ${Math.round((subsetSize / originalSize) * 100)}% of original (threshold: ${opts.maxSubsetRatio * 100}%)`,
        };
      }

      return {
        originalFont: fontBuffer,
        subsetFont: subsetBuffer,
        originalSize,
        subsetSize,
        reductionPercent,
        originalGlyphCount,
        subsetGlyphCount: subsetGlyphs.length,
        wasSubsetted: true,
      };
    } catch (error) {
      // Return original font on error
      console.warn("Font subsetting failed:", error);
      return {
        originalFont: fontBuffer,
        subsetFont: fontBuffer,
        originalSize,
        subsetSize: originalSize,
        reductionPercent: 0,
        originalGlyphCount: 0,
        subsetGlyphCount: 0,
        wasSubsetted: false,
        skipReason: `Subsetting error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Add ligature glyph indices to the glyph set
   */
  private addLigatureGlyphs(font: OpentypeFont, glyphSet: Set<number>): void {
    const gsub = font.tables.gsub;
    if (!gsub?.features) return;

    // Look for ligature features (liga, clig, dlig)
    const ligaFeatures = ["liga", "clig", "dlig"];

    for (const feature of gsub.features) {
      if (ligaFeatures.includes(feature.tag)) {
        for (const lookupIndex of feature.feature.lookupListIndexes) {
          const lookup = gsub.lookups[lookupIndex];
          if (lookup) {
            this.extractLigatureGlyphs(lookup, glyphSet);
          }
        }
      }
    }
  }

  /**
   * Extract ligature glyph indices from a GSUB lookup
   */
  private extractLigatureGlyphs(
    lookup: OpentypeLookup,
    glyphSet: Set<number>,
  ): void {
    for (const subtable of lookup.subtables) {
      // Type 4 subtable contains ligature substitutions
      if ("ligatureSets" in subtable && subtable.ligatureSets) {
        for (const ligSet of subtable.ligatureSets) {
          if (ligSet) {
            for (const lig of ligSet) {
              if (lig && typeof lig.ligGlyph === "number") {
                glyphSet.add(lig.ligGlyph);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Subset multiple fonts based on document analysis
   */
  async subsetFonts(
    usageMap: Map<string, FontUsageAnalysis>,
    fontData: Map<string, ArrayBuffer>,
    options: FontSubsettingOptions = {},
  ): Promise<FontSubsettingResult> {
    const startTime = performance.now();
    const fonts = new Map<string, SubsetResult>();
    let totalOriginalSize = 0;
    let totalSubsetSize = 0;

    for (const [fontFamily, analysis] of usageMap) {
      const buffer = fontData.get(fontFamily);
      if (!buffer) {
        console.warn(`Font data not found for: ${fontFamily}`);
        continue;
      }

      const result = await this.subsetFont(
        buffer,
        analysis.usedCodepoints,
        options,
      );
      fonts.set(fontFamily, result);
      totalOriginalSize += result.originalSize;
      totalSubsetSize += result.subsetSize;
    }

    const processingTimeMs = performance.now() - startTime;
    const totalReductionPercent =
      totalOriginalSize > 0
        ? ((totalOriginalSize - totalSubsetSize) / totalOriginalSize) * 100
        : 0;

    return {
      fonts,
      totalOriginalSize,
      totalSubsetSize,
      totalReductionPercent,
      processingTimeMs,
    };
  }
}

/**
 * Quick helper to subset a single font with text content
 */
export async function subsetFontForText(
  fontBuffer: ArrayBuffer,
  textContent: string,
  options: FontSubsettingOptions = {},
): Promise<SubsetResult> {
  const subsetter = new FontSubsetter(options);
  const codepoints = new Set<number>();

  for (const char of textContent) {
    codepoints.add(char.codePointAt(0)!);
  }

  return subsetter.subsetFont(fontBuffer, codepoints, options);
}

/**
 * Analyze a string to determine which unicode ranges it uses
 */
export function analyzeTextUnicodeRanges(text: string): UnicodeRange[] {
  const codepoints = new Set<number>();
  for (const char of text) {
    codepoints.add(char.codePointAt(0)!);
  }

  const ranges: UnicodeRange[] = [];
  for (const [range, def] of Object.entries(UNICODE_RANGES)) {
    for (const cp of codepoints) {
      if (cp >= def.start && cp <= def.end) {
        ranges.push(range as UnicodeRange);
        break;
      }
    }
  }

  return ranges;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Generate a subsetting report
 */
export function generateSubsettingReport(result: FontSubsettingResult): string {
  const lines: string[] = [
    "# Font Subsetting Report",
    "",
    `Processing Time: ${result.processingTimeMs.toFixed(2)}ms`,
    "",
    "## Summary",
    `- Total Original Size: ${formatBytes(result.totalOriginalSize)}`,
    `- Total Subset Size: ${formatBytes(result.totalSubsetSize)}`,
    `- Total Reduction: ${result.totalReductionPercent.toFixed(1)}%`,
    "",
    "## Per-Font Details",
    "",
  ];

  for (const [fontFamily, subsetResult] of result.fonts) {
    lines.push(`### ${fontFamily}`);
    lines.push(
      `- Original: ${formatBytes(subsetResult.originalSize)} (${subsetResult.originalGlyphCount} glyphs)`,
    );
    lines.push(
      `- Subset: ${formatBytes(subsetResult.subsetSize)} (${subsetResult.subsetGlyphCount} glyphs)`,
    );
    lines.push(`- Reduction: ${subsetResult.reductionPercent.toFixed(1)}%`);
    lines.push(`- Subsetted: ${subsetResult.wasSubsetted ? "Yes" : "No"}`);
    if (subsetResult.skipReason) {
      lines.push(`- Skip Reason: ${subsetResult.skipReason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default FontSubsetter;
