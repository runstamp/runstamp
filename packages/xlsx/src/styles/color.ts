import { escapeXml } from "../utils/xml.js";

export interface SerializedColor {
  xmlAttributes: string;
}

function normalizeHex(color: string): string {
  const raw = color.startsWith("#") ? color.slice(1) : color;
  if (raw.length === 6) {
    return `FF${raw.toUpperCase()}`;
  }
  if (raw.length === 8) {
    return raw.toUpperCase();
  }
  return raw.toUpperCase();
}

export function serializeColorAttributes(color: string): string {
  if (color.startsWith("theme:")) {
    const [, themeIndex, tint] = color.split(":");
    const attributes = [`theme="${escapeXml(themeIndex)}"`];
    if (tint !== undefined) {
      attributes.push(`tint="${escapeXml(tint)}"`);
    }
    return attributes.join(" ");
  }

  return `rgb="${normalizeHex(color)}"`;
}
