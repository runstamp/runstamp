import { XML_DECLARATION } from "../utils/xml.js";
import type {
  CellValue,
  SpreadsheetCellStyle,
  SpreadsheetCellStyleInput,
  SpreadsheetDefaults,
} from "../types/spreadsheet-ast.js";
import { ComponentRegistry } from "./component-registry.js";
import type { FontDef } from "./font-serializer.js";
import { serializeFont } from "./font-serializer.js";
import type { FillDef } from "./fill-serializer.js";
import { GRAY125_FILL, NONE_FILL, serializeDxfFill, serializeFill } from "./fill-serializer.js";
import type { BorderDef } from "./border-serializer.js";
import { EMPTY_BORDER, serializeBorder, serializeDxfBorder } from "./border-serializer.js";
import { NumFmtRegistry } from "./numfmt-registry.js";
import { normalizeFill, resolveCellStyle } from "./style-utils.js";
import { escapeXml } from "../utils/xml.js";

interface CellXfDef {
  numFmtId: number;
  fontId: number;
  fillId: number;
  borderId: number;
  xfId: number;
  alignment?: SpreadsheetCellStyle["alignment"];
  protection?: SpreadsheetCellStyle["protection"];
}

function fontKey(font: FontDef): string {
  return [
    font.family,
    font.size,
    font.bold ? 1 : 0,
    font.italic ? 1 : 0,
    font.underline === true ? "single" : (font.underline ?? ""),
    font.strikethrough ? 1 : 0,
    font.color ?? "",
    font.vertAlign ?? "",
    font.charset ?? "",
    font.familyClassification ?? "",
    font.scheme ?? "",
  ].join("|");
}

function fillKey(fill: FillDef): string {
  return [
    fill.type,
    fill.patternType ?? "",
    fill.fgColor ?? "",
    fill.bgColor ?? "",
    fill.color ?? "",
  ].join("|");
}

function edgeKey(edge: BorderDef["top"] | undefined): string {
  if (!edge) {
    return "";
  }
  return `${edge.style}:${edge.color ?? ""}`;
}

function borderKey(border: BorderDef): string {
  return [
    edgeKey(border.left),
    edgeKey(border.right),
    edgeKey(border.top),
    edgeKey(border.bottom),
    border.diagonal ? `${border.diagonal.style}:${border.diagonal.color ?? ""}:${border.diagonal.direction ?? ""}` : "",
  ].join("|");
}

function alignmentKey(alignment: SpreadsheetCellStyle["alignment"] | undefined): string {
  if (!alignment) {
    return "";
  }
  return [
    alignment.horizontal ?? "",
    alignment.vertical ?? "",
    alignment.wrapText ? 1 : 0,
    alignment.textRotation ?? "",
    alignment.indent ?? "",
    alignment.shrinkToFit ? 1 : 0,
    alignment.readingOrder ?? "",
  ].join("|");
}

function protectionKey(protection: SpreadsheetCellStyle["protection"] | undefined): string {
  if (!protection) {
    return "";
  }
  return [
    protection.locked === undefined ? "" : (protection.locked ? 1 : 0),
    protection.hidden === undefined ? "" : (protection.hidden ? 1 : 0),
  ].join("|");
}

function cellXfKey(xf: CellXfDef): string {
  return [
    xf.numFmtId,
    xf.fontId,
    xf.fillId,
    xf.borderId,
    xf.xfId,
    alignmentKey(xf.alignment),
    protectionKey(xf.protection),
  ].join("|");
}

function styleKey(style: SpreadsheetCellStyle): string {
  return [
    style.numberFormat ?? "",
    style.font ? fontKey({
      family: style.font.family ?? "",
      size: style.font.size ?? 0,
      bold: style.font.bold,
      italic: style.font.italic,
      underline: style.font.underline,
      strikethrough: style.font.strikethrough,
      color: style.font.color,
      vertAlign: style.font.vertAlign,
      charset: style.font.charset,
    }) : "",
    style.fill ? fillKey(style.fill as FillDef) : "",
    style.border ? borderKey(style.border) : "",
    alignmentKey(style.alignment),
    protectionKey(style.protection),
  ].join("||");
}

