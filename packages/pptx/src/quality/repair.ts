import JSZip from "jszip";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { PRESENTATION_CHILD_ORDER } from "../ooxml/presentationOrder.js";
import type {
  RepairAction,
  RepairSummary,
  StructuralValidationSummary,
} from "./report.js";
import { validatePptxStructure } from "./structuralValidation.js";

const patchParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: false,
});

const patchBuilder = new XMLBuilder({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressBooleanAttributes: false,
  format: true,
});

interface AttributeRule {
  tag: string;
  attr: string;
  value: string;
}

export interface RepairExecutionResult {
  buffer: Buffer;
  repairSummary: RepairSummary;
  initialValidation: StructuralValidationSummary;
  finalValidation: StructuralValidationSummary;
}

function findAllElementsDeep(nodes: unknown, tag: string): any[] {
  const results: any[] = [];

  function walk(value: unknown): void {
    if (!Array.isArray(value)) return;
    for (const node of value) {
      if (!node || typeof node !== "object") continue;
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if (key === ":@" || key === "#text") continue;
        if (key === tag) results.push(node);
        walk((node as Record<string, unknown>)[key]);
      }
    }
  }

  walk(nodes);
  return results;
}

function getElementTag(node: Record<string, unknown>): string | undefined {
  return Object.keys(node).find(key => key !== ":@" && key !== "#text");
}

function resolveParentDir(relsFilePath: string): string {
  const parts = relsFilePath.split("/");
  const relsIdx = parts.lastIndexOf("_rels");
  if (relsIdx >= 0) {
    return parts.slice(0, relsIdx).join("/");
  }
  return parts.slice(0, -1).join("/");
}

function resolveTarget(parentDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);

  const parts = parentDir ? parentDir.split("/") : [];
  for (const part of target.split("/")) {
    if (part === "..") {
      parts.pop();
    } else if (part !== "." && part !== "") {
      parts.push(part);
    }
  }
  return parts.join("/");
}

function dedupeSlideIds(xml: string): string {
  const seenIds = new Set<string>();
  let nextSlideId = 256;
  return xml.replace(/(<p:sldId\b[^>]*\bid=")(\d+)(")/g, (_match, prefix: string, id: string, suffix: string) => {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      nextSlideId = Math.max(nextSlideId, numericId + 1);
    }
    if (!seenIds.has(id)) {
      seenIds.add(id);
      return `${prefix}${id}${suffix}`;
    }
    const replacement = String(nextSlideId++);
    seenIds.add(replacement);
    return `${prefix}${replacement}${suffix}`;
  });
}

function addNormAutofitFontScale(xml: string): string {
  return xml.replace(/<a:normAutofit\b(?![^>]*\bfontScale=)([^>]*)\/?>/g, (_match, attrs: string) => (
    `<a:normAutofit${attrs} fontScale="100000"/>`
  ));
}

