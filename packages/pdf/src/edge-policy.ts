import { PdfError } from "./errors.js";
import type { PdfInputWarning } from "./relaxed-input.js";

export const PDF_MIN_PAGE_SIZE = 3;
export const PDF_MAX_PAGE_SIZE = 14_400;
export const PDF_UNBREAKABLE_TOKEN_LENGTH = 300;
export const PDF_MAX_CONTAINER_DEPTH = 100;

const LETTER_SIZE = { width: 612, height: 792 };
const A4_SIZE = { width: 595.276, height: 841.89 };

type WarningSink = (warning: PdfInputWarning) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emitOnce(seen: Set<string>, sink: WarningSink | undefined, warning: PdfInputWarning): void {
  const key = `${warning.code}:${warning.path}`;
  if (seen.has(key)) return;
  seen.add(key);
  sink?.(warning);
}

function clampPageDimension(
  target: Record<string, unknown>,
  key: "height" | "width",
  path: string,
  seen: Set<string>,
  sink: WarningSink | undefined,
): void {
  const value = target[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  const clamped = Math.min(PDF_MAX_PAGE_SIZE, Math.max(PDF_MIN_PAGE_SIZE, value));
  if (clamped === value) return;
  target[key] = clamped;
  emitOnce(seen, sink, {
    code: "PDF_PAGE_SIZE_CLAMPED",
    message: `Clamped PDF page ${key} from ${value}pt to ${clamped}pt (valid range ${PDF_MIN_PAGE_SIZE}..${PDF_MAX_PAGE_SIZE}pt).`,
    path: `${path}.${key}`,
    from: value,
    to: clamped,
  });
}

function resolvedStructuredPageSize(page: Record<string, unknown>): { height: number; width: number } {
  const size = page.size;
  if (isRecord(size)) {
    return {
      height: typeof size.height === "number" ? size.height : LETTER_SIZE.height,
      width: typeof size.width === "number" ? size.width : LETTER_SIZE.width,
    };
  }
  if (size === "A4" || size === "a4") return A4_SIZE;
  return LETTER_SIZE;
}

function resolvedMargins(page: Record<string, unknown>): { bottom: number; left: number; right: number; top: number } {
  const margin = page.margin;
  if (typeof margin === "number") {
    return { bottom: margin, left: margin, right: margin, top: margin };
  }
  const partial = isRecord(margin) ? margin : {};
  return {
    bottom: typeof partial.bottom === "number" ? partial.bottom : 72,
    left: typeof partial.left === "number" ? partial.left : 72,
    right: typeof partial.right === "number" ? partial.right : 72,
    top: typeof partial.top === "number" ? partial.top : 72,
  };
}

function normalizePageGeometry(
  document: Record<string, unknown>,
  seen: Set<string>,
  sink: WarningSink | undefined,
): number | undefined {
  if (Array.isArray(document.pages)) {
    document.pages.forEach((page, index) => {
      if (!isRecord(page)) return;
      clampPageDimension(page, "width", `pages[${index}]`, seen, sink);
      clampPageDimension(page, "height", `pages[${index}]`, seen, sink);
    });
  }

  if (!isRecord(document.page)) return undefined;
  const page = document.page;
  if (isRecord(page.size)) {
    clampPageDimension(page.size, "width", "page.size", seen, sink);
    clampPageDimension(page.size, "height", "page.size", seen, sink);
  }

  const size = resolvedStructuredPageSize(page);
  const margins = resolvedMargins(page);
  const contentWidth = size.width - margins.left - margins.right;
  const contentHeight = size.height - margins.top - margins.bottom;
  if (contentWidth <= 0 || contentHeight <= 0) {
    throw new PdfError(
      "PAGE_MARGINS_INVALID",
      `PDF page margins (top=${margins.top}, right=${margins.right}, bottom=${margins.bottom}, left=${margins.left}) leave a non-positive content area (${contentWidth} x ${contentHeight}pt).`,
      {
        contentHeight,
        contentWidth,
        margins,
        pageSize: size,
        path: "page.margin",
      },
    );
  }
  return contentHeight;
}

function textValue(node: Record<string, unknown>): { pathKey: "text" | "value"; value: string } | undefined {
  if (typeof node.value === "string") return { pathKey: "value", value: node.value };
  if (typeof node.text === "string") return { pathKey: "text", value: node.text };
  return undefined;
}

function pushCellChildren(
  stack: Array<{ depth: number; node: unknown; path: string }>,
  rows: unknown,
  groupPath: string,
  depth: number,
  contentHeight: number | undefined,
  seen: Set<string>,
  sink: WarningSink | undefined,
): void {
  if (!Array.isArray(rows)) return;
  rows.forEach((row, rowIndex) => {
    if (!isRecord(row) || !Array.isArray(row.cells)) return;
    row.cells.forEach((cell, cellIndex) => {
      if (!isRecord(cell)) return;
      const minHeight = isRecord(cell.style) ? cell.style.minHeight : undefined;
      const cellPath = `${groupPath}[${rowIndex}].cells[${cellIndex}]`;
      if (typeof minHeight === "number" && contentHeight !== undefined && minHeight > contentHeight) {
        emitOnce(seen, sink, {
          code: "PDF_ELEMENT_PAGE_OVERFLOW",
          message: `Table cell minimum height ${minHeight}pt exceeds the ${contentHeight}pt printable page height; the row will be split across pages.`,
          path: `${cellPath}.style.minHeight`,
          from: minHeight,
          to: contentHeight,
        });
      }
      if (Array.isArray(cell.children)) {
        cell.children.forEach((child, childIndex) => stack.push({
          depth,
          node: child,
          path: `${cellPath}.children[${childIndex}]`,
        }));
      }
    });
  });
}

function inspectNodes(
  roots: unknown,
  rootPath: string,
  contentHeight: number | undefined,
  seen: Set<string>,
  sink: WarningSink | undefined,
): void {
  if (!Array.isArray(roots)) return;
  const stack = roots.map((node, index) => ({ depth: 1, node, path: `${rootPath}[${index}]` }));
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry || !isRecord(entry.node)) continue;
    const node = entry.node;

    if (entry.depth > PDF_MAX_CONTAINER_DEPTH) {
      throw new PdfError(
        "LAYOUT_RECURSION_LIMIT",
        `Container nesting exceeds maximum depth of ${PDF_MAX_CONTAINER_DEPTH}.`,
        { cap: PDF_MAX_CONTAINER_DEPTH, depth: entry.depth, path: entry.path },
      );
    }

    const text = textValue(node);
    if (text) {
      const token = text.value.split(/\s+/u).find((part) => Array.from(part).length >= PDF_UNBREAKABLE_TOKEN_LENGTH);
      if (token) {
        emitOnce(seen, sink, {
          code: "PDF_UNBREAKABLE_TOKEN_WRAPPED",
          message: `An unbreakable token of ${Array.from(token).length} characters will wrap at arbitrary character boundaries to remain inside the printable width.`,
          path: `${entry.path}.${text.pathKey}`,
        });
      }
    }

    if (contentHeight !== undefined && isRecord(node.style)) {
      for (const property of ["height", "minHeight"] as const) {
        const value = node.style[property];
        if (typeof value === "number" && value > contentHeight) {
          emitOnce(seen, sink, {
            code: "PDF_ELEMENT_PAGE_OVERFLOW",
            message: `Element ${property} ${value}pt exceeds the ${contentHeight}pt printable page height and may be visibly clipped.`,
            path: `${entry.path}.style.${property}`,
            from: value,
            to: contentHeight,
          });
        }
      }
    }

    if (node.type === "container" && Array.isArray(node.children)) {
      node.children.forEach((child, index) => stack.push({
        depth: entry.depth + 1,
        node: child,
        path: `${entry.path}.children[${index}]`,
      }));
    }
    if (node.type === "table") {
      const header = node.header;
      const body = node.body;
      if (Array.isArray(header) && header.length > 0 && Array.isArray(body) && body.length === 0) {
        emitOnce(seen, sink, {
          code: "PDF_TABLE_HEADER_ONLY",
          message: "Table has a header row and no body rows; rendering the header-only table.",
          path: `${entry.path}.body`,
        });
      }
      pushCellChildren(stack, node.header, `${entry.path}.header`, entry.depth + 1, contentHeight, seen, sink);
      pushCellChildren(stack, node.body, `${entry.path}.body`, entry.depth + 1, contentHeight, seen, sink);
      pushCellChildren(stack, node.footer, `${entry.path}.footer`, entry.depth + 1, contentHeight, seen, sink);
    }
  }
}

/** Mutates only page dimensions that must be clamped; all other checks are read-only. */
export function applyPdfEdgePolicies(input: unknown, sink?: WarningSink): void {
  if (!isRecord(input)) return;
  const seen = new Set<string>();
  const contentHeight = normalizePageGeometry(input, seen, sink);
  inspectNodes(input.children, "children", contentHeight, seen, sink);
  inspectNodes(input.content, "content", contentHeight, seen, sink);
}

export function warnForPaginatedSingleElement(
  input: unknown,
  pageCount: number,
  sink?: WarningSink,
): void {
  if (!isRecord(input) || pageCount <= 1) return;
  const rootKey = Array.isArray(input.children) ? "children" : Array.isArray(input.content) ? "content" : undefined;
  if (!rootKey) return;
  const roots = input[rootKey];
  if (!Array.isArray(roots) || roots.length !== 1) return;
  sink?.({
    code: "PDF_ELEMENT_PAGE_OVERFLOW",
    message: `A single document element required ${pageCount} pages; its content was paginated instead of silently clipped.`,
    path: `${rootKey}[0]`,
    from: 1,
    to: pageCount,
  });
}
