import { createHash, randomBytes } from "node:crypto";
import { inflate } from "pako";
import {
  PDFArray,
  PDFDictionary,
  PDFName,
  PDFNumber,
  PDFRaw,
  PDFRef,
  PDFStream,
  PDFString,
  type PDFIndirectObject,
  type PDFValue,
  serializePdfObject,
} from "./pdf-objects.js";
import { writePdfDocument } from "./pdf-writer.js";

export type PdfFormValue = string | boolean | null;
export type PdfExistingFormFieldType = "text" | "checkbox" | "radio" | "dropdown" | "signature" | "unsupported";

export interface PdfFormFieldInfo {
  name: string;
  type: PdfExistingFormFieldType;
  value?: string | boolean | null;
  required: boolean;
  readOnly: boolean;
  options?: string[];
  maxLength?: number;
  widgetCount: number;
}

export interface PdfFormInspection {
  fields: PdfFormFieldInfo[];
  hasXfa: boolean;
  isEncrypted: boolean;
  hasSignatures: boolean;
  unsupported: string[];
}

export interface PdfFillExistingFormOptions {
  strict?: boolean;
  updateDefaultValues?: boolean;
  appearance?: "regenerate" | "needAppearances";
}

export interface PdfFormFillWarning {
  code:
    | "appearance.need_appearances"
    | "appearance.fallback_font"
    | "field.unknown"
    | "field.readonly";
  field?: string;
  message: string;
}

export interface PdfFillExistingFormResult {
  buffer: Buffer;
  filled: string[];
  warnings: PdfFormFillWarning[];
  inspection: PdfFormInspection;
}

type XrefEntry =
  | { generation: number; offset: number; type: 1 }
  | { generation: number; type: 0 }
  | { index: number; objectStream: number; type: 2 };

interface ParsedPdfDocument {
  objects: Map<number, PDFIndirectObject>;
  trailer: PDFDictionary;
  version: string;
}

interface ExistingWidget {
  dict: PDFDictionary;
  onState?: string;
  ref?: PDFRef;
  rect?: number[];
}

interface ExistingFormField {
  dict: PDFDictionary;
  flags: number;
  inherited: Record<string, PDFValue | undefined>;
  name: string;
  ref?: PDFRef;
  type: PdfExistingFormFieldType;
  widgets: ExistingWidget[];
}

const MAX_PARSE_DEPTH = 80;
const MAX_OBJECT_COUNT = 250_000;
const FLAG_READ_ONLY = 1;
const FLAG_REQUIRED = 1 << 1;
const FLAG_RADIO = 1 << 15;
const FLAG_COMBO = 1 << 17;
const FLAG_EDIT = 1 << 18;

class PdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfParseError";
  }
}

class PdfValueParser {
  pos: number;

  constructor(
    private readonly buffer: Buffer,
    pos = 0,
    private readonly end = buffer.length,
  ) {
    this.pos = pos;
  }

  eof(): boolean {
    return this.pos >= this.end;
  }

  startsWith(value: string): boolean {
    return this.buffer.subarray(this.pos, this.pos + value.length).toString("latin1") === value;
  }

  skipWhitespace(): void {
    while (this.pos < this.end) {
      const byte = this.buffer[this.pos] as number;
      if (byte === 0x25) {
        while (this.pos < this.end && !isLineBreak(this.buffer[this.pos] as number)) {
          this.pos += 1;
        }
        continue;
      }
      if (!isWhitespace(byte)) {
        break;
      }
      this.pos += 1;
    }
  }

