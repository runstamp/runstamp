import type { PaperDocument, PaperNode } from "./types/ast.js";

/**
 * Generic helper: sorts any array of objects that carry an optional `zIndex`
 * property, strips `zIndex` from each item in the output, and uses the
 * original array index as a stable tiebreaker.
 *
 * Benchmark 3 test target:
 *   sortByZIndex([{ id:'A', zIndex:2 }, { id:'B', zIndex:1 }, { id:'C', zIndex:3 }])
 *   → [{ id:'B' }, { id:'A' }, { id:'C' }]
 */
export function sortByZIndex<T extends { zIndex?: number }>(
  items: T[]
): Omit<T, "zIndex">[] {
  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const za = a.item.zIndex ?? 0;
      const zb = b.item.zIndex ?? 0;
      return za !== zb ? za - zb : a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => {
      const { zIndex: _z, ...rest } = item as T & { zIndex?: number };
      return rest as Omit<T, "zIndex">;
    });
}

// ---------------------------------------------------------------------------
// AST walker — operates on style.zIndex within PaperNode trees
// ---------------------------------------------------------------------------

function sortNodeChildren(nodes: PaperNode[]): PaperNode[] {
  // Single-pass: build tagged array, sort by zIndex, then strip+recurse in one .map()
  const tagged = nodes.map((node, i) => ({ node, i }));
  tagged.sort((a, b) => {
    const za = a.node.style?.zIndex ?? 0;
    const zb = b.node.style?.zIndex ?? 0;
    return za !== zb ? za - zb : a.i - b.i;
  });
  return tagged.map(({ node }) => stripZIndexFromNode(node));
}

function stripZIndexFromNode(node: PaperNode): PaperNode {
  switch (node.type) {
    case "View": {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return {
        ...node,
        style: styleRest,
        children: node.children ? sortNodeChildren(node.children) : undefined,
      };
    }
    case "Group": {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return {
        ...node,
        style: styleRest,
        children: sortNodeChildren(node.children),
      };
    }
    case "Text":
    case "Image":
    case "Table":
    case "Chart":
    case "Connector":
    case "Video":
    case "Audio": {
      const { zIndex: _z, ...styleRest } = node.style ?? {};
      return { ...node, style: styleRest };
    }
    default: {
      // Safety net for future node types — strip zIndex if present, pass through node
      const { zIndex: _z, ...styleRest } = (node as PaperNode & { style?: Record<string, unknown> }).style ?? {};
      return { ...(node as PaperNode), style: styleRest } as PaperNode;
    }
  }
}

/**
 * Walks the full PaperDocument AST and re-orders the children of every Slide
 * and View by ascending style.zIndex, encoding visual Z-order as XML document
 * order (as required by ECMA-376). Removes zIndex from all style objects.
 */
export function flattenDocumentZIndex(doc: PaperDocument): PaperDocument {
  return {
    ...doc,
    slides: doc.slides.map((slide) => {
      const { zIndex: _z, ...slideStyle } = slide.style ?? {};
      return {
        ...slide,
        style: slideStyle,
        children: sortNodeChildren(slide.children),
      };
    }),
  };
}
