import type JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { QualityFinding } from "./types.js";

export interface DocxQualityIssue extends QualityFinding {
  kind: string;
  path?: string;
  relationshipId?: string;
  target?: string;
  styleId?: string;
  numId?: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

const RUN_PROPERTY_ORDER = [
  "rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss",
  "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing", "w", "kern", "position", "sz", "szCs",
  "highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout",
  "specVanish", "oMath", "rPrChange",
];

const PARAGRAPH_PROPERTY_ORDER = [
  "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr", "suppressLineNumbers",
  "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE",
  "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind", "contextualSpacing", "mirrorIndents",
  "suppressOverlap", "jc", "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle",
  "rPr", "sectPr", "pPrChange",
];

const TABLE_PROPERTY_ORDER = [
  "tblStyle", "tblpPr", "tblOverlap", "bidiVisual", "tblStyleRowBandSize", "tblStyleColBandSize", "tblW", "jc",
  "tblCellSpacing", "tblInd", "tblBorders", "shd", "tblLayout", "tblCellMar", "tblLook", "tblCaption",
  "tblDescription", "tblPrChange",
];

const TABLE_CELL_PROPERTY_ORDER = [
  "cnfStyle", "tcW", "gridSpan", "hMerge", "vMerge", "tcBorders", "shd", "noWrap", "tcMar", "textDirection",
  "tcFitText", "vAlign", "hideMark", "cellIns", "cellDel", "cellMerge", "tcPrChange",
];

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseXmlAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of input.matchAll(/([A-Za-z0-9_.:-]+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function readCompatibilityMode(settingsXml: string | undefined): number {
  for (const match of settingsXml?.matchAll(/<w:compatSetting\b([^>]*)\/?>/g) ?? []) {
    const attributes = parseXmlAttributes(match[1]);
    if (attributes["w:name"] === "compatibilityMode") {
      return Number(attributes["w:val"] ?? "0");
    }
  }
  return 0;
}

function resolveRelationshipBase(relsPath: string): string[] {
  if (relsPath === "_rels/.rels") {
    return [];
  }
  const segments = relsPath.split("/");
  const relsIndex = segments.lastIndexOf("_rels");
  const fileName = segments[segments.length - 1]?.replace(/\.rels$/, "");
  const baseSegments = segments.slice(0, relsIndex);
  if (fileName && fileName !== ".rels") {
    baseSegments.push(fileName);
  }
  return baseSegments.slice(0, -1);
}

function resolveRelationshipTarget(relsPath: string, target: string): string {
  const baseSegments = resolveRelationshipBase(relsPath);
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      baseSegments.pop();
      continue;
    }
    baseSegments.push(segment);
  }
  return baseSegments.join("/");
}

function readStyleIds(stylesXml: string | undefined): Set<string> {
  if (!stylesXml) {
    return new Set();
  }
  const matches = stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"/g);
  return new Set(Array.from(matches, (match) => match[1]));
}

function contentTypesForPackage(contentTypesXml: string | undefined): {
  defaults: Set<string>;
  overrides: Set<string>;
} {
  if (!contentTypesXml) {
    return { defaults: new Set(), overrides: new Set() };
  }
  return {
    defaults: new Set(Array.from(contentTypesXml.matchAll(/<Default\b[^>]*Extension="([^"]+)"/g), (match) => match[1])),
    overrides: new Set(Array.from(contentTypesXml.matchAll(/<Override\b[^>]*PartName="\/([^"]+)"/g), (match) => match[1])),
  };
}

function partHasContentType(path: string, contentTypes: { defaults: Set<string>; overrides: Set<string> }): boolean {
  if (path === "[Content_Types].xml" || path.endsWith(".rels")) {
    return true;
  }
  const extension = path.split(".").pop();
  return contentTypes.overrides.has(path) || (!!extension && contentTypes.defaults.has(extension));
}

function childTags(xml: string): string[] {
  return Array.from(xml.matchAll(/<w:([A-Za-z0-9]+)\b/g), (match) => match[1]);
}

function checkOrderedChildren(
  issues: DocxQualityIssue[],
  xml: string | undefined,
  container: "rPr" | "pPr" | "tblPr" | "tcPr",
  ordering: string[],
): void {
  if (!xml) {
    return;
  }

  const index = new Map(ordering.map((tag, orderIndex) => [tag, orderIndex]));
  for (const match of xml.matchAll(new RegExp(`<w:${container}\\b[^>]*>([\\s\\S]*?)<\\/w:${container}>`, "g"))) {
    let last = -1;
    for (const tag of childTags(match[1])) {
      const current = index.get(tag);
      if (current === undefined) {
        continue;
      }
      if (current < last) {
        issues.push({
          code: "SHARED_XML_PARSE_FAILURE",
          severity: "error",
          message: `OOXML child order violation in w:${container}: ${tag} appears out of sequence.`,
          autoFixed: false,
          kind: `${container}_child_order`,
        });
        break;
      }
      last = current;
    }
  }
}

function collectRelationshipTargets(paths: string[], zipPathSet: Set<string>, relsXmlByPath: Map<string, string>): Set<string> {
  const targets = new Set<string>();
  for (const relsPath of paths.filter((path) => path.endsWith(".rels"))) {
    const relsXml = relsXmlByPath.get(relsPath);
    if (!relsXml) continue;
    const relationships = asArray(xmlParser.parse(relsXml)?.Relationships?.Relationship);
    for (const relationship of relationships) {
      if (String(relationship["@_TargetMode"] ?? "") === "External") {
        continue;
      }
      const target = String(relationship["@_Target"] ?? "");
      if (!target) continue;
      const resolved = resolveRelationshipTarget(relsPath, target);
      if (zipPathSet.has(resolved)) {
        targets.add(resolved);
      }
    }
  }
  return targets;
}

export async function collectStructuralIssues(zip: JSZip): Promise<DocxQualityIssue[]> {
  const issues: DocxQualityIssue[] = [];
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  const pathSet = new Set(paths);
  const relsXmlByPath = new Map<string, string>();
  const contentTypesXml = await zip.file("[Content_Types].xml")?.async("string");
  const contentTypes = contentTypesForPackage(contentTypesXml);

  for (const path of paths) {
    if (!partHasContentType(path, contentTypes)) {
      issues.push({
        code: "SHARED_CONTENT_TYPE_MISSING",
        severity: "error",
        message: `Package part ${path} has no matching content type default or override.`,
        autoFixed: false,
        kind: "missing_content_type",
        path,
      });
    }
  }

  for (const relsPath of paths.filter((path) => path.endsWith(".rels")).sort()) {
    const relsXml = await zip.file(relsPath)?.async("string");
    if (!relsXml) continue;
    relsXmlByPath.set(relsPath, relsXml);
    const relationships = asArray(xmlParser.parse(relsXml)?.Relationships?.Relationship);
    const seenIds = new Set<string>();
    for (const relationship of relationships) {
      const relationshipId = String(relationship["@_Id"] ?? "");
      if (!relationshipId) continue;
      if (seenIds.has(relationshipId)) {
        issues.push({
          code: "SHARED_RID_NOT_UNIQUE",
          severity: "error",
          message: `Relationship id ${relationshipId} is duplicated in ${relsPath}.`,
          autoFixed: false,
          kind: "duplicate_rid",
          path: relsPath,
          relationshipId,
        });
      }
      seenIds.add(relationshipId);

      if (String(relationship["@_TargetMode"] ?? "") === "External") {
        continue;
      }
      const target = String(relationship["@_Target"] ?? "");
      if (!target) continue;
      const resolvedTarget = resolveRelationshipTarget(relsPath, target);
      if (!pathSet.has(resolvedTarget)) {
        issues.push({
          code: "DOCX_RELATIONSHIP_TARGET_MISSING",
          severity: "error",
          message: `Relationship ${relationshipId} in ${relsPath} points to missing target ${resolvedTarget}.`,
          autoFixed: false,
          kind: "missing_relationship_target",
          path: relsPath,
          relationshipId,
          target: resolvedTarget,
        });
      }
    }
  }

  const relationshipTargets = collectRelationshipTargets(paths, pathSet, relsXmlByPath);
  for (const mediaPath of paths.filter((path) => path.startsWith("word/media/"))) {
    if (!relationshipTargets.has(mediaPath)) {
      issues.push({
        code: "SHARED_MEDIA_EMBED_MISSING",
        severity: "error",
        message: `Media part ${mediaPath} is not referenced by any internal relationship.`,
        autoFixed: false,
        kind: "orphaned_media",
        path: mediaPath,
      });
    }
  }

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const numberingXml = await zip.file("word/numbering.xml")?.async("string");
  const referencedNumIds = new Set(
    Array.from(documentXml?.matchAll(/<w:numId\b[^>]*w:val="([^"]+)"/g) ?? [], (match) => match[1]),
  );
  const definedNumIds = new Map<string, string>();
  const abstractNumIds = new Set<string>();
  for (const match of numberingXml?.matchAll(/<w:abstractNum\b[^>]*w:abstractNumId="([^"]+)"/g) ?? []) {
    abstractNumIds.add(match[1]);
  }
  for (const match of numberingXml?.matchAll(/<w:num\b[^>]*w:numId="([^"]+)"[\s\S]*?<w:abstractNumId\b[^>]*w:val="([^"]+)"/g) ?? []) {
    definedNumIds.set(match[1], match[2]);
  }
  if (referencedNumIds.size > 0 && !numberingXml) {
    issues.push({
      code: "DOCX_NUMBERING_DEF_MISSING",
      severity: "error",
      message: "Document references numbering definitions, but word/numbering.xml is missing.",
      autoFixed: false,
      kind: "missing_numbering_file",
    });
  }
  for (const numId of referencedNumIds) {
    const abstractNumId = definedNumIds.get(numId);
    if (!abstractNumId || !abstractNumIds.has(abstractNumId)) {
      issues.push({
        code: "DOCX_NUMBERING_DEF_MISSING",
        severity: "error",
        message: `Document references numbering id ${numId}, but its numbering definition is missing.`,
        autoFixed: false,
        kind: "missing_numbering_definition",
        numId,
      });
    }
  }

  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");
  const styleIds = readStyleIds(stylesXml);
  for (const match of documentXml?.matchAll(/<w:(pStyle|rStyle)\b[^>]*w:val="([^"]+)"/g) ?? []) {
    const styleKind = match[1];
    const styleId = match[2];
    if (!styleIds.has(styleId)) {
      issues.push({
        code: "DOCX_STYLE_REF_MISSING",
        severity: "error",
        message: `Document references missing ${styleKind} style ${styleId}.`,
        autoFixed: false,
        kind: styleKind === "pStyle" ? "missing_paragraph_style" : "missing_character_style",
        styleId,
      });
    }
  }

  if (documentXml && !documentXml.includes("<w:sectPr")) {
    issues.push({
      code: "DOCX_SECT_PR_MISSING",
      severity: "error",
      message: "Document body is missing a trailing w:sectPr definition.",
      autoFixed: false,
      kind: "missing_sectpr",
    });
  }
  if (documentXml && !/<w:body\b[\s\S]*<w:sectPr\b[\s\S]*<\/w:sectPr>\s*<\/w:body>/.test(documentXml)) {
    issues.push({
      code: "DOCX_SECT_PR_MISSING",
      severity: "error",
      message: "Document body is missing a final w:sectPr as its trailing body child.",
      autoFixed: false,
      kind: "final_sectpr_not_trailing",
    });
  }

  checkOrderedChildren(issues, documentXml, "rPr", RUN_PROPERTY_ORDER);
  checkOrderedChildren(issues, documentXml, "pPr", PARAGRAPH_PROPERTY_ORDER);
  checkOrderedChildren(issues, documentXml, "tblPr", TABLE_PROPERTY_ORDER);
  checkOrderedChildren(issues, documentXml, "tcPr", TABLE_CELL_PROPERTY_ORDER);

  const compatibilityMode = readCompatibilityMode(settingsXml);
  if (settingsXml && compatibilityMode < 15) {
    issues.push({
      code: "SHARED_XML_PARSE_FAILURE",
      severity: "error",
      message: "DOCX settings do not opt into Word 2013+ compatibility mode.",
      autoFixed: false,
      kind: "compatibility_mode_banner_risk",
    });
  }

  for (const lineRule of documentXml?.matchAll(/\bw:lineRule="([^"]+)"/g) ?? []) {
    if (!["auto", "exact", "atLeast"].includes(lineRule[1])) {
      issues.push({
        code: "SHARED_XML_PARSE_FAILURE",
        severity: "error",
        message: `Invalid w:lineRule value ${lineRule[1]}.`,
        autoFixed: false,
        kind: "invalid_line_rule",
      });
    }
  }

