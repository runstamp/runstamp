import type { SpreadsheetFontStyle } from "../types/spreadsheet-ast.js";
import { escapeXml } from "../utils/xml.js";
import { serializeColorAttributes } from "./color.js";

export interface FontDef extends SpreadsheetFontStyle {
  family: string;
  size: number;
  familyClassification?: number;
  scheme?: "minor" | "major";
  color?: string;
}

function serializeUnderline(underline: FontDef["underline"]): string {
  if (!underline) {
    return "";
  }
  if (underline === true) {
    return "<u val=\"single\"/>";
  }
  return `<u val="${escapeXml(underline)}"/>`;
}

export function serializeFont(font: FontDef): string {
  const parts: string[] = ["<font>"];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.strikethrough) parts.push("<strike/>");
  const underline = serializeUnderline(font.underline);
  if (underline) parts.push(underline);
  if (font.vertAlign) parts.push(`<vertAlign val="${font.vertAlign}"/>`);
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) {
    parts.push(`<color ${serializeColorAttributes(font.color)}/>`);
  }
  parts.push(`<name val="${escapeXml(font.family)}"/>`);
  if (font.familyClassification !== undefined) {
    parts.push(`<family val="${font.familyClassification}"/>`);
  }
  if (font.charset !== undefined) {
    parts.push(`<charset val="${font.charset}"/>`);
  }
  if (font.scheme) {
    parts.push(`<scheme val="${font.scheme}"/>`);
  }
  parts.push("</font>");
  return parts.join("");
}

export function serializeRichTextRunFont(font: FontDef): string {
  const parts: string[] = ["<rPr>"];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.strikethrough) parts.push("<strike/>");
  const underline = serializeUnderline(font.underline);
  if (underline) parts.push(underline);
  if (font.vertAlign) parts.push(`<vertAlign val="${font.vertAlign}"/>`);
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) {
    parts.push(`<color ${serializeColorAttributes(font.color)}/>`);
  }
  parts.push(`<rFont val="${escapeXml(font.family)}"/>`);
  if (font.charset !== undefined) {
    parts.push(`<charset val="${font.charset}"/>`);
  }
  parts.push("</rPr>");
  return parts.join("");
}
