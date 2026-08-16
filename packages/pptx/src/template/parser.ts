// src/template/parser.ts — Template unzip and indexing

import { posix as posixPath } from "node:path";
import JSZip from "jszip";
import { parseThemeXml, type ThemeData } from "./themeResolver.js";
import { ooxmlParser, asArray } from "./xmlParser.js";
import { MAX_TEMPLATE_UNCOMPRESSED_BYTES, DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } from "../ooxml/constants.js";
import { getLogger } from "../logger.js";
import { PIXEL_TO_EMU } from "../ooxml/drawing/math.js";

export interface PlaceholderTextStyle {
  fontFamily?: string;
  fontFamilyEa?: string;  // East Asian font override (for CJK text)
  fontSize?: number;      // in hundredths of a point (OOXML)
  lineSpacing?: number;   // in hundredths of a point
  bold?: boolean;
  italic?: boolean;
  color?: string;         // resolved hex
  bulletChar?: string;
}

export interface PlaceholderInfo {
  idx?: string;
  type?: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  textStyle?: PlaceholderTextStyle;
}

export interface MasterTextStyles {
  titleStyle?: PlaceholderTextStyle;
  bodyStyle?: PlaceholderTextStyle;
  otherStyle?: PlaceholderTextStyle;
}

export interface SlideMasterInfo {
  xml: string;
  rels: string;
  textStyles: MasterTextStyles;
  /** Index into the TemplateIndex.themes array (0-based). */
  themeIndex: number;
}

export interface LayoutInfo {
  name: string;
  xml: string;
  rels: string;
  placeholders: PlaceholderInfo[];
  /** Index into TemplateIndex.slideMasters (0-based). */
  masterIndex: number;
}

export interface TemplateIndex {
  contentTypesXml: string;
  /** Primary theme (first master's theme). Backward-compat alias for themes[0].data. */
  theme: ThemeData;
  /** Primary theme XML. Backward-compat alias for themes[0].xml. */
  themeXml: string;
  /** Primary slide master XML. Backward-compat alias for slideMasters[0].xml. */
  slideMasterXml: string;
  /** Primary slide master rels. Backward-compat alias for slideMasters[0].rels. */
  slideMasterRels: string;
  layouts: LayoutInfo[];
  /** Primary master text styles. Backward-compat alias for slideMasters[0].textStyles. */
  masterTextStyles: MasterTextStyles;
  globalRels: string;
  presentationXml: string;
  presentationRels: string;
  /** Slide width in pixels, parsed from template's presentation.xml <p:sldSz>. Defaults to 960. */
  slideWidth: number;
  /** Slide height in pixels, parsed from template's presentation.xml <p:sldSz>. Defaults to 540. */
  slideHeight: number;
  zip: JSZip;
  /** All slide masters in the template (ordered by file index). */
  slideMasters: SlideMasterInfo[];
  /** All themes in the template (ordered by file index). */
  themes: Array<{ data: ThemeData; xml: string }>;
}

/**
 * Parses a PPTX template buffer and extracts its structural index.
 */
