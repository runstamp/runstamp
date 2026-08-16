/**
 * Shared XML/ZIP test utilities extracted from sotaBenchmarks.test.ts
 * Used by: sotaBenchmarks.test.ts, sotaBenchmarks2.test.ts, sotaBenchmarks3.test.ts
 */

import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

// ---------------------------------------------------------------------------
// XML Parse Helpers
// ---------------------------------------------------------------------------

export const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export function parseXml(xml: string): any[] {
  return xmlParser.parse(xml);
}

/** Get the tag name of a parsed element node */
export function getTagName(el: any): string | undefined {
  return Object.keys(el).find(k => k !== ":@" && k !== "#text");
}

/** Get children of a parsed element */
export function getChildren(el: any): any[] {
  const tag = getTagName(el);
  return tag && Array.isArray(el[tag]) ? el[tag] : [];
}

/** Get attribute value from a parsed element */
export function getAttr(el: any, name: string): string | undefined {
  return el[":@"]?.[`@_${name}`];
}

/** Get ordered child tag names */
export function getChildTagNames(el: any): string[] {
  return getChildren(el)
    .map(c => getTagName(c))
    .filter((t): t is string => !!t);
}

/** Recursively find all elements with a given tag name */
export function findAllElements(tree: any[], tag: string): any[] {
  const results: any[] = [];
  (function walk(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      for (const k of Object.keys(n)) {
        if (k === ":@" || k === "#text") continue;
        if (k === tag) results.push(n);
        if (Array.isArray(n[k])) walk(n[k]);
      }
    }
  })(tree);
  return results;
}

/** Get text content from an element */
export function getText(el: any): string {
  return getChildren(el)
    .filter(c => "#text" in c)
    .map(c => String(c["#text"]))
    .join("");
}

// ---------------------------------------------------------------------------
// ZIP Helpers
// ---------------------------------------------------------------------------

export async function getZipEntry(buffer: Buffer, path: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  if (!file) throw new Error(`${path} not found`);
  return file.async("string");
}

export async function getZipPaths(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).filter(p => !zip.files[p].dir);
}

export async function zipHasFile(buffer: Buffer, path: string): Promise<boolean> {
  const zip = await JSZip.loadAsync(buffer);
  return zip.file(path) !== null;
}

/** 1×1 red PNG pixel for testing */
export const RED_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

/** Minimal video data URI for testing (MP4 ftyp header) */
export const TINY_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=";

/** Minimal audio data URI for testing (ID3 header) */
export const TINY_AUDIO = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMA==";

// ---------------------------------------------------------------------------
// Advanced Test Helpers
// ---------------------------------------------------------------------------

/** Collect all cNvPr ids from a parsed slide tree, verify uniqueness */
export function assertUniqueShapeIds(tree: any[]): number[] {
  const cNvPrs = findAllElements(tree, "p:cNvPr");
  const ids = cNvPrs.map(el => {
    const id = getAttr(el, "id");
    return id ? parseInt(id, 10) : NaN;
  }).filter(id => !isNaN(id));
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    throw new Error(`Duplicate shape IDs found: ${dupes.join(", ")}`);
  }
  return ids;
}

/** Assert every r:id / r:embed in slide XML has a matching Relationship in rels XML */
export function assertRIdsResolve(slideXml: string, relsXml: string): void {
  const relsTree = parseXml(relsXml);
  const rels = findAllElements(relsTree, "Relationship");
  const declaredIds = new Set(rels.map(r => getAttr(r, "Id")).filter(Boolean));

  // Find all r:id and r:embed references in slide XML
  const refPattern = /r:(?:id|embed|link)="(rId\d+)"/g;
  let match: RegExpExecArray | null;
  const missingIds: string[] = [];
  while ((match = refPattern.exec(slideXml)) !== null) {
    if (!declaredIds.has(match[1])) {
      missingIds.push(match[1]);
    }
  }
  if (missingIds.length > 0) {
    throw new Error(`Unresolved rIds in slide: ${missingIds.join(", ")}`);
  }
}

/** Verify child element ordering within a parent element */
export function assertElementOrder(parent: any, expectedOrder: string[]): void {
  const childTags = getChildTagNames(parent);
  // Filter to only the tags we care about
  const relevant = childTags.filter(t => expectedOrder.includes(t));
  for (let i = 0; i < relevant.length - 1; i++) {
    const aIdx = expectedOrder.indexOf(relevant[i]);
    const bIdx = expectedOrder.indexOf(relevant[i + 1]);
    if (aIdx > bIdx) {
      throw new Error(
        `Element order violation: ${relevant[i]} (idx ${aIdx}) appears before ${relevant[i + 1]} (idx ${bIdx}). Expected order: ${expectedOrder.join(" → ")}`
      );
    }
  }
}

/** Extract and parse all XML files from a PPTX buffer */
export async function getAllXmlFiles(buffer: Buffer): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const xmlFiles = new Map<string, string>();
  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir && p.endsWith(".xml"));
  for (const path of paths) {
    const content = await zip.files[path].async("string");
    xmlFiles.set(path, content);
  }
  // Also include .rels files
  const relsPaths = Object.keys(zip.files).filter(p => !zip.files[p].dir && p.endsWith(".rels"));
  for (const path of relsPaths) {
    const content = await zip.files[path].async("string");
    xmlFiles.set(path, content);
  }
  return xmlFiles;
}

/** Assert all XML files in a PPTX buffer are well-formed (parseable) */
export async function assertWellFormedXml(buffer: Buffer): Promise<void> {
  const xmlFiles = await getAllXmlFiles(buffer);
  const errors: string[] = [];
  for (const [path, content] of xmlFiles) {
    try {
      parseXml(content);
    } catch (e) {
      errors.push(`${path}: ${(e as Error).message}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Malformed XML files:\n${errors.join("\n")}`);
  }
}

/** Count all shape elements (p:sp, p:pic, p:graphicFrame, p:cxnSp, p:grpSp) in a parsed tree */
export function getShapeCount(tree: any[]): { sp: number; pic: number; graphicFrame: number; cxnSp: number; grpSp: number; total: number } {
  const sp = findAllElements(tree, "p:sp").length;
  const pic = findAllElements(tree, "p:pic").length;
  const graphicFrame = findAllElements(tree, "p:graphicFrame").length;
  const cxnSp = findAllElements(tree, "p:cxnSp").length;
  const grpSp = findAllElements(tree, "p:grpSp").length;
  return { sp, pic, graphicFrame, cxnSp, grpSp, total: sp + pic + graphicFrame + cxnSp + grpSp };
}

/** Get ZIP entry as Buffer (for binary files like .xlsx) */
export async function getZipEntryBuffer(buffer: Buffer, path: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  if (!file) throw new Error(`${path} not found`);
  return file.async("nodebuffer");
}
