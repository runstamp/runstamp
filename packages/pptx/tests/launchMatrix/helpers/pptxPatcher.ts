/**
 * PPTX Patcher — auto-fix operations on raw PPTX ZIP archives.
 * Used by the self-healing pipeline to fix common OOXML issues.
 */
import JSZip from "jszip";
import {
  parseXml,
  findAllElements,
  getAttr,
  getTagName,
  getChildren,
  getZipEntry,
  getZipPaths,
} from "../../helpers/xmlTestUtils.js";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

// ---------------------------------------------------------------------------
// XML round-trip parser (preserves structure for patching)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Individual fix operations
// ---------------------------------------------------------------------------

/**
 * Remove duplicate Default/Override entries from [Content_Types].xml.
 * Keeps the first occurrence of each Extension/PartName.
 */
export function removeDuplicateContentTypes(xml: string): string {
  const tree = patchParser.parse(xml);
  const typesEl = tree.find((el: any) => el["Types"]);
  if (!typesEl) return xml;

  const children: any[] = typesEl["Types"];
  const seenExtensions = new Set<string>();
  const seenPartNames = new Set<string>();
  const filtered: any[] = [];

  for (const child of children) {
    const tag = Object.keys(child).find(k => k !== ":@" && k !== "#text");
    if (tag === "Default") {
      const ext = child[":@"]?.["@_Extension"];
      if (ext && seenExtensions.has(ext)) continue;
      if (ext) seenExtensions.add(ext);
    } else if (tag === "Override") {
      const part = child[":@"]?.["@_PartName"];
      if (part && seenPartNames.has(part)) continue;
      if (part) seenPartNames.add(part);
    }
    filtered.push(child);
  }

  typesEl["Types"] = filtered;
  return patchBuilder.build(tree);
}

/**
 * Add missing attributes to elements matching a selector.
 * Rules: array of { tag, attr, value } — if element has tag and missing attr, add it.
 */
export interface AttributeRule {
  tag: string;
  attr: string;
  value: string;
}

export function addMissingAttributes(xml: string, rules: AttributeRule[]): string {
  const tree = patchParser.parse(xml);

  for (const rule of rules) {
    const elements = findAllElementsDeep(tree, rule.tag);
    for (const el of elements) {
      if (!el[":@"]) el[":@"] = {};
      if (!el[":@"][`@_${rule.attr}`]) {
        el[":@"][`@_${rule.attr}`] = rule.value;
      }
    }
  }

  return patchBuilder.build(tree);
}

/** Deep element finder compatible with patchParser output */
function findAllElementsDeep(nodes: any[], tag: string): any[] {
  const results: any[] = [];
  (function walk(arr: any[]) {
    if (!Array.isArray(arr)) return;
    for (const n of arr) {
      if (!n || typeof n !== "object") continue;
      for (const k of Object.keys(n)) {
        if (k === ":@" || k === "#text") continue;
        if (k === tag) results.push(n);
        if (Array.isArray(n[k])) walk(n[k]);
      }
    }
  })(nodes);
  return results;
}

/**
 * Reorder child elements of a parent to match expected order.
 * Elements not in expectedOrder are left in place after the last ordered element.
 */
export function reorderElements(xml: string, parentTag: string, expectedOrder: string[]): string {
  const tree = patchParser.parse(xml);
  const parents = findAllElementsDeep(tree, parentTag);

  for (const parent of parents) {
    const children: any[] = parent[parentTag];
    if (!Array.isArray(children)) continue;

    // Separate ordered and unordered children
    const ordered: any[] = [];
    const unordered: any[] = [];

    for (const child of children) {
      const childTag = Object.keys(child).find(k => k !== ":@" && k !== "#text");
      if (childTag && expectedOrder.includes(childTag)) {
        ordered.push(child);
      } else {
        unordered.push(child);
      }
    }

    // Sort ordered children by expectedOrder index
    ordered.sort((a, b) => {
      const aTag = Object.keys(a).find(k => k !== ":@" && k !== "#text") ?? "";
      const bTag = Object.keys(b).find(k => k !== ":@" && k !== "#text") ?? "";
      return expectedOrder.indexOf(aTag) - expectedOrder.indexOf(bTag);
    });

    // Rebuild: ordered first, then unordered
    parent[parentTag] = [...ordered, ...unordered];
  }

  return patchBuilder.build(tree);
}

