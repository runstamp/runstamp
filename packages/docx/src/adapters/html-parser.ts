/**
 * HTML Parser
 *
 * Thin wrapper around node-html-parser providing typed helpers
 * for HTML → StructuredDocument conversion.
 *
 * No React, no DOM, no browser APIs.
 */

import { parse, HTMLElement, TextNode, Node, NodeType } from 'node-html-parser';

export { HTMLElement, TextNode, Node, NodeType };

/**
 * Parse an HTML string into an HTMLElement tree.
 * Lowercases tag names and fixes nested anchor tags.
 */
export function parseHtml(html: string): HTMLElement {
  return parse(html, {
    lowerCaseTagName: true,
    comment: false,
    fixNestedATags: true,
  });
}

/**
 * Type guard: is the node a TextNode?
 */
export function isTextNode(node: Node): node is TextNode {
  return node.nodeType === NodeType.TEXT_NODE;
}

/**
 * Type guard: is the node an HTMLElement?
 */
export function isElementNode(node: Node): node is HTMLElement {
  return node.nodeType === NodeType.ELEMENT_NODE;
}
