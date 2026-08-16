import type { ThemeColorScheme } from "../types/ast.js";
import type { LayoutNode } from "../layout/extract.js";

export interface PreviewRenderOptions {
  width?: number;
  height?: number;
  scale?: number;
  format?: "png" | "jpeg";
  quality?: number;
}

export async function renderLayoutPreviews(
  layoutTrees: LayoutNode[],
  previewOptions?: PreviewRenderOptions,
  themeColors?: ThemeColorScheme,
): Promise<Buffer[]> {
  const { renderAllSlidesToBuffers } = await import("../renderer/index.js");
  const buffers = await renderAllSlidesToBuffers(layoutTrees, {
    width: previewOptions?.width,
    height: previewOptions?.height,
    scale: previewOptions?.scale,
    format: previewOptions?.format,
    quality: previewOptions?.quality,
    themeColors,
  });
  return buffers ?? [];
}
