import { absCellRef, absRangeRef, cellRef, rangeRef, formatSheetRef, formatSheetRange } from "../utils/cell-ref.js";
import { dateToSerial } from "../utils/date.js";

export type FormulaOperand = string | number | boolean | Date;

function toOperand(value: FormulaOperand): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return String(dateToSerial(value));
}

function call(name: string, ...args: FormulaOperand[]): string {
  return `${name}(${args.map(toOperand).join(",")})`;
}

function unaryFunction(name: string) {
  return (value: FormulaOperand): string => call(name, value);
}

function binaryFunction(name: string) {
  return (left: FormulaOperand, right: FormulaOperand): string => call(name, left, right);
}

function variadicFunction(name: string) {
  return (...args: FormulaOperand[]): string => call(name, ...args);
}

export const F = {
  text(value: string): string {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  },
  bool(value: boolean): string {
    return value ? "TRUE" : "FALSE";
  },
  num(value: number): string {
    return String(value);
  },
  date(value: Date): string {
    return String(dateToSerial(value));
  },
  cell(row: number, col: number): string {
    return cellRef(row, col);
  },
  absCell(row: number, col: number): string {
    return absCellRef(row, col);
  },
  range(startRow: number, startCol: number, endRow: number, endCol: number): string {
    return rangeRef(startRow, startCol, endRow, endCol);
  },
  absRange(startRow: number, startCol: number, endRow: number, endCol: number): string {
    return absRangeRef(startRow, startCol, endRow, endCol);
  },
  ref(sheetName: string, startRef: string, endRef?: string): string {
    return endRef
      ? formatSheetRange(sheetName, startRef, endRef)
      : formatSheetRef(sheetName, startRef);
  },
  sumSheet(sheetName: string, startRef: string, endRef: string): string {
    return call("SUM", formatSheetRange(sheetName, startRef, endRef));
  },
  vlookupSheet(
    lookupValue: FormulaOperand,
    sheetName: string,
    tableStart: string,
    tableEnd: string,
    colIndex: FormulaOperand,
    exactMatch: boolean = true,
  ): string {
    return call(
      "VLOOKUP",
      lookupValue,
      formatSheetRange(sheetName, tableStart, tableEnd),
      colIndex,
      !exactMatch,
    );
  },
  parens(expression: FormulaOperand): string {
    return `(${toOperand(expression)})`;
  },
  add(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}+${toOperand(right)}`;
  },
  subtract(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}-${toOperand(right)}`;
  },
  multiply(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}*${toOperand(right)}`;
  },
  divide(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}/${toOperand(right)}`;
  },
  power(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}^${toOperand(right)}`;
  },
  eq(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}=${toOperand(right)}`;
  },
  ne(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}<>${toOperand(right)}`;
  },
  lt(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}<${toOperand(right)}`;
  },
  lte(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}<=${toOperand(right)}`;
  },
  gt(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}>${toOperand(right)}`;
  },
  gte(left: FormulaOperand, right: FormulaOperand): string {
    return `${toOperand(left)}>=${toOperand(right)}`;
  },
  sum: variadicFunction("SUM"),
  average: variadicFunction("AVERAGE"),
  count: variadicFunction("COUNT"),
  counta: variadicFunction("COUNTA"),
  countblank: variadicFunction("COUNTBLANK"),
  min: variadicFunction("MIN"),
  max: variadicFunction("MAX"),
  sumproduct: variadicFunction("SUMPRODUCT"),
  sumif: variadicFunction("SUMIF"),
  sumifs: variadicFunction("SUMIFS"),
  countif: variadicFunction("COUNTIF"),
  countifs: variadicFunction("COUNTIFS"),
  averageif: variadicFunction("AVERAGEIF"),
  averageifs: variadicFunction("AVERAGEIFS"),
  round: binaryFunction("ROUND"),
  roundup: binaryFunction("ROUNDUP"),
  rounddown: binaryFunction("ROUNDDOWN"),
  abs: unaryFunction("ABS"),
  sqrt: unaryFunction("SQRT"),
  int: unaryFunction("INT"),
  ceiling: variadicFunction("CEILING"),
  floor: variadicFunction("FLOOR"),
  mod: binaryFunction("MOD"),
  if(condition: FormulaOperand, whenTrue: FormulaOperand, whenFalse: FormulaOperand): string {
    return call("IF", condition, whenTrue, whenFalse);
  },
  and: variadicFunction("AND"),
  or: variadicFunction("OR"),
  not: unaryFunction("NOT"),
  iferror: binaryFunction("IFERROR"),
  ifna: binaryFunction("IFNA"),
  isblank: unaryFunction("ISBLANK"),
  isnumber: unaryFunction("ISNUMBER"),
  istext: unaryFunction("ISTEXT"),
  len: unaryFunction("LEN"),
  left: variadicFunction("LEFT"),
  right: variadicFunction("RIGHT"),
  mid: variadicFunction("MID"),
  trim: unaryFunction("TRIM"),
  upper: unaryFunction("UPPER"),
  lower: unaryFunction("LOWER"),
  proper: unaryFunction("PROPER"),
  concat: variadicFunction("CONCAT"),
  textjoin: variadicFunction("TEXTJOIN"),
  substitute: variadicFunction("SUBSTITUTE"),
  find: variadicFunction("FIND"),
  search: variadicFunction("SEARCH"),
  vlookup(lookupValue: FormulaOperand, tableArray: FormulaOperand, columnIndex: FormulaOperand, rangeLookup: FormulaOperand): string {
    return call("VLOOKUP", lookupValue, tableArray, columnIndex, rangeLookup);
  },
  hlookup(lookupValue: FormulaOperand, tableArray: FormulaOperand, rowIndex: FormulaOperand, rangeLookup: FormulaOperand): string {
    return call("HLOOKUP", lookupValue, tableArray, rowIndex, rangeLookup);
  },
  index: variadicFunction("INDEX"),
  match: variadicFunction("MATCH"),
  xlookup: variadicFunction("XLOOKUP"),
  choose: variadicFunction("CHOOSE"),
  offset: variadicFunction("OFFSET"),
  row: variadicFunction("ROW"),
  column: variadicFunction("COLUMN"),
  rows: variadicFunction("ROWS"),
  columns: variadicFunction("COLUMNS"),
  today(): string {
    return call("TODAY");
  },
  now(): string {
    return call("NOW");
  },
  datevalue: unaryFunction("DATEVALUE"),
  year: unaryFunction("YEAR"),
  month: unaryFunction("MONTH"),
  day: unaryFunction("DAY"),
  eomonth: binaryFunction("EOMONTH"),
  edate: binaryFunction("EDATE"),
};
