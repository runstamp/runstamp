// src/ooxml/drawing/xmlEscape.ts — Shared XML escaping primitives
//
// Extracted to break the circular dependency between math.ts and textUtils.ts.
// Both modules import from here instead of duplicating the logic.

/** Strips XML 1.0 invalid control characters (U+0000-U+0008, U+000B, U+000C, U+000E-U+001F) */
export function stripXmlInvalidChars(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/** Escapes a string for safe inclusion in XML text content or attribute values. */
export function escapeXml(unsafe: string): string {
  return stripXmlInvalidChars(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

/** Escapes a string for use in XML attribute values. */
export function escapeXmlAttr(unsafe: string): string {
  return escapeXml(unsafe);
}
