// src/ooxml/drawing/math.ts
import { getLogger } from "../../logger.js";
import type { FlexStyle, GradientFill, ColorValue, Scene3D, Sp3D } from "../../types/ast.js";
import { emitOoxmlColor } from "../colorXml.js";
import { escapeXmlAttr as escapeXmlAttrLocal } from "./xmlEscape.js";

export const PIXEL_TO_EMU = 9525;

/** Maximum EMU value — OOXML uses signed 32-bit integers for extents. */
const MAX_EMU = 2147483647;

export function toEmu(pixels: number): number {
  return Math.min(MAX_EMU, Math.max(0, Math.round(pixels * PIXEL_TO_EMU)));
}

export function toSignedEmu(pixels: number): number {
  return Math.round(pixels * PIXEL_TO_EMU);
}

export function toHex(color: string): string {
  const raw = color.replace("#", "").toUpperCase();
  if (/^[0-9A-F]{3}$/.test(raw)) {
    return raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
  }
  if (/^[0-9A-F]{6}$/.test(raw)) {
    return raw;
  }
  // 8-char RGBA (e.g., FF0000FF) — strip trailing alpha bytes
  if (/^[0-9A-F]{8}$/.test(raw)) {
    return raw.slice(0, 6);
  }
  getLogger().warn(`[Runstamp] toHex: invalid color "${color}", falling back to "000000"`);
  return "000000";
}

/**
 * Emits OOXML color XML: <a:srgbClr> for hex, <a:schemeClr> for theme tokens and ColorModifier objects.
 */
export function emitColorXml(color: ColorValue): string {
  return emitOoxmlColor(color);
}

/**
 * Emits a solidFill element wrapping the color.
 */
export function emitSolidFill(color: ColorValue): string {
  return `<a:solidFill>${emitColorXml(color)}</a:solidFill>`;
}

/**
 * Emits color XML with optional alpha modifier.
 */
export function emitColorWithAlpha(color: ColorValue, opacity?: number): string {
  return emitOoxmlColor(color, opacity);
}

/**
 * CSS angle (degrees) to OOXML linear gradient angle (60000ths of a degree).
 * CSS 0° = up, OOXML 0° = right. Formula: ((cssDeg + 90) % 360) * 60000
 * But OOXML gradient angle: 0=right, 90=down so we do ((cssDeg - 90 + 360) % 360) for the rotation.
 * Actually the OOXML gradient `ang` is measured differently:
 *   CSS 180° (top-to-bottom) maps to OOXML ang=5400000 (90° in 60k units).
 * Formula: ((cssDeg + 270) % 360) * 60000
 */
export function cssAngleToOoxml(cssDeg: number): number {
  return Math.round((((cssDeg + 270) % 360 + 360) % 360) * 60000);
}

/**
 * Convert shadow offsets (pixels) to polar coordinates for OOXML.
 */
export function shadowPolar(offsetX: number, offsetY: number): { dist: number; dir: number } {
  const dist = Math.round(Math.sqrt(offsetX * offsetX + offsetY * offsetY) * PIXEL_TO_EMU);
  let angleDeg = Math.atan2(offsetY, offsetX) * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  const dir = Math.round(angleDeg * 60000);
  return { dist, dir };
}

/**
 * Emit fill XML: solidFill (from fill or backgroundColor), gradFill, or empty string.
 * `fill` takes precedence over `backgroundColor`.
 * If opacity is provided (0-1), it is applied as an alpha modifier on the fill color.
 */
/**
 * Emit fill XML: solidFill, gradFill, pattFill, blipFill (image fill), or empty string.
 * For image fills, rId must be provided.
 */
export function emitFillXml(style?: FlexStyle, opacity?: number, imageFillRId?: string): string {
  if (!style) return "";
  const fill = style.fill;

  if (fill) {
    if (fill.type === "solid") {
      if (opacity !== undefined && opacity < 1) {
        return `<a:solidFill>${emitColorWithAlpha(fill.color, opacity)}</a:solidFill>`;
      }
      return `<a:solidFill>${emitColorXml(fill.color)}</a:solidFill>`;
    }

    if (fill.type === "pattern") {
      let xml = `<a:pattFill prst="${escapeXmlAttrLocal(fill.pattern)}">`;
      xml += `<a:fgClr>${emitColorXml(fill.foreground)}</a:fgClr>`;
      xml += `<a:bgClr>${emitColorXml(fill.background)}</a:bgClr>`;
      xml += `</a:pattFill>`;
      return xml;
    }

    if (fill.type === "image") {
      if (!imageFillRId) return ""; // No rId available — skip fill
      let xml = `<a:blipFill><a:blip r:embed="${imageFillRId}"/>`;
      if (fill.tile) {
        xml += `<a:tile tx="0" ty="0" sx="100000" sy="100000"/>`;
      } else {
        xml += `<a:stretch><a:fillRect/></a:stretch>`;
      }
      xml += `</a:blipFill>`;
      return xml;
    }

    // Gradient fill (linear or radial)
    let xml = `<a:gradFill>`;
    xml += `<a:gsLst>`;
    for (const stop of (fill as GradientFill).stops) {
      const pos = Math.min(100000, Math.max(0, Math.round(stop.position * 1000)));
      // Apply shape-level opacity to each gradient stop's alpha
      const effectiveAlpha = opacity !== undefined && opacity < 1
        ? (stop.alpha !== undefined ? stop.alpha * opacity : opacity)
        : stop.alpha;
      xml += `<a:gs pos="${pos}">${effectiveAlpha !== undefined ? emitColorWithAlpha(stop.color, effectiveAlpha) : emitColorXml(stop.color)}</a:gs>`;
    }
    xml += `</a:gsLst>`;
    if (fill.type === "linear") {
      const ang = cssAngleToOoxml((fill as GradientFill).angle ?? 180);
      xml += `<a:lin ang="${ang}" scaled="1"/>`;
    } else {
      xml += `<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>`;
    }
    xml += `</a:gradFill>`;
    return xml;
  }

  if (style.backgroundColor) {
    if (opacity !== undefined && opacity < 1) {
      return `<a:solidFill>${emitColorWithAlpha(style.backgroundColor, opacity)}</a:solidFill>`;
    }
    return `<a:solidFill>${emitColorXml(style.backgroundColor)}</a:solidFill>`;
  }

  return "";
}

