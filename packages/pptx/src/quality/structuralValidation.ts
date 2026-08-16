import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type {
  StructuralValidationCheck,
  StructuralValidationSummary,
} from "./report.js";
import { PRESENTATION_CHILD_ORDER } from "../ooxml/presentationOrder.js";
import {
  assertUniqueShapeIds,
  findAllElements,
  getAttr,
  getChildTagNames,
  getChildren,
  getTagName,
  getText,
  type ParsedXmlNode,
} from "./xmlUtils.js";

const EMU_PER_PX = 9525;

const structuralXmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: {
    // Generated custom properties can contain thousands of escapes; 100k is ample
    // while finite entity size, depth, count, and expanded-length caps block entity bombs.
    maxTotalExpansions: 100_000,
    maxEntitySize: 10_000,
    maxExpansionDepth: 10,
    maxExpandedLength: 100_000,
    maxEntityCount: 100,
  },
});

function addCheck(
  checks: StructuralValidationCheck[],
  id: string,
  passed: boolean,
  message: string,
  severity: "info" | "warning" | "error" = "error",
): void {
  checks.push({ id, passed, message, severity });
}

async function readText(zip: JSZip, path: string): Promise<string | undefined> {
  return await zip.file(path)?.async("string");
}

async function loadZipXml(
  zip: JSZip,
  path: string,
  checks: StructuralValidationCheck[],
): Promise<ParsedXmlNode[] | null> {
  const text = await readText(zip, path);
  if (text === undefined) return null;
  try {
    return structuralXmlParser.parse(text) as ParsedXmlNode[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(
      checks,
      `xml.parse.${path}`,
      false,
      `${path} is not parseable XML: ${message}`,
    );
    return null;
  }
}

function resolveRelTarget(relsPath: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);

  const relsDir = relsPath.substring(0, relsPath.lastIndexOf("/") + 1);
  const parentDir = relsDir.replace(/_rels\/$/, "");
  const resolved: string[] = [];
  for (const part of `${parentDir}${target}`.split("/")) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}

function getPackagePaths(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((file) => !zip.files[file].dir)
    .sort();
}

function getExtension(path: string): string {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
}

