interface ParsedCellToken {
  column: string;
  rowNumber: number;
  absoluteColumn: boolean;
  absoluteRow: boolean;
}

export interface FormulaRowShiftOptions {
  currentSheetName: string;
  targetSheetName: string;
  insertionRow: number;
  rowDelta: number;
}

export interface FormulaRowOffsetOptions {
  currentSheetName: string;
  targetSheetName: string;
  rowOffset: number;
}

const SHEET_NAME_PATTERN = /^(?:'((?:''|[^'])+)'|([A-Za-z_\\][A-Za-z0-9_.\\]*))/;
const CELL_OR_RANGE_PATTERN = /^\$?[A-Z]{1,3}\$?[1-9]\d*(?::\$?[A-Z]{1,3}\$?[1-9]\d*)?/;

function isIdentifierContinuation(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9_.\\]/.test(character);
}

function parseCellToken(token: string): ParsedCellToken {
  const match = /^(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)$/.exec(token);
  if (!match) {
    throw new Error(`Invalid formula cell token: ${token}`);
  }

  return {
    absoluteColumn: match[1] === "$",
    column: match[2] ?? "",
    absoluteRow: match[3] === "$",
    rowNumber: Number(match[4]),
  };
}

function serializeCellToken(cell: ParsedCellToken): string {
  return `${cell.absoluteColumn ? "$" : ""}${cell.column}${cell.absoluteRow ? "$" : ""}${cell.rowNumber}`;
}

function shiftCellTokenRows(token: string, insertionRow: number, rowDelta: number): string {
  const parsed = parseCellToken(token);
  if (parsed.rowNumber < insertionRow) {
    return token;
  }

  return serializeCellToken({
    ...parsed,
    rowNumber: parsed.rowNumber + rowDelta,
  });
}

function shiftRangeRows(range: string, insertionRow: number, rowDelta: number): string {
  const [startRef, endRef] = range.split(":");
  if (!endRef) {
    return shiftCellTokenRows(range, insertionRow, rowDelta);
  }

  const start = parseCellToken(startRef);
  const end = parseCellToken(endRef);
  const insertionTouchesExistingRange = start.rowNumber < insertionRow && end.rowNumber >= (insertionRow - 1);
  const shiftedStart = start.rowNumber >= insertionRow
    ? {
      ...start,
      rowNumber: start.rowNumber + rowDelta,
    }
    : start;
  const shiftedEnd = end.rowNumber >= insertionRow
    ? {
      ...end,
      rowNumber: end.rowNumber + rowDelta,
    }
    : (insertionTouchesExistingRange
      ? {
        ...end,
        rowNumber: end.rowNumber + rowDelta,
      }
      : end);

  return `${serializeCellToken(shiftedStart)}:${serializeCellToken(shiftedEnd)}`;
}

function offsetCellTokenRows(token: string, rowOffset: number): string {
  const parsed = parseCellToken(token);
  if (parsed.absoluteRow) {
    return token;
  }

  return serializeCellToken({
    ...parsed,
    rowNumber: parsed.rowNumber + rowOffset,
  });
}

function offsetRangeRows(range: string, rowOffset: number): string {
  const [startRef, endRef] = range.split(":");
  if (!endRef) {
    return offsetCellTokenRows(range, rowOffset);
  }

  return `${offsetCellTokenRows(startRef, rowOffset)}:${offsetCellTokenRows(endRef, rowOffset)}`;
}

function readStringLiteral(source: string, start: number): { token: string; end: number } {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\"") {
      if (source[index + 1] === "\"") {
        index += 2;
        continue;
      }
      return {
        token: source.slice(start, index + 1),
        end: index + 1,
      };
    }
    index += 1;
  }

  return {
    token: source.slice(start),
    end: source.length,
  };
}

function readQuotedSheetReference(
  source: string,
  start: number,
): { token: string; end: number; shifted?: string } | null {
  const remaining = source.slice(start);
  const sheetMatch = /^'((?:''|[^'])+)'!/.exec(remaining);
  if (!sheetMatch) {
    return null;
  }

  const rangeStart = sheetMatch[0].length;
  const rangeMatch = CELL_OR_RANGE_PATTERN.exec(remaining.slice(rangeStart));
  if (!rangeMatch) {
    return null;
  }

  const sheetName = (sheetMatch[1] ?? "").replaceAll("''", "'");
  const range = rangeMatch[0];
  return {
    token: remaining.slice(0, rangeStart + range.length),
    end: start + rangeStart + range.length,
    shifted: sheetName,
  };
}

function readBareSheetReference(
  source: string,
  start: number,
): { token: string; end: number; shifted?: string } | null {
  const remaining = source.slice(start);
  const sheetMatch = /^([A-Za-z_\\][A-Za-z0-9_.\\]*)!/.exec(remaining);
  if (!sheetMatch) {
    return null;
  }

  const rangeStart = sheetMatch[0].length;
  const rangeMatch = CELL_OR_RANGE_PATTERN.exec(remaining.slice(rangeStart));
  if (!rangeMatch) {
    return null;
  }

  return {
    token: remaining.slice(0, rangeStart + rangeMatch[0].length),
    end: start + rangeStart + rangeMatch[0].length,
    shifted: sheetMatch[1],
  };
}