  readToken(): string {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.end) {
      const byte = this.buffer[this.pos] as number;
      if (isWhitespace(byte) || isDelimiter(byte)) {
        break;
      }
      this.pos += 1;
    }
    if (this.pos === start) {
      throw new PdfParseError(`Expected PDF token at byte ${this.pos}`);
    }
    return this.buffer.subarray(start, this.pos).toString("latin1");
  }

  parseValue(depth = 0): PDFValue {
    if (depth > MAX_PARSE_DEPTH) {
      throw new PdfParseError("PDF object nesting exceeds parser safety limit");
    }

    this.skipWhitespace();
    if (this.eof()) {
      throw new PdfParseError("Unexpected end of PDF while parsing value");
    }

    const byte = this.buffer[this.pos] as number;
    if (byte === 0x3c && this.buffer[this.pos + 1] === 0x3c) {
      return this.parseDictionary(depth + 1);
    }
    if (byte === 0x5b) {
      return this.parseArray(depth + 1);
    }
    if (byte === 0x28) {
      return new PDFString(this.parseLiteralString());
    }
    if (byte === 0x2f) {
      return new PDFName(this.parseName());
    }
    if (byte === 0x3c) {
      return this.parseHexString();
    }

    const token = this.readToken();
    if (token === "true") {
      return true;
    }
    if (token === "false") {
      return false;
    }
    if (token === "null") {
      return null;
    }
    if (isNumericToken(token)) {
      const afterFirst = this.pos;
      this.skipWhitespace();
      const beforeSecond = this.pos;
      if (isIntegerToken(token) && !this.eof() && !isDelimiter(this.buffer[this.pos] as number)) {
        try {
          const second = this.readToken();
          const afterSecond = this.pos;
          this.skipWhitespace();
          if (isIntegerToken(second) && this.startsWith("R") && isTokenBoundary(this.buffer[this.pos + 1])) {
            this.pos += 1;
            return new PDFRef(Number.parseInt(token, 10), Number.parseInt(second, 10));
          }
          this.pos = afterSecond;
        } catch {
          this.pos = beforeSecond;
        }
      }
      this.pos = afterFirst;
      return new PDFNumber(Number.parseFloat(token));
    }

    throw new PdfParseError(`Unsupported PDF token "${token}" at byte ${this.pos}`);
  }

  parseIndirectObject(): PDFIndirectObject {
    this.skipWhitespace();
    const objectNumberToken = this.readToken();
    const generationToken = this.readToken();
    const keyword = this.readToken();
    if (!isIntegerToken(objectNumberToken) || !isIntegerToken(generationToken) || keyword !== "obj") {
      throw new PdfParseError(`Expected indirect object at byte ${this.pos}`);
    }

    const ref = new PDFRef(Number.parseInt(objectNumberToken, 10), Number.parseInt(generationToken, 10));
    let value = this.parseValue();
    this.skipWhitespace();
    if (value instanceof PDFDictionary && this.startsWith("stream")) {
      value = this.parseStream(value);
    }
    this.skipWhitespace();
    if (this.startsWith("endobj")) {
      this.pos += "endobj".length;
    }
    return { ref, value };
  }

  private parseArray(depth: number): PDFArray {
    this.pos += 1;
    const values: PDFValue[] = [];
    while (true) {
      this.skipWhitespace();
      if (this.eof()) {
        throw new PdfParseError("Unterminated PDF array");
      }
      if ((this.buffer[this.pos] as number) === 0x5d) {
        this.pos += 1;
        return new PDFArray(values);
      }
      values.push(this.parseValue(depth + 1));
    }
  }

  private parseDictionary(depth: number): PDFDictionary {
    this.pos += 2;
    const entries: Record<string, PDFValue> = {};
    while (true) {
      this.skipWhitespace();
      if (this.eof()) {
        throw new PdfParseError("Unterminated PDF dictionary");
      }
      if (this.buffer[this.pos] === 0x3e && this.buffer[this.pos + 1] === 0x3e) {
        this.pos += 2;
        return new PDFDictionary(entries);
      }
      if ((this.buffer[this.pos] as number) !== 0x2f) {
        throw new PdfParseError(`Expected PDF dictionary key at byte ${this.pos}`);
      }
      const key = this.parseName();
      entries[key] = this.parseValue(depth + 1);
    }
  }

  private parseHexString(): PDFRaw {
    const start = this.pos;
    this.pos += 1;
    while (this.pos < this.end && (this.buffer[this.pos] as number) !== 0x3e) {
      this.pos += 1;
    }
    if (this.eof()) {
      throw new PdfParseError("Unterminated PDF hex string");
    }
    this.pos += 1;
    return new PDFRaw(this.buffer.subarray(start, this.pos));
  }

  private parseLiteralString(): string {
    this.pos += 1;
    const bytes: number[] = [];
    let depth = 1;
    while (this.pos < this.end && depth > 0) {
      const byte = this.buffer[this.pos] as number;
      this.pos += 1;
      if (byte === 0x5c) {
        const escaped = this.buffer[this.pos] as number | undefined;
        if (escaped === undefined) {
          break;
        }
        this.pos += 1;
        if (escaped === 0x6e) bytes.push(0x0a);
        else if (escaped === 0x72) bytes.push(0x0d);
        else if (escaped === 0x74) bytes.push(0x09);
        else if (escaped === 0x62) bytes.push(0x08);
        else if (escaped === 0x66) bytes.push(0x0c);
        else if (isLineBreak(escaped)) {
          if (escaped === 0x0d && this.buffer[this.pos] === 0x0a) {
            this.pos += 1;
          }
        } else if (isOctalDigit(escaped)) {
          let octal = String.fromCharCode(escaped);
          for (let count = 0; count < 2 && this.pos < this.end && isOctalDigit(this.buffer[this.pos] as number); count += 1) {
            octal += String.fromCharCode(this.buffer[this.pos] as number);
            this.pos += 1;
          }
          bytes.push(Number.parseInt(octal, 8) & 0xff);
        } else {
          bytes.push(escaped);
        }
        continue;
      }
      if (byte === 0x28) {
        depth += 1;
        bytes.push(byte);
        continue;
      }
      if (byte === 0x29) {
        depth -= 1;
        if (depth > 0) {
          bytes.push(byte);
        }
        continue;
      }
      bytes.push(byte);
    }
    if (depth !== 0) {
      throw new PdfParseError("Unterminated PDF literal string");
    }
    return decodePdfStringBytes(Buffer.from(bytes));
  }

  private parseName(): string {
    if ((this.buffer[this.pos] as number) !== 0x2f) {
      throw new PdfParseError(`Expected PDF name at byte ${this.pos}`);
    }
    this.pos += 1;
    const bytes: number[] = [];
    while (this.pos < this.end) {
      const byte = this.buffer[this.pos] as number;
      if (isWhitespace(byte) || isDelimiter(byte)) {
        break;
      }
      this.pos += 1;
      if (byte === 0x23 && this.pos + 1 < this.end) {
        const hex = this.buffer.subarray(this.pos, this.pos + 2).toString("latin1");
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(Number.parseInt(hex, 16));
          this.pos += 2;
          continue;
        }
      }
      bytes.push(byte);
    }
    return Buffer.from(bytes).toString("latin1");
  }

  private parseStream(dictionary: PDFDictionary): PDFStream {
    this.pos += "stream".length;
    if (this.buffer[this.pos] === 0x0d && this.buffer[this.pos + 1] === 0x0a) {
      this.pos += 2;
    } else if (isLineBreak(this.buffer[this.pos] as number)) {
      this.pos += 1;
    }

    const streamStart = this.pos;
    const declaredLength = numberValue(dictionary.entries.Length);
    let streamEnd = -1;
    if (declaredLength !== undefined && declaredLength >= 0 && streamStart + declaredLength <= this.end) {
      const candidateEnd = streamStart + declaredLength;
      const afterLength = new PdfValueParser(this.buffer, candidateEnd, this.end);
      afterLength.skipWhitespace();
      if (afterLength.startsWith("endstream")) {
        streamEnd = candidateEnd;
        this.pos = afterLength.pos + "endstream".length;
      }
    }
    if (streamEnd < 0) {
      const marker = Buffer.from("endstream", "ascii");
      streamEnd = this.buffer.indexOf(marker, streamStart);
      if (streamEnd < 0) {
        throw new PdfParseError("Unterminated PDF stream");
      }
      let dataEnd = streamEnd;
      if (dataEnd > streamStart && this.buffer[dataEnd - 1] === 0x0a) {
        dataEnd -= 1;
        if (dataEnd > streamStart && this.buffer[dataEnd - 1] === 0x0d) {
          dataEnd -= 1;
        }
      } else if (dataEnd > streamStart && this.buffer[dataEnd - 1] === 0x0d) {
        dataEnd -= 1;
      }
      streamEnd = dataEnd;
      this.pos = this.buffer.indexOf(marker, streamStart) + marker.length;
    }

    const entries = { ...dictionary.entries };
    delete entries.Length;
    return new PDFStream(entries, this.buffer.subarray(streamStart, streamEnd));
  }
}

function isWhitespace(byte: number | undefined): boolean {
  return byte === 0x00 || byte === 0x09 || byte === 0x0a || byte === 0x0c || byte === 0x0d || byte === 0x20;
}

function isLineBreak(byte: number | undefined): boolean {
  return byte === 0x0a || byte === 0x0d;
}

function isDelimiter(byte: number | undefined): boolean {
  return byte === undefined || byte === 0x28 || byte === 0x29 || byte === 0x3c || byte === 0x3e || byte === 0x5b || byte === 0x5d || byte === 0x7b || byte === 0x7d || byte === 0x2f || byte === 0x25;
}

function isTokenBoundary(byte: number | undefined): boolean {
  return byte === undefined || isWhitespace(byte) || isDelimiter(byte);
}

