import { renderPdfPages } from "./pdf-renderer.js";
import { analyzePhase5Document } from "./phase5-table-layout.js";
import type { PdfDocumentPhase3 } from "./phase3-types.js";

export async function renderPhase5Document(document: PdfDocumentPhase3): Promise<Buffer> {
  const analysis = await analyzePhase5Document(document);
  return renderPdfPages({
    meta: analysis.meta,
    pages: analysis.pages,
  });
}
