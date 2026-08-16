import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import "../chunk-OWC7QHPZ.js";

// src/engine/previewGenerator.ts
async function renderLayoutPreviews(layoutTrees, previewOptions, themeColors) {
  const { renderAllSlidesToBuffers } = await import("../renderer/index.js");
  const buffers = await renderAllSlidesToBuffers(layoutTrees, {
    width: previewOptions?.width,
    height: previewOptions?.height,
    scale: previewOptions?.scale,
    format: previewOptions?.format,
    quality: previewOptions?.quality,
    themeColors
  });
  return buffers ?? [];
}
export {
  renderLayoutPreviews
};
//# sourceMappingURL=previewGenerator.js.map
