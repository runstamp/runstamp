import { escapeXml } from "../utils/xml.js";

const BUILT_IN_FORMATS = new Map<string, number>([
  ["General", 0],
  ["0", 1],
  ["0.00", 2],
  ["#,##0", 3],
  ["#,##0.00", 4],
  ["0%", 9],
  ["0.00%", 10],
  ["0.00E+00", 11],
  ["# ?/?", 12],
  ["# ??/??", 13],
  ["mm-dd-yy", 14],
  ["d-mmm-yy", 15],
  ["d-mmm", 16],
  ["mmm-yy", 17],
  ["h:mm AM/PM", 18],
  ["h:mm:ss AM/PM", 19],
  ["h:mm", 20],
  ["h:mm:ss", 21],
  ["m/d/yy h:mm", 22],
  ["#,##0 ;(#,##0)", 37],
  ["#,##0 ;[Red](#,##0)", 38],
  ["#,##0.00;(#,##0.00)", 39],
  ["#,##0.00;[Red](#,##0.00)", 40],
  ["mm:ss", 45],
  ["[h]:mm:ss", 46],
  ["mmss.0", 47],
  ["##0.0E+0", 48],
  ["@", 49],
]);

export class NumFmtRegistry {
  private readonly customFormats = new Map<string, number>();
  private nextCustomId = 164;

  register(formatCode: string | undefined): number {
    if (!formatCode) {
      return 0;
    }
    const builtIn = BUILT_IN_FORMATS.get(formatCode);
    if (builtIn !== undefined) {
      return builtIn;
    }
    const existing = this.customFormats.get(formatCode);
    if (existing !== undefined) {
      return existing;
    }
    const id = this.nextCustomId;
    this.customFormats.set(formatCode, id);
    this.nextCustomId += 1;
    return id;
  }

  toXml(): string {
    if (this.customFormats.size === 0) {
      return "";
    }
    const parts = [`<numFmts count="${this.customFormats.size}">`];
    for (const [formatCode, id] of this.customFormats) {
      parts.push(`<numFmt numFmtId="${id}" formatCode="${escapeXml(formatCode)}"/>`);
    }
    parts.push(`</numFmts>`);
    return parts.join("");
  }
}