  for (const match of documentXml?.matchAll(/<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/g) ?? []) {
    const trackedChangeKind = match[1];
    const attrs = match[2] ?? "";
    const hasId = /\bw:id="[^"]+"/.test(attrs);
    const hasAuthor = /\bw:author="[^"]+"/.test(attrs);
    if (hasId && hasAuthor) {
      continue;
    }
    issues.push({
      code: "DOCX_TRACKED_CHANGE_MALFORMED",
      severity: "error",
      message: `Tracked change ${trackedChangeKind} is missing required id or author metadata.`,
      autoFixed: false,
      kind: "tracked_change_malformed",
    });
  }
  const trackedChangeIds = new Set<string>();
  for (const match of documentXml?.matchAll(/<w:(ins|del|moveFrom|moveTo|cellIns|cellDel|pPrChange|rPrChange|tblPrChange|tcPrChange)\b([^>]*)/g) ?? []) {
    const id = match[2].match(/\bw:id="([^"]+)"/)?.[1];
    if (!id) {
      continue;
    }
    const key = id;
    if (trackedChangeIds.has(key)) {
      issues.push({
        code: "DOCX_TRACKED_CHANGE_MALFORMED",
        severity: "error",
        message: `Tracked change ${match[1]} reuses id ${id}.`,
        autoFixed: false,
        kind: "tracked_change_id_not_unique",
      });
    }
    trackedChangeIds.add(key);
  }

  const commentsXml = await zip.file("word/comments.xml")?.async("string");
  const commentsExtendedPartName = ["word", "commentsExtended"].join("/") + String.fromCharCode(46) + "xml";
  const commentsExtendedXml = await zip.file(commentsExtendedPartName)?.async("string");
  const commentStarts = new Set(Array.from(documentXml?.matchAll(/<w:commentRangeStart\b[^>]*w:id="([^"]+)"/g) ?? [], (match) => match[1]));
  const commentEnds = new Set(Array.from(documentXml?.matchAll(/<w:commentRangeEnd\b[^>]*w:id="([^"]+)"/g) ?? [], (match) => match[1]));
  const commentRefs = new Set(Array.from(documentXml?.matchAll(/<w:commentReference\b[^>]*w:id="([^"]+)"/g) ?? [], (match) => match[1]));
  for (const commentId of new Set([...commentStarts, ...commentEnds, ...commentRefs])) {
    if (!commentStarts.has(commentId) || !commentEnds.has(commentId) || !commentRefs.has(commentId)) {
      issues.push({
        code: "SHARED_XML_PARSE_FAILURE",
        severity: "error",
        message: `Comment id ${commentId} does not have a complete range start/end/reference marker set.`,
        autoFixed: false,
        kind: "comment_marker_incomplete",
      });
    }
  }
  // Do not let the match cross an earlier </w:r>. The old lazy wildcard began
  // at any preceding run, crossed its closing tag, and falsely classified a
  // correct sibling range marker followed by the reference run as nested.
  const inlineCommentMarker = /<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:commentRange(?:Start|End)\b(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g;
  for (const inlineMarker of documentXml?.matchAll(inlineCommentMarker) ?? []) {
    issues.push({
      code: "SHARED_XML_PARSE_FAILURE",
      severity: "error",
      message: "Comment range markers must be paragraph children, not nested inside w:r.",
      autoFixed: false,
      kind: "comment_marker_not_sibling",
      path: inlineMarker[0].slice(0, 80),
    });
  }
  if (commentsExtendedXml) {
    const paraIds = new Set(Array.from(commentsXml?.matchAll(/\bw14:paraId="([^"]+)"/g) ?? [], (match) => match[1]));
    for (const match of commentsExtendedXml.matchAll(/<w15:commentEx\b([^>]*)/g)) {
      const paraId = match[1].match(/\bw15:paraId="([^"]+)"/)?.[1];
      const parentParaId = match[1].match(/\bw15:paraIdParent="([^"]+)"/)?.[1];
      if ((paraId && !paraIds.has(paraId)) || (parentParaId && !paraIds.has(parentParaId))) {
        issues.push({
          code: "SHARED_XML_PARSE_FAILURE",
          severity: "error",
          message: "Threaded comment metadata references a missing comments paragraph id.",
          autoFixed: false,
          kind: "comments_extended_thread_broken",
        });
      }
    }
  }

  const fontTableXml = await zip.file("word/fontTable.xml")?.async("string");
  const declaredFonts = new Set(Array.from(fontTableXml?.matchAll(/<w:font\b[^>]*w:name="([^"]+)"/g) ?? [], (match) => match[1]));
  const usedFonts = new Set(Array.from(documentXml?.matchAll(/<w:rFonts\b[^>]*(?:w:ascii|w:hAnsi|w:cs)="([^"]+)"/g) ?? [], (match) => match[1]));
  for (const font of usedFonts) {
    if (!declaredFonts.has(font)) {
      issues.push({
        code: "DOCX_FONT_FALLBACK_USED",
        severity: "warning",
        message: `Font ${font} is used in document.xml but missing from fontTable.xml.`,
        autoFixed: false,
        kind: "font_table_missing_font",
      });
    }
  }

  const documentRootOpen = documentXml?.match(/<w:document\b[^>]*>/)?.[0] ?? "";
  const documentXmlAfterRoot = documentXml?.slice(documentRootOpen.length) ?? "";
  const ignorable = documentRootOpen.match(/\bmc:Ignorable="([^"]+)"/)?.[1]?.split(/\s+/) ?? [];
  for (const ns of ["w14", "w15", "wps", "wpg", "wpi"]) {
    const namespaceIsUsed = new RegExp(`(?:<\\/?${ns}:|\\s${ns}:[A-Za-z0-9_.-]+=)`).test(documentXmlAfterRoot);
    if (namespaceIsUsed && !ignorable.includes(ns)) {
      issues.push({
        code: "SHARED_XML_PARSE_FAILURE",
        severity: "error",
        message: `mc:Ignorable does not include non-core namespace ${ns}.`,
        autoFixed: false,
        kind: "mc_ignorable_missing_namespace",
      });
    }
  }

  for (const match of documentXml?.matchAll(/<w:sdt\b[\s\S]*?<\/w:sdt>/g) ?? []) {
    const sdtXml = match[0];
    if (sdtXml.includes("<w:sdtContent")) {
      continue;
    }
    issues.push({
      code: "DOCX_CONTENT_CONTROL_REF_BROKEN",
      severity: "error",
      message: "Structured document tag is missing w:sdtContent.",
      autoFixed: false,
      kind: "content_control_missing_content",
    });
  }

  for (const tableMatch of documentXml?.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? []) {
    const tableXml = tableMatch[0];
    const tableWidth = Number(tableXml.match(/<w:tblW\b[^>]*w:w="(\d+)"/)?.[1] ?? "0");
    const gridWidths = Array.from(tableXml.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g), (match) => Number(match[1]));
    if (tableWidth <= 0 || gridWidths.length === 0) continue;
    const totalWidth = gridWidths.reduce((sum, width) => sum + width, 0);
    const delta = Math.abs(totalWidth - tableWidth) / tableWidth;
    if (delta > 0.05) {
      issues.push({
        code: "DOCX_TABLE_WIDTH_MISMATCH",
        severity: "warning",
        message: `Table width ${tableWidth} differs from grid width sum ${totalWidth}.`,
        autoFixed: false,
        kind: "table_width_mismatch",
      });
    }
  }

  return issues;
}
