import type { SpreadsheetImageAnchor } from "../types/spreadsheet-ast.js";
import { escapeXml, XML_DECLARATION } from "../utils/xml.js";

const EMU_PER_PIXEL = 9525;
const DEFAULT_SIZE_PIXELS = 100;

export interface DrawingImageEntry {
  relationshipId: string;
  anchor: SpreadsheetImageAnchor;
  name?: string;
  description?: string;
  width?: number;
  height?: number;
}

export interface DrawingChartEntry {
  relationshipId: string;
  anchor: SpreadsheetImageAnchor;
  name?: string;
  width?: number;
  height?: number;
}

function serializeAnchorPoint(point: { col: number; row: number; colOffset?: number; rowOffset?: number }): string {
  return `<xdr:col>${point.col}</xdr:col><xdr:colOff>${(point.colOffset ?? 0) * EMU_PER_PIXEL}</xdr:colOff><xdr:row>${point.row}</xdr:row><xdr:rowOff>${(point.rowOffset ?? 0) * EMU_PER_PIXEL}</xdr:rowOff>`;
}

function serializePic(entry: DrawingImageEntry, cNvPrId: number): string {
  const picName = entry.name ?? `Picture ${cNvPrId}`;
  const descr = entry.description ? ` descr="${escapeXml(entry.description)}"` : "";
  const widthEmu = (entry.width ?? DEFAULT_SIZE_PIXELS) * EMU_PER_PIXEL;
  const heightEmu = (entry.height ?? DEFAULT_SIZE_PIXELS) * EMU_PER_PIXEL;

  return [
    `<xdr:pic>`,
    `<xdr:nvPicPr>`,
    `<xdr:cNvPr id="${cNvPrId}" name="${escapeXml(picName)}"${descr}/>`,
    `<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>`,
    `</xdr:nvPicPr>`,
    `<xdr:blipFill>`,
    `<a:blip r:embed="${entry.relationshipId}"/>`,
    `<a:stretch><a:fillRect/></a:stretch>`,
    `</xdr:blipFill>`,
    `<xdr:spPr>`,
    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>`,
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
    `</xdr:spPr>`,
    `</xdr:pic>`,
  ].join("");
}

const DEFAULT_CHART_WIDTH_PIXELS = 480;
const DEFAULT_CHART_HEIGHT_PIXELS = 300;

function serializeGraphicFrame(entry: DrawingChartEntry, cNvPrId: number): string {
  const frameName = entry.name ?? `Chart ${cNvPrId}`;
  const widthEmu = (entry.width ?? DEFAULT_CHART_WIDTH_PIXELS) * EMU_PER_PIXEL;
  const heightEmu = (entry.height ?? DEFAULT_CHART_HEIGHT_PIXELS) * EMU_PER_PIXEL;

  return [
    `<xdr:graphicFrame>`,
    `<xdr:nvGraphicFramePr>`,
    `<xdr:cNvPr id="${cNvPrId}" name="${escapeXml(frameName)}"/>`,
    `<xdr:cNvGraphicFramePr/>`,
    `</xdr:nvGraphicFramePr>`,
    `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></xdr:xfrm>`,
    `<a:graphic>`,
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">`,
    `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${entry.relationshipId}"/>`,
    `</a:graphicData>`,
    `</a:graphic>`,
    `</xdr:graphicFrame>`,
  ].join("");
}

export function serializeDrawing(images: DrawingImageEntry[], charts?: DrawingChartEntry[]): string {
  const parts: string[] = [
    XML_DECLARATION,
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
  ];

  let nextId = 2; // cNvPr IDs start at 2

  images.forEach((entry) => {
    const cNvPrId = nextId++;
    const widthEmu = (entry.width ?? DEFAULT_SIZE_PIXELS) * EMU_PER_PIXEL;
    const heightEmu = (entry.height ?? DEFAULT_SIZE_PIXELS) * EMU_PER_PIXEL;

    if (entry.anchor.to) {
      parts.push(`<xdr:twoCellAnchor>`);
      parts.push(`<xdr:from>${serializeAnchorPoint(entry.anchor.from)}</xdr:from>`);
      parts.push(`<xdr:to>${serializeAnchorPoint(entry.anchor.to)}</xdr:to>`);
      parts.push(serializePic(entry, cNvPrId));
      parts.push(`<xdr:clientData/>`);
      parts.push(`</xdr:twoCellAnchor>`);
    } else {
      parts.push(`<xdr:oneCellAnchor>`);
      parts.push(`<xdr:from>${serializeAnchorPoint(entry.anchor.from)}</xdr:from>`);
      parts.push(`<xdr:ext cx="${widthEmu}" cy="${heightEmu}"/>`);
      parts.push(serializePic(entry, cNvPrId));
      parts.push(`<xdr:clientData/>`);
      parts.push(`</xdr:oneCellAnchor>`);
    }
  });

  (charts ?? []).forEach((entry) => {
    const cNvPrId = nextId++;

    const to = entry.anchor.to ?? {
      col: entry.anchor.from.col + Math.ceil((entry.width ?? DEFAULT_CHART_WIDTH_PIXELS) / 64),
      row: entry.anchor.from.row + Math.ceil((entry.height ?? DEFAULT_CHART_HEIGHT_PIXELS) / 20),
      colOffset: 0,
      rowOffset: 0,
    };
    parts.push(`<xdr:twoCellAnchor>`);
    parts.push(`<xdr:from>${serializeAnchorPoint(entry.anchor.from)}</xdr:from>`);
    parts.push(`<xdr:to>${serializeAnchorPoint(to)}</xdr:to>`);
    parts.push(serializeGraphicFrame(entry, cNvPrId));
    parts.push(`<xdr:clientData/>`);
    parts.push(`</xdr:twoCellAnchor>`);
  });

  parts.push(`</xdr:wsDr>`);
  return parts.join("");
}

export interface DrawingRelationshipEntry {
  relationshipId: string;
  target: string;
  type: "image" | "chart";
}

const RELATIONSHIP_TYPES = {
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  chart: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
} as const;

export function serializeDrawingRelationships(entries: DrawingRelationshipEntry[]): string {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    ...entries.map((entry) =>
      `<Relationship Id="${entry.relationshipId}" Type="${RELATIONSHIP_TYPES[entry.type]}" Target="${escapeXml(entry.target)}"/>`
    ),
    `</Relationships>`,
  ].join("");
}
