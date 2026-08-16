import { Readable } from "node:stream";
import { deflateRawSync } from "node:zlib";

export const DETERMINISTIC_ZIP_DATE = new Date("1980-01-01T00:00:02.000Z");
const ZIP_VERSION = 20;
const ZIP_COMPRESSION_METHOD_DEFLATE = 8;
const ZIP_GENERAL_PURPOSE_FLAG_UTF8 = 1 << 11;

interface ZipAssemblyEntry {
  path: string;
  content: Buffer;
}

export interface XlsxZipEntryMetrics {
  path: string;
  uncompressedBytes: number;
  compressedBytes: number;
  zipContributionBytes: number;
}

export interface XlsxAssemblyResult {
  buffer: Buffer;
  entryMetrics: XlsxZipEntryMetrics[];
}

export interface XlsxParts {
  contentTypes: string;
  packageRels: string;
  workbook: string;
  workbookRels: string;
  styles: string;
  sharedStrings?: string;
  theme: string;
  sheets: Array<readonly [name: string, content: string]>;
  sheetRelationships?: Array<readonly [name: string, content: string]>;
  tables?: Array<readonly [name: string, content: string]>;
  pivotTables?: Array<readonly [name: string, content: string]>;
  pivotTableRelationships?: Array<readonly [name: string, content: string]>;
  pivotCacheDefinitions?: Array<readonly [name: string, content: string]>;
  pivotCacheDefinitionRelationships?: Array<readonly [name: string, content: string]>;
  pivotCacheRecords?: Array<readonly [name: string, content: string]>;
  comments?: Array<readonly [name: string, content: string]>;
  vmlDrawings?: Array<readonly [name: string, content: string]>;
  drawings?: Array<readonly [name: string, content: string]>;
  drawingRelationships?: Array<readonly [name: string, content: string]>;
  media?: Array<readonly [name: string, content: Buffer]>;
  charts?: Array<readonly [name: string, content: string]>;
  coreProps: string;
  appProps: string;
}

export interface XlsxAssemblyOptions {
  deterministic: boolean;
}

function normalizeZipContent(content: string | Buffer): Buffer {
  return typeof content === "string" ? Buffer.from(content, "utf8") : content;
}

