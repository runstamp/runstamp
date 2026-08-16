import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { Errors } from "../errors.js";
import type { DocxDocument, DocxTextRun } from "../schema.js";

type XmlNode = Record<string, unknown>;
type ParsedTextStyle = NonNullable<DocxTextRun["style"]>;

export interface ParsedTextBlock {
  kind: "paragraph" | "heading";
  signature: string;
  text: string;
  runs: DocxTextRun[];
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  bookmarkId?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  keepLines?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  indent?: {
    firstLine?: number;
    left?: number;
    right?: number;
  };
}

export interface ParsedPageBreakBlock {
  kind: "pageBreak";
  signature: string;
}

export interface ParsedTableCell {
  text: string;
  runs: DocxTextRun[];
}

export interface ParsedTableRow {
  cells: ParsedTableCell[];
}

export interface ParsedTableBlock {
  kind: "table";
  signature: string;
  rows: ParsedTableRow[];
}

export type ParsedBlock = ParsedTextBlock | ParsedTableBlock | ParsedPageBreakBlock;

export interface ParsedCompareDocument {
  document: DocxDocument;
  blocks: ParsedBlock[];
  hasTrackedRevisions: boolean;
}

const orderedXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
});

const flatXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const TRACKED_REVISION_PATTERNS = [
  /<w:ins(?:\s|>)/,
  /<w:del(?:\s|>)/,
  /<w:moveFrom(?:\s|>)/,
  /<w:moveTo(?:\s|>)/,
  /<w:pPrChange(?:\s|>)/,
  /<w:tblPrChange(?:\s|>)/,
  /<w:cellIns(?:\s|>)/,
  /<w:cellDel(?:\s|>)/,
];

export async function parseDocxBuffer(buffer: Buffer): Promise<ParsedCompareDocument> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!documentXml) {
    throw Errors.invalidDocument("DOCX compare could not find word/document.xml");
  }

  const parsed = orderedXmlParser.parse(documentXml) as XmlNode[];
  const hyperlinkMap = await parseHyperlinkRelationships(zip);
  const bodyChildren = getBodyChildren(parsed);
  const blocks: ParsedBlock[] = [];
  let tableOfContents: DocxDocument["tableOfContents"];

  for (const child of bodyChildren) {
    if ("w:sdt" in child) {
      tableOfContents ??= parseTableOfContents(child);
      continue;
    }

    if ("w:p" in child) {
      const paragraph = parseParagraphBlock(child, hyperlinkMap);
      if (paragraph) {
        blocks.push(paragraph);
      }
      continue;
    }

    if ("w:tbl" in child) {
      blocks.push(parseTableBlock(child, hyperlinkMap));
    }
  }

  return {
    document: {
      type: "DocxDocument",
      orientation: "portrait",
      pageSize: "letter",
      ...(tableOfContents ? { tableOfContents } : {}),
      pages: [
        {
          elements: blocks.map(blockToDocxElement),
        },
      ],
    },
    blocks,
    hasTrackedRevisions: TRACKED_REVISION_PATTERNS.some((pattern) => pattern.test(documentXml)),
  };
}

async function parseHyperlinkRelationships(zip: JSZip): Promise<Map<string, string>> {
  const relationshipsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
  const relationshipMap = new Map<string, string>();

  if (!relationshipsXml) {
    return relationshipMap;
  }

  const parsed = flatXmlParser.parse(relationshipsXml);
  const relationships = parsed?.Relationships?.Relationship;
  const entries = Array.isArray(relationships) ? relationships : relationships ? [relationships] : [];

  for (const entry of entries) {
    if (entry?.["@_Id"] && entry?.["@_Target"]) {
      relationshipMap.set(String(entry["@_Id"]), String(entry["@_Target"]));
    }
  }

  return relationshipMap;
}

function getBodyChildren(parsed: XmlNode[]): XmlNode[] {
  const documentNode = parsed.find((node) => "w:document" in node);
  const documentChildren = getElementChildren(documentNode, "w:document");
  const bodyNode = documentChildren.find((node) => "w:body" in node);
  return getElementChildren(bodyNode, "w:body").filter((child) => !("w:sectPr" in child));
}