/**
 * Emit <a:ln> with optional stroke or noFill.
 */
export function emitLineXml(style?: FlexStyle): string {
  if (!style) return `<a:ln><a:noFill/><a:round/></a:ln>`;

  const bw = style.borderWidth;
  if (bw && bw > 0) {
    const widthEmu = toEmu(bw);
    const capMap: Record<string, string> = { flat: "flat", round: "rnd", square: "sq" };
    const capAttr = style.borderCap ? ` cap="${capMap[style.borderCap] || "flat"}"` : "";
    const cmpdMap: Record<string, string> = { single: "sng", double: "dbl", thickThin: "thickThin", thinThick: "thinThick", triple: "tri" };
    const cmpdAttr = style.borderCompound ? ` cmpd="${cmpdMap[style.borderCompound] || "sng"}"` : "";
    let xml = `<a:ln w="${widthEmu}"${capAttr}${cmpdAttr}>`;
    xml += `<a:solidFill>${emitColorXml(style.borderColor || "#000000")}</a:solidFill>`;

    const bs = style.borderStyle;
    if (bs && bs !== "solid") {
      const dashMap: Record<string, string> = { dashed: "dash", dotted: "dot", dotDash: "dashDot" };
      xml += `<a:prstDash val="${dashMap[bs] || "solid"}"/>`;
    }

    xml += `<a:round/>`;
    xml += `</a:ln>`;
    return xml;
  }

  return `<a:ln><a:noFill/><a:round/></a:ln>`;
}

/**
 * Emit <a:scene3d> for 3D camera and lighting setup.
 */
export function emitScene3dXml(scene3d: Scene3D): string {
  const cam = scene3d.camera;
  const fovAttr = cam.fov !== undefined ? ` fov="${Math.round(cam.fov * 60000)}"` : "";
  const lr = scene3d.lightRig;
  let xml = `<a:scene3d>`;
  xml += `<a:camera prst="${escapeXmlAttrLocal(cam.preset)}"${fovAttr}/>`;
  xml += `<a:lightRig rig="${escapeXmlAttrLocal(lr.type)}" dir="${escapeXmlAttrLocal(lr.direction)}"/>`;
  xml += `</a:scene3d>`;
  return xml;
}

/**
 * Emit <a:sp3d> for 3D shape properties (bevel, extrude, contour, material).
 */
export function emitSp3dXml(sp3d: Sp3D): string {
  const attrs: string[] = [];
  if (sp3d.material) attrs.push(`prstMaterial="${escapeXmlAttrLocal(sp3d.material)}"`);
  if (sp3d.extrudeHeight !== undefined) attrs.push(`extrusionH="${toEmu(sp3d.extrudeHeight)}"`);
  if (sp3d.contourWidth !== undefined) attrs.push(`contourW="${toEmu(sp3d.contourWidth)}"`);
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  let xml = `<a:sp3d${attrStr}>`;

  if (sp3d.bevelTop) {
    const bw = toEmu(sp3d.bevelTop.width ?? 6);
    const bh = toEmu(sp3d.bevelTop.height ?? 6);
    xml += `<a:bevelT w="${bw}" h="${bh}" prst="${escapeXmlAttrLocal(sp3d.bevelTop.preset)}"/>`;
  }

  if (sp3d.bevelBottom) {
    const bw = toEmu(sp3d.bevelBottom.width ?? 6);
    const bh = toEmu(sp3d.bevelBottom.height ?? 6);
    xml += `<a:bevelB w="${bw}" h="${bh}" prst="${escapeXmlAttrLocal(sp3d.bevelBottom.preset)}"/>`;
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

/**
 * Emit <a:effectLst> with shadows, glows, reflections, and soft edges.
 */
export function emitEffectsXml(style?: FlexStyle): string {
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
    const blurRad = reflection.blurRadius !== undefined ? toEmu(reflection.blurRadius) : 0;
    const stA = reflection.startOpacity !== undefined ? Math.round(reflection.startOpacity * 100000) : 50000;
    const endA = reflection.endOpacity !== undefined ? Math.round(reflection.endOpacity * 100000) : 0;
    const dist = reflection.distance !== undefined ? toEmu(reflection.distance) : 0;
    const dir = reflection.direction !== undefined ? Math.round(reflection.direction * 60000) : 5400000;
    const sy = reflection.size !== undefined ? `-${Math.round(reflection.size * 1000)}` : "-100000";
    xml += `<a:reflection blurRad="${blurRad}" stA="${stA}" endA="${endA}" dist="${dist}" dir="${dir}" sy="${sy}" algn="bl" rotWithShape="0"/>`;
  }

  if (softEdge) {
    xml += `<a:softEdge rad="${toEmu(softEdge.radius)}"/>`;
  }

  xml += `</a:effectLst>`;
  return xml;
}
