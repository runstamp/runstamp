import { compileDeclarativeDocument, PaperEngine, render } from '@runstamp/pptx';

// src/server.ts
function isPaperDocument(document) {
  return "type" in document && document.type === "Document";
}
function createRunstampRenderer(defaults = {}) {
  return {
    async renderPptx(document, options) {
      const buffer = await render(document, { ...defaults.pptx, ...options });
      return new Uint8Array(buffer);
    },
    async renderPdf(document, options) {
      const paperDocument = isPaperDocument(document) ? document : compileDeclarativeDocument(document);
      const buffer = await PaperEngine.renderToPdf(paperDocument, { ...defaults.pdf, ...options });
      return new Uint8Array(buffer);
    }
  };
}
async function renderDeckToPptx(document, options) {
  return createRunstampRenderer().renderPptx(document, options);
}
async function renderDeckToPdf(document, options) {
  return createRunstampRenderer().renderPdf(document, options);
}

export { createRunstampRenderer, renderDeckToPdf, renderDeckToPptx };
//# sourceMappingURL=server.js.map
//# sourceMappingURL=server.js.map