function getElementChildren(node: XmlNode | undefined, tag: string): XmlNode[] {
  if (!node) {
    return [];
  }

  const children = node[tag];
  return Array.isArray(children) ? (children as XmlNode[]) : [];
}

function getNodeAttributes(node: XmlNode | undefined): Record<string, unknown> {
  const attributes = node?.[":@"];
  return attributes && typeof attributes === "object"
    ? (attributes as Record<string, unknown>)
    : {};
}

function getAttribute(node: XmlNode | undefined, name: string): string | undefined {
  const value = getNodeAttributes(node)[name];
  return typeof value === "string" ? value : undefined;
}

function getTextContent(children: XmlNode[]): string {
  let text = "";

  for (const child of children) {
    if (typeof child["#text"] === "string") {
      text += child["#text"];
    }
  }

  return text;
}

function areStylesEqual(left: DocxTextRun["style"], right: DocxTextRun["style"]): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function normalizeRuns(runs: DocxTextRun[]): DocxTextRun[] {
  const normalized: DocxTextRun[] = [];

  for (const run of runs) {
    if (!run.text) {
      continue;
    }

    const last = normalized[normalized.length - 1];
    if (
      last &&
      last.hyperlink === run.hyperlink &&
      areStylesEqual(last.style, run.style) &&
      JSON.stringify(last.revision ?? null) === JSON.stringify(run.revision ?? null)
    ) {
      last.text += run.text;
      continue;
    }

    normalized.push({
      text: run.text,
      hyperlink: run.hyperlink,
      style: run.style ? { ...run.style } : undefined,
      revision: run.revision ? { ...run.revision } : undefined,
    });
  }

  return normalized;
}

function parseParagraphBlock(
  node: XmlNode,
  hyperlinkMap: Map<string, string>,
): ParsedTextBlock | ParsedPageBreakBlock | undefined {
  const children = getElementChildren(node, "w:p");
  const paragraphStyle = parseParagraphStyle(children);
  if (paragraphStyle.isTocParagraph) {
    return undefined;
  }

  if (isPageBreakParagraph(children)) {
    return {
      kind: "pageBreak",
      signature: JSON.stringify(node),
    };
  }

  const runs = normalizeRuns(parseParagraphRuns(children, hyperlinkMap));
  const text = runs.map((run) => run.text).join("");

  if (paragraphStyle.headingLevel) {
    return {
      kind: "heading",
      level: paragraphStyle.headingLevel,
      signature: JSON.stringify(node),
      runs,
      text,
      bookmarkId: paragraphStyle.bookmarkId,
      textAlign: paragraphStyle.textAlign,
      keepNext: paragraphStyle.keepNext,
      pageBreakBefore: paragraphStyle.pageBreakBefore,
    };
  }

  if (text.length === 0) {
    return undefined;
  }

  return {
    kind: "paragraph",
    signature: JSON.stringify(node),
    runs,
    text,
    bookmarkId: paragraphStyle.bookmarkId,
    textAlign: paragraphStyle.textAlign,
    keepLines: paragraphStyle.keepLines,
    keepNext: paragraphStyle.keepNext,
    pageBreakBefore: paragraphStyle.pageBreakBefore,
    indent: paragraphStyle.indent,
  };
}