export async function parseTemplate(buffer: Buffer): Promise<TemplateIndex> {
  const zip = await JSZip.loadAsync(buffer);

  // Security: reject ZIP bombs by decompressing each entry and summing sizes.
  // This approach works across all JSZip versions (no private API access).
  let totalDecompressedSize = 0;
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    const content = await file.async("nodebuffer");
    totalDecompressedSize += content.length;
    if (totalDecompressedSize > MAX_TEMPLATE_UNCOMPRESSED_BYTES) {
      throw new Error(
        `Template ZIP exceeds maximum decompressed size (${(MAX_TEMPLATE_UNCOMPRESSED_BYTES / 1024 / 1024).toFixed(0)} MB)`,
      );
    }
  }

  // Content types
  const contentTypesXml = await readZipFile(zip, "[Content_Types].xml");

  // Global rels
  const globalRels = await readZipFile(zip, "_rels/.rels");

  // Presentation
  const presentationXml = await readZipFile(zip, "ppt/presentation.xml");
  const presentationRels = await readZipFileOrDefault(zip, "ppt/_rels/presentation.xml.rels", "");

  // Parse slide dimensions from presentation.xml
  const { slideWidth, slideHeight } = parseSlideDimensions(presentationXml);

  // ---- Multi-theme support ----
  const themeFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/theme\/theme\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/theme(\d+)/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/theme(\d+)/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  const themes: Array<{ data: ThemeData; xml: string; path: string }> = [];
  for (const themeFile of themeFiles) {
    const xml = await readZipFile(zip, themeFile);
    themes.push({ data: parseThemeXml(xml), xml, path: themeFile });
  }
  // Fallback: if no theme files matched the pattern, try the canonical path
  if (themes.length === 0) {
    const xml = await readZipFile(zip, "ppt/theme/theme1.xml");
    themes.push({ data: parseThemeXml(xml), xml, path: "ppt/theme/theme1.xml" });
  }

  // ---- Multi-master support ----
  const masterFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slideMaster(\d+)/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slideMaster(\d+)/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  // Map from layout ZIP path → master index (built from master rels)
  const layoutToMasterIndex = new Map<string, number>();
  const slideMasters: SlideMasterInfo[] = [];

  for (let mi = 0; mi < masterFiles.length; mi++) {
    const masterFile = masterFiles[mi];
    const masterXml = await readZipFile(zip, masterFile);
    const baseName = masterFile.split("/").pop()!;
    const relsPath = `ppt/slideMasters/_rels/${baseName}.rels`;
    const masterRels = await readZipFileOrDefault(zip, relsPath, "");

    // Find associated theme via rels
    const themeTarget = extractRelTarget(masterRels, "theme");
    let themeIndex = 0;
    if (themeTarget) {
      const resolvedThemePath = posixPath.normalize(posixPath.join("ppt/slideMasters/", themeTarget));
      const idx = themes.findIndex(t => t.path === resolvedThemePath);
      if (idx !== -1) {
        themeIndex = idx;
      } else {
        getLogger().warn(
          `[template/parser] Master ${masterFile} references theme "${resolvedThemePath}" which was not found in parsed themes. Falling back to theme[0].`,
        );
      }
    }

    // Find owned layouts via rels
    const layoutTargets = extractRelTargets(masterRels, "slideLayout");
    for (const target of layoutTargets) {
      const resolvedPath = posixPath.normalize(posixPath.join("ppt/slideMasters/", target));
      layoutToMasterIndex.set(resolvedPath, mi);
    }

    const textStyles = extractMasterTextStyles(masterXml);

    slideMasters.push({ xml: masterXml, rels: masterRels, textStyles, themeIndex });
  }

  // Fallback: if no masters found via pattern, read the canonical path
  if (slideMasters.length === 0) {
    const canonicalMaster = "ppt/slideMasters/slideMaster1.xml";
    const file = zip.file(canonicalMaster);
    if (!file) {
      throw new Error(
        "[template/parser] No slide masters found in template. " +
        "Expected files matching ppt/slideMasters/slideMaster*.xml, but none were present. " +
        "Ensure the provided buffer is a valid .pptx file with at least one slide master.",
      );
    }
    const masterXml = await file.async("string");
    const masterRels = await readZipFileOrDefault(zip, "ppt/slideMasters/_rels/slideMaster1.xml.rels", "");
    slideMasters.push({ xml: masterXml, rels: masterRels, textStyles: extractMasterTextStyles(masterXml), themeIndex: 0 });
  }

  // ---- Slide layouts (with master association) ----
  const layouts: LayoutInfo[] = [];
  const layoutFiles = Object.keys(zip.files).filter(
    (f) => f.startsWith("ppt/slideLayouts/slideLayout") && f.endsWith(".xml") && !f.includes("_rels"),
  );

  for (const layoutFile of layoutFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slideLayout(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.match(/slideLayout(\d+)/)?.[1] ?? "0", 10);
    return numA - numB;
  })) {
    const layoutXml = await readZipFile(zip, layoutFile);
    const parsed = ooxmlParser.parse(layoutXml);

    // Extract layout name from parsed <p:sldLayout><p:cSld name="...">
    const cSld = parsed?.["p:sldLayout"]?.["p:cSld"];
    const name: string = cSld?.["@_name"] ?? "";

    // Extract rels file
    const baseName = layoutFile.split("/").pop()!;
    const relsPath = `ppt/slideLayouts/_rels/${baseName}.rels`;
    const rels = await readZipFileOrDefault(zip, relsPath, "");

    // Extract placeholders from parsed tree
    const placeholders = extractPlaceholdersFromParsed(parsed);

    // Determine parent master index
    const masterIndex = layoutToMasterIndex.get(layoutFile) ?? 0;

    layouts.push({ name, xml: layoutXml, rels, placeholders, masterIndex });
  }

  // Backward-compat singular fields (first master/theme)
  const theme = themes[0].data;
  const themeXml = themes[0].xml;
  const slideMasterXml = slideMasters[0].xml;
  const slideMasterRels = slideMasters[0].rels;
  const masterTextStyles = slideMasters[0].textStyles;

  return {
    contentTypesXml,
    theme,
    themeXml,
    slideMasterXml,
    slideMasterRels,
    layouts,
    masterTextStyles,
    globalRels,
    presentationXml,
    presentationRels,
    slideWidth,
    slideHeight,
    zip,
    slideMasters,
    themes: themes.map(t => ({ data: t.data, xml: t.xml })),
  };
}

// Use shared constants from ooxml/constants.ts (imported above)