const DEFAULT_FONT_FAMILY = "Calibri";
const DEFAULT_FONT_SIZE = 11;
const DEFAULT_FONT: FontDef = {
  family: DEFAULT_FONT_FAMILY,
  size: DEFAULT_FONT_SIZE,
  color: "theme:1",
  familyClassification: 2,
  scheme: "minor",
};
const DEFAULT_XF: CellXfDef = {
  numFmtId: 0,
  fontId: 0,
  fillId: 0,
  borderId: 0,
  xfId: 0,
};

function serializeAlignment(alignment: SpreadsheetCellStyle["alignment"] | undefined): string {
  if (!alignment) {
    return "";
  }
  const attributes: string[] = [];
  if (alignment.horizontal) attributes.push(`horizontal="${alignment.horizontal}"`);
  if (alignment.vertical) attributes.push(`vertical="${alignment.vertical}"`);
  if (alignment.wrapText) attributes.push(`wrapText="1"`);
  if (alignment.textRotation !== undefined) attributes.push(`textRotation="${alignment.textRotation}"`);
  if (alignment.indent !== undefined) attributes.push(`indent="${alignment.indent}"`);
  if (alignment.shrinkToFit) attributes.push(`shrinkToFit="1"`);
  if (alignment.readingOrder !== undefined) attributes.push(`readingOrder="${alignment.readingOrder}"`);
  return attributes.length > 0 ? `<alignment ${attributes.join(" ")}/>` : "";
}

function serializeProtection(protection: SpreadsheetCellStyle["protection"] | undefined): string {
  if (!protection) {
    return "";
  }
  const attributes: string[] = [];
  if (protection.locked !== undefined) attributes.push(`locked="${protection.locked ? 1 : 0}"`);
  if (protection.hidden !== undefined) attributes.push(`hidden="${protection.hidden ? 1 : 0}"`);
  return attributes.length > 0 ? `<protection ${attributes.join(" ")}/>` : "";
}

function serializeCellXf(xf: CellXfDef): string {
  const attributes = [
    `numFmtId="${xf.numFmtId}"`,
    `fontId="${xf.fontId}"`,
    `fillId="${xf.fillId}"`,
    `borderId="${xf.borderId}"`,
  ];
  if (xf.xfId !== 0) {
    attributes.push(`xfId="${xf.xfId}"`);
  }
  const alignment = serializeAlignment(xf.alignment);
  const protection = serializeProtection(xf.protection);
  if (!alignment && !protection) {
    return `<xf ${attributes.join(" ")}/>`;
  }
  return `<xf ${attributes.join(" ")}>${alignment}${protection}</xf>`;
}

function normalizeFont(font: SpreadsheetCellStyle["font"] | undefined, defaults?: SpreadsheetDefaults): FontDef {
  return {
    family: font?.family ?? defaults?.font?.family ?? DEFAULT_FONT_FAMILY,
    size: font?.size ?? defaults?.font?.size ?? DEFAULT_FONT_SIZE,
    bold: font?.bold,
    italic: font?.italic,
    underline: font?.underline,
    strikethrough: font?.strikethrough,
    color: font?.color,
    vertAlign: font?.vertAlign,
    charset: font?.charset,
  };
}

export class StyleRegistry {
  private readonly fontRegistry: ComponentRegistry<FontDef>;
  private readonly fillRegistry: ComponentRegistry<FillDef>;
  private readonly borderRegistry: ComponentRegistry<BorderDef>;
  private readonly numFmtRegistry = new NumFmtRegistry();
  private readonly cellXfRegistry: ComponentRegistry<CellXfDef>;
  private readonly dxfRegistry: ComponentRegistry<SpreadsheetCellStyle>;
  private readonly styleIndexCache = new WeakMap<SpreadsheetCellStyle, number>();
  private readonly dxfIndexCache = new WeakMap<SpreadsheetCellStyle, number>();
  private readonly defaultFontFamily: string;
  private readonly defaultFontSize: number;

  constructor(private readonly defaults?: SpreadsheetDefaults) {
    const seededDefaultFont: FontDef = {
      ...DEFAULT_FONT,
      family: defaults?.font?.family ?? DEFAULT_FONT.family,
      size: defaults?.font?.size ?? DEFAULT_FONT.size,
    };
    this.defaultFontFamily = seededDefaultFont.family;
    this.defaultFontSize = seededDefaultFont.size;
    this.fontRegistry = new ComponentRegistry([seededDefaultFont], fontKey);
    this.fillRegistry = new ComponentRegistry([NONE_FILL, GRAY125_FILL], fillKey);
    this.borderRegistry = new ComponentRegistry([EMPTY_BORDER], borderKey);
    this.cellXfRegistry = new ComponentRegistry([DEFAULT_XF], cellXfKey);
    this.dxfRegistry = new ComponentRegistry<SpreadsheetCellStyle>([], styleKey);
  }

