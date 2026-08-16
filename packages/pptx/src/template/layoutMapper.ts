// src/template/layoutMapper.ts — Layout/placeholder mapping

import type { PaperSlide } from "../types/ast.js";
import type { TemplateIndex, LayoutInfo, PlaceholderInfo } from "./parser.js";

export interface MappedSlide {
  layout: LayoutInfo;
  placeholders: PlaceholderInfo[];
}

/**
 * Maps a PaperSlide to a template layout by layoutName.
 * Returns null if no matching layout found → falls back to from-scratch.
 */
export function mapSlideToLayout(
  slide: PaperSlide,
  templateIndex: TemplateIndex,
): MappedSlide | null {
  if (!slide.layoutName) return null;

  const layout = templateIndex.layouts.find(
    (l) => l.name.toLowerCase() === slide.layoutName!.toLowerCase(),
  );

  if (!layout) return null;

  return {
    layout,
    placeholders: layout.placeholders,
  };
}

/**
 * Resolves a layout name to a relative slideLayout target path.
 * Returns null if the layout name is not found in the template.
 */
export function resolveLayoutTarget(
  layoutName: string | undefined,
  templateIndex: TemplateIndex,
): string | null {
  if (!layoutName) return null;

  const index = templateIndex.layouts.findIndex(
    (l) => l.name.toLowerCase() === layoutName.toLowerCase(),
  );

  if (index === -1) return null;

  return `../slideLayouts/slideLayout${index + 1}.xml`;
}
