import type { LayoutNode } from "./extract.js";

export interface TraverseLayoutOptions {
  skipHidden?: boolean;
}

export function traverseLayoutTree(
  node: LayoutNode,
  visitor: (node: LayoutNode) => void,
  options: TraverseLayoutOptions = {},
): void {
  if (options.skipHidden && node.style?.display === "none") {
    return;
  }

  visitor(node);

  for (const child of node.children ?? []) {
    traverseLayoutTree(child, visitor, options);
  }
}

export function collectLayoutNodes(
  node: LayoutNode,
  predicate: (node: LayoutNode) => boolean,
  options: TraverseLayoutOptions = {},
): LayoutNode[] {
  const results: LayoutNode[] = [];
  traverseLayoutTree(node, (candidate) => {
    if (predicate(candidate)) {
      results.push(candidate);
    }
  }, options);
  return results;
}

export function someLayoutNode(
  node: LayoutNode,
  predicate: (node: LayoutNode) => boolean,
  options: TraverseLayoutOptions = {},
): boolean {
  let found = false;
  traverseLayoutTree(node, (candidate) => {
    if (!found && predicate(candidate)) {
      found = true;
    }
  }, options);
  return found;
}
