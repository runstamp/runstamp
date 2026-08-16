import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  trimValues: false,
});

export type ParsedXmlNode = Record<string, unknown>;

export function parseXml(xml: string): ParsedXmlNode[] {
  return xmlParser.parse(xml) as ParsedXmlNode[];
}

export function getTagName(el: unknown): string | undefined {
  if (!el || typeof el !== "object") return undefined;
  return Object.keys(el as Record<string, unknown>)
    .find((key) => key !== ":@" && key !== "#text");
}

export function getChildren(el: unknown): ParsedXmlNode[] {
  if (!el || typeof el !== "object") return [];
  const tag = getTagName(el);
  const children = tag ? (el as Record<string, unknown>)[tag] : undefined;
  return Array.isArray(children) ? children as ParsedXmlNode[] : [];
}

export function getAttr(el: unknown, name: string): string | undefined {
  if (!el || typeof el !== "object") return undefined;
  const attrs = (el as Record<string, unknown>)[":@"];
  if (!attrs || typeof attrs !== "object") return undefined;
  const value = (attrs as Record<string, unknown>)[`@_${name}`];
  return typeof value === "string" ? value : undefined;
}

export function getChildTagNames(el: unknown): string[] {
  return getChildren(el)
    .map((child) => getTagName(child))
    .filter((tag): tag is string => Boolean(tag));
}

export function findAllElements(tree: unknown, tag: string): ParsedXmlNode[] {
  const results: ParsedXmlNode[] = [];

  function walk(nodes: unknown): void {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if (key === ":@" || key === "#text") continue;
        if (key === tag) results.push(node as ParsedXmlNode);
        walk((node as Record<string, unknown>)[key]);
      }
    }
  }

  walk(tree);
  return results;
}

export function getText(el: unknown): string {
  return getChildren(el)
    .filter((child) => Object.prototype.hasOwnProperty.call(child, "#text"))
    .map((child) => String((child as Record<string, unknown>)["#text"]))
    .join("");
}

export function assertUniqueShapeIds(tree: ParsedXmlNode[]): number[] {
  const cNvPrs = findAllElements(tree, "p:cNvPr");
  const ids = cNvPrs
    .map((el) => {
      const id = getAttr(el, "id");
      return id ? Number.parseInt(id, 10) : Number.NaN;
    })
    .filter((id) => !Number.isNaN(id));
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    throw new Error(`Duplicate shape IDs found: ${duplicates.join(", ")}`);
  }
  return ids;
}
