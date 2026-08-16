import { analyzePhase3DocumentDetailed } from "./phase3-render.js";
import { analyzePhase5DocumentDetailed } from "./phase5-table-layout.js";
import type { PdfDocumentLayoutNode, PdfPhase3ContainerNode, PdfPhase3HeadingNode, PdfPhase3ParagraphNode } from "./phase3-types.js";
import type { PdfGraphic } from "./phase4-types.js";
import type {
  PdfDocumentAccessibilitySpec,
  PdfMarkedContentSpec,
  PdfRenderedPage,
} from "./pdf-renderer.js";
import {
  addDynamicFooters,
  addDynamicHeaders,
  addFormAnnotations,
  addLinkAnnotations,
  addPageNumbers,
  addTocContent,
  buildHeadings,
  buildMetadataXml,
  buildOutlineTree,
  materializePhase6Document,
  shouldBuildBookmarks,
} from "./phase6-analyze.js";
import type { Phase6HeadingEntry } from "./phase6-analyze.js";
import type { PdfDocumentPhase6, PdfPhase6DocumentNode } from "./phase6-types.js";
import type {
  PdfDocumentPhase7,
  PdfPhase7AccessibilityOptions,
  PdfPhase7DocumentNode,
  PdfPhase7FigureNode,
  PdfPhase7GraphicNode,
  PdfPhase7ListItemNode,
  PdfPhase7ListNode,
} from "./phase7-types.js";

interface Phase7StructureSpec {
  alt?: string;
  headers?: string[];
  id: string;
  lang?: string;
  parentId?: string | null;
  role: string;
  scope?: "Column" | "Row";
}

interface FigurePlacementSpec {
  alt: string;
  format?: "jpeg" | "png" | "svg";
  height: number;
  lang?: string;
  placeholderId: string;
  structureId: string;
  source: Buffer | Uint8Array | string;
  width: number | string;
}

interface GraphicPlacementSpec {
  alt?: string;
  graphic: PdfGraphic;
  lang?: string;
  placeholderId: string;
  structureId?: string;
}

interface Phase7MaterializedDocument {
  figures: FigurePlacementSpec[];
  graphics: GraphicPlacementSpec[];
  rendered: PdfDocumentPhase6;
  structure: Phase7StructureSpec[];
}

export interface Phase7DocumentAnalysis {
  headings: Phase6HeadingEntry[];
  interactive: NonNullable<Parameters<typeof addPageNumbers>[2]> & {
    accessibility: PdfDocumentAccessibilitySpec;
  };
  meta: NonNullable<PdfDocumentPhase7["meta"]>;
  page: Awaited<ReturnType<typeof analyzePhase3DocumentDetailed>>["page"];
  pages: PdfRenderedPage[];
}

const DEFAULT_LANG = "en-US";
const DEFAULT_LINE_HEIGHT = 1.4;
const DEFAULT_LIST_FONT_SIZE = 10;
const DEFAULT_LIST_LINE_HEIGHT = 1.3;

function clonePages(pages: PdfRenderedPage[]): PdfRenderedPage[] {
  return pages.map((page) => ({
    ...page,
    annotations: [...(page.annotations ?? [])],
    extraCommands: [...(page.extraCommands ?? [])],
    graphics: [...(page.graphics ?? [])],
    texts: page.texts.map((text) => ({ ...text })),
  }));
}

function hasTableNode(nodes: PdfPhase7DocumentNode[]): boolean {
  return nodes.some((node) => {
    if (node.type === "table") {
      return true;
    }
    if (node.type === "container") {
      return hasTableNode(node.children as PdfPhase7DocumentNode[]);
    }
    return false;
  });
}

function getChildren(document: PdfDocumentPhase7): PdfPhase7DocumentNode[] {
  const hasChildren = Array.isArray(document.children);
  const hasContent = Array.isArray(document.content);
  if (hasChildren && hasContent) {
    throw new TypeError('Phase 7 documents must use either "children" or "content", not both');
  }
  const nodes = (hasChildren ? document.children : document.content) ?? [];
  if (nodes.length === 0) {
    throw new TypeError("Phase 7 documents must provide a non-empty children array");
  }
  return nodes;
}

