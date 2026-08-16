import { analyzePhase3DocumentDetailed, type Phase3AnchorPlacement, type Phase3LinePlacement } from "./phase3-render.js";
import { approxHelveticaCharWidth } from "./helvetica-widths.js";
import { escapeXml } from "./xml-escape.js";
import { analyzePhase5DocumentDetailed } from "./phase5-table-layout.js";
import type { PdfRenderableText, PdfDocumentInteractiveSpec, PdfOutlineItemSpec, PdfRenderedPage } from "./pdf-renderer.js";
import type { PdfDocumentLayoutNode, PdfPhase3ContainerNode, PdfPhase3HeadingNode, PdfPhase3Link, PdfPhase3Page, PdfPhase3ParagraphNode, PdfPhase3Style } from "./phase3-types.js";
import type {
  PdfDocumentPhase6,
  PdfDynamicHeaderFooterConfiguredContent,
  PdfDynamicHeaderFooterContent,
  PdfDynamicHeaderFooterOptions,
  PdfDynamicHeaderFooterZones,
  PdfDynamicFooterOptions,
  PdfDynamicHeaderOptions,
  PdfPhase6BookmarkOptions,
  PdfPhase6CheckboxNode,
  PdfPhase6DocumentNode,
  PdfPhase6DropdownNode,
  PdfPhase6HighlightAnnotationNode,
  PdfPhase6NoteAnnotationNode,
  PdfPhase6PageLabel,
  PdfPhase6RadioButtonNode,
  PdfPhase6SignatureFieldNode,
  PdfPhase6TextFieldNode,
  PdfPhase6TocNode,
} from "./phase6-types.js";

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_LINE_HEIGHT = 1.4;
const DEFAULT_PAGE_NUMBER_FORMAT = "Page {page} of {total}";

function resolveLineHeightValue(lineHeight: number | undefined, fontSize: number): number {
  if (lineHeight == null) {
    return fontSize * DEFAULT_LINE_HEIGHT;
  }
  return lineHeight <= 4 ? fontSize * lineHeight : lineHeight;
}
const DEFAULT_PAGE_NUMBER_X = 72;
const DEFAULT_PAGE_NUMBER_Y = 36;
const LINK_COLOR = { b: 0.8, g: 0.3, r: 0.1, space: "rgb" as const };
const FORM_TEXT_HEIGHT = 24;
const FORM_DROPDOWN_HEIGHT = 24;
const FORM_CHECKBOX_SIZE = 14;
const FORM_RADIO_SIZE = 14;
const FORM_SIGNATURE_HEIGHT = 28;
const NOTE_SIZE = 18;
const DEFAULT_DYNAMIC_REGION_HEIGHT = 72;

type Phase6SpecialNode =
  | PdfPhase6CheckboxNode
  | PdfPhase6DropdownNode
  | PdfPhase6HighlightAnnotationNode
  | PdfPhase6NoteAnnotationNode
  | PdfPhase6RadioButtonNode
  | PdfPhase6SignatureFieldNode
  | PdfPhase6TextFieldNode
  | PdfPhase6TocNode;

export interface Phase6Placeholder {
  node: Phase6SpecialNode;
  placeholderId: string;
}

export interface Phase6HeadingEntry {
  destination: { left: number; pageIndex: number; top: number };
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  pageNumber: number;
  title: string;
}

export interface Phase6DocumentAnalysis {
  headings: Phase6HeadingEntry[];
  interactive: PdfDocumentInteractiveSpec;
  meta: NonNullable<PdfDocumentPhase6["meta"]>;
  page: Awaited<ReturnType<typeof analyzePhase3DocumentDetailed>>["page"];
  pages: PdfRenderedPage[];
}

export function getPhase6Children(document: PdfDocumentPhase6): PdfPhase6DocumentNode[] {
  const hasChildren = Array.isArray(document.children);
  const hasContent = Array.isArray(document.content);
  if (hasChildren && hasContent) {
    throw new TypeError('Phase 6 documents must use either "children" or "content", not both');
  }
  const nodes = (hasChildren ? document.children : document.content) ?? [];
  if (nodes.length === 0) {
    throw new TypeError("Phase 6 documents must provide a non-empty children array");
  }
  return nodes;
}