function collectContentTypeChecks(
  checks: StructuralValidationCheck[],
  contentTypesTree: ParsedXmlNode[] | null,
  packagePaths: string[],
): void {
  if (!contentTypesTree) return;

  const seenExtensions = new Set<string>();
  const seenPartNames = new Set<string>();
  const defaults = new Set<string>();
  const overrides = new Set<string>();

  for (const element of findAllElements(contentTypesTree, "Default")) {
    const extension = getAttr(element, "Extension")?.toLowerCase();
    if (!extension) continue;
    const duplicate = seenExtensions.has(extension);
    addCheck(
      checks,
      `content-types.default.${extension}`,
      !duplicate,
      duplicate
        ? `Duplicate Default content type extension "${extension}" detected.`
        : `Default content type extension "${extension}" is unique.`,
    );
    seenExtensions.add(extension);
    defaults.add(extension);
  }

  for (const element of findAllElements(contentTypesTree, "Override")) {
    const partName = getAttr(element, "PartName")?.replace(/^\//, "").toLowerCase();
    if (!partName) continue;
    const duplicate = seenPartNames.has(partName);
    addCheck(
      checks,
      `content-types.override.${partName}`,
      !duplicate,
      duplicate
        ? `Duplicate Override content type part "${partName}" detected.`
        : `Override content type part "${partName}" is unique.`,
    );
    seenPartNames.add(partName);
    overrides.add(partName);
  }

  for (const path of packagePaths) {
    if (path === "[Content_Types].xml") continue;
    if (overrides.has(path.toLowerCase())) continue;
    const extension = getExtension(path);
    if (extension && defaults.has(extension)) continue;
    addCheck(
      checks,
      `package.content-type.${path}`,
      false,
      `${path} is missing a matching Default or Override content type.`,
    );
  }
}

function collectPresentationChecks(
  checks: StructuralValidationCheck[],
  presentationTree: ParsedXmlNode[] | null,
): void {
  if (!presentationTree) return;

  const presentation = findAllElements(presentationTree, "p:presentation")[0];
  if (!presentation) {
    addCheck(checks, "presentation.root", false, "No p:presentation element found.");
    return;
  }

  const expectedOrder = [...PRESENTATION_CHILD_ORDER] as string[];
  const relevant = getChildTagNames(presentation)
    .filter((tag) => expectedOrder.includes(tag));
  let lastIndex = -1;
  for (const tag of relevant) {
    const expectedIndex = expectedOrder.indexOf(tag);
    const ordered = expectedIndex >= lastIndex;
    addCheck(
      checks,
      `presentation.order.${tag}`,
      ordered,
      ordered
        ? `Presentation child ${tag} appears in schema order.`
        : `Presentation child ${tag} appears out of OOXML schema order.`,
    );
    lastIndex = Math.max(lastIndex, expectedIndex);
  }

  const seenSlideIds = new Set<string>();
  for (const slideIdElement of findAllElements(presentationTree, "p:sldId")) {
    const slideId = getAttr(slideIdElement, "id");
    if (!slideId) continue;
    const duplicate = seenSlideIds.has(slideId);
    addCheck(
      checks,
      `presentation.slide-id.${slideId}`,
      !duplicate,
      duplicate
        ? `Duplicate slide id ${slideId} detected in ppt/presentation.xml.`
        : `Slide id ${slideId} in ppt/presentation.xml is unique.`,
    );
    seenSlideIds.add(slideId);
  }
}

function collectDuplicateShapeIdChecks(
  checks: StructuralValidationCheck[],
  slideNumber: string,
  slideTree: ParsedXmlNode[] | null,
): void {
  if (!slideTree) return;
  const ids = findAllElements(slideTree, "p:cNvPr")
    .map((element) => getAttr(element, "id"))
    .filter((id): id is string => Boolean(id));
  const seen = new Set<string>();
  for (const id of ids) {
    const duplicate = seen.has(id);
    addCheck(
      checks,
      `slide.${slideNumber}.shape-id.${id}`,
      !duplicate,
      duplicate
        ? `Duplicate non-visual shape id ${id} detected on slide ${slideNumber}.`
        : `Slide ${slideNumber} non-visual shape id ${id} is unique.`,
    );
    seen.add(id);
  }

  try {
    assertUniqueShapeIds(slideTree);
  } catch (error) {
    addCheck(
      checks,
      `slide.${slideNumber}.shape-id.summary`,
      false,
      `Slide ${slideNumber}: ${(error as Error).message}`,
    );
  }
}

function collectRequiredAttributeChecks(
  checks: StructuralValidationCheck[],
  slideNumber: string,
  slideTree: ParsedXmlNode[] | null,
): void {
  if (!slideTree) return;
  for (const tag of ["a:latin", "a:ea", "a:cs"]) {
    let index = 0;
    for (const element of findAllElements(slideTree, tag)) {
      const hasTypeface = getAttr(element, "typeface") !== undefined;
      addCheck(
        checks,
        `slide.${slideNumber}.required-attribute.${tag}.${index}`,
        hasTypeface,
        hasTypeface
          ? `Slide ${slideNumber} ${tag} entry ${index + 1} includes typeface.`
          : `Slide ${slideNumber} ${tag} entry ${index + 1} is missing typeface.`,
      );
      index += 1;
    }
  }
}

function collectAutoFitChecks(
  checks: StructuralValidationCheck[],
  slideNumber: string,
  slideTree: ParsedXmlNode[] | null,
): void {
  if (!slideTree) return;
  let index = 0;
  for (const bodyPr of findAllElements(slideTree, "a:bodyPr")) {
    const descendants = getChildren(bodyPr);
    const hasNormAutofit = findAllElements(descendants, "a:normAutofit").length > 0;
    const hasSpAutoFit = findAllElements(descendants, "a:spAutoFit").length > 0;
    const hasNoAutofit = findAllElements(descendants, "a:noAutofit").length > 0;
    const autoFitCount = [hasNormAutofit, hasSpAutoFit, hasNoAutofit].filter(Boolean).length;
    const singlePolicy = autoFitCount <= 1;
    addCheck(
      checks,
      `slide.${slideNumber}.autofit-policy.${index}`,
      singlePolicy,
      singlePolicy
        ? `Slide ${slideNumber} bodyPr ${index + 1} uses at most one autofit policy.`
        : `Slide ${slideNumber} bodyPr ${index + 1} contains conflicting autofit policies.`,
    );

    let normIndex = 0;
    for (const normAutofit of findAllElements(descendants, "a:normAutofit")) {
      const hasFontScale = getAttr(normAutofit, "fontScale") !== undefined;
      addCheck(
        checks,
        `slide.${slideNumber}.normautofit.${index}.${normIndex}`,
        true,
        hasFontScale
          ? `Slide ${slideNumber} normAutofit entry ${normIndex + 1} includes fontScale.`
          : `Slide ${slideNumber} normAutofit entry ${normIndex + 1} uses Office-default autofit.`,
        "info",
      );
      normIndex += 1;
    }
    index += 1;
  }
}

function collectLongTableTextChecks(
  checks: StructuralValidationCheck[],
  slideNumber: string,
  slideTree: ParsedXmlNode[] | null,
): void {
  if (!slideTree) return;
  let index = 0;
  for (const tableCell of findAllElements(slideTree, "a:tc")) {
    const text = findAllElements([tableCell], "a:t")
      .map((element) => getText(element))
      .join("");
    if (text.length === 0) {
      index += 1;
      continue;
    }
    const withinLimit = text.length <= 150;
    addCheck(
      checks,
      `slide.${slideNumber}.table-overflow.${index}`,
      withinLimit,
      withinLimit
        ? `Slide ${slideNumber} table cell ${index + 1} stays within the conservative text budget.`
        : `Slide ${slideNumber} table cell ${index + 1} contains ${text.length} characters and is likely to overflow.`,
      withinLimit ? "info" : "warning",
    );
    index += 1;
  }
}

function collectCustomDataConflictChecks(
  checks: StructuralValidationCheck[],
  slideNumber: string,
  slideTree: ParsedXmlNode[] | null,
): void {
  if (!slideTree) return;
  const count = findAllElements(slideTree, "p:custDataLst").length;
  const withinLimit = count <= 1;
  addCheck(
    checks,
    `slide.${slideNumber}.custdatalist`,
    withinLimit,
    withinLimit
      ? `Slide ${slideNumber} has at most one custDataLst block.`
      : `Slide ${slideNumber} contains multiple custDataLst blocks, which can confuse PowerPoint repair.`,
  );
}

function collectSlideRefChecks(
  checks: StructuralValidationCheck[],
  slideNumber: string,
  slideTree: ParsedXmlNode[] | null,
  relsTree: ParsedXmlNode[] | null,
): void {
  if (!slideTree) return;
  const relationshipIds = new Set(
    relsTree
      ? findAllElements(relsTree, "Relationship")
        .map((rel) => getAttr(rel, "Id"))
        .filter((id): id is string => Boolean(id))
      : [],
  );

  function walk(nodes: unknown): void {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const attrs = (node as Record<string, unknown>)[":@"];
      if (attrs && typeof attrs === "object") {
        for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
          if (
            (key === "@_r:embed" || key === "@_r:id" || key === "@_r:link")
            && typeof value === "string"
            && value.length > 0
          ) {
            addCheck(
              checks,
              `slide.${slideNumber}.ref.${value}`,
              relationshipIds.has(value),
              relationshipIds.has(value)
                ? `Slide ${slideNumber} relationship ${value} resolves.`
                : `Slide ${slideNumber} references ${value}, but it is missing from the slide relationships file.`,
            );
          }
        }
      }
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if (key !== ":@" && key !== "#text") {
          walk((node as Record<string, unknown>)[key]);
        }
      }
    }
  }

  walk(slideTree);
}