function isPhase7Figure(node: PdfPhase7DocumentNode): node is PdfPhase7FigureNode {
  return node.type === "figure";
}

function isPhase7List(node: PdfPhase7DocumentNode): node is PdfPhase7ListNode {
  return node.type === "list";
}

function isPhase7Graphic(node: PdfPhase7DocumentNode): node is PdfPhase7GraphicNode {
  return node.type === "graphic";
}

function isLayoutNode(node: PdfPhase7DocumentNode): node is PdfDocumentLayoutNode {
  return ["container", "divider", "heading", "page-break", "paragraph", "preformatted", "table"].includes(node.type);
}

function createParagraph(
  id: string,
  value: string,
  lang: string | undefined,
  style: PdfPhase3ParagraphNode["style"],
  textAlign?: PdfPhase3ParagraphNode["textAlign"],
): PdfPhase3ParagraphNode {
  return {
    font: "Helvetica",
    fontSize: DEFAULT_LIST_FONT_SIZE,
    id,
    lang,
    lineHeight: DEFAULT_LIST_LINE_HEIGHT,
    style,
    textAlign,
    type: "paragraph",
    value,
  };
}

function getGraphicDimensions(node: PdfPhase7GraphicNode): { height: number; width: number | string } {
  const graphic = node.graphic;
  switch (graphic.type) {
    case "rect":
    case "image":
    case "svg":
      return {
        height: graphic.height,
        width: graphic.width,
      };
    case "line":
      return {
        height: Math.max(1, Math.abs(graphic.y2 - graphic.y1)),
        width: Math.max(1, Math.abs(graphic.x2 - graphic.x1)),
      };
    case "path":
      return {
        height: typeof node.style?.height === "number" ? node.style.height : 100,
        width: typeof node.style?.width === "number" || typeof node.style?.width === "string"
          ? node.style.width
          : 100,
      };
  }
}

function translateGraphic(graphic: PdfGraphic, left: number, bottom: number): PdfGraphic {
  switch (graphic.type) {
    case "rect":
      return {
        ...graphic,
        x: left + graphic.x,
        y: bottom + graphic.y,
      };
    case "image":
    case "svg":
      return {
        ...graphic,
        x: left + graphic.x,
        y: bottom + graphic.y,
      };
    case "line":
      return {
        ...graphic,
        x1: left + graphic.x1,
        x2: left + graphic.x2,
        y1: bottom + graphic.y1,
        y2: bottom + graphic.y2,
      };
    case "path":
      return {
        ...graphic,
        x: left + (graphic.x ?? 0),
        y: bottom + (graphic.y ?? 0),
      };
  }
}

