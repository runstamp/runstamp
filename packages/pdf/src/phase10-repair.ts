import { PDFDictionary, PDFNumber, PDFRaw, PDFRef, serializePdfObject } from "./pdf-objects.js";
import {
  scanPdfBuffer,
  validatePdfBuffer,
  type ScannedPdfDocument,
  type ScannedPdfObject,
} from "./phase10-validate.js";
import type {
  PdfRepairAction,
  PdfRepairOptions,
  PdfRepairResult,
  PdfRepairValidationResult,
} from "./phase10-types.js";

const CLASSIC_XREF_LINE_END = Buffer.from([0x20, 0x0a]).toString("ascii");

function getLineBreakStartBeforeToken(content: string, tokenIndex: number): number {
  if (tokenIndex <= 0) {
    return tokenIndex;
  }

  const lastBreakChar = content[tokenIndex - 1];
  if (lastBreakChar === "\n") {
    return tokenIndex >= 2 && content[tokenIndex - 2] === "\r"
      ? tokenIndex - 2
      : tokenIndex - 1;
  }

  if (lastBreakChar === "\r") {
    return tokenIndex - 1;
  }

  return tokenIndex;
}

function refreshObjectState(object: ScannedPdfObject): void {
  object.bodyText = object.body.toString("latin1");
  const streamMatch = /(^|[\r\n])stream(\r?\n)/gm.exec(object.bodyText);
  if (streamMatch) {
    const streamTokenIndex = streamMatch.index + streamMatch[1].length;
    const dataStart = streamMatch.index + streamMatch[0].length;
    const dictionaryText = object.bodyText.slice(0, streamTokenIndex);
    const endStreamMatch = /(^|[\r\n])endstream(?=\r?\n|$)/gm.exec(object.bodyText.slice(dataStart));
    const streamEnd = endStreamMatch
      ? dataStart + getLineBreakStartBeforeToken(object.bodyText.slice(dataStart), endStreamMatch.index + endStreamMatch[1].length)
      : undefined;
    object.dictionaryText = dictionaryText;
    object.streamData = streamEnd !== undefined
      ? object.body.subarray(dataStart, streamEnd)
      : undefined;
    object.refs = [...dictionaryText.matchAll(/(\d+)\s+(\d+)\s+R/g)].map((entry) => Number(entry[1]));
    return;
  }

  object.dictionaryText = object.bodyText.startsWith("<<") ? object.bodyText : undefined;
  object.streamData = undefined;
  object.refs = [...(object.dictionaryText ?? object.bodyText).matchAll(/(\d+)\s+(\d+)\s+R/g)]
    .map((entry) => Number(entry[1]));
}

function patchObjectBody(
  body: Buffer,
  pattern: RegExp,
  replacement: string,
): Buffer {
  const source = body.toString("latin1");
  if (!pattern.test(source)) {
    return body;
  }
  return Buffer.from(source.replace(pattern, replacement), "latin1");
}

function extractTrailerId(trailerText: string | undefined): PDFRaw | null {
  const idMatch = trailerText?.match(/\/ID\s*(\[(?:\s*<[0-9A-Fa-f]+>\s*){2}\])/);
  return idMatch ? new PDFRaw(Buffer.from(idMatch[1], "ascii")) : null;
}