function isStandardNode(node: PdfPhase6DocumentNode): node is PdfDocumentLayoutNode {
  return ["container", "divider", "heading", "page-break", "paragraph", "preformatted", "table"].includes(node.type);
}

function cloneStyle(style: PdfPhase3Style | undefined): PdfPhase3Style | undefined {
  return style ? { ...style } : undefined;
}

function createPlaceholderContainer(
  placeholderId: string,
  style: PdfPhase3Style | undefined,
  width: number | string | undefined,
  height: number,
): PdfPhase3ContainerNode {
  return {
    children: [],
    id: placeholderId,
    style: {
      ...cloneStyle(style),
      height,
      width: width ?? style?.width ?? "100%",
    },
    type: "container",
  };
}

function estimateTocHeight(node: PdfPhase6TocNode, headings: PdfPhase3HeadingNode[]): number {
  const entries = headings.filter((heading) => (heading.level ?? 1) <= (node.maxLevel ?? 3));
  const entryFontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
  const entryLineHeight = resolveLineHeightValue(node.lineHeight, entryFontSize);
  const titleHeight = node.title ? ((node.titleFontSize ?? entryFontSize) * DEFAULT_LINE_HEIGHT) : 0;
  return Math.max(entryLineHeight, (entries.length * entryLineHeight) + titleHeight);
}

function collectHeadings(nodes: PdfPhase6DocumentNode[], headings: PdfPhase3HeadingNode[] = []): PdfPhase3HeadingNode[] {
  for (const node of nodes) {
    if (!isStandardNode(node)) {
      continue;
    }
    if (node.type === "heading") {
      headings.push(node);
      continue;
    }
    if (node.type === "container") {
      collectHeadings(node.children as PdfPhase6DocumentNode[], headings);
    }
  }
  return headings;
}

function containsTableNode(nodes: PdfPhase6DocumentNode[]): boolean {
  return nodes.some((node) => {
    if (!isStandardNode(node)) {
      return false;
    }
    if (node.type === "table") {
      return true;
    }
    if (node.type === "container") {
      return containsTableNode(node.children as PdfPhase6DocumentNode[]);
    }
    return false;
  });
}

function assignHeadingIds(nodes: PdfPhase6DocumentNode[], counter: { value: number }): PdfPhase6DocumentNode[] {
  return nodes.map((node) => {
    if (!isStandardNode(node)) {
      return { ...node };
    }
    if (node.type === "heading") {
      return {
        ...node,
        id: node.id ?? `heading-${counter.value++}`,
      };
    }
    if (node.type === "container") {
      return {
        ...node,
        children: assignHeadingIds(node.children as PdfPhase6DocumentNode[], counter) as PdfDocumentLayoutNode[],
      };
    }
    return { ...node };
  });
}

export function materializePhase6Document(document: PdfDocumentPhase6): {
  meta: PdfDocumentPhase6["meta"];
  page: PdfDocumentPhase6["page"];
  placeholders: Phase6Placeholder[];
  rendered: { children: PdfDocumentLayoutNode[]; meta: PdfDocumentPhase6["meta"]; page: PdfDocumentPhase6["page"] };
} {
  const placeholders: Phase6Placeholder[] = [];
  const sourceChildren = assignHeadingIds(getPhase6Children(document), { value: 1 });
  const headings = collectHeadings(sourceChildren);
  let placeholderCounter = 1;

  const materializeNode = (node: PdfPhase6DocumentNode): PdfDocumentLayoutNode => {
    if (isStandardNode(node)) {
      if (node.type === "container") {
        return {
          ...node,
          children: node.children.map((child) => materializeNode(child as PdfPhase6DocumentNode)),
        };
      }
      return node;
    }

    const placeholderId = `phase6-placeholder-${placeholderCounter++}`;
    placeholders.push({ node, placeholderId });

    if (node.type === "toc") {
      return createPlaceholderContainer(placeholderId, node.style, node.style?.width, estimateTocHeight(node, headings));
    }
    if (node.type === "form-text") {
      return createPlaceholderContainer(placeholderId, node.style, node.width, node.height ?? FORM_TEXT_HEIGHT);
    }
    if (node.type === "form-dropdown") {
      return createPlaceholderContainer(placeholderId, node.style, node.width, node.height ?? FORM_DROPDOWN_HEIGHT);
    }
    if (node.type === "form-checkbox") {
      return createPlaceholderContainer(placeholderId, node.style, node.size ?? FORM_CHECKBOX_SIZE, node.size ?? FORM_CHECKBOX_SIZE);
    }
    if (node.type === "form-radio") {
      return createPlaceholderContainer(placeholderId, node.style, node.size ?? FORM_RADIO_SIZE, node.size ?? FORM_RADIO_SIZE);
    }
    if (node.type === "form-signature") {
      return createPlaceholderContainer(placeholderId, node.style, node.width, node.height ?? FORM_SIGNATURE_HEIGHT);
    }
    if (node.type === "note-annotation") {
      return createPlaceholderContainer(placeholderId, node.style, node.width, node.height ?? NOTE_SIZE);
    }
    return createPlaceholderContainer(placeholderId, node.style, undefined, 0.1);
  };

  const page = reserveRunningRegionSpace(document.page, document.dynamicHeader, document.dynamicFooter);

  return {
    meta: document.meta,
    page,
    placeholders,
    rendered: {
      children: sourceChildren.map((node) => materializeNode(node)),
      meta: document.meta,
      page,
    },
  };
}