function materializeDocument(document: PdfDocumentPhase7): Phase7MaterializedDocument {
  const figures: FigurePlacementSpec[] = [];
  const graphics: GraphicPlacementSpec[] = [];
  const structure: Phase7StructureSpec[] = [
    {
      id: "struct-document",
      lang: document.accessibility?.lang ?? DEFAULT_LANG,
      parentId: null,
      role: "Document",
    },
  ];
  let counter = 1;

  const nextId = (prefix: string): string => `${prefix}-${counter++}`;

  const mapTableNode = (node: PdfDocumentLayoutNode, parentId: string): PdfDocumentLayoutNode => {
    if (node.type === "container") {
      const id = node.id ?? nextId("sect");
      structure.push({ id, lang: node.lang, parentId, role: "Sect" });
      return {
        ...node,
        id,
        children: node.children.map((child) => mapTableNode(child as PdfDocumentLayoutNode, id)),
      };
    }
    if (node.type === "heading") {
      const id = node.id ?? nextId("heading");
      structure.push({ id, lang: node.lang, parentId, role: `H${node.level ?? 1}` });
      return { ...node, id };
    }
    if (node.type === "paragraph") {
      const id = node.id ?? nextId("paragraph");
      structure.push({ id, lang: node.lang, parentId, role: "P" });
      return { ...node, id };
    }
    if (node.type === "preformatted") {
      const id = node.id ?? nextId("preformatted");
      structure.push({ id, lang: node.lang, parentId, role: "P" });
      return { ...node, id };
    }
    if (node.type === "divider" || node.type === "page-break") {
      return { ...node };
    }
    const tableId = nextId("table");
    structure.push({ id: tableId, parentId, role: "Table" });
    const headerIdsByColumn = new Map<number, string>();
    const transformRows = (rows: typeof node.body, section: "header" | "body" | "footer") => rows?.map((row, rowIndex) => {
      const rowId = nextId(`tr-${section}`);
      structure.push({ id: rowId, parentId: tableId, role: "TR" });
      let columnIndex = 0;
      return {
        ...row,
        cells: row.cells.map((cell) => {
          const cellId = nextId(cell.role === "th" ? "th" : "td");
          if (cell.role === "th") {
            structure.push({ id: cellId, parentId: rowId, role: "TH", scope: "Column" });
            headerIdsByColumn.set(columnIndex, cellId);
          } else {
            const headerId = headerIdsByColumn.get(columnIndex);
            structure.push({ headers: headerId ? [headerId] : undefined, id: cellId, parentId: rowId, role: "TD" });
          }
          columnIndex += cell.colSpan ?? 1;
          return {
            ...cell,
            children: cell.children.map((child) => mapTableNode(child as PdfDocumentLayoutNode, cellId) as typeof child),
          };
        }),
      };
    });

    return {
      ...node,
      body: transformRows(node.body ?? [], "body") ?? [],
      footer: transformRows(node.footer ?? [], "footer"),
      header: transformRows(node.header ?? [], "header"),
    };
  };

  const mapNode = (node: PdfPhase7DocumentNode, parentId: string): PdfPhase6DocumentNode | PdfDocumentLayoutNode => {
    if (isPhase7Figure(node)) {
      const placeholderId = nextId("figure-placeholder");
      const figureId = node.id ?? nextId("figure");
      structure.push({ alt: node.alt, id: figureId, lang: node.lang, parentId, role: "Figure" });
      figures.push({
        alt: node.alt,
        format: node.format,
        height: node.height,
        lang: node.lang,
        placeholderId,
        source: node.source,
        structureId: figureId,
        width: node.width,
      });
      return {
        children: [],
        id: placeholderId,
        lang: node.lang,
        style: {
          ...node.style,
          height: node.height,
          width: node.width,
        },
        type: "container",
      } satisfies PdfPhase3ContainerNode;
    }

    if (isPhase7Graphic(node)) {
      const placeholderId = nextId("graphic-placeholder");
      const graphicId = node.alt ? (node.id ?? nextId("graphic")) : undefined;
      if (graphicId) {
        structure.push({ alt: node.alt, id: graphicId, lang: node.lang, parentId, role: "Figure" });
      }
      graphics.push({
        alt: node.alt,
        graphic: node.graphic,
        lang: node.lang,
        placeholderId,
        structureId: graphicId,
      });
      const dimensions = getGraphicDimensions(node);
      return {
        children: [],
        id: placeholderId,
        lang: node.lang,
        style: {
          ...node.style,
          height: dimensions.height,
          width: dimensions.width,
        },
        type: "container",
      } satisfies PdfPhase3ContainerNode;
    }

    if (isPhase7List(node)) {
      const listId = node.id ?? nextId("list");
      structure.push({ id: listId, lang: node.lang, parentId, role: "L" });
      const widestOrderedLabel = node.ordered ? `${node.items.length}.` : "\u2022";
      const labelWidth = node.ordered
        ? Math.max(18, (widestOrderedLabel.length * 7) + 2)
        : 12;
      const children: PdfDocumentLayoutNode[] = node.items.map((item, index) => {
        const itemId = item.id ?? nextId("li");
        const labelId = nextId("lbl");
        const bodyId = nextId("lbody");
        const label = node.ordered ? `${index + 1}.` : "\u2022";
        structure.push({ id: itemId, lang: item.lang ?? node.lang, parentId: listId, role: "LI" });
        structure.push({ id: labelId, lang: item.lang ?? node.lang, parentId: itemId, role: "Lbl" });
        structure.push({ id: bodyId, lang: item.lang ?? node.lang, parentId: itemId, role: "LBody" });
        return {
          children: [
            createParagraph(labelId, label, item.lang ?? node.lang, {
              marginRight: 6,
              width: labelWidth,
            }, node.ordered ? "right" : "left"),
            createParagraph(bodyId, item.text, item.lang ?? node.lang, {
              flexGrow: 1,
              flexShrink: 1,
            }),
          ],
          id: itemId,
          lang: item.lang ?? node.lang,
          style: {
            flexDirection: "row",
            marginBottom: 4,
          },
          type: "container",
        } satisfies PdfPhase3ContainerNode;
      });
      return {
        children,
        id: listId,
        lang: node.lang,
        style: node.style,
        type: "container",
      } satisfies PdfPhase3ContainerNode;
    }

    if (!isLayoutNode(node)) {
      return node as Exclude<PdfPhase6DocumentNode, PdfDocumentLayoutNode>;
    }

    return mapTableNode(node as PdfDocumentLayoutNode, parentId) as PdfDocumentLayoutNode | PdfPhase6DocumentNode;
  };

  return {
    figures,
    graphics,
    rendered: {
      bookmarks: document.bookmarks,
      children: getChildren(document).map((node) => mapNode(node, "struct-document")) as PdfPhase6DocumentNode[],
      dynamicFooter: document.dynamicFooter,
      dynamicHeader: document.dynamicHeader,
      meta: document.meta,
      page: document.page,
      pageLabels: document.pageLabels,
      pageNumber: document.pageNumber,
    },
    structure,
  };
}

