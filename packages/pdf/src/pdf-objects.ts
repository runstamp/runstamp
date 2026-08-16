export type PDFValue =
  | PDFArray
  | PDFDictionary
  | PDFName
  | PDFNumber
  | PDFRaw
  | PDFRef
  | PDFStream
  | PDFString
  | boolean
  | null;

export type PDFDictionaryEntries = Record<string, PDFValue>;

export class PDFNumber {
  readonly value: number;

  constructor(value: number) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`PDF numbers must be finite, received ${value}`);
    }
    this.value = value;
  }
}

export class PDFName {
  readonly value: string;

  constructor(value: string) {
    if (value.length === 0) {
      throw new TypeError("PDF names must not be empty");
    }
    this.value = value.startsWith("/") ? value.slice(1) : value;
  }
}

export class PDFString {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

export class PDFRef {
  readonly objectNumber: number;
  readonly generationNumber: number;

  constructor(objectNumber: number, generationNumber = 0) {
    if (!Number.isInteger(objectNumber) || objectNumber <= 0) {
      throw new TypeError(`PDF references must use positive integer object numbers, received ${objectNumber}`);
    }
    if (!Number.isInteger(generationNumber) || generationNumber < 0) {
      throw new TypeError(`PDF generation numbers must be non-negative integers, received ${generationNumber}`);
    }
    this.objectNumber = objectNumber;
    this.generationNumber = generationNumber;
  }
}

export class PDFRaw {
  readonly value: Buffer;

  constructor(value: Buffer | Uint8Array | string) {
    this.value = typeof value === "string" ? Buffer.from(value, "ascii") : Buffer.from(value);
  }
}

export class PDFArray {
  readonly values: PDFValue[];

  constructor(values: PDFValue[]) {
    this.values = [...values];
  }
}

export class PDFDictionary {
  readonly entries: PDFDictionaryEntries;

  constructor(entries: PDFDictionaryEntries = {}) {
    this.entries = { ...entries };
  }
}

export class PDFStream {
  readonly entries: PDFDictionaryEntries;
  readonly data: Buffer;

  constructor(entries: PDFDictionaryEntries = {}, data: Buffer | Uint8Array) {
    this.data = Buffer.from(data);
    this.entries = {
      ...entries,
      Length: new PDFNumber(this.data.length),
    };
  }
}

export interface PDFIndirectObject {
  ref: PDFRef;
  value: PDFValue;
}

function formatPdfNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  const exact = value.toString();
  if (!/[eE]/.test(exact)) {
    return exact;
  }

  return value.toFixed(6).replace(/\.?0+$/, "");
}

function escapePdfName(value: string): string {
  let result = "";

  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code > 0xFF) {
      throw new TypeError(`PDF names cannot contain Unicode codepoints above U+00FF: U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
    }

    const isPrintableAscii = code >= 0x21 && code <= 0x7E;
    const needsEscaping = !isPrintableAscii || "#%/()[]{}<>".includes(char);
    if (!needsEscaping) {
      result += char;
      continue;
    }

    result += `#${code.toString(16).toUpperCase().padStart(2, "0")}`;
  }

  return result;
}

function escapePdfString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function containsNonLatin1(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0xFF) {
      return true;
    }
  }
  return false;
}

export function serializePdfObject(value: PDFValue): Buffer {
  if (value instanceof PDFNumber) {
    return Buffer.from(formatPdfNumber(value.value), "ascii");
  }

  if (value instanceof PDFName) {
    return Buffer.from(`/${escapePdfName(value.value)}`, "ascii");
  }

  if (value instanceof PDFString) {
    const needsUtf16 = containsNonLatin1(value.value);
    if (needsUtf16) {
      const bom = Buffer.from([0xFE, 0xFF]);
      const encoded = Buffer.alloc(value.value.length * 2);
      for (let i = 0; i < value.value.length; i++) {
        encoded.writeUInt16BE(value.value.charCodeAt(i), i * 2);
      }
      const hex = Buffer.concat([bom, encoded]).toString("hex").toUpperCase();
      return Buffer.from(`<${hex}>`, "ascii");
    }
    return Buffer.from(`(${escapePdfString(value.value)})`, "latin1");
  }

  if (value instanceof PDFRef) {
    return Buffer.from(`${value.objectNumber} ${value.generationNumber} R`, "ascii");
  }

  if (value instanceof PDFRaw) {
    return Buffer.from(value.value);
  }

  if (value instanceof PDFArray) {
    return Buffer.from(
      `[${value.values.map((entry) => serializePdfObject(entry).toString("binary")).join(" ")}]`,
      "binary",
    );
  }

  if (value instanceof PDFDictionary) {
    const keys = Object.keys(value.entries).sort().filter((key) => {
      const entry = value.entries[key];
      return entry !== null && entry !== undefined;
    });
    const body = keys
      .map((key) => `/${escapePdfName(key)} ${serializePdfObject(value.entries[key] as PDFValue).toString("binary")}`)
      .join("\n");
    return Buffer.from(body.length === 0 ? "<<\n>>" : `<<\n${body}\n>>`, "binary");
  }

  if (value instanceof PDFStream) {
    const dictionary = serializePdfObject(new PDFDictionary(value.entries));
    return Buffer.concat([
      dictionary,
      Buffer.from("\nstream\n", "ascii"),
      value.data,
      Buffer.from("\r\nendstream", "ascii"),
    ]);
  }

  if (typeof value === "boolean") {
    return Buffer.from(value ? "true" : "false", "ascii");
  }

  if (value === null) {
    return Buffer.from("null", "ascii");
  }

  throw new TypeError(`Unsupported PDF object value: ${String(value)}`);
}