function clonePages(pages: PdfRenderedPage[]): PdfRenderedPage[] {
  return pages.map((page) => ({
    ...page,
    annotations: [...(page.annotations ?? [])],
    extraCommands: [...(page.extraCommands ?? [])],
    graphics: [...(page.graphics ?? [])],
    texts: [...page.texts],
  }));
}

function rectWidth(rect: [number, number, number, number]): number {
  return rect[2] - rect[0];
}

function rectHeight(rect: [number, number, number, number]): number {
  return rect[3] - rect[1];
}

function approxTextWidth(text: string, fontSize: number): number {
  return [...text].reduce((sum, char) => sum + approxHelveticaCharWidth(char, fontSize), 0);
}

export function buildHeadings(anchors: Phase3AnchorPlacement[]): Phase6HeadingEntry[] {
  return anchors
    .filter((anchor) => anchor.kind === "heading" && anchor.level)
    .map((anchor) => ({
      destination: {
        left: anchor.rect[0],
        pageIndex: anchor.pageIndex,
        top: anchor.rect[3],
      },
      id: anchor.id,
      level: anchor.level as 1 | 2 | 3 | 4 | 5 | 6,
      pageNumber: anchor.pageIndex + 1,
      title: anchor.title ?? anchor.id,
    }));
}

export function buildOutlineTree(headings: Phase6HeadingEntry[]): PdfOutlineItemSpec[] {
  interface StackEntry {
    children: PdfOutlineItemSpec[];
    level: number;
  }

  const root: PdfOutlineItemSpec[] = [];
  const stack: StackEntry[] = [{ children: root, level: 0 }];

  for (const heading of headings) {
    while (stack.length > 1 && stack[stack.length - 1]?.level >= heading.level) {
      stack.pop();
    }
    const item: PdfOutlineItemSpec = {
      children: [],
      destination: heading.destination,
      title: heading.title,
    };
    (stack[stack.length - 1]?.children ?? root).push(item);
    stack.push({ children: item.children ?? [], level: heading.level });
  }

  return root;
}