function applyTextAccessibility(
  pages: PdfRenderedPage[],
  linePlacements: Awaited<ReturnType<typeof analyzePhase3DocumentDetailed>>["linePlacements"],
  structureLookup: Map<string, Phase7StructureSpec>,
): void {
  linePlacements.forEach((placement) => {
    if (!placement.blockId) {
      return;
    }
    const page = pages[placement.pageIndex];
    const structure = structureLookup.get(placement.blockId);
    if (!page || !structure) {
      return;
    }
    const matchingText = page.texts.find((text) =>
      text.value === placement.text &&
      Math.abs(text.x - placement.rect[0]) < 0.5 &&
      Math.abs((text.width ?? 0) - (placement.rect[2] - placement.rect[0])) < 2,
    );
    if (!matchingText) {
      return;
    }
    matchingText.accessibility = {
      lang: structure.lang,
      role: structure.role,
      structureId: structure.id,
    };
  });
}

function applyFigureAccessibility(
  pages: PdfRenderedPage[],
  anchors: Awaited<ReturnType<typeof analyzePhase3DocumentDetailed>>["anchors"],
  figures: FigurePlacementSpec[],
): void {
  figures.forEach((figure) => {
    const anchor = anchors.find((entry) => entry.id === figure.placeholderId);
    if (!anchor) {
      return;
    }
    const page = pages[anchor.pageIndex];
    if (!page) {
      return;
    }
    page.graphics ??= [];
    const accessibility = {
      alt: figure.alt,
      lang: figure.lang,
      role: "Figure",
      structureId: figure.structureId,
    } as const;
    if (figure.format === "svg") {
      page.graphics.push({
        accessibility,
        height: anchor.rect[3] - anchor.rect[1],
        source: figure.source,
        type: "svg",
        width: anchor.rect[2] - anchor.rect[0],
        x: anchor.rect[0],
        y: anchor.rect[1],
      });
      return;
    }
    page.graphics.push({
      accessibility,
      format: figure.format,
      height: anchor.rect[3] - anchor.rect[1],
      source: figure.source,
      type: "image",
      width: anchor.rect[2] - anchor.rect[0],
      x: anchor.rect[0],
      y: anchor.rect[1],
    });
  });
}

function applyGraphicPlacements(
  pages: PdfRenderedPage[],
  anchors: Awaited<ReturnType<typeof analyzePhase3DocumentDetailed>>["anchors"],
  graphics: GraphicPlacementSpec[],
): void {
  graphics.forEach((entry) => {
    const anchor = anchors.find((candidate) => candidate.id === entry.placeholderId);
    if (!anchor) {
      return;
    }
    const page = pages[anchor.pageIndex];
    if (!page) {
      return;
    }
    page.graphics ??= [];
    const translated = translateGraphic(entry.graphic, anchor.rect[0], anchor.rect[1]);
    if (entry.structureId || entry.alt) {
      (translated as PdfGraphic & { accessibility?: PdfMarkedContentSpec }).accessibility = {
        alt: entry.alt,
        lang: entry.lang,
        role: "Figure",
        structureId: entry.structureId,
      };
    }
    page.graphics.push(translated as typeof page.graphics[number]);
  });
}