/**
 * Parses slide dimensions from the template's presentation.xml.
 * Looks for `<p:sldSz cx="..." cy="..."/>` and converts EMU to pixels.
 * Falls back to 960×540 (10"×7.5" at 96 DPI) if not found or unparseable.
 */
function parseSlideDimensions(presentationXml: string): { slideWidth: number; slideHeight: number } {
  try {
    const parsed = ooxmlParser.parse(presentationXml);
    const sldSz = parsed?.["p:presentation"]?.["p:sldSz"];
    if (sldSz) {
      const cxStr = sldSz["@_cx"];
      const cyStr = sldSz["@_cy"];
      if (cxStr && cyStr) {
        const cx = parseInt(cxStr, 10);
        const cy = parseInt(cyStr, 10);
        if (Number.isFinite(cx) && Number.isFinite(cy) && cx > 0 && cy > 0) {
          return {
            slideWidth: Math.round(cx / PIXEL_TO_EMU),
            slideHeight: Math.round(cy / PIXEL_TO_EMU),
          };
        }
      }
    }
  } catch {
    // Fall through to defaults
  }
  return { slideWidth: DEFAULT_SLIDE_WIDTH_PX, slideHeight: DEFAULT_SLIDE_HEIGHT_PX };
}

function extractPlaceholdersFromParsed(parsed: any): PlaceholderInfo[] {
  const placeholders: PlaceholderInfo[] = [];

  // Navigate: p:sldLayout > p:cSld > p:spTree > p:sp
  const spTree = parsed?.["p:sldLayout"]?.["p:cSld"]?.["p:spTree"];
  if (!spTree) return placeholders;

  const shapes = asArray(spTree["p:sp"]);
  for (const sp of shapes) {
    // Check for placeholder: p:nvSpPr > p:nvPr > p:ph
    const nvPr = sp?.["p:nvSpPr"]?.["p:nvPr"];
    const ph = nvPr?.["p:ph"];
    if (!ph) continue;

    const idx: string | undefined = ph["@_idx"];
    const type: string | undefined = ph["@_type"];

    // Extract transform: p:spPr > a:xfrm > a:off/a:ext
    const xfrm = sp?.["p:spPr"]?.["a:xfrm"];
    const off = xfrm?.["a:off"];
    const ext = xfrm?.["a:ext"];

    // Extract text style from parsed shape
    const textStyle = extractTextStyleFromParsedShape(sp);

    placeholders.push({
      idx,
      type,
      x: parseInt(off?.["@_x"] ?? "0", 10),
      y: parseInt(off?.["@_y"] ?? "0", 10),
      cx: parseInt(ext?.["@_cx"] ?? "0", 10),
      cy: parseInt(ext?.["@_cy"] ?? "0", 10),
      textStyle: textStyle ?? undefined,
    });
  }

  return placeholders;
}

/**
 * Extracts PlaceholderTextStyle from a parsed shape's <p:txBody> > <a:lstStyle> or <a:defRPr>.
 */
function extractTextStyleFromParsedShape(sp: any): PlaceholderTextStyle | null {
  // Look in p:txBody for list style or direct paragraph properties
  const txBody = sp?.["p:txBody"];
  if (!txBody) return null;

  // Try lstStyle > a:lvl1pPr first
  const lstStyle = txBody?.["a:lstStyle"];
  if (lstStyle) {
    const result = extractTextStyleFromParsedLstStyle(lstStyle);
    if (result) return result;
  }

  // Fallback: look at first paragraph's defRPr
  const paragraphs = asArray(txBody["a:p"]);
  for (const para of paragraphs) {
    const pPr = para?.["a:pPr"];
    const defRPr = pPr?.["a:defRPr"];
    if (defRPr) {
      return extractTextStyleFromDefRPr(defRPr);
    }
  }

  return null;
}

function extractTextStyleFromDefRPr(defRPr: any): PlaceholderTextStyle | null {
  const style: PlaceholderTextStyle = {};
  let hasValue = false;

  // Font size: sz attribute
  const sz = defRPr["@_sz"];
  if (sz) { style.fontSize = parseInt(sz, 10); hasValue = true; }

  // Bold: b="1"
  if (defRPr["@_b"] === "1") { style.bold = true; hasValue = true; }

  // Italic: i="1"
  if (defRPr["@_i"] === "1") { style.italic = true; hasValue = true; }

  // Font family: a:latin typeface
  const latin = defRPr["a:latin"];
  if (latin?.["@_typeface"]) { style.fontFamily = latin["@_typeface"]; hasValue = true; }

  // Color: a:solidFill > a:srgbClr
  const solidFill = defRPr["a:solidFill"];
  if (solidFill) {
    const srgb = solidFill["a:srgbClr"];
    if (srgb?.["@_val"]) {
      const val = srgb["@_val"];
      if (/^[0-9A-Fa-f]{6}$/.test(val)) {
        style.color = val.toUpperCase();
        hasValue = true;
      }
    }
  }

  return hasValue ? style : null;
}

