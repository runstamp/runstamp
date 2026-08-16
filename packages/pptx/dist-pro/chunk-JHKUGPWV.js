import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  PIXEL_TO_EMU,
  isSchemeColorToken,
  resolveColorReference
} from "./chunk-QZ7YLVPL.js";
import {
  XMLParser,
  json2xml_default
} from "./chunk-BKM7I4JR.js";
import {
  require_lib
} from "./chunk-FL4YUJCS.js";
import {
  SCHEME_COLORS
} from "./chunk-66EJ4WIS.js";
import {
  DEFAULT_SLIDE_HEIGHT_PX,
  DEFAULT_SLIDE_WIDTH_PX,
  MAX_TEMPLATE_UNCOMPRESSED_BYTES
} from "./chunk-3O47XGMU.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";
import {
  __toESM
} from "./chunk-OWC7QHPZ.js";

// src/template/xmlParser.ts
var ooxmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  processEntities: false
});
var ALWAYS_ARRAY_TAGS = /* @__PURE__ */ new Set([
  "Override",
  "Default",
  "Relationship",
  "p:sldId",
  "p:sldMasterId"
]);
var ooxmlMutationParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  processEntities: false,
  isArray: (tagName) => ALWAYS_ARRAY_TAGS.has(tagName)
});
var ooxmlMutationBuilder = new json2xml_default({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
  format: true,
  indentBy: "  "
});
function asArray(val) {
  if (val === void 0 || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

// src/template/themeResolver.ts
function isSchemeColor(color) {
  return isSchemeColorToken(color);
}
function resolveColor(color) {
  return resolveColorReference(color);
}
function resolveTextStyle(placeholderType, layoutStyle, masterStyles, theme) {
  let masterStyle;
  if (masterStyles) {
    if (placeholderType === "title" || placeholderType === "ctrTitle") {
      masterStyle = masterStyles.titleStyle ?? void 0;
    } else if (placeholderType === "body" || placeholderType === "subTitle") {
      masterStyle = masterStyles.bodyStyle ?? void 0;
    } else {
      masterStyle = masterStyles.otherStyle ?? void 0;
    }
  }
  const isTitleLike = placeholderType === "title" || placeholderType === "ctrTitle";
  const themeFontFamily = isTitleLike ? theme.fontScheme.majorLatin : theme.fontScheme.minorLatin;
  const themeFontFamilyEa = isTitleLike ? theme.fontScheme.majorEa : theme.fontScheme.minorEa;
  return {
    fontFamily: layoutStyle?.fontFamily ?? masterStyle?.fontFamily ?? themeFontFamily,
    fontFamilyEa: layoutStyle?.fontFamilyEa ?? masterStyle?.fontFamilyEa ?? themeFontFamilyEa,
    fontSize: layoutStyle?.fontSize ?? masterStyle?.fontSize ?? void 0,
    lineSpacing: layoutStyle?.lineSpacing ?? masterStyle?.lineSpacing ?? void 0,
    bold: layoutStyle?.bold ?? masterStyle?.bold ?? void 0,
    italic: layoutStyle?.italic ?? masterStyle?.italic ?? void 0,
    color: layoutStyle?.color ?? masterStyle?.color ?? void 0,
    bulletChar: layoutStyle?.bulletChar ?? masterStyle?.bulletChar ?? void 0
  };
}
function parseThemeXml(themeXml) {
  const parsed = ooxmlParser.parse(themeXml);
  const colorScheme = {};
  const clrScheme = parsed?.["a:theme"]?.["a:themeElements"]?.["a:clrScheme"];
  if (clrScheme) {
    for (const token of SCHEME_COLORS) {
      const entry = clrScheme[`a:${token}`];
      if (!entry) continue;
      const srgb = entry["a:srgbClr"];
      if (srgb?.["@_val"]) {
        colorScheme[token] = String(srgb["@_val"]).toUpperCase();
        continue;
      }
      const sys = entry["a:sysClr"];
      if (sys?.["@_lastClr"]) {
        colorScheme[token] = String(sys["@_lastClr"]).toUpperCase();
      }
    }
  }
  const fontScheme = parsed?.["a:theme"]?.["a:themeElements"]?.["a:fontScheme"];
  const majorLatin = fontScheme?.["a:majorFont"]?.["a:latin"]?.["@_typeface"] ?? "Calibri Light";
  const minorLatin = fontScheme?.["a:minorFont"]?.["a:latin"]?.["@_typeface"] ?? "Calibri";
  const majorEa = fontScheme?.["a:majorFont"]?.["a:ea"]?.["@_typeface"] || void 0;
  const minorEa = fontScheme?.["a:minorFont"]?.["a:ea"]?.["@_typeface"] || void 0;
  return {
    colorScheme,
    fontScheme: { majorLatin, minorLatin, majorEa, minorEa }
  };
}

// src/template/parser.ts
var import_jszip = __toESM(require_lib(), 1);
import { posix as posixPath } from "node:path";
async function parseTemplate(buffer) {
  const zip = await import_jszip.default.loadAsync(buffer);
  let totalDecompressedSize = 0;
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue;
    const content = await file.async("nodebuffer");
    totalDecompressedSize += content.length;
    if (totalDecompressedSize > MAX_TEMPLATE_UNCOMPRESSED_BYTES) {
      throw new Error(
        `Template ZIP exceeds maximum decompressed size (${(MAX_TEMPLATE_UNCOMPRESSED_BYTES / 1024 / 1024).toFixed(0)} MB)`
      );
    }
  }
  const contentTypesXml = await readZipFile(zip, "[Content_Types].xml");
  const globalRels = await readZipFile(zip, "_rels/.rels");
  const presentationXml = await readZipFile(zip, "ppt/presentation.xml");
  const presentationRels = await readZipFileOrDefault(zip, "ppt/_rels/presentation.xml.rels", "");
  const { slideWidth, slideHeight } = parseSlideDimensions(presentationXml);
  const themeFiles = Object.keys(zip.files).filter((f) => /^ppt\/theme\/theme\d+\.xml$/.test(f)).sort((a, b) => {
    const numA = parseInt(a.match(/theme(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.match(/theme(\d+)/)?.[1] ?? "0", 10);
    return numA - numB;
  });
  const themes = [];
  for (const themeFile of themeFiles) {
    const xml = await readZipFile(zip, themeFile);
    themes.push({ data: parseThemeXml(xml), xml, path: themeFile });
  }
  if (themes.length === 0) {
    const xml = await readZipFile(zip, "ppt/theme/theme1.xml");
    themes.push({ data: parseThemeXml(xml), xml, path: "ppt/theme/theme1.xml" });
  }
  const masterFiles = Object.keys(zip.files).filter((f) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(f)).sort((a, b) => {
    const numA = parseInt(a.match(/slideMaster(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.match(/slideMaster(\d+)/)?.[1] ?? "0", 10);
    return numA - numB;
  });
  const layoutToMasterIndex = /* @__PURE__ */ new Map();
  const slideMasters = [];
  for (let mi = 0; mi < masterFiles.length; mi++) {
    const masterFile = masterFiles[mi];
    const masterXml = await readZipFile(zip, masterFile);
    const baseName = masterFile.split("/").pop();
    const relsPath = `ppt/slideMasters/_rels/${baseName}.rels`;
    const masterRels = await readZipFileOrDefault(zip, relsPath, "");
    const themeTarget = extractRelTarget(masterRels, "theme");
    let themeIndex = 0;
    if (themeTarget) {
      const resolvedThemePath = posixPath.normalize(posixPath.join("ppt/slideMasters/", themeTarget));
      const idx = themes.findIndex((t) => t.path === resolvedThemePath);
      if (idx !== -1) {
        themeIndex = idx;
      } else {
        getLogger().warn(
          `[template/parser] Master ${masterFile} references theme "${resolvedThemePath}" which was not found in parsed themes. Falling back to theme[0].`
        );
      }
    }
    const layoutTargets = extractRelTargets(masterRels, "slideLayout");
    for (const target of layoutTargets) {
      const resolvedPath = posixPath.normalize(posixPath.join("ppt/slideMasters/", target));
      layoutToMasterIndex.set(resolvedPath, mi);
    }
    const textStyles = extractMasterTextStyles(masterXml);
    slideMasters.push({ xml: masterXml, rels: masterRels, textStyles, themeIndex });
  }
  if (slideMasters.length === 0) {
    const canonicalMaster = "ppt/slideMasters/slideMaster1.xml";
    const file = zip.file(canonicalMaster);
    if (!file) {
      throw new Error(
        "[template/parser] No slide masters found in template. Expected files matching ppt/slideMasters/slideMaster*.xml, but none were present. Ensure the provided buffer is a valid .pptx file with at least one slide master."
      );
    }
    const masterXml = await file.async("string");
    const masterRels = await readZipFileOrDefault(zip, "ppt/slideMasters/_rels/slideMaster1.xml.rels", "");
    slideMasters.push({ xml: masterXml, rels: masterRels, textStyles: extractMasterTextStyles(masterXml), themeIndex: 0 });
  }
  const layouts = [];
  const layoutFiles = Object.keys(zip.files).filter(
    (f) => f.startsWith("ppt/slideLayouts/slideLayout") && f.endsWith(".xml") && !f.includes("_rels")
  );
  for (const layoutFile of layoutFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slideLayout(\d+)/)?.[1] ?? "0", 10);
    const numB = parseInt(b.match(/slideLayout(\d+)/)?.[1] ?? "0", 10);
    return numA - numB;
  })) {
    const layoutXml = await readZipFile(zip, layoutFile);
    const parsed = ooxmlParser.parse(layoutXml);
    const cSld = parsed?.["p:sldLayout"]?.["p:cSld"];
    const name = cSld?.["@_name"] ?? "";
    const baseName = layoutFile.split("/").pop();
    const relsPath = `ppt/slideLayouts/_rels/${baseName}.rels`;
    const rels = await readZipFileOrDefault(zip, relsPath, "");
    const placeholders = extractPlaceholdersFromParsed(parsed);
    const masterIndex = layoutToMasterIndex.get(layoutFile) ?? 0;
    layouts.push({ name, xml: layoutXml, rels, placeholders, masterIndex });
  }
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
    themes: themes.map((t) => ({ data: t.data, xml: t.xml }))
  };
}
function parseSlideDimensions(presentationXml) {
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
            slideHeight: Math.round(cy / PIXEL_TO_EMU)
          };
        }
      }
    }
  } catch {
  }
  return { slideWidth: DEFAULT_SLIDE_WIDTH_PX, slideHeight: DEFAULT_SLIDE_HEIGHT_PX };
}
function extractPlaceholdersFromParsed(parsed) {
  const placeholders = [];
  const spTree = parsed?.["p:sldLayout"]?.["p:cSld"]?.["p:spTree"];
  if (!spTree) return placeholders;
  const shapes = asArray(spTree["p:sp"]);
  for (const sp of shapes) {
    const nvPr = sp?.["p:nvSpPr"]?.["p:nvPr"];
    const ph = nvPr?.["p:ph"];
    if (!ph) continue;
    const idx = ph["@_idx"];
    const type = ph["@_type"];
    const xfrm = sp?.["p:spPr"]?.["a:xfrm"];
    const off = xfrm?.["a:off"];
    const ext = xfrm?.["a:ext"];
    const textStyle = extractTextStyleFromParsedShape(sp);
    placeholders.push({
      idx,
      type,
      x: parseInt(off?.["@_x"] ?? "0", 10),
      y: parseInt(off?.["@_y"] ?? "0", 10),
      cx: parseInt(ext?.["@_cx"] ?? "0", 10),
      cy: parseInt(ext?.["@_cy"] ?? "0", 10),
      textStyle: textStyle ?? void 0
    });
  }
  return placeholders;
}
function extractTextStyleFromParsedShape(sp) {
  const txBody = sp?.["p:txBody"];
  if (!txBody) return null;
  const lstStyle = txBody?.["a:lstStyle"];
  if (lstStyle) {
    const result = extractTextStyleFromParsedLstStyle(lstStyle);
    if (result) return result;
  }
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
function extractTextStyleFromDefRPr(defRPr) {
  const style = {};
  let hasValue = false;
  const sz = defRPr["@_sz"];
  if (sz) {
    style.fontSize = parseInt(sz, 10);
    hasValue = true;
  }
  if (defRPr["@_b"] === "1") {
    style.bold = true;
    hasValue = true;
  }
  if (defRPr["@_i"] === "1") {
    style.italic = true;
    hasValue = true;
  }
  const latin = defRPr["a:latin"];
  if (latin?.["@_typeface"]) {
    style.fontFamily = latin["@_typeface"];
    hasValue = true;
  }
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
function extractMasterTextStyles(masterXml) {
  const parsed = ooxmlParser.parse(masterXml);
  const styles = {};
  const txStyles = parsed?.["p:sldMaster"]?.["p:txStyles"];
  if (!txStyles) return styles;
  const titleStyle = txStyles["p:titleStyle"];
  if (titleStyle) {
    styles.titleStyle = extractTextStyleFromParsedLstStyle(titleStyle) ?? void 0;
  }
  const bodyStyle = txStyles["p:bodyStyle"];
  if (bodyStyle) {
    styles.bodyStyle = extractTextStyleFromParsedLstStyle(bodyStyle) ?? void 0;
  }
  const otherStyle = txStyles["p:otherStyle"];
  if (otherStyle) {
    styles.otherStyle = extractTextStyleFromParsedLstStyle(otherStyle) ?? void 0;
  }
  return styles;
}
function extractTextStyleFromParsedLstStyle(lstStyle) {
  for (let lvl = 1; lvl <= 9; lvl++) {
    const pPr = lstStyle?.[`a:lvl${lvl}pPr`];
    if (!pPr) continue;
    const style = {};
    let hasValue = false;
    const lnSpc = pPr?.["a:lnSpc"];
    const spcPts = lnSpc?.["a:spcPts"];
    if (spcPts?.["@_val"]) {
      style.lineSpacing = parseInt(spcPts["@_val"], 10);
      hasValue = true;
    }
    const buChar = pPr?.["a:buChar"];
    if (buChar?.["@_char"]) {
      style.bulletChar = buChar["@_char"];
      hasValue = true;
    }
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
function extractRelTarget(relsXml, relTypeSuffix) {
  const p1 = new RegExp(
    `<Relationship[^>]+Type="[^"]*/${relTypeSuffix}"[^>]*Target="([^"]*)"`
  );
  const m1 = p1.exec(relsXml);
  if (m1) return m1[1];
  const p2 = new RegExp(
    `<Relationship[^>]+Target="([^"]*)"[^>]*Type="[^"]*/${relTypeSuffix}"`
  );
  const m2 = p2.exec(relsXml);
  return m2?.[1] ?? null;
}
function extractRelTargets(relsXml, relTypeSuffix) {
  const targets = [];
  const patterns = [
    new RegExp(`<Relationship[^>]+Type="[^"]*/${relTypeSuffix}"[^>]*Target="([^"]*)"`, "g"),
    new RegExp(`<Relationship[^>]+Target="([^"]*)"[^>]*Type="[^"]*/${relTypeSuffix}"`, "g")
  ];
  for (const pattern of patterns) {
    let m;
    while (m = pattern.exec(relsXml)) {
      if (!targets.includes(m[1])) targets.push(m[1]);
    }
  }
  return targets;
}
async function readZipFile(zip, path) {
  const file = zip.file(path);
  if (!file) throw new Error(`[template] Missing required file: ${path}`);
  return await file.async("string");
}
async function readZipFileOrDefault(zip, path, defaultValue) {
  const file = zip.file(path);
  if (!file) return defaultValue;
  return await file.async("string");
}

export {
  ooxmlMutationParser,
  ooxmlMutationBuilder,
  asArray,
  isSchemeColor,
  resolveColor,
  resolveTextStyle,
  parseThemeXml,
  parseTemplate
};
//# sourceMappingURL=chunk-JHKUGPWV.js.map
