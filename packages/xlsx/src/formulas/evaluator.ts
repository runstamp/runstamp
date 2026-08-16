import type {
  CellValue,
  SpreadsheetCell,
  SpreadsheetCellFormula,
  SpreadsheetDocument,
} from "../types/spreadsheet-ast.js";
import { isErrorValue } from "../types/spreadsheet-ast.js";
import { cellRef, parseRangeRef } from "../utils/cell-ref.js";
import { dateToSerial, serialToDate, type ExcelDateSystem } from "../utils/date.js";

const SHEET_REFERENCE_PATTERN = /^(?:'[^']*(?:''[^']*)*'|[A-Za-z_\\][A-Za-z0-9_.\\]*)!\$?[A-Z]+\$?[1-9]\d*(?::\$?[A-Z]+\$?[1-9]\d*)?/;
const CELL_REFERENCE_PATTERN = /^\$?[A-Z]+\$?[1-9]\d*(?::\$?[A-Z]+\$?[1-9]\d*)?/;
const IDENTIFIER_PATTERN = /^[A-Za-z_\\][A-Za-z0-9_.\\]*/;

type FormulaValue = CellValue | CellValue[] | undefined;

type FormulaNode =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "reference"; value: string }
  | { type: "namedRange"; name: string }
  | { type: "function"; name: string; args: FormulaNode[] }
  | { type: "unary"; operator: "+" | "-"; operand: FormulaNode }
  | { type: "binary"; operator: "+" | "-" | "*" | "/" | "=" | "<>" | "<" | "<=" | ">" | ">="; left: FormulaNode; right: FormulaNode };

function normalizeFormulaExpression(expression: string): string {
  return expression.startsWith("=") ? expression.slice(1) : expression;
}

function stringifyRichText(value: CellValue): string | undefined {
  if (isErrorValue(value)) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return typeof value === "string" ? value : undefined;
  }

  return value.map((run) => run.text).join("");
}

function isBlankValue(value: CellValue | undefined): boolean {
  return value === undefined || value === null || value === "";
}

function flattenFormulaValue(value: FormulaValue): CellValue[] {
  if (value === undefined) {
    return [];
  }

  return isCellValueList(value) ? value : [value];
}

function toScalar(value: FormulaValue): CellValue | undefined {
  if (isCellValueList(value)) {
    return value.length === 1 ? value[0] : undefined;
  }

  return value;
}

function isCellValueList(value: FormulaValue): value is CellValue[] {
  return Array.isArray(value) && !(
    value.length > 0
    && typeof value[0] === "object"
    && value[0] !== null
    && !Array.isArray(value[0])
    && "text" in value[0]
  );
}