function parseParagraphStyle(children: XmlNode[]): {
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  bookmarkId?: string;
  isTocParagraph: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
  keepLines?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  indent?: {
    firstLine?: number;
    left?: number;
    right?: number;
  };
} {
  const pPrNode = children.find((child) => "w:pPr" in child);
  const pPrChildren = pPrNode ? getElementChildren(pPrNode, "w:pPr") : [];
  const pStyleNode = pPrChildren.find((child) => "w:pStyle" in child);
  const outlineNode = pPrChildren.find((child) => "w:outlineLvl" in child);
  const alignNode = pPrChildren.find((child) => "w:jc" in child);
  const indentNode = pPrChildren.find((child) => "w:ind" in child);
  const styleValue = getAttribute(pStyleNode, "@_w:val");
  const outlineValue = Number.parseInt(getAttribute(outlineNode, "@_w:val") ?? "", 10);
  const headingMatch = styleValue?.match(/^Heading([1-6])$/i);
  const bookmarkStart = children.find((child) => "w:bookmarkStart" in child);
  const bookmarkId = getAttribute(bookmarkStart, "@_w:name");
  const textAlignValue = getAttribute(alignNode, "@_w:val");
  const indent = indentNode
    ? {
        ...(parseOptionalInt(getAttribute(indentNode, "@_w:firstLine")) !== undefined
          ? { firstLine: parseOptionalInt(getAttribute(indentNode, "@_w:firstLine")) }
          : {}),
        ...(parseOptionalInt(getAttribute(indentNode, "@_w:left")) !== undefined
          ? { left: parseOptionalInt(getAttribute(indentNode, "@_w:left")) }
          : {}),
        ...(parseOptionalInt(getAttribute(indentNode, "@_w:right")) !== undefined
          ? { right: parseOptionalInt(getAttribute(indentNode, "@_w:right")) }
          : {}),
      }
    : undefined;

  return {
    ...(headingMatch
      ? {
          headingLevel: Number.parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6,
        }
      : Number.isInteger(outlineValue) && outlineValue >= 0 && outlineValue <= 5
        ? {
            headingLevel: (outlineValue + 1) as 1 | 2 | 3 | 4 | 5 | 6,
          }
        : {}),
    ...(bookmarkId ? { bookmarkId } : {}),
    ...(textAlignValue
      ? {
          textAlign: (textAlignValue === "both" ? "justify" : textAlignValue) as "left" | "center" | "right" | "justify",
        }
      : {}),
    ...(pPrChildren.some((child) => "w:keepLines" in child)
      ? { keepLines: parseOnOffBoolean(pPrChildren.find((child) => "w:keepLines" in child)) }
      : {}),
    ...(pPrChildren.some((child) => "w:keepNext" in child)
      ? { keepNext: parseOnOffBoolean(pPrChildren.find((child) => "w:keepNext" in child)) }
      : {}),
    ...(pPrChildren.some((child) => "w:pageBreakBefore" in child)
      ? { pageBreakBefore: parseOnOffBoolean(pPrChildren.find((child) => "w:pageBreakBefore" in child)) }
      : {}),
    ...(indent && Object.keys(indent).length > 0 ? { indent } : {}),
    isTocParagraph: styleValue === "TOCHeading" || /^TOC\d+$/i.test(styleValue ?? ""),
  };
}

