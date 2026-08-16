import { deflate } from "pako";
import type { PdfEncryptionResult } from "./encryption/types.js";
import { PDFArray, PDFDictionary, PDFIndirectObject, PDFName, PDFNumber, PDFRaw, PDFRef, PDFStream, PDFString, type PDFValue, serializePdfObject } from "./pdf-objects.js";

const CLASSIC_XREF_LINE_END = Buffer.from([0x20, 0x0a]).toString("ascii");

class ByteCounterWriter {
  private readonly chunks: Buffer[] = [];

  byteLength = 0;

  write(chunk: Buffer | Uint8Array | string): number {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk, "binary") : Buffer.from(chunk);
    const startOffset = this.byteLength;
    this.chunks.push(buffer);
    this.byteLength += buffer.length;
    return startOffset;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

function padNumber(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function assertUniqueObjects(objects: PDFIndirectObject[]): void {
  const seen = new Set<number>();
  for (const object of objects) {
    if (seen.has(object.ref.objectNumber)) {
      throw new Error(`Duplicate indirect object number ${object.ref.objectNumber}`);
    }
    seen.add(object.ref.objectNumber);
  }
}

function sortObjects(objects: PDFIndirectObject[]): PDFIndirectObject[] {
  return [...objects].sort((left, right) => left.ref.objectNumber - right.ref.objectNumber);
}

function maxObjectNumber(objects: PDFIndirectObject[]): number {
  return objects.reduce((max, object) => Math.max(max, object.ref.objectNumber), 0);
}

function serializeIndirectObject(object: PDFIndirectObject): Buffer {
  return Buffer.concat([
    Buffer.from(`${object.ref.objectNumber} ${object.ref.generationNumber} obj\n`, "ascii"),
    serializePdfObject(object.value),
    Buffer.from("\nendobj\n", "ascii"),
  ]);
}

export interface PDFWriteOptions {
  encrypt?: PdfEncryptionResult;
  fileId?: [Buffer, Buffer];
  info: PDFRef;
  objects: PDFIndirectObject[];
  root: PDFRef;
  version?: string;
  /**
   * Emit a `/Type /XRef` cross-reference stream instead of the classic
   * `xref ... trailer` block. The renderer sets this true only when the
   * caller has explicitly opted into a 1.5+ target via
   * `options.pdfVersion`; feature-implied version bumps (PDF/A-2b → 1.7,
   * AES-256 → 1.7) do NOT switch the xref format on their own, because
   * downstream tooling (validator, repair, signature byte-range
   * computation) depends on the classic xref layout for those code paths.
   */
  useXrefStream?: boolean;
  /**
   * Pack non-stream generation-0 dictionary objects into `/Type /ObjStm`
   * compressed object streams. Requires `useXrefStream: true` (object
   * streams cannot be referenced by classic xref). Mutually exclusive
   * with `encrypt` for now — per ISO 32000-1 §7.5.7, object streams
   * follow per-stream encryption rather than per-object, but the
   * encryption interop is intentionally deferred to a follow-up.
   */
  packObjectStreams?: boolean;
}

/**
 * Cross-reference entry. Type 1 = uncompressed (field1 = byte offset,
 * field2 = generation). Type 2 = compressed in an object stream
 * (field1 = ObjStm object number, field2 = index within stream).
 */
interface XrefEntry {
  type: 0 | 1 | 2;
  field1: number;
  field2: number;
}

function buildXrefStreamBytes(
  entries: Map<number, XrefEntry>,
  size: number,
  fieldWidths: [number, number, number],
): Buffer {
  const [w0, w1, w2] = fieldWidths;
  const entryBytes = w0 + w1 + w2;
  const buffer = Buffer.alloc(size * entryBytes);
  let cursor = 0;

  // Object 0: head of free list.
  buffer.writeUIntBE(0, cursor, w0); cursor += w0;
  buffer.writeUIntBE(0, cursor, w1); cursor += w1;
  buffer.writeUIntBE(0xffff, cursor, w2); cursor += w2;

  for (let objectNumber = 1; objectNumber < size; objectNumber += 1) {
    const entry = entries.get(objectNumber);
    if (!entry) {
      // Permanently-free entry placeholder.
      buffer.writeUIntBE(0, cursor, w0); cursor += w0;
      buffer.writeUIntBE(0, cursor, w1); cursor += w1;
      buffer.writeUIntBE(0xffff, cursor, w2); cursor += w2;
      continue;
    }
    buffer.writeUIntBE(entry.type, cursor, w0); cursor += w0;
    buffer.writeUIntBE(entry.field1, cursor, w1); cursor += w1;
    buffer.writeUIntBE(entry.field2, cursor, w2); cursor += w2;
  }
  return buffer;
}

const OBJSTM_PACK_LIMIT = 100;

/**
 * Partition objects into "packable" (eligible for /Type /ObjStm) and
 * "indirect" (must stay as freestanding objects).
 *
 * Per ISO 32000-1 §7.5.7:
 *  - Streams cannot be packed (they're indirect by definition).
 *  - Generation > 0 objects cannot be packed.
 *  - The encryption dictionary cannot be packed (decryption needs it
 *    available without decompression).
 *
 * We additionally never pack:
 *  - The signature value dict (signature byte-range computation
 *    depends on its absolute byte offsets — out of scope here, but
 *    M6.c is gated on `!signaturePlan` from the renderer side).
 */
function partitionForObjStm(
  objects: PDFIndirectObject[],
  encryptObjectNumber: number | undefined,
): { packable: PDFIndirectObject[]; indirect: PDFIndirectObject[] } {
  const packable: PDFIndirectObject[] = [];
  const indirect: PDFIndirectObject[] = [];
  for (const object of objects) {
    if (object.ref.generationNumber !== 0) {
      indirect.push(object);
      continue;
    }
    if (encryptObjectNumber !== undefined && object.ref.objectNumber === encryptObjectNumber) {
      indirect.push(object);
      continue;
    }
    if (object.value instanceof PDFStream) {
      indirect.push(object);
      continue;
    }
    packable.push(object);
  }
  return { packable, indirect };
}

interface PackedObjStmPlan {
  /** Indirect objects to emit before the xref stream. */
  indirect: PDFIndirectObject[];
  /** ObjStm wrapper objects (each carries up to OBJSTM_PACK_LIMIT packed entries). */
  objStms: PDFIndirectObject[];
  /** Xref entries indexed by object number. Excludes object 0. */
  entries: Map<number, XrefEntry>;
}

/**
 * Build the ObjStm wrapper objects for a packable set, allocating
 * fresh object numbers for each ObjStm. Returns the plan plus updated
 * xref entries (type-2 for packed objects, type-1 placeholder for
 * indirect ones — the type-1 byte offsets are filled in later when
 * the writer actually emits each indirect object).
 */
function planObjectStreams(
  packable: PDFIndirectObject[],
  indirect: PDFIndirectObject[],
  startingObjStmNumber: number,
): PackedObjStmPlan {
  const entries = new Map<number, XrefEntry>();
  const objStms: PDFIndirectObject[] = [];

  let nextObjStmNum = startingObjStmNumber;
  for (let chunkStart = 0; chunkStart < packable.length; chunkStart += OBJSTM_PACK_LIMIT) {
    const chunk = packable.slice(chunkStart, chunkStart + OBJSTM_PACK_LIMIT);
    const objStmRef = new PDFRef(nextObjStmNum);
    nextObjStmNum += 1;

    // First serialize each contained object's body (no `N G obj` /
    // `endobj` wrappers), recording its byte offset within the
    // concatenated payload for the leading index table.
    const bodyChunks: Buffer[] = [];
    let runningOffset = 0;
    const indexEntries: string[] = [];
    chunk.forEach((object, indexInStream) => {
      indexEntries.push(`${object.ref.objectNumber} ${runningOffset}`);
      const body = serializePdfObject(object.value);
      bodyChunks.push(body);
      bodyChunks.push(Buffer.from("\n", "ascii"));
      runningOffset += body.length + 1;
      entries.set(object.ref.objectNumber, {
        type: 2,
        field1: objStmRef.objectNumber,
        field2: indexInStream,
      });
    });

    const indexBuffer = Buffer.from(`${indexEntries.join(" ")}\n`, "ascii");
    const firstOffset = indexBuffer.length;
    const decoded = Buffer.concat([indexBuffer, ...bodyChunks]);
    const compressed = Buffer.from(deflate(decoded));

    objStms.push({
      ref: objStmRef,
      value: new PDFStream(
        {
          Filter: new PDFName("FlateDecode"),
          First: new PDFNumber(firstOffset),
          N: new PDFNumber(chunk.length),
          Type: new PDFName("ObjStm"),
        },
        compressed,
      ),
    });
  }

  // Indirect entries get type-1 placeholders here; the writer will
  // overwrite `field1` (byte offset) when it actually emits each.
  for (const object of indirect) {
    entries.set(object.ref.objectNumber, { type: 1, field1: 0, field2: object.ref.generationNumber });
  }
  // ObjStm wrapper objects themselves are also indirect (uncompressed).
  for (const objStm of objStms) {
    entries.set(objStm.ref.objectNumber, { type: 1, field1: 0, field2: 0 });
  }

  return { indirect, objStms, entries };
}

function encryptPdfValue(
  value: PDFValue,
  objectNumber: number,
  generationNumber: number,
  encrypt: PdfEncryptionResult,
): PDFValue {
  if (value instanceof PDFString) {
    const raw = Buffer.from(value.value, "latin1");
    const encrypted = encrypt.encryptString(raw, objectNumber, generationNumber);
    return new PDFRaw(Buffer.from(`<${encrypted.toString("hex").toUpperCase()}>`, "ascii"));
  }
  if (value instanceof PDFStream) {
    const { Length: _length, ...entriesWithoutLength } = value.entries;
    const encryptedData = encrypt.encryptStream(value.data, objectNumber, generationNumber);
    return new PDFStream(entriesWithoutLength as Record<string, PDFValue>, encryptedData);
  }
  if (value instanceof PDFDictionary) {
    const newEntries: Record<string, PDFValue> = {};
    for (const [key, val] of Object.entries(value.entries)) {
      newEntries[key] = encryptPdfValue(val as PDFValue, objectNumber, generationNumber, encrypt);
    }
    return new PDFDictionary(newEntries);
  }
  if (value instanceof PDFArray) {
    return new PDFArray(value.values.map(v => encryptPdfValue(v, objectNumber, generationNumber, encrypt)));
  }
  return value;
}

export function writePdfDocument(options: PDFWriteOptions): Buffer {
  const version = options.version ?? "1.4";
  const writer = new ByteCounterWriter();
  const offsets = new Map<number, number>();

  // Add Encrypt indirect object if encryption is enabled
  let encryptRef: PDFRef | undefined;
  if (options.encrypt) {
    const encryptObjNum = maxObjectNumber(options.objects) + 1;
    encryptRef = new PDFRef(encryptObjNum);
    options.objects.push({
      ref: encryptRef,
      value: new PDFDictionary(options.encrypt.encryptDict as Record<string, PDFValue>),
    });
  }

  const objects = sortObjects(options.objects);
  assertUniqueObjects(objects);

  writer.write(`%PDF-${version}\n`);
  writer.write(Buffer.from([0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]));

  // When useXrefStream is enabled the writer below re-emits objects
  // through the xref-stream / ObjStm code path; skip the legacy
  // per-object loop to avoid double work and to leave `offsets` clean
  // for the classic-xref branch only.
  if (!(options.useXrefStream === true)) {
    for (const object of objects) {
      offsets.set(object.ref.objectNumber, writer.byteLength);
      if (options.encrypt && encryptRef && object.ref.objectNumber !== encryptRef.objectNumber) {
        const encrypted = {
          ...object,
          value: encryptPdfValue(object.value, object.ref.objectNumber, object.ref.generationNumber, options.encrypt),
        };
        writer.write(serializeIndirectObject(encrypted));
      } else {
        writer.write(serializeIndirectObject(object));
      }
    }
  }

  const useXrefStream = options.useXrefStream === true;
  const finalSize = useXrefStream
    ? maxObjectNumber(objects) + 2 // +1 for the 0-object slot, +1 for the xref-stream object itself
    : maxObjectNumber(objects) + 1;

  // Common ID array used by either trailer style.
  const idArray = (() => {
    if (options.encrypt && encryptRef) {
      return new PDFArray([
        new PDFRaw(Buffer.from(`<${options.encrypt.fileId[0].toString("hex").toUpperCase()}>`, "ascii")),
        new PDFRaw(Buffer.from(`<${options.encrypt.fileId[1].toString("hex").toUpperCase()}>`, "ascii")),
      ]);
    }
    if (options.fileId) {
      return new PDFArray([
        new PDFRaw(Buffer.from(`<${options.fileId[0].toString("hex").toUpperCase()}>`, "ascii")),
        new PDFRaw(Buffer.from(`<${options.fileId[1].toString("hex").toUpperCase()}>`, "ascii")),
      ]);
    }
    return undefined;
  })();

  if (useXrefStream) {
    // ObjStm packing is opt-in and only legal without encryption — see
    // PDFWriteOptions docs. We treat encryption as a hard "no packing"
    // signal so callers don't accidentally end up with a malformed
    // file when they enable both.
    const packEnabled = options.packObjectStreams === true && !options.encrypt;

    // Step 1: rewind the writer so we can re-emit objects in the right
    // order. Up to this point we've already written the header and all
    // unencrypted indirect objects (rebuilt below). Reset the writer to
    // an empty state and re-emit cleanly.
    const xrefWriter = new ByteCounterWriter();
    xrefWriter.write(`%PDF-${version}\n`);
    xrefWriter.write(Buffer.from([0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]));

    let plan: PackedObjStmPlan;
    if (packEnabled) {
      const { packable, indirect } = partitionForObjStm(objects, encryptRef?.objectNumber);
      // ObjStm wrapper objects need fresh object numbers above the
      // existing maximum.
      const startingObjStmNum = maxObjectNumber(objects) + 1;
      plan = planObjectStreams(packable, indirect, startingObjStmNum);
    } else {
      // No packing — every object stays indirect and gets a type-1 entry.
      plan = {
        indirect: objects,
        objStms: [],
        entries: new Map(objects.map((o) => [o.ref.objectNumber, { type: 1, field1: 0, field2: o.ref.generationNumber } as const])),
      };
    }

    // Step 2: re-emit indirect objects (including ObjStm wrappers) in
    // sorted order; record byte offsets as type-1 entries.
    const allIndirect = sortObjects([...plan.indirect, ...plan.objStms]);
    for (const object of allIndirect) {
      const offset = xrefWriter.byteLength;
      const entry = plan.entries.get(object.ref.objectNumber);
      if (entry) {
        entry.field1 = offset;
      }
      if (options.encrypt && encryptRef && object.ref.objectNumber !== encryptRef.objectNumber) {
        const encrypted = {
          ...object,
          value: encryptPdfValue(object.value, object.ref.objectNumber, object.ref.generationNumber, options.encrypt),
        };
        xrefWriter.write(serializeIndirectObject(encrypted));
      } else {
        xrefWriter.write(serializeIndirectObject(object));
      }
    }

    // Step 3: emit the xref stream itself, referencing all objects.
    const xrefStreamObjNum = maxObjectNumber(allIndirect) + 1;
    const xrefStreamRef = new PDFRef(xrefStreamObjNum);
    const xrefStreamOffset = xrefWriter.byteLength;
    plan.entries.set(xrefStreamObjNum, { type: 1, field1: xrefStreamOffset, field2: 0 });

    const xrefSize = xrefStreamObjNum + 1;
    const fieldWidths: [number, number, number] = [1, 4, 2];
    const xrefBytes = buildXrefStreamBytes(plan.entries, xrefSize, fieldWidths);
    const compressed = Buffer.from(deflate(xrefBytes));

    const dictEntries: Record<string, PDFValue> = {
      Filter: new PDFName("FlateDecode"),
      Info: options.info,
      Root: options.root,
      Size: new PDFNumber(xrefSize),
      Type: new PDFName("XRef"),
      W: new PDFArray(fieldWidths.map((w) => new PDFNumber(w))),
    };
    if (options.encrypt && encryptRef) {
      dictEntries.Encrypt = encryptRef;
    }
    if (idArray) {
      dictEntries.ID = idArray;
    }

    xrefWriter.write(serializeIndirectObject({
      ref: xrefStreamRef,
      value: new PDFStream(dictEntries, compressed),
    }));
    xrefWriter.write(`startxref\n${xrefStreamOffset}\n%%EOF\n`);
    return xrefWriter.toBuffer();
  }

  const xrefOffset = writer.byteLength;
  const size = finalSize;

  writer.write(`xref\n0 ${size}\n`);
  writer.write(`0000000000 65535 f${CLASSIC_XREF_LINE_END}`);
  for (let objectNumber = 1; objectNumber < size; objectNumber += 1) {
    const offset = offsets.get(objectNumber);
    if (offset === undefined) {
      writer.write(`0000000000 00000 f${CLASSIC_XREF_LINE_END}`);
      continue;
    }
    writer.write(`${padNumber(offset, 10)} ${padNumber(0, 5)} n${CLASSIC_XREF_LINE_END}`);
  }

  const trailerEntries: Record<string, PDFValue> = {
    Info: options.info,
    Root: options.root,
    Size: new PDFNumber(size),
  };
  if (options.encrypt && encryptRef) {
    trailerEntries.Encrypt = encryptRef;
  }
  if (idArray) {
    trailerEntries.ID = idArray;
  }
  const trailer = new PDFDictionary(trailerEntries);

  writer.write("trailer\n");
  writer.write(serializePdfObject(trailer));
  writer.write(`\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return writer.toBuffer();
}

export type { PDFIndirectObject, PDFValue };
