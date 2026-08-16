import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);

// src/ooxml/chart/chartColorResolver.ts
var DEFAULT_SCHEME = {
  dk1: "000000",
  lt1: "FFFFFF",
  dk2: "44546A",
  lt2: "E7E6E6",
  accent1: "4472C4",
  accent2: "ED7D31",
  accent3: "A9D18E",
  accent4: "FFC000",
  accent5: "5B9BD5",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72",
  bg1: "FFFFFF",
  tx1: "000000",
  bg2: "E7E6E6",
  tx2: "44546A"
};
function resolveColorToHex(color, themeColors) {
  if (color === void 0 || color === null) return void 0;
  if (typeof color === "object" && "scheme" in color) {
    const token = color.scheme;
    const resolved = themeColors?.[token] ?? DEFAULT_SCHEME[token];
    return resolved ? `#${resolved.replace(/^#/, "")}` : void 0;
  }
  if (typeof color === "string") {
    if (!color.startsWith("#") && (DEFAULT_SCHEME[color] || themeColors?.[color])) {
      const resolved = themeColors?.[color] ?? DEFAULT_SCHEME[color];
      return resolved ? `#${resolved.replace(/^#/, "")}` : void 0;
    }
    if (/^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`;
    if (color.startsWith("#")) return color;
    return color;
  }
  return void 0;
}

export {
  DEFAULT_SCHEME,
  resolveColorToHex
};
//# sourceMappingURL=chunk-MA6IZLCE.js.map