  registerStyle(styleInput?: SpreadsheetCellStyleInput, cellValue?: CellValue): number {
    const style = resolveCellStyle(styleInput, cellValue);
    return this.registerResolvedStyle(style);
  }

  registerResolvedStyle(style: SpreadsheetCellStyle | undefined): number {
    if (!style) {
      return 0;
    }

    const cached = this.styleIndexCache.get(style);
    if (cached !== undefined) {
      return cached;
    }

    const numFmtId = this.numFmtRegistry.register(style.numberFormat);
    const fontDef = normalizeFont(style.font, this.defaults);
    const fontId = fontDef.family === this.defaultFontFamily
      && fontDef.size === this.defaultFontSize
      && !fontDef.bold
      && !fontDef.italic
      && !fontDef.underline
      && !fontDef.strikethrough
      && !fontDef.color
      && !fontDef.vertAlign
      && fontDef.charset === undefined
      ? 0
      : this.fontRegistry.register(fontDef);
    const fillDef = normalizeFill(style.fill);
    const fillId = fillDef ? this.fillRegistry.register(fillDef as FillDef) : 0;
    const borderId = style.border ? this.borderRegistry.register(style.border) : 0;

    const xf: CellXfDef = {
      numFmtId,
      fontId,
      fillId,
      borderId,
      xfId: 0,
      alignment: style.alignment,
      protection: style.protection,
    };

    const index = this.cellXfRegistry.register(xf);
    this.styleIndexCache.set(style, index);
    return index;
  }

  registerDxf(styleInput: SpreadsheetCellStyleInput): number {
    const style = resolveCellStyle(styleInput, undefined);
    if (!style) {
      return 0;
    }
    const cached = this.dxfIndexCache.get(style);
    if (cached !== undefined) {
      return cached;
    }
    const index = this.dxfRegistry.register(style);
    this.dxfIndexCache.set(style, index);
    return index;
  }

  getDefaultFont(): FontDef {
    return this.fontRegistry.values[0] ?? DEFAULT_FONT;
  }

  get cellStyleCount(): number {
    return this.cellXfRegistry.size;
  }

  get differentialStyleCount(): number {
    return this.dxfRegistry.values.length;
  }

  toXml(): string {
    const dxfs = this.dxfRegistry.values;
    return [
      XML_DECLARATION,
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
      this.numFmtRegistry.toXml(),
      `<fonts count="${this.fontRegistry.size}">${this.fontRegistry.values.map((font) => serializeFont(font)).join("")}</fonts>`,
      `<fills count="${this.fillRegistry.size}">${this.fillRegistry.values.map((fill) => serializeFill(fill)).join("")}</fills>`,
      `<borders count="${this.borderRegistry.size}">${this.borderRegistry.values.map((border) => serializeBorder(border)).join("")}</borders>`,
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`,
      `<cellXfs count="${this.cellXfRegistry.size}">${this.cellXfRegistry.values.map((xf) => serializeCellXf(xf)).join("")}</cellXfs>`,
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`,
      dxfs.length === 0
        ? `<dxfs count="0"/>`
        : `<dxfs count="${dxfs.length}">${dxfs.map((style) => {
          const font = style.font ? `<font>${serializeFont(normalizeFont(style.font, this.defaults)).replace(/^<font>|<\/font>$/g, "")}</font>` : "";
          const fill = serializeDxfFill(normalizeFill(style.fill) as FillDef | undefined);
          const border = serializeDxfBorder(style.border);
          const numFmt = style.numberFormat ? `<numFmt numFmtId="0" formatCode="${escapeXml(style.numberFormat)}"/>` : "";
          const alignment = serializeAlignment(style.alignment);
          return `<dxf>${numFmt}${font}${fill}${border}${alignment}</dxf>`;
        }).join("")}</dxfs>`,
      `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>`,
      `</styleSheet>`,
    ].join("");
  }
}
