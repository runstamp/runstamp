import {
  PaperEngine,
  compileDeclarativeDocument,
  render as renderPptx,
  type EngineRenderOptions,
  type DeclarativeDocument,
  type PaperDocument,
} from "@runstamp/pptx";

export type RunstampRenderDocument = DeclarativeDocument | PaperDocument;

function isPaperDocument(document: RunstampRenderDocument): document is PaperDocument {
  return "type" in document && document.type === "Document";
}

export interface RunstampPdfRenderOptions {
  includeNotes?: boolean;
  onInputWarning?: (warning: unknown) => void;
  onProgress?: (slideIndex: number, totalSlides: number) => void;
  pdfA?: "PDF/A-1b" | "PDF/A-2b";
  quality?: "print" | "screen";
  relaxed?: boolean;
  signal?: AbortSignal;
  tagged?: boolean;
}

export interface RunstampRendererDefaults {
  pptx?: EngineRenderOptions;
  pdf?: RunstampPdfRenderOptions;
}

export interface RunstampRenderer {
  renderPptx(document: RunstampRenderDocument, options?: EngineRenderOptions): Promise<Uint8Array>;
  renderPdf(document: RunstampRenderDocument, options?: RunstampPdfRenderOptions): Promise<Uint8Array>;
}

/**
 * Server-only Runstamp engine adapter. Import from `@runstamp/react/server`;
 * this module is intentionally absent from the browser entry graph.
 */
export function createRunstampRenderer(defaults: RunstampRendererDefaults = {}): RunstampRenderer {
  return {
    async renderPptx(document, options) {
      const buffer = await renderPptx(document, { ...defaults.pptx, ...options });
      return new Uint8Array(buffer);
    },
    async renderPdf(document, options) {
      const paperDocument = isPaperDocument(document)
        ? document
        : compileDeclarativeDocument(document);
      const buffer = await PaperEngine.renderToPdf(paperDocument, { ...defaults.pdf, ...options });
      return new Uint8Array(buffer);
    },
  };
}

export async function renderDeckToPptx(
  document: RunstampRenderDocument,
  options?: EngineRenderOptions,
): Promise<Uint8Array> {
  return createRunstampRenderer().renderPptx(document, options);
}

export async function renderDeckToPdf(
  document: RunstampRenderDocument,
  options?: RunstampPdfRenderOptions,
): Promise<Uint8Array> {
  return createRunstampRenderer().renderPdf(document, options);
}

export type { EngineRenderOptions as RunstampPptxRenderOptions };
