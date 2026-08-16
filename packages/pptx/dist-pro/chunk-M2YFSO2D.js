import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  SCHEME_COLORS
} from "./chunk-TM4NN2PA.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";

// src/ooxml/drawing/xmlEscape.ts
function stripXmlInvalidChars(text) {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}
function escapeXml(unsafe) {
  return stripXmlInvalidChars(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}
function escapeXmlAttr(unsafe) {
  return escapeXml(unsafe);
}

// src/ooxml/colorXml.ts
var SCHEME_COLOR_TOKENS = new Set(SCHEME_COLORS);
function isSchemeColorToken(color) {
  if (typeof color === "object" && "scheme" in color) return true;
  return SCHEME_COLOR_TOKENS.has(color);
}
function normalizeRgbHex(color) {
  const raw = color.replace("#", "").toUpperCase();
  if (/^[0-9A-F]{6}$/.test(raw)) return raw;
  if (/^[0-9A-F]{3}$/.test(raw)) {
    return raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  }
  if (/^[0-9A-F]{8}$/.test(raw)) return raw.slice(0, 6);
  return "000000";
}
function resolveColorReference(color) {
  if (isSchemeColorToken(color)) {
    return { type: "scheme", value: color };
  }
  return { type: "srgb", value: normalizeRgbHex(color) };
}
function emitColorModifierChildren(color, includeAlpha) {
  let children = "";
  if (color.tint !== void 0) children += `<a:tint val="${Math.round(color.tint * 1e3)}"/>`;
  if (color.shade !== void 0) children += `<a:shade val="${Math.round(color.shade * 1e3)}"/>`;
  if (color.comp) children += `<a:comp/>`;
  if (color.inv) children += `<a:inv/>`;
  if (color.gray) children += `<a:gray/>`;
  if (includeAlpha !== void 0) children += `<a:alpha val="${includeAlpha}"/>`;
  if (color.hueMod !== void 0) children += `<a:hueMod val="${Math.round(color.hueMod * 1e3)}"/>`;
  if (color.hueOff !== void 0) children += `<a:hueOff val="${Math.round(color.hueOff * 6e4)}"/>`;
  if (color.satMod !== void 0) children += `<a:satMod val="${Math.round(color.satMod * 1e3)}"/>`;
  if (color.satOff !== void 0) children += `<a:satOff val="${Math.round(color.satOff * 1e3)}"/>`;
  if (color.lumMod !== void 0) children += `<a:lumMod val="${Math.round(color.lumMod * 1e3)}"/>`;
  if (color.lumOff !== void 0) children += `<a:lumOff val="${Math.round(color.lumOff * 1e3)}"/>`;
  return children;
}
function emitOoxmlColor(color, opacity) {
  const alphaVal = opacity !== void 0 && opacity < 1 ? Math.min(1e5, Math.max(0, Math.round(opacity * 1e5))) : void 0;
  if (typeof color === "object" && "scheme" in color) {
    const children = emitColorModifierChildren(color, alphaVal);
    const safeScheme = escapeXmlAttr(color.scheme);
    return children ? `<a:schemeClr val="${safeScheme}">${children}</a:schemeClr>` : `<a:schemeClr val="${safeScheme}"/>`;
  }
  if (isSchemeColorToken(color)) {
    const safeScheme = escapeXmlAttr(color);
    return alphaVal !== void 0 ? `<a:schemeClr val="${safeScheme}"><a:alpha val="${alphaVal}"/></a:schemeClr>` : `<a:schemeClr val="${safeScheme}"/>`;
  }
  const value = normalizeRgbHex(color);
  return alphaVal !== void 0 ? `<a:srgbClr val="${value}"><a:alpha val="${alphaVal}"/></a:srgbClr>` : `<a:srgbClr val="${value}"/>`;
}

// src/ooxml/drawing/math.ts
var PIXEL_TO_EMU = 9525;
var MAX_EMU = 2147483647;
function toEmu(pixels) {
  return Math.min(MAX_EMU, Math.max(0, Math.round(pixels * PIXEL_TO_EMU)));
}
function toSignedEmu(pixels) {
  return Math.round(pixels * PIXEL_TO_EMU);
}
function toHex(color) {
  const raw = color.replace("#", "").toUpperCase();
  if (/^[0-9A-F]{3}$/.test(raw)) {
    return raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  }
  if (/^[0-9A-F]{6}$/.test(raw)) {
    return raw;
  }
  if (/^[0-9A-F]{8}$/.test(raw)) {
    return raw.slice(0, 6);
  }
  getLogger().warn(`[Runstamp] toHex: invalid color "${color}", falling back to "000000"`);
  return "000000";
}
function emitColorXml(color) {
  return emitOoxmlColor(color);
}
function emitColorWithAlpha(color, opacity) {
  return emitOoxmlColor(color, opacity);
}
function cssAngleToOoxml(cssDeg) {
  return Math.round(((cssDeg + 270) % 360 + 360) % 360 * 6e4);
}
function shadowPolar(offsetX, offsetY) {
  const dist = Math.round(Math.sqrt(offsetX * offsetX + offsetY * offsetY) * PIXEL_TO_EMU);
  let angleDeg = Math.atan2(offsetY, offsetX) * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  const dir = Math.round(angleDeg * 6e4);
  return { dist, dir };
}
function emitFillXml(style, opacity, imageFillRId) {
  if (!style) return "";
  const fill = style.fill;
  if (fill) {
    if (fill.type === "solid") {
      if (opacity !== void 0 && opacity < 1) {
        return `<a:solidFill>${emitColorWithAlpha(fill.color, opacity)}</a:solidFill>`;
      }
      return `<a:solidFill>${emitColorXml(fill.color)}</a:solidFill>`;
    }
    if (fill.type === "pattern") {
      let xml2 = `<a:pattFill prst="${escapeXmlAttr(fill.pattern)}">`;
      xml2 += `<a:fgClr>${emitColorXml(fill.foreground)}</a:fgClr>`;
      xml2 += `<a:bgClr>${emitColorXml(fill.background)}</a:bgClr>`;
      xml2 += `</a:pattFill>`;
      return xml2;
    }
    if (fill.type === "image") {
      if (!imageFillRId) return "";
      let xml2 = `<a:blipFill><a:blip r:embed="${imageFillRId}"/>`;
      if (fill.tile) {
        xml2 += `<a:tile tx="0" ty="0" sx="100000" sy="100000"/>`;
      } else {
        xml2 += `<a:stretch><a:fillRect/></a:stretch>`;
      }
      xml2 += `</a:blipFill>`;
      return xml2;
    }
    let xml = `<a:gradFill>`;
    xml += `<a:gsLst>`;
    for (const stop of fill.stops) {
      const pos = Math.min(1e5, Math.max(0, Math.round(stop.position * 1e3)));
      const effectiveAlpha = opacity !== void 0 && opacity < 1 ? stop.alpha !== void 0 ? stop.alpha * opacity : opacity : stop.alpha;
      xml += `<a:gs pos="${pos}">${effectiveAlpha !== void 0 ? emitColorWithAlpha(stop.color, effectiveAlpha) : emitColorXml(stop.color)}</a:gs>`;
    }
    xml += `</a:gsLst>`;
    if (fill.type === "linear") {
      const ang = cssAngleToOoxml(fill.angle ?? 180);
      xml += `<a:lin ang="${ang}" scaled="1"/>`;
    } else {
      xml += `<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>`;
    }
    xml += `</a:gradFill>`;
    return xml;
  }
  if (style.backgroundColor) {
    if (opacity !== void 0 && opacity < 1) {
      return `<a:solidFill>${emitColorWithAlpha(style.backgroundColor, opacity)}</a:solidFill>`;
    }
    return `<a:solidFill>${emitColorXml(style.backgroundColor)}</a:solidFill>`;
  }
  return "";
}
function emitLineXml(style) {
  if (!style) return `<a:ln><a:noFill/><a:round/></a:ln>`;
  const bw = style.borderWidth;
  if (bw && bw > 0) {
    const widthEmu = toEmu(bw);
    const capMap = { flat: "flat", round: "rnd", square: "sq" };
    const capAttr = style.borderCap ? ` cap="${capMap[style.borderCap] || "flat"}"` : "";
    const cmpdMap = { single: "sng", double: "dbl", thickThin: "thickThin", thinThick: "thinThick", triple: "tri" };
    const cmpdAttr = style.borderCompound ? ` cmpd="${cmpdMap[style.borderCompound] || "sng"}"` : "";
    let xml = `<a:ln w="${widthEmu}"${capAttr}${cmpdAttr}>`;
    xml += `<a:solidFill>${emitColorXml(style.borderColor || "#000000")}</a:solidFill>`;
    const bs = style.borderStyle;
    if (bs && bs !== "solid") {
      const dashMap = { dashed: "dash", dotted: "dot", dotDash: "dashDot" };
      xml += `<a:prstDash val="${dashMap[bs] || "solid"}"/>`;
    }
    xml += `<a:round/>`;
    xml += `</a:ln>`;
    return xml;
  }
  return `<a:ln><a:noFill/><a:round/></a:ln>`;
}
function emitScene3dXml(scene3d) {
  const cam = scene3d.camera;
  const fovAttr = cam.fov !== void 0 ? ` fov="${Math.round(cam.fov * 6e4)}"` : "";
  const lr = scene3d.lightRig;
  let xml = `<a:scene3d>`;
  xml += `<a:camera prst="${escapeXmlAttr(cam.preset)}"${fovAttr}/>`;
  xml += `<a:lightRig rig="${escapeXmlAttr(lr.type)}" dir="${escapeXmlAttr(lr.direction)}"/>`;
  xml += `</a:scene3d>`;
  return xml;
}
function emitSp3dXml(sp3d) {
  const attrs = [];
  if (sp3d.material) attrs.push(`prstMaterial="${escapeXmlAttr(sp3d.material)}"`);
  if (sp3d.extrudeHeight !== void 0) attrs.push(`extrusionH="${toEmu(sp3d.extrudeHeight)}"`);
  if (sp3d.contourWidth !== void 0) attrs.push(`contourW="${toEmu(sp3d.contourWidth)}"`);
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  let xml = `<a:sp3d${attrStr}>`;
  if (sp3d.bevelTop) {
    const bw = toEmu(sp3d.bevelTop.width ?? 6);
    const bh = toEmu(sp3d.bevelTop.height ?? 6);
    xml += `<a:bevelT w="${bw}" h="${bh}" prst="${escapeXmlAttr(sp3d.bevelTop.preset)}"/>`;
  }
  if (sp3d.bevelBottom) {
    const bw = toEmu(sp3d.bevelBottom.width ?? 6);
    const bh = toEmu(sp3d.bevelBottom.height ?? 6);
    xml += `<a:bevelB w="${bw}" h="${bh}" prst="${escapeXmlAttr(sp3d.bevelBottom.preset)}"/>`;
  }
  if (sp3d.extrudeColor) {
    xml += `<a:extrusionClr>${emitColorXml(sp3d.extrudeColor)}</a:extrusionClr>`;
  }
  if (sp3d.contourColor) {
    xml += `<a:contourClr>${emitColorXml(sp3d.contourColor)}</a:contourClr>`;
  }
  xml += `</a:sp3d>`;
  return xml;
}
function emitEffectsXml(style) {
  if (!style?.effects) return "";
  const { dropShadow, innerShadow, glow, reflection, softEdge } = style.effects;
  if (!dropShadow && !innerShadow && !glow && !reflection && !softEdge) return "";
  let xml = `<a:effectLst>`;
  if (glow) {
    const radEmu = toEmu(glow.radius);
    xml += `<a:glow rad="${radEmu}">${emitColorWithAlpha(glow.color, glow.opacity)}</a:glow>`;
  }
  if (innerShadow) {
    const { dist, dir } = shadowPolar(innerShadow.offsetX, innerShadow.offsetY);
    const blurEmu = toEmu(innerShadow.blurRadius);
    xml += `<a:innerShdw blurRad="${blurEmu}" dist="${dist}" dir="${dir}">`;
    xml += emitColorWithAlpha(innerShadow.color, innerShadow.opacity);
    xml += `</a:innerShdw>`;
  }
  if (dropShadow) {
    const { dist, dir } = shadowPolar(dropShadow.offsetX, dropShadow.offsetY);
    const blurEmu = toEmu(dropShadow.blurRadius);
    xml += `<a:outerShdw blurRad="${blurEmu}" dist="${dist}" dir="${dir}" algn="ctr" rotWithShape="0">`;
    xml += emitColorWithAlpha(dropShadow.color, dropShadow.opacity);
    xml += `</a:outerShdw>`;
  }
  if (reflection) {
    const blurRad = reflection.blurRadius !== void 0 ? toEmu(reflection.blurRadius) : 0;
    const stA = reflection.startOpacity !== void 0 ? Math.round(reflection.startOpacity * 1e5) : 5e4;
    const endA = reflection.endOpacity !== void 0 ? Math.round(reflection.endOpacity * 1e5) : 0;
    const dist = reflection.distance !== void 0 ? toEmu(reflection.distance) : 0;
    const dir = reflection.direction !== void 0 ? Math.round(reflection.direction * 6e4) : 54e5;
    const sy = reflection.size !== void 0 ? `-${Math.round(reflection.size * 1e3)}` : "-100000";
    xml += `<a:reflection blurRad="${blurRad}" stA="${stA}" endA="${endA}" dist="${dist}" dir="${dir}" sy="${sy}" algn="bl" rotWithShape="0"/>`;
  }
  if (softEdge) {
    xml += `<a:softEdge rad="${toEmu(softEdge.radius)}"/>`;
  }
  xml += `</a:effectLst>`;
  return xml;
}

export {
  escapeXml,
  escapeXmlAttr,
  isSchemeColorToken,
  resolveColorReference,
  PIXEL_TO_EMU,
  toEmu,
  toSignedEmu,
  toHex,
  emitColorXml,
  emitColorWithAlpha,
  cssAngleToOoxml,
  shadowPolar,
  emitFillXml,
  emitLineXml,
  emitScene3dXml,
  emitSp3dXml,
  emitEffectsXml
};
//# sourceMappingURL=chunk-M2YFSO2D.js.map
