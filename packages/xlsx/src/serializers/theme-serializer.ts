import type { ThemeConfig } from "../types/spreadsheet-ast.js";
import { XML_DECLARATION, escapeXml } from "../utils/xml.js";

const DEFAULT_COLORS: Record<string, string> = {
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
};

function stripHash(hex: string): string {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}

function emitColorSlot(slot: string, override: string | undefined): string {
  if (override) {
    return `<a:${slot}><a:srgbClr val="${stripHash(override).toUpperCase()}"/></a:${slot}>`;
  }

  if (slot === "dk1") {
    return `<a:dk1><a:sysClr lastClr="000000" val="windowText"/></a:dk1>`;
  }

  if (slot === "lt1") {
    return `<a:lt1><a:sysClr lastClr="FFFFFF" val="window"/></a:lt1>`;
  }

  return `<a:${slot}><a:srgbClr val="${DEFAULT_COLORS[slot]}"/></a:${slot}>`;
}

export function serializeTheme(themeConfig?: ThemeConfig): string {
  const themeName = themeConfig?.name ?? "Office Theme";
  const colorSlots = [
    "dk1",
    "lt1",
    "dk2",
    "lt2",
    "accent1",
    "accent2",
    "accent3",
    "accent4",
    "accent5",
    "accent6",
    "hlink",
    "folHlink",
  ];
  const colorSchemeXml = colorSlots
    .map((slot) => emitColorSlot(slot, themeConfig?.colorScheme?.[slot as keyof NonNullable<ThemeConfig["colorScheme"]>]))
    .join("");
  const majorLatin = themeConfig?.fontScheme?.majorLatin ?? "Calibri Light";
  const minorLatin = themeConfig?.fontScheme?.minorLatin ?? "Calibri";
  const majorEa = themeConfig?.fontScheme?.majorEa ?? "";
  const minorEa = themeConfig?.fontScheme?.minorEa ?? "";

  return [
    XML_DECLARATION,
    `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(themeName)}">`,
    `<a:themeElements>`,
    `<a:clrScheme name="${escapeXml(themeName)}">${colorSchemeXml}</a:clrScheme>`,
    `<a:fontScheme name="Office">`,
    `<a:majorFont>`,
    `<a:latin typeface="${escapeXml(majorLatin)}" panose="020F0302020204030204"/>`,
    `<a:ea typeface="${escapeXml(majorEa)}"/>`,
    `<a:cs typeface=""/>`,
    `<a:font script="Jpan" typeface="Yu Gothic Light"/>`,
    `<a:font script="Hang" typeface="Malgun Gothic"/>`,
    `<a:font script="Hans" typeface="DengXian Light"/>`,
    `<a:font script="Hant" typeface="PMingLiU"/>`,
    `<a:font script="Arab" typeface="Times New Roman"/>`,
    `<a:font script="Hebr" typeface="Times New Roman"/>`,
    `<a:font script="Thai" typeface="Angsana New"/>`,
    `<a:font script="Deva" typeface="Mangal"/>`,
    `</a:majorFont>`,
    `<a:minorFont>`,
    `<a:latin typeface="${escapeXml(minorLatin)}" panose="020F0502020204030204"/>`,
    `<a:ea typeface="${escapeXml(minorEa)}"/>`,
    `<a:cs typeface=""/>`,
    `<a:font script="Jpan" typeface="Yu Gothic"/>`,
    `<a:font script="Hang" typeface="Malgun Gothic"/>`,
    `<a:font script="Hans" typeface="DengXian"/>`,
    `<a:font script="Hant" typeface="PMingLiU"/>`,
    `<a:font script="Arab" typeface="Arial"/>`,
    `<a:font script="Hebr" typeface="Arial"/>`,
    `<a:font script="Thai" typeface="Cordia New"/>`,
    `<a:font script="Deva" typeface="Mangal"/>`,
    `</a:minorFont>`,
    `</a:fontScheme>`,
    `<a:fmtScheme name="Office">`,
    `<a:fillStyleLst>`,
    `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`,
    `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`,
    `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`,
    `</a:fillStyleLst>`,
    `<a:lnStyleLst>`,
    `<a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`,
    `<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`,
    `<a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`,
    `</a:lnStyleLst>`,
    `<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst>`,
    `<a:bgFillStyleLst>`,
    `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`,
    `<a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>`,
    `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:lumMod val="102000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`,
    `</a:bgFillStyleLst>`,
    `</a:fmtScheme>`,
    `</a:themeElements>`,
    `<a:objectDefaults/>`,
    `<a:extraClrSchemeLst/>`,
    `</a:theme>`,
  ].join("");
}
