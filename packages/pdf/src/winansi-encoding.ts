/**
 * WinAnsiEncoding mapping for PDF Type 1 built-in fonts.
 *
 * WinAnsiEncoding is the standard encoding for non-embedded PDF fonts. It
 * differs from Latin-1 (ISO 8859-1) in the 0x80-0x9F range, where Latin-1
 * has control characters but WinAnsiEncoding maps typographic glyphs.
 *
 * Reference: PDF specification, Annex D, Table D.1.
 */

/**
 * Maps Unicode code points to WinAnsiEncoding byte values for characters
 * in the 0x80-0x9F range (where WinAnsiEncoding differs from Latin-1).
 * Characters in 0x20-0x7E and 0xA0-0xFF have identity mapping (same as Latin-1).
 */
const UNICODE_TO_WINANSI: ReadonlyMap<number, number> = new Map([
  [0x20AC, 0x80], // Euro sign
  [0x201A, 0x82], // Single low-9 quotation mark
  [0x0192, 0x83], // Latin small f with hook
  [0x201E, 0x84], // Double low-9 quotation mark
  [0x2026, 0x85], // Horizontal ellipsis
  [0x2020, 0x86], // Dagger
  [0x2021, 0x87], // Double dagger
  [0x02C6, 0x88], // Modifier letter circumflex accent
  [0x2030, 0x89], // Per mille sign
  [0x0160, 0x8A], // Latin capital S with caron
  [0x2039, 0x8B], // Single left-pointing angle quotation mark
  [0x0152, 0x8C], // Latin capital ligature OE
  [0x017D, 0x8E], // Latin capital Z with caron
  [0x2018, 0x91], // Left single quotation mark
  [0x2019, 0x92], // Right single quotation mark
  [0x201C, 0x93], // Left double quotation mark
  [0x201D, 0x94], // Right double quotation mark
  [0x2022, 0x95], // Bullet
  [0x2013, 0x96], // En dash
  [0x2014, 0x97], // Em dash
  [0x02DC, 0x98], // Small tilde
  [0x2122, 0x99], // Trade mark sign
  [0x0161, 0x9A], // Latin small s with caron
  [0x203A, 0x9B], // Single right-pointing angle quotation mark
  [0x0153, 0x9C], // Latin small ligature oe
  [0x017E, 0x9E], // Latin small z with caron
  [0x0178, 0x9F], // Latin capital Y with dieresis
]);

/**
 * Convert a Unicode code point to its WinAnsiEncoding byte value.
 * Returns undefined if the character cannot be encoded.
 */
export function unicodeToWinAnsi(codePoint: number): number | undefined {
  // ASCII and Latin-1 supplement (identity mapping)
  if (codePoint >= 0x20 && codePoint <= 0x7E) return codePoint;
  if (codePoint >= 0xA0 && codePoint <= 0xFF) return codePoint;

  // WinAnsiEncoding special range
  return UNICODE_TO_WINANSI.get(codePoint);
}

/**
 * Substitution suggestions for common Unicode characters that fall outside
 * WinAnsiEncoding. Surfaced via `WinAnsiUnmappable.suggestion` so callers can
 * tell users (or LLMs) what ASCII text would render correctly.
 */
const ASCII_SUGGESTIONS: ReadonlyMap<number, string> = new Map<number, string>([
  [0x2265, ">="], // ≥
  [0x2264, "<="], // ≤
  [0x2260, "!="], // ≠
  [0x00B1, "+/-"], // ± (in WinAnsi, kept for completeness)
  [0x00D7, "x"], // ×
  [0x00F7, "/"], // ÷
  [0x221E, "infinity"], // ∞
  [0x03B1, "alpha"], // α
  [0x03B2, "beta"], // β
  [0x03B3, "gamma"], // γ
  [0x03B4, "delta"], // δ
  [0x03B5, "epsilon"], // ε
  [0x03BC, "mu"], // μ (in WinAnsi as 0xB5)
  [0x03C0, "pi"], // π
  [0x03A3, "Sigma"], // Σ
  [0x03A9, "Omega"], // Ω
  [0x2192, "->"], // →
  [0x2190, "<-"], // ←
  [0x2191, "^"], // ↑
  [0x2193, "v"], // ↓
  [0x2713, "ok"], // ✓
  [0x2717, "x"], // ✗
]);

export interface WinAnsiUnmappable {
  /** The original character that could not be encoded. */
  char: string;
  /** Unicode code point of the offending character. */
  codePoint: number;
  /** Zero-based offset of the character within the input string. */
  index: number;
  /** ASCII substitution that would render correctly with the standard-14 fonts. */
  suggestion: string;
}

/**
 * Encode a Unicode string as WinAnsiEncoding bytes for use with PDF built-in fonts.
 * Characters that cannot be mapped are replaced with '?' (0x3F).
 *
 * When `onUnmappable` is supplied, every unmappable character is reported with
 * its index, code point, and an ASCII suggestion. This lets callers surface
 * actionable warnings (e.g. via `PdfInputWarning`) instead of silently emitting
 * `?` glyphs — the failure mode flagged in
 * `docs/0428-claude-test-based-directive2.md` §"@runstamp/pdf" item 4.
 */
export function encodeWinAnsi(
  text: string,
  onUnmappable?: (warning: WinAnsiUnmappable) => void,
): Buffer {
  const bytes = Buffer.alloc(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const mapped = unicodeToWinAnsi(code);
    if (mapped === undefined) {
      bytes[i] = 0x3F;
      if (onUnmappable) {
        onUnmappable({
          char: text[i] ?? "",
          codePoint: code,
          index: i,
          suggestion: ASCII_SUGGESTIONS.get(code) ?? "?",
        });
      }
    } else {
      bytes[i] = mapped;
    }
  }
  return bytes;
}

/**
 * Escape a WinAnsiEncoding byte buffer for use in a PDF literal string: ( ... )
 * Escapes backslash, parens, CR, LF. Uses octal escapes for bytes >= 0x80
 * to prevent UTF-8 encoding corruption in the output.
 */
export function escapeWinAnsiBytes(bytes: Buffer): string {
  const parts: string[] = ["("];
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === 0x5C) parts.push("\\\\");       // backslash
    else if (byte === 0x28) parts.push("\\(");    // (
    else if (byte === 0x29) parts.push("\\)");    // )
    else if (byte === 0x0D) parts.push("\\r");    // CR
    else if (byte === 0x0A) parts.push("\\n");    // LF
    else if (byte >= 0x20 && byte <= 0x7E) parts.push(String.fromCharCode(byte));
    else parts.push(`\\${byte.toString(8).padStart(3, "0")}`);  // octal for high bytes
  }
  parts.push(")");
  return parts.join("");
}