/**
 * Remove relationships whose targets don't exist in the ZIP.
 */
export function removeOrphanedRelationships(relsXml: string, zipPaths: Set<string>, relsFilePath: string): string {
  const tree = patchParser.parse(relsXml);
  const relsRoot = tree.find((el: any) => el["Relationships"]);
  if (!relsRoot) return relsXml;

  const children: any[] = relsRoot["Relationships"];
  const parentDir = resolveParentDir(relsFilePath);

  const filtered = children.filter((child: any) => {
    const tag = Object.keys(child).find(k => k !== ":@" && k !== "#text");
    if (tag !== "Relationship") return true;

    const targetMode = child[":@"]?.["@_TargetMode"];
    if (targetMode === "External") return true;

    const target = child[":@"]?.["@_Target"];
    if (!target) return true;

    const resolved = resolveTarget(parentDir, target);
    return zipPaths.has(resolved);
  });

  relsRoot["Relationships"] = filtered;
  return patchBuilder.build(tree);
}

/**
 * Resolve a relative target path against a rels file's parent directory.
 * e.g., "ppt/slides/_rels/slide1.xml.rels" with target "../slideLayouts/slideLayout1.xml"
 * → "ppt/slideLayouts/slideLayout1.xml"
 */
function resolveParentDir(relsFilePath: string): string {
  // _rels/foo.xml.rels → parent is the directory above _rels
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
  const targetParts = target.split("/");

  for (const p of targetParts) {
    if (p === "..") {
      parts.pop();
    } else if (p !== ".") {
      parts.push(p);
    }
  }

  return parts.join("/");
}

// ---------------------------------------------------------------------------
// Full PPTX patcher
// ---------------------------------------------------------------------------

export interface PatchResult {
  applied: string[];
  buffer: Buffer;
}

/**
 * Apply all auto-fix patches to a PPTX buffer.
 * Returns the patched buffer and list of applied fixes.
 */
export async function patchPptx(buffer: Buffer): Promise<PatchResult> {
  const zip = await JSZip.loadAsync(buffer);
  const applied: string[] = [];
  const paths = new Set(
    Object.keys(zip.files).filter(p => !zip.files[p].dir),
  );

  // 1. Fix duplicate content types
  const ctFile = zip.file("[Content_Types].xml");
  if (ctFile) {
    const original = await ctFile.async("string");
    const fixed = removeDuplicateContentTypes(original);
    if (fixed !== original) {
      zip.file("[Content_Types].xml", fixed);
      applied.push("removeDuplicateContentTypes");
    }
  }

  // 2. Add missing typeface attributes to all slide XML
  const defaultAttrRules: AttributeRule[] = [
    { tag: "a:latin", attr: "typeface", value: "Calibri" },
    { tag: "a:ea", attr: "typeface", value: "" },
    { tag: "a:cs", attr: "typeface", value: "" },
  ];

  for (const path of paths) {
    if (!path.match(/^ppt\/slides\/slide\d+\.xml$/)) continue;
    const original = await zip.files[path].async("string");
    const fixed = addMissingAttributes(original, defaultAttrRules);
    if (fixed !== original) {
      zip.file(path, fixed);
      applied.push(`addMissingAttributes(${path})`);
    }
  }

  // 3. Fix presentation element order
  const presFile = zip.file("ppt/presentation.xml");
  if (presFile) {
    const original = await presFile.async("string");
    const fixed = reorderElements(original, "p:presentation", [
      "p:sldMasterIdLst",
      "p:sldIdLst",
      "p:sldSz",
      "p:notesSz",
      "p:defaultTextStyle",
    ]);
    if (fixed !== original) {
      zip.file("ppt/presentation.xml", fixed);
      applied.push("reorderPresentationElements");
    }
  }

  // 4. Remove orphaned relationships
  for (const path of paths) {
    if (!path.endsWith(".rels")) continue;
    const original = await zip.files[path].async("string");
    const fixed = removeOrphanedRelationships(original, paths, path);
    if (fixed !== original) {
      zip.file(path, fixed);
      applied.push(`removeOrphanedRelationships(${path})`);
    }
  }

  const result = await zip.generateAsync({ type: "nodebuffer" });
  return { applied, buffer: result };
}