function isOctalDigit(byte: number): boolean {
  return byte >= 0x30 && byte <= 0x37;
}

function isNumericToken(token: string): boolean {
  return /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(token);
}

function isIntegerToken(token: string): boolean {
  return /^[+-]?\d+$/.test(token);
}

function decodePdfStringBytes(bytes: Buffer): string {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let value = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      value += String.fromCharCode(bytes.readUInt16BE(index));
    }
    return value;
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    let value = "";
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      value += String.fromCharCode(bytes.readUInt16LE(index));
    }
    return value;
  }
  return bytes.toString("latin1");
}

function numberValue(value: PDFValue | undefined): number | undefined {
  return value instanceof PDFNumber ? value.value : undefined;
}

function intValue(value: PDFValue | undefined): number | undefined {
  const number = numberValue(value);
  return number !== undefined && Number.isInteger(number) ? number : undefined;
}

function nameValue(value: PDFValue | undefined): string | undefined {
  return value instanceof PDFName ? value.value : undefined;
}

function stringValue(value: PDFValue | undefined): string | undefined {
  if (value instanceof PDFString) {
    return value.value;
  }
  if (value instanceof PDFName) {
    return value.value;
  }
  if (value instanceof PDFRaw) {
    const raw = value.value.toString("latin1").trim();
    if (/^<[0-9A-Fa-f\s]*>$/.test(raw)) {
      const hex = raw.slice(1, -1).replace(/\s+/g, "");
      const padded = hex.length % 2 === 0 ? hex : `${hex}0`;
      return decodePdfStringBytes(Buffer.from(padded, "hex"));
    }
  }
  return undefined;
}

function dictValue(value: PDFValue | undefined): PDFDictionary | undefined {
  return value instanceof PDFDictionary ? value : undefined;
}

function arrayValue(value: PDFValue | undefined): PDFArray | undefined {
  return value instanceof PDFArray ? value : undefined;
}

function resolveValue(document: ParsedPdfDocument, value: PDFValue | undefined, depth = 0): PDFValue | undefined {
  if (depth > MAX_PARSE_DEPTH) {
    throw new PdfParseError("PDF reference chain exceeds parser safety limit");
  }
  if (value instanceof PDFRef) {
    return resolveValue(document, document.objects.get(value.objectNumber)?.value, depth + 1);
  }
  return value;
}

function resolveDict(document: ParsedPdfDocument, value: PDFValue | undefined): PDFDictionary | undefined {
  return dictValue(resolveValue(document, value));
}

function resolveArray(document: ParsedPdfDocument, value: PDFValue | undefined): PDFArray | undefined {
  return arrayValue(resolveValue(document, value));
}

function findPdfVersion(buffer: Buffer): string {
  const header = buffer.subarray(0, Math.min(buffer.length, 32)).toString("latin1");
  return /^%PDF-(\d+\.\d+)/.exec(header)?.[1] ?? "1.7";
}

function findStartXref(buffer: Buffer): number {
  const marker = Buffer.from("startxref", "ascii");
  const index = buffer.lastIndexOf(marker);
  if (index < 0) {
    throw new PdfParseError("Malformed PDF: missing startxref");
  }
  const parser = new PdfValueParser(buffer, index + marker.length);
  const token = parser.readToken();
  if (!/^\d+$/.test(token)) {
    throw new PdfParseError("Malformed PDF: startxref does not point to an integer offset");
  }
  return Number.parseInt(token, 10);
}

function parseXrefTable(buffer: Buffer, offset: number): { entries: Map<number, XrefEntry>; trailer: PDFDictionary; prev?: number } {
  const parser = new PdfValueParser(buffer, offset);
  const keyword = parser.readToken();
  if (keyword !== "xref") {
    throw new PdfParseError(`Expected xref table at byte ${offset}`);
  }
  const entries = new Map<number, XrefEntry>();
  while (true) {
    parser.skipWhitespace();
    if (parser.startsWith("trailer")) {
      parser.pos += "trailer".length;
      const trailer = parser.parseValue();
      if (!(trailer instanceof PDFDictionary)) {
        throw new PdfParseError("Malformed PDF: trailer is not a dictionary");
      }
      return { entries, trailer, prev: intValue(trailer.entries.Prev) };
    }

    const startToken = parser.readToken();
    const countToken = parser.readToken();
    if (!isIntegerToken(startToken) || !isIntegerToken(countToken)) {
      throw new PdfParseError("Malformed PDF: invalid xref subsection header");
    }
    const start = Number.parseInt(startToken, 10);
    const count = Number.parseInt(countToken, 10);
    for (let index = 0; index < count; index += 1) {
      const offsetToken = parser.readToken();
      const generationToken = parser.readToken();
      const status = parser.readToken();
      if (!/^\d+$/.test(offsetToken) || !/^\d+$/.test(generationToken)) {
        throw new PdfParseError("Malformed PDF: invalid xref entry");
      }
      const objectNumber = start + index;
      if (status === "n") {
        entries.set(objectNumber, {
          generation: Number.parseInt(generationToken, 10),
          offset: Number.parseInt(offsetToken, 10),
          type: 1,
        });
      } else if (status === "f") {
        entries.set(objectNumber, {
          generation: Number.parseInt(generationToken, 10),
          type: 0,
        });
      }
    }
  }
}

function streamData(stream: PDFStream): Buffer {
  const filter = stream.entries.Filter;
  const filters = filter instanceof PDFArray
    ? filter.values.map(nameValue).filter((value): value is string => Boolean(value))
    : [nameValue(filter)].filter((value): value is string => Boolean(value));
  if (filters.length === 0) {
    return stream.data;
  }
  if (filters.length === 1 && filters[0] === "FlateDecode") {
    return Buffer.from(inflate(stream.data));
  }
  throw new PdfParseError(`Unsupported PDF stream filter ${filters.join(", ")}`);
}