function collectRelationshipChecks(
  checks: StructuralValidationCheck[],
  relsPath: string,
  relsTree: ParsedXmlNode[] | null,
  packagePathSet: Set<string>,
  referencedTargets: Set<string>,
): void {
  if (!relsTree) return;
  const seenIds = new Set<string>();
  for (const rel of findAllElements(relsTree, "Relationship")) {
    const relId = getAttr(rel, "Id");
    const target = getAttr(rel, "Target");
    const targetMode = getAttr(rel, "TargetMode");
    if (!relId) continue;
    const duplicate = seenIds.has(relId);
    addCheck(
      checks,
      `${relsPath}.rid.${relId}`,
      !duplicate,
      duplicate
        ? `Duplicate relationship Id "${relId}" in ${relsPath}.`
        : `Relationship Id "${relId}" in ${relsPath} is unique.`,
    );
    seenIds.add(relId);

    if (!target || targetMode === "External") continue;
    const resolvedTarget = resolveRelTarget(relsPath, target);
    referencedTargets.add(resolvedTarget);
    addCheck(
      checks,
      `${relsPath}.${relId}.target`,
      packagePathSet.has(resolvedTarget),
      packagePathSet.has(resolvedTarget)
        ? `Relationship ${relId} in ${relsPath} resolves to ${resolvedTarget}.`
        : `Relationship ${relId} in ${relsPath} points to missing target ${resolvedTarget}.`,
    );
  }
}

