/**
 * Canonical XML escaping for XMP metadata emission. The package's single
 * escapeXml implementation — do not add local copies (ga/ratchets.json
 * counts them).
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