function collectZipEntries(
  parts: XlsxParts,
): ZipAssemblyEntry[] {
  const entries: ZipAssemblyEntry[] = [
    { path: "[Content_Types].xml", content: normalizeZipContent(parts.contentTypes) },
    { path: "_rels/.rels", content: normalizeZipContent(parts.packageRels) },
    { path: "xl/workbook.xml", content: normalizeZipContent(parts.workbook) },
    { path: "xl/_rels/workbook.xml.rels", content: normalizeZipContent(parts.workbookRels) },
    { path: "xl/styles.xml", content: normalizeZipContent(parts.styles) },
  ];
  if (parts.sharedStrings) {
    entries.push({ path: "xl/sharedStrings.xml", content: normalizeZipContent(parts.sharedStrings) });
  }
  entries.push({ path: "xl/theme/theme1.xml", content: normalizeZipContent(parts.theme) });
  for (const [name, content] of parts.sheets) {
    entries.push({ path: `xl/worksheets/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.sheetRelationships ?? []) {
    entries.push({ path: `xl/worksheets/_rels/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.tables ?? []) {
    entries.push({ path: `xl/tables/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.pivotTables ?? []) {
    entries.push({ path: `xl/pivotTables/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.pivotTableRelationships ?? []) {
    entries.push({ path: `xl/pivotTables/_rels/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.pivotCacheDefinitions ?? []) {
    entries.push({ path: `xl/pivotCache/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.pivotCacheDefinitionRelationships ?? []) {
    entries.push({ path: `xl/pivotCache/_rels/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.pivotCacheRecords ?? []) {
    entries.push({ path: `xl/pivotCache/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.comments ?? []) {
    entries.push({ path: `xl/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.vmlDrawings ?? []) {
    entries.push({ path: `xl/drawings/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.drawings ?? []) {
    entries.push({ path: `xl/drawings/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.drawingRelationships ?? []) {
    entries.push({ path: `xl/drawings/_rels/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.media ?? []) {
    entries.push({ path: `xl/media/${name}`, content: normalizeZipContent(content) });
  }
  for (const [name, content] of parts.charts ?? []) {
    entries.push({ path: `xl/charts/${name}`, content: normalizeZipContent(content) });
  }
  entries.push({ path: "docProps/core.xml", content: normalizeZipContent(parts.coreProps) });
  entries.push({ path: "docProps/app.xml", content: normalizeZipContent(parts.appProps) });
  return entries;
}

function collectStreamableZipEntries(parts: XlsxStreamableParts): ZipAssemblyEntry[] {
  return collectZipEntries({
    ...parts,
    sheets: parts.sheets.map((sheet) => ([
      sheet.name,
      `${sheet.prefix}${sheet.rowChunks.join("")}${sheet.suffix}`,
    ] as const)),
  });
}

let crc32Table: Uint32Array | undefined;

function getCrc32Table(): Uint32Array {
  if (crc32Table) {
    return crc32Table;
  }
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  crc32Table = table;
  return table;
}

function computeCrc32(buffer: Buffer): number {
  const table = getCrc32Table();
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = table[(crc ^ buffer[index]!) & 0xFF]! ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function encodeDosTimestamp(date: Date): { time: number; date: number } {
  const clampedYear = Math.max(1980, Math.min(2107, date.getUTCFullYear()));
  const dosTime = (
    ((date.getUTCHours() & 0x1F) << 11)
    | ((date.getUTCMinutes() & 0x3F) << 5)
    | Math.floor(date.getUTCSeconds() / 2)
  ) & 0xFFFF;
  const dosDate = (
    (((clampedYear - 1980) & 0x7F) << 9)
    | (((date.getUTCMonth() + 1) & 0x0F) << 5)
    | (date.getUTCDate() & 0x1F)
  ) & 0xFFFF;
  return { time: dosTime, date: dosDate };
}

function createZipArchive(entries: ZipAssemblyEntry[], options: XlsxAssemblyOptions): XlsxAssemblyResult {
  const zipDate = options.deterministic ? DETERMINISTIC_ZIP_DATE : new Date();
  const { time: dosTime, date: dosDate } = encodeDosTimestamp(zipDate);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const entryMetrics: XlsxZipEntryMetrics[] = [];
  let offset = 0;
  let totalLength = 0;

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path, "utf8");
    const compressed = deflateRawSync(entry.content, { level: 6 });
    const crc32 = computeCrc32(entry.content);

    const localHeader = Buffer.alloc(30 + fileName.length);
    localHeader.writeUInt32LE(0x04034B50, 0);
    localHeader.writeUInt16LE(ZIP_VERSION, 4);
    localHeader.writeUInt16LE(ZIP_GENERAL_PURPOSE_FLAG_UTF8, 6);
    localHeader.writeUInt16LE(ZIP_COMPRESSION_METHOD_DEFLATE, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileName.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + fileName.length);
    centralHeader.writeUInt32LE(0x02014B50, 0);
    centralHeader.writeUInt16LE(ZIP_VERSION, 4);
    centralHeader.writeUInt16LE(ZIP_VERSION, 6);
    centralHeader.writeUInt16LE(ZIP_GENERAL_PURPOSE_FLAG_UTF8, 8);
    centralHeader.writeUInt16LE(ZIP_COMPRESSION_METHOD_DEFLATE, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    fileName.copy(centralHeader, 46);

    localParts.push(localHeader, compressed);
    centralParts.push(centralHeader);
    entryMetrics.push({
      path: entry.path,
      uncompressedBytes: entry.content.length,
      compressedBytes: compressed.length,
      zipContributionBytes: localHeader.length + compressed.length + centralHeader.length,
    });

    offset += localHeader.length + compressed.length;
    totalLength += localHeader.length + compressed.length;
  }

  const centralDirectoryOffset = totalLength;
  for (const centralHeader of centralParts) {
    totalLength += centralHeader.length;
  }

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054B50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(totalLength - centralDirectoryOffset, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return {
    buffer: Buffer.concat([...localParts, ...centralParts, endOfCentralDirectory], totalLength + endOfCentralDirectory.length),
    entryMetrics,
  };
}

export async function assembleXlsx(
  parts: XlsxParts,
  options: XlsxAssemblyOptions,
): Promise<Buffer> {
  return createZipArchive(collectZipEntries(parts), options).buffer;
}

export async function assembleXlsxWithMetadata(
  parts: XlsxParts,
  options: XlsxAssemblyOptions,
): Promise<XlsxAssemblyResult> {
  return createZipArchive(collectZipEntries(parts), options);
}

export function assembleXlsxStream(
  parts: XlsxParts,
  options: XlsxAssemblyOptions,
): NodeJS.ReadableStream {
  return Readable.from([createZipArchive(collectZipEntries(parts), options).buffer]);
}

export interface XlsxStreamableSheet {
  name: string;
  prefix: string;
  rowChunks: string[];
  suffix: string;
}

export interface XlsxStreamableParts extends Omit<XlsxParts, "sheets"> {
  sheets: XlsxStreamableSheet[];
}

export function assembleXlsxStreamable(
  parts: XlsxStreamableParts,
  options: XlsxAssemblyOptions,
): NodeJS.ReadableStream {
  return Readable.from([createZipArchive(collectStreamableZipEntries(parts), options).buffer]);
}