function collectReachablePartChecks(
  checks: StructuralValidationCheck[],
  packagePaths: string[],
  referencedTargets: Set<string>,
): void {
  const likelyGeneratedTargets = packagePaths.filter((path) =>
    /^(ppt\/media\/|ppt\/embeddings\/|ppt\/charts\/|ppt\/drawings\/|ppt\/comments\/|ppt\/notesSlides\/)/.test(path)
    && !path.includes("/_rels/")
    && !path.endsWith(".rels")
  );

  for (const path of likelyGeneratedTargets) {
    addCheck(
      checks,
      `package.reachable.${path}`,
      referencedTargets.has(path),
      referencedTargets.has(path)
        ? `${path} is referenced by a relationship part.`
        : `${path} is not referenced by any relationship part.`,
    );
  }
}

function collectChartFormatCodeChecks(
  checks: StructuralValidationCheck[],
  chartNumber: string,
  chartTree: ParsedXmlNode[] | null,
): void {
  if (!chartTree) return;
  let index = 0;
  for (const formatCodeElement of findAllElements(chartTree, "c:formatCode")) {
    const formatCode = getText(formatCodeElement);
    const hasRawAmpersand = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(formatCode);
    const hasRawAngle = /[<>]/.test(formatCode);
    const escaped = !hasRawAmpersand && !hasRawAngle;
    addCheck(
      checks,
      `chart.${chartNumber}.format-code.${index}`,
      escaped,
      escaped
        ? `Chart ${chartNumber} format code ${index + 1} is XML-safe.`
        : `Chart ${chartNumber} format code ${index + 1} contains unescaped XML-sensitive characters.`,
    );
    index += 1;
  }
}

function collectChartWorkbookChecks(
  checks: StructuralValidationCheck[],
  chartNumber: string,
  chartRelsPath: string,
  chartRelsTree: ParsedXmlNode[] | null,
  packagePathSet: Set<string>,
): void {
  if (!chartRelsTree) return;
  for (const rel of findAllElements(chartRelsTree, "Relationship")) {
    const target = getAttr(rel, "Target");
    if (!target || !target.includes("../embeddings/")) continue;
    const workbookPath = resolveRelTarget(chartRelsPath, target);
    addCheck(
      checks,
      `chart.${chartNumber}.workbook`,
      packagePathSet.has(workbookPath),
      packagePathSet.has(workbookPath)
        ? `Chart ${chartNumber} embedded workbook exists.`
        : `Chart ${chartNumber} embedded workbook is missing (${workbookPath}).`,
    );
  }
}

interface ChartFrame {
  slidePath: string;
  widthPx: number;
  heightPx: number;
}

function collectClassicChartFrames(
  zip: JSZip,
  parsedXmlByPath: Map<string, ParsedXmlNode[] | null>,
): Map<string, ChartFrame> {
  const chartFrames = new Map<string, ChartFrame>();
  const slideRelsPaths = Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir && /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path));

  for (const relsPath of slideRelsPaths) {
    const relsTree = parsedXmlByPath.get(relsPath);
    if (!relsTree) continue;

    const chartTargets = new Map<string, string>();
    for (const rel of findAllElements(relsTree, "Relationship")) {
      const type = getAttr(rel, "Type") ?? "";
      if (!type.includes("/chart")) continue;
      const relId = getAttr(rel, "Id");
      const target = getAttr(rel, "Target");
      if (!relId || !target) continue;
      chartTargets.set(relId, resolveRelTarget(relsPath, target));
    }
    if (chartTargets.size === 0) continue;

    const slidePath = relsPath.replace("/_rels/", "/").replace(/\.rels$/, "");
    const slideTree = parsedXmlByPath.get(slidePath);
    if (!slideTree) continue;

    for (const frame of findAllElements(slideTree, "p:graphicFrame")) {
      const chartRefs = [
        ...findAllElements([frame], "c:chart"),
        ...findAllElements([frame], "cx:chart"),
        ...findAllElements([frame], "c16r3:chart"),
      ];
      const chartRef = chartRefs.find((element) => getAttr(element, "r:id"));
      const chartRId = chartRef ? getAttr(chartRef, "r:id") : undefined;
      if (!chartRId) continue;

      const targetPath = chartTargets.get(chartRId);
      if (!targetPath) continue;

      const xfrm = findAllElements([frame], "a:xfrm")[0];
      const ext = xfrm ? findAllElements([xfrm], "a:ext")[0] : undefined;
      const cx = ext ? Number(getAttr(ext, "cx")) : Number.NaN;
      const cy = ext ? Number(getAttr(ext, "cy")) : Number.NaN;
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) continue;

      chartFrames.set(targetPath, {
        slidePath,
        widthPx: cx / EMU_PER_PX,
        heightPx: cy / EMU_PER_PX,
      });
    }
  }

  return chartFrames;
}

