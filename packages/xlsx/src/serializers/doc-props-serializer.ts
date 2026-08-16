import type { SpreadsheetMeta } from "../types/spreadsheet-ast.js";
import { XML_DECLARATION, escapeXml, toW3CDateTime } from "../utils/xml.js";

export const DETERMINISTIC_DOC_PROPS_DATE = new Date("2026-01-01T00:00:00.000Z");

function resolveMetadataDate(value: Date | undefined, deterministic: boolean): Date {
  if (value) {
    return value;
  }

  return deterministic ? DETERMINISTIC_DOC_PROPS_DATE : new Date();
}

export function serializeCoreProps(meta: SpreadsheetMeta | undefined, deterministic: boolean): string {
  const created = resolveMetadataDate(meta?.created, deterministic);
  const modified = resolveMetadataDate(meta?.modified, deterministic);
  const creator = meta?.creator ?? "Runstamp";
  const keywords = meta?.keywords?.join(", ");
  const parts: string[] = [
    XML_DECLARATION,
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
  ];

  if (meta?.title) {
    parts.push(`<dc:title>${escapeXml(meta.title)}</dc:title>`);
  }
  if (meta?.language) {
    parts.push(`<dc:language>${escapeXml(meta.language)}</dc:language>`);
  }
  parts.push(`<dc:creator>${escapeXml(creator)}</dc:creator>`);
  parts.push(`<cp:lastModifiedBy>${escapeXml(creator)}</cp:lastModifiedBy>`);
  if (meta?.description) {
    parts.push(`<dc:description>${escapeXml(meta.description)}</dc:description>`);
  }
  if (meta?.category) {
    parts.push(`<cp:category>${escapeXml(meta.category)}</cp:category>`);
  }
  if (keywords) {
    parts.push(`<cp:keywords>${escapeXml(keywords)}</cp:keywords>`);
  }
  parts.push(`<dcterms:created xsi:type="dcterms:W3CDTF">${toW3CDateTime(created)}</dcterms:created>`);
  parts.push(`<dcterms:modified xsi:type="dcterms:W3CDTF">${toW3CDateTime(modified)}</dcterms:modified>`);
  parts.push(`</cp:coreProperties>`);

  return parts.join("");
}

export function serializeAppProps(sheetNames: string[], meta?: SpreadsheetMeta): string {
  const worksheetList = sheetNames.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("");
  const company = meta?.company ? `<Company>${escapeXml(meta.company)}</Company>` : "";

  return [
    XML_DECLARATION,
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">`,
    `<Application>Runstamp</Application>`,
    `<DocSecurity>0</DocSecurity>`,
    `<ScaleCrop>false</ScaleCrop>`,
    `<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheetNames.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>`,
    `<TitlesOfParts><vt:vector size="${sheetNames.length}" baseType="lpstr">${worksheetList}</vt:vector></TitlesOfParts>`,
    company,
    `<LinksUpToDate>false</LinksUpToDate>`,
    `<SharedDoc>false</SharedDoc>`,
    `<HyperlinksChanged>false</HyperlinksChanged>`,
    `<AppVersion>16.0000</AppVersion>`,
    `</Properties>`,
  ].join("");
}
