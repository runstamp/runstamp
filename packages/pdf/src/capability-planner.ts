import type { PdfDocument } from "./engine.js";
import type { PdfEmbeddedFontInput } from "./font-embedding.js";
import type { PdfGraphic } from "./phase4-types.js";
import type { PdfDocumentLayoutNode } from "./phase3-types.js";
import type { PdfPhase5TableCell, PdfPhase5TableRow } from "./phase5-types.js";
import type { PdfPhase7DocumentNode } from "./phase7-types.js";
import type { PdfDocumentPhase8 } from "./phase8-types.js";
import type { PdfRenderOptions } from "./phase9-types.js";
import { containsTableNode, isPhase3Document } from "./phase-helpers.js";

export interface PdfCapabilities {
  assets: boolean;
  encryption: boolean;
  flatPages: boolean;
  forms: boolean;
  interactive: boolean;
  layout: boolean;
  pdfa: boolean;
  signature: boolean;
  streaming: boolean;
  tables: boolean;
  taggedAccessibility: boolean;
}

export type PdfSelectedPhase =
  | "phase2-flat"
  | "phase3-layout"
  | "phase5-tables"
  | "phase6-interactive"
  | "phase7-tagged"
  | "phase8-pdfa";

export interface PdfCapabilityPlan {
  capabilities: PdfCapabilities;
  passes: string[];
  selectedPhase: PdfSelectedPhase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasEmbeddedFont(font: unknown): boolean {
  return isRecord(font) && typeof font.family === "string" && "source" in font;
}

function hasBinaryGraphic(graphic: unknown): boolean {
  return isRecord(graphic) && (graphic.type === "image" || graphic.type === "svg");
}

function getNodeChildren(node: Record<string, unknown>): unknown[] {
  return Array.isArray(node.children) ? node.children : [];
}

function tableRows(node: Record<string, unknown>): unknown[] {
  return [
    ...(Array.isArray(node.header) ? node.header : []),
    ...(Array.isArray(node.body) ? node.body : []),
    ...(Array.isArray(node.footer) ? node.footer : []),
  ];
}

function tableCellChildren(row: unknown): unknown[] {
  if (!isRecord(row) || !Array.isArray(row.cells)) {
    return [];
  }
  return row.cells.flatMap((cell: unknown) =>
    isRecord(cell) && Array.isArray(cell.children) ? cell.children : [],
  );
}

function visitNodes(nodes: unknown[], capabilities: PdfCapabilities): void {
  for (const node of nodes) {
    if (!isRecord(node) || typeof node.type !== "string") {
      continue;
    }

    if (node.type === "table") {
      capabilities.tables = true;
      for (const row of tableRows(node)) {
        visitNodes(tableCellChildren(row), capabilities);
      }
    }

    if (["toc", "note-annotation", "highlight-annotation"].includes(node.type)) {
      capabilities.interactive = true;
    }
    if (["form-text", "form-checkbox", "form-dropdown", "form-radio", "form-signature"].includes(node.type)) {
      capabilities.forms = true;
      capabilities.interactive = true;
    }
    if (isRecord(node.link) || (typeof node.id === "string" && node.id.length > 0)) {
      capabilities.interactive = true;
    }
    if (["figure", "graphic", "list"].includes(node.type) || typeof node.lang === "string") {
      capabilities.taggedAccessibility = true;
    }
    if (node.type === "figure") {
      capabilities.assets = true;
    }
    if (node.type === "graphic" && hasBinaryGraphic(node.graphic)) {
      capabilities.assets = true;
    }
    if (hasEmbeddedFont(node.font)) {
      capabilities.assets = true;
    }
    if (Array.isArray(node.fallbackFonts) && node.fallbackFonts.some(hasEmbeddedFont)) {
      capabilities.assets = true;
    }
    if (Array.isArray(node.graphics) && node.graphics.some((graphic) => hasBinaryGraphic(graphic as PdfGraphic))) {
      capabilities.assets = true;
    }

    visitNodes(getNodeChildren(node), capabilities);
  }
}

function hasFlatPageAssets(document: PdfDocument): boolean {
  if (!("pages" in document) || !Array.isArray(document.pages)) {
    return false;
  }
  return document.pages.some((page) => {
    if (!isRecord(page)) {
      return false;
    }
    const graphics = Array.isArray(page.graphics) ? page.graphics : [];
    const texts = [
      ...(Array.isArray(page.texts) ? page.texts : []),
      ...(isRecord(page.text) ? [page.text] : []),
    ];
    return graphics.some(hasBinaryGraphic) ||
      texts.some((text) => isRecord(text) && hasEmbeddedFont(text.font));
  });
}

function hasDocumentLevelInteractivity(document: PdfDocument): boolean {
  const interactive = document as PdfDocument & {
    bookmarks?: unknown;
    dynamicFooter?: unknown;
    dynamicHeader?: unknown;
    pageLabels?: unknown;
    pageNumber?: unknown;
  };
  return Boolean(
    interactive.bookmarks ||
      interactive.pageLabels ||
      interactive.pageNumber ||
      interactive.dynamicHeader ||
      interactive.dynamicFooter ||
      document.meta?.subject ||
      document.meta?.keywords ||
      document.meta?.creationDate ||
      document.meta?.modDate,
  );
}

function buildPassList(capabilities: PdfCapabilities): string[] {
  const passes = ["input-normalization", "schema-validation"];
  if (capabilities.layout) {
    passes.push("layout-materialization");
  }
  if (capabilities.tables) {
    passes.push("table-materialization");
  }
  if (capabilities.interactive || capabilities.forms) {
    passes.push("interactive-annotation-pass");
  }
  if (capabilities.taggedAccessibility) {
    passes.push("tagged-structure-pass");
  }
  if (capabilities.pdfa) {
    passes.push("pdfa-compliance-pass");
  }
  if (capabilities.assets) {
    passes.push("asset-preparation");
  }
  passes.push("writer-planning", "serialization", "post-emit-validation");
  return passes;
}

function selectPhase(capabilities: PdfCapabilities): PdfSelectedPhase {
  if (capabilities.pdfa) return "phase8-pdfa";
  if (capabilities.taggedAccessibility) return "phase7-tagged";
  if (capabilities.interactive || capabilities.forms) return "phase6-interactive";
  if (capabilities.tables) return "phase5-tables";
  if (capabilities.layout) return "phase3-layout";
  return "phase2-flat";
}

export function analyzePdfCapabilities(document: PdfDocument, options?: PdfRenderOptions): PdfCapabilities {
  const capabilities: PdfCapabilities = {
    assets: false,
    encryption: Boolean(options?.encryption),
    flatPages: "pages" in document && Array.isArray(document.pages),
    forms: false,
    interactive: false,
    layout: isPhase3Document(document),
    pdfa: Boolean(options?.pdfA || (document as PdfDocumentPhase8).pdfa?.enabled),
    signature: Boolean(options?.signature),
    streaming: false,
    tables: false,
    taggedAccessibility: Boolean((document as { accessibility?: { lang?: string; tagged?: boolean } }).accessibility?.tagged ||
      (document as { accessibility?: { lang?: string } }).accessibility?.lang),
  };

  if (capabilities.layout) {
    capabilities.interactive = hasDocumentLevelInteractivity(document);
    const nodes = ((document as { children?: unknown[]; content?: unknown[] }).children ??
      (document as { children?: unknown[]; content?: unknown[] }).content ??
      []) as PdfPhase7DocumentNode[];
    capabilities.tables = containsTableNode(nodes as PdfDocumentLayoutNode[]);
    visitNodes(nodes, capabilities);
  }

  if (hasFlatPageAssets(document)) {
    capabilities.assets = true;
  }

  const pdfa = (document as PdfDocumentPhase8).pdfa;
  if (pdfa?.iccProfile || hasEmbeddedFont(pdfa?.fallbackFont) || (pdfa?.fallbackFonts ?? []).some((font: PdfEmbeddedFontInput) => hasEmbeddedFont(font))) {
    capabilities.assets = true;
  }

  return capabilities;
}

export function planPdfCapabilities(document: PdfDocument, options?: PdfRenderOptions): PdfCapabilityPlan {
  const capabilities = analyzePdfCapabilities(document, options);
  return {
    capabilities,
    passes: buildPassList(capabilities),
    selectedPhase: selectPhase(capabilities),
  };
}