function getManualLayoutValue(manualLayout: ParsedXmlNode, tag: "x" | "y" | "w" | "h"): number | undefined {
  const element = findAllElements([manualLayout], `c:${tag}`)[0];
  const value = element ? Number(getAttr(element, "val")) : Number.NaN;
  return Number.isFinite(value) ? value : undefined;
}

function roundTo4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function collectChartManualLayoutBoundsChecks(
  checks: StructuralValidationCheck[],
  chartPath: string,
  chartNumber: string,
  chartTree: ParsedXmlNode[] | null,
  frameByChart: Map<string, ChartFrame>,
): void {
  if (!chartTree) return;
  const frame = frameByChart.get(chartPath);
  const legendElement = findAllElements(chartTree, "c:legendPos")[0];
  const legendPos = legendElement ? getAttr(legendElement, "val") : undefined;
  let index = 0;

  for (const manualLayout of findAllElements(chartTree, "c:manualLayout")) {
    const x = getManualLayoutValue(manualLayout, "x");
    const y = getManualLayoutValue(manualLayout, "y");
    const w = getManualLayoutValue(manualLayout, "w");
    const h = getManualLayoutValue(manualLayout, "h");
    const errors: string[] = [];

    for (const [key, value] of Object.entries({ x, y, w, h })) {
      if (value === undefined) {
        errors.push(`manualLayout missing ${key}`);
      } else if (value < 0 || value > 1) {
        errors.push(`manualLayout ${key}=${value} is outside [0, 1]`);
      }
    }

    if (x !== undefined && w !== undefined && x + w > 1.0001) {
      errors.push(`manualLayout x+w=${roundTo4(x + w)} exceeds 1`);
    }
    if (y !== undefined && h !== undefined && y + h > 1.0001) {
      errors.push(`manualLayout y+h=${roundTo4(y + h)} exceeds 1`);
    }
    if (frame && frame.heightPx < 120) {
      errors.push(`manualLayout emitted for short frame ${roundTo4(frame.heightPx)}px on ${frame.slidePath}`);
    }
    if (frame && legendPos === "r" && w !== undefined && frame.widthPx >= 420 && w < 0.8) {
      errors.push(`right legend leaves only ${roundTo4(w * 100)}% plot width in ${roundTo4(frame.widthPx)}px frame`);
    }

    addCheck(
      checks,
      `chart.${chartNumber}.manual-layout.${index}`,
      errors.length === 0,
      errors.length === 0
        ? `Chart ${chartNumber} manual layout ${index + 1} stays within frame bounds.`
        : `Chart ${chartNumber} ${errors.join("; ")}.`,
    );
    index += 1;
  }
}

