import { DeclarativeDocument, PaperDocument, EngineRenderOptions } from '@runstamp/pptx';
export { EngineRenderOptions as RunstampPptxRenderOptions } from '@runstamp/pptx';

type RunstampRenderDocument = DeclarativeDocument | PaperDocument;
interface RunstampPdfRenderOptions {
    includeNotes?: boolean;
    onInputWarning?: (warning: unknown) => void;
    onProgress?: (slideIndex: number, totalSlides: number) => void;
    pdfA?: "PDF/A-1b" | "PDF/A-2b";
    quality?: "print" | "screen";
    relaxed?: boolean;
    signal?: AbortSignal;
    tagged?: boolean;
}
interface RunstampRendererDefaults {
    pptx?: EngineRenderOptions;
    pdf?: RunstampPdfRenderOptions;
}
interface RunstampRenderer {
    renderPptx(document: RunstampRenderDocument, options?: EngineRenderOptions): Promise<Uint8Array>;
    renderPdf(document: RunstampRenderDocument, options?: RunstampPdfRenderOptions): Promise<Uint8Array>;
}
/**
 * Server-only Runstamp engine adapter. Import from `@runstamp/react/server`;
 * this module is intentionally absent from the browser entry graph.
 */
declare function createRunstampRenderer(defaults?: RunstampRendererDefaults): RunstampRenderer;
declare function renderDeckToPptx(document: RunstampRenderDocument, options?: EngineRenderOptions): Promise<Uint8Array>;
declare function renderDeckToPdf(document: RunstampRenderDocument, options?: RunstampPdfRenderOptions): Promise<Uint8Array>;

export { type RunstampPdfRenderOptions, type RunstampRenderDocument, type RunstampRenderer, type RunstampRendererDefaults, createRunstampRenderer, renderDeckToPdf, renderDeckToPptx };
