/**
 * actionTitle — eyebrow + 1–2 line action title.
 *
 * The McKinsey-style action title pattern: a short uppercase eyebrow at the
 * top, followed by a 1–2 line declarative title carrying the slide's main
 * insight. Composes the existing sectionTag + textBlock primitives so the
 * caller doesn't have to manually wire two regions.
 *
 * Layout:
 *   - sectionTag occupies the top ~25% of the region (typically 1 grid row).
 *   - textBlock occupies the remaining ~75% (typically 2 grid rows) with
 *     `role: "title"`, `weight: 500`. Caller can override the title size.
 *
 * Designed for full-width regions (`colSpan: 12`, `rowSpan: 3`) but works at
 * any size — the eyebrow takes a fixed pixel band and the title gets the
 * rest. Returns `clipped` if either child clips.
 */

import type { Primitive, PrimitiveResult } from "./primitive.js";
import type { PrimitiveNode } from "../layout/index.js";
import { sectionTag } from "./sectionTag.js";
import { textBlock } from "./textBlock.js";

export interface ActionTitleInput {
  /** Optional eyebrow label (rendered as upper-cased pill). Omit for title-only. */
  eyebrow?: string;
  /** The action title sentence. May wrap to 2 lines. */
  title: string;
  /** Override the title font size. Default 22pt. */
  titleSize?: number;
  /** Override the title font weight. Default 500. */
  titleWeight?: number;
}

const EYEBROW_BAND_PX = 24;
const GAP_PX = 6;

export const actionTitle: Primitive<ActionTitleInput> = (input, tokens, region) => {
  const nodes: PrimitiveNode[] = [];
  let anyClipped = false;
  let topOffset = 0;

  if (input.eyebrow) {
    const tagRegion = {
      left: region.left,
      top: region.top,
      width: region.width,
      height: Math.min(EYEBROW_BAND_PX, region.height),
    };
    const tagResult = sectionTag({ label: input.eyebrow }, tokens, tagRegion);
    nodes.push(...tagResult.nodes);
    if (tagResult.overflow.kind === "clipped") anyClipped = true;
    topOffset = tagRegion.height + GAP_PX;
  }

  const titleHeight = Math.max(0, region.height - topOffset);
  if (titleHeight <= 0) {
    return {
      nodes,
      overflow: {
        kind: "clipped",
        droppedCount: 0,
        reason: "actionTitle region too short for the title row",
      },
    };
  }

  const titleRegion = {
    left: region.left,
    top: region.top + topOffset,
    width: region.width,
    height: titleHeight,
  };
  const titleResult = textBlock(
    {
      content: input.title,
      role: "title",
      size: input.titleSize ?? 22,
      weight: input.titleWeight ?? 500,
      align: "left",
      verticalAlign: "top",
    },
    tokens,
    titleRegion,
  );
  nodes.push(...titleResult.nodes);
  if (titleResult.overflow.kind === "clipped" || titleResult.overflow.kind === "paginated") {
    anyClipped = true;
  }

  const overflow: PrimitiveResult["overflow"] = anyClipped
    ? { kind: "clipped", droppedCount: 0, reason: "actionTitle child clipped or paginated" }
    : { kind: "fit" };

  return { nodes, overflow };
};