function collectThemeSchemaChecks(
  checks: StructuralValidationCheck[],
  themePath: string,
  themeTree: ParsedXmlNode[] | null,
): void {
  if (!themeTree) return;
  const requiredColorElements = [
    "a:dk1",
    "a:lt1",
    "a:dk2",
    "a:lt2",
    "a:accent1",
    "a:accent2",
    "a:accent3",
    "a:accent4",
    "a:accent5",
    "a:accent6",
    "a:hlink",
    "a:folHlink",
  ];

  const colorScheme = findAllElements(themeTree, "a:clrScheme")[0];
  addCheck(
    checks,
    `theme.${themePath}.color-scheme`,
    Boolean(colorScheme),
    colorScheme ? `${themePath} includes a color scheme.` : `${themePath} is missing a:clrScheme.`,
  );
  if (colorScheme) {
    const childTags = getChildTagNames(colorScheme);
    for (const required of requiredColorElements) {
      addCheck(
        checks,
        `theme.${themePath}.color.${required}`,
        childTags.includes(required),
        childTags.includes(required)
          ? `${themePath} color scheme includes ${required}.`
          : `${themePath} color scheme is missing ${required}.`,
      );
    }
  }

  const fontScheme = findAllElements(themeTree, "a:fontScheme")[0];
  addCheck(
    checks,
    `theme.${themePath}.font-scheme`,
    Boolean(fontScheme),
    fontScheme ? `${themePath} includes a font scheme.` : `${themePath} is missing a:fontScheme.`,
  );
  if (!fontScheme) return;

  for (const tag of ["a:majorFont", "a:minorFont"]) {
    const fontElement = getChildren(fontScheme).find((child) => getTagName(child) === tag);
    addCheck(
      checks,
      `theme.${themePath}.${tag}`,
      Boolean(fontElement),
      fontElement ? `${themePath} includes ${tag}.` : `${themePath} is missing ${tag}.`,
    );
    const latinElement = fontElement ? findAllElements([fontElement], "a:latin")[0] : undefined;
    const hasTypeface = latinElement ? Boolean(getAttr(latinElement, "typeface")) : false;
    addCheck(
      checks,
      `theme.${themePath}.${tag}.latin`,
      hasTypeface,
      hasTypeface ? `${themePath} ${tag} has a latin typeface.` : `${themePath} ${tag} is missing a latin typeface.`,
    );
  }
}

function collectSlideLayoutMasterChainChecks(
  checks: StructuralValidationCheck[],
  slidePath: string,
  packagePathSet: Set<string>,
  parsedXmlByPath: Map<string, ParsedXmlNode[] | null>,
): void {
  const slideNumber = slidePath.match(/slide(\d+)/)?.[1] ?? "?";
  const slideRelsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
  const slideRelsTree = parsedXmlByPath.get(slideRelsPath);
  if (!packagePathSet.has(slideRelsPath) || !slideRelsTree) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.slide-rels`,
      false,
      `${slidePath} is missing parseable relationships file ${slideRelsPath}.`,
    );
    return;
  }

  const layoutRel = findAllElements(slideRelsTree, "Relationship")
    .find((rel) => (getAttr(rel, "Type") ?? "").includes("/slideLayout"));
  const layoutTarget = layoutRel ? getAttr(layoutRel, "Target") : undefined;
  if (!layoutTarget) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.layout-rel`,
      false,
      `${slidePath} has no slideLayout relationship.`,
    );
    return;
  }

  const layoutPath = resolveRelTarget(slideRelsPath, layoutTarget);
  if (!packagePathSet.has(layoutPath)) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.layout-target`,
      false,
      `${slidePath} layout target ${layoutPath} is missing.`,
    );
    return;
  }

  const layoutRelsPath = layoutPath.replace("ppt/slideLayouts/", "ppt/slideLayouts/_rels/") + ".rels";
  const layoutRelsTree = parsedXmlByPath.get(layoutRelsPath);
  if (!packagePathSet.has(layoutRelsPath) || !layoutRelsTree) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.layout-rels`,
      false,
      `${layoutPath} is missing parseable relationships file ${layoutRelsPath}.`,
    );
    return;
  }

  const masterRel = findAllElements(layoutRelsTree, "Relationship")
    .find((rel) => (getAttr(rel, "Type") ?? "").includes("/slideMaster"));
  const masterTarget = masterRel ? getAttr(masterRel, "Target") : undefined;
  if (!masterTarget) {
    addCheck(
      checks,
      `slide.${slideNumber}.layout-chain.master-rel`,
      false,
      `${layoutPath} has no slideMaster relationship.`,
    );
    return;
  }

  const masterPath = resolveRelTarget(layoutRelsPath, masterTarget);
  addCheck(
    checks,
    `slide.${slideNumber}.layout-chain.master-target`,
    packagePathSet.has(masterPath),
    packagePathSet.has(masterPath)
      ? `${layoutPath} resolves to slide master ${masterPath}.`
      : `${layoutPath} master target ${masterPath} is missing.`,
  );
}

