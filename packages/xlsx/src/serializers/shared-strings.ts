import { XML_DECLARATION, escapeXml, needsXmlSpacePreserve, sanitizeSharedString } from "../utils/xml.js";

export class SharedStringTable {
  private readonly map = new Map<string, number>();
  private readonly strings: string[] = [];
  private referenceCount = 0;

  register(value: string): number {
    const sanitized = sanitizeSharedString(value);
    this.referenceCount += 1;

    const existing = this.map.get(sanitized);
    if (existing !== undefined) {
      return existing;
    }

    const index = this.strings.length;
    this.strings.push(sanitized);
    this.map.set(sanitized, index);
    return index;
  }

  get count(): number {
    return this.referenceCount;
  }

  get uniqueCount(): number {
    return this.strings.length;
  }

  get values(): readonly string[] {
    return this.strings;
  }

  toXml(): string {
    const parts: string[] = [
      XML_DECLARATION,
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.count}" uniqueCount="${this.uniqueCount}">`,
    ];

    for (const value of this.strings) {
      const preserve = needsXmlSpacePreserve(value) ? ' xml:space="preserve"' : "";
      parts.push(`<si><t${preserve}>${escapeXml(value)}</t></si>`);
    }

    parts.push("</sst>");
    return parts.join("");
  }
}
