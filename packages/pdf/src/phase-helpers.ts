/**
 * Phase detection, font fallback, and shorthand normalization helpers
 * shared by the engine entry point and the per-phase wrapper modules.
 *
 * These were extracted from `engine.ts` during M3.b so that the
 * `composePhases` runner could consume them without creating a cycle
 * (engine.ts → phase wrapper → engine.ts).
 *
 * No behavior changes from the engine.ts originals.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PdfDocument } from "./engine.js";
import { buildFontInputKey, type PdfEmbeddedFontInput } from "./font-embedding.js";
import type { PdfDocumentInteractiveSpec, PdfRenderedPage } from "./pdf-renderer.js";
import type { PdfDocumentLayoutNode } from "./phase3-types.js";
import type { PdfDocumentPhase6, PdfPhase6DocumentNode } from "./phase6-types.js";
import type { PdfDocumentPhase7, PdfPhase7DocumentNode } from "./phase7-types.js";
import type { PdfDocumentPhase8 } from "./phase8-types.js";

export const DEFAULT_PAGE_HEIGHT = 792;
export const DEFAULT_PAGE_WIDTH = 612;
export const DEFAULT_TEXT_X = 72;
export const DEFAULT_TEXT_Y = 720;
export const DEFAULT_FONT_SIZE = 12;
export const DEFAULT_FONT = "Helvetica";
export const DEFAULT_FALLBACK_FONT_FAMILY = "Lato";
export const DEFAULT_FALLBACK_FONT_FILE = "Lato-Regular.ttf";

// Phase detection -----------------------------------------------------------

export function isPhase3Document(document: PdfDocument): document is PdfDocumentPhase7 {
  return Boolean(document && typeof document === "object" && ("children" in document || "content" in document));
}

export function containsTableNode(nodes: PdfDocumentLayoutNode[] | undefined): boolean {
  if (!nodes) {
    return false;
  }
  return nodes.some((node) => {
    if (node.type === "table") {
      return true;
    }
    if (node.type === "container") {
      return containsTableNode(node.children);
    }
    return false;
  });
}

function nodeHasPhase6Features(node: PdfPhase6DocumentNode): boolean {
  if (["toc", "form-text", "form-checkbox", "form-dropdown", "form-radio", "form-signature", "note-annotation", "highlight-annotation"].includes(node.type)) {
    return true;
  }
  if ("id" in node && typeof node.id === "string" && node.id.length > 0) {
    return true;
  }
  if ("link" in node && node.link) {
    return true;
  }
  if (node.type === "container") {
    return node.children.some((child) => nodeHasPhase6Features(child as PdfPhase6DocumentNode));
  }
  if (node.type === "table") {
    const rows = [
      ...(node.header ?? []),
      ...(node.body ?? []),
      ...(node.footer ?? []),
    ];
    return rows.some((row) =>
      row.cells.some((cell) =>
        cell.children.some((child) => nodeHasPhase6Features(child as PdfPhase6DocumentNode)),
      ),
    );
  }
  return false;
}

export function requiresPhase6DocumentRender(document: PdfDocumentPhase6): boolean {
  if (document.bookmarks || document.pageLabels || document.pageNumber || document.dynamicHeader || document.dynamicFooter) {
    return true;
  }
  if (document.meta?.subject || document.meta?.keywords || document.meta?.creationDate || document.meta?.modDate) {
    return true;
  }
  const nodes = (document.children ?? document.content ?? []) as PdfPhase6DocumentNode[];
  return nodes.some((node) => nodeHasPhase6Features(node));
}

function nodeHasPhase7Features(node: PdfPhase7DocumentNode): boolean {
  if (["figure", "graphic", "list"].includes(node.type)) {
    return true;
  }
  if ("lang" in node && typeof node.lang === "string" && node.lang.length > 0) {
    return true;
  }
  if (node.type === "container") {
    return (node.children ?? []).some((child) => nodeHasPhase7Features(child as PdfPhase7DocumentNode));
  }
  if (node.type === "table") {
    // Tables may use either the rich row shape ({ cells: [{ children: [...] }] })
    // or the shorthand string-array shape (["a", "b"]). Shorthand rows can't
    // contain Phase 7 features by definition, so guard against undefined cells
    // here — normalization runs before this in the engine, but be defensive.
    const rows = node.body ?? [];
    return rows.some((row) => {
      const cells = (row as { cells?: unknown }).cells;
      if (!Array.isArray(cells)) return false;
      return cells.some((cell) => {
        const children = (cell as { children?: unknown }).children;
        if (!Array.isArray(children)) return false;
        return children.some((child) => nodeHasPhase7Features(child as PdfPhase7DocumentNode));
      });
    });
  }
  return false;
}

export function requiresPhase7DocumentRender(document: PdfDocumentPhase7): boolean {
  if (document.accessibility?.tagged || document.accessibility?.lang) {
    return true;
  }
  const nodes = (document.children ?? document.content ?? []) as PdfPhase7DocumentNode[];
  return nodes.some((node) => nodeHasPhase7Features(node));
}

export function requiresPhase8DocumentRender(document: PdfDocumentPhase8): boolean {
  return document.pdfa?.enabled === true;
}

export function requiresTaggedAccessibilityPro(document: PdfDocument): boolean {
  if (!isPhase3Document(document)) {
    return false;
  }

  const phase8Document = document as PdfDocumentPhase8;
  if (phase8Document.pdfa?.enabled && (phase8Document.pdfa.conformance ?? "2a") === "2a") {
    return true;
  }

  return (document as PdfDocumentPhase7).accessibility?.tagged === true;
}

export function requiresEmbeddedFontPro(document: PdfDocument): boolean {
  const visit = (value: unknown): boolean => {
    if (
      value == null
      || typeof value !== "object"
      || Buffer.isBuffer(value)
      || value instanceof Uint8Array
    ) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some(visit);
    }
    const record = value as Record<string, unknown>;
    if (
      record.font
      && typeof record.font === "object"
      && "source" in (record.font as Record<string, unknown>)
    ) {
      return true;
    }
    if (Array.isArray(record.fallbackFonts) && record.fallbackFonts.length > 0) {
      return true;
    }
    if (
      record.fallbackFont
      && typeof record.fallbackFont === "object"
      && "source" in (record.fallbackFont as Record<string, unknown>)
    ) {
      return true;
    }
    return Object.values(record).some(visit);
  };

  return visit(document);
}

// Shorthand table normalization ---------------------------------------------

// Convert shorthand table rows (string[][]) into the rich row shape
// ({ cells: [{ children: [{ type: "paragraph", value: "..." }] }] }) that the
// downstream phase5/6/7 layout pipelines require. The shorthand form is a
// frequent JSON convenience for invoice/report-style tables and showed up
// across the playground showcase templates; without normalization the engine
// crashes with "Cannot read properties of undefined (reading 'some')" deep in
// feature detection or layout. Mutates rows in place to mirror existing
// in-place mutations on the document object (see pdfa metadata application).
function normalizeShorthandTableRow(row: unknown): unknown {
  if (Array.isArray(row)) {
    return {
      cells: row.map((cellValue) => ({
        children: [
          {
            type: "paragraph",
            value: typeof cellValue === "string" ? cellValue : String(cellValue ?? ""),
          },
        ],
      })),
    };
  }
  return row;
}

function normalizeShorthandTablesInNodes(nodes: unknown): void {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const typed = node as { type?: string; children?: unknown; header?: unknown; body?: unknown; footer?: unknown };
    if (typed.type === "container") {
      normalizeShorthandTablesInNodes(typed.children);
      continue;
    }
    if (typed.type === "table") {
      if (Array.isArray(typed.header)) {
        typed.header = typed.header.map(normalizeShorthandTableRow);
      }
      if (Array.isArray(typed.body)) {
        typed.body = typed.body.map(normalizeShorthandTableRow);
      }
      if (Array.isArray(typed.footer)) {
        typed.footer = typed.footer.map(normalizeShorthandTableRow);
      }
      // Cell children may themselves contain nested tables — recurse.
      const body = typed.body as Array<{ cells?: Array<{ children?: unknown }> }> | undefined;
      for (const row of body ?? []) {
        for (const cell of row.cells ?? []) {
          normalizeShorthandTablesInNodes(cell.children);
        }
      }
    }
  }
}

export function normalizeShorthandTables(document: PdfDocument): void {
  if (!document || typeof document !== "object") return;
  const doc = document as { children?: unknown; content?: unknown };
  normalizeShorthandTablesInNodes(doc.children);
  normalizeShorthandTablesInNodes(doc.content);
}

// Built-in font fallback ----------------------------------------------------

export function cloneRenderedPages(pages: PdfRenderedPage[]): PdfRenderedPage[] {
  return pages.map((page) => ({
    ...page,
    annotations: [...(page.annotations ?? [])],
    extraCommands: [...(page.extraCommands ?? [])],
    graphics: [...(page.graphics ?? [])],
    texts: page.texts.map((text) => ({ ...text })),
  }));
}

/**
 * Locate the bundled font directory by walking up from this module.
 *
 * A fixed `dirname(dirname(...))` was wrong: it assumes the emitted module sits
 * exactly one directory below the package root, which holds for `dist/index.js`
 * but not for `dist/ops/index.js`. The `./ops` subpath therefore resolved
 * `dist/fixtures/fonts`, found nothing, and silently shipped with no fallback
 * font — every character outside Latin-1 became `?` for anyone importing
 * `@runstamp/pdf/ops`. Walking up removes the depth assumption, so a new
 * subpath at any nesting keeps working.
 */