function parseXrefStream(buffer: Buffer, offset: number): { entries: Map<number, XrefEntry>; trailer: PDFDictionary; prev?: number; object: PDFIndirectObject } {
  const object = new PdfValueParser(buffer, offset).parseIndirectObject();
  if (!(object.value instanceof PDFStream) || nameValue(object.value.entries.Type) !== "XRef") {
    throw new PdfParseError(`Expected xref stream object at byte ${offset}`);
  }

  const w = arrayValue(object.value.entries.W)?.values.map((value) => intValue(value)).filter((value): value is number => value !== undefined);
  if (!w || w.length !== 3) {
    throw new PdfParseError("Malformed PDF: xref stream missing W array");
  }
  const indexArray = arrayValue(object.value.entries.Index)?.values.map((value) => intValue(value)).filter((value): value is number => value !== undefined);
  const ranges = indexArray && indexArray.length > 0 ? indexArray : [0, intValue(object.value.entries.Size) ?? 0];
  const data = streamData(object.value);
  const rowSize = w.reduce((sum, value) => sum + value, 0);
  if (rowSize <= 0) {
    throw new PdfParseError("Malformed PDF: xref stream row width is zero");
  }

  const entries = new Map<number, XrefEntry>();
  let cursor = 0;
  for (let rangeIndex = 0; rangeIndex + 1 < ranges.length; rangeIndex += 2) {
    const start = ranges[rangeIndex] as number;
    const count = ranges[rangeIndex + 1] as number;
    for (let index = 0; index < count; index += 1) {
      if (cursor + rowSize > data.length) {
        throw new PdfParseError("Malformed PDF: xref stream data is shorter than declared Index/W arrays");
      }
      const type = w[0] === 0 ? 1 : readBigEndian(data, cursor, w[0] as number);
      cursor += w[0] as number;
      const field2 = readBigEndian(data, cursor, w[1] as number);
      cursor += w[1] as number;
      const field3 = readBigEndian(data, cursor, w[2] as number);
      cursor += w[2] as number;
      const objectNumber = start + index;
      if (type === 0) {
        entries.set(objectNumber, { generation: field3, type: 0 });
      } else if (type === 1) {
        entries.set(objectNumber, { generation: field3, offset: field2, type: 1 });
      } else if (type === 2) {
        entries.set(objectNumber, { index: field3, objectStream: field2, type: 2 });
      }
    }
  }

  return {
    entries,
    object,
    trailer: new PDFDictionary(object.value.entries),
    prev: intValue(object.value.entries.Prev),
  };
}

function readBigEndian(buffer: Buffer, offset: number, width: number): number {
  let value = 0;
  for (let index = 0; index < width; index += 1) {
    value = (value * 256) + (buffer[offset + index] ?? 0);
  }
  return value;
}

function parseXrefSection(buffer: Buffer, offset: number, visited = new Set<number>()): { entries: Map<number, XrefEntry>; trailer: PDFDictionary; xrefObjects: PDFIndirectObject[] } {
  if (visited.has(offset)) {
    throw new PdfParseError("Malformed PDF: cyclic xref Prev chain");
  }
  visited.add(offset);
  if (offset < 0 || offset >= buffer.length) {
    throw new PdfParseError(`Malformed PDF: xref offset ${offset} is outside the file`);
  }

  const current = buffer.subarray(offset, offset + 4).toString("latin1") === "xref"
    ? { ...parseXrefTable(buffer, offset), xrefObjects: [] as PDFIndirectObject[] }
    : (() => {
        const parsed = parseXrefStream(buffer, offset);
        return { ...parsed, xrefObjects: [parsed.object] };
      })();

  if (current.prev === undefined) {
    return current;
  }

  const previous = parseXrefSection(buffer, current.prev, visited);
  const entries = new Map(previous.entries);
  for (const [objectNumber, entry] of current.entries.entries()) {
    entries.set(objectNumber, entry);
  }
  return {
    entries,
    trailer: current.trailer,
    xrefObjects: [...previous.xrefObjects, ...current.xrefObjects],
  };
}

function parseObjectStream(document: ParsedPdfDocument, streamObject: PDFIndirectObject): Map<number, PDFIndirectObject> {
  if (!(streamObject.value instanceof PDFStream) || nameValue(streamObject.value.entries.Type) !== "ObjStm") {
    throw new PdfParseError(`Object ${streamObject.ref.objectNumber} is not an object stream`);
  }
  const n = intValue(streamObject.value.entries.N);
  const first = intValue(streamObject.value.entries.First);
  if (n === undefined || first === undefined) {
    throw new PdfParseError(`Object stream ${streamObject.ref.objectNumber} is missing N or First`);
  }
  const data = streamData(streamObject.value);
  const headerParser = new PdfValueParser(data, 0, first);
  const pairs: Array<{ objectNumber: number; offset: number }> = [];
  for (let index = 0; index < n; index += 1) {
    const objectNumberToken = headerParser.readToken();
    const offsetToken = headerParser.readToken();
    if (!isIntegerToken(objectNumberToken) || !isIntegerToken(offsetToken)) {
      throw new PdfParseError(`Malformed object stream ${streamObject.ref.objectNumber}`);
    }
    pairs.push({
      objectNumber: Number.parseInt(objectNumberToken, 10),
      offset: Number.parseInt(offsetToken, 10),
    });
  }

  const objects = new Map<number, PDFIndirectObject>();
  for (const pair of pairs) {
    const parser = new PdfValueParser(data, first + pair.offset);
    objects.set(pair.objectNumber, {
      ref: new PDFRef(pair.objectNumber),
      value: parser.parseValue(),
    });
  }
  return objects;
}

function parsePdfDocument(input: Buffer | Uint8Array): ParsedPdfDocument {
  const buffer = Buffer.from(input);
  const version = findPdfVersion(buffer);
  const startXref = findStartXref(buffer);
  const xref = parseXrefSection(buffer, startXref);
  if (xref.entries.size > MAX_OBJECT_COUNT) {
    throw new PdfParseError(`PDF has ${xref.entries.size} xref entries, above the parser safety limit`);
  }

  const objects = new Map<number, PDFIndirectObject>();
  for (const object of xref.xrefObjects) {
    objects.set(object.ref.objectNumber, object);
  }
  for (const [objectNumber, entry] of xref.entries.entries()) {
    if (objectNumber === 0 || entry.type !== 1 || entry.offset <= 0) {
      continue;
    }
    const object = new PdfValueParser(buffer, entry.offset).parseIndirectObject();
    objects.set(object.ref.objectNumber, object);
  }

  const document: ParsedPdfDocument = {
    objects,
    trailer: xref.trailer,
    version,
  };

  const objectStreamNumbers = new Set<number>();
  for (const entry of xref.entries.values()) {
    if (entry.type === 2) {
      objectStreamNumbers.add(entry.objectStream);
    }
  }
  for (const objectStreamNumber of objectStreamNumbers) {
    const objectStream = objects.get(objectStreamNumber);
    if (!objectStream) {
      throw new PdfParseError(`Missing object stream ${objectStreamNumber}`);
    }
    const compressedObjects = parseObjectStream(document, objectStream);
    for (const [objectNumber, object] of compressedObjects.entries()) {
      if (xref.entries.get(objectNumber)?.type === 2) {
        objects.set(objectNumber, object);
      }
    }
  }

  return document;
}

function rootDictionary(document: ParsedPdfDocument): { dict?: PDFDictionary; ref?: PDFRef } {
  const root = document.trailer.entries.Root;
  return {
    dict: resolveDict(document, root),
    ref: root instanceof PDFRef ? root : undefined,
  };
}