function readLocalReference(
  source: string,
  start: number,
): { token: string; end: number } | null {
  const previous = start > 0 ? source[start - 1] : undefined;
  if (isIdentifierContinuation(previous)) {
    return null;
  }

  const remaining = source.slice(start);
  const match = CELL_OR_RANGE_PATTERN.exec(remaining);
  if (!match) {
    return null;
  }

  return {
    token: match[0],
    end: start + match[0].length,
  };
}

export function shiftFormulaRows(
  expression: string,
  options: FormulaRowShiftOptions,
): string {
  const hasEqualsPrefix = expression.startsWith("=");
  const source = hasEqualsPrefix ? expression.slice(1) : expression;
  let index = 0;
  let shifted = "";

  while (index < source.length) {
    const current = source[index];
    if (current === "\"") {
      const literal = readStringLiteral(source, index);
      shifted += literal.token;
      index = literal.end;
      continue;
    }

    const quotedSheetReference = current === "'"
      ? readQuotedSheetReference(source, index)
      : null;
    if (quotedSheetReference) {
      const separatorIndex = quotedSheetReference.token.lastIndexOf("!");
      const sheetPart = quotedSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = quotedSheetReference.token.slice(separatorIndex + 1);
      shifted += quotedSheetReference.shifted === options.targetSheetName
        ? `${sheetPart}${shiftRangeRows(rangePart, options.insertionRow, options.rowDelta)}`
        : quotedSheetReference.token;
      index = quotedSheetReference.end;
      continue;
    }

    const bareSheetReference = current && /[A-Za-z_\\]/.test(current)
      ? readBareSheetReference(source, index)
      : null;
    if (bareSheetReference) {
      const separatorIndex = bareSheetReference.token.lastIndexOf("!");
      const sheetPart = bareSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = bareSheetReference.token.slice(separatorIndex + 1);
      shifted += bareSheetReference.shifted === options.targetSheetName
        ? `${sheetPart}${shiftRangeRows(rangePart, options.insertionRow, options.rowDelta)}`
        : bareSheetReference.token;
      index = bareSheetReference.end;
      continue;
    }

    const localReference = (current === "$" || /[A-Z]/.test(current))
      ? readLocalReference(source, index)
      : null;
    if (localReference) {
      shifted += options.currentSheetName === options.targetSheetName
        ? shiftRangeRows(localReference.token, options.insertionRow, options.rowDelta)
        : localReference.token;
      index = localReference.end;
      continue;
    }

    shifted += current;
    index += 1;
  }

  return hasEqualsPrefix ? `=${shifted}` : shifted;
}

export function offsetFormulaRows(
  expression: string,
  options: FormulaRowOffsetOptions,
): string {
  const hasEqualsPrefix = expression.startsWith("=");
  const source = hasEqualsPrefix ? expression.slice(1) : expression;
  let index = 0;
  let shifted = "";

  while (index < source.length) {
    const current = source[index];
    if (current === "\"") {
      const literal = readStringLiteral(source, index);
      shifted += literal.token;
      index = literal.end;
      continue;
    }

    const quotedSheetReference = current === "'"
      ? readQuotedSheetReference(source, index)
      : null;
    if (quotedSheetReference) {
      const separatorIndex = quotedSheetReference.token.lastIndexOf("!");
      const sheetPart = quotedSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = quotedSheetReference.token.slice(separatorIndex + 1);
      shifted += quotedSheetReference.shifted === options.targetSheetName
        ? `${sheetPart}${offsetRangeRows(rangePart, options.rowOffset)}`
        : quotedSheetReference.token;
      index = quotedSheetReference.end;
      continue;
    }

    const bareSheetReference = current && /[A-Za-z_\\]/.test(current)
      ? readBareSheetReference(source, index)
      : null;
    if (bareSheetReference) {
      const separatorIndex = bareSheetReference.token.lastIndexOf("!");
      const sheetPart = bareSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = bareSheetReference.token.slice(separatorIndex + 1);
      shifted += bareSheetReference.shifted === options.targetSheetName
        ? `${sheetPart}${offsetRangeRows(rangePart, options.rowOffset)}`
        : bareSheetReference.token;
      index = bareSheetReference.end;
      continue;
    }

    const localReference = (current === "$" || /[A-Z]/.test(current))
      ? readLocalReference(source, index)
      : null;
    if (localReference) {
      shifted += options.currentSheetName === options.targetSheetName
        ? offsetRangeRows(localReference.token, options.rowOffset)
        : localReference.token;
      index = localReference.end;
      continue;
    }

    shifted += current;
    index += 1;
  }

  return hasEqualsPrefix ? `=${shifted}` : shifted;
}