function toNumber(value: CellValue | undefined, dateSystem: ExcelDateSystem = "1900"): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (isErrorValue(value)) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value instanceof Date) {
    return dateToSerial(value, dateSystem);
  }
  const text = stringifyRichText(value);
  if (text !== undefined) {
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toBoolean(value: CellValue | undefined): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (isErrorValue(value)) {
    return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (value instanceof Date) {
    return true;
  }
  const text = stringifyRichText(value);
  if (text !== undefined) {
    return text.length > 0;
  }
  return false;
}

function compareScalars(left: CellValue | undefined, right: CellValue | undefined, dateSystem: ExcelDateSystem = "1900"): number | undefined {
  const leftNumber = toNumber(left, dateSystem);
  const rightNumber = toNumber(right, dateSystem);
  if (leftNumber !== undefined && rightNumber !== undefined) {
    return leftNumber === rightNumber ? 0 : (leftNumber < rightNumber ? -1 : 1);
  }

  const leftText = stringifyRichText(left as CellValue) ?? (left === undefined || left === null ? "" : String(left));
  const rightText = stringifyRichText(right as CellValue) ?? (right === undefined || right === null ? "" : String(right));
  return leftText === rightText ? 0 : (leftText < rightText ? -1 : 1);
}

function unquoteSheetName(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

function splitReference(reference: string): { sheetName?: string; range: string } {
  const separatorIndex = reference.lastIndexOf("!");
  if (separatorIndex === -1) {
    return { range: reference };
  }

  return {
    sheetName: unquoteSheetName(reference.slice(0, separatorIndex)),
    range: reference.slice(separatorIndex + 1),
  };
}

function resolveFormulaInput(cell: SpreadsheetCell): { expression: string; cachedValue?: CellValue; arrayRange?: string; dynamic?: boolean } | null {
  if (!cell.formula) {
    return null;
  }

  if (typeof cell.formula === "string") {
    return {
      expression: normalizeFormulaExpression(cell.formula),
      cachedValue: cell.value,
    };
  }

  const formula = cell.formula as SpreadsheetCellFormula;
  return {
    expression: normalizeFormulaExpression(formula.expression),
    cachedValue: formula.cachedValue ?? cell.value,
    arrayRange: formula.arrayRange,
    dynamic: formula.dynamic,
  };
}

function formatText(value: number, format: string, dateSystem: ExcelDateSystem = "1900"): string | undefined {
  const lowerFormat = format.toLowerCase();

  // Date formats
  if (lowerFormat.includes("y") || lowerFormat.includes("d") || (lowerFormat.includes("m") && !lowerFormat.includes("#"))) {
    const date = serialToDate(value, dateSystem);
    const yyyy = String(date.getUTCFullYear());
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mi = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");

    if (lowerFormat === "yyyy-mm-dd") return `${yyyy}-${mm}-${dd}`;
    if (lowerFormat === "mm/dd/yyyy") return `${mm}/${dd}/${yyyy}`;
    if (lowerFormat === "hh:mm:ss") return `${hh}:${mi}:${ss}`;
    // Unsupported date format
    return undefined;
  }

  // Percentage formats
  if (format.includes("%")) {
    const pctValue = value * 100;
    if (format === "0%") return `${Math.round(pctValue)}%`;
    if (format === "0.00%") return `${pctValue.toFixed(2)}%`;
    return undefined;
  }

  // Numeric formats
  if (format === "0") return String(Math.round(value));
  if (format === "0.00") return value.toFixed(2);
  if (format === "#,##0") {
    return Math.round(value).toLocaleString("en-US", { useGrouping: true, maximumFractionDigits: 0 });
  }
  if (format === "#,##0.00") {
    return value.toLocaleString("en-US", { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return undefined;
}

class FormulaParser {
  private position = 0;

  constructor(private readonly source: string) {}

  parse(): FormulaNode {
    const expression = this.parseComparison();
    this.skipWhitespace();
    if (this.position !== this.source.length) {
      throw new Error(`Unexpected formula token at position ${this.position}`);
    }
    return expression;
  }

  private parseComparison(): FormulaNode {
    let left = this.parseAdditive();

    while (true) {
      this.skipWhitespace();
      const operator = this.consumeOperator(["<>", "<=", ">=", "=", "<", ">"]);
      if (!operator) {
        return left;
      }
      const right = this.parseAdditive();
      left = { type: "binary", operator, left, right };
    }
  }

  private parseAdditive(): FormulaNode {
    let left = this.parseMultiplicative();

    while (true) {
      this.skipWhitespace();
      const operator = this.consumeOperator(["+", "-"]);
      if (!operator) {
        return left;
      }
      const right = this.parseMultiplicative();
      left = { type: "binary", operator, left, right };
    }
  }

  private parseMultiplicative(): FormulaNode {
    let left = this.parseUnary();

    while (true) {
      this.skipWhitespace();
      const operator = this.consumeOperator(["*", "/"]);
      if (!operator) {
        return left;
      }
      const right = this.parseUnary();
      left = { type: "binary", operator, left, right };
    }
  }

  private parseUnary(): FormulaNode {
    this.skipWhitespace();
    const operator = this.consumeOperator(["+", "-"]);
    if (operator) {
      return {
        type: "unary",
        operator,
        operand: this.parseUnary(),
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaNode {
    this.skipWhitespace();
    const current = this.peek();

    if (current === "(") {
      this.position += 1;
      const expression = this.parseComparison();
      this.skipWhitespace();
      this.expect(")");
      return expression;
    }

    if (current === "\"") {
      return { type: "string", value: this.parseStringLiteral() };
    }

    const number = this.parseNumberLiteral();
    if (number !== null) {
      return { type: "number", value: number };
    }

    const reference = this.parseReferenceLiteral();
    if (reference) {
      return { type: "reference", value: reference };
    }

    const identifier = this.parseIdentifier();
    if (identifier) {
      const upper = identifier.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        return { type: "boolean", value: upper === "TRUE" };
      }

      this.skipWhitespace();
      if (this.peek() === "(") {
        this.position += 1;
        const args: FormulaNode[] = [];
        this.skipWhitespace();
        if (this.peek() !== ")") {
          while (true) {
            args.push(this.parseComparison());
            this.skipWhitespace();
            if (this.peek() === ",") {
              this.position += 1;
              continue;
            }
            break;
          }
        }
        this.expect(")");
        return { type: "function", name: upper, args };
      }

      return { type: "namedRange", name: identifier };
    }

    throw new Error(`Unable to parse formula near "${this.source.slice(this.position)}"`);
  }

  private parseStringLiteral(): string {
    this.expect("\"");
    let value = "";
    while (this.position < this.source.length) {
      const current = this.source[this.position];
      if (current === "\"") {
        if (this.source[this.position + 1] === "\"") {
          value += "\"";
          this.position += 2;
          continue;
        }
        this.position += 1;
        return value;
      }

      value += current;
      this.position += 1;
    }

    throw new Error("Unterminated string literal");
  }

  private parseNumberLiteral(): number | null {
    const remaining = this.source.slice(this.position);
    const match = /^\d+(?:\.\d+)?/.exec(remaining) ?? /^\.\d+/.exec(remaining);
    if (!match) {
      return null;
    }

    this.position += match[0].length;
    return Number(match[0]);
  }

  private parseReferenceLiteral(): string | null {
    const remaining = this.source.slice(this.position);
    const match = SHEET_REFERENCE_PATTERN.exec(remaining) ?? CELL_REFERENCE_PATTERN.exec(remaining);
    if (!match) {
      return null;
    }

    this.position += match[0].length;
    return match[0];
  }

  private parseIdentifier(): string | null {
    const remaining = this.source.slice(this.position);
    const match = IDENTIFIER_PATTERN.exec(remaining);
    if (!match) {
      return null;
    }

    this.position += match[0].length;
    return match[0];
  }

  private consumeOperator<T extends string>(operators: T[]): T | null {
    for (const operator of operators) {
      if (this.source.startsWith(operator, this.position)) {
        this.position += operator.length;
        return operator;
      }
    }

    return null;
  }

  private expect(expected: string): void {
    if (!this.source.startsWith(expected, this.position)) {
      throw new Error(`Expected "${expected}" at position ${this.position}`);
    }
    this.position += expected.length;
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length && /\s/.test(this.source[this.position] ?? "")) {
      this.position += 1;
    }
  }

  private peek(): string | undefined {
    return this.source[this.position];
  }
}

export class FormulaEvaluator {
  private readonly cache = new Map<string, CellValue | undefined>();
  private readonly active = new Set<string>();

  constructor(
    private readonly document: SpreadsheetDocument,
    private readonly dateSystem: ExcelDateSystem = "1900",
  ) {}

  evaluateCell(cell: SpreadsheetCell, currentSheetName: string, currentCellRef: string): CellValue | undefined {
    const formula = resolveFormulaInput(cell);
    if (!formula) {
      return cell.value;
    }

    if (formula.cachedValue !== undefined) {
      return formula.cachedValue;
    }

    const cacheKey = `${currentSheetName}!${currentCellRef}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    if (this.active.has(cacheKey)) {
      return undefined;
    }

    this.active.add(cacheKey);
    const result = this.evaluateExpression(formula.expression, currentSheetName);
    this.active.delete(cacheKey);
    this.cache.set(cacheKey, result);
    return result;
  }

  getFormulaDefinition(cell: SpreadsheetCell): { expression: string; cachedValue?: CellValue; arrayRange?: string; dynamic?: boolean } | null {
    return resolveFormulaInput(cell);
  }

  private evaluateExpression(expression: string, currentSheetName: string): CellValue | undefined {
    try {
      const parser = new FormulaParser(expression);
      const ast = parser.parse();
      return toScalar(this.evaluateNode(ast, currentSheetName));
    } catch {
      return undefined;
    }
  }

  private evaluateNode(node: FormulaNode, currentSheetName: string): FormulaValue {
    switch (node.type) {
      case "number":
      case "string":
      case "boolean":
        return node.value;
      case "reference":
        return this.resolveReference(node.value, currentSheetName);
      case "namedRange":
        return this.resolveNamedRange(node.name, currentSheetName);
      case "unary": {
        const value = toNumber(toScalar(this.evaluateNode(node.operand, currentSheetName)), this.dateSystem);
        if (value === undefined) {
          return undefined;
        }
        return node.operator === "-" ? -value : value;
      }
      case "binary":
        return this.evaluateBinary(node, currentSheetName);
      case "function":
        return this.evaluateFunction(node, currentSheetName);
      default:
        return undefined;
    }
  }

  private evaluateBinary(node: Extract<FormulaNode, { type: "binary" }>, currentSheetName: string): FormulaValue {
    const left = toScalar(this.evaluateNode(node.left, currentSheetName));
    const right = toScalar(this.evaluateNode(node.right, currentSheetName));

    switch (node.operator) {
      case "+":
      case "-":
      case "*":
      case "/": {
        const leftNumber = toNumber(left, this.dateSystem);
        const rightNumber = toNumber(right, this.dateSystem);
        if (leftNumber === undefined || rightNumber === undefined) {
          return undefined;
        }
        if (node.operator === "+") return leftNumber + rightNumber;
        if (node.operator === "-") return leftNumber - rightNumber;
        if (node.operator === "*") return leftNumber * rightNumber;
        return rightNumber === 0 ? undefined : leftNumber / rightNumber;
      }
      case "=":
      case "<>":
      case "<":
      case "<=":
      case ">":
      case ">=": {
        const comparison = compareScalars(left, right, this.dateSystem);
        if (comparison === undefined) {
          return undefined;
        }
        if (node.operator === "=") return comparison === 0;
        if (node.operator === "<>") return comparison !== 0;
        if (node.operator === "<") return comparison < 0;
        if (node.operator === "<=") return comparison <= 0;
        if (node.operator === ">") return comparison > 0;
        return comparison >= 0;
      }
      default:
        return undefined;
    }
  }

  private evaluateFunction(node: Extract<FormulaNode, { type: "function" }>, currentSheetName: string): FormulaValue {
    const args = node.args.map((arg) => this.evaluateNode(arg, currentSheetName));
    const values = args.flatMap((arg) => flattenFormulaValue(arg));

    switch (node.name) {
      case "SUM": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value): value is number => value !== undefined);
        return numbers.reduce((sum, value) => sum + value, 0);
      }
      case "AVERAGE": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value): value is number => value !== undefined);
        if (numbers.length === 0) {
          return undefined;
        }
        return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      }
      case "COUNT":
        return values.filter((value) => toNumber(value, this.dateSystem) !== undefined).length;
      case "COUNTA":
        return values.filter((value) => !isBlankValue(value)).length;
      case "COUNTBLANK":
        return values.filter((value) => isBlankValue(value)).length;
      case "MIN": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value): value is number => value !== undefined);
        return numbers.length > 0 ? Math.min(...numbers) : undefined;
      }
      case "MAX": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value): value is number => value !== undefined);
        return numbers.length > 0 ? Math.max(...numbers) : undefined;
      }
      case "ROUND": {
        const value = toNumber(toScalar(args[0]), this.dateSystem);
        const digits = toNumber(toScalar(args[1]), this.dateSystem);
        if (value === undefined || digits === undefined) {
          return undefined;
        }
        const factor = 10 ** digits;
        return Math.round(value * factor) / factor;
      }
      case "ABS": {
        const value = toNumber(toScalar(args[0]), this.dateSystem);
        return value === undefined ? undefined : Math.abs(value);
      }
      case "IF":
        if (args.length < 2) {
          return undefined;
        }
        return toBoolean(toScalar(args[0])) ? toScalar(args[1]) : toScalar(args[2]);
      case "AND":
        return args.every((arg) => toBoolean(toScalar(arg)));
      case "OR":
        return args.some((arg) => toBoolean(toScalar(arg)));
      case "NOT":
        return !toBoolean(toScalar(args[0]));
      case "LEN": {
        const value = toScalar(args[0]);
        const text = stringifyRichText(value as CellValue) ?? (value === undefined || value === null ? "" : String(value));
        return text.length;
      }
      case "VLOOKUP": {
        const lookupValue = toScalar(args[0]);
        if (lookupValue === undefined) return undefined;
        // The second arg must be a reference node — resolve as 2D grid
        const tableArg = node.args[1];
        if (!tableArg || tableArg.type !== "reference") return undefined;
        const grid = this.resolveReferenceGrid(tableArg.value, currentSheetName);
        if (!grid) return undefined;
        const colIndex = toNumber(toScalar(args[2]), this.dateSystem);
        if (colIndex === undefined || colIndex < 1 || colIndex > grid.cols) return undefined;
        const rangeLookup = args[3] !== undefined ? toBoolean(toScalar(args[3])) : true;

        if (rangeLookup) {
          // Approximate match: find largest value in first column <= lookupValue
          let bestRow = -1;
          for (let r = 0; r < grid.rows; r++) {
            const cellVal = grid.values[r]?.[0];
            const cmp = compareScalars(cellVal, lookupValue, this.dateSystem);
            if (cmp !== undefined && cmp <= 0) {
              bestRow = r;
            }
          }
          if (bestRow === -1) return undefined;
          return grid.values[bestRow]?.[colIndex - 1] ?? undefined;
        }
        // Exact match
        for (let r = 0; r < grid.rows; r++) {
          const cellVal = grid.values[r]?.[0];
          const cmp = compareScalars(cellVal, lookupValue, this.dateSystem);
          if (cmp === 0) {
            return grid.values[r]?.[colIndex - 1] ?? undefined;
          }
        }
        return undefined;
      }
      case "TEXT": {
        const rawValue = toNumber(toScalar(args[0]), this.dateSystem);
        const formatCode = stringifyRichText(toScalar(args[1]) as CellValue) ?? (typeof toScalar(args[1]) === "string" ? toScalar(args[1]) as string : undefined);
        if (rawValue === undefined || formatCode === undefined) return undefined;
        return formatText(rawValue, formatCode, this.dateSystem);
      }
      case "CONCATENATE":
      case "CONCAT": {
        return values.map((v) => {
          if (v === undefined || v === null) return "";
          if (typeof v === "string") return v;
          if (typeof v === "number") return String(v);
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          const text = stringifyRichText(v);
          return text ?? String(v);
        }).join("");
      }
      case "DATE": {
        const year = toNumber(toScalar(args[0]), this.dateSystem);
        const month = toNumber(toScalar(args[1]), this.dateSystem);
        const day = toNumber(toScalar(args[2]), this.dateSystem);
        if (year === undefined || month === undefined || day === undefined) return undefined;
        const date = new Date(Date.UTC(year, month - 1, day));
        return dateToSerial(date, this.dateSystem);
      }
      case "YEAR": {
        const serial = toNumber(toScalar(args[0]), this.dateSystem);
        if (serial === undefined) return undefined;
        return serialToDate(serial, this.dateSystem).getUTCFullYear();
      }
      case "MONTH": {
        const serial = toNumber(toScalar(args[0]), this.dateSystem);
        if (serial === undefined) return undefined;
        return serialToDate(serial, this.dateSystem).getUTCMonth() + 1;
      }
      case "DAY": {
        const serial = toNumber(toScalar(args[0]), this.dateSystem);
        if (serial === undefined) return undefined;
        return serialToDate(serial, this.dateSystem).getUTCDate();
      }
      case "TRIM": {
        const value = toScalar(args[0]);
        const text = stringifyRichText(value as CellValue) ?? (value === undefined || value === null ? "" : String(value));
        return text.trim().replace(/\s+/g, " ");
      }
      default:
        return undefined;
    }
  }

  private resolveNamedRange(name: string, currentSheetName: string): FormulaValue {
    const normalized = name.toLowerCase();
    const localMatch = this.document.namedRanges?.find((namedRange) => (
      namedRange.name.toLowerCase() === normalized
      && namedRange.scope?.toLowerCase() === currentSheetName.toLowerCase()
    ));
    const workbookMatch = this.document.namedRanges?.find((namedRange) => (
      namedRange.name.toLowerCase() === normalized
      && namedRange.scope === undefined
    ));
    const match = localMatch ?? workbookMatch;
    if (!match) {
      return undefined;
    }

    return this.resolveReference(match.ref, currentSheetName);
  }

  private resolveReference(reference: string, currentSheetName: string): FormulaValue {
    const { sheetName, range } = splitReference(reference);
    const targetSheetName = sheetName ?? currentSheetName;
    const targetSheet = this.document.sheets.find((sheet) => sheet.name === targetSheetName);
    if (!targetSheet) {
      return undefined;
    }

    const parsed = parseRangeRef(range);
    if (parsed.startRow === parsed.endRow && parsed.startCol === parsed.endCol) {
      return this.getCellValue(targetSheetName, parsed.startRow, parsed.startCol);
    }

    const values: CellValue[] = [];
    for (let row = parsed.startRow; row <= parsed.endRow; row += 1) {
      for (let col = parsed.startCol; col <= parsed.endCol; col += 1) {
        const value = this.getCellValue(targetSheetName, row, col);
        if (value !== undefined) {
          values.push(value);
        } else {
          values.push(null);
        }
      }
    }
    return values;
  }

  private resolveReferenceGrid(reference: string, currentSheetName: string): { rows: number; cols: number; values: (CellValue | undefined)[][] } | undefined {
    const { sheetName, range } = splitReference(reference);
    const targetSheetName = sheetName ?? currentSheetName;
    const targetSheet = this.document.sheets.find((sheet) => sheet.name === targetSheetName);
    if (!targetSheet) return undefined;

    const parsed = parseRangeRef(range);
    const numRows = parsed.endRow - parsed.startRow + 1;
    const numCols = parsed.endCol - parsed.startCol + 1;
    const values: (CellValue | undefined)[][] = [];

    for (let r = parsed.startRow; r <= parsed.endRow; r++) {
      const row: (CellValue | undefined)[] = [];
      for (let c = parsed.startCol; c <= parsed.endCol; c++) {
        row.push(this.getCellValue(targetSheetName, r, c));
      }
      values.push(row);
    }

    return { rows: numRows, cols: numCols, values };
  }

  private getCellValue(sheetName: string, row: number, col: number): CellValue | undefined {
    const sheet = this.document.sheets.find((candidate) => candidate.name === sheetName);
    const cell = sheet?.rows[row]?.cells[col];
    if (!cell) {
      return undefined;
    }

    return this.evaluateCell(cell, sheetName, cellRef(row, col));
  }
}