function acroFormDictionary(document: ParsedPdfDocument): { dict?: PDFDictionary; ref?: PDFRef } {
  const root = rootDictionary(document).dict;
  const acroForm = root?.entries.AcroForm;
  return {
    dict: resolveDict(document, acroForm),
    ref: acroForm instanceof PDFRef ? acroForm : undefined,
  };
}

function fieldFlag(value: number, mask: number): boolean {
  return (value & mask) !== 0;
}

function collectExistingFormFields(document: ParsedPdfDocument): { acroForm?: PDFDictionary; fields: ExistingFormField[]; hasXfa: boolean; unsupported: string[] } {
  const acroForm = acroFormDictionary(document).dict;
  const unsupported: string[] = [];
  if (!acroForm) {
    return { fields: [], hasXfa: false, unsupported };
  }
  const hasXfa = acroForm.entries.XFA !== undefined && acroForm.entries.XFA !== null;
  const fieldsArray = resolveArray(document, acroForm.entries.Fields);
  if (!fieldsArray) {
    return { acroForm, fields: [], hasXfa, unsupported: ["AcroForm is missing a Fields array"] };
  }

  const fields: ExistingFormField[] = [];
  const seen = new Set<string>();
  for (const fieldValue of fieldsArray.values) {
    visitField(document, fieldValue, undefined, "", {}, fields, unsupported, seen);
  }
  return { acroForm, fields, hasXfa, unsupported };
}

function visitField(
  document: ParsedPdfDocument,
  value: PDFValue,
  ref: PDFRef | undefined,
  parentName: string,
  inherited: Record<string, PDFValue | undefined>,
  fields: ExistingFormField[],
  unsupported: string[],
  seen: Set<string>,
): void {
  const fieldRef = value instanceof PDFRef ? value : ref;
  const dict = resolveDict(document, value);
  if (!dict) {
    unsupported.push(`${parentName || "<root>"}: field reference does not resolve to a dictionary`);
    return;
  }
  const currentInherited = {
    DA: dict.entries.DA ?? inherited.DA,
    DR: dict.entries.DR ?? inherited.DR,
    FT: dict.entries.FT ?? inherited.FT,
    Ff: dict.entries.Ff ?? inherited.Ff,
    MaxLen: dict.entries.MaxLen ?? inherited.MaxLen,
  };
  const localName = stringValue(dict.entries.T);
  const name = localName ? (parentName ? `${parentName}.${localName}` : localName) : parentName;
  const kids = resolveArray(document, dict.entries.Kids);
  const ft = nameValue(currentInherited.FT);
  const widgetsFromKids: ExistingWidget[] = [];
  let hasChildFields = false;

  if (kids) {
    for (const kidValue of kids.values) {
      const kidDict = resolveDict(document, kidValue);
      const kidRef = kidValue instanceof PDFRef ? kidValue : undefined;
      if (!kidDict) {
        unsupported.push(`${name || "<unnamed>"}: kid reference does not resolve to a dictionary`);
        continue;
      }
      const kidSubtype = nameValue(kidDict.entries.Subtype);
      const kidHasFieldType = kidDict.entries.FT !== undefined || kidDict.entries.T !== undefined;
      if (kidSubtype === "Widget" && !kidHasFieldType) {
        widgetsFromKids.push({
          dict: kidDict,
          onState: detectWidgetOnState(document, kidDict),
          rect: numericArray(resolveArray(document, kidDict.entries.Rect)),
          ref: kidRef,
        });
        continue;
      }
      hasChildFields = true;
      visitField(document, kidValue, kidRef, name, currentInherited, fields, unsupported, seen);
    }
  }

  if (!ft || (hasChildFields && widgetsFromKids.length === 0)) {
    return;
  }

  const key = fieldRef ? `${fieldRef.objectNumber}:${fieldRef.generationNumber}` : name;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);

  const flags = intValue(currentInherited.Ff) ?? 0;
  const type = fieldType(ft, flags);
  const widgets = widgetsFromKids.length > 0
    ? widgetsFromKids
    : nameValue(dict.entries.Subtype) === "Widget"
      ? [{
          dict,
          onState: detectWidgetOnState(document, dict),
          rect: numericArray(resolveArray(document, dict.entries.Rect)),
          ref: fieldRef,
        }]
      : [];

  if (type === "unsupported") {
    unsupported.push(`${name || "<unnamed>"}: unsupported AcroForm field type /${ft}`);
  }

  fields.push({
    dict,
    flags,
    inherited: currentInherited,
    name: name || `<field-${fields.length + 1}>`,
    ref: fieldRef,
    type,
    widgets,
  });
}

function fieldType(ft: string, flags: number): PdfExistingFormFieldType {
  if (ft === "Tx") return "text";
  if (ft === "Ch") return "dropdown";
  if (ft === "Sig") return "signature";
  if (ft === "Btn") return fieldFlag(flags, FLAG_RADIO) ? "radio" : "checkbox";
  return "unsupported";
}

function numericArray(array: PDFArray | undefined): number[] | undefined {
  if (!array) {
    return undefined;
  }
  const values = array.values.map((value) => numberValue(value));
  return values.every((value): value is number => value !== undefined) ? values : undefined;
}

function detectWidgetOnState(document: ParsedPdfDocument, widget: PDFDictionary): string | undefined {
  const ap = resolveDict(document, widget.entries.AP);
  const normal = resolveValue(document, ap?.entries.N);
  if (normal instanceof PDFDictionary) {
    return Object.keys(normal.entries).find((key) => key !== "Off");
  }
  const as = nameValue(widget.entries.AS);
  return as && as !== "Off" ? as : undefined;
}

function fieldOptions(document: ParsedPdfDocument, field: ExistingFormField): string[] | undefined {
  const options = resolveArray(document, field.dict.entries.Opt);
  if (!options) {
    return undefined;
  }
  const result: string[] = [];
  for (const option of options.values) {
    if (option instanceof PDFArray) {
      const exportValue = stringValue(option.values[0]);
      if (exportValue !== undefined) {
        result.push(exportValue);
      }
    } else {
      const value = stringValue(option);
      if (value !== undefined) {
        result.push(value);
      }
    }
  }
  return result;
}

function currentFieldValue(field: ExistingFormField): string | boolean | null | undefined {
  const rawValue = field.dict.entries.V;
  if (rawValue === null) {
    return null;
  }
  if (field.type === "checkbox") {
    const state = nameValue(rawValue);
    return Boolean(state && state !== "Off");
  }
  return stringValue(rawValue);
}