function parseOptionalInt(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOnOffBoolean(node: XmlNode | undefined): boolean {
  const raw = getAttribute(node, "@_w:val");
  return raw !== "0" && raw !== "false";
}

function isPageBreakParagraph(children: XmlNode[]): boolean {
  let sawPageBreak = false;
  let sawVisibleText = false;

  for (const child of children) {
    if (!("w:r" in child)) {
      continue;
    }

    for (const runChild of getElementChildren(child, "w:r")) {
      if ("w:t" in runChild || "w:delText" in runChild) {
        const text = getTextContent(
          getElementChildren(runChild, "w:t").length > 0
            ? getElementChildren(runChild, "w:t")
            : getElementChildren(runChild, "w:delText"),
        );
        if (text.length > 0) {
          sawVisibleText = true;
        }
      }

      if ("w:br" in runChild && getAttribute(runChild, "@_w:type") === "page") {
        sawPageBreak = true;
      }
    }
  }

  return sawPageBreak && !sawVisibleText;
}

function resolveHyperlink(node: XmlNode, hyperlinkMap: Map<string, string>): string | undefined {
  const relationshipId = getAttribute(node, "@_r:id");
  const anchor = getAttribute(node, "@_w:anchor");
  if (relationshipId && hyperlinkMap.has(relationshipId)) {
    return hyperlinkMap.get(relationshipId);
  }
  if (anchor) {
    return `#${anchor}`;
  }
  return undefined;
}

function parseParagraphRuns(children: XmlNode[], hyperlinkMap: Map<string, string>): DocxTextRun[] {
  const runs: DocxTextRun[] = [];

  for (const child of children) {
    if ("w:r" in child) {
      const run = parseRunNode(child, undefined);
      if (run) {
        runs.push(run);
      }
      continue;
    }

    if ("w:hyperlink" in child) {
      const hyperlink = resolveHyperlink(child, hyperlinkMap);
      const hyperlinkChildren = getElementChildren(child, "w:hyperlink");
      for (const hyperlinkChild of hyperlinkChildren) {
        if (!("w:r" in hyperlinkChild)) {
          continue;
        }
        const run = parseRunNode(hyperlinkChild, hyperlink);
        if (run) {
          runs.push(run);
        }
      }
      continue;
    }

    if ("w:ins" in child || "w:del" in child || "w:moveFrom" in child || "w:moveTo" in child) {
      const wrapperTag = "w:ins" in child
        ? "w:ins"
        : "w:del" in child
          ? "w:del"
          : "w:moveFrom" in child
            ? "w:moveFrom"
            : "w:moveTo";
      for (const wrapperChild of getElementChildren(child, wrapperTag)) {
        if (!("w:r" in wrapperChild)) {
          continue;
        }
        const run = parseRunNode(wrapperChild, undefined);
        if (run) {
          runs.push(run);
        }
      }
    }
  }

  return runs;
}

function parseRunNode(node: XmlNode, hyperlink: string | undefined): DocxTextRun | undefined {
  const children = getElementChildren(node, "w:r");
  const styleNode = children.find((child) => "w:rPr" in child);
  const style = styleNode ? parseRunStyle(getElementChildren(styleNode, "w:rPr")) : undefined;

  let text = "";

  for (const child of children) {
    if ("w:t" in child || "w:delText" in child) {
      const tag = "w:t" in child ? "w:t" : "w:delText";
      text += getTextContent(getElementChildren(child, tag));
      continue;
    }

    if ("w:tab" in child) {
      text += "\t";
      continue;
    }

    if ("w:br" in child || "w:cr" in child) {
      text += "\n";
      continue;
    }

    if ("w:noBreakHyphen" in child || "w:softHyphen" in child) {
      text += "-";
    }
  }

  if (!text) {
    return undefined;
  }

  return {
    text,
    hyperlink,
    style,
  };
}

function parseRunStyle(children: XmlNode[]): ParsedTextStyle | undefined {
  const style: ParsedTextStyle = {};

  const boldNode = children.find((child) => "w:b" in child);
  const italicNode = children.find((child) => "w:i" in child);
  const strikeNode = children.find((child) => "w:strike" in child);
  const colorNode = children.find((child) => "w:color" in child);
  const highlightNode = children.find((child) => "w:highlight" in child);
  const sizeNode = children.find((child) => "w:sz" in child);
  const fontNode = children.find((child) => "w:rFonts" in child);
  const underlineNode = children.find((child) => "w:u" in child);

  if (boldNode && parseOnOffBoolean(boldNode)) {
    style.fontWeight = "bold";
  }

  if (italicNode && parseOnOffBoolean(italicNode)) {
    style.fontStyle = "italic";
  }

  if (strikeNode && parseOnOffBoolean(strikeNode)) {
    style.textDecoration = "line-through";
  }

  const underlineValue = getAttribute(underlineNode, "@_w:val");
  if (underlineNode && underlineValue !== "none") {
    style.textDecoration = style.textDecoration === "line-through"
      ? "underline line-through"
      : "underline";
  }

  const colorValue = getAttribute(colorNode, "@_w:val");
  if (colorValue && colorValue !== "auto") {
    style.color = colorValue.replace(/^#/, "").toUpperCase();
  }

  const highlightValue = getAttribute(highlightNode, "@_w:val");
  if (highlightValue) {
    style.backgroundColor = highlightValue;
  }

  const sizeValue = Number.parseInt(getAttribute(sizeNode, "@_w:val") ?? "", 10);
  if (Number.isFinite(sizeValue)) {
    style.fontSize = sizeValue / 2;
  }

  const fontFamily = getAttribute(fontNode, "@_w:ascii") ?? getAttribute(fontNode, "@_w:hAnsi");
  if (fontFamily) {
    style.fontFamily = fontFamily;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function parseTableBlock(node: XmlNode, hyperlinkMap: Map<string, string>): ParsedTableBlock {
  const rows = getElementChildren(node, "w:tbl")
    .filter((child) => "w:tr" in child)
    .map((rowNode) => ({
      cells: getElementChildren(rowNode, "w:tr")
        .filter((child) => "w:tc" in child)
        .map((cellNode) => parseTableCell(cellNode, hyperlinkMap)),
    }));

  return {
    kind: "table",
    signature: JSON.stringify(node),
    rows,
  };
}

function parseTableCell(node: XmlNode, hyperlinkMap: Map<string, string>): ParsedTableCell {
  const paragraphBlocks = getElementChildren(node, "w:tc")
    .filter((child) => "w:p" in child)
    .map((child) => parseParagraphBlock(child, hyperlinkMap))
    .filter((block): block is ParsedTextBlock => block !== undefined && block.kind !== "pageBreak");

  const runs = normalizeRuns(
    paragraphBlocks.flatMap((block, index) => {
      const prefix = index === 0 ? [] : [{ text: "\n" } satisfies DocxTextRun];
      return [...prefix, ...block.runs];
    }),
  );

  return {
    text: paragraphBlocks.map((block) => block.text).join("\n"),
    runs,
  };
}

function parseTableOfContents(node: XmlNode): DocxDocument["tableOfContents"] | undefined {
  const alias = findFirstAttributeValue(node, "w:alias", "@_w:val");
  const instructions = collectInstructionText(node);
  if (!instructions.includes("TOC")) {
    return undefined;
  }

  const maxLevelMatch = instructions.match(/\\o\s+"(\d)-(\d)"/);
  return {
    title: alias ?? "Table of Contents",
    maxLevel: maxLevelMatch ? Number.parseInt(maxLevelMatch[2], 10) : 3,
    showPageNumbers: !instructions.includes("\\n"),
    hyperlinks: instructions.includes("\\h"),
  };
}

function collectInstructionText(node: XmlNode): string {
  let instructions = "";
  for (const [key, value] of Object.entries(node)) {
    if (key === "w:instrText") {
      instructions += getTextContent(Array.isArray(value) ? (value as XmlNode[]) : []);
      continue;
    }

    if (key === ":@" || !Array.isArray(value)) {
      continue;
    }

    for (const child of value as XmlNode[]) {
      instructions += collectInstructionText(child);
    }
  }
  return instructions;
}

function findFirstAttributeValue(node: XmlNode, tag: string, attribute: string): string | undefined {
  if (tag in node) {
    const value = getAttribute(node, attribute);
    if (value) {
      return value;
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === ":@" || !Array.isArray(value)) {
      continue;
    }

    for (const child of value as XmlNode[]) {
      if (tag in child) {
        const match = getAttribute(child, attribute);
        if (match) {
          return match;
        }
      }
      const nested = findFirstAttributeValue(child, tag, attribute);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function blockToDocxElement(block: ParsedBlock): DocxDocument["pages"][number]["elements"][number] {
  if (block.kind === "heading") {
    return {
      type: "heading",
      level: block.level ?? 1,
      text: block.text,
      runs: block.runs,
      ...(block.bookmarkId ? { bookmarkId: block.bookmarkId } : {}),
      ...(block.textAlign ? { style: { textAlign: block.textAlign } } : {}),
      ...(block.keepNext !== undefined ? { keepNext: block.keepNext } : {}),
      ...(block.pageBreakBefore !== undefined ? { pageBreakBefore: block.pageBreakBefore } : {}),
    };
  }

  if (block.kind === "paragraph") {
    return {
      type: "paragraph",
      text: block.text,
      runs: block.runs,
      ...(block.textAlign ? { style: { textAlign: block.textAlign } } : {}),
      ...(block.keepLines !== undefined ? { keepLines: block.keepLines } : {}),
      ...(block.keepNext !== undefined ? { keepNext: block.keepNext } : {}),
      ...(block.pageBreakBefore !== undefined ? { pageBreakBefore: block.pageBreakBefore } : {}),
      ...(block.indent ? { indent: block.indent } : {}),
    };
  }

  if (block.kind === "pageBreak") {
    return {
      type: "page-break",
    };
  }

  if (block.kind === "table") {
    return {
      type: "table",
      rows: block.rows.map((row: ParsedTableRow) => ({
        cells: row.cells.map((cell: ParsedTableCell) => ({
          text: cell.text,
          runs: cell.runs,
        })),
      })),
    };
  }

  return {
    type: "page-break",
  };
}