function rebuildRawPdf(scan: ScannedPdfDocument, objects: ScannedPdfObject[]): Buffer {
  const chunks: Buffer[] = [];
  const offsets = new Map<number, number>();
  let length = 0;
  const append = (chunk: Buffer | string): void => {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk, "binary") : chunk;
    chunks.push(buffer);
    length += buffer.length;
  };

  append(`%PDF-${scan.headerVersion}\n`);
  append(Buffer.from([0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]));

  for (const object of [...objects].sort((left, right) => left.objectNumber - right.objectNumber)) {
    offsets.set(object.objectNumber, length);
    append(Buffer.from(`${object.objectNumber} ${object.generationNumber} obj\n`, "ascii"));
    append(object.body);
    append("\nendobj\n");
  }

  const xrefOffset = length;
  const size = Math.max(...objects.map((object) => object.objectNumber), 0) + 1;
  append(`xref\n0 ${size}\n`);
  append(`0000000000 65535 f${CLASSIC_XREF_LINE_END}`);
  for (let objectNumber = 1; objectNumber < size; objectNumber += 1) {
    const offset = offsets.get(objectNumber);
    append(offset === undefined
      ? `0000000000 00000 f${CLASSIC_XREF_LINE_END}`
      : `${String(offset).padStart(10, "0")} 00000 n${CLASSIC_XREF_LINE_END}`);
  }

  const trailer = new PDFDictionary({
    ID: extractTrailerId(scan.trailerText),
    Info: scan.infoRef ? new PDFRef(scan.infoRef) : null,
    Root: scan.rootRef ? new PDFRef(scan.rootRef) : null,
    Size: new PDFNumber(size),
  });
  append("trailer\n");
  append(serializePdfObject(trailer));
  append(`\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

export async function repairPdfBuffer(
  buffer: Buffer,
  options?: PdfRepairOptions,
): Promise<PdfRepairResult> {
  const resolved = {
    recalculateStreamLengths: options?.recalculateStreamLengths ?? true,
    rebuildXref: options?.rebuildXref ?? true,
    repairPageTreeCount: options?.repairPageTreeCount ?? true,
    syncMetadata: options?.syncMetadata ?? true,
  };
  const scan = scanPdfBuffer(buffer);
  const actions: PdfRepairAction[] = [];
  const objects: ScannedPdfObject[] = scan.objects.map((object) => ({
    ...object,
    body: Buffer.from(object.body),
  }));
  const pageCount = scan.objects.filter((object) => /\/Type \/Page\b/.test(object.bodyText) && !/\/Type \/Pages\b/.test(object.bodyText)).length;

  for (const object of objects) {
    if (resolved.repairPageTreeCount && /\/Type \/Pages\b/.test(object.bodyText)) {
      const countMatch = object.bodyText.match(/\/Count\s+(\d+)/);
      if (countMatch && Number(countMatch[1]) !== pageCount) {
        object.body = patchObjectBody(object.body, /\/Count\s+\d+/, `/Count ${pageCount}`);
        refreshObjectState(object);
        actions.push({
          code: "PAGE_TREE_COUNT_MISMATCH",
          description: `Updated page tree count in object ${object.objectNumber} to ${pageCount}.`,
          objectNumber: object.objectNumber,
        });
      }
    }

    if (resolved.syncMetadata && object.streamData && object.bodyText.includes("/Subtype /XML")) {
      const infoTitleMatch = scan.infoRef
        ? scan.objectMap.get(scan.infoRef)?.bodyText.match(/\/Title\s+\((.*?)\)/s)
        : undefined;
      const metadataTitleMatch = object.streamData.toString("utf8").match(/<rdf:li[^>]*>(.*?)<\/rdf:li>/s);
      if (infoTitleMatch?.[1] && metadataTitleMatch?.[1] && infoTitleMatch[1] !== metadataTitleMatch[1]) {
        const updatedXml = object.streamData.toString("utf8").replace(metadataTitleMatch[1], infoTitleMatch[1]);
        const rebuilt: Buffer = Buffer.from(
          object.body.toString("latin1").replace(object.streamData.toString("latin1"), updatedXml),
          "latin1",
        );
        object.body = rebuilt;
        refreshObjectState(object);
        actions.push({
          code: "INFO_XMP_MISMATCH",
          description: `Synchronized XMP title metadata in object ${object.objectNumber}.`,
          objectNumber: object.objectNumber,
        });
      }
    }
  }

  if (resolved.recalculateStreamLengths) {
    for (const object of objects) {
      if (!object.streamData || !object.dictionaryText) {
        continue;
      }
      const lengthMatch = object.dictionaryText.match(/\/Length\s+(\d+)/);
      if (!lengthMatch) {
        continue;
      }
      const actualLength = object.streamData.length;
      const declaredLength = Number(lengthMatch[1]);
      if (declaredLength !== actualLength) {
        object.body = patchObjectBody(object.body, /\/Length\s+\d+/, `/Length ${actualLength}`);
        refreshObjectState(object);
        actions.push({
          code: "STREAM_LENGTH_MISMATCH",
          description: `Recalculated stream length for object ${object.objectNumber}.`,
          objectNumber: object.objectNumber,
        });
      }
    }
  }

  const repairedBuffer = resolved.rebuildXref ? rebuildRawPdf(scan, objects) : buffer;
  if (resolved.rebuildXref) {
    actions.push({
      code: "XREF_OFFSET_MISMATCH",
      description: "Rebuilt the PDF cross-reference table from the scanned object offsets.",
    });
  }

  return {
    actions,
    buffer: repairedBuffer,
    findings: (await validatePdfBuffer(repairedBuffer)).findings,
    repaired: actions.length > 0,
    riskyTransformations: actions.some((action) => action.code === "INFO_XMP_MISMATCH"),
  };
}

export async function validateAndRepairPdfBuffer(
  buffer: Buffer,
  options?: PdfRepairOptions,
): Promise<PdfRepairValidationResult> {
  const original = await validatePdfBuffer(buffer);
  const repair = await repairPdfBuffer(buffer, options);
  const repaired = await validatePdfBuffer(repair.buffer);
  return {
    original,
    repair,
    repaired,
  };
}
