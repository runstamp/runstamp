import type { LayoutNode } from "./extract.js";

/**
 * Post-layout pass: sorts children arrays by visual order.
 * Primary: ascending style.zIndex (default 0)
 * Secondary: ascending readingOrder (default Infinity)
 * Tertiary: original array index (stable sort)
 *
 * This replaces both flattenDocumentZIndex (pre-layout) and
 * sortByReadingOrder (in orchestrator), unifying visual ordering
 * into a single pass AFTER layout, BEFORE media collection.
 *
 * This ensures DFS collectors (media/charts) and the serializer
 * traverse children in the same order → rIds stay aligned.
 */
export function applyVisualOrder(node: LayoutNode): void {
  if (!node.children || node.children.length <= 1) return;

  // Recurse first (children before parent sort)
  for (const child of node.children) {
    applyVisualOrder(child);
  }

  // Sort children in-place
  const indexed = node.children.map((child, i) => ({ child, i }));
  indexed.sort((a, b) => {
    const za = a.child.style?.zIndex ?? 0;
    const zb = b.child.style?.zIndex ?? 0;
    if (za !== zb) return za - zb;
    const ra = "readingOrder" in a.child ? (a.child.readingOrder as number) ?? Infinity : Infinity;
    const rb = "readingOrder" in b.child ? (b.child.readingOrder as number) ?? Infinity : Infinity;
    if (ra !== rb) return ra - rb;
    return a.i - b.i;
  });
  node.children = indexed.map(({ child }) => child);
}
