import { quoteSheetName } from "../worksheet/structure.js";

const EXCEL_MAX_COLUMNS = 16_384;
const COLUMN_LETTERS = Array.from({ length: EXCEL_MAX_COLUMNS }, (_unused, index) => {
  let current = index + 1;
  let letters = "";

  while (current > 0) {
    current -= 1;
    letters = String.fromCharCode(65 + (current % 26)) + letters;
    current = Math.floor(current / 26);
  }

  return letters;
});

export function colIndexToLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= EXCEL_MAX_COLUMNS) {
    throw new RangeError(`Column index ${index} is outside Excel's supported range`);
  }

  return COLUMN_LETTERS[index];
}

export function rowIndexToRowNum(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`Row index ${index} must be a non-negative integer`);
  }

  return String(index + 1);
}

export function cellRef(row: number, col: number): string {
  return `${colIndexToLetter(col)}${rowIndexToRowNum(row)}`;
}

export function absCellRef(row: number, col: number): string {
  return `$${colIndexToLetter(col)}$${rowIndexToRowNum(row)}`;
}

export function parseCellRef(ref: string): { row: number; col: number } {
  const match = /^\$?([A-Z]+)\$?([1-9]\d*)$/.exec(ref);

  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }

  const [, letters, rowString] = match;
  let col = 0;

  for (const character of letters) {
    col = (col * 26) + (character.charCodeAt(0) - 64);
  }

  return {
    row: Number(rowString) - 1,
    col: col - 1,
  };
}

export interface ParsedRangeRef {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export function parseRangeRef(ref: string): ParsedRangeRef {
  const [startRef, endRef] = ref.split(":");
  if (!startRef || !endRef) {
    const parsed = parseCellRef(ref);
    return {
      startRow: parsed.row,
      startCol: parsed.col,
      endRow: parsed.row,
      endCol: parsed.col,
    };
  }

  const start = parseCellRef(startRef);
  const end = parseCellRef(endRef);
  return {
    startRow: Math.min(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endRow: Math.max(start.row, end.row),
    endCol: Math.max(start.col, end.col),
  };
}

export function rangeRef(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  return `${cellRef(startRow, startCol)}:${cellRef(endRow, endCol)}`;
}

export function absRangeRef(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  return `${absCellRef(startRow, startCol)}:${absCellRef(endRow, endCol)}`;
}

export function formatSheetRef(sheetName: string, cellRef: string): string {
  return `${quoteSheetName(sheetName)}!${cellRef}`;
}

export function formatSheetRange(sheetName: string, startCell: string, endCell: string): string {
  return `${quoteSheetName(sheetName)}!${startCell}:${endCell}`;
}

export function extractSheetReferences(formula: string): string[] {
  const refs = new Set<string>();
  // Match quoted sheet names: 'anything'!
  const quotedPattern = /'((?:[^']|'')+)'!/g;
  let match: RegExpExecArray | null;
  while ((match = quotedPattern.exec(formula)) !== null) {
    refs.add(match[1].replaceAll("''", "'"));
  }
  // Match unquoted sheet names: word chars followed by !
  // Must start with letter/underscore (digit-starting names are always quoted)
  const unquotedPattern = /(?<![A-Za-z0-9_.'"])([A-Za-z_][A-Za-z0-9_.]*)\s*!/g;
  while ((match = unquotedPattern.exec(formula)) !== null) {
    refs.add(match[1]);
  }
  return [...refs];
}