function hasFilledSignature(document: ParsedPdfDocument, fields: ExistingFormField[]): boolean {
  if (fields.some((field) => field.type === "signature" && field.dict.entries.V !== undefined && field.dict.entries.V !== null)) {
    return true;
  }
  return Array.from(document.objects.values()).some((object) =>
    object.value instanceof PDFDictionary
      && (object.value.entries.ByteRange !== undefined || nameValue(object.value.entries.Type) === "Sig" || nameValue(object.value.entries.SubFilter)?.includes("pkcs7")),
  );
}

function hasByteRange(document: ParsedPdfDocument): boolean {
  return Array.from(document.objects.values()).some((object) =>
    object.value instanceof PDFDictionary && object.value.entries.ByteRange !== undefined,
  );
}

export function inspectExistingPdfForm(input: Buffer | Uint8Array): PdfFormInspection {
  const document = parsePdfDocument(input);
  const isEncrypted = document.trailer.entries.Encrypt !== undefined && document.trailer.entries.Encrypt !== null;
  const collected = collectExistingFormFields(document);
  const fields = collected.fields.map((field): PdfFormFieldInfo => ({
    maxLength: intValue(field.inherited.MaxLen),
    name: field.name,
    options: field.type === "dropdown" || field.type === "radio"
      ? field.type === "radio"
        ? field.widgets.map((widget) => widget.onState).filter((value): value is string => Boolean(value))
        : fieldOptions(document, field)
      : undefined,
    readOnly: fieldFlag(field.flags, FLAG_READ_ONLY),
    required: fieldFlag(field.flags, FLAG_REQUIRED),
    type: field.type,
    value: currentFieldValue(field),
    widgetCount: field.widgets.length,
  }));

  return {
    fields,
    hasSignatures: hasFilledSignature(document, collected.fields),
    hasXfa: collected.hasXfa,
    isEncrypted,
    unsupported: collected.unsupported,
  };
}

export function fillExistingPdfForm(
  input: Buffer | Uint8Array,
  values: Record<string, PdfFormValue>,
  options: PdfFillExistingFormOptions = {},
): PdfFillExistingFormResult {
  const strict = options.strict ?? true;
  const document = parsePdfDocument(input);
  const isEncrypted = document.trailer.entries.Encrypt !== undefined && document.trailer.entries.Encrypt !== null;
  const collected = collectExistingFormFields(document);
  const hasSignatures = hasFilledSignature(document, collected.fields) || hasByteRange(document);
  if (isEncrypted) {
    throw new Error("Cannot fill existing PDF form: encrypted PDFs are not supported by this API.");
  }
  if (collected.hasXfa) {
    throw new Error("Cannot fill existing PDF form: XFA forms are not supported.");
  }
  if (hasSignatures) {
    throw new Error("Cannot fill existing PDF form: signed PDFs require the deferred incremental-save F-EN-006 path.");
  }
  if (!acroFormDictionary(document).dict) {
    throw new Error("Cannot fill existing PDF form: the PDF does not contain an AcroForm.");
  }

  const fieldByName = new Map(collected.fields.map((field) => [field.name, field]));
  const warnings: PdfFormFillWarning[] = [];
  const filled: string[] = [];
  let fallbackFontRef: PDFRef | undefined;
  const getFallbackFontRef = (): PDFRef => {
    fallbackFontRef ??= ensureFormAppearanceFont(document);
    return fallbackFontRef;
  };

  for (const [name, value] of Object.entries(values)) {
    const field = fieldByName.get(name);
    if (!field) {
      const warning: PdfFormFillWarning = {
        code: "field.unknown",
        field: name,
        message: `No AcroForm field named "${name}" exists in this PDF.`,
      };
      if (strict) {
        throw new Error(warning.message);
      }
      warnings.push(warning);
      continue;
    }
    if (field.type === "signature") {
      throw new Error(`Cannot fill signature field "${name}"; signature-preserving updates are deferred to F-EN-006.`);
    }
    if (field.type === "unsupported") {
      throw new Error(`Cannot fill unsupported AcroForm field "${name}".`);
    }
    if (fieldFlag(field.flags, FLAG_READ_ONLY)) {
      warnings.push({
        code: "field.readonly",
        field: name,
        message: `Field "${name}" is read-only in the source PDF; Runstamp updated it programmatically.`,
      });
    }

    applyFieldValue(document, field, value, options, warnings, getFallbackFontRef);
    filled.push(name);
  }

  const inspection = inspectDocumentState(document, collected.hasXfa, isEncrypted, hasSignatures, collected.unsupported);
  const buffer = writeFilledPdfDocument(document);
  return {
    buffer,
    filled,
    inspection,
    warnings,
  };
}

function inspectDocumentState(
  document: ParsedPdfDocument,
  hasXfa: boolean,
  isEncrypted: boolean,
  hasSignatures: boolean,
  unsupported: string[],
): PdfFormInspection {
  const fields = collectExistingFormFields(document).fields.map((field): PdfFormFieldInfo => ({
    maxLength: intValue(field.inherited.MaxLen),
    name: field.name,
    options: field.type === "dropdown" || field.type === "radio"
      ? field.type === "radio"
        ? field.widgets.map((widget) => widget.onState).filter((value): value is string => Boolean(value))
        : fieldOptions(document, field)
      : undefined,
    readOnly: fieldFlag(field.flags, FLAG_READ_ONLY),
    required: fieldFlag(field.flags, FLAG_REQUIRED),
    type: field.type,
    value: currentFieldValue(field),
    widgetCount: field.widgets.length,
  }));
  return { fields, hasSignatures, hasXfa, isEncrypted, unsupported };
}