/**
 * Extracts master-level text styles from <p:txStyles> in a slideMaster XML.
 * These provide Tier 2 typographic defaults for placeholders.
 */
function extractMasterTextStyles(masterXml: string): MasterTextStyles {
  const parsed = ooxmlParser.parse(masterXml);
  const styles: MasterTextStyles = {};

  const txStyles = parsed?.["p:sldMaster"]?.["p:txStyles"];
  if (!txStyles) return styles;

  // Extract titleStyle
  const titleStyle = txStyles["p:titleStyle"];
  if (titleStyle) {
    styles.titleStyle = extractTextStyleFromParsedLstStyle(titleStyle) ?? undefined;
  }

  // Extract bodyStyle
  const bodyStyle = txStyles["p:bodyStyle"];
  if (bodyStyle) {
    styles.bodyStyle = extractTextStyleFromParsedLstStyle(bodyStyle) ?? undefined;
  }

  // Extract otherStyle
  const otherStyle = txStyles["p:otherStyle"];
  if (otherStyle) {
    styles.otherStyle = extractTextStyleFromParsedLstStyle(otherStyle) ?? undefined;
  }

  return styles;
}

/**
 * Extracts text style from a parsed <a:lstStyle>, checking levels 1-9 (a:lvl1pPr through a:lvl9pPr).
 * Returns the first level that has usable style data (typically level 1 for most templates).
 */
function extractTextStyleFromParsedLstStyle(lstStyle: any): PlaceholderTextStyle | null {
  // OOXML supports 9 indent levels (a:lvl1pPr through a:lvl9pPr).
  // We extract the first level with data as the primary style.
  for (let lvl = 1; lvl <= 9; lvl++) {
    const pPr = lstStyle?.[`a:lvl${lvl}pPr`];
    if (!pPr) continue;

    const style: PlaceholderTextStyle = {};
    let hasValue = false;

    // Line spacing: a:lnSpc > a:spcPts @val
    const lnSpc = pPr?.["a:lnSpc"];
    const spcPts = lnSpc?.["a:spcPts"];
    if (spcPts?.["@_val"]) {
      style.lineSpacing = parseInt(spcPts["@_val"], 10);
      hasValue = true;
    }

    // Bullet char: a:buChar @char
    const buChar = pPr?.["a:buChar"];
    if (buChar?.["@_char"]) {
      style.bulletChar = buChar["@_char"];
      hasValue = true;
    }

    // defRPr within lvlNpPr
    const defRPr = pPr?.["a:defRPr"];
    if (defRPr) {
      const rprStyle = extractTextStyleFromDefRPr(defRPr);
      if (rprStyle) {
        Object.assign(style, rprStyle);
        hasValue = true;
      }
    }

    if (hasValue) return style;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rels extraction helpers (attribute-order agnostic)
// ---------------------------------------------------------------------------

/**
 * Extracts the first Target matching a relationship type suffix from a .rels XML.
 * Handles both `Type="..." Target="..."` and `Target="..." Type="..."` orderings.
 */
function extractRelTarget(relsXml: string, relTypeSuffix: string): string | null {
  // Pattern 1: Type before Target
  const p1 = new RegExp(
    `<Relationship[^>]+Type="[^"]*/${relTypeSuffix}"[^>]*Target="([^"]*)"`,
  );
  const m1 = p1.exec(relsXml);
  if (m1) return m1[1];
  // Pattern 2: Target before Type
  const p2 = new RegExp(
    `<Relationship[^>]+Target="([^"]*)"[^>]*Type="[^"]*/${relTypeSuffix}"`,
  );
  const m2 = p2.exec(relsXml);
  return m2?.[1] ?? null;
}

/**
 * Extracts all Targets matching a relationship type suffix from a .rels XML.
 */
function extractRelTargets(relsXml: string, relTypeSuffix: string): string[] {
  const targets: string[] = [];
  const patterns = [
    new RegExp(`<Relationship[^>]+Type="[^"]*/${relTypeSuffix}"[^>]*Target="([^"]*)"`, "g"),
    new RegExp(`<Relationship[^>]+Target="([^"]*)"[^>]*Type="[^"]*/${relTypeSuffix}"`, "g"),
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(relsXml))) {
      if (!targets.includes(m[1])) targets.push(m[1]);
    }
  }
  return targets;
}

async function readZipFile(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`[template] Missing required file: ${path}`);
  return await file.async("string");
}

async function readZipFileOrDefault(zip: JSZip, path: string, defaultValue: string): Promise<string> {
  const file = zip.file(path);
  if (!file) return defaultValue;
  return await file.async("string");
}