function resolveBundledFontDir(): string | undefined {
  let cursor = dirname(fileURLToPath(import.meta.url));
  // Bounded: package roots are never deep, and this must not walk to `/`.
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(cursor, "fixtures", "fonts");
    if (existsSync(join(candidate, DEFAULT_FALLBACK_FONT_FILE))) return candidate;
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return undefined;
}

export function resolveAutomaticFallbackFont(): PdfEmbeddedFontInput | undefined {
  const envPath = process.env.RUNSTAMP_PDF_DEFAULT_FONT_PATH?.trim();
  if (envPath) {
    return {
      family: process.env.RUNSTAMP_PDF_DEFAULT_FONT_FAMILY?.trim() || DEFAULT_FALLBACK_FONT_FAMILY,
      source: envPath,
    };
  }

  const fontDir = resolveBundledFontDir();
  if (fontDir === undefined) {
    return undefined;
  }

  return {
    family: DEFAULT_FALLBACK_FONT_FAMILY,
    source: join(fontDir, DEFAULT_FALLBACK_FONT_FILE),
  };
}

export function applyBuiltInFontFallback(
  pages: PdfRenderedPage[],
  interactive: PdfDocumentInteractiveSpec,
  fallbackFont: PdfEmbeddedFontInput | undefined,
): { interactive: PdfDocumentInteractiveSpec; pages: PdfRenderedPage[] } {
  const needsFallback = pages.some((page) =>
    page.texts.some((text) => !text.font || text.font === DEFAULT_FONT)) ||
    (interactive.sharedForms ?? []).some((form) => !form.fontResourceKey || form.fontResourceKey === DEFAULT_FONT);

  if (!needsFallback || !fallbackFont) {
    return { interactive, pages };
  }

  const clonedPages = cloneRenderedPages(pages);
  for (const page of clonedPages) {
    for (const text of page.texts) {
      if (!text.font || text.font === DEFAULT_FONT) {
        text.font = fallbackFont;
      }
    }
  }

  const fallbackKey = buildFontInputKey(fallbackFont);
  return {
    pages: clonedPages,
    interactive: {
      ...interactive,
      sharedForms: (interactive.sharedForms ?? []).map((form) => ({
        ...form,
        fontResourceKey: !form.fontResourceKey || form.fontResourceKey === DEFAULT_FONT
          ? fallbackKey
          : form.fontResourceKey,
      })),
    },
  };
}