function applyFieldValue(
  document: ParsedPdfDocument,
  field: ExistingFormField,
  value: PdfFormValue,
  options: PdfFillExistingFormOptions,
  warnings: PdfFormFillWarning[],
  getFallbackFontRef: () => PDFRef,
): void {
  if (field.type === "text") {
    if (value !== null && typeof value !== "string") {
      throw new Error(`Text field "${field.name}" requires a string or null value.`);
    }
    const maxLength = intValue(field.inherited.MaxLen);
    if (value !== null && maxLength !== undefined && value.length > maxLength) {
      throw new Error(`Text field "${field.name}" exceeds MaxLen ${maxLength}.`);
    }
    field.dict.entries.V = value === null ? null : new PDFString(value);
    if (options.updateDefaultValues) {
      field.dict.entries.DV = value === null ? null : new PDFString(value);
    }
    updateWidgetAppearances(document, field, value, options, warnings, getFallbackFontRef);
    return;
  }

  if (field.type === "dropdown") {
    if (value !== null && typeof value !== "string") {
      throw new Error(`Dropdown field "${field.name}" requires a string or null value.`);
    }
    const optionsList = fieldOptions(document, field) ?? [];
    const allowsCustom = fieldFlag(field.flags, FLAG_COMBO) && fieldFlag(field.flags, FLAG_EDIT);
    if (value !== null && optionsList.length > 0 && !optionsList.includes(value) && !allowsCustom) {
      throw new Error(`Dropdown field "${field.name}" does not contain option "${value}".`);
    }
    field.dict.entries.V = value === null ? null : new PDFString(value);
    if (options.updateDefaultValues) {
      field.dict.entries.DV = value === null ? null : new PDFString(value);
    }
    updateWidgetAppearances(document, field, value, options, warnings, getFallbackFontRef);
    return;
  }

  if (field.type === "checkbox") {
    if (value !== null && typeof value !== "boolean") {
      throw new Error(`Checkbox field "${field.name}" requires a boolean or null value.`);
    }
    const checked = value === true;
    const state = checked ? (field.widgets[0]?.onState ?? "Yes") : "Off";
    field.dict.entries.V = new PDFName(state);
    if (options.updateDefaultValues) {
      field.dict.entries.DV = new PDFName(state);
    }
    for (const widget of field.widgets) {
      widget.dict.entries.AS = new PDFName(checked ? (widget.onState ?? state) : "Off");
    }
    updateWidgetAppearances(document, field, checked, options, warnings, getFallbackFontRef);
    return;
  }

  if (field.type === "radio") {
    if (value !== null && typeof value !== "string") {
      throw new Error(`Radio field "${field.name}" requires an export-value string or null value.`);
    }
    const states = field.widgets.map((widget) => widget.onState).filter((state): state is string => Boolean(state));
    if (value !== null && !states.includes(value)) {
      throw new Error(`Radio field "${field.name}" does not contain export value "${value}".`);
    }
    field.dict.entries.V = value === null ? null : new PDFName(value);
    if (options.updateDefaultValues) {
      field.dict.entries.DV = value === null ? null : new PDFName(value);
    }
    for (const widget of field.widgets) {
      widget.dict.entries.AS = new PDFName(value !== null && widget.onState === value ? value : "Off");
    }
    updateWidgetAppearances(document, field, value, options, warnings, getFallbackFontRef);
  }
}

function updateWidgetAppearances(
  document: ParsedPdfDocument,
  field: ExistingFormField,
  value: string | boolean | null,
  options: PdfFillExistingFormOptions,
  warnings: PdfFormFillWarning[],
  getFallbackFontRef: () => PDFRef,
): void {
  const acroForm = acroFormDictionary(document).dict;
  if (!acroForm) {
    return;
  }
  if (options.appearance === "needAppearances") {
    acroForm.entries.NeedAppearances = true;
    warnings.push({
      code: "appearance.need_appearances",
      field: field.name,
      message: `Appearance regeneration was skipped for field "${field.name}"; NeedAppearances was set.`,
    });
    return;
  }

  if ((field.type === "text" || field.type === "dropdown") && typeof value === "string" && containsNonWinAnsi(value)) {
    acroForm.entries.NeedAppearances = true;
    warnings.push({
      code: "appearance.need_appearances",
      field: field.name,
      message: `Field "${field.name}" contains text outside the simple WinAnsi appearance path; NeedAppearances was set.`,
    });
    return;
  }

  for (const widget of field.widgets) {
    if (!widget.rect || widget.rect.length < 4) {
      acroForm.entries.NeedAppearances = true;
      warnings.push({
        code: "appearance.need_appearances",
        field: field.name,
        message: `Field "${field.name}" has a widget without a parseable Rect; NeedAppearances was set.`,
      });
      continue;
    }
    if (field.type === "checkbox") {
      const offRef = appendObject(document, buildCheckboxAppearance(widget.rect, false));
      const onRef = appendObject(document, buildCheckboxAppearance(widget.rect, true));
      const onState = widget.onState ?? "Yes";
      widget.dict.entries.AP = new PDFDictionary({
        N: new PDFDictionary({
          Off: offRef,
          [onState]: onRef,
        }),
      });
      widget.dict.entries.AS = new PDFName(value === true ? onState : "Off");
    } else if (field.type === "radio") {
      const offRef = appendObject(document, buildRadioAppearance(widget.rect, false));
      const onRef = appendObject(document, buildRadioAppearance(widget.rect, true));
      const onState = widget.onState ?? "Yes";
      widget.dict.entries.AP = new PDFDictionary({
        N: new PDFDictionary({
          Off: offRef,
          [onState]: onRef,
        }),
      });
      widget.dict.entries.AS = new PDFName(value === onState ? onState : "Off");
    } else {
      const da = stringValue(field.dict.entries.DA) ?? stringValue(field.inherited.DA);
      const fontSize = parseDefaultAppearanceFontSize(da) ?? 12;
      let fontRef = parseDefaultAppearanceFontRef(document, field, da);
      if (!fontRef) {
        fontRef = getFallbackFontRef();
        warnings.push({
          code: "appearance.fallback_font",
          field: field.name,
          message: `Field "${field.name}" appearance uses Runstamp fallback Helvetica because the source /DA and /DR font were not parseable.`,
        });
      }
      const appearanceRef = appendObject(document, buildTextAppearance(widget.rect, typeof value === "string" ? value : "", fontRef, fontSize));
      widget.dict.entries.AP = new PDFDictionary({ N: appearanceRef });
    }
  }
}

function appendObject(document: ParsedPdfDocument, value: PDFValue): PDFRef {
  const next = Math.max(0, ...document.objects.keys()) + 1;
  const ref = new PDFRef(next);
  document.objects.set(next, { ref, value });
  return ref;
}

function ensureFormAppearanceFont(document: ParsedPdfDocument): PDFRef {
  for (const object of document.objects.values()) {
    if (object.value instanceof PDFDictionary
      && nameValue(object.value.entries.Type) === "Font"
      && nameValue(object.value.entries.Subtype) === "Type1"
      && nameValue(object.value.entries.BaseFont) === "Helvetica") {
      return object.ref;
    }
  }
  return appendObject(document, new PDFDictionary({
    BaseFont: new PDFName("Helvetica"),
    Subtype: new PDFName("Type1"),
    Type: new PDFName("Font"),
  }));
}

