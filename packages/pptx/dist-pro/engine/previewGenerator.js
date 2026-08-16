import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import "../chunk-VIXD5LXH.js";

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
