import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  cssAngleToOoxml,
  emitColorWithAlpha,
  emitColorXml,
  escapeXml,
  escapeXmlAttr,
  shadowPolar,
  toEmu,
  toSignedEmu
} from "./chunk-QZ7YLVPL.js";
import {
  applyBidiToParagraph,
  getFontOrNull
} from "./chunk-P5JGOT4P.js";
import {
  getLogger
} from "./chunk-HZBNNQK3.js";

// src/ooxml/drawing/textUtils.ts
var _legacyLineHeightWarned = false;
function computeLineHeightPx(fontFamily, fontSize) {
  const font = getFontOrNull(fontFamily);
  if (!font) return fontSize * 1.2;
  const scale = fontSize / font.unitsPerEm;
  return (font.ascent - font.descent + font.lineGap) * scale;
}
function resolveHyperlink(hyperlink, hyperlinkRels, hyperlinkRIdCounter) {
  if (typeof hyperlink === "string") {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: hyperlink, external: true });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}"/>` };
  }
  const target = hyperlink;
  const tooltipAttr = target.tooltip ? ` tooltip="${escapeXmlAttr2(target.tooltip)}"` : "";
  if (target.action) {
    const jumpMap = {
      firstSlide: "firstslide",
      lastSlide: "lastslide",
      nextSlide: "nextslide",
      previousSlide: "previousslide",
      endShow: "endshow"
    };
    const jump = jumpMap[target.action] ?? target.action;
    return { hlinkXml: `<a:hlinkClick r:id="" action="ppaction://hlinkshowjump?jump=${jump}"${tooltipAttr}/>` };
  }
  if (target.slide !== void 0) {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: `slide${target.slide}.xml`, external: false });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}" action="ppaction://hlinksldjump"${tooltipAttr}/>` };
  }
  if (target.mailto) {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: `mailto:${target.mailto}`, external: true });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}"${tooltipAttr}/>` };
  }
  if (target.url) {
    const rId = `rId${hyperlinkRIdCounter.current++}`;
    hyperlinkRels.push({ rId, url: target.url, external: true });
    return { hlinkXml: `<a:hlinkClick r:id="${rId}"${tooltipAttr}/>` };
  }
  return { hlinkXml: "" };
}
var escapeXml2 = escapeXml;
var escapeXmlAttr2 = escapeXmlAttr;
function emitLocksXml(tagName, locks, defaults) {
  const merged = { ...defaults, ...locks };
  const attrs = [];
  for (const [key, val] of Object.entries(merged)) {
    if (val === true) attrs.push(`${key}="1"`);
  }
  if (attrs.length === 0) return `<${tagName}/>`;
  return `<${tagName} ${attrs.join(" ")}/>`;
}
function emitDecorativeExtXml() {
  return `<a:extLst><a:ext uri="{C183D7F6-B498-43B3-948B-1728B52AA6E4}"><adec:decorative xmlns:adec="http://schemas.microsoft.com/office/drawing/2017/decorative" val="1"/></a:ext></a:extLst>`;
}
function shouldOmitTransform(layout, omitTransform) {
  return Boolean(
    omitTransform && layout.x === 0 && layout.y === 0 && layout.width === 0 && layout.height === 0
  );
}
function normalizeRuns(content) {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  return content;
}
function splitRunsIntoParagraphs(runs) {
  const paragraphs = [];
  let currentRuns = [];
  for (const run of runs) {
    const parts = run.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        paragraphs.push({ runs: currentRuns.length > 0 ? currentRuns : [{ text: "" }] });
        currentRuns = [];
      }
      if (parts[i].length > 0) {
        currentRuns.push({ ...run, text: parts[i] });
      }
    }
  }
  paragraphs.push({ runs: currentRuns.length > 0 ? currentRuns : [{ text: "" }] });
  return paragraphs;
}
function normalizeToParagraphs(node) {
  const paras = node.paragraphs;
  if (paras && paras.length > 0) {
    return paras;
  }
  const rawContent = node.content ?? "";
  const runs = normalizeRuns(rawContent);
  return splitRunsIntoParagraphs(runs);
}
function normalizeToParagraphsFromFields(content, paragraphs) {
  if (paragraphs && paragraphs.length > 0) {
    return paragraphs;
  }
  const runs = normalizeRuns(content ?? "");
  return splitRunsIntoParagraphs(runs);
}
var VERTICAL_ALIGN_MAP = {
  top: "t",
  middle: "ctr",
  bottom: "b"
};
function emitBulletXml(bullet) {
  if (bullet.type === "none") {
    return `        <a:buNone/>
`;
  }
  let xml = "";
  if (bullet.type === "autoNum") {
    const startAttr = bullet.startAt !== void 0 ? ` startAt="${bullet.startAt}"` : "";
    xml += `        <a:buAutoNum type="${bullet.scheme}"${startAttr}/>
`;
  } else {
    if (bullet.color) {
      xml += `        <a:buClr>${emitColorXml(bullet.color)}</a:buClr>
`;
    }
    if (bullet.size !== void 0) {
      xml += `        <a:buSzPct val="${Math.round(bullet.size * 1e3)}"/>
`;
    }
    if (bullet.fontFamily) {
      xml += `        <a:buFont typeface="${escapeXmlAttr2(bullet.fontFamily)}"/>
`;
    }
    xml += `        <a:buChar char="${escapeXml2(bullet.char)}"/>
`;
  }
  return xml;
}
function emitParagraphProps(para, textStyle) {
  const align = para.align ?? textStyle?.textAlign;
  const lineHeight = para.lineHeight ?? textStyle?.lineHeight;
  const lineHeightIsPoints = para.lineHeight !== void 0;
  const rtl = para.rtl ?? textStyle?.rtl;
  const tabStops = para.tabStops;
  const hangingIndent = para.hangingIndent;
  const spaceBeforePercent = para.spaceBeforePercent;
  const spaceAfterPercent = para.spaceAfterPercent;
  const algnMap = { left: "l", center: "ctr", right: "r", justify: "just" };
  const algnAttr = align ? ` algn="${algnMap[align] || "l"}"` : "";
  const lvlAttr = para.level !== void 0 ? ` lvl="${para.level}"` : "";
  const leftMargin = para.indent ?? para.marginLeft;
  const marLAttr = leftMargin !== void 0 ? ` marL="${toEmu(leftMargin)}"` : "";
  const indentAttr = hangingIndent !== void 0 ? ` indent="${toSignedEmu(-Math.abs(hangingIndent))}"` : "";
  const rtlAttr = rtl ? ` rtl="1"` : "";
  let xml = `      <a:pPr${algnAttr}${lvlAttr}${marLAttr}${indentAttr}${rtlAttr}>
`;
  const lineSpacingMode = para.lineSpacingMode;
  if (lineHeight) {
    if (lineSpacingMode === "percentage") {
      xml += `        <a:lnSpc><a:spcPct val="${Math.round(lineHeight * 1e3)}"/></a:lnSpc>
`;
    } else if (lineHeight < 4) {
      xml += `        <a:lnSpc><a:spcPct val="${Math.round(lineHeight * 1e5)}"/></a:lnSpc>
`;
    } else if (lineHeightIsPoints) {
      if (!_legacyLineHeightWarned) {
        _legacyLineHeightWarned = true;
        getLogger().warn(
          `[lineHeight] Value ${lineHeight} treated as legacy points (deprecated). Pass a multiplier like 1.4 instead.`
        );
      }
      xml += `        <a:lnSpc><a:spcPts val="${Math.round(lineHeight * 100)}"/></a:lnSpc>
`;
    } else {
      xml += `        <a:lnSpc><a:spcPts val="${Math.round(lineHeight * 75)}"/></a:lnSpc>
`;
    }
  } else {
    let maxFontSize = textStyle?.fontSize ?? 16;
    let dominantFamily = textStyle?.fontFamily ?? "Liberation Sans";
    if (para.runs && para.runs.length > 0) {
      for (const run of para.runs) {
        const runSize = run.style?.fontSize ?? textStyle?.fontSize ?? 16;
        if (runSize > maxFontSize) {
          maxFontSize = runSize;
          dominantFamily = run.style?.fontFamily ?? textStyle?.fontFamily ?? "Liberation Sans";
        }
      }
    }
    const computedLhPx = computeLineHeightPx(dominantFamily, maxFontSize);
    const spcPtsVal = Math.round(computedLhPx * 75);
    xml += `        <a:lnSpc><a:spcPts val="${spcPtsVal}"/></a:lnSpc>
`;
  }
  if (spaceBeforePercent !== void 0) {
    xml += `        <a:spcBef><a:spcPct val="${Math.round(spaceBeforePercent * 1e3)}"/></a:spcBef>
`;
  } else if (para.spaceBefore !== void 0) {
    xml += `        <a:spcBef><a:spcPts val="${Math.round(para.spaceBefore * 100)}"/></a:spcBef>
`;
  }
  if (spaceAfterPercent !== void 0) {
    xml += `        <a:spcAft><a:spcPct val="${Math.round(spaceAfterPercent * 1e3)}"/></a:spcAft>
`;
  } else if (para.spaceAfter !== void 0) {
    xml += `        <a:spcAft><a:spcPts val="${Math.round(para.spaceAfter * 100)}"/></a:spcAft>
`;
  }
  if (para.bullet) {
    xml += emitBulletXml(para.bullet);
  }
  if (tabStops && tabStops.length > 0) {
    xml += `        <a:tabLst>`;
    for (const tab of tabStops) {
      const pos = toEmu(tab.position);
      const algn = tab.align ? ` algn="${tab.align}"` : "";
      xml += `<a:tab pos="${pos}"${algn}/>`;
    }
    xml += `</a:tabLst>
`;
  }
  xml += `      </a:pPr>
`;
  return xml;
}
function isRtlLanguage(lang) {
  return /^(ar|arc|dv|fa|ha|he|khw|ks|ku|ps|sd|ug|ur|yi)(?:-|$)/i.test(lang ?? "");
}
function emitRunProps(run, ctx) {
  const { textStyle, fontColor, fontFamily, hyperlinkRels, hyperlinkRIdCounter } = ctx;
  const runStyle = run.style;
  const runFontSize = Math.round((runStyle?.fontSize ?? textStyle?.fontSize ?? 16) * 75);
  const runFontColor = runStyle?.color ?? fontColor;
  const runFontFamily = runStyle?.resolvedFont?.family ?? textStyle?.resolvedFont?.family ?? runStyle?.fontFamily ?? fontFamily;
  const runBold = (runStyle?.fontWeight ?? textStyle?.fontWeight) === "bold";
  const runItalic = (runStyle?.fontStyle ?? textStyle?.fontStyle) === "italic";
  const boldAttr = runBold ? ` b="1"` : "";
  const italicAttr = runItalic ? ` i="1"` : "";
  const decorLine = runStyle?.textDecorationLine ?? textStyle?.textDecorationLine;
  const decorStyle = runStyle?.textDecorationStyle ?? textStyle?.textDecorationStyle;
  let uAttr = "";
  if (decorLine === "underline" || decorLine === "underline-strikethrough") {
    const uMap = { solid: "sng", double: "dbl", dotted: "dot", dashed: "dash" };
    uAttr = ` u="${uMap[decorStyle || "solid"] || "sng"}"`;
  }
  let strikeAttr = "";
  if (decorLine === "strikethrough" || decorLine === "underline-strikethrough") {
    const sMap = { solid: "sngStrike", double: "dblStrike" };
    strikeAttr = ` strike="${sMap[decorStyle || "solid"] || "sngStrike"}"`;
  }
  let baselineAttr = "";
  if (runStyle?.baseline === "superscript") {
    baselineAttr = ` baseline="30000"`;
  } else if (runStyle?.baseline === "subscript") {
    baselineAttr = ` baseline="-25000"`;
  }
  let spcAttr = "";
  if (runStyle?.letterSpacing !== void 0) {
    spcAttr = ` spc="${Math.round(runStyle.letterSpacing * 75)}"`;
  }
  let capAttr = "";
  if (runStyle?.textTransform === "uppercase") {
    capAttr = ` cap="all"`;
  } else if (runStyle?.textTransform === "capitalize") {
    capAttr = ` cap="small"`;
  }
  let kernAttr = "";
  if (runStyle?.kerning !== void 0) {
    kernAttr = ` kern="${Math.round(runStyle.kerning * 100)}"`;
  }
  const shadow = runStyle?.shadow;
  const outline = runStyle?.outline;
  const highlight = runStyle?.highlight;
  let hlinkAttr = "";
  if (run.hyperlink) {
    const { hlinkXml } = resolveHyperlink(run.hyperlink, hyperlinkRels, hyperlinkRIdCounter);
    if (hlinkXml) {
      hlinkAttr = `
          ${hlinkXml}`;
    }
  }
  const runLang = runStyle?.lang ?? textStyle?.lang ?? "en-US";
  const runAltLang = runStyle?.altLang;
  const altLangAttr = runAltLang ? ` altLang="${escapeXmlAttr2(runAltLang)}"` : "";
  let xml = `        <a:rPr lang="${escapeXmlAttr2(runLang)}"${altLangAttr} sz="${runFontSize}"${boldAttr}${italicAttr}${uAttr}${strikeAttr}${baselineAttr}${spcAttr}${capAttr}${kernAttr} dirty="0">
`;
  if (outline) {
    const lnW = toEmu(outline.width);
    xml += `          <a:ln w="${lnW}"><a:solidFill>${emitColorXml(outline.color)}</a:solidFill></a:ln>
`;
  }
  const gradFill = runStyle?.gradientFill;
  if (gradFill) {
    xml += `          <a:gradFill><a:gsLst>`;
    for (const stop of gradFill.stops) {
      const pos = Math.min(1e5, Math.max(0, Math.round(stop.position * 1e3)));
      xml += `<a:gs pos="${pos}">${emitColorXml(stop.color)}</a:gs>`;
    }
    xml += `</a:gsLst>`;
    if (gradFill.type === "linear") {
      const ang = cssAngleToOoxml(gradFill.angle ?? 180);
      xml += `<a:lin ang="${ang}" scaled="1"/>`;
    } else {
      xml += `<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>`;
    }
    xml += `</a:gradFill>
`;
  } else {
    xml += `          <a:solidFill>${emitColorXml(runFontColor)}</a:solidFill>
`;
  }
  if (shadow) {
    const { dist, dir } = shadowPolar(shadow.offsetX, shadow.offsetY);
    const blurEmu = toEmu(shadow.blurRadius);
    xml += `          <a:effectLst><a:outerShdw blurRad="${blurEmu}" dist="${dist}" dir="${dir}" algn="ctr" rotWithShape="0">${emitColorWithAlpha(shadow.color, shadow.opacity)}</a:outerShdw></a:effectLst>
`;
  }
  if (highlight) {
    xml += `          <a:highlight>${emitColorXml(highlight)}</a:highlight>
`;
  }
  xml += `          <a:latin typeface="${escapeXmlAttr2(runFontFamily)}"/>`;
  xml += `
          <a:ea typeface=""/>`;
  xml += `
          <a:cs typeface=""/>`;
  if (isRtlLanguage(runLang)) {
    xml += `
          <a:rtl/>`;
  }
  if (hlinkAttr) xml += hlinkAttr;
  xml += `
        </a:rPr>
`;
  return { xml };
}
function emitParagraphsXml(paragraphs, textStyle, hyperlinkRels, hyperlinkRIdCounter) {
  const fontSize = Math.round((textStyle?.fontSize || 16) * 75);
  const fontColor = textStyle?.color || "#000000";
  const fontFamily = textStyle?.resolvedFont?.family ?? textStyle?.fontFamily ?? "Liberation Sans";
  let xml = "";
  for (const para of paragraphs) {
    const bidiPara = applyBidiToParagraph(para, textStyle);
    xml += `    <a:p>
`;
    xml += emitParagraphProps(bidiPara, textStyle);
    for (const run of bidiPara.runs) {
      if (run.text.length === 0) continue;
      const rProps = emitRunProps(run, {
        textStyle,
        fontSize,
        fontColor,
        fontFamily,
        hyperlinkRels,
        hyperlinkRIdCounter
      });
      const textTransform = run.style?.textTransform;
      const emittedText = escapeXml2(textTransform === "lowercase" ? run.text.toLowerCase() : run.text);
      xml += `      <a:r>
`;
      xml += rProps.xml;
      xml += `        <a:t>${emittedText}</a:t>
`;
      xml += `      </a:r>
`;
    }
    const endParaLang = textStyle?.lang ?? "en-US";
    xml += `      <a:endParaRPr lang="${escapeXmlAttr2(endParaLang)}" dirty="0"/>
`;
    xml += `    </a:p>
`;
  }
  return xml;
}

export {
  resolveHyperlink,
  emitLocksXml,
  emitDecorativeExtXml,
  shouldOmitTransform,
  normalizeToParagraphs,
  normalizeToParagraphsFromFields,
  VERTICAL_ALIGN_MAP,
  emitParagraphsXml
};
//# sourceMappingURL=chunk-VETY33ST.js.map