function parseDefaultAppearanceFontSize(da: string | undefined): number | undefined {
  if (!da) {
    return undefined;
  }
  const match = /(?:^|\s)\/[^\s/]+\s+([+-]?(?:\d+\.?\d*|\.\d+))\s+Tf(?:\s|$)/.exec(da);
  if (!match) {
    return undefined;
  }
  const value = Number.parseFloat(match[1] as string);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseDefaultAppearanceFontRef(document: ParsedPdfDocument, field: ExistingFormField, da: string | undefined): PDFRef | undefined {
  const alias = da ? /(?:^|\s)\/([^\s/]+)\s+[+-]?(?:\d+\.?\d*|\.\d+)\s+Tf(?:\s|$)/.exec(da)?.[1] : undefined;
  if (!alias) {
    return undefined;
  }
  const dr = resolveDict(document, field.dict.entries.DR)
    ?? resolveDict(document, field.inherited.DR)
    ?? resolveDict(document, acroFormDictionary(document).dict?.entries.DR);
  const fontDict = resolveDict(document, resolveDict(document, dr)?.entries.Font);
  const ref = fontDict?.entries[alias];
  if (ref instanceof PDFRef) {
    return ref;
  }
  for (const widget of field.widgets) {
    const page = resolveDict(document, widget.dict.entries.P);
    const resources = resolveDict(document, page?.entries.Resources);
    const pageFontDict = resolveDict(document, resources?.entries.Font);
    const pageRef = pageFontDict?.entries[alias];
    if (pageRef instanceof PDFRef) {
      return pageRef;
    }
  }
  return undefined;
}

function containsNonWinAnsi(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 0xff) {
      return true;
    }
  }
  return false;
}

function buildTextAppearance(rect: number[], value: string, fontRef: PDFRef, fontSize: number): PDFStream {
  const width = Math.max(1, rect[2] - rect[0]);
  const height = Math.max(1, rect[3] - rect[1]);
  const baseline = Math.max(2, (height / 2) - (fontSize * 0.35));
  const commands = [
    "q",
    "0.95 g",
    `0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`,
    "f",
    "0 G",
    "1 w",
    `0.5 0.5 ${formatPdfNumber(Math.max(0.5, width - 1))} ${formatPdfNumber(Math.max(0.5, height - 1))} re`,
    "S",
    ...(value.length > 0
      ? [
          "0 g",
          "BT",
          `/F1 ${formatPdfNumber(fontSize)} Tf`,
          `2 ${formatPdfNumber(baseline)} Td`,
          `${serializePdfObject(new PDFString(value)).toString("latin1")} Tj`,
          "ET",
        ]
      : []),
    "Q",
  ];
  return new PDFStream(
    {
      BBox: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(width), new PDFNumber(height)]),
      FormType: new PDFNumber(1),
      Resources: new PDFDictionary({
        Font: new PDFDictionary({ F1: fontRef }),
      }),
      Subtype: new PDFName("Form"),
      Type: new PDFName("XObject"),
    },
    Buffer.from(commands.join("\n"), "latin1"),
  );
}

function buildCheckboxAppearance(rect: number[], checked: boolean): PDFStream {
  const width = Math.max(1, rect[2] - rect[0]);
  const height = Math.max(1, rect[3] - rect[1]);
  const commands = [
    "q",
    "1 g",
    `0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`,
    "f",
    "0 G",
    "1 w",
    `0.5 0.5 ${formatPdfNumber(Math.max(0.5, width - 1))} ${formatPdfNumber(Math.max(0.5, height - 1))} re`,
    "S",
    ...(checked
      ? [
          `${formatPdfNumber(width * 0.2)} ${formatPdfNumber(height * 0.52)} m`,
          `${formatPdfNumber(width * 0.42)} ${formatPdfNumber(height * 0.24)} l`,
          `${formatPdfNumber(width * 0.82)} ${formatPdfNumber(height * 0.82)} l`,
          "S",
        ]
      : []),
    "Q",
  ];
  return appearanceStream(width, height, commands);
}

function buildRadioAppearance(rect: number[], checked: boolean): PDFStream {
  const width = Math.max(1, rect[2] - rect[0]);
  const height = Math.max(1, rect[3] - rect[1]);
  const dotSize = Math.max(2, Math.min(width, height) * 0.48);
  const commands = [
    "q",
    "1 g",
    `0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`,
    "f",
    "0 G",
    "1 w",
    `0.5 0.5 ${formatPdfNumber(Math.max(0.5, width - 1))} ${formatPdfNumber(Math.max(0.5, height - 1))} re`,
    "S",
    ...(checked
      ? [
          "0 g",
          `${formatPdfNumber((width - dotSize) / 2)} ${formatPdfNumber((height - dotSize) / 2)} ${formatPdfNumber(dotSize)} ${formatPdfNumber(dotSize)} re`,
          "f",
        ]
      : []),
    "Q",
  ];
  return appearanceStream(width, height, commands);
}

function appearanceStream(width: number, height: number, commands: string[]): PDFStream {
  return new PDFStream(
    {
      BBox: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(width), new PDFNumber(height)]),
      FormType: new PDFNumber(1),
      Subtype: new PDFName("Form"),
      Type: new PDFName("XObject"),
    },
    Buffer.from(commands.join("\n"), "latin1"),
  );
}

function formatPdfNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function isXrefOrObjectStream(value: PDFValue): boolean {
  return value instanceof PDFStream && (nameValue(value.entries.Type) === "XRef" || nameValue(value.entries.Type) === "ObjStm");
}

function writeFilledPdfDocument(document: ParsedPdfDocument): Buffer {
  const root = rootDictionary(document).ref;
  if (!root) {
    throw new Error("Cannot rewrite existing PDF: trailer Root is not an indirect reference.");
  }
  let info = document.trailer.entries.Info instanceof PDFRef ? document.trailer.entries.Info : undefined;
  if (!info) {
    info = appendObject(document, new PDFDictionary({
      Producer: new PDFString("Runstamp PDF"),
    }));
  }

  const objects = Array.from(document.objects.values())
    .filter((object) => !isXrefOrObjectStream(object.value))
    .sort((left, right) => left.ref.objectNumber - right.ref.objectNumber);

  return writePdfDocument({
    fileId: rewriteFileId(document),
    info,
    objects,
    root,
    version: document.version,
  });
}

function rewriteFileId(document: ParsedPdfDocument): [Buffer, Buffer] | undefined {
  const id = arrayValue(document.trailer.entries.ID);
  const first = id ? fileIdBytes(id.values[0]) : undefined;
  if (!first) {
    return undefined;
  }
  return [first, randomBytes(16)];
}

function fileIdBytes(value: PDFValue | undefined): Buffer | undefined {
  if (value instanceof PDFRaw) {
    const raw = value.value.toString("latin1").trim();
    const match = /^<([0-9A-Fa-f\s]+)>$/.exec(raw);
    if (match) {
      return Buffer.from((match[1] as string).replace(/\s+/g, "").slice(0, 32).padEnd(32, "0"), "hex");
    }
  }
  if (value instanceof PDFString) {
    return createHash("md5").update(value.value, "latin1").digest();
  }
  return undefined;
}