function markRunningArtifacts(beforeCounts: Array<{ commands: number; graphics: number; texts: number }>, pages: PdfRenderedPage[]): void {
  pages.forEach((page, pageIndex) => {
    const before = beforeCounts[pageIndex];
    if (!before) {
      return;
    }
    page.texts.slice(before.texts).forEach((text) => {
      text.accessibility = {
        artifact: true,
        role: "Artifact",
      };
    });
    page.graphics?.slice(before.graphics).forEach((graphic) => {
      graphic.accessibility = {
        artifact: true,
        role: "Artifact",
      };
    });
    const extras = page.extraCommands ?? [];
    for (let index = before.commands; index < extras.length; index += 1) {
      const entry = extras[index];
      if (typeof entry === "string") {
        extras[index] = {
          accessibility: { artifact: true, role: "Artifact" },
          command: entry,
        };
      } else {
        entry.accessibility = { artifact: true, role: "Artifact" };
      }
    }
  });
}

function buildAccessibilitySpec(
  structure: Phase7StructureSpec[],
  accessibility: PdfPhase7AccessibilityOptions | undefined,
): PdfDocumentAccessibilitySpec {
  return {
    lang: accessibility?.lang ?? DEFAULT_LANG,
    structure,
  };
}

export async function analyzePhase7Document(document: PdfDocumentPhase7): Promise<Phase7DocumentAnalysis> {
  const materialized = materializeDocument(document);
  const phase6Materialized = materializePhase6Document(materialized.rendered);
  const children = getChildren(document);
  const baseAnalysis = hasTableNode(children)
    ? await analyzePhase5DocumentDetailed(phase6Materialized.rendered)
    : await analyzePhase3DocumentDetailed(phase6Materialized.rendered);
  const pages = clonePages(baseAnalysis.pages);
  const headings = buildHeadings(baseAnalysis.anchors);
  const headingMap = new Map(headings.map((heading) => [heading.id, heading]));
  const structureLookup = new Map(materialized.structure.map((entry) => [entry.id, entry]));

  pages.forEach((page) => {
    page.annotations ??= [];
    page.extraCommands ??= [];
    page.graphics ??= [];
  });

  applyTextAccessibility(pages, baseAnalysis.linePlacements, structureLookup);
  applyFigureAccessibility(pages, baseAnalysis.anchors, materialized.figures);
  applyGraphicPlacements(pages, baseAnalysis.anchors, materialized.graphics);

  addLinkAnnotations(pages, baseAnalysis.linePlacements, headingMap);
  addTocContent(pages, phase6Materialized.placeholders, baseAnalysis.anchors, headings);
  addFormAnnotations(pages, phase6Materialized.placeholders, baseAnalysis.anchors);

  const interactive = {
    accessibility: buildAccessibilitySpec(materialized.structure, document.accessibility),
    metadataXml: buildMetadataXml(baseAnalysis.meta),
    outlines: shouldBuildBookmarks(document.bookmarks) ? buildOutlineTree(headings) : undefined,
    pageLabels: document.pageLabels,
    sharedForms: [],
  };

  const beforeCounts = pages.map((page) => ({
    commands: page.extraCommands?.length ?? 0,
    graphics: page.graphics?.length ?? 0,
    texts: page.texts.length,
  }));
  addPageNumbers(pages, document.pageNumber, interactive);
  if (document.dynamicHeader) {
    await addDynamicHeaders(pages, document.dynamicHeader, baseAnalysis.page.width, baseAnalysis.page.height);
  }
  if (document.dynamicFooter) {
    await addDynamicFooters(pages, document.dynamicFooter, baseAnalysis.page.width);
  }
  markRunningArtifacts(beforeCounts, pages);

  return {
    headings,
    interactive,
    meta: baseAnalysis.meta,
    page: baseAnalysis.page,
    pages,
  };
}