function collectNamespaceConsistencyChecks(
  checks: StructuralValidationCheck[],
  chartPath: string,
  chartXml: string | undefined,
): void {
  if (!chartXml) return;
  const fileName = chartPath.split("/").pop() ?? "";
  if (/^chartEx\d*\.xml$/.test(fileName)) {
    addCheck(
      checks,
      `namespace.${chartPath}`,
      chartXml.includes("cx:"),
      chartXml.includes("cx:")
        ? `${chartPath} uses the ChartEx namespace.`
        : `${chartPath} is a ChartEx part but does not use the cx namespace.`,
    );
  } else if (/^chart\d*\.xml$/.test(fileName)) {
    addCheck(
      checks,
      `namespace.${chartPath}`,
      chartXml.includes("c:"),
      chartXml.includes("c:")
        ? `${chartPath} uses the classic chart namespace.`
        : `${chartPath} is a classic chart part but does not use the c namespace.`,
    );
  }
}

export async function validatePptxStructure(
  buffer: Buffer,
): Promise<StructuralValidationSummary> {
  const checks: StructuralValidationCheck[] = [];

  try {
    const zip = await JSZip.loadAsync(buffer);
    const packagePaths = getPackagePaths(zip);
    const packagePathSet = new Set(packagePaths);
    const parsedXmlByPath = new Map<string, ParsedXmlNode[] | null>();
    const xmlTextByPath = new Map<string, string>();
    const referencedTargets = new Set<string>();

    addCheck(
      checks,
      "package.content-types",
      packagePathSet.has("[Content_Types].xml"),
      packagePathSet.has("[Content_Types].xml")
        ? "Package includes [Content_Types].xml."
        : "Package is missing [Content_Types].xml.",
    );
    addCheck(
      checks,
      "package.presentation",
      packagePathSet.has("ppt/presentation.xml"),
      packagePathSet.has("ppt/presentation.xml")
        ? "Package includes ppt/presentation.xml."
        : "Package is missing ppt/presentation.xml.",
    );
    addCheck(
      checks,
      "package.presentation-rels",
      packagePathSet.has("ppt/_rels/presentation.xml.rels"),
      packagePathSet.has("ppt/_rels/presentation.xml.rels")
        ? "Presentation relationships file is present."
        : "Presentation relationships file is missing.",
    );

    for (const path of packagePaths.filter((path) => path.endsWith(".xml") || path.endsWith(".rels"))) {
      const text = await readText(zip, path);
      if (text !== undefined) xmlTextByPath.set(path, text);
      parsedXmlByPath.set(path, await loadZipXml(zip, path, checks));
    }

    const contentTypesTree = parsedXmlByPath.get("[Content_Types].xml") ?? null;
    collectContentTypeChecks(checks, contentTypesTree, packagePaths);

    const presentationTree = parsedXmlByPath.get("ppt/presentation.xml") ?? null;
    collectPresentationChecks(checks, presentationTree);

    const slideFiles = packagePaths
      .filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file))
      .sort((a, b) => {
        const aNumber = Number.parseInt(a.match(/slide(\d+)/)?.[1] ?? "0", 10);
        const bNumber = Number.parseInt(b.match(/slide(\d+)/)?.[1] ?? "0", 10);
        return aNumber - bNumber;
      });

    addCheck(
      checks,
      "slides.present",
      slideFiles.length > 0,
      slideFiles.length > 0
        ? `Package contains ${slideFiles.length} slide part(s).`
        : "Package contains no slide parts.",
    );

    for (const slideFile of slideFiles) {
      const slideNumber = slideFile.match(/slide(\d+)/)?.[1] ?? "?";
      const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const slideTree = parsedXmlByPath.get(slideFile) ?? null;
      const relsTree = parsedXmlByPath.get(relsPath) ?? null;

      addCheck(
        checks,
        `slide.${slideNumber}.rels`,
        packagePathSet.has(relsPath),
        packagePathSet.has(relsPath)
          ? `Slide ${slideNumber} relationships file is present.`
          : `Slide ${slideNumber} relationships file is missing.`,
      );
      addCheck(
        checks,
        `slide.${slideNumber}.content-type`,
        contentTypesTree
          ? !checks.some((check) => check.id === `package.content-type.${slideFile}` && !check.passed)
          : false,
        contentTypesTree && !checks.some((check) => check.id === `package.content-type.${slideFile}` && !check.passed)
          ? `Slide ${slideNumber} has a declared content type.`
          : `Slide ${slideNumber} is missing from [Content_Types].xml.`,
      );

      collectDuplicateShapeIdChecks(checks, slideNumber, slideTree);
      collectRequiredAttributeChecks(checks, slideNumber, slideTree);
      collectAutoFitChecks(checks, slideNumber, slideTree);
      collectLongTableTextChecks(checks, slideNumber, slideTree);
      collectCustomDataConflictChecks(checks, slideNumber, slideTree);
      collectSlideRefChecks(checks, slideNumber, slideTree, relsTree);
      collectSlideLayoutMasterChainChecks(checks, slideFile, packagePathSet, parsedXmlByPath);
    }

    const relsFiles = packagePaths
      .filter((file) => file.endsWith(".rels"))
      .sort();
    for (const relsPath of relsFiles) {
      collectRelationshipChecks(
        checks,
        relsPath,
        parsedXmlByPath.get(relsPath) ?? null,
        packagePathSet,
        referencedTargets,
      );
    }
    collectReachablePartChecks(checks, packagePaths, referencedTargets);

    const frameByChart = collectClassicChartFrames(zip, parsedXmlByPath);
    const chartFiles = packagePaths
      .filter((file) => /^ppt\/charts\/chart\d+\.xml$/.test(file))
      .sort((a, b) => {
        const aNumber = Number.parseInt(a.match(/chart(\d+)/)?.[1] ?? "0", 10);
        const bNumber = Number.parseInt(b.match(/chart(\d+)/)?.[1] ?? "0", 10);
        return aNumber - bNumber;
      });

    for (const chartFile of chartFiles) {
      const chartNumber = chartFile.match(/chart(\d+)/)?.[1] ?? "?";
      const relsPath = `ppt/charts/_rels/chart${chartNumber}.xml.rels`;
      const chartTree = parsedXmlByPath.get(chartFile) ?? null;
      const relsTree = parsedXmlByPath.get(relsPath) ?? null;
      addCheck(
        checks,
        `chart.${chartNumber}.rels`,
        packagePathSet.has(relsPath),
        packagePathSet.has(relsPath)
          ? `Chart ${chartNumber} relationships file is present.`
          : `Chart ${chartNumber} relationships file is missing.`,
      );
      addCheck(
        checks,
        `chart.${chartNumber}.content-type`,
        contentTypesTree
          ? !checks.some((check) => check.id === `package.content-type.${chartFile}` && !check.passed)
          : false,
        contentTypesTree && !checks.some((check) => check.id === `package.content-type.${chartFile}` && !check.passed)
          ? `Chart ${chartNumber} has a declared content type.`
          : `Chart ${chartNumber} is missing from [Content_Types].xml.`,
      );
      collectChartFormatCodeChecks(checks, chartNumber, chartTree);
      collectChartWorkbookChecks(checks, chartNumber, relsPath, relsTree, packagePathSet);
      collectChartManualLayoutBoundsChecks(checks, chartFile, chartNumber, chartTree, frameByChart);
      collectNamespaceConsistencyChecks(checks, chartFile, xmlTextByPath.get(chartFile));
    }

    const chartExFiles = packagePaths
      .filter((file) => /^ppt\/charts\/chartEx\d+\.xml$/.test(file));
    for (const chartExFile of chartExFiles) {
      collectNamespaceConsistencyChecks(checks, chartExFile, xmlTextByPath.get(chartExFile));
    }

    const themeFiles = packagePaths
      .filter((file) => /^ppt\/theme\/theme\d*\.xml$/.test(file));
    addCheck(
      checks,
      "theme.present",
      themeFiles.length > 0,
      themeFiles.length > 0
        ? `Package contains ${themeFiles.length} theme part(s).`
        : "Package contains no theme files in ppt/theme/.",
    );
    for (const themePath of themeFiles) {
      collectThemeSchemaChecks(checks, themePath, parsedXmlByPath.get(themePath) ?? null);
    }

    const failureCount = checks.filter((check) => !check.passed && check.severity === "error").length;
    return {
      status: failureCount === 0 ? "passed" : "failed",
      checks,
      failureCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      checks: [
        {
          id: "package.load",
          passed: false,
          severity: "error",
          message: `Failed to open PPTX package: ${message}`,
        },
      ],
      failureCount: 1,
    };
  }
}