function escapeChartFormatCodes(xml: string): string {
  return xml.replace(/<c:formatCode>([\s\S]*?)<\/c:formatCode>/g, (_match, formatCode: string) => {
    const escaped = formatCode
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<c:formatCode>${escaped}</c:formatCode>`;
  });
}

function collapseCustDataLists(xml: string): string {
  let seen = false;
  return xml.replace(/<p:custDataLst\b[\s\S]*?<\/p:custDataLst>/g, (match) => {
    if (seen) {
      return "";
    }
    seen = true;
    return match;
  });
}

export function removeDuplicateContentTypes(xml: string): string {
  const tree = patchParser.parse(xml);
  const typesEl = Array.isArray(tree)
    ? tree.find((element: any) => element.Types)
    : undefined;
  if (!typesEl?.Types || !Array.isArray(typesEl.Types)) return xml;

  const seenExtensions = new Set<string>();
  const seenPartNames = new Set<string>();
  const filtered: any[] = [];

  for (const child of typesEl.Types) {
    const tag = getElementTag(child);
    if (tag === "Default") {
      const ext = child?.[":@"]?.["@_Extension"];
      if (ext && seenExtensions.has(ext.toLowerCase())) continue;
      if (ext) seenExtensions.add(ext.toLowerCase());
    } else if (tag === "Override") {
      const part = child?.[":@"]?.["@_PartName"];
      if (part && seenPartNames.has(part.toLowerCase())) continue;
      if (part) seenPartNames.add(part.toLowerCase());
    }
    filtered.push(child);
  }

  typesEl.Types = filtered;
  return patchBuilder.build(tree);
}

export function addMissingAttributes(xml: string, rules: AttributeRule[]): string {
  const tree = patchParser.parse(xml);

  for (const rule of rules) {
    const elements = findAllElementsDeep(tree, rule.tag);
    for (const element of elements) {
      if (!element[":@"]) element[":@"] = {};
      if (!element[":@"][`@_${rule.attr}`]) {
        element[":@"][`@_${rule.attr}`] = rule.value;
      }
    }
  }

  return patchBuilder.build(tree);
}

export function reorderElements(
  xml: string,
  parentTag: string,
  expectedOrder: string[],
): string {
  const tree = patchParser.parse(xml);
  const parents = findAllElementsDeep(tree, parentTag);

  for (const parent of parents) {
    const children = parent[parentTag];
    if (!Array.isArray(children)) continue;

    const ordered: any[] = [];
    const unordered: any[] = [];

    for (const child of children) {
      const childTag = getElementTag(child);
      if (childTag && expectedOrder.includes(childTag)) {
        ordered.push(child);
      } else {
        unordered.push(child);
      }
    }

    ordered.sort((a, b) => {
      const aTag = getElementTag(a) ?? "";
      const bTag = getElementTag(b) ?? "";
      return expectedOrder.indexOf(aTag) - expectedOrder.indexOf(bTag);
    });

    parent[parentTag] = [...ordered, ...unordered];
  }

  return patchBuilder.build(tree);
}

export function removeOrphanedRelationships(
  relsXml: string,
  zipPaths: Set<string>,
  relsFilePath: string,
): string {
  const tree = patchParser.parse(relsXml);
  const relsRoot = Array.isArray(tree)
    ? tree.find((element: any) => element.Relationships)
    : undefined;
  if (!relsRoot?.Relationships || !Array.isArray(relsRoot.Relationships)) return relsXml;

  const parentDir = resolveParentDir(relsFilePath);
  relsRoot.Relationships = relsRoot.Relationships.filter((child: any) => {
    const tag = getElementTag(child);
    if (tag !== "Relationship") return true;

    const targetMode = child?.[":@"]?.["@_TargetMode"];
    if (targetMode === "External") return true;

    const target = child?.[":@"]?.["@_Target"];
    if (!target) return true;

    return zipPaths.has(resolveTarget(parentDir, target));
  });

  return patchBuilder.build(tree);
}


/**
 * Did a repair transform actually change the document, or only reformat it?
 *
 * Every action below is already guarded on `fixed !== original` — and every one
 * of them fired on a deck this engine had just written, which has no duplicate
 * content types, no out-of-sequence presentation children and no dangling
 * relationships. The transforms parse and re-serialise, so the *text* differs
 * even when nothing semantic does, and each rewrite was then reported as a
 * repair. Thirteen losses, all false positives, on a clean file.
 *
 * R17 makes an empty ledger a positive claim of fidelity. A ledger that reports
 * repairs which did not happen is worse than no ledger: it trains a caller to
 * ignore it. Comparing with insignificant whitespace collapsed separates the
 * reformatting from the repair.
 */
function semanticallyChanged(original: string, fixed: string): boolean {
  const normalize = (xml: string): string =>
    xml
      // Insignificant whitespace between elements.
      .replace(/>\s+</g, "><")
      // `<X/>` and `<X></X>` are the same element. The re-serialiser emits the
      // second form, which made every relationship part "differ" and every
      // `.rels` file report a removal that never happened.
      .replace(/<([A-Za-z][\w:.-]*)((?:\s[^<>]*?)?)><\/\1>/g, "<$1$2/>")
      .trim();
  return normalize(original) !== normalize(fixed);
}

export async function repairPptxStructure(
  buffer: Buffer,
): Promise<{ buffer: Buffer; actions: RepairAction[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const actions: RepairAction[] = [];
  const zipPaths = new Set(
    Object.keys(zip.files).filter(path => !zip.files[path].dir),
  );

  const contentTypesFile = zip.file("[Content_Types].xml");
  if (contentTypesFile) {
    const original = await contentTypesFile.async("string");
    const fixed = removeDuplicateContentTypes(original);
    if (fixed !== original && semanticallyChanged(original, fixed)) {
      zip.file("[Content_Types].xml", fixed, { date: contentTypesFile.date });
      actions.push({
        id: "remove_duplicate_content_types",
        description: "Removed duplicate Default and Override entries from [Content_Types].xml.",
        file: "[Content_Types].xml",
      });
    }
  }

  const attributeRules: AttributeRule[] = [
    { tag: "a:latin", attr: "typeface", value: "Calibri" },
    { tag: "a:ea", attr: "typeface", value: "" },
    { tag: "a:cs", attr: "typeface", value: "" },
  ];

  for (const path of zipPaths) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(path)) continue;
    const original = await zip.files[path].async("string");
    const withFontAttrs = addMissingAttributes(original, attributeRules);
    const withFontScale = addNormAutofitFontScale(withFontAttrs);
    const fixed = collapseCustDataLists(withFontScale);
    const fontAttrsChanged = semanticallyChanged(original, withFontAttrs);
    const fontScaleChanged = semanticallyChanged(withFontAttrs, withFontScale);
    const custDataChanged = semanticallyChanged(withFontScale, fixed);
    if (fontAttrsChanged || fontScaleChanged || custDataChanged) {
      zip.file(path, fixed, { date: zip.files[path].date });
      // Each stage is judged against the stage before it. Sharing one verdict
      // across the chain made a reformat by any stage report every stage.
      if (fontAttrsChanged) {
        actions.push({
          id: "fill_missing_font_typefaces",
          description: "Added missing typeface attributes required by PowerPoint font elements.",
          file: path,
        });
      }
      if (fontScaleChanged) {
        actions.push({
          id: "add_normautofit_font_scale",
          description: "Added explicit fontScale attributes to normAutofit nodes.",
          file: path,
        });
      }
      if (custDataChanged) {
        actions.push({
          id: "collapse_custdatalist",
          description: "Collapsed duplicate custDataLst blocks to a single surviving list.",
          file: path,
        });
      }
    }
  }

  const presentationFile = zip.file("ppt/presentation.xml");
  if (presentationFile) {
    const original = await presentationFile.async("string");
    const reordered = reorderElements(
      original,
      "p:presentation",
      [...PRESENTATION_CHILD_ORDER],
    );
    const fixed = dedupeSlideIds(reordered);
    const orderChanged = semanticallyChanged(original, reordered);
    const slideIdsChanged = semanticallyChanged(reordered, fixed);
    if (orderChanged || slideIdsChanged) {
      zip.file("ppt/presentation.xml", fixed, { date: presentationFile.date });
      // Each half of the pair is judged on its own semantic change, not on the
      // combined string difference: reordering and slide-id deduplication are
      // separate claims and only the one that happened should be reported.
      if (orderChanged) {
        actions.push({
          id: "reorder_presentation_elements",
          description: "Reordered presentation children to match OOXML schema sequence.",
          file: "ppt/presentation.xml",
        });
      }
      if (slideIdsChanged) {
        actions.push({
          id: "dedupe_slide_ids",
          description: "Reassigned duplicate slide ids in ppt/presentation.xml.",
          file: "ppt/presentation.xml",
        });
      }
    }
  }

  for (const path of zipPaths) {
    if (!/^ppt\/charts\/chart\d+\.xml$/.test(path)) continue;
    const original = await zip.files[path].async("string");
    const fixed = escapeChartFormatCodes(original);
    if (fixed !== original && semanticallyChanged(original, fixed)) {
      zip.file(path, fixed, { date: zip.files[path].date });
      actions.push({
        id: "escape_chart_format_codes",
        description: "Escaped XML-sensitive characters inside chart formatCode elements.",
        file: path,
      });
    }
  }

  for (const path of zipPaths) {
    if (!path.endsWith(".rels")) continue;
    const original = await zip.files[path].async("string");
    const fixed = removeOrphanedRelationships(original, zipPaths, path);
    if (fixed !== original && semanticallyChanged(original, fixed)) {
      zip.file(path, fixed, { date: zip.files[path].date });
      actions.push({
        id: "remove_orphaned_relationships",
        description: "Removed relationships whose targets are missing from the package.",
        file: path,
      });
    }
  }

  return {
    // Do not silently repackage a deck when every apparent change was only XML
    // formatting. A no-op repair should preserve the caller's bytes exactly.
    buffer: actions.length === 0
      ? buffer
      : await zip.generateAsync({ type: "nodebuffer" }),
    actions,
  };
}

export async function validateAndRepairPptx(
  buffer: Buffer,
): Promise<RepairExecutionResult> {
  const initialValidation = await validatePptxStructure(buffer);

  if (initialValidation.status === "passed") {
    return {
      buffer,
      initialValidation,
      finalValidation: initialValidation,
      repairSummary: {
        state: "not_needed",
        actions: [],
        initialFailureCount: 0,
        finalFailureCount: 0,
      },
    };
  }

  const repaired = await repairPptxStructure(buffer);
  const finalValidation = await validatePptxStructure(repaired.buffer);
  const state = repaired.actions.length === 0
    ? "failed"
    : finalValidation.status === "passed"
      ? "repaired"
      : "failed";

  return {
    buffer: repaired.buffer,
    initialValidation,
    finalValidation,
    repairSummary: {
      state,
      actions: repaired.actions,
      initialFailureCount: initialValidation.failureCount,
      finalFailureCount: finalValidation.failureCount,
    },
  };
}
