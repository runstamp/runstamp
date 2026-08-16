// src/template/xmlParser.ts — Shared OOXML parser instance (fast-xml-parser)

import { XMLParser, XMLBuilder } from "fast-xml-parser";

// ---------------------------------------------------------------------------
// Read-only parser — used for structural extraction (layouts, themes, etc.)
// ---------------------------------------------------------------------------

export const ooxmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  processEntities: false,
});

// ---------------------------------------------------------------------------
// Round-trip parser + builder — for DOM-based XML mutation in mutator.ts.
// The isArray callback ensures multi-occurrence elements are always arrays,
// preventing scalar/array ambiguity on round-trip.
// ---------------------------------------------------------------------------

const ALWAYS_ARRAY_TAGS = new Set([
  "Override", "Default", "Relationship",
  "p:sldId", "p:sldMasterId",
]);

export const ooxmlMutationParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  processEntities: false,
  isArray: (tagName: string) => ALWAYS_ARRAY_TAGS.has(tagName),
});

export const ooxmlMutationBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
  format: true,
  indentBy: "  ",
});

/**
 * Coerce a value that may be a single object, an array, or undefined into an array.
 * OOXML frequently has elements that can appear 0, 1, or N times —
 * fast-xml-parser returns a scalar for 1 and an array for N.
 */
export function asArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}