export function buildMetadataXml(meta: NonNullable<PdfDocumentPhase6["meta"]>): string | undefined {
  if (!meta.title && !meta.author && !meta.creator && !meta.producer && !meta.subject && !meta.creationDate && !meta.modDate) {
    return undefined;
  }

  const title = meta.title ?? "";
  const author = meta.author ?? "";
  const creator = meta.creator ?? "";
  const producer = meta.producer ?? "Runstamp PDF";
  const subject = meta.subject ?? "";
  const createDate = meta.creationDate instanceof Date ? meta.creationDate.toISOString() : meta.creationDate ?? "";
  const modifyDate = meta.modDate instanceof Date ? meta.modDate.toISOString() : meta.modDate ?? createDate;
  const keywords = meta.keywords?.join(", ") ?? "";

  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>\n<dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>\n<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(subject)}</rdf:li></rdf:Alt></dc:description>\n<pdf:Producer>${escapeXml(producer)}</pdf:Producer>\n<pdf:Keywords>${escapeXml(keywords)}</pdf:Keywords>\n<xmp:CreatorTool>${escapeXml(creator)}</xmp:CreatorTool>\n<xmp:CreateDate>${escapeXml(createDate)}</xmp:CreateDate>\n<xmp:ModifyDate>${escapeXml(modifyDate)}</xmp:ModifyDate>\n</rdf:Description>\n</rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>`;
}

export function addLinkAnnotations(
  pages: PdfRenderedPage[],
  placements: Phase3LinePlacement[],
  headings: Map<string, Phase6HeadingEntry>,
): void {
  placements.forEach((placement) => {
    if (!placement.link) {
      return;
    }
    const page = pages[placement.pageIndex];
    if (!page) {
      return;
    }
    const [left, bottom, right] = placement.rect;
    page.graphics?.push({
      stroke: { color: LINK_COLOR, width: 0.75 },
      type: "line",
      x1: left,
      x2: right,
      y1: bottom + 1,
      y2: bottom + 1,
    });
    if (placement.link.kind === "external") {
      page.annotations?.push({
        kind: "link-external",
        rect: placement.rect,
        url: placement.link.url,
      });
      return;
    }
    const target = headings.get(placement.link.target);
    if (!target) {
      throw new Error(`Unknown internal link target "${placement.link.target}"`);
    }
    page.annotations?.push({
      destination: target.destination,
      kind: "link-internal",
      rect: placement.rect,
    });
  });
}

export function addTocContent(
  pages: PdfRenderedPage[],
  placeholders: Phase6Placeholder[],
  anchors: Phase3AnchorPlacement[],
  headings: Phase6HeadingEntry[],
): void {
  const headingMap = new Map(headings.map((heading) => [heading.id, heading]));

  placeholders.forEach((placeholder) => {
    if (placeholder.node.type !== "toc") {
      return;
    }

    const anchor = anchors.find((entry) => entry.id === placeholder.placeholderId);
    if (!anchor) {
      return;
    }

    const page = pages[anchor.pageIndex];
    if (!page) {
      return;
    }

    const tocNode = placeholder.node;
    const entries = headings.filter((heading) => heading.level <= (tocNode.maxLevel ?? 3));
    const left = anchor.rect[0];
    const right = anchor.rect[2];
    const top = anchor.rect[3];
    const entryFontSize = tocNode.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = resolveLineHeightValue(tocNode.lineHeight, entryFontSize);
    const titleFontSize = tocNode.titleFontSize ?? Math.max(entryFontSize + 2, entryFontSize);
    let rowTop = top;

    if (tocNode.title) {
      page.texts.push({
        font: "Helvetica",
        fontSize: titleFontSize,
        value: tocNode.title,
        x: left,
        y: rowTop - (titleFontSize * 0.8),
      });
      rowTop -= titleFontSize * DEFAULT_LINE_HEIGHT;
    }

    entries.forEach((entry) => {
      const rowBottom = rowTop - lineHeight;
      const indent = ((entry.level ?? 1) - 1) * (tocNode.indentPerLevel ?? 12);
      const titleX = left + indent;
      const titleWidth = approxTextWidth(entry.title, entryFontSize);
      const pageLabel = String(entry.pageNumber);
      const pageWidth = approxTextWidth(pageLabel, entryFontSize);
      const pageX = right - pageWidth;
      const gapStart = titleX + titleWidth + 6;
      const gapWidth = Math.max(0, pageX - gapStart - 4);
      const dotWidth = Math.max(1, approxTextWidth(".", entryFontSize));
      const dotCount = Math.max(0, Math.floor(gapWidth / dotWidth));
      const dots = ".".repeat(dotCount);

      page.texts.push(
        {
          font: "Helvetica",
          fontSize: entryFontSize,
          value: entry.title,
          x: titleX,
          y: rowTop - (entryFontSize * 0.8),
        },
        {
          font: "Helvetica",
          fontSize: entryFontSize,
          value: dots,
          x: gapStart,
          y: rowTop - (entryFontSize * 0.8),
        },
        {
          font: "Helvetica",
          fontSize: entryFontSize,
          value: pageLabel,
          x: pageX,
          y: rowTop - (entryFontSize * 0.8),
        },
      );

      page.annotations?.push({
        destination: headingMap.get(entry.id)?.destination ?? entry.destination,
        kind: "link-internal",
        rect: [left, rowBottom, right, rowTop],
      });
      rowTop -= lineHeight;
    });
  });
}

export function addFormAnnotations(pages: PdfRenderedPage[], placeholders: Phase6Placeholder[], anchors: Phase3AnchorPlacement[]): void {
  placeholders.forEach((placeholder) => {
    const anchor = anchors.find((entry) => entry.id === placeholder.placeholderId);
    if (!anchor) {
      return;
    }
    const page = pages[anchor.pageIndex];
    if (!page) {
      return;
    }
    const rect = anchor.rect;
    if (placeholder.node.type === "form-text") {
      page.annotations?.push({
        calculationScript: placeholder.node.calculate,
        fontSize: placeholder.node.fontSize ?? DEFAULT_FONT_SIZE,
        fontColor: placeholder.node.fontColor,
        kind: "form-text",
        label: placeholder.node.label,
        maxLength: placeholder.node.maxLength,
        multiline: placeholder.node.multiline,
        name: placeholder.node.name,
        readOnly: placeholder.node.readOnly,
        required: placeholder.node.required,
        rect,
        tabOrder: placeholder.node.tabOrder,
        tooltip: placeholder.node.tooltip,
        value: placeholder.node.value,
      });
      return;
    }
    if (placeholder.node.type === "form-checkbox") {
      page.annotations?.push({
        calculationScript: placeholder.node.calculate,
        checked: placeholder.node.checked,
        fontColor: placeholder.node.fontColor,
        kind: "form-checkbox",
        label: placeholder.node.label,
        name: placeholder.node.name,
        readOnly: placeholder.node.readOnly,
        required: placeholder.node.required,
        rect,
        tabOrder: placeholder.node.tabOrder,
        tooltip: placeholder.node.tooltip,
      });
      return;
    }
    if (placeholder.node.type === "form-radio") {
      page.annotations?.push({
        calculationScript: placeholder.node.calculate,
        checked: placeholder.node.checked,
        fontColor: placeholder.node.fontColor,
        group: placeholder.node.group,
        kind: "form-radio",
        label: placeholder.node.label,
        name: placeholder.node.name,
        readOnly: placeholder.node.readOnly,
        required: placeholder.node.required,
        rect,
        tabOrder: placeholder.node.tabOrder,
        tooltip: placeholder.node.tooltip,
        value: placeholder.node.value,
      });
      return;
    }
    if (placeholder.node.type === "form-signature") {
      page.annotations?.push({
        fieldName: placeholder.node.fieldName,
        fontColor: placeholder.node.fontColor,
        fontSize: placeholder.node.fontSize,
        kind: "form-signature",
        label: placeholder.node.label,
        mode: placeholder.node.mode ?? "digital",
        rect,
        tabOrder: placeholder.node.tabOrder,
        tooltip: placeholder.node.tooltip,
        value: placeholder.node.value,
      });
      return;
    }
    if (placeholder.node.type === "form-dropdown") {
      page.annotations?.push({
        calculationScript: placeholder.node.calculate,
        fontColor: placeholder.node.fontColor,
        kind: "form-dropdown",
        label: placeholder.node.label,
        name: placeholder.node.name,
        readOnly: placeholder.node.readOnly,
        required: placeholder.node.required,
        options: placeholder.node.options,
        rect,
        tabOrder: placeholder.node.tabOrder,
        tooltip: placeholder.node.tooltip,
        value: placeholder.node.value,
      });
      return;
    }
    if (placeholder.node.type === "note-annotation") {
      page.annotations?.push({
        contents: placeholder.node.contents,
        kind: "note",
        open: placeholder.node.open,
        rect,
        title: placeholder.node.title,
      });
      return;
    }
    if (placeholder.node.type === "highlight-annotation") {
      const target = anchors.find((entry) => entry.id === (placeholder.node as PdfPhase6HighlightAnnotationNode).target);
      if (!target) {
        throw new Error(`Unknown highlight target "${(placeholder.node as PdfPhase6HighlightAnnotationNode).target}"`);
      }
      page.annotations?.push({
        color: LINK_COLOR,
        contents: placeholder.node.contents,
        kind: "highlight",
        quadPoints: [
          target.rect[0], target.rect[3],
          target.rect[2], target.rect[3],
          target.rect[0], target.rect[1],
          target.rect[2], target.rect[1],
        ],
        rect: target.rect,
      });
    }
  });
}

export function addPageNumbers(
  pages: PdfRenderedPage[],
  pageNumber: PdfDocumentPhase6["pageNumber"],
  _interactive: PdfDocumentInteractiveSpec,
): void {
  if (!pageNumber) {
    return;
  }

  const format = pageNumber.format ?? DEFAULT_PAGE_NUMBER_FORMAT;
  const fontSize = pageNumber.fontSize ?? DEFAULT_FONT_SIZE;
  const total = String(pages.length);

  pages.forEach((page, pageIndex) => {
    const x = pageNumber.x ?? DEFAULT_PAGE_NUMBER_X;
    const y = pageNumber.y ?? DEFAULT_PAGE_NUMBER_Y;
    page.texts.push({
      font: "Helvetica",
      fontSize,
      value: replaceTemplatePlaceholders(format, pageIndex, total),
      x,
      y,
    });
  });
}

function resolvePageHeight(page: PdfDocumentPhase6["page"]): number {
  const size = page?.size;
  if (!size || size === "Letter" || size === "letter") return 792;
  if (size === "A4" || size === "a4") return 841.89;
  return size.height;
}

function replaceTemplatePlaceholders(value: string, pageIndex: number, total: string): string {
  return value
    .replaceAll("{page}", String(pageIndex + 1))
    .replaceAll("{totalPages}", total)
    .replaceAll("{total}", total);
}

function isDynamicZones(content: PdfDynamicHeaderFooterConfiguredContent): content is PdfDynamicHeaderFooterZones {
  return typeof content === "object" && !Array.isArray(content);
}

function resolvePageMargins(page: PdfPhase3Page | undefined): { bottom: number; left: number; right: number; top: number } {
  if (typeof page?.margin === "number") {
    return { bottom: page.margin, left: page.margin, right: page.margin, top: page.margin };
  }
  return {
    bottom: page?.margin?.bottom ?? 72,
    left: page?.margin?.left ?? 72,
    right: page?.margin?.right ?? 72,
    top: page?.margin?.top ?? 72,
  };
}

function runningRegionHeight(options: PdfDynamicHeaderFooterOptions): number {
  return options.height ?? (Array.isArray(options.content)
    ? DEFAULT_DYNAMIC_REGION_HEIGHT
    : (options.fontSize ?? DEFAULT_FONT_SIZE) * DEFAULT_LINE_HEIGHT);
}

/**
 * Pagination must know about running regions before it creates continuation
 * pages. Keep authored margins when they are already sufficient, otherwise
 * enlarge the relevant edge to the configured region boundary.
 */
function reserveRunningRegionSpace(
  page: PdfPhase3Page | undefined,
  header: PdfDynamicHeaderOptions | undefined,
  footer: PdfDynamicFooterOptions | undefined,
): PdfPhase3Page | undefined {
  if (!header && !footer) {
    return page;
  }

  const pageHeight = resolvePageHeight(page);
  const margins = resolvePageMargins(page);

  if (header) {
    const height = runningRegionHeight(header);
    const regionBottom = Array.isArray(header.content)
      ? (header.y ?? pageHeight - 24) - height
      : (header.y ?? pageHeight - 36) - height;
    margins.top = Math.max(margins.top, pageHeight - regionBottom);
  }
  if (footer) {
    const height = runningRegionHeight(footer);
    const regionTop = (footer.y ?? 24) + height;
    margins.bottom = Math.max(margins.bottom, regionTop);
  }

  return {
    ...(page ?? {}),
    margin: margins,
  };
}

function addDynamicZones(
  page: PdfRenderedPage,
  zones: PdfDynamicHeaderFooterZones,
  pageIndex: number,
  total: string,
  options: { fontSize: number; width: number; x: number; y: number },
): void {
  const zoneWidth = options.width / 3;
  (["left", "center", "right"] as const).forEach((zone, zoneIndex) => {
    const zoneContent = zones[zone];
    if (zoneContent === undefined) return;
    const text = replaceTemplatePlaceholders(zoneContent, pageIndex, total);
    const textWidth = approxTextWidth(text, options.fontSize);
    const zoneX = options.x + (zoneIndex * zoneWidth);
    const textX = zone === "left"
      ? zoneX
      : zone === "center"
        ? zoneX + Math.max(0, (zoneWidth - textWidth) / 2)
        : zoneX + Math.max(0, zoneWidth - textWidth);
    page.texts.push({
      font: "Helvetica",
      fontSize: options.fontSize,
      value: text,
      x: textX,
      y: options.y,
    });
  });
}

function materializeDynamicContent(
  value: unknown,
  pageIndex: number,
  total: string,
): unknown {
  if (typeof value === "string") {
    return replaceTemplatePlaceholders(value, pageIndex, total);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => materializeDynamicContent(entry, pageIndex, total));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, materializeDynamicContent(entry, pageIndex, total)]),
    );
  }
  return value;
}

function translateGraphic(graphic: NonNullable<PdfRenderedPage["graphics"]>[number], dx: number, dy: number): NonNullable<PdfRenderedPage["graphics"]>[number] {
  const translated = { ...graphic } as NonNullable<PdfRenderedPage["graphics"]>[number];
  if (translated.type === "rect") {
    translated.x += dx;
    translated.y += dy;
  } else if (translated.type === "line") {
    translated.x1 += dx;
    translated.x2 += dx;
    translated.y1 += dy;
    translated.y2 += dy;
  } else if (translated.type === "image" || translated.type === "svg") {
    translated.x += dx;
    translated.y += dy;
  } else if (translated.type === "path") {
    translated.x = (translated.x ?? 0) + dx;
    translated.y = (translated.y ?? 0) + dy;
  }
  return translated;
}

async function renderDynamicLayoutContent(
  content: PdfDynamicHeaderFooterContent,
  pageIndex: number,
  total: string,
  width: number,
  height: number,
): Promise<PdfRenderedPage> {
  if (typeof content === "string") {
    throw new TypeError("Dynamic layout content requires layout nodes");
  }

  const children = materializeDynamicContent(content, pageIndex, total) as PdfDocumentLayoutNode[];
  const document = {
    children,
    page: {
      margin: 0,
      size: { height, width },
    },
  };
  const analysis = containsTableNode(children)
    ? await analyzePhase5DocumentDetailed(document)
    : await analyzePhase3DocumentDetailed(document);
  if (analysis.pages.length > 1) {
    throw new Error("Dynamic header/footer content exceeds the configured region height");
  }
  return analysis.pages[0] ?? { graphics: [], height, texts: [], width };
}

async function addDynamicLayoutContent(
  page: PdfRenderedPage,
  content: PdfDynamicHeaderFooterContent,
  pageIndex: number,
  total: string,
  options: { height: number; topY: number; width: number; x: number },
): Promise<void> {
  const rendered = await renderDynamicLayoutContent(content, pageIndex, total, options.width, options.height);
  const dx = options.x;
  const dy = options.topY - options.height;

  page.texts.push(
    ...rendered.texts.map((text) => ({
      ...text,
      x: text.x + dx,
      y: text.y + dy,
    })),
  );
  page.graphics ??= [];
  page.graphics.push(
    ...(rendered.graphics ?? []).map((graphic) => translateGraphic(graphic, dx, dy)),
  );
  page.extraCommands ??= [];
  page.extraCommands.push(
    ...(rendered.extraCommands ?? []).map((command) => {
      if (typeof command === "string") {
        return `q 1 0 0 1 ${dx} ${dy} cm\n${command}\nQ`;
      }
      return {
        ...command,
        command: `q 1 0 0 1 ${dx} ${dy} cm\n${command.command}\nQ`,
      };
    }),
  );
}

export function addDynamicHeaders(
  pages: PdfRenderedPage[],
  header: PdfDynamicHeaderOptions,
  pageWidth: number,
  pageHeight: number,
): Promise<void> {

  const fontSize = header.fontSize ?? DEFAULT_FONT_SIZE;
  const x = header.x ?? DEFAULT_PAGE_NUMBER_X;
  const defaultY = pageHeight - 36;
  const total = String(pages.length);

  return Promise.all(pages.map(async (page, pageIndex) => {
    if (header.skipFirstPage && pageIndex === 0) {
      return;
    }
    if (isDynamicZones(header.content)) {
      const width = header.width ?? Math.max(1, pageWidth - (x * 2));
      addDynamicZones(page, header.content, pageIndex, total, {
        fontSize,
        width,
        x,
        y: header.y ?? defaultY,
      });
      return;
    }
    if (typeof header.content !== "string") {
      const height = header.height ?? DEFAULT_DYNAMIC_REGION_HEIGHT;
      const width = header.width ?? Math.max(1, pageWidth - (x * 2));
      await addDynamicLayoutContent(page, header.content, pageIndex, total, {
        height,
        topY: header.y ?? pageHeight - 24,
        width,
        x,
      });
      return;
    }

    const text = replaceTemplatePlaceholders(header.content, pageIndex, total);
    const y = header.y ?? defaultY;
    page.texts.push({ font: "Helvetica", fontSize, value: text, x, y });
  })).then(() => undefined);
}

export function addDynamicFooters(
  pages: PdfRenderedPage[],
  footer: PdfDynamicFooterOptions,
  pageWidth: number,
): Promise<void> {

  const fontSize = footer.fontSize ?? DEFAULT_FONT_SIZE;
  const x = footer.x ?? DEFAULT_PAGE_NUMBER_X;
  const y = footer.y ?? 24;
  const total = String(pages.length);

  return Promise.all(pages.map(async (page, pageIndex) => {
    if (footer.skipFirstPage && pageIndex === 0) {
      return;
    }
    if (isDynamicZones(footer.content)) {
      const width = footer.width ?? Math.max(1, pageWidth - (x * 2));
      addDynamicZones(page, footer.content, pageIndex, total, {
        fontSize,
        width,
        x,
        y,
      });
      return;
    }
    if (typeof footer.content !== "string") {
      const height = footer.height ?? DEFAULT_DYNAMIC_REGION_HEIGHT;
      const width = footer.width ?? Math.max(1, pageWidth - (x * 2));
      await addDynamicLayoutContent(page, footer.content, pageIndex, total, {
        height,
        topY: y + height,
        width,
        x,
      });
      return;
    }

    const text = replaceTemplatePlaceholders(footer.content, pageIndex, total);
    page.texts.push({ font: "Helvetica", fontSize, value: text, x, y });
  })).then(() => undefined);
}

export function shouldBuildBookmarks(bookmarks: PdfPhase6BookmarkOptions | undefined): boolean {
  return bookmarks?.fromHeadings ?? true;
}

export async function analyzePhase6Document(document: PdfDocumentPhase6): Promise<Phase6DocumentAnalysis> {
  const children = getPhase6Children(document);
  const materialized = materializePhase6Document(document);
  const baseAnalysis = containsTableNode(children)
    ? await analyzePhase5DocumentDetailed(materialized.rendered)
    : await analyzePhase3DocumentDetailed(materialized.rendered);
  const pages = clonePages(baseAnalysis.pages);
  const headings = buildHeadings(baseAnalysis.anchors);
  const headingMap = new Map(headings.map((heading) => [heading.id, heading]));

  pages.forEach((page) => {
    page.annotations ??= [];
    page.graphics ??= [];
    page.extraCommands ??= [];
  });

  addLinkAnnotations(pages, baseAnalysis.linePlacements, headingMap);
  addTocContent(pages, materialized.placeholders, baseAnalysis.anchors, headings);
  addFormAnnotations(pages, materialized.placeholders, baseAnalysis.anchors);

  const interactive: PdfDocumentInteractiveSpec = {
    metadataXml: buildMetadataXml(baseAnalysis.meta),
    outlines: shouldBuildBookmarks(document.bookmarks) ? buildOutlineTree(headings) : undefined,
    pageLabels: document.pageLabels as PdfPhase6PageLabel[] | undefined,
    sharedForms: [],
  };

  addPageNumbers(pages, document.pageNumber, interactive);

  if (document.dynamicHeader) {
    await addDynamicHeaders(pages, document.dynamicHeader, baseAnalysis.page.width, resolvePageHeight(document.page));
  }
  if (document.dynamicFooter) {
    await addDynamicFooters(pages, document.dynamicFooter, baseAnalysis.page.width);
  }

  return {
    headings,
    interactive,
    meta: baseAnalysis.meta,
    page: baseAnalysis.page,
    pages,
  };
}
