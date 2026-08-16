import {
  DETERMINISTIC_ZIP_DATE,
  SpreadsheetTemplateAssemblyError,
  SpreadsheetTemplateParseError,
  SpreadsheetValidationError,
  XML_DECLARATION,
  absRangeRef,
  assembleXlsxStreamable,
  assembleXlsxWithMetadata,
  cellRef,
  colIndexToLetter,
  compileSheetStructure,
  dateToSerial,
  dateToSerialString,
  escapeXml,
  formatNumberForCell,
  isDeterministicModeEnabled,
  needsXmlSpacePreserve,
  normalizeFill,
  normalizeFont,
  normalizeHyperlink,
  parseCellRef,
  parseRangeRef,
  quoteSheetName,
  rangeRef,
  resolveCellStyle,
  resolveNumberFormatAlias,
  resolveStyleInput,
  sanitizeSharedString,
  serialToDate,
  setDeterministicMode,
  toW3CDateTime,
  validateSpreadsheetDocument
} from "./chunk-YMTIFCEA.js";

// src/types/spreadsheet-ast.ts
var FREE_XLSX_CHART_TYPES = ["bar", "col", "line", "pie", "scatter"];
function isRichTextValue(value) {
  return Array.isArray(value);
}
function isErrorValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "error" in value;
}

// src/formulas/evaluator.ts
var SHEET_REFERENCE_PATTERN = /^(?:'[^']*(?:''[^']*)*'|[A-Za-z_\\][A-Za-z0-9_.\\]*)!\$?[A-Z]+\$?[1-9]\d*(?::\$?[A-Z]+\$?[1-9]\d*)?/;
var CELL_REFERENCE_PATTERN = /^\$?[A-Z]+\$?[1-9]\d*(?::\$?[A-Z]+\$?[1-9]\d*)?/;
var IDENTIFIER_PATTERN = /^[A-Za-z_\\][A-Za-z0-9_.\\]*/;
function normalizeFormulaExpression(expression) {
  return expression.startsWith("=") ? expression.slice(1) : expression;
}
function stringifyRichText(value) {
  if (isErrorValue(value)) {
    return void 0;
  }
  if (!Array.isArray(value)) {
    return typeof value === "string" ? value : void 0;
  }
  return value.map((run) => run.text).join("");
}
function isBlankValue(value) {
  return value === void 0 || value === null || value === "";
}
function flattenFormulaValue(value) {
  if (value === void 0) {
    return [];
  }
  return isCellValueList(value) ? value : [value];
}
function toScalar(value) {
  if (isCellValueList(value)) {
    return value.length === 1 ? value[0] : void 0;
  }
  return value;
}
function isCellValueList(value) {
  return Array.isArray(value) && !(value.length > 0 && typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0]) && "text" in value[0]);
}
function toNumber(value, dateSystem = "1900") {
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : void 0;
  }
  if (isErrorValue(value)) {
    return void 0;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value instanceof Date) {
    return dateToSerial(value, dateSystem);
  }
  const text = stringifyRichText(value);
  if (text !== void 0) {
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function toBoolean(value) {
  if (value === void 0 || value === null) {
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
  if (text !== void 0) {
    return text.length > 0;
  }
  return false;
}
function compareScalars(left, right, dateSystem = "1900") {
  const leftNumber = toNumber(left, dateSystem);
  const rightNumber = toNumber(right, dateSystem);
  if (leftNumber !== void 0 && rightNumber !== void 0) {
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }
  const leftText = stringifyRichText(left) ?? (left === void 0 || left === null ? "" : String(left));
  const rightText = stringifyRichText(right) ?? (right === void 0 || right === null ? "" : String(right));
  return leftText === rightText ? 0 : leftText < rightText ? -1 : 1;
}
function unquoteSheetName(value) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}
function splitReference(reference) {
  const separatorIndex = reference.lastIndexOf("!");
  if (separatorIndex === -1) {
    return { range: reference };
  }
  return {
    sheetName: unquoteSheetName(reference.slice(0, separatorIndex)),
    range: reference.slice(separatorIndex + 1)
  };
}
function resolveFormulaInput(cell) {
  if (!cell.formula) {
    return null;
  }
  if (typeof cell.formula === "string") {
    return {
      expression: normalizeFormulaExpression(cell.formula),
      cachedValue: cell.value
    };
  }
  const formula = cell.formula;
  return {
    expression: normalizeFormulaExpression(formula.expression),
    cachedValue: formula.cachedValue ?? cell.value,
    arrayRange: formula.arrayRange,
    dynamic: formula.dynamic
  };
}
function formatText(value, format, dateSystem = "1900") {
  const lowerFormat = format.toLowerCase();
  if (lowerFormat.includes("y") || lowerFormat.includes("d") || lowerFormat.includes("m") && !lowerFormat.includes("#")) {
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
    return void 0;
  }
  if (format.includes("%")) {
    const pctValue = value * 100;
    if (format === "0%") return `${Math.round(pctValue)}%`;
    if (format === "0.00%") return `${pctValue.toFixed(2)}%`;
    return void 0;
  }
  if (format === "0") return String(Math.round(value));
  if (format === "0.00") return value.toFixed(2);
  if (format === "#,##0") {
    return Math.round(value).toLocaleString("en-US", { useGrouping: true, maximumFractionDigits: 0 });
  }
  if (format === "#,##0.00") {
    return value.toLocaleString("en-US", { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return void 0;
}
var FormulaParser = class {
  constructor(source) {
    this.source = source;
  }
  position = 0;
  parse() {
    const expression = this.parseComparison();
    this.skipWhitespace();
    if (this.position !== this.source.length) {
      throw new Error(`Unexpected formula token at position ${this.position}`);
    }
    return expression;
  }
  parseComparison() {
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
  parseAdditive() {
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
  parseMultiplicative() {
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
  parseUnary() {
    this.skipWhitespace();
    const operator = this.consumeOperator(["+", "-"]);
    if (operator) {
      return {
        type: "unary",
        operator,
        operand: this.parseUnary()
      };
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    this.skipWhitespace();
    const current = this.peek();
    if (current === "(") {
      this.position += 1;
      const expression = this.parseComparison();
      this.skipWhitespace();
      this.expect(")");
      return expression;
    }
    if (current === '"') {
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
        const args = [];
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
  parseStringLiteral() {
    this.expect('"');
    let value = "";
    while (this.position < this.source.length) {
      const current = this.source[this.position];
      if (current === '"') {
        if (this.source[this.position + 1] === '"') {
          value += '"';
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
  parseNumberLiteral() {
    const remaining = this.source.slice(this.position);
    const match = /^\d+(?:\.\d+)?/.exec(remaining) ?? /^\.\d+/.exec(remaining);
    if (!match) {
      return null;
    }
    this.position += match[0].length;
    return Number(match[0]);
  }
  parseReferenceLiteral() {
    const remaining = this.source.slice(this.position);
    const match = SHEET_REFERENCE_PATTERN.exec(remaining) ?? CELL_REFERENCE_PATTERN.exec(remaining);
    if (!match) {
      return null;
    }
    this.position += match[0].length;
    return match[0];
  }
  parseIdentifier() {
    const remaining = this.source.slice(this.position);
    const match = IDENTIFIER_PATTERN.exec(remaining);
    if (!match) {
      return null;
    }
    this.position += match[0].length;
    return match[0];
  }
  consumeOperator(operators) {
    for (const operator of operators) {
      if (this.source.startsWith(operator, this.position)) {
        this.position += operator.length;
        return operator;
      }
    }
    return null;
  }
  expect(expected) {
    if (!this.source.startsWith(expected, this.position)) {
      throw new Error(`Expected "${expected}" at position ${this.position}`);
    }
    this.position += expected.length;
  }
  skipWhitespace() {
    while (this.position < this.source.length && /\s/.test(this.source[this.position] ?? "")) {
      this.position += 1;
    }
  }
  peek() {
    return this.source[this.position];
  }
};
var FormulaEvaluator = class {
  constructor(document, dateSystem = "1900") {
    this.document = document;
    this.dateSystem = dateSystem;
  }
  cache = /* @__PURE__ */ new Map();
  active = /* @__PURE__ */ new Set();
  evaluateCell(cell, currentSheetName, currentCellRef) {
    const formula = resolveFormulaInput(cell);
    if (!formula) {
      return cell.value;
    }
    if (formula.cachedValue !== void 0) {
      return formula.cachedValue;
    }
    const cacheKey = `${currentSheetName}!${currentCellRef}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    if (this.active.has(cacheKey)) {
      return void 0;
    }
    this.active.add(cacheKey);
    const result = this.evaluateExpression(formula.expression, currentSheetName);
    this.active.delete(cacheKey);
    this.cache.set(cacheKey, result);
    return result;
  }
  getFormulaDefinition(cell) {
    return resolveFormulaInput(cell);
  }
  evaluateExpression(expression, currentSheetName) {
    try {
      const parser = new FormulaParser(expression);
      const ast = parser.parse();
      return toScalar(this.evaluateNode(ast, currentSheetName));
    } catch {
      return void 0;
    }
  }
  evaluateNode(node, currentSheetName) {
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
        if (value === void 0) {
          return void 0;
        }
        return node.operator === "-" ? -value : value;
      }
      case "binary":
        return this.evaluateBinary(node, currentSheetName);
      case "function":
        return this.evaluateFunction(node, currentSheetName);
      default:
        return void 0;
    }
  }
  evaluateBinary(node, currentSheetName) {
    const left = toScalar(this.evaluateNode(node.left, currentSheetName));
    const right = toScalar(this.evaluateNode(node.right, currentSheetName));
    switch (node.operator) {
      case "+":
      case "-":
      case "*":
      case "/": {
        const leftNumber = toNumber(left, this.dateSystem);
        const rightNumber = toNumber(right, this.dateSystem);
        if (leftNumber === void 0 || rightNumber === void 0) {
          return void 0;
        }
        if (node.operator === "+") return leftNumber + rightNumber;
        if (node.operator === "-") return leftNumber - rightNumber;
        if (node.operator === "*") return leftNumber * rightNumber;
        return rightNumber === 0 ? void 0 : leftNumber / rightNumber;
      }
      case "=":
      case "<>":
      case "<":
      case "<=":
      case ">":
      case ">=": {
        const comparison = compareScalars(left, right, this.dateSystem);
        if (comparison === void 0) {
          return void 0;
        }
        if (node.operator === "=") return comparison === 0;
        if (node.operator === "<>") return comparison !== 0;
        if (node.operator === "<") return comparison < 0;
        if (node.operator === "<=") return comparison <= 0;
        if (node.operator === ">") return comparison > 0;
        return comparison >= 0;
      }
      default:
        return void 0;
    }
  }
  evaluateFunction(node, currentSheetName) {
    const args = node.args.map((arg) => this.evaluateNode(arg, currentSheetName));
    const values = args.flatMap((arg) => flattenFormulaValue(arg));
    switch (node.name) {
      case "SUM": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value) => value !== void 0);
        return numbers.reduce((sum, value) => sum + value, 0);
      }
      case "AVERAGE": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value) => value !== void 0);
        if (numbers.length === 0) {
          return void 0;
        }
        return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      }
      case "COUNT":
        return values.filter((value) => toNumber(value, this.dateSystem) !== void 0).length;
      case "COUNTA":
        return values.filter((value) => !isBlankValue(value)).length;
      case "COUNTBLANK":
        return values.filter((value) => isBlankValue(value)).length;
      case "MIN": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value) => value !== void 0);
        return numbers.length > 0 ? Math.min(...numbers) : void 0;
      }
      case "MAX": {
        const numbers = values.map((value) => toNumber(value, this.dateSystem)).filter((value) => value !== void 0);
        return numbers.length > 0 ? Math.max(...numbers) : void 0;
      }
      case "ROUND": {
        const value = toNumber(toScalar(args[0]), this.dateSystem);
        const digits = toNumber(toScalar(args[1]), this.dateSystem);
        if (value === void 0 || digits === void 0) {
          return void 0;
        }
        const factor = 10 ** digits;
        return Math.round(value * factor) / factor;
      }
      case "ABS": {
        const value = toNumber(toScalar(args[0]), this.dateSystem);
        return value === void 0 ? void 0 : Math.abs(value);
      }
      case "IF":
        if (args.length < 2) {
          return void 0;
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
        const text = stringifyRichText(value) ?? (value === void 0 || value === null ? "" : String(value));
        return text.length;
      }
      case "VLOOKUP": {
        const lookupValue = toScalar(args[0]);
        if (lookupValue === void 0) return void 0;
        const tableArg = node.args[1];
        if (!tableArg || tableArg.type !== "reference") return void 0;
        const grid = this.resolveReferenceGrid(tableArg.value, currentSheetName);
        if (!grid) return void 0;
        const colIndex = toNumber(toScalar(args[2]), this.dateSystem);
        if (colIndex === void 0 || colIndex < 1 || colIndex > grid.cols) return void 0;
        const rangeLookup = args[3] !== void 0 ? toBoolean(toScalar(args[3])) : true;
        if (rangeLookup) {
          let bestRow = -1;
          for (let r = 0; r < grid.rows; r++) {
            const cellVal = grid.values[r]?.[0];
            const cmp = compareScalars(cellVal, lookupValue, this.dateSystem);
            if (cmp !== void 0 && cmp <= 0) {
              bestRow = r;
            }
          }
          if (bestRow === -1) return void 0;
          return grid.values[bestRow]?.[colIndex - 1] ?? void 0;
        }
        for (let r = 0; r < grid.rows; r++) {
          const cellVal = grid.values[r]?.[0];
          const cmp = compareScalars(cellVal, lookupValue, this.dateSystem);
          if (cmp === 0) {
            return grid.values[r]?.[colIndex - 1] ?? void 0;
          }
        }
        return void 0;
      }
      case "TEXT": {
        const rawValue = toNumber(toScalar(args[0]), this.dateSystem);
        const formatCode = stringifyRichText(toScalar(args[1])) ?? (typeof toScalar(args[1]) === "string" ? toScalar(args[1]) : void 0);
        if (rawValue === void 0 || formatCode === void 0) return void 0;
        return formatText(rawValue, formatCode, this.dateSystem);
      }
      case "CONCATENATE":
      case "CONCAT": {
        return values.map((v) => {
          if (v === void 0 || v === null) return "";
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
        if (year === void 0 || month === void 0 || day === void 0) return void 0;
        const date = new Date(Date.UTC(year, month - 1, day));
        return dateToSerial(date, this.dateSystem);
      }
      case "YEAR": {
        const serial = toNumber(toScalar(args[0]), this.dateSystem);
        if (serial === void 0) return void 0;
        return serialToDate(serial, this.dateSystem).getUTCFullYear();
      }
      case "MONTH": {
        const serial = toNumber(toScalar(args[0]), this.dateSystem);
        if (serial === void 0) return void 0;
        return serialToDate(serial, this.dateSystem).getUTCMonth() + 1;
      }
      case "DAY": {
        const serial = toNumber(toScalar(args[0]), this.dateSystem);
        if (serial === void 0) return void 0;
        return serialToDate(serial, this.dateSystem).getUTCDate();
      }
      case "TRIM": {
        const value = toScalar(args[0]);
        const text = stringifyRichText(value) ?? (value === void 0 || value === null ? "" : String(value));
        return text.trim().replace(/\s+/g, " ");
      }
      default:
        return void 0;
    }
  }
  resolveNamedRange(name, currentSheetName) {
    const normalized = name.toLowerCase();
    const localMatch = this.document.namedRanges?.find((namedRange) => namedRange.name.toLowerCase() === normalized && namedRange.scope?.toLowerCase() === currentSheetName.toLowerCase());
    const workbookMatch = this.document.namedRanges?.find((namedRange) => namedRange.name.toLowerCase() === normalized && namedRange.scope === void 0);
    const match = localMatch ?? workbookMatch;
    if (!match) {
      return void 0;
    }
    return this.resolveReference(match.ref, currentSheetName);
  }
  resolveReference(reference, currentSheetName) {
    const { sheetName, range } = splitReference(reference);
    const targetSheetName = sheetName ?? currentSheetName;
    const targetSheet = this.document.sheets.find((sheet) => sheet.name === targetSheetName);
    if (!targetSheet) {
      return void 0;
    }
    const parsed = parseRangeRef(range);
    if (parsed.startRow === parsed.endRow && parsed.startCol === parsed.endCol) {
      return this.getCellValue(targetSheetName, parsed.startRow, parsed.startCol);
    }
    const values = [];
    for (let row = parsed.startRow; row <= parsed.endRow; row += 1) {
      for (let col = parsed.startCol; col <= parsed.endCol; col += 1) {
        const value = this.getCellValue(targetSheetName, row, col);
        if (value !== void 0) {
          values.push(value);
        } else {
          values.push(null);
        }
      }
    }
    return values;
  }
  resolveReferenceGrid(reference, currentSheetName) {
    const { sheetName, range } = splitReference(reference);
    const targetSheetName = sheetName ?? currentSheetName;
    const targetSheet = this.document.sheets.find((sheet) => sheet.name === targetSheetName);
    if (!targetSheet) return void 0;
    const parsed = parseRangeRef(range);
    const numRows = parsed.endRow - parsed.startRow + 1;
    const numCols = parsed.endCol - parsed.startCol + 1;
    const values = [];
    for (let r = parsed.startRow; r <= parsed.endRow; r++) {
      const row = [];
      for (let c = parsed.startCol; c <= parsed.endCol; c++) {
        row.push(this.getCellValue(targetSheetName, r, c));
      }
      values.push(row);
    }
    return { rows: numRows, cols: numCols, values };
  }
  getCellValue(sheetName, row, col) {
    const sheet = this.document.sheets.find((candidate) => candidate.name === sheetName);
    const cell = sheet?.rows[row]?.cells[col];
    if (!cell) {
      return void 0;
    }
    return this.evaluateCell(cell, sheetName, cellRef(row, col));
  }
};

// src/styles/component-registry.ts
function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, stableNormalize(entry)]));
  }
  return value;
}
function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}
var ComponentRegistry = class {
  constructor(seedEntries = [], keyFn = stableStringify) {
    this.keyFn = keyFn;
    for (const entry of seedEntries) {
      this.register(entry);
    }
  }
  entries = [];
  keyMap = /* @__PURE__ */ new Map();
  refMap = /* @__PURE__ */ new WeakMap();
  register(entry) {
    if (entry && typeof entry === "object") {
      const cached = this.refMap.get(entry);
      if (cached !== void 0) {
        return cached;
      }
    }
    const key = this.keyFn(entry);
    const existing = this.keyMap.get(key);
    if (existing !== void 0) {
      if (entry && typeof entry === "object") {
        this.refMap.set(entry, existing);
      }
      return existing;
    }
    const index = this.entries.length;
    this.entries.push(entry);
    this.keyMap.set(key, index);
    if (entry && typeof entry === "object") {
      this.refMap.set(entry, index);
    }
    return index;
  }
  get size() {
    return this.entries.length;
  }
  get values() {
    return this.entries;
  }
};

// src/preflight.ts
function estimateCellXmlBytes(value) {
  if (value === void 0 || value === null) {
    return 16;
  }
  if (isRichTextValue(value)) {
    return 32 + value.reduce((sum, run) => sum + run.text.length, 0);
  }
  if (isErrorValue(value)) {
    return 24 + value.error.length;
  }
  if (typeof value === "string") {
    return 28 + value.length;
  }
  if (typeof value === "boolean") {
    return 22;
  }
  if (value instanceof Date) {
    return 26;
  }
  return 24;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function estimateSharedStringsXmlBytes(uniqueStringCount, uniqueStringCharBytes) {
  if (uniqueStringCount === 0) {
    return 0;
  }
  return 64 + uniqueStringCharBytes + uniqueStringCount * 16;
}
function estimateStylesXmlBytes(estimatedStyleCount) {
  if (estimatedStyleCount <= 1) {
    return 1e3;
  }
  return 1e3 + estimatedStyleCount * 280;
}
function estimateWorksheetXmlBytes(baseCellXmlBytes, totalRows, styledCellCount, rowsWithWrappedText) {
  return Math.round(baseCellXmlBytes * 0.9) + totalRows * 10 + styledCellCount * 6 + rowsWithWrappedText * 35;
}
function estimateCompressedWorkbookBytes(options) {
  const styledCellRatio = options.totalCells === 0 ? 0 : options.styledCellCount / options.totalCells;
  const wrappedRowRatio = options.totalRows === 0 ? 0 : options.rowsWithWrappedText / options.totalRows;
  const worksheetCompressionRatio = clamp(
    0.075 + styledCellRatio * 0.015 + wrappedRowRatio * 0.01 + (options.recommendedStringStrategy === "inlineStrings" ? 0.015 : 0) - (options.repeatedStringRatio >= 3 ? 5e-3 : 0),
    0.07,
    0.14
  );
  const sharedStringsCompressionRatio = clamp(
    0.18 - Math.max(0, Math.min(0.06, (options.repeatedStringRatio - 1) * 0.015)),
    0.1,
    0.18
  );
  const stylesCompressionRatio = clamp(
    0.24 + Math.min(0.03, styledCellRatio * 0.03) + Math.min(0.04, options.estimatedStyleCount / 5e3 * 0.04),
    0.24,
    0.34
  );
  const projectedSmallPartBytes = 4500 + options.sheetCount * 500;
  return Math.round(
    projectedSmallPartBytes + options.projectedWorksheetXmlBytes * worksheetCompressionRatio + options.projectedSharedStringsXmlBytes * sharedStringsCompressionRatio + options.projectedStylesXmlBytes * stylesCompressionRatio
  );
}
function collectStringValue(value) {
  if (value === void 0 || value === null || isErrorValue(value)) {
    return null;
  }
  if (isRichTextValue(value)) {
    return value.map((run) => run.text).join("");
  }
  return typeof value === "string" ? value : null;
}
function collectStyleKey(prefix, style, styleKeyCache) {
  if (style === void 0) {
    return void 0;
  }
  if (typeof style === "string") {
    return `${prefix}:${style}`;
  }
  if (typeof style !== "object" || style === null) {
    return `${prefix}:${String(style)}`;
  }
  const cached = styleKeyCache.get(style);
  if (cached !== void 0) {
    return `${prefix}:${cached}`;
  }
  const serialized = stableStringify(style);
  styleKeyCache.set(style, serialized);
  return `${prefix}:${serialized}`;
}
function styleUsesWrapText(style, wrapTextCache) {
  if (style === void 0) {
    return false;
  }
  if (typeof style === "string") {
    return resolveStyleInput(style)?.alignment?.wrapText === true;
  }
  if (typeof style !== "object" || style === null) {
    return false;
  }
  const cached = wrapTextCache.get(style);
  if (cached !== void 0) {
    return cached;
  }
  const wrapped = resolveStyleInput(style)?.alignment?.wrapText === true;
  wrapTextCache.set(style, wrapped);
  return wrapped;
}
function sheetCompatibilityFindings(sheet) {
  const findings = [];
  if (sheet.state === "veryHidden") {
    findings.push({
      code: "GOOGLE_SHEETS_IMPORT_RISK",
      severity: "warning",
      category: "compatibility",
      message: `Sheet ${sheet.name} uses veryHidden state, which may not round-trip cleanly in Google Sheets`,
      location: { sheetName: sheet.name },
      repairable: false,
      crossAppCritical: true
    });
  }
  const hasDynamicFormula = sheet.rows.some((row) => row.cells.some((cell) => typeof cell.formula === "object" && cell.formula !== null && cell.formula.dynamic === true));
  if (hasDynamicFormula) {
    findings.push({
      code: "GOOGLE_SHEETS_IMPORT_RISK",
      severity: "warning",
      category: "compatibility",
      message: `Sheet ${sheet.name} contains dynamic-array formula metadata that may import differently across spreadsheet apps`,
      location: { sheetName: sheet.name },
      repairable: false,
      crossAppCritical: true
    });
  }
  return findings;
}
function verdictFromFindings(findings) {
  if (findings.some((finding) => finding.severity === "error")) {
    return "errors";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "warnings";
  }
  return "clean";
}
function preflightSpreadsheet(document, options) {
  const stringCounts = /* @__PURE__ */ new Map();
  const styleKeyCache = /* @__PURE__ */ new WeakMap();
  const wrapTextCache = /* @__PURE__ */ new WeakMap();
  const styleKeys = /* @__PURE__ */ new Set();
  let uniqueStringCharBytes = 0;
  let totalRows = 0;
  let totalCells = 0;
  let maxSheetRows = 0;
  let maxSheetCells = 0;
  let totalStringCells = 0;
  let baseCellXmlBytes = 0;
  let styledCellCount = 0;
  let rowsWithWrappedText = 0;
  const findings = [];
  document.sheets.forEach((sheet) => {
    totalRows += sheet.rows.length;
    maxSheetRows = Math.max(maxSheetRows, sheet.rows.length);
    findings.push(...sheetCompatibilityFindings(sheet));
    const headerStyleKey = collectStyleKey("header", sheet.styling?.headerRow, styleKeyCache);
    if (headerStyleKey) {
      styleKeys.add(headerStyleKey);
    }
    const oddStyleKey = collectStyleKey("odd", sheet.styling?.alternateRows?.odd, styleKeyCache);
    if (oddStyleKey) {
      styleKeys.add(oddStyleKey);
    }
    const evenStyleKey = collectStyleKey("even", sheet.styling?.alternateRows?.even, styleKeyCache);
    if (evenStyleKey) {
      styleKeys.add(evenStyleKey);
    }
    let sheetCellCount = 0;
    sheet.rows.forEach((row) => {
      sheetCellCount += row.cells.length;
      let rowHasWrappedText = false;
      row.cells.forEach((cell) => {
        totalCells += 1;
        baseCellXmlBytes += estimateCellXmlBytes(cell.value);
        const stringValue = collectStringValue(cell.value);
        if (stringValue !== null) {
          totalStringCells += 1;
          if (!stringCounts.has(stringValue)) {
            uniqueStringCharBytes += stringValue.length;
          }
          stringCounts.set(stringValue, (stringCounts.get(stringValue) ?? 0) + 1);
        }
        if (cell.style !== void 0) {
          styledCellCount += 1;
          const styleKey2 = collectStyleKey("cell", cell.style, styleKeyCache);
          if (styleKey2) {
            styleKeys.add(styleKey2);
          }
          if (styleUsesWrapText(cell.style, wrapTextCache)) {
            rowHasWrappedText = true;
          }
        }
      });
      if (rowHasWrappedText) {
        rowsWithWrappedText += 1;
      }
    });
    maxSheetCells = Math.max(maxSheetCells, sheetCellCount);
    for (const formatting of sheet.conditionalFormatting ?? []) {
      for (const rule of formatting.rules) {
        if ("style" in rule) {
          const styleKey2 = collectStyleKey("cf", rule.style, styleKeyCache);
          if (styleKey2) {
            styleKeys.add(styleKey2);
          }
        }
      }
    }
  });
  const uniqueStringCount = stringCounts.size;
  const estimatedStyleCount = styleKeys.size;
  const repeatedStringRatio = uniqueStringCount === 0 ? 1 : totalStringCells / uniqueStringCount;
  const reasons = [];
  let recommendedRenderMode = "buffer";
  if (options?.largeDataset) {
    recommendedRenderMode = "stream";
    reasons.push("Caller marked workbook as largeDataset");
  }
  if (maxSheetRows > 5e4) {
    recommendedRenderMode = "stream";
    reasons.push(`A sheet exceeds 50,000 rows (${maxSheetRows})`);
  }
  const highStringVolume = totalStringCells >= 1e5 || baseCellXmlBytes > 32 * 1024 * 1024;
  let recommendedStringStrategy = "sharedStrings";
  if (uniqueStringCount >= 1e5) {
    recommendedStringStrategy = "inlineStrings";
    reasons.push(`Projected unique string count is high (${uniqueStringCount})`);
  } else if (highStringVolume && repeatedStringRatio <= 1.5 && totalStringCells > 0) {
    recommendedStringStrategy = "inlineStrings";
    reasons.push(`Repeated string ratio is low (${repeatedStringRatio.toFixed(2)}x) under high string volume`);
  } else if (uniqueStringCount * 32 > 32 * 1024 * 1024) {
    recommendedStringStrategy = "inlineStrings";
    reasons.push("Projected sharedStrings.xml exceeds 32MB");
  }
  const projectedWorksheetXmlBytes = estimateWorksheetXmlBytes(
    baseCellXmlBytes,
    totalRows,
    styledCellCount,
    rowsWithWrappedText
  );
  const projectedSharedStringsXmlBytes = recommendedStringStrategy === "sharedStrings" ? estimateSharedStringsXmlBytes(uniqueStringCount, uniqueStringCharBytes) : 0;
  const projectedStylesXmlBytes = estimateStylesXmlBytes(estimatedStyleCount);
  const projectedZipBytes = estimateCompressedWorkbookBytes({
    estimatedStyleCount,
    projectedSharedStringsXmlBytes,
    projectedStylesXmlBytes,
    projectedWorksheetXmlBytes,
    recommendedStringStrategy,
    repeatedStringRatio,
    rowsWithWrappedText,
    sheetCount: document.sheets.length,
    styledCellCount,
    totalCells,
    totalRows
  });
  const estimatedPeakMemoryBytes = projectedWorksheetXmlBytes + projectedSharedStringsXmlBytes + projectedStylesXmlBytes + estimatedStyleCount * 256 + Math.round(projectedZipBytes * 0.25);
  if (totalCells > 1e6) {
    recommendedRenderMode = "stream";
    reasons.push(`Total cell count exceeds 1,000,000 (${totalCells})`);
  }
  if (projectedWorksheetXmlBytes > 64 * 1024 * 1024) {
    recommendedRenderMode = "stream";
    reasons.push(`Projected worksheet XML exceeds 64MB (${projectedWorksheetXmlBytes} bytes)`);
  }
  if (projectedZipBytes > 20 * 1024 * 1024) {
    recommendedRenderMode = "stream";
    reasons.push(`Projected ZIP size exceeds 20MB (${projectedZipBytes} bytes)`);
  }
  if (recommendedRenderMode === "stream") {
    findings.push({
      code: "STREAM_MODE_RECOMMENDED",
      severity: "warning",
      category: "operational",
      message: "Workbook shape exceeds the conservative buffer-mode thresholds; stream mode is recommended",
      metadata: {
        maxSheetRows,
        totalCells,
        projectedWorksheetXmlBytes,
        projectedZipBytes
      },
      repairable: false,
      crossAppCritical: false
    });
  }
  if (projectedZipBytes > 20 * 1024 * 1024 || projectedWorksheetXmlBytes > 64 * 1024 * 1024) {
    findings.push({
      code: "LARGE_FILE_WARNING",
      severity: "warning",
      category: "operational",
      message: "Workbook is projected to be large enough to create render, transfer, or import friction",
      metadata: {
        projectedZipBytes,
        projectedWorksheetXmlBytes
      },
      repairable: false,
      crossAppCritical: false
    });
  }
  if (uniqueStringCount >= 1e5 || highStringVolume && repeatedStringRatio <= 1.5 && totalStringCells > 0) {
    findings.push({
      code: "HIGH_UNIQUE_STRING_COUNT",
      severity: "warning",
      category: "operational",
      message: "Workbook has enough unique-string pressure that inline strings are likely safer than sharedStrings",
      metadata: {
        uniqueStringCount,
        totalStringCells,
        repeatedStringRatio: Number(repeatedStringRatio.toFixed(2))
      },
      repairable: false,
      crossAppCritical: false
    });
  }
  if (estimatedStyleCount > 4e3) {
    findings.push({
      code: "EXCESSIVE_STYLE_CARDINALITY",
      severity: "warning",
      category: "operational",
      message: `Workbook is estimated to use ${estimatedStyleCount} distinct styles, which risks compatibility and file-size issues`,
      metadata: { estimatedStyleCount },
      repairable: false,
      crossAppCritical: false
    });
  }
  if (reasons.length === 0) {
    reasons.push("Workbook fits the buffer-mode thresholds");
  }
  return {
    verdict: verdictFromFindings(findings),
    renderModeRecommendation: recommendedRenderMode,
    estimatedWorkbookSizeBytes: projectedZipBytes,
    estimatedPeakMemoryBytes,
    estimatedUniqueStrings: uniqueStringCount,
    estimatedStyleCount,
    findings,
    recommendedRenderMode,
    recommendedStringStrategy,
    estimates: {
      sheetCount: document.sheets.length,
      totalRows,
      totalCells,
      maxSheetRows,
      maxSheetCells,
      totalStringCells,
      uniqueStringCount,
      repeatedStringRatio,
      projectedWorksheetXmlBytes,
      projectedZipBytes
    },
    reasons
  };
}

// src/quality/workbook-quality.ts
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
var xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  ignoreDeclaration: true,
  trimValues: false
});
var xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: true
});
var STRIPPABLE_PART_PATTERNS = [
  { pattern: /^xl\/vbaProject\.bin$/i, code: "MACRO_STRIPPED", message: "Removed VBA macro payload during repair" },
  { pattern: /^xl\/connections(\.xml|\/)/i, code: "EXTERNAL_CONNECTION_STRIPPED", message: "Removed external connection metadata during repair" },
  { pattern: /^xl\/externalLinks(\/|\.xml)/i, code: "EXTERNAL_CONNECTION_STRIPPED", message: "Removed external workbook link metadata during repair" },
  { pattern: /^xl\/embeddings\//i, code: "EXTERNAL_CONNECTION_STRIPPED", message: "Removed embedded OLE payload during repair" }
];
var EXCEL_MAX_ROW_INDEX = 1048575;
var EXCEL_MAX_COL_INDEX = 16383;
var INVALID_SHEET_NAME_PATTERN = /[\\/*?:[\]]/;
function asArray(value) {
  if (value === void 0) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function resolveWorksheetRowNumber(row, rowIndex) {
  const explicit = Number(row?.["@_r"] ?? "");
  return Number.isFinite(explicit) && explicit > 0 ? explicit : rowIndex + 1;
}
function resolveWorksheetCellRef(cell, rowNumber, cellIndex) {
  const explicit = String(cell?.["@_r"] ?? "");
  if (explicit) {
    return explicit;
  }
  return rowNumber > 0 ? cellRef(rowNumber - 1, cellIndex) : "";
}
function getTextContent(node) {
  if (typeof node === "string") {
    return node;
  }
  if (typeof node === "object" && node !== null && "#text" in node && typeof node["#text"] === "string") {
    return node["#text"];
  }
  return "";
}
function getRelationshipSourceBaseSegments(relPath) {
  if (relPath === "_rels/.rels") {
    return [];
  }
  const segments = relPath.split("/");
  const relsDirectoryIndex = segments.lastIndexOf("_rels");
  const fileName = segments[segments.length - 1]?.replace(/\.rels$/, "");
  const baseSegments = segments.slice(0, relsDirectoryIndex);
  if (fileName && fileName !== ".rels") {
    baseSegments.push(fileName);
  }
  return baseSegments.slice(0, -1);
}
function resolveRelationshipTarget(relPath, target) {
  const baseSegments = getRelationshipSourceBaseSegments(relPath);
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      baseSegments.pop();
      continue;
    }
    baseSegments.push(segment);
  }
  return baseSegments.join("/");
}
function worksheetRelsPathForSheet(sheetPath) {
  return sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", fileName) => `${prefix}_rels/${fileName}.xml.rels`);
}
function serializeRangeOrCell(startRow, startCol, endRow, endCol) {
  return startRow === endRow && startCol === endCol ? cellRef(startRow, startCol) : rangeRef(startRow, startCol, endRow, endCol);
}
function rangeRefsMatch(leftRef, rightRef) {
  try {
    const left = parseRangeRef(leftRef);
    const right = parseRangeRef(rightRef);
    return left.startRow === right.startRow && left.startCol === right.startCol && left.endRow === right.endRow && left.endCol === right.endCol;
  } catch {
    return false;
  }
}
function isRangeWithinExcelBounds(range) {
  return range.startRow >= 0 && range.startCol >= 0 && range.endRow <= EXCEL_MAX_ROW_INDEX && range.endCol <= EXCEL_MAX_COL_INDEX;
}
function clipRangeToExcelBounds(ref) {
  try {
    const range = parseRangeRef(ref);
    const clippedStartRow = Math.max(0, Math.min(range.startRow, EXCEL_MAX_ROW_INDEX));
    const clippedStartCol = Math.max(0, Math.min(range.startCol, EXCEL_MAX_COL_INDEX));
    const clippedEndRow = Math.max(0, Math.min(range.endRow, EXCEL_MAX_ROW_INDEX));
    const clippedEndCol = Math.max(0, Math.min(range.endCol, EXCEL_MAX_COL_INDEX));
    if (clippedStartRow > clippedEndRow || clippedStartCol > clippedEndCol) {
      return null;
    }
    return serializeRangeOrCell(clippedStartRow, clippedStartCol, clippedEndRow, clippedEndCol);
  } catch {
    return null;
  }
}
function rangesOverlap(left, right) {
  return left.startRow <= right.endRow && left.endRow >= right.startRow && left.startCol <= right.endCol && left.endCol >= right.startCol;
}
function parseSheetQualifiedRef(ref) {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return null;
  }
  return {
    sheetName: (match[1] ?? match[2] ?? "").replaceAll("''", "'"),
    target: (match[3] ?? "").trim()
  };
}
function isClearlyInvalidDefinedNameRef(ref, knownSheets) {
  const parsed = parseSheetQualifiedRef(ref);
  if (!parsed) {
    return false;
  }
  if (!knownSheets.has(parsed.sheetName)) {
    return true;
  }
  const segments = parsed.target.split(",").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    return true;
  }
  let attemptedA1Segment = false;
  for (const segment of segments) {
    if (segment.includes("(") || segment.includes(")")) {
      return false;
    }
    if (!/[A-Z]+\$?\d|\$?[A-Z]+\$?\d/i.test(segment)) {
      continue;
    }
    attemptedA1Segment = true;
    try {
      const range = parseRangeRef(segment.toUpperCase());
      if (!isRangeWithinExcelBounds(range)) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return attemptedA1Segment ? false : false;
}
function isInvalidSheetName(sheetName) {
  return sheetName.length === 0 || sheetName.length > 31 || INVALID_SHEET_NAME_PATTERN.test(sheetName) || /^'|'$/.test(sheetName);
}
function sanitizeSheetName(sheetName, usedNames) {
  let base = sheetName.replace(INVALID_SHEET_NAME_PATTERN, "_").replace(/^'+|'+$/g, "").trim();
  if (!base) {
    base = "Sheet";
  }
  if (base.length > 31) {
    base = base.slice(0, 31);
  }
  let candidate = base;
  let suffix = 1;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixText = `_${suffix++}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffixText.length))}${suffixText}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}
function collectWorksheetExtent(worksheet) {
  let maxRow = 0;
  let maxCol = 0;
  asArray(worksheet?.sheetData?.row).forEach((row, rowIndex) => {
    const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
    asArray(row.c).forEach((cell, cellIndex) => {
      const ref = resolveWorksheetCellRef(cell, rowNumber, cellIndex);
      if (!ref) {
        return;
      }
      const parsedRef = parseCellRef(ref);
      maxRow = Math.max(maxRow, parsedRef.row);
      maxCol = Math.max(maxCol, parsedRef.col);
    });
  });
  for (const mergeCell of asArray(worksheet?.mergeCells?.mergeCell)) {
    const ref = String(mergeCell["@_ref"] ?? "");
    try {
      const range = parseRangeRef(ref);
      maxRow = Math.max(maxRow, range.endRow);
      maxCol = Math.max(maxCol, range.endCol);
    } catch {
    }
  }
  return {
    maxRow,
    maxCol,
    ref: serializeRangeOrCell(0, 0, maxRow, maxCol)
  };
}
function parseXmlAttributes(fragment) {
  const attributes = {};
  const attributePattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match;
  while ((match = attributePattern.exec(fragment)) !== null) {
    const [, name = "", value = ""] = match;
    attributes[name] = value;
  }
  return attributes;
}
function forEachWorksheetCellXml(sheetXml, callback) {
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch;
  let inferredRowNumber = 1;
  while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
    const rowAttributes = parseXmlAttributes(rowMatch[1] ?? "");
    const explicitRowNumber = Number(rowAttributes.r ?? "");
    const rowNumber = Number.isFinite(explicitRowNumber) && explicitRowNumber > 0 ? explicitRowNumber : inferredRowNumber;
    const rowXml = rowMatch[2] ?? "";
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cellMatch;
    let inferredCol = 0;
    while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
      const attributes = parseXmlAttributes(cellMatch[1] ?? cellMatch[3] ?? "");
      let ref = attributes.r ?? "";
      if (ref) {
        inferredCol = parseCellRef(ref).col + 1;
      } else if (Number.isFinite(rowNumber) && rowNumber > 0) {
        ref = cellRef(rowNumber - 1, inferredCol);
        inferredCol += 1;
      }
      callback({
        attributes,
        innerXml: cellMatch[2] ?? "",
        ref
      });
    }
    inferredRowNumber = rowNumber + 1;
  }
}
function collectWorksheetExtentFromXml(sheetXml) {
  let maxRow = 0;
  let maxCol = 0;
  forEachWorksheetCellXml(sheetXml, ({ ref }) => {
    if (!ref) {
      return;
    }
    const parsedRef = parseCellRef(ref);
    maxRow = Math.max(maxRow, parsedRef.row);
    maxCol = Math.max(maxCol, parsedRef.col);
  });
  const mergePattern = /<mergeCell\b[^>]*\bref="([^"]+)"/g;
  let mergeMatch;
  while ((mergeMatch = mergePattern.exec(sheetXml)) !== null) {
    const ref = mergeMatch[1] ?? "";
    try {
      const range = parseRangeRef(ref);
      maxRow = Math.max(maxRow, range.endRow);
      maxCol = Math.max(maxCol, range.endCol);
    } catch {
    }
  }
  return {
    maxRow,
    maxCol,
    ref: serializeRangeOrCell(0, 0, maxRow, maxCol)
  };
}
function normalizeSqrefSegments(sqref) {
  return sqref.split(/\s+/).map((segment) => segment.trim()).filter(Boolean);
}
function cellHasSerializedPayload(cell) {
  return cell["@_t"] !== void 0 || cell.f !== void 0 || cell.v !== void 0 || cell.is !== void 0;
}
function knownContentTypeForPath(path) {
  if (path === "xl/workbook.xml") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
  if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
  if (/^xl\/tables\/table\d+\.xml$/.test(path)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml";
  if (path === "xl/styles.xml") return "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml";
  if (path === "xl/sharedStrings.xml") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml";
  if (path === "xl/theme/theme1.xml") return "application/vnd.openxmlformats-officedocument.theme+xml";
  if (path === "docProps/core.xml") return "application/vnd.openxmlformats-package.core-properties+xml";
  if (path === "docProps/app.xml") return "application/vnd.openxmlformats-officedocument.extended-properties+xml";
  return void 0;
}
function verdictFromFindings2(findings) {
  if (findings.some((finding) => finding.severity === "error")) {
    return "errors";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "warnings";
  }
  return "clean";
}
async function inspectWorkbook(buffer, options) {
  const zip = await JSZip.loadAsync(buffer);
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
  const pathSet = new Set(paths);
  const findings = [];
  if (paths.length > (options?.maxPartCount ?? 2e3)) {
    findings.push({
      code: "EXTRA_CONTENT_TYPE",
      severity: "warning",
      category: "package",
      message: `Workbook contains an unusually high number of parts (${paths.length})`,
      repairable: false,
      crossAppCritical: false
    });
  }
  const contentTypesXml = await zip.file("[Content_Types].xml")?.async("string");
  const contentTypes = contentTypesXml ? xmlParser.parse(contentTypesXml)?.Types : null;
  const overridePaths = new Set(asArray(contentTypes?.Override).map((override) => String(override["@_PartName"]).replace(/^\//, "")));
  const nonDefaultXmlParts = paths.filter((path) => path.endsWith(".xml") && path !== "[Content_Types].xml" && path !== "_rels/.rels" && !path.endsWith(".xml.rels"));
  const nonDefaultXmlPartSet = new Set(nonDefaultXmlParts);
  const missingOverrides = nonDefaultXmlParts.filter((path) => knownContentTypeForPath(path) && !overridePaths.has(path));
  const extraOverrides = [...overridePaths].filter((path) => !nonDefaultXmlPartSet.has(path));
  missingOverrides.forEach((path) => {
    findings.push({
      code: "MISSING_CONTENT_TYPE",
      severity: "error",
      category: "package",
      message: `Missing content type override for ${path}`,
      location: { path },
      repairable: true,
      crossAppCritical: true
    });
  });
  extraOverrides.forEach((path) => {
    findings.push({
      code: "EXTRA_CONTENT_TYPE",
      severity: "warning",
      category: "package",
      message: `Content type override references a missing part: ${path}`,
      location: { path },
      repairable: true,
      crossAppCritical: false
    });
  });
  const orphanRelationships = [];
  const duplicateRelationshipIds = [];
  const relationshipPaths = paths.filter((path) => path.endsWith(".rels"));
  for (const relPath of relationshipPaths) {
    const relXml = await zip.file(relPath)?.async("string");
    const rels = xmlParser.parse(relXml ?? "")?.Relationships;
    const seenRelationshipIds = /* @__PURE__ */ new Set();
    for (const relationship of asArray(rels?.Relationship)) {
      const relationshipId = String(relationship["@_Id"] ?? "");
      if (relationshipId) {
        if (seenRelationshipIds.has(relationshipId)) {
          duplicateRelationshipIds.push({ relPath, id: relationshipId });
          findings.push({
            code: "DUPLICATE_RELATIONSHIP_ID",
            severity: "error",
            category: "relationship",
            message: `Relationship ${relationshipId} is duplicated in ${relPath}`,
            location: { path: relPath },
            metadata: { relationshipId },
            repairable: true,
            crossAppCritical: true
          });
        }
        seenRelationshipIds.add(relationshipId);
      }
      const target = String(relationship["@_Target"] ?? "");
      const external = relationship["@_TargetMode"] === "External";
      if (external || target.startsWith("http")) {
        continue;
      }
      const resolvedTarget = resolveRelationshipTarget(relPath, target);
      if (pathSet.has(resolvedTarget)) {
        continue;
      }
      const type = String(relationship["@_Type"] ?? "");
      orphanRelationships.push({
        relPath,
        id: String(relationship["@_Id"] ?? ""),
        type,
        resolvedTarget
      });
      findings.push({
        code: type.endsWith("/table") ? "BROKEN_TABLE_RELATIONSHIP" : "ORPHAN_RELATIONSHIP",
        severity: "error",
        category: type.endsWith("/table") ? "table" : "relationship",
        message: `Relationship ${relationship["@_Id"]} in ${relPath} targets missing part ${resolvedTarget}`,
        location: { path: relPath },
        metadata: { relationshipId: String(relationship["@_Id"] ?? ""), target: resolvedTarget },
        repairable: true,
        crossAppCritical: true
      });
    }
  }
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const workbookRelsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  const workbook = workbookXml ? xmlParser.parse(workbookXml)?.workbook : null;
  if (workbookXml && workbookRelsXml) {
    const workbookRels = xmlParser.parse(workbookRelsXml)?.Relationships;
    const workbookRelMap = new Map(asArray(workbookRels?.Relationship).map((relationship) => [
      String(relationship["@_Id"]),
      resolveRelationshipTarget("xl/_rels/workbook.xml.rels", String(relationship["@_Target"] ?? ""))
    ]));
    for (const sheet of asArray(workbook?.sheets?.sheet)) {
      const sheetPath = workbookRelMap.get(String(sheet["@_r:id"] ?? ""));
      if (sheetPath && pathSet.has(sheetPath)) {
        continue;
      }
      findings.push({
        code: "MISSING_WORKSHEET_PART",
        severity: "error",
        category: "workbook",
        message: `Workbook sheet ${sheet["@_name"]} points to a missing worksheet part`,
        location: { path: "xl/workbook.xml", sheetName: String(sheet["@_name"] ?? "") },
        repairable: false,
        crossAppCritical: true
      });
    }
  }
  const stylesXml = await zip.file("xl/styles.xml")?.async("string");
  const styleSheet = stylesXml ? xmlParser.parse(stylesXml)?.styleSheet : null;
  const maxStyleIndex = Math.max(0, asArray(styleSheet?.cellXfs?.xf).length - 1);
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const sharedStringsRoot = sharedStringsXml ? xmlParser.parse(sharedStringsXml)?.sst : null;
  const sharedStringCount = asArray(sharedStringsRoot?.si).length;
  const styleOutOfBounds = [];
  const sharedStringOutOfBounds = [];
  const invalidTableRefs = [];
  const duplicateTableNames = [];
  const invalidSheetNames = [];
  const duplicateSheetNames = [];
  const worksheetDimensionMismatches = [];
  const invalidMerges = [];
  const overlappingMerges = [];
  const invalidHyperlinks = [];
  const invalidDataValidationRanges = [];
  const invalidDefinedNames = [];
  const formulaCachedValueMissing = [];
  const seenTableNames = /* @__PURE__ */ new Set();
  const tableSheetExtentMap = /* @__PURE__ */ new Map();
  const workbookSheetNames = /* @__PURE__ */ new Set();
  const seenWorkbookSheetNames = /* @__PURE__ */ new Set();
  if (workbook) {
    const sheets = asArray(workbook?.sheets?.sheet);
    sheets.forEach((sheet) => {
      const name = String(sheet["@_name"] ?? "");
      if (name) {
        if (isInvalidSheetName(name)) {
          invalidSheetNames.push({ sheetName: name });
          findings.push({
            code: "SHEET_NAME_INVALID",
            severity: "error",
            category: "workbook",
            message: `Worksheet name "${name}" is invalid for Excel.`,
            location: { path: "xl/workbook.xml", sheetName: name },
            repairable: true,
            crossAppCritical: true
          });
        }
        const normalized = name.toLowerCase();
        if (seenWorkbookSheetNames.has(normalized)) {
          duplicateSheetNames.push({ sheetName: name });
          findings.push({
            code: "DUPLICATE_SHEET_NAME",
            severity: "error",
            category: "workbook",
            message: `Worksheet name "${name}" is duplicated.`,
            location: { path: "xl/workbook.xml", sheetName: name },
            repairable: true,
            crossAppCritical: true
          });
        }
        seenWorkbookSheetNames.add(normalized);
        workbookSheetNames.add(name);
      }
    });
    for (const definedName of asArray(workbook?.definedNames?.definedName)) {
      const name = typeof definedName === "object" && definedName !== null ? String(definedName["@_name"] ?? "") : "";
      const ref = getTextContent(definedName).trim();
      if (!name || !ref || !isClearlyInvalidDefinedNameRef(ref, workbookSheetNames)) {
        continue;
      }
      invalidDefinedNames.push({ name, ref });
      findings.push({
        code: "DEFINED_NAME_INVALID",
        severity: "error",
        category: "workbook",
        message: `Defined name ${name} points to an invalid or missing-sheet reference`,
        location: { path: "xl/workbook.xml", rangeRef: ref },
        metadata: { name },
        repairable: true,
        crossAppCritical: true
      });
    }
  }
  const sheetPaths = paths.filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    const sheetXmlText = sheetXml ?? "";
    const extent = collectWorksheetExtentFromXml(sheetXmlText);
    const declaredDimension = sheetXmlText.match(/<dimension\b[^>]*\bref="([^"]+)"/)?.[1] ?? "A1";
    const actualDimension = extent.ref;
    let dimensionMatches = false;
    try {
      const declared = parseRangeRef(declaredDimension);
      const actual = parseRangeRef(actualDimension);
      dimensionMatches = declared.startRow === actual.startRow && declared.startCol === actual.startCol && declared.endRow === actual.endRow && declared.endCol === actual.endCol;
    } catch {
      dimensionMatches = false;
    }
    if (!dimensionMatches) {
      worksheetDimensionMismatches.push({
        sheetPath,
        expectedRef: actualDimension,
        actualRef: declaredDimension
      });
      findings.push({
        code: "DIMENSION_MISMATCH",
        severity: "error",
        category: "worksheet",
        message: `Worksheet dimension ${declaredDimension} does not match actual populated extent ${actualDimension}`,
        location: { path: sheetPath, rangeRef: declaredDimension },
        metadata: { expectedRef: actualDimension },
        repairable: true,
        crossAppCritical: true
      });
    }
    forEachWorksheetCellXml(sheetXmlText, ({ attributes, innerXml, ref }) => {
      if (!ref) {
        return;
      }
      if (attributes.s !== void 0) {
        const styleIndex = Number(attributes.s);
        if (styleIndex > maxStyleIndex) {
          styleOutOfBounds.push({
            sheetPath,
            cellRef: ref,
            styleIndex
          });
          findings.push({
            code: "STYLE_INDEX_OOB",
            severity: "error",
            category: "styleString",
            message: `Cell ${ref} references style index ${styleIndex}, but max style index is ${maxStyleIndex}`,
            location: { path: sheetPath, cellRef: ref },
            metadata: { styleIndex, maxStyleIndex },
            repairable: true,
            crossAppCritical: true
          });
        }
      }
      if (attributes.t === "s") {
        const valueMatch = /<v>([^<]*)<\/v>/.exec(innerXml);
        const sharedIndex = Number(valueMatch?.[1] ?? "");
        if (!(sharedIndex >= 0 && sharedIndex < sharedStringCount)) {
          sharedStringOutOfBounds.push({
            sheetPath,
            cellRef: ref,
            sharedStringIndex: sharedIndex
          });
          findings.push({
            code: "SHARED_STRING_INDEX_OOB",
            severity: "error",
            category: "styleString",
            message: `Cell ${ref} references shared string index ${sharedIndex}, but only ${sharedStringCount} entries exist`,
            location: { path: sheetPath, cellRef: ref },
            metadata: { sharedStringIndex: sharedIndex, sharedStringCount },
            repairable: true,
            crossAppCritical: true
          });
        }
      }
      if (/<f(?:\s|>)/.test(innerXml) && !/<v>[\s\S]*?<\/v>/.test(innerXml)) {
        formulaCachedValueMissing.push({
          sheetPath,
          cellRef: ref
        });
        findings.push({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          category: "worksheet",
          message: `Cell ${ref} contains a formula without a cached value.`,
          location: { path: sheetPath, cellRef: ref },
          repairable: true,
          crossAppCritical: true
        });
      }
    });
    const hyperlinkPattern = /<hyperlink\b[^>]*\bref="([^"]+)"/g;
    let hyperlinkMatch;
    while ((hyperlinkMatch = hyperlinkPattern.exec(sheetXmlText)) !== null) {
      const ref = hyperlinkMatch[1] ?? "";
      try {
        const range = parseRangeRef(ref);
        if (!isRangeWithinExcelBounds(range)) {
          throw new Error("out-of-bounds");
        }
      } catch {
        invalidHyperlinks.push({ sheetPath, ref });
        findings.push({
          code: "HYPERLINK_TARGET_INVALID",
          severity: "error",
          category: "worksheet",
          message: `Worksheet hyperlink ref ${ref} is invalid or outside Excel bounds`,
          location: { path: sheetPath, rangeRef: ref },
          repairable: true,
          crossAppCritical: true
        });
      }
    }
    const dataValidationPattern = /<dataValidation\b[^>]*\bsqref="([^"]+)"/g;
    let dataValidationMatch;
    while ((dataValidationMatch = dataValidationPattern.exec(sheetXmlText)) !== null) {
      const sqref = dataValidationMatch[1] ?? "";
      const segments = normalizeSqrefSegments(sqref);
      const valid = segments.length > 0 && segments.every((segment) => {
        try {
          const range = parseRangeRef(segment);
          return isRangeWithinExcelBounds(range);
        } catch {
          return false;
        }
      });
      if (!valid) {
        invalidDataValidationRanges.push({ sheetPath, sqref });
        findings.push({
          code: "INVALID_RANGE_REF",
          severity: "error",
          category: "worksheet",
          message: `Worksheet data validation sqref ${sqref} is invalid or outside Excel bounds`,
          location: { path: sheetPath, rangeRef: sqref },
          repairable: true,
          crossAppCritical: true
        });
      }
    }
    const validMergeRanges = [];
    const mergePattern = /<mergeCell\b[^>]*\bref="([^"]+)"/g;
    let mergeMatch;
    while ((mergeMatch = mergePattern.exec(sheetXmlText)) !== null) {
      const ref = mergeMatch[1] ?? "";
      try {
        const range = parseRangeRef(ref);
        if (!isRangeWithinExcelBounds(range)) {
          throw new Error("out-of-bounds");
        }
        const overlap = validMergeRanges.find((existing) => rangesOverlap(existing, range));
        if (overlap) {
          overlappingMerges.push({
            sheetPath,
            ref,
            overlapsWith: overlap.ref
          });
          findings.push({
            code: "MERGE_OVERLAP",
            severity: "error",
            category: "worksheet",
            message: `Worksheet merge ${ref} overlaps existing merge ${overlap.ref}`,
            location: { path: sheetPath, rangeRef: ref },
            metadata: { overlapsWith: overlap.ref },
            repairable: true,
            crossAppCritical: true
          });
          continue;
        }
        validMergeRanges.push({
          ref,
          startRow: range.startRow,
          startCol: range.startCol,
          endRow: range.endRow,
          endCol: range.endCol
        });
      } catch {
        invalidMerges.push({ sheetPath, ref });
        findings.push({
          code: "MERGE_RANGE_OUT_OF_BOUNDS",
          severity: "error",
          category: "worksheet",
          message: `Worksheet merge ref ${ref} is invalid or outside Excel bounds`,
          location: { path: sheetPath, rangeRef: ref },
          repairable: true,
          crossAppCritical: true
        });
      }
    }
    const sheetRelsPath = worksheetRelsPathForSheet(sheetPath);
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async("string");
    const sheetRels = sheetRelsXml ? xmlParser.parse(sheetRelsXml)?.Relationships : null;
    for (const relationship of asArray(sheetRels?.Relationship)) {
      const type = String(relationship["@_Type"] ?? "");
      if (!type.endsWith("/table")) {
        continue;
      }
      const tablePath = resolveRelationshipTarget(sheetRelsPath, String(relationship["@_Target"] ?? ""));
      tableSheetExtentMap.set(tablePath, {
        sheetPath,
        maxRow: extent.maxRow,
        maxCol: extent.maxCol
      });
    }
  }
  const tablePaths = paths.filter((path) => /^xl\/tables\/table\d+\.xml$/.test(path));
  for (const tablePath of tablePaths) {
    const tableXml = await zip.file(tablePath)?.async("string");
    const table = xmlParser.parse(tableXml ?? "")?.table;
    const tableName = String(table?.["@_name"] ?? "");
    const displayName = String(table?.["@_displayName"] ?? tableName);
    if (seenTableNames.has(displayName.toLowerCase())) {
      duplicateTableNames.push({
        tablePath,
        displayName
      });
      findings.push({
        code: "DUPLICATE_TABLE_NAME",
        severity: "error",
        category: "table",
        message: `Duplicate table displayName detected: ${displayName}`,
        location: { path: tablePath },
        repairable: true,
        crossAppCritical: true
      });
    }
    seenTableNames.add(displayName.toLowerCase());
    try {
      if (table?.["@_ref"]) {
        const parsedRange = parseRangeRef(String(table["@_ref"]));
        const extent = tableSheetExtentMap.get(tablePath);
        if (extent && (parsedRange.endRow > extent.maxRow || parsedRange.endCol > extent.maxCol)) {
          invalidTableRefs.push({
            tablePath,
            ref: String(table["@_ref"]),
            sheetPath: extent.sheetPath,
            maxRow: extent.maxRow,
            maxCol: extent.maxCol
          });
          findings.push({
            code: "INVALID_TABLE_REF",
            severity: "error",
            category: "table",
            message: `Table ${tableName || tablePath} extends beyond the actual worksheet extent`,
            location: { path: tablePath, rangeRef: String(table["@_ref"]) },
            metadata: {
              maxRow: extent.maxRow + 1,
              maxCol: extent.maxCol + 1
            },
            repairable: true,
            crossAppCritical: true
          });
        }
      }
    } catch {
      invalidTableRefs.push({
        tablePath,
        ref: String(table?.["@_ref"] ?? ""),
        sheetPath: tableSheetExtentMap.get(tablePath)?.sheetPath,
        maxRow: tableSheetExtentMap.get(tablePath)?.maxRow,
        maxCol: tableSheetExtentMap.get(tablePath)?.maxCol
      });
      findings.push({
        code: "INVALID_TABLE_REF",
        severity: "error",
        category: "table",
        message: `Table ${tableName || tablePath} has an invalid A1 ref`,
        location: { path: tablePath, rangeRef: String(table?.["@_ref"] ?? "") },
        repairable: true,
        crossAppCritical: true
      });
    }
  }
  return {
    findings,
    paths,
    missingOverrides,
    extraOverrides,
    orphanRelationships,
    duplicateRelationshipIds,
    invalidSheetNames,
    duplicateSheetNames,
    styleOutOfBounds,
    sharedStringOutOfBounds,
    invalidTableRefs,
    duplicateTableNames,
    worksheetDimensionMismatches,
    invalidMerges,
    overlappingMerges,
    invalidHyperlinks,
    invalidDataValidationRanges,
    invalidDefinedNames,
    formulaCachedValueMissing
  };
}
async function repairSharedStringIntegrity(zip, inspection, actions, findings, options) {
  if (options?.repairSharedStringIndices === false || inspection.sharedStringOutOfBounds.length === 0) {
    return;
  }
  const invalidRefsBySheet = /* @__PURE__ */ new Map();
  inspection.sharedStringOutOfBounds.forEach((issue) => {
    const refs = invalidRefsBySheet.get(issue.sheetPath) ?? /* @__PURE__ */ new Set();
    refs.add(issue.cellRef);
    invalidRefsBySheet.set(issue.sheetPath, refs);
  });
  for (const [sheetPath, refs] of invalidRefsBySheet) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) {
      continue;
    }
    const sheetTree = xmlParser.parse(sheetXml);
    const rows = asArray(sheetTree?.worksheet?.sheetData?.row);
    let changed = false;
    rows.forEach((row, rowIndex) => {
      const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
      const originalCells = asArray(row.c);
      const repairedCells = originalCells.filter((cell, cellIndex) => {
        const ref = resolveWorksheetCellRef(cell, rowNumber, cellIndex);
        if (!refs.has(ref)) {
          return true;
        }
        delete cell["@_t"];
        delete cell.v;
        delete cell.is;
        changed = true;
        return cell["@_s"] !== void 0 || cellHasSerializedPayload(cell);
      });
      if (repairedCells.length !== originalCells.length) {
        row.c = repairedCells;
      }
    });
    if (!changed) {
      continue;
    }
    zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
    actions.push({
      code: "REPAIR_SHARED_STRING_INDEX",
      description: `Cleared invalid shared string references in ${sheetPath}`,
      path: sheetPath
    });
    findings.push({
      code: "SHARED_STRING_INDEX_OOB",
      severity: "warning",
      category: "styleString",
      message: `Cleared invalid shared string references in ${sheetPath}`,
      location: { path: sheetPath },
      repairable: true,
      repaired: true,
      crossAppCritical: false
    });
  }
}
function buildContentTypesXml(paths) {
  const overrides = paths.filter((path) => path.endsWith(".xml") && path !== "[Content_Types].xml" && path !== "_rels/.rels" && !path.endsWith(".xml.rels")).map((path) => {
    const contentType = knownContentTypeForPath(path);
    return contentType ? { path, contentType } : null;
  }).filter((entry) => entry !== null).sort((left, right) => left.path.localeCompare(right.path));
  return [
    XML_DECLARATION,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    ...overrides.map((override) => `<Override PartName="/${override.path}" ContentType="${override.contentType}"/>`),
    `</Types>`
  ].join("");
}
function stripUnsafeParts(zip, actions, findings) {
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  for (const path of paths) {
    const match = STRIPPABLE_PART_PATTERNS.find((entry) => entry.pattern.test(path));
    if (!match) {
      continue;
    }
    zip.remove(path);
    actions.push({
      code: match.code,
      description: match.message,
      path
    });
    findings.push({
      code: match.code,
      severity: "warning",
      category: "security",
      message: match.message,
      location: { path },
      repairable: true,
      repaired: true,
      crossAppCritical: false
    });
  }
}
async function repairTables(zip, actions, findings, options) {
  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
  const sheetPaths = paths.filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
  const tableExtentMap = /* @__PURE__ */ new Map();
  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) {
      continue;
    }
    const worksheet = xmlParser.parse(sheetXml)?.worksheet;
    const rows = asArray(worksheet?.sheetData?.row);
    let maxRow = 0;
    let maxCol = 0;
    rows.forEach((row, rowIndex) => {
      const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
      asArray(row.c).forEach((cell, cellIndex) => {
        const ref = resolveWorksheetCellRef(cell, rowNumber, cellIndex);
        if (!ref) {
          return;
        }
        const parsed = parseCellRef(ref);
        maxRow = Math.max(maxRow, parsed.row);
        maxCol = Math.max(maxCol, parsed.col);
      });
    });
    const sheetRelsPath = worksheetRelsPathForSheet(sheetPath);
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async("string");
    const sheetRels = sheetRelsXml ? xmlParser.parse(sheetRelsXml)?.Relationships : null;
    for (const relationship of asArray(sheetRels?.Relationship)) {
      if (!String(relationship["@_Type"] ?? "").endsWith("/table")) {
        continue;
      }
      const tablePath = resolveRelationshipTarget(sheetRelsPath, String(relationship["@_Target"] ?? ""));
      tableExtentMap.set(tablePath, { maxRow, maxCol });
    }
  }
  const tablePaths = paths.filter((path) => /^xl\/tables\/table\d+\.xml$/.test(path));
  const seenDisplayNames = /* @__PURE__ */ new Map();
  for (const tablePath of tablePaths) {
    const tableXml = await zip.file(tablePath)?.async("string");
    if (!tableXml) {
      continue;
    }
    const tableTree = xmlParser.parse(tableXml);
    const table = tableTree.table ?? {};
    let changed = false;
    if (options?.normalizeDuplicateTableNames !== false) {
      const currentDisplayName = String(table["@_displayName"] ?? table["@_name"] ?? "");
      const currentName = String(table["@_name"] ?? currentDisplayName);
      const normalized = currentDisplayName.toLowerCase();
      const count = (seenDisplayNames.get(normalized) ?? 0) + 1;
      seenDisplayNames.set(normalized, count);
      if (count > 1 && currentDisplayName) {
        const nextName = `${currentDisplayName}_${count}`;
        table["@_displayName"] = nextName;
        table["@_name"] = `${currentName}_${count}`;
        actions.push({
          code: "NORMALIZE_DUPLICATE_TABLE_NAME",
          description: `Renamed duplicate table ${currentDisplayName} to ${nextName}`,
          path: tablePath
        });
        findings.push({
          code: "DUPLICATE_TABLE_NAME",
          severity: "warning",
          category: "table",
          message: `Normalized duplicate table name ${currentDisplayName} to ${nextName}`,
          location: { path: tablePath },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
        changed = true;
      }
    }
    if (options?.clipTableRefs !== false && typeof table["@_ref"] === "string") {
      const extent = tableExtentMap.get(tablePath);
      if (extent) {
        try {
          const parsedRef = parseRangeRef(String(table["@_ref"]));
          const clippedEndRow = Math.min(parsedRef.endRow, extent.maxRow);
          const clippedEndCol = Math.min(parsedRef.endCol, extent.maxCol);
          if (clippedEndRow >= parsedRef.startRow && clippedEndCol >= parsedRef.startCol && (clippedEndRow !== parsedRef.endRow || clippedEndCol !== parsedRef.endCol)) {
            table["@_ref"] = rangeRef(parsedRef.startRow, parsedRef.startCol, clippedEndRow, clippedEndCol);
            if (table.autoFilter?.["@_ref"]) {
              const autoFilterEndRow = Number(table["@_totalsRowCount"] ?? 0) > 0 && clippedEndRow > parsedRef.startRow ? clippedEndRow - 1 : clippedEndRow;
              table.autoFilter["@_ref"] = rangeRef(parsedRef.startRow, parsedRef.startCol, autoFilterEndRow, clippedEndCol);
            }
            actions.push({
              code: "CLIP_TABLE_REF",
              description: `Clipped table ref for ${tablePath} to sheet extents`,
              path: tablePath
            });
            findings.push({
              code: "INVALID_TABLE_REF",
              severity: "warning",
              category: "table",
              message: `Clipped table ref for ${tablePath} to the actual worksheet extent`,
              location: { path: tablePath, rangeRef: String(table["@_ref"]) },
              repairable: true,
              repaired: true,
              crossAppCritical: false
            });
            changed = true;
          }
        } catch {
        }
      }
    }
    if (changed) {
      zip.file(tablePath, XML_DECLARATION + xmlBuilder.build(tableTree));
    }
  }
}
async function repairWorksheetIntegrity(zip, actions, findings, options) {
  const sheetPaths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir && /^xl\/worksheets\/sheet\d+\.xml$/.test(path)).sort();
  for (const sheetPath of sheetPaths) {
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (!sheetXml) {
      continue;
    }
    const sheetTree = xmlParser.parse(sheetXml);
    const worksheet = sheetTree.worksheet ?? {};
    let changed = false;
    if (options?.repairMerges !== false && worksheet?.mergeCells?.mergeCell) {
      const originalMerges = asArray(worksheet.mergeCells.mergeCell);
      const repairedMerges = [];
      const keptRanges = [];
      for (const mergeCell of originalMerges) {
        const originalRef = String(mergeCell["@_ref"] ?? "");
        const clippedRef = clipRangeToExcelBounds(originalRef);
        if (!clippedRef) {
          continue;
        }
        try {
          const parsedRange = parseRangeRef(clippedRef);
          const overlap = keptRanges.find((existing) => rangesOverlap(existing, parsedRange));
          if (overlap) {
            continue;
          }
          keptRanges.push({
            ref: clippedRef,
            startRow: parsedRange.startRow,
            startCol: parsedRange.startCol,
            endRow: parsedRange.endRow,
            endCol: parsedRange.endCol
          });
          repairedMerges.push({
            ...mergeCell,
            "@_ref": clippedRef
          });
        } catch {
        }
      }
      const mergeChanged = repairedMerges.length !== originalMerges.length || repairedMerges.some((mergeCell, index) => String(mergeCell["@_ref"] ?? "") !== String(originalMerges[index]?.["@_ref"] ?? ""));
      if (mergeChanged) {
        if (repairedMerges.length > 0) {
          worksheet.mergeCells = {
            "@_count": String(repairedMerges.length),
            mergeCell: repairedMerges
          };
        } else {
          delete worksheet.mergeCells;
        }
        actions.push({
          code: "REPAIR_MERGES",
          description: `Clipped invalid merges and removed overlapping merges in ${sheetPath}`,
          path: sheetPath
        });
        findings.push({
          code: "MERGE_OVERLAP",
          severity: "warning",
          category: "worksheet",
          message: `Clipped invalid merges and removed overlapping merges in ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
        changed = true;
      }
    }
    if (options?.repairWorksheetDimensions !== false) {
      const actualDimension = collectWorksheetExtent(worksheet).ref;
      const currentDimension = String(worksheet?.dimension?.["@_ref"] ?? "A1");
      if (!rangeRefsMatch(currentDimension, actualDimension)) {
        worksheet.dimension = { "@_ref": actualDimension };
        actions.push({
          code: "RECALCULATE_DIMENSION",
          description: `Recalculated worksheet dimension for ${sheetPath}`,
          path: sheetPath
        });
        findings.push({
          code: "DIMENSION_MISMATCH",
          severity: "warning",
          category: "worksheet",
          message: `Recalculated worksheet dimension from ${currentDimension} to ${actualDimension}`,
          location: { path: sheetPath, rangeRef: actualDimension },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
        changed = true;
      }
    }
    if (options?.removeInvalidHyperlinks !== false && worksheet?.hyperlinks?.hyperlink) {
      const originalHyperlinks = asArray(worksheet.hyperlinks.hyperlink);
      const keptHyperlinks = originalHyperlinks.filter((hyperlink) => {
        const ref = String(hyperlink["@_ref"] ?? "");
        try {
          const range = parseRangeRef(ref);
          return isRangeWithinExcelBounds(range);
        } catch {
          return false;
        }
      });
      if (keptHyperlinks.length !== originalHyperlinks.length) {
        if (keptHyperlinks.length > 0) {
          worksheet.hyperlinks.hyperlink = keptHyperlinks;
        } else {
          delete worksheet.hyperlinks;
        }
        actions.push({
          code: "REMOVE_INVALID_HYPERLINKS",
          description: `Removed invalid hyperlink refs from ${sheetPath}`,
          path: sheetPath
        });
        findings.push({
          code: "HYPERLINK_TARGET_INVALID",
          severity: "warning",
          category: "worksheet",
          message: `Removed invalid hyperlink refs from ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
        changed = true;
      }
    }
    if (options?.clipDataValidationRanges !== false && worksheet?.dataValidations?.dataValidation) {
      const originalValidations = asArray(worksheet.dataValidations.dataValidation);
      const repairedValidations = originalValidations.flatMap((validation) => {
        const sqref = String(validation["@_sqref"] ?? "");
        const repairedSegments = normalizeSqrefSegments(sqref).map((segment) => clipRangeToExcelBounds(segment)).filter((segment) => Boolean(segment));
        if (repairedSegments.length === 0) {
          return [];
        }
        return [{
          ...validation,
          "@_sqref": repairedSegments.join(" ")
        }];
      });
      if (repairedValidations.length !== originalValidations.length || repairedValidations.some((validation, index) => String(validation["@_sqref"]) !== String(originalValidations[index]?.["@_sqref"]))) {
        if (repairedValidations.length > 0) {
          worksheet.dataValidations.dataValidation = repairedValidations;
          worksheet.dataValidations["@_count"] = String(repairedValidations.length);
        } else {
          delete worksheet.dataValidations;
        }
        actions.push({
          code: "CLIP_DATA_VALIDATION_RANGES",
          description: `Clipped or removed invalid data validation ranges in ${sheetPath}`,
          path: sheetPath
        });
        findings.push({
          code: "INVALID_RANGE_REF",
          severity: "warning",
          category: "worksheet",
          message: `Clipped or removed invalid data validation ranges in ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
        changed = true;
      }
    }
    if (changed) {
      zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
    }
  }
}
async function repairDefinedNames(zip, actions, findings, options) {
  if (options?.removeInvalidDefinedNames === false) {
    return;
  }
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  if (!workbookXml) {
    return;
  }
  const workbookTree = xmlParser.parse(workbookXml);
  const workbook = workbookTree.workbook ?? {};
  const sheets = asArray(workbook?.sheets?.sheet);
  const workbookSheetNames = new Set(
    sheets.map((sheet) => String(sheet["@_name"] ?? "")).filter(Boolean)
  );
  const originalDefinedNames = asArray(workbook?.definedNames?.definedName);
  const repairedDefinedNames = originalDefinedNames.filter((definedName) => {
    const ref = getTextContent(definedName).trim();
    return !ref || !isClearlyInvalidDefinedNameRef(ref, workbookSheetNames);
  });
  if (repairedDefinedNames.length === originalDefinedNames.length) {
    return;
  }
  if (repairedDefinedNames.length > 0) {
    workbook.definedNames.definedName = repairedDefinedNames;
  } else {
    delete workbook.definedNames;
  }
  zip.file("xl/workbook.xml", XML_DECLARATION + xmlBuilder.build(workbookTree));
  actions.push({
    code: "REMOVE_INVALID_DEFINED_NAMES",
    description: "Removed invalid defined names from xl/workbook.xml",
    path: "xl/workbook.xml"
  });
  findings.push({
    code: "DEFINED_NAME_INVALID",
    severity: "warning",
    category: "workbook",
    message: "Removed invalid defined names from xl/workbook.xml",
    location: { path: "xl/workbook.xml" },
    repairable: true,
    repaired: true,
    crossAppCritical: false
  });
}
async function validateSpreadsheetBuffer(buffer, options) {
  const inspection = await inspectWorkbook(buffer, options);
  return {
    verdict: verdictFromFindings2(inspection.findings),
    findings: inspection.findings
  };
}
async function repairSpreadsheetBuffer(buffer, options) {
  const zip = await JSZip.loadAsync(buffer);
  const deterministic = options?.deterministic !== false;
  const actions = [];
  const repairFindings = [];
  if (options?.stripUnsafeArtifacts !== false) {
    stripUnsafeParts(zip, actions, repairFindings);
  }
  let inspection = await inspectWorkbook(await zip.generateAsync({ type: "nodebuffer" }));
  if (options?.fixContentTypes !== false && (inspection.missingOverrides.length > 0 || inspection.extraOverrides.length > 0 || !zip.file("[Content_Types].xml"))) {
    const currentPaths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir).sort();
    zip.file("[Content_Types].xml", buildContentTypesXml(currentPaths));
    actions.push({
      code: "FIX_CONTENT_TYPES",
      description: "Rebuilt [Content_Types].xml from the current package parts",
      path: "[Content_Types].xml"
    });
  }
  if (inspection.invalidSheetNames.length > 0 || inspection.duplicateSheetNames.length > 0) {
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    if (workbookXml) {
      const workbookTree = xmlParser.parse(workbookXml);
      const sheets = asArray(workbookTree?.workbook?.sheets?.sheet);
      const usedNames = /* @__PURE__ */ new Set();
      let changed = false;
      sheets.forEach((sheet) => {
        const currentName = String(sheet["@_name"] ?? "");
        const normalized = currentName.toLowerCase();
        if (!currentName || !isInvalidSheetName(currentName) && !usedNames.has(normalized)) {
          if (currentName) {
            usedNames.add(normalized);
          }
          return;
        }
        const nextName = sanitizeSheetName(currentName, usedNames);
        if (nextName !== currentName) {
          sheet["@_name"] = nextName;
          changed = true;
        }
      });
      if (changed) {
        zip.file("xl/workbook.xml", XML_DECLARATION + xmlBuilder.build(workbookTree));
        actions.push({
          code: "NORMALIZE_SHEET_NAMES",
          description: "Normalized invalid or duplicate worksheet names in xl/workbook.xml",
          path: "xl/workbook.xml"
        });
        repairFindings.push({
          code: inspection.invalidSheetNames.length > 0 ? "SHEET_NAME_INVALID" : "DUPLICATE_SHEET_NAME",
          severity: "warning",
          category: "workbook",
          message: "Normalized invalid or duplicate worksheet names in xl/workbook.xml",
          location: { path: "xl/workbook.xml" },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
      }
    }
  }
  if (inspection.duplicateRelationshipIds.length > 0) {
    const duplicateIdsByRelPath = /* @__PURE__ */ new Map();
    inspection.duplicateRelationshipIds.forEach((issue) => {
      const ids = duplicateIdsByRelPath.get(issue.relPath) ?? /* @__PURE__ */ new Set();
      ids.add(issue.id);
      duplicateIdsByRelPath.set(issue.relPath, ids);
    });
    for (const [relPath, duplicateIds] of duplicateIdsByRelPath) {
      const relXml = await zip.file(relPath)?.async("string");
      if (!relXml) {
        continue;
      }
      const relTree = xmlParser.parse(relXml);
      const relationships = asArray(relTree?.Relationships?.Relationship);
      const seenIds = /* @__PURE__ */ new Set();
      relTree.Relationships.Relationship = relationships.filter((relationship) => {
        const relationshipId = String(relationship["@_Id"] ?? "");
        if (!duplicateIds.has(relationshipId)) {
          return true;
        }
        if (seenIds.has(relationshipId)) {
          return false;
        }
        seenIds.add(relationshipId);
        return true;
      });
      zip.file(relPath, XML_DECLARATION + xmlBuilder.build(relTree));
      actions.push({
        code: "DEDUPE_RELATIONSHIP_IDS",
        description: `Removed duplicate relationship ids from ${relPath}`,
        path: relPath
      });
      repairFindings.push({
        code: "DUPLICATE_RELATIONSHIP_ID",
        severity: "warning",
        category: "relationship",
        message: `Removed duplicate relationship ids from ${relPath}`,
        location: { path: relPath },
        repairable: true,
        repaired: true,
        crossAppCritical: false
      });
    }
  }
  if (options?.removeOrphanRelationships !== false && inspection.orphanRelationships.length > 0) {
    const orphanIdsByRelPath = /* @__PURE__ */ new Map();
    inspection.orphanRelationships.forEach((relationship) => {
      const ids = orphanIdsByRelPath.get(relationship.relPath) ?? /* @__PURE__ */ new Set();
      ids.add(relationship.id);
      orphanIdsByRelPath.set(relationship.relPath, ids);
    });
    for (const [relPath, orphanIds] of orphanIdsByRelPath) {
      const relXml = await zip.file(relPath)?.async("string");
      if (!relXml) {
        continue;
      }
      const relTree = xmlParser.parse(relXml);
      const relationships = asArray(relTree?.Relationships?.Relationship).filter((relationship) => !orphanIds.has(String(relationship["@_Id"] ?? "")));
      relTree.Relationships.Relationship = relationships;
      zip.file(relPath, XML_DECLARATION + xmlBuilder.build(relTree));
      actions.push({
        code: "REMOVE_ORPHAN_RELATIONSHIPS",
        description: `Removed orphan relationships from ${relPath}`,
        path: relPath
      });
      if (!/xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(relPath)) {
        continue;
      }
      const sheetPath = relPath.replace(/^xl\/worksheets\/_rels\/(sheet\d+)\.xml\.rels$/, "xl/worksheets/$1.xml");
      const sheetXml = await zip.file(sheetPath)?.async("string");
      if (!sheetXml) {
        continue;
      }
      const sheetTree = xmlParser.parse(sheetXml);
      const tableParts = asArray(sheetTree?.worksheet?.tableParts?.tablePart).filter((tablePart) => !orphanIds.has(String(tablePart["@_r:id"] ?? "")));
      if (sheetTree?.worksheet?.tableParts) {
        if (tableParts.length > 0) {
          sheetTree.worksheet.tableParts.tablePart = tableParts;
          sheetTree.worksheet.tableParts["@_count"] = String(tableParts.length);
        } else {
          delete sheetTree.worksheet.tableParts;
        }
      }
      zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
    }
  }
  if (options?.clampStyleIndices !== false && inspection.styleOutOfBounds.length > 0) {
    const outOfBoundsBySheet = /* @__PURE__ */ new Map();
    inspection.styleOutOfBounds.forEach((issue) => {
      const refs = outOfBoundsBySheet.get(issue.sheetPath) ?? /* @__PURE__ */ new Set();
      refs.add(issue.cellRef);
      outOfBoundsBySheet.set(issue.sheetPath, refs);
    });
    for (const [sheetPath, refs] of outOfBoundsBySheet) {
      const sheetXml = await zip.file(sheetPath)?.async("string");
      if (!sheetXml) {
        continue;
      }
      const sheetTree = xmlParser.parse(sheetXml);
      asArray(sheetTree?.worksheet?.sheetData?.row).forEach((row, rowIndex) => {
        const rowNumber = resolveWorksheetRowNumber(row, rowIndex);
        asArray(row.c).forEach((cell, cellIndex) => {
          if (!refs.has(resolveWorksheetCellRef(cell, rowNumber, cellIndex))) {
            return;
          }
          delete cell["@_s"];
        });
      });
      zip.file(sheetPath, XML_DECLARATION + xmlBuilder.build(sheetTree));
      actions.push({
        code: "CLAMP_STYLE_INDEX",
        description: `Reset out-of-range style indices in ${sheetPath} to the default style`,
        path: sheetPath
      });
    }
  }
  if (inspection.formulaCachedValueMissing.length > 0) {
    const formulaCellsBySheet = /* @__PURE__ */ new Map();
    inspection.formulaCachedValueMissing.forEach((issue) => {
      const refs = formulaCellsBySheet.get(issue.sheetPath) ?? /* @__PURE__ */ new Set();
      refs.add(issue.cellRef);
      formulaCellsBySheet.set(issue.sheetPath, refs);
    });
    for (const [sheetPath, refs] of formulaCellsBySheet) {
      const sheetXml = await zip.file(sheetPath)?.async("string");
      if (!sheetXml) {
        continue;
      }
      const repaired = sheetXml.replace(/<c\b([^>]*)\br="([^"]+)"([^>]*)>([\s\S]*?)<\/c>/g, (match, before, ref, after, innerXml) => {
        if (!refs.has(ref) || !/<f(?:\s|>)/.test(innerXml) || /<v>[\s\S]*?<\/v>/.test(innerXml)) {
          return match;
        }
        return `<c${before} r="${ref}"${after}>${innerXml}<v>0</v></c>`;
      });
      if (repaired !== sheetXml) {
        zip.file(sheetPath, repaired);
        actions.push({
          code: "ADD_FORMULA_CACHED_VALUES",
          description: `Inserted cached formula values into ${sheetPath}`,
          path: sheetPath
        });
        repairFindings.push({
          code: "FORMULA_CACHED_VALUE_MISSING",
          severity: "warning",
          category: "worksheet",
          message: `Inserted cached formula values into ${sheetPath}`,
          location: { path: sheetPath },
          repairable: true,
          repaired: true,
          crossAppCritical: false
        });
      }
    }
  }
  await repairSharedStringIntegrity(zip, inspection, actions, repairFindings, options);
  await repairWorksheetIntegrity(zip, actions, repairFindings, options);
  await repairTables(zip, actions, repairFindings, options);
  await repairDefinedNames(zip, actions, repairFindings, options);
  if (deterministic) {
    for (const entry of Object.values(zip.files)) {
      entry.date = DETERMINISTIC_ZIP_DATE;
    }
  }
  const repairedBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  inspection = await inspectWorkbook(repairedBuffer, options);
  const findings = [
    ...inspection.findings,
    ...repairFindings
  ];
  return {
    buffer: repairedBuffer,
    repaired: actions.length > 0,
    actions,
    findings,
    riskyTransformations: false
  };
}
async function validateAndRepairSpreadsheetBuffer(buffer, options) {
  const original = await validateSpreadsheetBuffer(buffer, options);
  const repair = await repairSpreadsheetBuffer(buffer, options);
  const repaired = await validateSpreadsheetBuffer(repair.buffer, options);
  const repairedCodes = new Set(repair.findings.filter((finding) => finding.repaired).map((finding) => finding.code));
  repair.findings.forEach((finding) => {
    if (repairedCodes.has(finding.code)) {
      finding.repaired = true;
    }
  });
  return {
    original,
    repair,
    repaired
  };
}

// src/layout/column-width.ts
var MAX_EXCEL_COLUMN_WIDTH = 255;
function clampColumnWidth(width) {
  return Math.min(width, MAX_EXCEL_COLUMN_WIDTH);
}
function columnNeedsHeuristicWidth(column) {
  return column?.width === void 0 && column?.bestFit === true;
}
function stringifyDisplayValue(value, style) {
  if (value === null || value === void 0) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    const numberFormat2 = resolveNumberFormatAlias(style?.numberFormat);
    if (numberFormat2 === "m/d/yyyy") return "1/1/2026";
    if (numberFormat2 === "d/m/yyyy") return "1/1/2026";
    return "2026-01-01";
  }
  const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
  if (!numberFormat) {
    return formatNumberForCell(value);
  }
  if (numberFormat.includes("%")) {
    const decimals = (numberFormat.split(".")[1]?.match(/0/g) ?? []).length;
    return `${(value * 100).toFixed(decimals)}%`;
  }
  if (numberFormat.includes("\u20A9")) return `\u20A9${Math.round(value).toLocaleString("en-US")}`;
  if (numberFormat.includes("$")) return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (numberFormat.includes("\u20AC")) return `\u20AC${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (numberFormat.includes("#,##0.00")) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (numberFormat.includes("#,##0")) return Math.round(value).toLocaleString("en-US");
  return formatNumberForCell(value);
}
function isCJKCharacter(codePoint) {
  return codePoint >= 11904 && codePoint <= 40959 || codePoint >= 63744 && codePoint <= 64255 || codePoint >= 65072 && codePoint <= 65103;
}
function estimateCharacterBaseWidth(char) {
  const codePoint = char.codePointAt(0) ?? 0;
  return isCJKCharacter(codePoint) ? 1.8 : 1;
}
function estimateStringWidth(value) {
  let maxLineWidth = 0;
  let currentLineWidth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\n" || ch === "\r") {
      maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
      currentLineWidth = 0;
      if (ch === "\r" && value[i + 1] === "\n") {
        i++;
      }
      continue;
    }
    currentLineWidth += estimateCharacterBaseWidth(ch);
  }
  return Math.max(maxLineWidth, currentLineWidth);
}
function longestLineLength(value) {
  return value.split(/\r\n|\r|\n/).reduce(
    (max, line) => Math.max(max, line.length),
    0
  );
}
function countIntegerDigits(value) {
  if (!Number.isFinite(value) || value === 0) {
    return 1;
  }
  return Math.floor(Math.log10(Math.abs(value))) + 1;
}
function countGroupedDigits(value) {
  const digits = countIntegerDigits(value);
  return digits + Math.max(0, Math.floor((digits - 1) / 3));
}
function countDecimalPlaces(format) {
  const decimalSection = format.split(".")[1] ?? "";
  const match = decimalSection.match(/0/g);
  return match?.length ?? 0;
}
function estimateNumberDisplayLength(value, numberFormat) {
  if (!numberFormat) {
    return formatNumberForCell(value).length;
  }
  const absValue = Math.abs(value);
  const sign = value < 0 ? 1 : 0;
  if (numberFormat.includes("E+")) {
    return sign + 8;
  }
  if (numberFormat.includes("%")) {
    const decimals = countDecimalPlaces(numberFormat);
    const scaled = absValue * 100;
    return sign + countIntegerDigits(scaled) + (decimals > 0 ? decimals + 1 : 0) + 1;
  }
  if (numberFormat.includes("\u20A9")) {
    return sign + 1 + countGroupedDigits(absValue);
  }
  if (numberFormat.includes("$") || numberFormat.includes("\u20AC") || numberFormat.includes("\xA3") || numberFormat.includes("\xA5")) {
    const decimals = countDecimalPlaces(numberFormat);
    return sign + 1 + countGroupedDigits(absValue) + (decimals > 0 ? decimals + 1 : 0);
  }
  if (numberFormat.includes("#,##0")) {
    const decimals = countDecimalPlaces(numberFormat);
    return sign + countGroupedDigits(absValue) + (decimals > 0 ? decimals + 1 : 0);
  }
  if (numberFormat === "@") {
    return String(value).length;
  }
  return formatNumberForCell(value).length;
}
function resolveWidthCoefficient(style, defaults) {
  const fontFamily = style?.font?.family ?? defaults?.font?.family ?? "Calibri";
  return fontFamily === "Courier New" ? 1 : 1.15;
}
function estimateDisplayCharWidth(value, style) {
  if (value === null || value === void 0) {
    return void 0;
  }
  const boldMultiplier = style?.font?.bold === true ? 1.05 : 1;
  if (Array.isArray(value)) {
    return estimateStringWidth(value.map((run) => run.text).join("")) * boldMultiplier;
  }
  if (isErrorValue(value)) {
    return estimateStringWidth(value.error) * boldMultiplier;
  }
  if (typeof value === "string") {
    return estimateStringWidth(value) * boldMultiplier;
  }
  return estimateDisplayLength(value, style) * boldMultiplier;
}
function estimateDisplayWidth(value, style, defaults) {
  const charWidth = estimateDisplayCharWidth(value, style);
  if (charWidth === void 0 || charWidth === 0) {
    return void 0;
  }
  const coefficient = resolveWidthCoefficient(style, defaults);
  return Math.min(Math.max(charWidth * coefficient + 2, 8.43), MAX_EXCEL_COLUMN_WIDTH);
}
function estimateDisplayLength(value, style) {
  if (value === null || value === void 0) {
    return 0;
  }
  if (Array.isArray(value)) {
    return longestLineLength(value.map((run) => run.text).join(""));
  }
  if (isErrorValue(value)) {
    return value.error.length;
  }
  if (typeof value === "string") {
    return longestLineLength(value);
  }
  if (typeof value === "boolean") {
    return value ? 4 : 5;
  }
  if (value instanceof Date) {
    const numberFormat = resolveNumberFormatAlias(style?.numberFormat);
    if (numberFormat === "yyyy-mm-dd hh:mm") return 16;
    if (numberFormat === "h:mm:ss") return 8;
    if (numberFormat === "m/d/yyyy") return 10;
    if (numberFormat === "d/m/yyyy") return 10;
    return 10;
  }
  return estimateNumberDisplayLength(value, resolveNumberFormatAlias(style?.numberFormat));
}
function estimateHeuristicColumnWidth(value, style, defaults) {
  return estimateDisplayWidth(value, style, defaults);
}
function getSheetColumnCount(sheet) {
  let maxColumnCount = sheet.columns?.length ?? 0;
  for (const row of sheet.rows) {
    if (row.cells.length > maxColumnCount) {
      maxColumnCount = row.cells.length;
    }
  }
  return maxColumnCount;
}
function buildColumnLayout(sheet, computedColumns, defaults) {
  const columnCount = computedColumns.length;
  const columnWidths = computedColumns.map(
    (column, index) => clampColumnWidth(
      sheet.columns?.[index]?.width ?? column?.width ?? (defaults?.columnWidth ?? 8.43)
    )
  );
  const segments = [];
  for (let index = 0; index < columnCount; index += 1) {
    const explicit = sheet.columns?.[index];
    const computed = computedColumns[index];
    const descriptor = {
      width: clampColumnWidth(explicit?.width ?? computed?.width ?? (defaults?.columnWidth ?? 8.43)),
      hidden: explicit?.hidden,
      bestFit: explicit?.bestFit ?? computed?.bestFit,
      customWidth: explicit?.width !== void 0 || computed?.width !== void 0
    };
    const shouldEmitSegment = descriptor.customWidth || descriptor.hidden || descriptor.bestFit;
    if (!shouldEmitSegment) {
      continue;
    }
    const previous = segments[segments.length - 1];
    if (previous && previous.end === index && previous.width === descriptor.width && previous.hidden === descriptor.hidden && previous.bestFit === descriptor.bestFit && previous.customWidth === descriptor.customWidth) {
      previous.end = index + 1;
      continue;
    }
    segments.push({
      start: index + 1,
      end: index + 1,
      ...descriptor
    });
  }
  return {
    columnCount,
    columnWidths,
    segments
  };
}
function computeColumnLayout(sheet, defaults) {
  const columnCount = getSheetColumnCount(sheet);
  const computedColumns = Array.from({ length: columnCount }, () => void 0);
  const explicitColumns = sheet.columns ?? [];
  const headerRowStyle = resolveCellStyle(sheet.styling?.headerRow, void 0);
  const alternateOddStyle = resolveCellStyle(sheet.styling?.alternateRows?.odd, void 0);
  const alternateEvenStyle = resolveCellStyle(sheet.styling?.alternateRows?.even, void 0);
  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex];
    if (!row) {
      continue;
    }
    const rowStyle = rowIndex === 0 ? headerRowStyle : (rowIndex + 1) % 2 === 0 ? alternateEvenStyle : alternateOddStyle;
    for (let columnIndex = 0; columnIndex < row.cells.length; columnIndex += 1) {
      const explicitColumn = explicitColumns[columnIndex];
      if (!columnNeedsHeuristicWidth(explicitColumn)) {
        continue;
      }
      const cell = row.cells[columnIndex];
      if (!cell) {
        continue;
      }
      const style = resolveCellStyle(cell.style, cell.value, rowStyle);
      const width = estimateDisplayWidth(cell.value, style, defaults);
      if (width === void 0) {
        continue;
      }
      const existing = computedColumns[columnIndex];
      if (!existing || width > existing.width) {
        computedColumns[columnIndex] = {
          width,
          bestFit: true
        };
      }
    }
  }
  const layout = buildColumnLayout(sheet, computedColumns, defaults);
  return {
    columnCount: layout.columnCount,
    computedColumns,
    columnWidths: layout.columnWidths,
    segments: layout.segments
  };
}

// src/deterministic-mode.ts
function setDeterministicMode2(enabled = true) {
  setDeterministicMode(enabled);
}
function isDeterministicModeEnabled2() {
  return isDeterministicModeEnabled();
}

// src/render-plan.ts
var DEFAULT_ROW_CHUNK_SIZE = 1e3;
var MIN_ROW_CHUNK_SIZE = 100;
var MAX_ROW_CHUNK_SIZE = 1e4;
function estimateCellXmlBytes2(value) {
  if (value === void 0 || value === null) {
    return 16;
  }
  if (isRichTextValue(value)) {
    return 32 + value.reduce((sum, run) => sum + run.text.length, 0);
  }
  if (isErrorValue(value)) {
    return 24 + value.error.length;
  }
  if (typeof value === "string") {
    return 28 + value.length;
  }
  if (typeof value === "boolean") {
    return 22;
  }
  if (value instanceof Date) {
    return 26;
  }
  return 24;
}
function clampRowChunkSize(value) {
  if (value === void 0) {
    return DEFAULT_ROW_CHUNK_SIZE;
  }
  return Math.min(MAX_ROW_CHUNK_SIZE, Math.max(MIN_ROW_CHUNK_SIZE, Math.floor(value)));
}
function buildSheetPlan(sheet, rowChunkSize) {
  let cellCount = 0;
  let estimatedWorksheetXmlBytes = 0;
  let hasCellMerges = false;
  let hasHyperlinks = false;
  let hasFormulas = false;
  for (const row of sheet.rows) {
    estimatedWorksheetXmlBytes += 24;
    cellCount += row.cells.length;
    for (const cell of row.cells) {
      const formula = cell.formula;
      const cachedValue = typeof formula === "string" ? cell.value : formula?.cachedValue ?? cell.value;
      estimatedWorksheetXmlBytes += estimateCellXmlBytes2(cachedValue);
      if (formula) {
        estimatedWorksheetXmlBytes += 18 + (typeof formula === "string" ? formula.length : formula.expression.length);
      }
      if (cell.hyperlink) {
        estimatedWorksheetXmlBytes += 32;
      }
      hasHyperlinks ||= cell.hyperlink !== void 0;
      hasFormulas ||= cell.formula !== void 0;
      hasCellMerges ||= (cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1;
    }
  }
  return {
    name: sheet.name,
    rowCount: sheet.rows.length,
    cellCount,
    columnCount: getSheetColumnCount(sheet),
    chunkSize: rowChunkSize,
    chunkCount: Math.max(1, Math.ceil(Math.max(sheet.rows.length, 1) / rowChunkSize)),
    estimatedWorksheetXmlBytes,
    features: {
      mergedCells: Boolean(sheet.mergedCells?.length) || hasCellMerges,
      freezePane: sheet.freezePane !== void 0,
      autoFilter: sheet.autoFilter !== void 0 && sheet.autoFilter !== false,
      dataValidations: Boolean(sheet.dataValidations?.length),
      hyperlinks: hasHyperlinks,
      conditionalFormatting: Boolean(sheet.conditionalFormatting?.length),
      printSetup: sheet.pageSetup !== void 0,
      formulas: hasFormulas,
      tables: Boolean(sheet.tables?.length)
    }
  };
}
function buildPartManifest(document, sheetPlans, includeSharedStrings) {
  const manifest = [
    { path: "[Content_Types].xml", stage: "smallPart" },
    { path: "_rels/.rels", stage: "smallPart" },
    { path: "docProps/core.xml", stage: "smallPart" },
    { path: "docProps/app.xml", stage: "smallPart" },
    { path: "xl/workbook.xml", stage: "smallPart" },
    { path: "xl/_rels/workbook.xml.rels", stage: "smallPart" },
    { path: "xl/styles.xml", stage: "smallPart" },
    { path: "xl/theme/theme1.xml", stage: "smallPart" }
  ];
  sheetPlans.forEach((_sheetPlan, index) => {
    manifest.push({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      stage: "worksheet"
    });
  });
  sheetPlans.forEach((sheetPlan, index) => {
    if (!sheetPlan.features.hyperlinks && !sheetPlan.features.tables) {
      return;
    }
    manifest.push({
      path: `xl/worksheets/_rels/sheet${index + 1}.xml.rels`,
      stage: "worksheetRelationship"
    });
  });
  if (includeSharedStrings) {
    manifest.push({
      path: "xl/sharedStrings.xml",
      stage: "trailingGlobal"
    });
  }
  let nextTableId = 1;
  document.sheets.forEach((sheet) => {
    sheet.tables?.forEach(() => {
      manifest.push({
        path: `xl/tables/table${nextTableId}.xml`,
        stage: "trailingGlobal"
      });
      nextTableId += 1;
    });
  });
  return manifest;
}
function createRenderPlan(document, options) {
  const qualityReport = preflightSpreadsheet(document, options);
  const requestedStringStrategy = options?.stringStrategy ?? "auto";
  const resolvedStringStrategy = requestedStringStrategy !== "auto" ? requestedStringStrategy : qualityReport.recommendedStringStrategy;
  const rowChunkSize = clampRowChunkSize(options?.rowChunkSize);
  const sheetPlans = document.sheets.map((sheet) => buildSheetPlan(sheet, rowChunkSize));
  const includeSharedStrings = resolvedStringStrategy === "sharedStrings";
  return {
    deterministic: options?.deterministic ?? isDeterministicModeEnabled2(),
    recommendedRenderMode: qualityReport.recommendedRenderMode,
    requestedStringStrategy,
    resolvedStringStrategy,
    includeSharedStrings,
    rowChunkSize,
    qualityReport,
    sheetPlans,
    partManifest: buildPartManifest(document, sheetPlans, includeSharedStrings)
  };
}

// src/formulas/shift.ts
var CELL_OR_RANGE_PATTERN = /^\$?[A-Z]{1,3}\$?[1-9]\d*(?::\$?[A-Z]{1,3}\$?[1-9]\d*)?/;
function isIdentifierContinuation(character) {
  return character !== void 0 && /[A-Za-z0-9_.\\]/.test(character);
}
function parseCellToken(token) {
  const match = /^(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)$/.exec(token);
  if (!match) {
    throw new Error(`Invalid formula cell token: ${token}`);
  }
  return {
    absoluteColumn: match[1] === "$",
    column: match[2] ?? "",
    absoluteRow: match[3] === "$",
    rowNumber: Number(match[4])
  };
}
function serializeCellToken(cell) {
  return `${cell.absoluteColumn ? "$" : ""}${cell.column}${cell.absoluteRow ? "$" : ""}${cell.rowNumber}`;
}
function shiftCellTokenRows(token, insertionRow, rowDelta) {
  const parsed = parseCellToken(token);
  if (parsed.rowNumber < insertionRow) {
    return token;
  }
  return serializeCellToken({
    ...parsed,
    rowNumber: parsed.rowNumber + rowDelta
  });
}
function shiftRangeRows(range, insertionRow, rowDelta) {
  const [startRef, endRef] = range.split(":");
  if (!endRef) {
    return shiftCellTokenRows(range, insertionRow, rowDelta);
  }
  const start = parseCellToken(startRef);
  const end = parseCellToken(endRef);
  const insertionTouchesExistingRange = start.rowNumber < insertionRow && end.rowNumber >= insertionRow - 1;
  const shiftedStart = start.rowNumber >= insertionRow ? {
    ...start,
    rowNumber: start.rowNumber + rowDelta
  } : start;
  const shiftedEnd = end.rowNumber >= insertionRow ? {
    ...end,
    rowNumber: end.rowNumber + rowDelta
  } : insertionTouchesExistingRange ? {
    ...end,
    rowNumber: end.rowNumber + rowDelta
  } : end;
  return `${serializeCellToken(shiftedStart)}:${serializeCellToken(shiftedEnd)}`;
}
function offsetCellTokenRows(token, rowOffset) {
  const parsed = parseCellToken(token);
  if (parsed.absoluteRow) {
    return token;
  }
  return serializeCellToken({
    ...parsed,
    rowNumber: parsed.rowNumber + rowOffset
  });
}
function offsetRangeRows(range, rowOffset) {
  const [startRef, endRef] = range.split(":");
  if (!endRef) {
    return offsetCellTokenRows(range, rowOffset);
  }
  return `${offsetCellTokenRows(startRef, rowOffset)}:${offsetCellTokenRows(endRef, rowOffset)}`;
}
function readStringLiteral(source, start) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '"') {
      if (source[index + 1] === '"') {
        index += 2;
        continue;
      }
      return {
        token: source.slice(start, index + 1),
        end: index + 1
      };
    }
    index += 1;
  }
  return {
    token: source.slice(start),
    end: source.length
  };
}
function readQuotedSheetReference(source, start) {
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
    shifted: sheetName
  };
}
function readBareSheetReference(source, start) {
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
    shifted: sheetMatch[1]
  };
}
function readLocalReference(source, start) {
  const previous = start > 0 ? source[start - 1] : void 0;
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
    end: start + match[0].length
  };
}
function shiftFormulaRows(expression, options) {
  const hasEqualsPrefix = expression.startsWith("=");
  const source = hasEqualsPrefix ? expression.slice(1) : expression;
  let index = 0;
  let shifted = "";
  while (index < source.length) {
    const current = source[index];
    if (current === '"') {
      const literal = readStringLiteral(source, index);
      shifted += literal.token;
      index = literal.end;
      continue;
    }
    const quotedSheetReference = current === "'" ? readQuotedSheetReference(source, index) : null;
    if (quotedSheetReference) {
      const separatorIndex = quotedSheetReference.token.lastIndexOf("!");
      const sheetPart = quotedSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = quotedSheetReference.token.slice(separatorIndex + 1);
      shifted += quotedSheetReference.shifted === options.targetSheetName ? `${sheetPart}${shiftRangeRows(rangePart, options.insertionRow, options.rowDelta)}` : quotedSheetReference.token;
      index = quotedSheetReference.end;
      continue;
    }
    const bareSheetReference = current && /[A-Za-z_\\]/.test(current) ? readBareSheetReference(source, index) : null;
    if (bareSheetReference) {
      const separatorIndex = bareSheetReference.token.lastIndexOf("!");
      const sheetPart = bareSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = bareSheetReference.token.slice(separatorIndex + 1);
      shifted += bareSheetReference.shifted === options.targetSheetName ? `${sheetPart}${shiftRangeRows(rangePart, options.insertionRow, options.rowDelta)}` : bareSheetReference.token;
      index = bareSheetReference.end;
      continue;
    }
    const localReference = current === "$" || /[A-Z]/.test(current) ? readLocalReference(source, index) : null;
    if (localReference) {
      shifted += options.currentSheetName === options.targetSheetName ? shiftRangeRows(localReference.token, options.insertionRow, options.rowDelta) : localReference.token;
      index = localReference.end;
      continue;
    }
    shifted += current;
    index += 1;
  }
  return hasEqualsPrefix ? `=${shifted}` : shifted;
}
function offsetFormulaRows(expression, options) {
  const hasEqualsPrefix = expression.startsWith("=");
  const source = hasEqualsPrefix ? expression.slice(1) : expression;
  let index = 0;
  let shifted = "";
  while (index < source.length) {
    const current = source[index];
    if (current === '"') {
      const literal = readStringLiteral(source, index);
      shifted += literal.token;
      index = literal.end;
      continue;
    }
    const quotedSheetReference = current === "'" ? readQuotedSheetReference(source, index) : null;
    if (quotedSheetReference) {
      const separatorIndex = quotedSheetReference.token.lastIndexOf("!");
      const sheetPart = quotedSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = quotedSheetReference.token.slice(separatorIndex + 1);
      shifted += quotedSheetReference.shifted === options.targetSheetName ? `${sheetPart}${offsetRangeRows(rangePart, options.rowOffset)}` : quotedSheetReference.token;
      index = quotedSheetReference.end;
      continue;
    }
    const bareSheetReference = current && /[A-Za-z_\\]/.test(current) ? readBareSheetReference(source, index) : null;
    if (bareSheetReference) {
      const separatorIndex = bareSheetReference.token.lastIndexOf("!");
      const sheetPart = bareSheetReference.token.slice(0, separatorIndex + 1);
      const rangePart = bareSheetReference.token.slice(separatorIndex + 1);
      shifted += bareSheetReference.shifted === options.targetSheetName ? `${sheetPart}${offsetRangeRows(rangePart, options.rowOffset)}` : bareSheetReference.token;
      index = bareSheetReference.end;
      continue;
    }
    const localReference = current === "$" || /[A-Z]/.test(current) ? readLocalReference(source, index) : null;
    if (localReference) {
      shifted += options.currentSheetName === options.targetSheetName ? offsetRangeRows(localReference.token, options.rowOffset) : localReference.token;
      index = localReference.end;
      continue;
    }
    shifted += current;
    index += 1;
  }
  return hasEqualsPrefix ? `=${shifted}` : shifted;
}

// src/styles/color.ts
function normalizeHex(color) {
  const raw = color.startsWith("#") ? color.slice(1) : color;
  if (raw.length === 6) {
    return `FF${raw.toUpperCase()}`;
  }
  if (raw.length === 8) {
    return raw.toUpperCase();
  }
  return raw.toUpperCase();
}
function serializeColorAttributes(color) {
  if (color.startsWith("theme:")) {
    const [, themeIndex, tint] = color.split(":");
    const attributes = [`theme="${escapeXml(themeIndex)}"`];
    if (tint !== void 0) {
      attributes.push(`tint="${escapeXml(tint)}"`);
    }
    return attributes.join(" ");
  }
  return `rgb="${normalizeHex(color)}"`;
}

// src/styles/conditional-formatting.ts
function serializeCfvo(rulePoint) {
  const valAttr = rulePoint.value !== void 0 ? ` val="${rulePoint.value}"` : "";
  return `<cfvo type="${rulePoint.type}"${valAttr}/>`;
}
function serializeCellIs(rule, registry, priority) {
  const dxfId = registry.registerDxf(rule.style);
  const formulas = Array.isArray(rule.formula) ? `<formula>${rule.formula[0]}</formula><formula>${rule.formula[1]}</formula>` : `<formula>${rule.formula}</formula>`;
  return `<cfRule type="cellIs" dxfId="${dxfId}" priority="${priority}" operator="${rule.operator}">${formulas}</cfRule>`;
}
function serializeTop10(rule, registry, priority) {
  const dxfId = registry.registerDxf(rule.style);
  return `<cfRule type="top10" dxfId="${dxfId}" priority="${priority}" rank="${rule.rank}" percent="${rule.percent ? 1 : 0}" bottom="${rule.bottom ? 1 : 0}"/>`;
}
function serializeDuplicate(rule, registry, priority) {
  const dxfId = registry.registerDxf(rule.style);
  return `<cfRule type="${rule.type}" dxfId="${dxfId}" priority="${priority}"/>`;
}
function serializeColorScale(rule, priority) {
  const points = [rule.scale.min, rule.scale.mid, rule.scale.max].filter(
    (point) => point !== void 0
  );
  const colors = points.map((point) => `<color ${serializeColorAttributes(point.color)}/>`).join("");
  return `<cfRule type="colorScale" priority="${priority}"><colorScale>${points.map((point) => serializeCfvo(point)).join("")}${colors}</colorScale></cfRule>`;
}
function needsExtendedDataBar(rule) {
  return rule.negativeColor !== void 0 || rule.axisPosition !== void 0 && rule.axisPosition !== "automatic" || rule.gradient === false || rule.direction !== void 0;
}
function readableLegacyDataBarColor(rule) {
  const color = rule.color.replace(/^#/, "").toUpperCase();
  if (rule.gradient !== false || rule.showValue === false || !/^(?:[0-9A-F]{6}|[0-9A-F]{8})$/u.test(color)) {
    return rule.color;
  }
  const rgb = color.length === 8 ? color.slice(2) : color;
  const softened = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(rgb.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * 0.48).toString(16).padStart(2, "0").toUpperCase();
  }).join("");
  return color.length === 8 ? `${color.slice(0, 2)}${softened}` : softened;
}
function serializeDataBar(rule, priority) {
  const showValueAttr = rule.showValue === false ? ` showValue="0"` : "";
  const basic = `<cfRule type="dataBar" priority="${priority}"><dataBar${showValueAttr}>${serializeCfvo(rule.min)}${serializeCfvo(rule.max)}<color ${serializeColorAttributes(readableLegacyDataBarColor(rule))}/></dataBar></cfRule>`;
  if (!needsExtendedDataBar(rule)) {
    return { basic, extended: "" };
  }
  const guid = `{00000000-0000-0000-0000-${String(priority).padStart(12, "0")}}`;
  const extParts = [];
  extParts.push(`<x14:cfRule type="dataBar" id="${guid}">`);
  extParts.push(`<x14:dataBar`);
  const extAttrs = [];
  if (rule.gradient === false) {
    extAttrs.push(` gradient="0"`);
  }
  if (rule.direction !== void 0) {
    extAttrs.push(` direction="${rule.direction}"`);
  }
  if (rule.axisPosition !== void 0 && rule.axisPosition !== "automatic") {
    extAttrs.push(` axisPosition="${rule.axisPosition}"`);
  }
  extParts.push(extAttrs.join(""));
  extParts.push(">");
  extParts.push(serializeX14Cfvo(rule.min));
  extParts.push(serializeX14Cfvo(rule.max));
  if (rule.negativeColor !== void 0) {
    extParts.push(`<x14:negativeFillColor ${serializeColorAttributes(rule.negativeColor)}/>`);
  }
  if (rule.axisPosition !== "none") {
    extParts.push(`<x14:axisColor rgb="FF000000"/>`);
  }
  extParts.push("</x14:dataBar>");
  extParts.push("</x14:cfRule>");
  return { basic, extended: extParts.join("") };
}
function serializeX14Cfvo(cfvo) {
  const valAttr = cfvo.value !== void 0 ? `<xm:f>${cfvo.value}</xm:f>` : "";
  return `<x14:cfvo type="${cfvo.type}">${valAttr}</x14:cfvo>`;
}
var DEFAULT_THRESHOLDS = {
  3: [0, 33, 67],
  4: [0, 25, 50, 75],
  5: [0, 20, 40, 60, 80]
};
function serializeIconSet(rule, priority) {
  const iconCount = parseInt(rule.iconSet[0], 10);
  const attrs = [`iconSet="${rule.iconSet}"`];
  if (rule.showValue === false) {
    attrs.push(`showValue="0"`);
  }
  if (rule.reverse === true) {
    attrs.push(`reverse="1"`);
  }
  let cfvos;
  if (rule.thresholds) {
    cfvos = rule.thresholds.map((t) => serializeCfvo(t)).join("");
  } else {
    const defaults = DEFAULT_THRESHOLDS[iconCount];
    cfvos = defaults.map((val) => `<cfvo type="percent" val="${val}"/>`).join("");
  }
  return `<cfRule type="iconSet" priority="${priority}"><iconSet ${attrs.join(" ")}>${cfvos}</iconSet></cfRule>`;
}
function serializeRule(rule, registry, priority) {
  switch (rule.type) {
    case "cellIs":
      return { basic: serializeCellIs(rule, registry, priority), extended: "" };
    case "top10":
      return { basic: serializeTop10(rule, registry, priority), extended: "" };
    case "duplicateValues":
    case "uniqueValues":
      return { basic: serializeDuplicate(rule, registry, priority), extended: "" };
    case "colorScale":
      return { basic: serializeColorScale(rule, priority), extended: "" };
    case "dataBar":
      return serializeDataBar(rule, priority);
    case "iconSet":
      return { basic: serializeIconSet(rule, priority), extended: "" };
    default: {
      const _exhaustive = rule;
      void _exhaustive;
      return { basic: "", extended: "" };
    }
  }
}
function serializeConditionalFormatting(rules, registry) {
  if (!rules || rules.length === 0) {
    return { xml: "", extLst: "" };
  }
  let priority = 1;
  const xmlParts = [];
  const extEntries = [];
  for (const entry of rules) {
    const ruleParts = [];
    for (const rule of entry.rules) {
      const result = serializeRule(rule, registry, priority);
      ruleParts.push(result.basic);
      if (result.extended) {
        extEntries.push(
          `<x14:conditionalFormatting xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">${result.extended}<xm:sqref>${entry.ref}</xm:sqref></x14:conditionalFormatting>`
        );
      }
      priority += 1;
    }
    xmlParts.push(`<conditionalFormatting sqref="${entry.ref}">${ruleParts.join("")}</conditionalFormatting>`);
  }
  let extLst = "";
  if (extEntries.length > 0) {
    extLst = `<extLst><ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:conditionalFormattings>${extEntries.join("")}</x14:conditionalFormattings></ext></extLst>`;
  }
  return { xml: xmlParts.join(""), extLst };
}

// src/serializers/shared-strings.ts
var SharedStringTable = class {
  map = /* @__PURE__ */ new Map();
  strings = [];
  referenceCount = 0;
  register(value) {
    const sanitized = sanitizeSharedString(value);
    this.referenceCount += 1;
    const existing = this.map.get(sanitized);
    if (existing !== void 0) {
      return existing;
    }
    const index = this.strings.length;
    this.strings.push(sanitized);
    this.map.set(sanitized, index);
    return index;
  }
  get count() {
    return this.referenceCount;
  }
  get uniqueCount() {
    return this.strings.length;
  }
  get values() {
    return this.strings;
  }
  toXml() {
    const parts = [
      XML_DECLARATION,
      `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.count}" uniqueCount="${this.uniqueCount}">`
    ];
    for (const value of this.strings) {
      const preserve = needsXmlSpacePreserve(value) ? ' xml:space="preserve"' : "";
      parts.push(`<si><t${preserve}>${escapeXml(value)}</t></si>`);
    }
    parts.push("</sst>");
    return parts.join("");
  }
};

// src/styles/font-serializer.ts
function serializeUnderline(underline) {
  if (!underline) {
    return "";
  }
  if (underline === true) {
    return '<u val="single"/>';
  }
  return `<u val="${escapeXml(underline)}"/>`;
}
function serializeFont(font) {
  const parts = ["<font>"];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.strikethrough) parts.push("<strike/>");
  const underline = serializeUnderline(font.underline);
  if (underline) parts.push(underline);
  if (font.vertAlign) parts.push(`<vertAlign val="${font.vertAlign}"/>`);
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) {
    parts.push(`<color ${serializeColorAttributes(font.color)}/>`);
  }
  parts.push(`<name val="${escapeXml(font.family)}"/>`);
  if (font.familyClassification !== void 0) {
    parts.push(`<family val="${font.familyClassification}"/>`);
  }
  if (font.charset !== void 0) {
    parts.push(`<charset val="${font.charset}"/>`);
  }
  if (font.scheme) {
    parts.push(`<scheme val="${font.scheme}"/>`);
  }
  parts.push("</font>");
  return parts.join("");
}
function serializeRichTextRunFont(font) {
  const parts = ["<rPr>"];
  if (font.bold) parts.push("<b/>");
  if (font.italic) parts.push("<i/>");
  if (font.strikethrough) parts.push("<strike/>");
  const underline = serializeUnderline(font.underline);
  if (underline) parts.push(underline);
  if (font.vertAlign) parts.push(`<vertAlign val="${font.vertAlign}"/>`);
  parts.push(`<sz val="${font.size}"/>`);
  if (font.color) {
    parts.push(`<color ${serializeColorAttributes(font.color)}/>`);
  }
  parts.push(`<rFont val="${escapeXml(font.family)}"/>`);
  if (font.charset !== void 0) {
    parts.push(`<charset val="${font.charset}"/>`);
  }
  parts.push("</rPr>");
  return parts.join("");
}

// src/styles/fill-serializer.ts
var NONE_FILL = { type: "pattern", patternType: "none" };
var GRAY125_FILL = { type: "pattern", patternType: "gray125" };
function serializeFill(fill) {
  if (fill.patternType === "none" || fill.patternType === "gray125") {
    return `<fill><patternFill patternType="${fill.patternType}"/></fill>`;
  }
  const patternType = fill.patternType ?? (fill.type === "pattern" ? "darkGray" : "solid");
  const parts = [`<fill><patternFill patternType="${patternType}">`];
  if (fill.fgColor) {
    parts.push(`<fgColor ${serializeColorAttributes(fill.fgColor)}/>`);
  }
  if (fill.type !== "solid" && fill.bgColor) {
    parts.push(`<bgColor ${serializeColorAttributes(fill.bgColor)}/>`);
  }
  parts.push("</patternFill></fill>");
  return parts.join("");
}
function serializeDxfFill(fill) {
  if (!fill?.fgColor && !fill?.bgColor) {
    return "";
  }
  const color = fill.bgColor ?? fill.fgColor;
  if (!color) {
    return "";
  }
  return `<fill><patternFill><bgColor ${serializeColorAttributes(color)}/></patternFill></fill>`;
}

// src/styles/border-serializer.ts
var EMPTY_BORDER = {};
function serializeEdge(name, edge) {
  if (!edge) {
    return "";
  }
  const parts = [`<${name} style="${edge.style}">`];
  if (edge.color) {
    parts.push(`<color ${serializeColorAttributes(edge.color)}/>`);
  }
  parts.push(`</${name}>`);
  return parts.join("");
}
function serializeBorder(border) {
  const diagonalUp = border.diagonal?.direction === "up" || border.diagonal?.direction === "both" ? ` diagonalUp="1"` : "";
  const diagonalDown = border.diagonal?.direction === "down" || border.diagonal?.direction === "both" ? ` diagonalDown="1"` : "";
  const left = serializeEdge("left", border.left);
  const right = serializeEdge("right", border.right);
  const top = serializeEdge("top", border.top);
  const bottom = serializeEdge("bottom", border.bottom);
  const diagonal = serializeEdge("diagonal", border.diagonal);
  if (!diagonalUp && !diagonalDown && !left && !right && !top && !bottom && !diagonal) {
    return "<border/>";
  }
  return [
    `<border${diagonalUp}${diagonalDown}>`,
    left,
    right,
    top,
    bottom,
    diagonal,
    `</border>`
  ].join("");
}
function serializeDxfBorder(border) {
  if (!border) {
    return "";
  }
  return serializeBorder(border);
}

// src/styles/numfmt-registry.ts
var BUILT_IN_FORMATS = /* @__PURE__ */ new Map([
  ["General", 0],
  ["0", 1],
  ["0.00", 2],
  ["#,##0", 3],
  ["#,##0.00", 4],
  ["0%", 9],
  ["0.00%", 10],
  ["0.00E+00", 11],
  ["# ?/?", 12],
  ["# ??/??", 13],
  ["mm-dd-yy", 14],
  ["d-mmm-yy", 15],
  ["d-mmm", 16],
  ["mmm-yy", 17],
  ["h:mm AM/PM", 18],
  ["h:mm:ss AM/PM", 19],
  ["h:mm", 20],
  ["h:mm:ss", 21],
  ["m/d/yy h:mm", 22],
  ["#,##0 ;(#,##0)", 37],
  ["#,##0 ;[Red](#,##0)", 38],
  ["#,##0.00;(#,##0.00)", 39],
  ["#,##0.00;[Red](#,##0.00)", 40],
  ["mm:ss", 45],
  ["[h]:mm:ss", 46],
  ["mmss.0", 47],
  ["##0.0E+0", 48],
  ["@", 49]
]);
var NumFmtRegistry = class {
  customFormats = /* @__PURE__ */ new Map();
  nextCustomId = 164;
  register(formatCode) {
    if (!formatCode) {
      return 0;
    }
    const builtIn = BUILT_IN_FORMATS.get(formatCode);
    if (builtIn !== void 0) {
      return builtIn;
    }
    const existing = this.customFormats.get(formatCode);
    if (existing !== void 0) {
      return existing;
    }
    const id = this.nextCustomId;
    this.customFormats.set(formatCode, id);
    this.nextCustomId += 1;
    return id;
  }
  toXml() {
    if (this.customFormats.size === 0) {
      return "";
    }
    const parts = [`<numFmts count="${this.customFormats.size}">`];
    for (const [formatCode, id] of this.customFormats) {
      parts.push(`<numFmt numFmtId="${id}" formatCode="${escapeXml(formatCode)}"/>`);
    }
    parts.push(`</numFmts>`);
    return parts.join("");
  }
};

// src/styles/style-registry.ts
function fontKey(font) {
  return [
    font.family,
    font.size,
    font.bold ? 1 : 0,
    font.italic ? 1 : 0,
    font.underline === true ? "single" : font.underline ?? "",
    font.strikethrough ? 1 : 0,
    font.color ?? "",
    font.vertAlign ?? "",
    font.charset ?? "",
    font.familyClassification ?? "",
    font.scheme ?? ""
  ].join("|");
}
function fillKey(fill) {
  return [
    fill.type,
    fill.patternType ?? "",
    fill.fgColor ?? "",
    fill.bgColor ?? "",
    fill.color ?? ""
  ].join("|");
}
function edgeKey(edge) {
  if (!edge) {
    return "";
  }
  return `${edge.style}:${edge.color ?? ""}`;
}
function borderKey(border) {
  return [
    edgeKey(border.left),
    edgeKey(border.right),
    edgeKey(border.top),
    edgeKey(border.bottom),
    border.diagonal ? `${border.diagonal.style}:${border.diagonal.color ?? ""}:${border.diagonal.direction ?? ""}` : ""
  ].join("|");
}
function alignmentKey(alignment) {
  if (!alignment) {
    return "";
  }
  return [
    alignment.horizontal ?? "",
    alignment.vertical ?? "",
    alignment.wrapText ? 1 : 0,
    alignment.textRotation ?? "",
    alignment.indent ?? "",
    alignment.shrinkToFit ? 1 : 0,
    alignment.readingOrder ?? ""
  ].join("|");
}
function protectionKey(protection) {
  if (!protection) {
    return "";
  }
  return [
    protection.locked === void 0 ? "" : protection.locked ? 1 : 0,
    protection.hidden === void 0 ? "" : protection.hidden ? 1 : 0
  ].join("|");
}
function cellXfKey(xf) {
  return [
    xf.numFmtId,
    xf.fontId,
    xf.fillId,
    xf.borderId,
    xf.xfId,
    alignmentKey(xf.alignment),
    protectionKey(xf.protection)
  ].join("|");
}
function styleKey(style) {
  return [
    style.numberFormat ?? "",
    style.font ? fontKey({
      family: style.font.family ?? "",
      size: style.font.size ?? 0,
      bold: style.font.bold,
      italic: style.font.italic,
      underline: style.font.underline,
      strikethrough: style.font.strikethrough,
      color: style.font.color,
      vertAlign: style.font.vertAlign,
      charset: style.font.charset
    }) : "",
    style.fill ? fillKey(style.fill) : "",
    style.border ? borderKey(style.border) : "",
    alignmentKey(style.alignment),
    protectionKey(style.protection)
  ].join("||");
}
var DEFAULT_FONT_FAMILY = "Calibri";
var DEFAULT_FONT_SIZE = 11;
var DEFAULT_FONT = {
  family: DEFAULT_FONT_FAMILY,
  size: DEFAULT_FONT_SIZE,
  color: "theme:1",
  familyClassification: 2,
  scheme: "minor"
};
var DEFAULT_XF = {
  numFmtId: 0,
  fontId: 0,
  fillId: 0,
  borderId: 0,
  xfId: 0
};
function serializeAlignment(alignment) {
  if (!alignment) {
    return "";
  }
  const attributes = [];
  if (alignment.horizontal) attributes.push(`horizontal="${alignment.horizontal}"`);
  if (alignment.vertical) attributes.push(`vertical="${alignment.vertical}"`);
  if (alignment.wrapText) attributes.push(`wrapText="1"`);
  if (alignment.textRotation !== void 0) attributes.push(`textRotation="${alignment.textRotation}"`);
  if (alignment.indent !== void 0) attributes.push(`indent="${alignment.indent}"`);
  if (alignment.shrinkToFit) attributes.push(`shrinkToFit="1"`);
  if (alignment.readingOrder !== void 0) attributes.push(`readingOrder="${alignment.readingOrder}"`);
  return attributes.length > 0 ? `<alignment ${attributes.join(" ")}/>` : "";
}
function serializeProtection(protection) {
  if (!protection) {
    return "";
  }
  const attributes = [];
  if (protection.locked !== void 0) attributes.push(`locked="${protection.locked ? 1 : 0}"`);
  if (protection.hidden !== void 0) attributes.push(`hidden="${protection.hidden ? 1 : 0}"`);
  return attributes.length > 0 ? `<protection ${attributes.join(" ")}/>` : "";
}
function serializeCellXf(xf) {
  const attributes = [
    `numFmtId="${xf.numFmtId}"`,
    `fontId="${xf.fontId}"`,
    `fillId="${xf.fillId}"`,
    `borderId="${xf.borderId}"`
  ];
  if (xf.xfId !== 0) {
    attributes.push(`xfId="${xf.xfId}"`);
  }
  const alignment = serializeAlignment(xf.alignment);
  const protection = serializeProtection(xf.protection);
  if (!alignment && !protection) {
    return `<xf ${attributes.join(" ")}/>`;
  }
  return `<xf ${attributes.join(" ")}>${alignment}${protection}</xf>`;
}
function normalizeFont2(font, defaults) {
  return {
    family: font?.family ?? defaults?.font?.family ?? DEFAULT_FONT_FAMILY,
    size: font?.size ?? defaults?.font?.size ?? DEFAULT_FONT_SIZE,
    bold: font?.bold,
    italic: font?.italic,
    underline: font?.underline,
    strikethrough: font?.strikethrough,
    color: font?.color,
    vertAlign: font?.vertAlign,
    charset: font?.charset
  };
}
var StyleRegistry = class {
  constructor(defaults) {
    this.defaults = defaults;
    const seededDefaultFont = {
      ...DEFAULT_FONT,
      family: defaults?.font?.family ?? DEFAULT_FONT.family,
      size: defaults?.font?.size ?? DEFAULT_FONT.size
    };
    this.defaultFontFamily = seededDefaultFont.family;
    this.defaultFontSize = seededDefaultFont.size;
    this.fontRegistry = new ComponentRegistry([seededDefaultFont], fontKey);
    this.fillRegistry = new ComponentRegistry([NONE_FILL, GRAY125_FILL], fillKey);
    this.borderRegistry = new ComponentRegistry([EMPTY_BORDER], borderKey);
    this.cellXfRegistry = new ComponentRegistry([DEFAULT_XF], cellXfKey);
    this.dxfRegistry = new ComponentRegistry([], styleKey);
  }
  fontRegistry;
  fillRegistry;
  borderRegistry;
  numFmtRegistry = new NumFmtRegistry();
  cellXfRegistry;
  dxfRegistry;
  styleIndexCache = /* @__PURE__ */ new WeakMap();
  dxfIndexCache = /* @__PURE__ */ new WeakMap();
  defaultFontFamily;
  defaultFontSize;
  registerStyle(styleInput, cellValue) {
    const style = resolveCellStyle(styleInput, cellValue);
    return this.registerResolvedStyle(style);
  }
  registerResolvedStyle(style) {
    if (!style) {
      return 0;
    }
    const cached = this.styleIndexCache.get(style);
    if (cached !== void 0) {
      return cached;
    }
    const numFmtId = this.numFmtRegistry.register(style.numberFormat);
    const fontDef = normalizeFont2(style.font, this.defaults);
    const fontId = fontDef.family === this.defaultFontFamily && fontDef.size === this.defaultFontSize && !fontDef.bold && !fontDef.italic && !fontDef.underline && !fontDef.strikethrough && !fontDef.color && !fontDef.vertAlign && fontDef.charset === void 0 ? 0 : this.fontRegistry.register(fontDef);
    const fillDef = normalizeFill(style.fill);
    const fillId = fillDef ? this.fillRegistry.register(fillDef) : 0;
    const borderId = style.border ? this.borderRegistry.register(style.border) : 0;
    const xf = {
      numFmtId,
      fontId,
      fillId,
      borderId,
      xfId: 0,
      alignment: style.alignment,
      protection: style.protection
    };
    const index = this.cellXfRegistry.register(xf);
    this.styleIndexCache.set(style, index);
    return index;
  }
  registerDxf(styleInput) {
    const style = resolveCellStyle(styleInput, void 0);
    if (!style) {
      return 0;
    }
    const cached = this.dxfIndexCache.get(style);
    if (cached !== void 0) {
      return cached;
    }
    const index = this.dxfRegistry.register(style);
    this.dxfIndexCache.set(style, index);
    return index;
  }
  getDefaultFont() {
    return this.fontRegistry.values[0] ?? DEFAULT_FONT;
  }
  get cellStyleCount() {
    return this.cellXfRegistry.size;
  }
  get differentialStyleCount() {
    return this.dxfRegistry.values.length;
  }
  toXml() {
    const dxfs = this.dxfRegistry.values;
    return [
      XML_DECLARATION,
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
      this.numFmtRegistry.toXml(),
      `<fonts count="${this.fontRegistry.size}">${this.fontRegistry.values.map((font) => serializeFont(font)).join("")}</fonts>`,
      `<fills count="${this.fillRegistry.size}">${this.fillRegistry.values.map((fill) => serializeFill(fill)).join("")}</fills>`,
      `<borders count="${this.borderRegistry.size}">${this.borderRegistry.values.map((border) => serializeBorder(border)).join("")}</borders>`,
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`,
      `<cellXfs count="${this.cellXfRegistry.size}">${this.cellXfRegistry.values.map((xf) => serializeCellXf(xf)).join("")}</cellXfs>`,
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`,
      dxfs.length === 0 ? `<dxfs count="0"/>` : `<dxfs count="${dxfs.length}">${dxfs.map((style) => {
        const font = style.font ? `<font>${serializeFont(normalizeFont2(style.font, this.defaults)).replace(/^<font>|<\/font>$/g, "")}</font>` : "";
        const fill = serializeDxfFill(normalizeFill(style.fill));
        const border = serializeDxfBorder(style.border);
        const numFmt = style.numberFormat ? `<numFmt numFmtId="0" formatCode="${escapeXml(style.numberFormat)}"/>` : "";
        const alignment = serializeAlignment(style.alignment);
        return `<dxf>${numFmt}${font}${fill}${border}${alignment}</dxf>`;
      }).join("")}</dxfs>`,
      `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>`,
      `</styleSheet>`
    ].join("");
  }
};

// src/quality/accessibility.ts
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function cloneValue(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (value && typeof value === "object") {
    const cloned = {};
    for (const [key, entry] of Object.entries(value)) {
      cloned[key] = cloneValue(entry);
    }
    return cloned;
  }
  return value;
}
function getAccessibilityConfig(document) {
  if (!document.accessible || document.accessible === true) {
    return void 0;
  }
  return document.accessible;
}
function getEffectiveTitle(document, config) {
  return config?.title ?? document.meta?.title;
}
function getEffectiveLanguage(document, config) {
  return config?.language ?? document.meta?.language;
}
function collectSummary(document) {
  return {
    errors: 0,
    warnings: 0,
    infos: 0,
    titleSet: false,
    languageSet: false,
    sheets: document.sheets.length,
    tablesChecked: 0,
    tablesWithHeaders: 0,
    tablesWithoutHeaders: 0,
    imagesChecked: 0,
    imagesWithAlt: 0,
    imagesWithoutAlt: 0
  };
}
function resolveCellText(cell) {
  if (!cell) {
    return void 0;
  }
  const value = cell.formula && typeof cell.formula === "object" ? cell.formula.cachedValue : cell.value;
  if (isNonEmptyString(value)) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    const text = value.map((run) => run.text).join("").trim();
    return text.length > 0 ? text : void 0;
  }
  if (value && typeof value === "object" && "error" in value) {
    return value.error;
  }
  return void 0;
}
function hasHeaderMetadata(table) {
  return Boolean(table.columns?.length && table.columns.every((column) => isNonEmptyString(column.name)));
}
function getHeaderNamesFromFirstRow(sheet, table) {
  const range = parseRangeRef(table.ref);
  const row = sheet.rows[range.startRow];
  const names = [];
  for (let column = range.startCol; column <= range.endCol; column += 1) {
    const text = resolveCellText(row?.cells[column]);
    if (!text) {
      return void 0;
    }
    names.push(text);
  }
  return names;
}
function summarizeIssue(summary, severity) {
  if (severity === "error") {
    summary.errors += 1;
  } else if (severity === "warning") {
    summary.warnings += 1;
  } else {
    summary.infos += 1;
  }
}
function validateSpreadsheetAccessibility(document) {
  const config = getAccessibilityConfig(document);
  const summary = collectSummary(document);
  const issues = [];
  const title = getEffectiveTitle(document, config);
  if (isNonEmptyString(title)) {
    summary.titleSet = true;
  } else {
    summarizeIssue(summary, "warning");
    issues.push({
      code: "document.title_missing",
      severity: "warning",
      message: "Workbook title is missing.",
      suggestedFix: "Set meta.title or accessible.title to a descriptive workbook title.",
      path: "meta.title"
    });
  }
  const language = getEffectiveLanguage(document, config);
  if (isNonEmptyString(language)) {
    summary.languageSet = true;
  } else {
    summarizeIssue(summary, "warning");
    issues.push({
      code: "document.language_missing",
      severity: "warning",
      message: "Workbook language is missing.",
      suggestedFix: "Set meta.language or accessible.language to a BCP 47 language tag.",
      path: "meta.language"
    });
  }
  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.tables?.forEach((table, tableIndex) => {
      summary.tablesChecked += 1;
      if (hasHeaderMetadata(table)) {
        summary.tablesWithHeaders += 1;
        return;
      }
      summary.tablesWithoutHeaders += 1;
      summarizeIssue(summary, "warning");
      issues.push({
        code: "table.header_missing",
        severity: "warning",
        message: `Table ${table.name} is missing header metadata.`,
        path: `sheets[${sheetIndex}].tables[${tableIndex}]`,
        suggestedFix: "Populate table.columns with the first row headers or provide named columns."
      });
    });
    sheet.images?.forEach((image, imageIndex) => {
      summary.imagesChecked += 1;
      if (isNonEmptyString(image.description)) {
        summary.imagesWithAlt += 1;
        return;
      }
      summary.imagesWithoutAlt += 1;
      summarizeIssue(summary, "warning");
      issues.push({
        code: "image.alt_missing",
        severity: "warning",
        message: `Image ${image.name ?? imageIndex + 1} is missing alternative text.`,
        path: `sheets[${sheetIndex}].images[${imageIndex}]`,
        suggestedFix: "Set image.description to a concise alt text description."
      });
    });
  });
  return {
    valid: issues.length === 0,
    format: "xlsx",
    standard: "WCAG 2.1 AA",
    summary,
    issues
  };
}
function remediateSpreadsheetAccessibility(document) {
  const before = validateSpreadsheetAccessibility(document);
  const clone = cloneValue(document);
  const config = getAccessibilityConfig(clone);
  const fixesApplied = [];
  clone.meta ??= {};
  if (!isNonEmptyString(clone.meta.title)) {
    const title = getEffectiveTitle(document, config);
    if (isNonEmptyString(title)) {
      clone.meta.title = title;
      fixesApplied.push({
        code: "document.title_missing",
        action: "propagate workbook title into meta.title",
        applied: true,
        target: "meta.title"
      });
    }
  }
  if (!isNonEmptyString(clone.meta.language)) {
    const language = getEffectiveLanguage(document, config);
    if (isNonEmptyString(language)) {
      clone.meta.language = language;
      fixesApplied.push({
        code: "document.language_missing",
        action: "propagate workbook language into meta.language",
        applied: true,
        target: "meta.language"
      });
    }
  }
  clone.sheets.forEach((sheet, sheetIndex) => {
    sheet.tables?.forEach((table, tableIndex) => {
      if (hasHeaderMetadata(table)) {
        return;
      }
      const names = getHeaderNamesFromFirstRow(sheet, table);
      if (!names) {
        return;
      }
      table.columns = names.map((name, index) => ({
        ...table.columns?.[index],
        name
      }));
      fixesApplied.push({
        code: "table.header_missing",
        action: "copy the existing first row into table.columns metadata",
        applied: true,
        target: `sheets[${sheetIndex}].tables[${tableIndex}]`
      });
    });
    sheet.images?.forEach((image, imageIndex) => {
      if (isNonEmptyString(image.description)) {
        return;
      }
      image.description = "Image";
      fixesApplied.push({
        code: "image.alt_missing",
        action: "apply the default alt text placeholder",
        applied: true,
        target: `sheets[${sheetIndex}].images[${imageIndex}]`
      });
    });
  });
  const after = validateSpreadsheetAccessibility(clone);
  return {
    reportBefore: before,
    reportAfter: after,
    fixesApplied,
    document: clone
  };
}

// src/charts/chart-data.ts
function splitQualifiedReference(reference, defaultSheetName) {
  const trimmed = reference.trim();
  const separator = trimmed.lastIndexOf("!");
  if (separator === -1) {
    return { sheetName: defaultSheetName, range: trimmed };
  }
  const rawSheetName = trimmed.slice(0, separator);
  const range = trimmed.slice(separator + 1);
  if (!rawSheetName || !range) {
    return void 0;
  }
  const sheetName = rawSheetName.startsWith("'") && rawSheetName.endsWith("'") ? rawSheetName.slice(1, -1).replaceAll("''", "'") : rawSheetName;
  return { sheetName, range };
}
function resolveChartReference(document, defaultSheetName, reference) {
  const qualified = splitQualifiedReference(reference, defaultSheetName);
  if (!qualified) {
    return void 0;
  }
  const sheet = document.sheets.find((candidate) => candidate.name === qualified.sheetName);
  if (!sheet) {
    return void 0;
  }
  let range;
  try {
    range = parseRangeRef(qualified.range.toUpperCase());
  } catch {
    return void 0;
  }
  const cells = [];
  const lastPopulatedRow = Math.min(range.endRow, sheet.rows.length - 1);
  for (let row = range.startRow; row <= lastPopulatedRow; row += 1) {
    const rowCells = sheet.rows[row]?.cells;
    if (!rowCells) {
      continue;
    }
    const lastPopulatedColumn = Math.min(range.endCol, rowCells.length - 1);
    for (let col = range.startCol; col <= lastPopulatedColumn; col += 1) {
      cells.push(rowCells[col]);
    }
  }
  return {
    cells,
    cellCount: (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1)
  };
}
function cellHasChartValue(cell) {
  if (!cell) {
    return false;
  }
  if (cell.formula !== void 0) {
    return true;
  }
  if (Array.isArray(cell.value)) {
    return cell.value.some((run) => run.text.length > 0);
  }
  return cell.value !== void 0 && cell.value !== null && cell.value !== "";
}
function isChartSeriesEmpty(document, defaultSheetName, valuesReference) {
  if (valuesReference.trim() === "") {
    return true;
  }
  const resolved = resolveChartReference(document, defaultSheetName, valuesReference);
  return resolved !== void 0 && resolved.cells.every((cell) => !cellHasChartValue(cell));
}
function resolveChartSeriesName(document, defaultSheetName, nameReference) {
  const resolved = resolveChartReference(document, defaultSheetName, nameReference);
  if (!resolved || resolved.cellCount !== 1) {
    return void 0;
  }
  const value = resolved.cells[0]?.value;
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((run) => run.text).join("");
  }
  return void 0;
}

// src/layout/row-height.ts
function resolveSheetStyleInput(sheet, rowIndex) {
  if (rowIndex === 0) {
    return sheet.styling?.headerRow;
  }
  return (rowIndex + 1) % 2 === 0 ? sheet.styling?.alternateRows?.even : sheet.styling?.alternateRows?.odd;
}
function estimateRowHeight(row, rowIndex, sheet, columnWidths, defaults) {
  if (row.height !== void 0) {
    return row.height;
  }
  let maxHeight = defaults?.rowHeight ?? 15;
  let adjusted = false;
  for (let columnIndex = 0; columnIndex < row.cells.length; columnIndex += 1) {
    const cell = row.cells[columnIndex];
    const style = resolveCellStyle(cell.style, cell.value, resolveSheetStyleInput(sheet, rowIndex));
    if (!style?.alignment?.wrapText) continue;
    const text = stringifyDisplayValue(cell.value, style);
    if (!text) continue;
    const charsPerLine = Math.max(1, Math.floor((columnWidths[columnIndex] ?? defaults?.columnWidth ?? 8.43) * 1.6));
    const lines = Math.ceil(text.length / charsPerLine);
    if (lines <= 1) continue;
    const fontSize = style.font?.size ?? defaults?.font?.size ?? 11;
    const estimatedHeight = Math.min(lines * fontSize * 1.4, 409);
    if (estimatedHeight <= (defaults?.rowHeight ?? 15)) continue;
    maxHeight = Math.max(maxHeight, estimatedHeight);
    adjusted = true;
  }
  return adjusted ? maxHeight : void 0;
}

// src/layout/print-layout.ts
var POINTS_PER_INCH = 72;
var DEFAULT_COLUMN_WIDTH = 8.43;
var DEFAULT_ROW_HEIGHT = 15;
var DEFAULT_CHART_HEIGHT_PIXELS = 300;
var PIXELS_PER_ROW = 20;
var PAPER_DIMENSIONS_INCHES = {
  1: [8.5, 11],
  // Letter
  5: [8.5, 14],
  // Legal
  8: [11.69, 16.54],
  // A3
  9: [8.27, 11.69],
  // A4
  11: [5.83, 8.27]
  // A5
};
function paperDimensions(pageSetup) {
  const dimensions = PAPER_DIMENSIONS_INCHES[pageSetup?.paperSize ?? 1] ?? PAPER_DIMENSIONS_INCHES[1];
  return pageSetup?.orientation === "landscape" ? [dimensions[1], dimensions[0]] : dimensions;
}
function columnWidthToPoints(width) {
  const pixels = Math.floor((256 * width + Math.floor(128 / 7)) / 256 * 7) + 5;
  return pixels * 0.75;
}
function printAreaLastColumn(sheet) {
  const ref = sheet.pageSetup?.printArea;
  if (!ref) return void 0;
  try {
    return parseRangeRef(ref).endCol;
  } catch {
    return void 0;
  }
}
function estimatePrintLayout(sheet, defaults) {
  const columnLayout = computeColumnLayout(sheet, defaults);
  const lastPrintColumn = printAreaLastColumn(sheet);
  const usedColumnCount = lastPrintColumn === void 0 ? columnLayout.columnWidths.length : Math.max(columnLayout.columnWidths.length, lastPrintColumn + 1);
  const printableColumnWidths = Array.from(
    { length: usedColumnCount },
    (_unused, index) => columnLayout.columnWidths[index] ?? sheet.columns?.[index]?.width ?? defaults?.columnWidth ?? DEFAULT_COLUMN_WIDTH
  );
  const contentWidthPoints = printableColumnWidths.reduce((total, width, index) => {
    if (sheet.columns?.[index]?.hidden) return total;
    return total + columnWidthToPoints(width);
  }, 0);
  const [paperWidth, paperHeight] = paperDimensions(sheet.pageSetup);
  const leftMargin = sheet.pageSetup?.margins?.left ?? 0.7;
  const rightMargin = sheet.pageSetup?.margins?.right ?? 0.7;
  const topMargin = sheet.pageSetup?.margins?.top ?? 0.75;
  const bottomMargin = sheet.pageSetup?.margins?.bottom ?? 0.75;
  const printableWidthPoints = Math.max(1, paperWidth - leftMargin - rightMargin) * POINTS_PER_INCH;
  const printableHeightPoints = Math.max(1, paperHeight - topMargin - bottomMargin) * POINTS_PER_INCH;
  const requestedScale = sheet.pageSetup?.scale === void 0 ? 1 : sheet.pageSetup.scale / 100;
  const fitWidthScale = sheet.pageSetup?.fitToWidth === 1 && contentWidthPoints > 0 ? Math.min(1, printableWidthPoints / contentWidthPoints) : 1;
  const rowHeights = sheet.rows.map((row, rowIndex) => {
    if (row.hidden) return 0;
    return estimateRowHeight(row, rowIndex, sheet, columnLayout.columnWidths, defaults) ?? defaults?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  });
  return {
    columnWidths: printableColumnWidths,
    rowHeights,
    contentWidthPoints,
    printableWidthPoints,
    printableHeightPoints,
    scale: Math.min(requestedScale, fitWidthScale)
  };
}
function sheetExceedsPrintableWidth(sheet, defaults) {
  const layout = estimatePrintLayout(sheet, defaults);
  return layout.contentWidthPoints * layout.scale > layout.printableWidthPoints;
}
function rowTop(row, rowHeights, defaultHeight) {
  let top = 0;
  for (let index = 0; index < row; index += 1) {
    top += rowHeights[index] ?? defaultHeight;
  }
  return top;
}
function repeatedTitleHeight(sheet, rowHeights, defaultHeight) {
  const titles = sheet.pageSetup?.printTitles?.rows;
  if (!titles) return 0;
  let height = 0;
  for (let row = titles.start; row <= titles.end; row += 1) {
    height += rowHeights[row] ?? defaultHeight;
  }
  return height;
}
function chartCrossesEstimatedPageBreak(sheet, chart, defaults) {
  if (sheet.pageSetup?.fitToHeight === 1) return false;
  const layout = estimatePrintLayout(sheet, defaults);
  const defaultHeight = defaults?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const scaledPageHeight = layout.printableHeightPoints / Math.max(layout.scale, 0.1);
  const titleHeight = repeatedTitleHeight(sheet, layout.rowHeights, defaultHeight);
  const continuationHeight = Math.max(defaultHeight, scaledPageHeight - titleHeight);
  const start = rowTop(chart.anchor.from.row, layout.rowHeights, defaultHeight);
  const endRow = chart.anchor.to?.row ?? chart.anchor.from.row + Math.ceil((chart.height ?? DEFAULT_CHART_HEIGHT_PIXELS) / PIXELS_PER_ROW);
  const end = rowTop(endRow, layout.rowHeights, defaultHeight);
  if (end <= scaledPageHeight) return false;
  if (start < scaledPageHeight) return true;
  return Math.floor((start - scaledPageHeight) / continuationHeight) !== Math.floor((Math.max(start, end - 0.01) - scaledPageHeight) / continuationHeight);
}
function chartSafeRowBreaks(sheet, defaults) {
  if (sheet.pageSetup?.fitToHeight === 1) return [];
  const breakRows = /* @__PURE__ */ new Set();
  const fittedPageCount = sheet.pageSetup?.fitToHeight;
  if ((sheet.charts?.length ?? 0) === 0 && typeof fittedPageCount === "number" && fittedPageCount > 1 && sheet.rows.length > fittedPageCount) {
    const rowsPerPage = Math.ceil(sheet.rows.length / fittedPageCount);
    for (let page = 1; page < fittedPageCount; page += 1) {
      const breakRow = rowsPerPage * page;
      if (breakRow < sheet.rows.length) breakRows.add(breakRow);
    }
  }
  for (const chart of sheet.charts ?? []) {
    const followsData = chart.anchor.from.row >= sheet.rows.length;
    if (chart.anchor.from.row > 0 && (followsData || chartCrossesEstimatedPageBreak(sheet, chart, defaults))) {
      breakRows.add(chart.anchor.from.row);
    }
  }
  return [...breakRows].sort((left, right) => left - right);
}

// src/quality/lint.ts
var SHEET_NAME_MAX_LEN = 31;
var SHEET_NAME_ILLEGAL = /[\\/?*[\]:]/;
var RESERVED_SHEET_NAMES = /* @__PURE__ */ new Set(["history"]);
function computeSheetBounds(sheet) {
  const rowCount = sheet.rows.length;
  let colCount = sheet.columns?.length ?? 0;
  for (const row of sheet.rows) {
    if (row.cells.length > colCount) {
      colCount = row.cells.length;
    }
  }
  return { rowCount, colCount };
}
function lintSheetName(name, index, seen, issues) {
  const path = `sheets[${index}].name`;
  if (name.length > SHEET_NAME_MAX_LEN) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_TOO_LONG",
      message: `Sheet name "${name}" is ${name.length} characters; Excel allows at most ${SHEET_NAME_MAX_LEN}.`,
      path,
      suggestion: `Truncate to ${SHEET_NAME_MAX_LEN} characters.`
    });
  }
  if (SHEET_NAME_ILLEGAL.test(name)) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS",
      message: `Sheet name "${name}" contains characters Excel rejects (\\ / ? * [ ] :).`,
      path
    });
  }
  if (name.startsWith("'") || name.endsWith("'")) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_ILLEGAL_CHARS",
      message: `Sheet name "${name}" cannot start or end with an apostrophe.`,
      path
    });
  }
  const lower = name.toLowerCase();
  if (RESERVED_SHEET_NAMES.has(lower)) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_RESERVED",
      message: `Sheet name "${name}" is reserved by Excel (case-insensitive).`,
      path
    });
  }
  const prior = seen.get(lower);
  if (prior !== void 0) {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_SHEET_NAME_DUPLICATE",
      message: `Sheet name "${name}" duplicates sheets[${prior}] (Excel compares case-insensitively).`,
      path
    });
  } else {
    seen.set(lower, index);
  }
}
function lintAutoFilter(sheet, index, bounds, issues) {
  const af = sheet.autoFilter;
  if (!af || af === true) return;
  const path = `sheets[${index}].autoFilter.ref`;
  let parsed;
  try {
    parsed = parseRangeRef(af.ref);
  } catch {
    issues.push({
      severity: "error",
      code: "XLSX_LINT_AUTOFILTER_INVALID_REF",
      message: `autoFilter ref "${af.ref}" is not a valid A1-style range.`,
      path
    });
    return;
  }
  if (parsed.endRow >= bounds.rowCount || parsed.endCol >= bounds.colCount || parsed.startRow < 0 || parsed.startCol < 0) {
    issues.push({
      severity: "warning",
      code: "XLSX_LINT_AUTOFILTER_OUT_OF_BOUNDS",
      message: `autoFilter ref "${af.ref}" extends past sheet bounds (rows=${bounds.rowCount}, cols=${bounds.colCount}). Excel may discard or truncate the filter.`,
      path
    });
  }
}
function lintConditionalFormatting(sheet, index, bounds, issues) {
  const cfList = sheet.conditionalFormatting;
  if (!cfList || cfList.length === 0) return;
  cfList.forEach((cf, cfIndex) => {
    const refs = cf.ref.split(/\s+/).filter(Boolean);
    refs.forEach((ref, refIndex) => {
      const path = `sheets[${index}].conditionalFormatting[${cfIndex}].ref[${refIndex}]`;
      let parsed;
      try {
        parsed = parseRangeRef(ref);
      } catch {
        issues.push({
          severity: "error",
          code: "XLSX_LINT_CF_REF_INVALID",
          message: `Conditional-formatting ref "${ref}" is not a valid A1-style range.`,
          path
        });
        return;
      }
      if (parsed.endRow >= bounds.rowCount || parsed.endCol >= bounds.colCount || parsed.startRow < 0 || parsed.startCol < 0) {
        issues.push({
          severity: "warning",
          code: "XLSX_LINT_CF_REF_OUT_OF_BOUNDS",
          message: `Conditional-formatting ref "${ref}" extends past sheet bounds (rows=${bounds.rowCount}, cols=${bounds.colCount}).`,
          path
        });
      }
    });
    cf.rules.forEach((rule, ruleIndex) => {
      if (rule.type !== "cellIs") return;
      const isRange = rule.operator === "between" || rule.operator === "notBetween";
      const isTuple = Array.isArray(rule.formula);
      if (isRange && !isTuple) {
        issues.push({
          severity: "error",
          code: "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE",
          message: `cellIs rule with operator "${rule.operator}" requires a [lower, upper] tuple formula; got a string.`,
          path: `sheets[${index}].conditionalFormatting[${cfIndex}].rules[${ruleIndex}].formula`,
          suggestion: "Pass formula as `[lowerExpr, upperExpr]`."
        });
      } else if (!isRange && isTuple) {
        issues.push({
          severity: "error",
          code: "XLSX_LINT_CF_BETWEEN_NEEDS_TUPLE",
          message: `cellIs rule with operator "${rule.operator}" requires a single formula string; got a tuple.`,
          path: `sheets[${index}].conditionalFormatting[${cfIndex}].rules[${ruleIndex}].formula`
        });
      }
    });
  });
}
function lintColumnWidths(document, issues) {
  const defaultColumnWidth = document.defaults?.columnWidth;
  if (defaultColumnWidth !== void 0 && defaultColumnWidth > MAX_EXCEL_COLUMN_WIDTH) {
    issues.push({
      severity: "warning",
      code: "XLSX_LINT_COLUMN_WIDTH_CAPPED",
      message: `Default column width ${defaultColumnWidth} exceeds Excel's maximum of ${MAX_EXCEL_COLUMN_WIDTH}; output is capped at ${MAX_EXCEL_COLUMN_WIDTH}.`,
      path: "defaults.columnWidth",
      suggestion: `Use a column width no greater than ${MAX_EXCEL_COLUMN_WIDTH}.`
    });
  }
  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.columns?.forEach((column, columnIndex) => {
      if ((column.width ?? 0) <= MAX_EXCEL_COLUMN_WIDTH) {
        return;
      }
      issues.push({
        severity: "warning",
        code: "XLSX_LINT_COLUMN_WIDTH_CAPPED",
        message: `Column width ${column.width} exceeds Excel's maximum of ${MAX_EXCEL_COLUMN_WIDTH}; output is capped at ${MAX_EXCEL_COLUMN_WIDTH}.`,
        path: `sheets[${sheetIndex}].columns[${columnIndex}].width`,
        suggestion: `Use a column width no greater than ${MAX_EXCEL_COLUMN_WIDTH}.`
      });
    });
  });
}
function lintCharts(document, issues) {
  document.sheets.forEach((sheet, sheetIndex) => {
    sheet.charts?.forEach((chart, chartIndex) => {
      if (chartCrossesEstimatedPageBreak(sheet, chart, document.defaults)) {
        issues.push({
          severity: "warning",
          code: "XLSX_LINT_CHART_CROSSES_PAGE_BREAK",
          message: "Chart anchor crosses an estimated vertical print-page break and may be split when printed.",
          path: `sheets[${sheetIndex}].charts[${chartIndex}].anchor`,
          suggestion: "Move the chart below the break, reduce its height, or use fitToHeight=1."
        });
      }
      chart.series.forEach((series, seriesIndex) => {
        if (!isChartSeriesEmpty(document, sheet.name, series.values)) {
          return;
        }
        issues.push({
          severity: "warning",
          code: "XLSX_LINT_CHART_EMPTY_SERIES",
          message: series.values.trim() === "" ? "Chart series has no value range; output contains an explicit empty placeholder." : `Chart series value range "${series.values}" contains only empty cells; output contains an explicit empty cache placeholder.`,
          path: `sheets[${sheetIndex}].charts[${chartIndex}].series[${seriesIndex}].values`,
          suggestion: "Populate the referenced cells or remove the empty series."
        });
      });
    });
  });
}
function lintSpreadsheetDocument(document) {
  const issues = [];
  const seenNames = /* @__PURE__ */ new Map();
  lintColumnWidths(document, issues);
  document.sheets.forEach((sheet, index) => {
    lintSheetName(sheet.name, index, seenNames, issues);
    const bounds = computeSheetBounds(sheet);
    lintAutoFilter(sheet, index, bounds, issues);
    lintConditionalFormatting(sheet, index, bounds, issues);
    if (sheetExceedsPrintableWidth(sheet, document.defaults)) {
      issues.push({
        severity: "warning",
        code: "XLSX_LINT_WIDE_PRINT_RANGE",
        message: "The used columns exceed the printable page width and may be clipped or split into orphaned column groups.",
        path: `sheets[${index}].pageSetup`,
        suggestion: "Set pageSetup.fitToWidth=1 or use landscape orientation."
      });
    }
  });
  lintCharts(document, issues);
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

// src/quality/shared-quality.ts
function mapFindingCode(code) {
  switch (code) {
    case "ORPHAN_RELATIONSHIP":
    case "MISSING_WORKSHEET_PART":
      return "XLSX_RELATIONSHIP_TARGET_MISSING";
    case "DUPLICATE_RELATIONSHIP_ID":
      return "SHARED_RID_NOT_UNIQUE";
    case "STYLE_INDEX_OOB":
      return "XLSX_STYLE_INDEX_OOB";
    case "SHARED_STRING_INDEX_OOB":
      return "XLSX_SHARED_STRING_INDEX_OOB";
    case "SHEET_NAME_INVALID":
      return "XLSX_SHEET_NAME_INVALID";
    case "DUPLICATE_SHEET_NAME":
      return "XLSX_DUPLICATE_SHEET_NAME";
    case "FORMULA_CACHED_VALUE_MISSING":
      return "XLSX_FORMULA_CACHED_VALUE_MISSING";
    case "MERGE_OVERLAP":
      return "XLSX_MERGE_OVERLAP";
    case "DEFINED_NAME_INVALID":
      return "XLSX_NAMED_RANGE_DEAD_REF";
    case "MISSING_CONTENT_TYPE":
      return "SHARED_CONTENT_TYPE_MISSING";
    case "EXTRA_CONTENT_TYPE":
      return "SHARED_CONTENT_TYPE_UNEXPECTED";
    case "BROKEN_TABLE_RELATIONSHIP":
      return "XLSX_TABLE_RELATIONSHIP_BROKEN";
    case "DUPLICATE_TABLE_NAME":
      return "XLSX_TABLE_NAME_DUPLICATE";
    case "INVALID_TABLE_REF":
      return "XLSX_TABLE_REF_INVALID";
    case "DIMENSION_MISMATCH":
      return "XLSX_WORKSHEET_DIMENSION_MISMATCH";
    case "INVALID_RANGE_REF":
      return "XLSX_RANGE_REF_INVALID";
    case "MERGE_RANGE_OUT_OF_BOUNDS":
      return "XLSX_MERGE_RANGE_OUT_OF_BOUNDS";
    case "HYPERLINK_TARGET_INVALID":
      return "XLSX_HYPERLINK_TARGET_INVALID";
    case "MACRO_STRIPPED":
      return "XLSX_MACRO_STRIPPED";
    case "EXTERNAL_CONNECTION_STRIPPED":
      return "XLSX_EXTERNAL_CONNECTION_STRIPPED";
    case "GOOGLE_SHEETS_IMPORT_RISK":
      return "XLSX_GOOGLE_SHEETS_IMPORT_RISK";
    case "NUMBERS_COMPATIBILITY_WARNING":
      return "XLSX_NUMBERS_COMPATIBILITY_WARNING";
    case "LARGE_FILE_WARNING":
      return "XLSX_LARGE_FILE_WARNING";
    case "HIGH_UNIQUE_STRING_COUNT":
      return "XLSX_HIGH_UNIQUE_STRING_COUNT";
    case "EXCESSIVE_STYLE_CARDINALITY":
      return "XLSX_STYLE_CARDINALITY_EXCESSIVE";
    case "STREAM_MODE_RECOMMENDED":
      return "XLSX_STREAM_MODE_RECOMMENDED";
  }
}
function getActionCandidates(code) {
  switch (code) {
    case "FIX_CONTENT_TYPES":
      return ["MISSING_CONTENT_TYPE", "EXTRA_CONTENT_TYPE"];
    case "REMOVE_INVALID_DEFINED_NAMES":
      return ["DEFINED_NAME_INVALID"];
    case "REMOVE_ORPHAN_RELATIONSHIPS":
      return ["ORPHAN_RELATIONSHIP", "MISSING_WORKSHEET_PART"];
    case "CLAMP_STYLE_INDEX":
      return ["STYLE_INDEX_OOB"];
    case "REPAIR_SHARED_STRING_INDEX":
      return ["SHARED_STRING_INDEX_OOB"];
    case "NORMALIZE_SHEET_NAMES":
      return ["SHEET_NAME_INVALID", "DUPLICATE_SHEET_NAME"];
    case "DEDUPE_RELATIONSHIP_IDS":
      return ["DUPLICATE_RELATIONSHIP_ID"];
    case "ADD_FORMULA_CACHED_VALUES":
      return ["FORMULA_CACHED_VALUE_MISSING"];
    case "NORMALIZE_DUPLICATE_TABLE_NAME":
      return ["DUPLICATE_TABLE_NAME"];
    case "CLIP_TABLE_REF":
      return ["INVALID_TABLE_REF"];
    case "REPAIR_MERGES":
      return ["MERGE_OVERLAP", "MERGE_RANGE_OUT_OF_BOUNDS"];
    case "RECALCULATE_DIMENSION":
      return ["DIMENSION_MISMATCH"];
    case "REMOVE_INVALID_HYPERLINKS":
      return ["HYPERLINK_TARGET_INVALID"];
    case "CLIP_DATA_VALIDATION_RANGES":
      return ["INVALID_RANGE_REF"];
    case "MACRO_STRIPPED":
      return ["MACRO_STRIPPED"];
    case "EXTERNAL_CONNECTION_STRIPPED":
      return ["EXTERNAL_CONNECTION_STRIPPED"];
    default:
      throw new Error(`Unmapped spreadsheet repair action: ${code}`);
  }
}
function mapRepairActionCodes(action, result) {
  const candidates = getActionCandidates(action.code);
  const matchingFindings = result.original.findings.filter((finding) => {
    if (!candidates.includes(finding.code)) {
      return false;
    }
    if (!action.path) {
      return true;
    }
    return finding.location?.path === action.path;
  });
  const repairFindings = matchingFindings.length > 0 ? matchingFindings : result.repair.findings.filter((finding) => {
    if (!candidates.includes(finding.code)) {
      return false;
    }
    if (!action.path) {
      return true;
    }
    return finding.location?.path === action.path;
  });
  return [...new Set(repairFindings.map((finding) => mapFindingCode(finding.code)))];
}
function getSheetIndex(finding) {
  const sheetName = finding.location?.sheetName;
  if (!sheetName) {
    return void 0;
  }
  const match = sheetName.match(/(\d+)$/);
  return match ? Number(match[1]) - 1 : void 0;
}
function getFindingKey(finding) {
  return [
    finding.code,
    finding.location?.path ?? "",
    finding.location?.sheetName ?? "",
    finding.location?.cellRef ?? "",
    finding.location?.rangeRef ?? "",
    finding.message
  ].join("|");
}
function getVerdict(result) {
  if (result.repaired.verdict === "clean") {
    return result.original.verdict === "errors" ? "editable_with_constraints" : "native_editable";
  }
  if (result.repaired.verdict === "warnings") {
    return result.original.verdict === "errors" ? "editable_with_constraints" : "visual_fallback";
  }
  return "rejected";
}
function buildSharedSpreadsheetQualityReport(result, renderTimeMs) {
  const remainingKeys = new Set(result.repaired.findings.map(getFindingKey));
  const findings = result.original.findings.map((finding) => {
    const autoFixed = !remainingKeys.has(getFindingKey(finding));
    return {
      code: mapFindingCode(finding.code),
      severity: finding.severity,
      sheetIndex: getSheetIndex(finding),
      nodeId: finding.location?.cellRef ?? finding.location?.rangeRef ?? finding.location?.path,
      message: finding.message,
      autoFixed,
      repairDescription: autoFixed ? `Auto-repaired ${finding.code.toLowerCase()}` : void 0
    };
  });
  for (const finding of result.repair.findings.filter((item) => item.repaired)) {
    if (findings.some((existing) => existing.message === finding.message && existing.code === mapFindingCode(finding.code))) {
      continue;
    }
    findings.push({
      code: mapFindingCode(finding.code),
      severity: finding.severity,
      sheetIndex: getSheetIndex(finding),
      nodeId: finding.location?.cellRef ?? finding.location?.rangeRef ?? finding.location?.path,
      message: finding.message,
      autoFixed: true,
      repairDescription: finding.message
    });
  }
  const repairLog = result.repair.actions.flatMap((action) => {
    const findingsForAction = mapRepairActionCodes(action, result);
    return findingsForAction.map((finding) => ({
      strategy: action.code,
      finding,
      description: action.description,
      success: true
    }));
  });
  const autoFixesApplied = findings.filter((finding) => finding.autoFixed).length;
  return {
    verdict: getVerdict(result),
    repairRisk: result.original.verdict === "errors" ? "high" : result.original.verdict === "warnings" ? "medium" : "low",
    findings,
    renderTimeMs,
    autoFixesApplied,
    repairLog
  };
}

// src/template-assembler.ts
import { XMLBuilder as XMLBuilder2, XMLParser as XMLParser3 } from "fast-xml-parser";
import JSZip3 from "jszip";

// src/template-parser.ts
import { XMLParser as XMLParser2 } from "fast-xml-parser";
import JSZip2 from "jszip";
var xmlParser2 = new XMLParser2({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false
});
var DEFAULT_MAX_PART_COUNT = 2e3;
var DEFAULT_MAX_TOTAL_BYTES = 64 * 1024 * 1024;
var DEFAULT_MAX_PART_BYTES = 16 * 1024 * 1024;
var REL_TYPE_WORKSHEET = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
var REL_TYPE_TABLE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table";
var REL_TYPE_DRAWING = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing";
var templateSourceStores = /* @__PURE__ */ new WeakMap();
function asArray2(value) {
  if (value === void 0) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function getTextContent2(node) {
  if (typeof node === "string") {
    return node;
  }
  if (typeof node === "object" && node !== null && "#text" in node && typeof node["#text"] === "string") {
    return node["#text"];
  }
  return "";
}
function getRelationshipSourceBaseSegments2(relPath) {
  if (relPath === "_rels/.rels") {
    return [];
  }
  const segments = relPath.split("/");
  const relsDirectoryIndex = segments.lastIndexOf("_rels");
  const fileName = segments[segments.length - 1]?.replace(/\.rels$/, "");
  const baseSegments = segments.slice(0, relsDirectoryIndex);
  if (fileName && fileName !== ".rels") {
    baseSegments.push(fileName);
  }
  return baseSegments.slice(0, -1);
}
function resolveRelationshipTarget2(relPath, target) {
  const baseSegments = getRelationshipSourceBaseSegments2(relPath);
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      baseSegments.pop();
      continue;
    }
    baseSegments.push(segment);
  }
  return baseSegments.join("/");
}
function parseXml(xml, path) {
  if (/<!(?:DOCTYPE|ENTITY)/i.test(xml)) {
    throw new SpreadsheetTemplateParseError([{
      code: "TEMPLATE_XML_UNSAFE",
      message: `Unsafe XML markup detected in ${path}`,
      path
    }]);
  }
  return xmlParser2.parse(xml);
}
function isUnsafePath(path) {
  return path.startsWith("/") || path.includes("\\") || path.includes("..") || path.includes("__MACOSX") || [...path].some((character) => character.charCodeAt(0) <= 31);
}
function isStrippedTemplatePart(path) {
  if (/^(EncryptedPackage|EncryptionInfo)$/.test(path)) {
    return { category: "encryption", reason: "Encrypted Office packages are not supported" };
  }
  if (/^xl\/vbaProject\.bin$/i.test(path)) {
    return { category: "macro", reason: "VBA macro payloads are stripped during template parse" };
  }
  if (/^xl\/embeddings\//i.test(path)) {
    return { category: "embedding", reason: "OLE embeddings are stripped during template parse" };
  }
  if (/^xl\/connections(\.xml|\/)/i.test(path)) {
    return { category: "connection", reason: "External data connection metadata is stripped during template parse" };
  }
  if (/^xl\/externalLinks(\/|\.xml)/i.test(path)) {
    return { category: "externalLink", reason: "Linked external workbook parts are stripped during template parse" };
  }
  return null;
}
function inferContentType(path, overrides, defaults) {
  const override = overrides.get(path);
  if (override) {
    return override;
  }
  const extension = path.split(".").pop()?.toLowerCase();
  if (!extension) {
    return void 0;
  }
  return defaults.get(extension);
}
function normalizeSheetState(value) {
  if (value === "hidden" || value === "veryHidden") {
    return value;
  }
  return "visible";
}
function parseDefinedNameTarget(ref) {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return { rangeRef: ref.trim() };
  }
  return {
    sheetName: (match[1] ?? match[2] ?? "").replaceAll("''", "'"),
    rangeRef: match[3] ?? ref.trim()
  };
}
function extractRowTemplateHints(index) {
  return index.namedRanges.flatMap((namedRange) => {
    const target = parseDefinedNameTarget(namedRange.ref);
    if (!target.sheetName) {
      return [];
    }
    try {
      const range = parseRangeRef(target.rangeRef);
      const spansMultipleCells = range.startRow !== range.endRow || range.startCol !== range.endCol;
      if (range.startRow !== range.endRow || !spansMultipleCells) {
        return [];
      }
      return [{
        sheetName: target.sheetName,
        rowNumber: range.startRow + 1,
        reason: `Named range ${namedRange.name} spans a single template row`
      }];
    } catch {
      return [];
    }
  });
}
function extractRecommendedAnchors(index) {
  const namedAnchors = index.namedRanges.map((namedRange) => {
    const target = parseDefinedNameTarget(namedRange.ref);
    let kind = "namedRange";
    let reason = "Workbook defined name can be targeted directly for injection";
    if (target.sheetName) {
      try {
        const range = parseRangeRef(target.rangeRef);
        const spansMultipleCells = range.startRow !== range.endRow || range.startCol !== range.endCol;
        if (range.startRow === range.endRow && spansMultipleCells) {
          kind = "rowExpansion";
          reason = "Single-row named range is a good candidate for row expansion";
        }
      } catch {
      }
    }
    return {
      kind,
      label: namedRange.name,
      sheetName: target.sheetName,
      ref: namedRange.ref,
      reason
    };
  });
  return namedAnchors;
}
function collectStylesInventory(stylesXml) {
  if (!stylesXml) {
    return {
      numFmtCount: 0,
      fontCount: 0,
      fillCount: 0,
      borderCount: 0,
      cellXfCount: 0
    };
  }
  const styles = parseXml(stylesXml, "xl/styles.xml")?.styleSheet;
  return {
    numFmtCount: Number(styles?.numFmts?.["@_count"] ?? asArray2(styles?.numFmts?.numFmt).length),
    fontCount: Number(styles?.fonts?.["@_count"] ?? asArray2(styles?.fonts?.font).length),
    fillCount: Number(styles?.fills?.["@_count"] ?? asArray2(styles?.fills?.fill).length),
    borderCount: Number(styles?.borders?.["@_count"] ?? asArray2(styles?.borders?.border).length),
    cellXfCount: Number(styles?.cellXfs?.["@_count"] ?? asArray2(styles?.cellXfs?.xf).length)
  };
}
async function parseTemplate(buffer, options) {
  const maxPartCount = options?.maxPartCount ?? DEFAULT_MAX_PART_COUNT;
  const maxTotalBytes = options?.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const maxPartBytes = options?.maxPartBytes ?? DEFAULT_MAX_PART_BYTES;
  const zip = await JSZip2.loadAsync(buffer);
  const files = Object.values(zip.files).filter((file) => !file.dir);
  const partNames = files.map((file) => file.name).sort();
  const issues = [];
  if (partNames.length > maxPartCount) {
    issues.push({
      code: "TEMPLATE_TOO_MANY_PARTS",
      message: `Template contains ${partNames.length} parts, exceeding the ceiling of ${maxPartCount}`
    });
  }
  let totalBytes = 0;
  for (const file of files) {
    if (isUnsafePath(file.name)) {
      issues.push({
        code: "TEMPLATE_FILENAME_UNSAFE",
        message: `Template contains an unsafe part path: ${file.name}`,
        path: file.name
      });
      continue;
    }
    const content = await file.async("nodebuffer");
    totalBytes += content.length;
    if (content.length > maxPartBytes) {
      issues.push({
        code: "TEMPLATE_PART_TOO_LARGE",
        message: `Template part ${file.name} exceeds the per-part ceiling of ${maxPartBytes} bytes`,
        path: file.name
      });
    }
  }
  if (totalBytes > maxTotalBytes) {
    issues.push({
      code: "TEMPLATE_TOO_LARGE",
      message: `Template expands to ${totalBytes} bytes, exceeding the ceiling of ${maxTotalBytes}`
    });
  }
  if (partNames.includes("EncryptedPackage") || partNames.includes("EncryptionInfo")) {
    issues.push({
      code: "TEMPLATE_ENCRYPTED",
      message: "Encrypted Office packages are not supported"
    });
  }
  if (issues.length > 0) {
    throw new SpreadsheetTemplateParseError(issues);
  }
  const contentTypesFile = zip.file("[Content_Types].xml");
  const workbookFile = zip.file("xl/workbook.xml");
  const workbookRelsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!workbookFile) {
    throw new SpreadsheetTemplateParseError([{ code: "TEMPLATE_WORKBOOK_MISSING", message: "Missing xl/workbook.xml", path: "xl/workbook.xml" }]);
  }
  if (!workbookRelsFile) {
    throw new SpreadsheetTemplateParseError([{ code: "TEMPLATE_WORKBOOK_RELS_MISSING", message: "Missing xl/_rels/workbook.xml.rels", path: "xl/_rels/workbook.xml.rels" }]);
  }
  const sanitizationActions = [];
  const strippedParts = /* @__PURE__ */ new Set();
  for (const path of partNames) {
    const stripped = isStrippedTemplatePart(path);
    if (!stripped) {
      continue;
    }
    strippedParts.add(path);
    sanitizationActions.push({
      disposition: "stripped",
      path,
      category: stripped.category,
      reason: stripped.reason
    });
  }
  const contentTypesXml = await contentTypesFile?.async("string");
  const contentTypes = contentTypesXml ? parseXml(contentTypesXml, "[Content_Types].xml")?.Types : null;
  const overrides = new Map(
    asArray2(contentTypes?.Override).map((entry) => [
      String(entry["@_PartName"]).replace(/^\//, ""),
      String(entry["@_ContentType"])
    ])
  );
  const defaults = new Map(
    asArray2(contentTypes?.Default).map((entry) => [
      String(entry["@_Extension"]).toLowerCase(),
      String(entry["@_ContentType"])
    ])
  );
  const workbookXml = await workbookFile.async("string");
  const workbook = parseXml(workbookXml, "xl/workbook.xml")?.workbook;
  const workbookRelsXml = await workbookRelsFile.async("string");
  const workbookRels = parseXml(workbookRelsXml, "xl/_rels/workbook.xml.rels")?.Relationships;
  const workbookRelationshipMap = new Map(
    asArray2(workbookRels?.Relationship).map((relationship) => {
      const id = String(relationship["@_Id"]);
      const target = String(relationship["@_Target"]);
      return [id, {
        id,
        type: String(relationship["@_Type"]),
        target,
        resolvedTarget: resolveRelationshipTarget2("xl/_rels/workbook.xml.rels", target),
        external: relationship["@_TargetMode"] === "External"
      }];
    })
  );
  const relationships = [...workbookRelationshipMap.values()].map((relationship) => ({
    source: "xl/workbook.xml",
    target: relationship.resolvedTarget,
    type: relationship.type,
    id: relationship.id,
    external: relationship.external
  }));
  const tables = [];
  const sheets = await Promise.all(asArray2(workbook?.sheets?.sheet).map(async (sheetNode) => {
    const relationshipId = String(sheetNode["@_r:id"]);
    const sheetRelationship = workbookRelationshipMap.get(relationshipId);
    const sheetPath = sheetRelationship?.resolvedTarget;
    if (!sheetPath || strippedParts.has(sheetPath) || sheetRelationship.type !== REL_TYPE_WORKSHEET) {
      return null;
    }
    const sheetXml = await zip.file(sheetPath)?.async("string");
    const sheetTree = sheetXml ? parseXml(sheetXml, sheetPath)?.worksheet : null;
    const sheetRelsPath = sheetPath.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", fileName) => `${prefix}_rels/${fileName}.xml.rels`);
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async("string");
    const sheetRels = sheetRelsXml ? parseXml(sheetRelsXml, sheetRelsPath)?.Relationships : null;
    const sheetRelationshipEntries = asArray2(sheetRels?.Relationship).map((relationship) => ({
      id: String(relationship["@_Id"]),
      type: String(relationship["@_Type"]),
      target: String(relationship["@_Target"]),
      resolvedTarget: resolveRelationshipTarget2(sheetRelsPath, String(relationship["@_Target"])),
      external: relationship["@_TargetMode"] === "External"
    }));
    relationships.push(...sheetRelationshipEntries.map((relationship) => ({
      source: sheetPath,
      target: relationship.resolvedTarget,
      type: relationship.type,
      id: relationship.id,
      external: relationship.external
    })));
    const rows = asArray2(sheetTree?.sheetData?.row);
    const formulaCells = rows.flatMap((row) => asArray2(row.c).filter((cell) => cell?.f !== void 0).map((cell) => String(cell["@_r"])));
    const mergedRanges = asArray2(sheetTree?.mergeCells?.mergeCell).map((mergeCell) => String(mergeCell["@_ref"]));
    const conditionalFormattingRefs = asArray2(sheetTree?.conditionalFormatting).map((entry) => String(entry["@_sqref"])).filter(Boolean);
    const dataValidationRefs = asArray2(sheetTree?.dataValidations?.dataValidation).map((entry) => String(entry["@_sqref"])).filter(Boolean);
    const drawingTargets = sheetRelationshipEntries.filter((relationship) => relationship.type === REL_TYPE_DRAWING && !strippedParts.has(relationship.resolvedTarget)).map((relationship) => relationship.resolvedTarget);
    const tableNames = [];
    for (const relationship of sheetRelationshipEntries.filter((entry) => entry.type === REL_TYPE_TABLE)) {
      if (strippedParts.has(relationship.resolvedTarget)) {
        continue;
      }
      const tableXml = await zip.file(relationship.resolvedTarget)?.async("string");
      const tableTree = tableXml ? parseXml(tableXml, relationship.resolvedTarget)?.table : null;
      const displayName = String(tableTree?.["@_displayName"] ?? tableTree?.["@_name"] ?? relationship.resolvedTarget);
      tableNames.push(displayName);
      tables.push({
        name: String(tableTree?.["@_name"] ?? displayName),
        displayName,
        ref: String(tableTree?.["@_ref"] ?? ""),
        path: relationship.resolvedTarget,
        sheetName: String(sheetNode["@_name"])
      });
    }
    return {
      name: String(sheetNode["@_name"]),
      state: normalizeSheetState(sheetNode["@_state"]),
      path: sheetPath,
      relationshipId,
      dimensionRef: sheetTree?.dimension?.["@_ref"] ? String(sheetTree.dimension["@_ref"]) : void 0,
      rowCount: rows.length,
      formulaCells,
      mergedRanges,
      conditionalFormattingRefs,
      dataValidationRefs,
      tableNames,
      drawingTargets,
      hasPrintSettings: Boolean(sheetTree?.pageMargins || sheetTree?.pageSetup || sheetTree?.printOptions),
      hasProtection: Boolean(sheetTree?.sheetProtection)
    };
  }));
  const namedRanges = asArray2(workbook?.definedNames?.definedName).map((definedName) => ({
    name: String(definedName["@_name"]),
    ref: getTextContent2(definedName),
    scopeSheet: definedName["@_localSheetId"] !== void 0 ? sheets[Number(definedName["@_localSheetId"])]?.name : void 0
  })).filter((namedRange) => namedRange.name && namedRange.ref);
  const filteredSheets = sheets.flatMap((sheet) => sheet ? [sheet] : []);
  const understoodParts = /* @__PURE__ */ new Set([
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/sharedStrings.xml",
    "xl/theme/theme1.xml",
    "docProps/core.xml",
    "docProps/app.xml",
    ...filteredSheets.flatMap((sheet) => {
      const relPath = sheet.path.replace(/^(.*\/)?([^/]+)\.xml$/, (_match, prefix = "", fileName) => `${prefix}_rels/${fileName}.xml.rels`);
      return [sheet.path, relPath];
    }),
    ...tables.map((table) => table.path)
  ]);
  const preservedOpaqueParts = partNames.filter((path) => !strippedParts.has(path) && !understoodParts.has(path)).map((path) => ({
    path,
    contentType: inferContentType(path, overrides, defaults)
  }));
  preservedOpaqueParts.forEach((part) => {
    sanitizationActions.push({
      disposition: "preserved",
      path: part.path,
      category: "opaquePart",
      reason: "Unknown but safe part preserved as an opaque template payload"
    });
  });
  const index = {
    partNames,
    relationships,
    sheets: filteredSheets,
    namedRanges,
    tables,
    styles: collectStylesInventory(await zip.file("xl/styles.xml")?.async("string")),
    preservedOpaqueParts: options?.preserveOpaqueParts === false ? [] : preservedOpaqueParts,
    sanitization: {
      actions: sanitizationActions
    }
  };
  const safeParts = /* @__PURE__ */ new Map();
  await Promise.all(partNames.filter((path) => !strippedParts.has(path)).map(async (path) => {
    const content = await zip.file(path)?.async("nodebuffer");
    if (content) {
      safeParts.set(path, content);
    }
  }));
  templateSourceStores.set(index, safeParts);
  return index;
}
function inspectTemplate(index) {
  return {
    sheetInventory: index.sheets,
    namedRangeInventory: index.namedRanges,
    tableInventory: index.tables,
    sanitizationActions: index.sanitization.actions,
    unsupportedPreservedParts: index.preservedOpaqueParts,
    recommendedInjectionAnchors: extractRecommendedAnchors(index),
    rowTemplateDetectionHints: extractRowTemplateHints(index)
  };
}
function getTemplateSourceParts(index) {
  return templateSourceStores.get(index);
}

// src/template-assembler.ts
var xmlParser3 = new XMLParser3({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false
});
var xmlBuilder2 = new XMLBuilder2({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: false
});
var KEEP_CELL_VALUE = Symbol("KEEP_CELL_VALUE");
var OFFICE_VALUE_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::format\(([^{}]*)\))?\}/g;
var OFFICE_LOOP_START_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):start\}/g;
var OFFICE_LOOP_END_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):end\}/g;
var OFFICE_IF_START_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):if\}/g;
var OFFICE_IF_END_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*):endif\}/g;
function isTemplateRangeInput(value) {
  return typeof value === "object" && value !== null && "values" in value;
}
function isTemplateRowExpansionInput(value) {
  return typeof value === "object" && value !== null && "rows" in value;
}
function asArray3(value) {
  if (value === void 0) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
function normalizeOfficePath(path) {
  return path.replace(/\[(\d+)\]/g, ".$1");
}
function resolveOfficePathValue(source, path) {
  const segments = normalizeOfficePath(path).split(".").filter(Boolean);
  let current = source;
  for (const segment of segments) {
    if (current == null) {
      return void 0;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return void 0;
      }
      current = current[index];
      continue;
    }
    if (typeof current !== "object") {
      return void 0;
    }
    current = current[segment];
  }
  return current;
}
function resolveOfficeValue(rootData, path, context) {
  const contextual = context === void 0 ? void 0 : resolveOfficePathValue(context, path);
  if (contextual !== void 0) {
    return contextual;
  }
  return resolveOfficePathValue(rootData, path);
}
function isTruthyOfficeValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}
function formatOfficeValue(value, spec) {
  if (value === null || value === void 0) {
    return "";
  }
  if (!spec) {
    return String(value);
  }
  if (typeof value === "number" && /0/.test(spec)) {
    const decimalMatch = /\.([0]+)/.exec(spec);
    const fractionDigits = decimalMatch?.[1]?.length ?? 0;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: spec.includes(",")
    }).format(value);
  }
  if (/[YMD]/i.test(spec)) {
    const date = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return spec.replace(/YYYY/g, String(date.getUTCFullYear())).replace(/MM/g, String(date.getUTCMonth() + 1).padStart(2, "0")).replace(/DD/g, String(date.getUTCDate()).padStart(2, "0"));
    }
  }
  return String(value);
}
function getTextNodeContent(node) {
  if (typeof node === "string") {
    return node;
  }
  if (!node || typeof node !== "object") {
    return "";
  }
  if ("#text" in node && typeof node["#text"] === "string") {
    return node["#text"];
  }
  if ("t" in node) {
    return getTextNodeContent(node.t);
  }
  if ("r" in node) {
    return asArray3(node.r).map((run) => getTextNodeContent(run)).join("");
  }
  return "";
}
function parseSharedStringTable(xml) {
  if (!xml) {
    return [];
  }
  const document = xmlParser3.parse(xml);
  return asArray3(document?.sst?.si).map((entry) => getTextNodeContent(entry));
}
function getCellText(cell, sharedStrings) {
  const type = String(cell?.["@_t"] ?? "");
  if (type === "s") {
    const sharedIndex = Number(cell?.v ?? -1);
    return Number.isInteger(sharedIndex) ? sharedStrings[sharedIndex] ?? "" : "";
  }
  if (type === "inlineStr") {
    return getTextNodeContent(cell?.is);
  }
  if (typeof cell?.v === "string") {
    return cell.v;
  }
  return "";
}
function collectOfficeControlPaths(texts, kind) {
  const starts = /* @__PURE__ */ new Set();
  const ends = /* @__PURE__ */ new Set();
  const startPattern = kind === "loop" ? OFFICE_LOOP_START_PATTERN : OFFICE_IF_START_PATTERN;
  const endPattern = kind === "loop" ? OFFICE_LOOP_END_PATTERN : OFFICE_IF_END_PATTERN;
  for (const text of texts) {
    for (const match of text.matchAll(startPattern)) {
      if (match[1]) {
        starts.add(match[1]);
      }
    }
    for (const match of text.matchAll(endPattern)) {
      if (match[1]) {
        ends.add(match[1]);
      }
    }
  }
  return new Set([...starts].filter((path) => ends.has(path)));
}
function findOfficeRowControl(texts) {
  const loopPaths = collectOfficeControlPaths(texts, "loop");
  if (loopPaths.size > 0) {
    return { kind: "loop", path: [...loopPaths][0] };
  }
  const ifPaths = collectOfficeControlPaths(texts, "if");
  if (ifPaths.size > 0) {
    return { kind: "if", path: [...ifPaths][0] };
  }
  return void 0;
}
function stripOfficeControlMarkers(text, control) {
  if (!control) {
    return text;
  }
  if (control.kind === "loop") {
    return text.replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:start\\}`, "g"), "").replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:end\\}`, "g"), "");
  }
  return text.replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:if\\}`, "g"), "").replace(new RegExp(`\\{d\\.${control.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:endif\\}`, "g"), "");
}
function hasOfficeValueMarker(text) {
  OFFICE_VALUE_PATTERN.lastIndex = 0;
  return OFFICE_VALUE_PATTERN.test(text);
}
function renderOfficeCellTemplate(originalText, rootData, options, context, control) {
  let working = stripOfficeControlMarkers(originalText, control);
  const hadMarkers = working !== originalText || hasOfficeValueMarker(working);
  const directMatch = /^\s*\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::format\(([^{}]*)\))?\}\s*$/.exec(working);
  if (directMatch && !directMatch[2]) {
    const rawValue = resolveOfficeValue(rootData, directMatch[1] ?? "", context);
    if (rawValue === void 0) {
      if (options?.strictMode) {
        throw new SpreadsheetTemplateAssemblyError([{
          code: "TEMPLATE_INJECTION_UNSUPPORTED",
          message: `Missing data for Office placeholder ${directMatch[0]}`
        }]);
      }
      return options?.removeUnfilled || hadMarkers ? "" : KEEP_CELL_VALUE;
    }
    if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean" || rawValue instanceof Date || rawValue === null) {
      return rawValue;
    }
    return String(rawValue);
  }
  working = working.replace(OFFICE_VALUE_PATTERN, (full, path, formatSpec) => {
    const value = resolveOfficeValue(rootData, path, context);
    if (value === void 0) {
      if (options?.strictMode) {
        throw new SpreadsheetTemplateAssemblyError([{
          code: "TEMPLATE_INJECTION_UNSUPPORTED",
          message: `Missing data for Office placeholder ${full}`
        }]);
      }
      return options?.removeUnfilled ? "" : full;
    }
    return formatOfficeValue(value, formatSpec);
  });
  if (!hadMarkers && working === originalText) {
    return KEEP_CELL_VALUE;
  }
  return working;
}
function buildOfficeRowValues(row, sharedStrings, rootData, options, control, context) {
  const cells = ensureCells(row);
  const parsedCells = cells.map((cell) => ({
    cell,
    parsed: parseCellRef(String(cell["@_r"])),
    text: getCellText(cell, sharedStrings)
  }));
  const startCol = parsedCells.reduce((min, entry) => Math.min(min, entry.parsed.col), Number.POSITIVE_INFINITY);
  const endCol = parsedCells.reduce((max, entry) => Math.max(max, entry.parsed.col), Number.NEGATIVE_INFINITY);
  const rowValues = [];
  for (let col = startCol; col <= endCol; col += 1) {
    const entry = parsedCells.find((candidate) => candidate.parsed.col === col);
    if (!entry) {
      rowValues.push(void 0);
      continue;
    }
    const rendered = renderOfficeCellTemplate(entry.text, rootData, options, context, control);
    rowValues.push(rendered === KEEP_CELL_VALUE ? void 0 : rendered);
  }
  return rowValues;
}
function buildOfficeTemplateScan(index, sourceParts, officeData, options) {
  const sharedStrings = parseSharedStringTable(sourceParts.get("xl/sharedStrings.xml")?.toString("utf8"));
  const rowPlans = /* @__PURE__ */ new Map();
  const mutations = /* @__PURE__ */ new Map();
  for (const sheet of index.sheets) {
    const sheetXml = sourceParts.get(sheet.path)?.toString("utf8");
    if (!sheetXml) {
      continue;
    }
    const worksheetDocument = xmlParser3.parse(sheetXml);
    const worksheet = worksheetDocument.worksheet ?? {};
    const rows = ensureRows(worksheet);
    for (const row of rows) {
      const cells = ensureCells(row);
      if (cells.length === 0) {
        continue;
      }
      const texts = cells.map((cell) => getCellText(cell, sharedStrings));
      const control = findOfficeRowControl(texts);
      if (control) {
        const rowNumber = Number(row["@_r"] ?? 0);
        const parsedCells = cells.map((cell) => parseCellRef(String(cell["@_r"])));
        const startCol = parsedCells.reduce((min, parsed) => Math.min(min, parsed.col), Number.POSITIVE_INFINITY);
        const endCol = parsedCells.reduce((max, parsed) => Math.max(max, parsed.col), Number.NEGATIVE_INFINITY);
        const plans = rowPlans.get(sheet.path) ?? [];
        if (control.kind === "loop") {
          const value = resolveOfficeValue(officeData, control.path);
          const items = Array.isArray(value) ? value : [];
          plans.push({
            name: `office:${control.path}`,
            sheetPath: sheet.path,
            sheetName: sheet.name,
            startRowNumber: rowNumber,
            endRowNumber: rowNumber,
            startCol,
            endCol,
            rows: items.map((item) => buildOfficeRowValues(row, sharedStrings, officeData, options, control, item))
          });
        } else {
          const includeRow = isTruthyOfficeValue(resolveOfficeValue(officeData, control.path));
          plans.push({
            name: `office:${control.path}`,
            sheetPath: sheet.path,
            sheetName: sheet.name,
            startRowNumber: rowNumber,
            endRowNumber: rowNumber,
            startCol,
            endCol,
            rows: includeRow ? [buildOfficeRowValues(row, sharedStrings, officeData, options, control)] : []
          });
        }
        rowPlans.set(sheet.path, plans);
        continue;
      }
      const sheetMutations = mutations.get(sheet.path) ?? [];
      for (const cell of cells) {
        const text = getCellText(cell, sharedStrings);
        if (!hasOfficeValueMarker(text)) {
          continue;
        }
        const rendered = renderOfficeCellTemplate(text, officeData, options);
        if (rendered === KEEP_CELL_VALUE) {
          continue;
        }
        sheetMutations.push({
          ref: String(cell["@_r"]),
          value: rendered
        });
      }
      if (sheetMutations.length > 0) {
        mutations.set(sheet.path, sheetMutations);
      }
    }
  }
  for (const [sheetPath, plans] of rowPlans) {
    rowPlans.set(sheetPath, plans.sort((left, right) => right.startRowNumber - left.startRowNumber));
  }
  return { mutations, rowPlans };
}
function dateToSerialStr(value) {
  return dateToSerialString(value);
}
function parseDefinedNameSheetName(ref) {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return void 0;
  }
  return (match[1] ?? match[2] ?? "").replaceAll("''", "'");
}
function assertTemplateDefinedNamesResolve(workbookXml) {
  const workbookDocument = xmlParser3.parse(workbookXml);
  const workbook = workbookDocument.workbook ?? {};
  const sheetNames = new Set(
    asArray3(workbook.sheets?.sheet).map((sheet) => String(sheet?.["@_name"] ?? "")).filter(Boolean)
  );
  const issues = [];
  asArray3(workbook.definedNames?.definedName).forEach((definedName, index) => {
    const ref = typeof definedName === "string" ? definedName : definedName?.["#text"];
    const name = typeof definedName === "object" && definedName !== null ? String(definedName["@_name"] ?? `definedName[${index}]`) : `definedName[${index}]`;
    if (typeof ref !== "string") {
      return;
    }
    const sheetName = parseDefinedNameSheetName(ref);
    if (sheetName && !sheetNames.has(sheetName)) {
      issues.push({
        path: `definedNames[${index}]`,
        code: "NAMED_RANGE_INVALID",
        message: `Named range ${name} references missing sheet ${sheetName}`
      });
    }
  });
  if (issues.length > 0) {
    throw new SpreadsheetValidationError(issues);
  }
}
function ensureRows(worksheet) {
  const sheetData = worksheet.sheetData ?? (worksheet.sheetData = {});
  if (sheetData.row === void 0) {
    sheetData.row = [];
  } else if (!Array.isArray(sheetData.row)) {
    sheetData.row = [sheetData.row];
  }
  return sheetData.row;
}
function ensureCells(row) {
  if (row.c === void 0) {
    row.c = [];
  } else if (!Array.isArray(row.c)) {
    row.c = [row.c];
  }
  return row.c;
}
function findOrCreateRow(worksheet, rowNumber) {
  const rows = ensureRows(worksheet);
  const existing = rows.find((row) => Number(row["@_r"]) === rowNumber);
  if (existing) {
    return existing;
  }
  const created = { "@_r": String(rowNumber), c: [] };
  const insertIndex = rows.findIndex((row) => Number(row["@_r"]) > rowNumber);
  if (insertIndex === -1) {
    rows.push(created);
  } else {
    rows.splice(insertIndex, 0, created);
  }
  return created;
}
function findOrCreateCell(row, ref) {
  const cells = ensureCells(row);
  const target = parseCellRef(ref);
  const existing = cells.find((cell) => String(cell["@_r"]) === ref);
  if (existing) {
    return existing;
  }
  const created = { "@_r": ref };
  const insertIndex = cells.findIndex((cell) => parseCellRef(String(cell["@_r"])).col > target.col);
  if (insertIndex === -1) {
    cells.push(created);
  } else {
    cells.splice(insertIndex, 0, created);
  }
  return created;
}
function clearCellPayload(cell) {
  delete cell["@_t"];
  delete cell.f;
  delete cell.v;
  delete cell.is;
}
function setCellValue(cell, value) {
  if (isRichTextValue(value)) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_INJECTION_UNSUPPORTED",
      message: "Rich text injection is not yet supported for template assembly"
    }]);
  }
  clearCellPayload(cell);
  if (value === null) {
    return;
  }
  if (typeof value === "string") {
    const sanitized = sanitizeSharedString(value);
    cell["@_t"] = "inlineStr";
    cell.is = {
      t: needsXmlSpacePreserve(sanitized) ? { "@_xml:space": "preserve", "#text": sanitized } : sanitized
    };
    return;
  }
  if (typeof value === "number") {
    cell.v = formatNumberForCell(value);
    return;
  }
  if (typeof value === "boolean") {
    cell["@_t"] = "b";
    cell.v = value ? "1" : "0";
    return;
  }
  if (value instanceof Date) {
    cell.v = dateToSerialStr(value);
    return;
  }
  if (isErrorValue(value)) {
    cell["@_t"] = "e";
    cell.v = value.error;
    return;
  }
}
function parseCellParts(ref) {
  const match = /^(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)$/.exec(ref);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }
  return {
    absoluteColumn: match[1] === "$",
    column: match[2] ?? "",
    absoluteRow: match[3] === "$",
    rowNumber: Number(match[4])
  };
}
function serializeCellParts(parts) {
  return `${parts.absoluteColumn ? "$" : ""}${parts.column}${parts.absoluteRow ? "$" : ""}${parts.rowNumber}`;
}
function shiftCellReference(ref, insertionRow, rowDelta) {
  const parts = parseCellParts(ref);
  if (parts.rowNumber < insertionRow) {
    return ref;
  }
  return serializeCellParts({
    ...parts,
    rowNumber: parts.rowNumber + rowDelta
  });
}
function shiftRangeReference(rangeRef2, anchorRowNumber, rowDelta) {
  const [startRef, endRef] = rangeRef2.split(":");
  if (!endRef) {
    return shiftCellReference(rangeRef2, anchorRowNumber + 1, rowDelta);
  }
  const start = parseCellParts(startRef);
  const end = parseCellParts(endRef);
  if (end.rowNumber < anchorRowNumber) {
    return rangeRef2;
  }
  if (start.rowNumber > anchorRowNumber) {
    return `${serializeCellParts({ ...start, rowNumber: start.rowNumber + rowDelta })}:${serializeCellParts({ ...end, rowNumber: end.rowNumber + rowDelta })}`;
  }
  return `${serializeCellParts(start)}:${serializeCellParts({ ...end, rowNumber: end.rowNumber + rowDelta })}`;
}
function shiftSqref(sqref, anchorRowNumber, rowDelta) {
  return sqref.split(/\s+/).filter(Boolean).map((segment) => shiftRangeReference(segment, anchorRowNumber, rowDelta)).join(" ");
}
function mapSingleRowRangeToRow(rangeRef2, targetRowNumber) {
  const [startRef, endRef] = rangeRef2.split(":");
  const start = parseCellParts(startRef);
  const end = parseCellParts(endRef ?? startRef);
  return `${serializeCellParts({ ...start, rowNumber: targetRowNumber })}:${serializeCellParts({ ...end, rowNumber: targetRowNumber })}`;
}
function cloneNode(value) {
  return structuredClone(value);
}
function updateCellRowReference(ref, rowNumber) {
  const parts = parseCellParts(ref);
  return serializeCellParts({
    ...parts,
    rowNumber
  });
}
function getFormulaText(cell) {
  if (typeof cell.f === "string") {
    return cell.f;
  }
  if (cell.f && typeof cell.f === "object" && typeof cell.f["#text"] === "string") {
    return cell.f["#text"];
  }
  return void 0;
}
function setFormulaText(cell, expression) {
  if (typeof cell.f === "string") {
    cell.f = expression;
    return;
  }
  if (cell.f && typeof cell.f === "object") {
    cell.f["#text"] = expression;
  }
}
function clearFormulaCachedValue(cell) {
  delete cell["@_t"];
  delete cell.v;
  delete cell.is;
}
function recomputeWorksheetDimension(worksheet) {
  const rows = ensureRows(worksheet);
  let maxRowNumber = 1;
  let maxColIndex = 0;
  for (const row of rows) {
    const rowNumber = Number(row["@_r"] ?? 1);
    maxRowNumber = Math.max(maxRowNumber, rowNumber);
    for (const cell of ensureCells(row)) {
      const parsed = parseCellRef(String(cell["@_r"]));
      maxColIndex = Math.max(maxColIndex, parsed.col);
    }
  }
  for (const mergeCell of asArray3(worksheet.mergeCells?.mergeCell)) {
    const range = parseRangeRef(String(mergeCell["@_ref"]));
    maxRowNumber = Math.max(maxRowNumber, range.endRow + 1);
    maxColIndex = Math.max(maxColIndex, range.endCol);
  }
  worksheet.dimension = {
    "@_ref": `${cellRef(0, 0)}:${cellRef(maxRowNumber - 1, maxColIndex)}`
  };
}
function buildRowExpansionPlans(index, injection) {
  const plans = /* @__PURE__ */ new Map();
  const issues = [];
  const namedRangeByName = new Map(index.namedRanges.map((namedRange) => [namedRange.name, namedRange]));
  const sheetByName = new Map(index.sheets.map((sheet) => [sheet.name, sheet]));
  for (const [name, input] of Object.entries(injection.rowExpansions ?? {})) {
    if (!isTemplateRowExpansionInput(input)) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion input for ${name} is invalid`,
        path: name
      });
      continue;
    }
    const namedRange = namedRangeByName.get(name);
    if (!namedRange) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template named range ${name} does not exist`,
        path: name
      });
      continue;
    }
    const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(namedRange.ref.trim());
    if (!match) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion anchor ${name} does not use a plain sheet-local A1 reference`,
        path: name
      });
      continue;
    }
    const sheetName = (match[1] ?? match[2] ?? "").replaceAll("''", "'");
    const sheet = sheetByName.get(sheetName);
    if (!sheet) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template sheet ${sheetName} for row expansion ${name} does not exist`,
        path: name
      });
      continue;
    }
    const range = parseRangeRef(match[3] ?? "");
    if (range.startRow !== range.endRow) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion anchor ${name} must span exactly one row`,
        path: name
      });
      continue;
    }
    const sheetPlans = plans.get(sheet.path) ?? [];
    if (sheetPlans.some((plan) => plan.startRowNumber === range.startRow + 1)) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion anchors on the same sheet must target distinct template rows (${sheetName})`,
        path: name
      });
      continue;
    }
    const expectedWidth = range.endCol - range.startCol + 1;
    if (input.rows.some((row) => row.length !== expectedWidth)) {
      issues.push({
        code: "TEMPLATE_INJECTION_SHAPE_MISMATCH",
        message: `Row expansion ${name} expects rows with ${expectedWidth} cells`,
        path: name
      });
      continue;
    }
    sheetPlans.push({
      name,
      sheetPath: sheet.path,
      sheetName,
      startRowNumber: range.startRow + 1,
      endRowNumber: range.endRow + 1,
      startCol: range.startCol,
      endCol: range.endCol,
      rows: input.rows
    });
    plans.set(sheet.path, sheetPlans);
  }
  if (issues.length > 0) {
    throw new SpreadsheetTemplateAssemblyError(issues);
  }
  for (const [sheetPath, sheetPlans] of plans) {
    plans.set(sheetPath, sheetPlans.sort((left, right) => right.startRowNumber - left.startRowNumber));
  }
  return plans;
}
function buildNamedRangeMutations(index, injection) {
  const mutations = /* @__PURE__ */ new Map();
  const issues = [];
  const sheetPathByName = new Map(index.sheets.map((sheet) => [sheet.name, sheet.path]));
  const namedRangeByName = new Map(index.namedRanges.map((namedRange) => [namedRange.name, namedRange]));
  for (const [rangeName, input] of Object.entries(injection.namedRanges ?? {})) {
    const namedRange = namedRangeByName.get(rangeName);
    if (!namedRange) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template named range ${rangeName} does not exist`,
        path: rangeName
      });
      continue;
    }
    const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(namedRange.ref.trim());
    if (!match) {
      issues.push({
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Named range ${rangeName} does not use a plain sheet-local A1 reference`,
        path: rangeName
      });
      continue;
    }
    const sheetName = (match[1] ?? match[2] ?? "").replaceAll("''", "'");
    const rangeRef2 = match[3] ?? "";
    const sheetPath = sheetPathByName.get(sheetName);
    if (!sheetPath) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template sheet ${sheetName} for named range ${rangeName} does not exist`,
        path: rangeName
      });
      continue;
    }
    const range = parseRangeRef(rangeRef2);
    const rowCount = range.endRow - range.startRow + 1;
    const colCount = range.endCol - range.startCol + 1;
    const sheetMutations = mutations.get(sheetPath) ?? [];
    if (isTemplateRangeInput(input)) {
      if (input.values.length !== rowCount || input.values.some((row) => row.length !== colCount)) {
        issues.push({
          code: "TEMPLATE_INJECTION_SHAPE_MISMATCH",
          message: `Named range ${rangeName} expects a ${rowCount}x${colCount} matrix`,
          path: rangeName
        });
        continue;
      }
      input.values.forEach((row, rowOffset) => {
        row.forEach((value, colOffset) => {
          sheetMutations.push({
            ref: cellRef(range.startRow + rowOffset, range.startCol + colOffset),
            value
          });
        });
      });
      mutations.set(sheetPath, sheetMutations);
      continue;
    }
    if (rowCount !== 1 || colCount !== 1) {
      issues.push({
        code: "TEMPLATE_INJECTION_SHAPE_MISMATCH",
        message: `Named range ${rangeName} spans ${rowCount}x${colCount}; provide a values matrix for multi-cell injections`,
        path: rangeName
      });
      continue;
    }
    sheetMutations.push({
      ref: cellRef(range.startRow, range.startCol),
      value: input
    });
    mutations.set(sheetPath, sheetMutations);
  }
  for (const [sheetName, sheetCells] of Object.entries(injection.cells ?? {})) {
    const sheetPath = sheetPathByName.get(sheetName);
    if (!sheetPath) {
      issues.push({
        code: "TEMPLATE_INJECTION_TARGET_MISSING",
        message: `Template sheet ${sheetName} does not exist`,
        path: sheetName
      });
      continue;
    }
    const sheetMutations = mutations.get(sheetPath) ?? [];
    for (const [ref, value] of Object.entries(sheetCells)) {
      sheetMutations.push({ ref, value });
    }
    mutations.set(sheetPath, sheetMutations);
  }
  if (issues.length > 0) {
    throw new SpreadsheetTemplateAssemblyError(issues);
  }
  return mutations;
}
function applySingleRowExpansionToSheet(sheetXml, plan) {
  const worksheetDocument = xmlParser3.parse(sheetXml);
  const worksheet = worksheetDocument.worksheet ?? {};
  const rows = ensureRows(worksheet);
  const templateRow = rows.find((row) => Number(row["@_r"]) === plan.startRowNumber);
  if (!templateRow) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_INJECTION_TARGET_MISSING",
      message: `Template row ${plan.startRowNumber} for ${plan.name} was not found in ${plan.sheetName}`,
      path: plan.name
    }]);
  }
  const rowDelta = plan.rows.length - 1;
  const insertionRow = plan.startRowNumber + 1;
  const newRows = [];
  for (const row of rows) {
    const rowNumber = Number(row["@_r"] ?? 0);
    if (rowNumber < plan.startRowNumber) {
      newRows.push(row);
      continue;
    }
    if (rowNumber === plan.startRowNumber) {
      for (let offset = 0; offset < plan.rows.length; offset += 1) {
        const clonedRow = cloneNode(templateRow);
        const targetRowNumber = plan.startRowNumber + offset;
        const rowValues = plan.rows[offset] ?? [];
        clonedRow["@_r"] = String(targetRowNumber);
        for (const cell of ensureCells(clonedRow)) {
          const parsed = parseCellRef(String(cell["@_r"]));
          const formulaText = getFormulaText(cell);
          cell["@_r"] = updateCellRowReference(String(cell["@_r"]), targetRowNumber);
          if (parsed.col >= plan.startCol && parsed.col <= plan.endCol) {
            const injectedValue = rowValues[parsed.col - plan.startCol];
            if (injectedValue !== void 0) {
              setCellValue(cell, injectedValue);
            } else if (formulaText) {
              setFormulaText(cell, offsetFormulaRows(formulaText, {
                currentSheetName: plan.sheetName,
                targetSheetName: plan.sheetName,
                rowOffset: offset
              }));
              clearFormulaCachedValue(cell);
            }
            continue;
          }
          if (formulaText) {
            setFormulaText(cell, offsetFormulaRows(formulaText, {
              currentSheetName: plan.sheetName,
              targetSheetName: plan.sheetName,
              rowOffset: offset
            }));
            clearFormulaCachedValue(cell);
          }
        }
        newRows.push(clonedRow);
      }
      continue;
    }
    const shiftedRow = cloneNode(row);
    shiftedRow["@_r"] = String(rowNumber + rowDelta);
    for (const cell of ensureCells(shiftedRow)) {
      cell["@_r"] = updateCellRowReference(String(cell["@_r"]), rowNumber + rowDelta);
      const formulaText = getFormulaText(cell);
      if (formulaText) {
        setFormulaText(cell, shiftFormulaRows(formulaText, {
          currentSheetName: plan.sheetName,
          targetSheetName: plan.sheetName,
          insertionRow,
          rowDelta
        }));
        clearFormulaCachedValue(cell);
      }
    }
    newRows.push(shiftedRow);
  }
  worksheet.sheetData = {
    ...worksheet.sheetData ?? {},
    row: newRows
  };
  const mergeCells = asArray3(worksheet.mergeCells?.mergeCell);
  if (mergeCells.length > 0) {
    const shiftedMerges = [];
    for (const mergeCell of mergeCells) {
      const ref = String(mergeCell["@_ref"]);
      const range = parseRangeRef(ref);
      const startRowNumber = range.startRow + 1;
      const endRowNumber = range.endRow + 1;
      if (endRowNumber < plan.startRowNumber) {
        shiftedMerges.push(mergeCell);
        continue;
      }
      if (startRowNumber > plan.startRowNumber) {
        shiftedMerges.push({ "@_ref": shiftRangeReference(ref, plan.startRowNumber, rowDelta) });
        continue;
      }
      if (startRowNumber === plan.startRowNumber && endRowNumber === plan.startRowNumber) {
        for (let offset = 0; offset < plan.rows.length; offset += 1) {
          shiftedMerges.push({
            "@_ref": mapSingleRowRangeToRow(ref, plan.startRowNumber + offset)
          });
        }
        continue;
      }
      throw new SpreadsheetTemplateAssemblyError([{
        code: "TEMPLATE_INJECTION_UNSUPPORTED",
        message: `Row expansion ${plan.name} cannot yet duplicate merges spanning multiple rows`,
        path: plan.name
      }]);
    }
    worksheet.mergeCells = shiftedMerges.length > 0 ? { "@_count": String(shiftedMerges.length), mergeCell: shiftedMerges } : void 0;
  }
  for (const conditionalFormatting of asArray3(worksheet.conditionalFormatting)) {
    if (conditionalFormatting?.["@_sqref"]) {
      conditionalFormatting["@_sqref"] = shiftSqref(String(conditionalFormatting["@_sqref"]), plan.startRowNumber, rowDelta);
    }
  }
  const validations = asArray3(worksheet.dataValidations?.dataValidation);
  validations.forEach((validation) => {
    if (validation?.["@_sqref"]) {
      validation["@_sqref"] = shiftSqref(String(validation["@_sqref"]), plan.startRowNumber, rowDelta);
    }
  });
  if (worksheet.dataValidations) {
    worksheet.dataValidations["@_count"] = String(validations.length);
  }
  const hyperlinks = asArray3(worksheet.hyperlinks?.hyperlink);
  if (hyperlinks.length > 0) {
    const shiftedHyperlinks = [];
    for (const hyperlink of hyperlinks) {
      const ref = String(hyperlink["@_ref"]);
      const range = parseRangeRef(ref);
      const startRowNumber = range.startRow + 1;
      const endRowNumber = range.endRow + 1;
      if (endRowNumber < plan.startRowNumber) {
        shiftedHyperlinks.push(hyperlink);
        continue;
      }
      if (startRowNumber > plan.startRowNumber) {
        shiftedHyperlinks.push({
          ...hyperlink,
          "@_ref": shiftRangeReference(ref, plan.startRowNumber, rowDelta)
        });
        continue;
      }
      if (startRowNumber === plan.startRowNumber && endRowNumber === plan.startRowNumber) {
        for (let offset = 0; offset < plan.rows.length; offset += 1) {
          shiftedHyperlinks.push({
            ...cloneNode(hyperlink),
            "@_ref": mapSingleRowRangeToRow(ref, plan.startRowNumber + offset)
          });
        }
        continue;
      }
      shiftedHyperlinks.push({
        ...hyperlink,
        "@_ref": shiftRangeReference(ref, plan.startRowNumber, rowDelta)
      });
    }
    worksheet.hyperlinks = { hyperlink: shiftedHyperlinks };
  }
  if (worksheet.autoFilter?.["@_ref"]) {
    worksheet.autoFilter["@_ref"] = shiftRangeReference(String(worksheet.autoFilter["@_ref"]), plan.startRowNumber, rowDelta);
  }
  if (worksheet.sheetViews?.sheetView?.pane?.["@_topLeftCell"]) {
    const topLeftCell = String(worksheet.sheetViews.sheetView.pane["@_topLeftCell"]);
    worksheet.sheetViews.sheetView.pane["@_topLeftCell"] = shiftCellReference(topLeftCell, insertionRow, rowDelta);
  }
  const selections = asArray3(worksheet.sheetViews?.sheetView?.selection);
  selections.forEach((selection) => {
    if (selection?.["@_activeCell"]) {
      selection["@_activeCell"] = shiftCellReference(String(selection["@_activeCell"]), insertionRow, rowDelta);
    }
    if (selection?.["@_sqref"]) {
      selection["@_sqref"] = shiftSqref(String(selection["@_sqref"]), plan.startRowNumber, rowDelta);
    }
  });
  recomputeWorksheetDimension(worksheet);
  return XML_DECLARATION + xmlBuilder2.build({ worksheet });
}
function applyRowExpansionsToSheet(sheetXml, plans) {
  let xml = sheetXml;
  for (const plan of plans) {
    xml = applySingleRowExpansionToSheet(xml, plan);
  }
  return xml;
}
function applySingleRowExpansionToTable(tableXml, plan) {
  const tableDocument = xmlParser3.parse(tableXml);
  const table = tableDocument.table ?? {};
  if (typeof table["@_ref"] === "string") {
    table["@_ref"] = shiftRangeReference(String(table["@_ref"]), plan.startRowNumber, plan.rows.length - 1);
  }
  if (table.autoFilter?.["@_ref"]) {
    table.autoFilter["@_ref"] = shiftRangeReference(String(table.autoFilter["@_ref"]), plan.startRowNumber, plan.rows.length - 1);
  }
  return XML_DECLARATION + xmlBuilder2.build({ table });
}
function applyRowExpansionsToTable(tableXml, plans) {
  let xml = tableXml;
  for (const plan of plans) {
    xml = applySingleRowExpansionToTable(xml, plan);
  }
  return xml;
}
function applyMutationsToSheet(sheetXml, mutations) {
  const worksheetDocument = xmlParser3.parse(sheetXml);
  const worksheet = worksheetDocument.worksheet ?? {};
  for (const mutation of mutations) {
    const parsedRef = parseCellRef(mutation.ref);
    const row = findOrCreateRow(worksheet, parsedRef.row + 1);
    const cell = findOrCreateCell(row, mutation.ref);
    setCellValue(cell, mutation.value);
  }
  return XML_DECLARATION + xmlBuilder2.build({ worksheet });
}
function countSharedStringReferences(sheetXml) {
  const worksheetDocument = xmlParser3.parse(sheetXml);
  const worksheet = worksheetDocument.worksheet ?? {};
  let count = 0;
  for (const row of asArray3(worksheet?.sheetData?.row)) {
    for (const cell of asArray3(row?.c)) {
      if (String(cell?.["@_t"] ?? "") === "s") {
        count += 1;
      }
    }
  }
  return count;
}
async function buildAssembledTemplateZip(index, injection, options) {
  const sourceParts = getTemplateSourceParts(index);
  if (!sourceParts) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_SOURCE_MISSING",
      message: "Template source parts have been garbage collected. Hold a reference to the template index or re-parse the template buffer."
    }]);
  }
  const strippedActions = index.sanitization.actions.filter((action) => action.disposition === "stripped");
  if (strippedActions.length > 0) {
    throw new SpreadsheetTemplateAssemblyError([{
      code: "TEMPLATE_ASSEMBLY_UNSAFE_SANITIZATION",
      message: "Template assembly is not yet supported after sanitization strips unsafe parts"
    }]);
  }
  const rowExpansionPlans = buildRowExpansionPlans(index, injection);
  const mutations = buildNamedRangeMutations(index, injection);
  const syntax = options?.syntax ?? "auto";
  if ((syntax === "office" || syntax === "auto") && injection.officeData) {
    const officeScan = buildOfficeTemplateScan(index, sourceParts, injection.officeData, options);
    for (const [sheetPath, plans] of officeScan.rowPlans) {
      const combined = [...rowExpansionPlans.get(sheetPath) ?? [], ...plans];
      const uniqueStartRows = /* @__PURE__ */ new Set();
      for (const plan of combined) {
        if (uniqueStartRows.has(plan.startRowNumber)) {
          throw new SpreadsheetTemplateAssemblyError([{
            code: "TEMPLATE_INJECTION_UNSUPPORTED",
            message: `Template row ${plan.startRowNumber} on ${plan.sheetName} cannot mix multiple row-expansion strategies`,
            path: plan.name
          }]);
        }
        uniqueStartRows.add(plan.startRowNumber);
      }
      rowExpansionPlans.set(sheetPath, combined.sort((left, right) => right.startRowNumber - left.startRowNumber));
    }
    for (const [sheetPath, officeMutations] of officeScan.mutations) {
      mutations.set(sheetPath, [...mutations.get(sheetPath) ?? [], ...officeMutations]);
    }
  }
  const zip = new JSZip3();
  const deterministic = options?.deterministic !== false;
  const fileOptions = deterministic ? { date: DETERMINISTIC_ZIP_DATE } : void 0;
  const finalSheetXml = /* @__PURE__ */ new Map();
  const workbookXml = sourceParts.get("xl/workbook.xml")?.toString("utf8");
  let updatedWorkbookXml = workbookXml;
  const tablePlansByPath = new Map(
    index.tables.map((table) => {
      const sheet = index.sheets.find((candidate) => candidate.name === table.sheetName);
      if (!sheet) {
        return null;
      }
      const plans = rowExpansionPlans.get(sheet.path);
      if (!plans || plans.length === 0) {
        return null;
      }
      return [table.path, plans];
    }).filter((entry) => entry !== null)
  );
  if (updatedWorkbookXml) {
    const workbookDocument = xmlParser3.parse(updatedWorkbookXml);
    const workbook = workbookDocument.workbook ?? {};
    const definedNames = asArray3(workbook.definedNames?.definedName);
    for (const sheetPlans of rowExpansionPlans.values()) {
      for (const plan of sheetPlans) {
        const rowDelta = plan.rows.length - 1;
        for (const definedName of definedNames) {
          const text = typeof definedName === "string" ? definedName : definedName?.["#text"];
          if (typeof text !== "string") {
            continue;
          }
          const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(text.trim());
          if (!match) {
            continue;
          }
          const sheetName = (match[1] ?? match[2] ?? "").replaceAll("''", "'");
          if (sheetName !== plan.sheetName) {
            continue;
          }
          const updatedRef = String(definedName["@_name"]) === plan.name ? `${match[0].slice(0, match[0].lastIndexOf("!") + 1)}${colIndexToLetter(plan.startCol)}${plan.startRowNumber}:${colIndexToLetter(plan.endCol)}${plan.startRowNumber + rowDelta}` : `${match[0].slice(0, match[0].lastIndexOf("!") + 1)}${shiftRangeReference(match[3] ?? "", plan.startRowNumber, rowDelta)}`;
          if (typeof definedName === "object" && definedName !== null) {
            definedName["#text"] = updatedRef;
          }
        }
      }
    }
    updatedWorkbookXml = XML_DECLARATION + xmlBuilder2.build({ workbook });
    assertTemplateDefinedNamesResolve(updatedWorkbookXml);
  }
  for (const path of index.partNames) {
    const source = sourceParts.get(path);
    if (!source) {
      continue;
    }
    let updated = source;
    if (path === "xl/workbook.xml" && updatedWorkbookXml) {
      updated = Buffer.from(updatedWorkbookXml, "utf8");
    } else if (path.endsWith(".xml")) {
      let xml = source.toString("utf8");
      if (rowExpansionPlans.has(path)) {
        xml = applyRowExpansionsToSheet(xml, rowExpansionPlans.get(path));
      }
      if (tablePlansByPath.has(path)) {
        xml = applyRowExpansionsToTable(xml, tablePlansByPath.get(path));
      }
      if (mutations.has(path)) {
        xml = applyMutationsToSheet(xml, mutations.get(path) ?? []);
      }
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
        finalSheetXml.set(path, xml);
      }
      updated = Buffer.from(xml, "utf8");
    }
    zip.file(path, updated, fileOptions);
  }
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const sharedStringsDocument = xmlParser3.parse(await sharedStringsFile.async("string"));
    const totalReferences = [...finalSheetXml.values()].reduce((sum, sheetXml) => sum + countSharedStringReferences(sheetXml), 0);
    if (sharedStringsDocument?.sst) {
      sharedStringsDocument.sst["@_count"] = String(totalReferences);
      zip.file("xl/sharedStrings.xml", XML_DECLARATION + xmlBuilder2.build({ sst: sharedStringsDocument.sst }), fileOptions);
    }
  }
  return zip;
}
async function assembleFromTemplate(index, injection, options) {
  const zip = await buildAssembledTemplateZip(index, injection, options);
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
async function assembleFromTemplateStream(index, injection, options) {
  const zip = await buildAssembledTemplateZip(index, injection, options);
  return zip.generateNodeStream({
    type: "nodebuffer",
    streamFiles: true,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

// src/serializers/chart-serializer.ts
var ACCENT_COLORS = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
var PROFESSIONAL_CHART_COLORS = [
  "547AA5",
  "D98555",
  "7A9E7E",
  "B89A63",
  "A66B6B",
  "80769E",
  "5E8C87",
  "C07A50",
  "84966D"
];
var EXPLICIT_VALUE_DATA_LABELS_XML = [
  `<c:dLbls>`,
  `<c:showLegendKey val="0"/>`,
  `<c:showVal val="1"/>`,
  `<c:showCatName val="0"/>`,
  `<c:showSerName val="0"/>`,
  `<c:showPercent val="0"/>`,
  `<c:showBubbleSize val="0"/>`,
  `</c:dLbls>`
].join("");
function assertExplicitDataLabelVector(xml, enabled) {
  const labelBlocks = xml.match(/<c:dLbls>[\s\S]*?<\/c:dLbls>/gu) ?? [];
  if (!enabled) {
    if (labelBlocks.length > 0) {
      throw new Error("Disabled chart data labels must not serialize c:dLbls.");
    }
    return;
  }
  if (labelBlocks.length !== 1 || labelBlocks[0] !== EXPLICIT_VALUE_DATA_LABELS_XML) {
    throw new Error("Enabled chart data labels must serialize the explicit value-only label vector.");
  }
}
function normalizedRgb(value) {
  if (value === void 0) return void 0;
  const normalized = value.trim().toUpperCase().replace(/^#/, "");
  const rgb = normalized.length === 8 ? normalized.slice(2) : normalized;
  return /^[0-9A-F]{6}$/u.test(rgb) ? rgb : void 0;
}
function brandedChartPalette(context) {
  if (!context) return void 0;
  const sheet = context.document.sheets.find((candidate) => candidate.name === context.sheetName);
  if (!sheet) return void 0;
  const counts = /* @__PURE__ */ new Map();
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      const style = typeof cell.style === "object" && cell.style !== null ? cell.style : void 0;
      const color = normalizedRgb(style?.fill?.fgColor ?? style?.fill?.color);
      if (color === void 0 || color === "FFFFFF" || color === "000000") continue;
      counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  const brand = [...counts].sort((left, right) => right[1] - left[1])[0];
  if (brand === void 0 || brand[1] < 3) return void 0;
  return [brand[0], ...PROFESSIONAL_CHART_COLORS.filter((color) => color !== brand[0])];
}
function seriesColor(index, context) {
  const brandedPalette = brandedChartPalette(context);
  return brandedPalette?.[index % brandedPalette.length] ?? ACCENT_COLORS[index % ACCENT_COLORS.length];
}
function serializeChartColor(color) {
  return color.startsWith("accent") ? `<a:schemeClr val="${color}"/>` : `<a:srgbClr val="${color}"/>`;
}
function isCellReference(value) {
  return /^(?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!\$?[A-Za-z]+\$?[1-9]\d*$/.test(value);
}
function seriesName(series, index, context) {
  if (!series.name) {
    return `<c:tx><c:v>Series ${index + 1}</c:v></c:tx>`;
  }
  if (isCellReference(series.name)) {
    const cached = context ? resolveChartSeriesName(context.document, context.sheetName, series.name) : void 0;
    if (cached !== void 0) {
      return `<c:tx><c:v>${escapeXml(cached)}</c:v></c:tx>`;
    }
    return `<c:tx><c:strRef><c:f>${escapeXml(series.name)}</c:f></c:strRef></c:tx>`;
  }
  return `<c:tx><c:v>${escapeXml(series.name)}</c:v></c:tx>`;
}
function normalizedChartReference(reference, context) {
  if (!context) return reference;
  const separator = reference.lastIndexOf("!");
  if (separator === -1) return reference;
  const rawSheetName = reference.slice(0, separator);
  const sheetName = rawSheetName.startsWith("'") && rawSheetName.endsWith("'") ? rawSheetName.slice(1, -1).replaceAll("''", "'") : rawSheetName;
  const knownSheet = context.document.sheets.find((sheet) => sheet.name === sheetName);
  return knownSheet === void 0 ? reference : `${quoteSheetName(knownSheet.name)}!${reference.slice(separator + 1)}`;
}
function chartCellValue(cell) {
  if (typeof cell?.formula === "object" && cell.formula !== null) return cell.formula.cachedValue;
  if (Array.isArray(cell?.value)) return cell.value.map((run) => run.text).join("");
  return cell?.value;
}
function serializeStringCache(reference, context) {
  if (!context) return "";
  const resolved = resolveChartReference(context.document, context.sheetName, reference);
  if (!resolved) return "";
  const points = resolved.cells.map((cell, index) => {
    const value = chartCellValue(cell);
    return value === void 0 || value === null ? "" : `<c:pt idx="${index}"><c:v>${escapeXml(String(value))}</c:v></c:pt>`;
  }).join("");
  return `<c:strCache><c:ptCount val="${resolved.cellCount}"/>${points}</c:strCache>`;
}
function serializeNumericCache(reference, context) {
  if (!context) return "";
  const resolved = resolveChartReference(context.document, context.sheetName, reference);
  if (!resolved) return "";
  const firstFormat = resolved.cells.map((cell) => typeof cell?.style === "object" && cell.style !== null ? cell.style.numberFormat : void 0).find((format) => format !== void 0) ?? "General";
  const points = resolved.cells.map((cell, index) => {
    const value = chartCellValue(cell);
    return typeof value === "number" && Number.isFinite(value) ? `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>` : "";
  }).join("");
  return `<c:numCache><c:formatCode>${escapeXml(firstFormat)}</c:formatCode><c:ptCount val="${resolved.cellCount}"/>${points}</c:numCache>`;
}
function seriesCategories(series, context) {
  if (!series.categories) {
    return "";
  }
  return `<c:cat><c:strRef><c:f>${escapeXml(normalizedChartReference(series.categories, context))}</c:f>${serializeStringCache(series.categories, context)}</c:strRef></c:cat>`;
}
function numericSeriesValues(container, series, context) {
  if (series.values.trim() === "") {
    return `<c:${container}><c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numLit></c:${container}>`;
  }
  const cache = context && isChartSeriesEmpty(context.document, context.sheetName, series.values) ? `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="0"/></c:numCache>` : serializeNumericCache(series.values, context);
  return `<c:${container}><c:numRef><c:f>${escapeXml(normalizedChartReference(series.values, context))}</c:f>${cache}</c:numRef></c:${container}>`;
}
function serializeDataPointFills(series, context) {
  if (!context) {
    return "";
  }
  const pointCount = resolveChartReference(
    context.document,
    context.sheetName,
    series.values
  )?.cellCount ?? 0;
  return Array.from(
    { length: pointCount },
    (_unused, index) => `<c:dPt><c:idx val="${index}"/><c:spPr><a:solidFill>${serializeChartColor(seriesColor(index, context))}</a:solidFill></c:spPr></c:dPt>`
  ).join("");
}
function serializeSeries(chart, context, varyDataPointColors = false) {
  return chart.series.map((s, i) => [
    `<c:ser>`,
    `<c:idx val="${i}"/>`,
    `<c:order val="${i}"/>`,
    seriesName(s, i, context),
    `<c:spPr><a:solidFill>${serializeChartColor(seriesColor(i, context))}</a:solidFill></c:spPr>`,
    varyDataPointColors ? serializeDataPointFills(s, context) : "",
    seriesCategories(s, context),
    numericSeriesValues("val", s, context),
    `</c:ser>`
  ].join("")).join("");
}
function serializeDataLabels(chart) {
  const xml = chart.style?.showDataLabels ? EXPLICIT_VALUE_DATA_LABELS_XML : "";
  assertExplicitDataLabelVector(xml, chart.style?.showDataLabels === true);
  return xml;
}
function valueAxisScaling(chart, context) {
  if (!context) return `<c:scaling><c:orientation val="minMax"/></c:scaling>`;
  const cells = chart.series.flatMap((series) => resolveChartReference(context.document, context.sheetName, series.values)?.cells ?? []);
  const percentageValues = cells.length > 0 && cells.every((cell) => {
    const numberFormat = typeof cell?.style === "object" && cell.style !== null ? cell.style.numberFormat : void 0;
    const value = typeof cell?.value === "number" ? cell.value : typeof cell?.formula === "object" && cell.formula !== null ? cell.formula.cachedValue : void 0;
    return typeof numberFormat === "string" && numberFormat.includes("%") && typeof value === "number" && value >= 0 && value <= 1;
  });
  return percentageValues ? `<c:scaling><c:orientation val="minMax"/><c:min val="0"/><c:max val="1"/></c:scaling>` : `<c:scaling><c:orientation val="minMax"/></c:scaling>`;
}
function serializeBarChart(chart, direction, context) {
  const catAxPos = direction === "col" ? "b" : "l";
  const valAxPos = direction === "col" ? "l" : "b";
  return [
    `<c:barChart>`,
    `<c:barDir val="${direction}"/>`,
    `<c:grouping val="clustered"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:barChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${catAxPos}"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="${valAxPos}"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializeLineChart(chart, context) {
  return [
    `<c:lineChart>`,
    `<c:grouping val="standard"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:lineChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializePieChart(chart, context) {
  return [
    `<c:pieChart>`,
    `<c:varyColors val="1"/>`,
    serializeSeries(chart, context, true),
    serializeDataLabels(chart),
    `</c:pieChart>`
  ].join("");
}
function serializeScatterChart(chart, context) {
  const scatterSeries = chart.series.map((s, i) => [
    `<c:ser>`,
    `<c:idx val="${i}"/>`,
    `<c:order val="${i}"/>`,
    seriesName(s, i, context),
    `<c:spPr><a:solidFill>${serializeChartColor(seriesColor(i, context))}</a:solidFill></c:spPr>`,
    s.categories ? `<c:xVal><c:numRef><c:f>${escapeXml(s.categories)}</c:f></c:numRef></c:xVal>` : "",
    numericSeriesValues("yVal", s, context),
    `</c:ser>`
  ].join("")).join("");
  return [
    `<c:scatterChart>`,
    `<c:scatterStyle val="lineMarker"/>`,
    scatterSeries,
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:scatterChart>`,
    `<c:valAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:valAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializeAreaChart(chart, context) {
  return [
    `<c:areaChart>`,
    `<c:grouping val="standard"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:areaChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/>${valueAxisScaling(chart, context)}<c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializeDoughnutChart(chart, context) {
  return [
    `<c:doughnutChart>`,
    `<c:varyColors val="1"/>`,
    serializeSeries(chart, context, true),
    serializeDataLabels(chart),
    `<c:holeSize val="50"/>`,
    `</c:doughnutChart>`
  ].join("");
}
function serializeRadarChart(chart, context) {
  return [
    `<c:radarChart>`,
    `<c:radarStyle val="marker"/>`,
    serializeSeries(chart, context),
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:radarChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializeBubbleChart(chart, context) {
  const bubbleSeries = chart.series.map((s, i) => [
    `<c:ser>`,
    `<c:idx val="${i}"/>`,
    `<c:order val="${i}"/>`,
    seriesName(s, i, context),
    `<c:spPr><a:solidFill>${serializeChartColor(seriesColor(i, context))}</a:solidFill></c:spPr>`,
    s.categories ? `<c:xVal><c:numRef><c:f>${escapeXml(s.categories)}</c:f></c:numRef></c:xVal>` : "",
    numericSeriesValues("yVal", s, context),
    numericSeriesValues("bubbleSize", s, context),
    `</c:ser>`
  ].join("")).join("");
  return [
    `<c:bubbleChart>`,
    bubbleSeries,
    serializeDataLabels(chart),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:bubbleChart>`,
    `<c:valAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:valAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializeStockChart(chart, context) {
  return [
    `<c:stockChart>`,
    serializeSeries(chart, context),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `</c:stockChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
  ].join("");
}
function serializeSurfaceChart(chart, context) {
  return [
    `<c:surface3DChart>`,
    serializeSeries(chart, context),
    `<c:axId val="111111111"/>`,
    `<c:axId val="222222222"/>`,
    `<c:axId val="333333333"/>`,
    `</c:surface3DChart>`,
    `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`,
    `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`,
    `<c:serAx><c:axId val="333333333"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:serAx>`
  ].join("");
}
function serializePlotArea(chart, context) {
  let chartTypeXml;
  switch (chart.type) {
    case "bar":
      chartTypeXml = serializeBarChart(chart, "bar", context);
      break;
    case "col":
      chartTypeXml = serializeBarChart(chart, "col", context);
      break;
    case "line":
      chartTypeXml = serializeLineChart(chart, context);
      break;
    case "pie":
      chartTypeXml = serializePieChart(chart, context);
      break;
    case "scatter":
      chartTypeXml = serializeScatterChart(chart, context);
      break;
    case "area":
      chartTypeXml = serializeAreaChart(chart, context);
      break;
    case "doughnut":
      chartTypeXml = serializeDoughnutChart(chart, context);
      break;
    case "radar":
      chartTypeXml = serializeRadarChart(chart, context);
      break;
    case "bubble":
      chartTypeXml = serializeBubbleChart(chart, context);
      break;
    case "stock":
      chartTypeXml = serializeStockChart(chart, context);
      break;
    case "surface":
      chartTypeXml = serializeSurfaceChart(chart, context);
      break;
  }
  return `<c:plotArea><c:layout/>${chartTypeXml}</c:plotArea>`;
}
function serializeTitle(chart) {
  if (!chart.title) {
    return `<c:autoTitleDeleted val="1"/>`;
  }
  return [
    `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400" b="1"/><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`,
    `<c:autoTitleDeleted val="0"/>`
  ].join("");
}
function serializeLegend(chart) {
  if (chart.style?.showLegend === false) {
    return "";
  }
  return `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>`;
}
function serializeChart(chart, context) {
  return [
    XML_DECLARATION,
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
    `<c:chart>`,
    serializeTitle(chart),
    serializePlotArea(chart, context),
    serializeLegend(chart),
    `<c:plotVisOnly val="1"/>`,
    `</c:chart>`,
    `</c:chartSpace>`
  ].join("");
}

// src/serializers/comment-serializer.ts
function serializeComments(comments) {
  const authorList = [];
  const authorIndexMap = /* @__PURE__ */ new Map();
  for (const comment of comments) {
    const author = comment.author ?? "";
    if (!authorIndexMap.has(author)) {
      authorIndexMap.set(author, authorList.length);
      authorList.push(author);
    }
  }
  const authorsXml = authorList.map((author) => `<author>${escapeXml(author)}</author>`).join("");
  const commentListXml = comments.map((comment) => {
    const authorId = authorIndexMap.get(comment.author ?? "") ?? 0;
    return `<comment ref="${escapeXml(comment.ref)}" authorId="${authorId}"><text><t>${escapeXml(comment.text)}</t></text></comment>`;
  }).join("");
  return [
    XML_DECLARATION,
    `<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
    `<authors>${authorsXml}</authors>`,
    `<commentList>${commentListXml}</commentList>`,
    `</comments>`
  ].join("");
}
function serializeCommentsVml(comments) {
  const shapes = comments.map((comment, index) => {
    const shapeId = 1025 + index;
    const zIndex = index + 1;
    const anchorCol = comment.col;
    const anchorRow = comment.row;
    const anchorEndCol = anchorCol + 2;
    const anchorEndRow = anchorRow + 4;
    return [
      `<v:shape id="_x0000_s${shapeId}" type="#_x0000_t202"`,
      ` style="position:absolute;margin-left:59.25pt;margin-top:1.5pt;width:108pt;height:59.25pt;z-index:${zIndex};visibility:hidden"`,
      ` fillcolor="#ffffe1" o:insetmode="auto">`,
      `<v:fill color="#ffffe1"/>`,
      `<v:shadow on="t" color="black" obscured="t"/>`,
      `<v:path o:connecttype="none"/>`,
      `<v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox>`,
      `<x:ClientData ObjectType="Note">`,
      `<x:MoveWithCells/>`,
      `<x:SizeWithCells/>`,
      `<x:Anchor>${anchorCol}, 15, ${anchorRow}, 10, ${anchorEndCol}, 31, ${anchorEndRow}, 4</x:Anchor>`,
      `<x:AutoFill>False</x:AutoFill>`,
      `<x:Row>${anchorRow}</x:Row>`,
      `<x:Column>${anchorCol}</x:Column>`,
      `</x:ClientData>`,
      `</v:shape>`
    ].join("");
  }).join("");
  return [
    `<xml xmlns:v="urn:schemas-microsoft-com:vml"`,
    ` xmlns:o="urn:schemas-microsoft-com:office:office"`,
    ` xmlns:x="urn:schemas-microsoft-com:office:excel">`,
    `<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>`,
    `<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe">`,
    `<v:stroke joinstyle="miter"/>`,
    `<v:path gradientshapeok="t" o:connecttype="rect"/>`,
    `</v:shapetype>`,
    shapes,
    `</xml>`
  ].join("");
}

// src/serializers/drawing-serializer.ts
var EMU_PER_PIXEL = 9525;
var DEFAULT_SIZE_PIXELS = 100;
function serializeAnchorPoint(point) {
  return `<xdr:col>${point.col}</xdr:col><xdr:colOff>${(point.colOffset ?? 0) * EMU_PER_PIXEL}</xdr:colOff><xdr:row>${point.row}</xdr:row><xdr:rowOff>${(point.rowOffset ?? 0) * EMU_PER_PIXEL}</xdr:rowOff>`;
}
function serializePic(entry, cNvPrId) {
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
    `</xdr:pic>`
  ].join("");
}
var DEFAULT_CHART_WIDTH_PIXELS = 480;
var DEFAULT_CHART_HEIGHT_PIXELS2 = 300;
function serializeGraphicFrame(entry, cNvPrId) {
  const frameName = entry.name ?? `Chart ${cNvPrId}`;
  const widthEmu = (entry.width ?? DEFAULT_CHART_WIDTH_PIXELS) * EMU_PER_PIXEL;
  const heightEmu = (entry.height ?? DEFAULT_CHART_HEIGHT_PIXELS2) * EMU_PER_PIXEL;
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
    `</xdr:graphicFrame>`
  ].join("");
}
function serializeDrawing(images, charts) {
  const parts = [
    XML_DECLARATION,
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
  ];
  let nextId = 2;
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
      row: entry.anchor.from.row + Math.ceil((entry.height ?? DEFAULT_CHART_HEIGHT_PIXELS2) / 20),
      colOffset: 0,
      rowOffset: 0
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
var RELATIONSHIP_TYPES = {
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  chart: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"
};
function serializeDrawingRelationships(entries) {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    ...entries.map(
      (entry) => `<Relationship Id="${entry.relationshipId}" Type="${RELATIONSHIP_TYPES[entry.type]}" Target="${escapeXml(entry.target)}"/>`
    ),
    `</Relationships>`
  ].join("");
}

// src/serializers/doc-props-serializer.ts
var DETERMINISTIC_DOC_PROPS_DATE = /* @__PURE__ */ new Date("2026-01-01T00:00:00.000Z");
function resolveMetadataDate(value, deterministic) {
  if (value) {
    return value;
  }
  return deterministic ? DETERMINISTIC_DOC_PROPS_DATE : /* @__PURE__ */ new Date();
}
function serializeCoreProps(meta, deterministic) {
  const created = resolveMetadataDate(meta?.created, deterministic);
  const modified = resolveMetadataDate(meta?.modified, deterministic);
  const creator = meta?.creator ?? "Runstamp";
  const keywords = meta?.keywords?.join(", ");
  const parts = [
    XML_DECLARATION,
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
  ];
  if (meta?.title) {
    parts.push(`<dc:title>${escapeXml(meta.title)}</dc:title>`);
  }
  if (meta?.language) {
    parts.push(`<dc:language>${escapeXml(meta.language)}</dc:language>`);
  }
  parts.push(`<dc:creator>${escapeXml(creator)}</dc:creator>`);
  parts.push(`<cp:lastModifiedBy>${escapeXml(creator)}</cp:lastModifiedBy>`);
  if (meta?.description) {
    parts.push(`<dc:description>${escapeXml(meta.description)}</dc:description>`);
  }
  if (meta?.category) {
    parts.push(`<cp:category>${escapeXml(meta.category)}</cp:category>`);
  }
  if (keywords) {
    parts.push(`<cp:keywords>${escapeXml(keywords)}</cp:keywords>`);
  }
  parts.push(`<dcterms:created xsi:type="dcterms:W3CDTF">${toW3CDateTime(created)}</dcterms:created>`);
  parts.push(`<dcterms:modified xsi:type="dcterms:W3CDTF">${toW3CDateTime(modified)}</dcterms:modified>`);
  parts.push(`</cp:coreProperties>`);
  return parts.join("");
}
function serializeAppProps(sheetNames, meta) {
  const worksheetList = sheetNames.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("");
  const company = meta?.company ? `<Company>${escapeXml(meta.company)}</Company>` : "";
  return [
    XML_DECLARATION,
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">`,
    `<Application>Runstamp</Application>`,
    `<DocSecurity>0</DocSecurity>`,
    `<ScaleCrop>false</ScaleCrop>`,
    `<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheetNames.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>`,
    `<TitlesOfParts><vt:vector size="${sheetNames.length}" baseType="lpstr">${worksheetList}</vt:vector></TitlesOfParts>`,
    company,
    `<LinksUpToDate>false</LinksUpToDate>`,
    `<SharedDoc>false</SharedDoc>`,
    `<HyperlinksChanged>false</HyperlinksChanged>`,
    `<AppVersion>16.0000</AppVersion>`,
    `</Properties>`
  ].join("");
}

// src/serializers/package-serializer.ts
function serializeContentTypes(sheetCount, options) {
  const parts = [
    XML_DECLARATION,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`
  ];
  const commentSheetIndices = options?.commentSheetIndices ?? [];
  if (commentSheetIndices.length > 0) {
    parts.push(`<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>`);
  }
  const imageTypes = options?.imageTypes ?? [];
  if (imageTypes.includes("png")) {
    parts.push(`<Default Extension="png" ContentType="image/png"/>`);
  }
  if (imageTypes.includes("jpeg")) {
    parts.push(`<Default Extension="jpeg" ContentType="image/jpeg"/>`);
  }
  parts.push(
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
  );
  for (let index = 0; index < sheetCount; index += 1) {
    parts.push(
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );
  }
  for (let index = 0; index < (options?.tableCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/tables/table${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`
    );
  }
  for (const sheetIndex of commentSheetIndices) {
    parts.push(
      `<Override PartName="/xl/comments${sheetIndex + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>`
    );
  }
  const drawingSheetIndices = options?.drawingSheetIndices ?? [];
  for (const sheetIndex of drawingSheetIndices) {
    parts.push(
      `<Override PartName="/xl/drawings/drawing${sheetIndex + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
    );
  }
  const chartCount = options?.chartCount ?? 0;
  for (let index = 0; index < chartCount; index += 1) {
    parts.push(
      `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
    );
  }
  for (let index = 0; index < (options?.pivotTableCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/pivotTables/pivotTable${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml"/>`
    );
  }
  for (let index = 0; index < (options?.pivotCacheDefinitionCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/pivotCache/pivotCacheDefinition${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml"/>`
    );
  }
  for (let index = 0; index < (options?.pivotCacheRecordCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/pivotCache/pivotCacheRecords${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml"/>`
    );
  }
  parts.push(
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`
  );
  if (options?.includeSharedStrings !== false) {
    parts.push(`<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`);
  }
  parts.push(`</Types>`);
  return parts.join("");
}
function serializePackageRels() {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`,
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>`,
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>`,
    `</Relationships>`
  ].join("");
}

// src/serializers/pivot-serializer.ts
var SUBTOTAL_ATTRIBUTE_BY_KIND = {
  sum: "sumSubtotal",
  count: "countASubtotal",
  average: "avgSubtotal",
  max: "maxSubtotal",
  min: "minSubtotal",
  product: "productSubtotal",
  countNums: "countSubtotal",
  stdDev: "stdDevSubtotal",
  stdDevP: "stdDevPSubtotal",
  var: "varSubtotal",
  varP: "varPSubtotal"
};
var DATA_FIELD_SUBTOTAL = {
  sum: "sum",
  count: "countA",
  average: "avg",
  max: "max",
  min: "min",
  product: "product",
  countNums: "count",
  stdDev: "stdDev",
  stdDevP: "stdDevP",
  var: "var",
  varP: "varP"
};
function displayValue(value) {
  if (value === void 0 || value === null) {
    return "";
  }
  if (isRichTextValue(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
function normalizeUniqueNames(names) {
  const seen = /* @__PURE__ */ new Map();
  return names.map((name, index) => {
    const baseName = name.trim() || `Column${index + 1}`;
    const key = baseName.toLowerCase();
    const nextCount = (seen.get(key) ?? 0) + 1;
    seen.set(key, nextCount);
    return nextCount === 1 ? baseName : `${baseName}_${nextCount}`;
  });
}
function normalizePivotDimension(field) {
  return typeof field === "string" ? { name: field } : field;
}
function resolvePivotSource(document, pivotTable) {
  const sourceSheet = document.sheets.find((sheet) => sheet.name === pivotTable.sourceSheet);
  if (!sourceSheet) {
    throw new Error(`Pivot table ${pivotTable.name} references unknown sheet ${pivotTable.sourceSheet}`);
  }
  const range = parseRangeRef(pivotTable.sourceRef);
  const headerRow = sourceSheet.rows[range.startRow];
  const rawFieldNames = [];
  for (let column = range.startCol; column <= range.endCol; column += 1) {
    rawFieldNames.push(displayValue(headerRow?.cells[column]?.value) || `Column${column - range.startCol + 1}`);
  }
  const fieldNames = normalizeUniqueNames(rawFieldNames);
  const sourceFields = fieldNames.map((name) => ({ name, values: [] }));
  for (let row = range.startRow + 1; row <= range.endRow; row += 1) {
    const sourceRow = sourceSheet.rows[row];
    for (let column = range.startCol; column <= range.endCol; column += 1) {
      sourceFields[column - range.startCol].values.push(sourceRow?.cells[column]?.value ?? null);
    }
  }
  return {
    sheet: sourceSheet,
    range,
    sourceFields,
    fieldIndexByName: new Map(sourceFields.map((field, index) => [field.name, index])),
    dataRowCount: Math.max(0, range.endRow - range.startRow)
  };
}
function cellValueRecord(value, dateSystem) {
  if (value === void 0 || value === null || displayValue(value) === "") {
    return "<m/>";
  }
  if (typeof value === "number") {
    return `<n v="${value}"/>`;
  }
  if (typeof value === "boolean") {
    return `<b v="${value ? 1 : 0}"/>`;
  }
  if (value instanceof Date) {
    return `<n v="${dateToSerialString(value, dateSystem)}"/>`;
  }
  return `<s v="${escapeXml(displayValue(value))}"/>`;
}
function serializeSharedItems(values) {
  const visibleValues = values.filter((value) => displayValue(value) !== "");
  if (visibleValues.length === 0) {
    return `<sharedItems count="0"/>`;
  }
  const allNumeric = visibleValues.every((value) => typeof value === "number" || value instanceof Date);
  if (allNumeric) {
    return `<sharedItems containsNumber="1" count="0"/>`;
  }
  const uniqueStrings = [...new Set(visibleValues.map((value) => displayValue(value)))];
  return `<sharedItems count="${uniqueStrings.length}">${uniqueStrings.map((value) => `<s v="${escapeXml(value)}"/>`).join("")}</sharedItems>`;
}
function serializePivotCacheDefinition(pivotTable, binding, source) {
  const calculatedFields = pivotTable.calculatedFields ?? [];
  const cacheFields = [
    ...source.sourceFields.map((field) => `<cacheField name="${escapeXml(field.name)}" numFmtId="0">${serializeSharedItems(field.values)}</cacheField>`),
    ...calculatedFields.map((field) => `<cacheField name="${escapeXml(field.name)}" numFmtId="0" formula="${escapeXml(field.formula)}"><sharedItems containsNumber="1" count="0"/></cacheField>`)
  ];
  return [
    XML_DECLARATION,
    `<pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" refreshedBy="Runstamp" refreshedDateIso="2026-01-01T00:00:00Z" refreshOnLoad="1" saveData="1" recordCount="${source.dataRowCount}" r:id="rId1">`,
    `<cacheSource type="worksheet"><worksheetSource sheet="${escapeXml(source.sheet.name)}" ref="${escapeXml(pivotTable.sourceRef)}"/></cacheSource>`,
    `<cacheFields count="${cacheFields.length}">${cacheFields.join("")}</cacheFields>`,
    `</pivotCacheDefinition>`
  ].join("");
}
function serializePivotCacheDefinitionRelationships(binding) {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheRecords" Target="${escapeXml(binding.cacheRecordsPartName)}"/>`,
    `</Relationships>`
  ].join("");
}
function serializePivotTableRelationships(binding) {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="../pivotCache/${escapeXml(binding.cacheDefinitionPartName)}"/>`,
    `</Relationships>`
  ].join("");
}
function serializePivotCacheRecords(pivotTable, source, dateSystem) {
  const recordRows = [];
  for (let rowOffset = 0; rowOffset < source.dataRowCount; rowOffset += 1) {
    const rowValues = source.sourceFields.map((field) => cellValueRecord(field.values[rowOffset], dateSystem));
    for (const _calculatedField of pivotTable.calculatedFields ?? []) {
      rowValues.push("<m/>");
    }
    recordRows.push(`<r>${rowValues.join("")}</r>`);
  }
  return [
    XML_DECLARATION,
    `<pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${source.dataRowCount}">`,
    ...recordRows,
    `</pivotCacheRecords>`
  ].join("");
}
function buildPivotFieldAttributes(dimension, axis, isDataField) {
  const attributes = [];
  if (axis) {
    attributes.push(`axis="${axis}"`);
  }
  if (isDataField) {
    attributes.push(`dataField="1"`);
  }
  if (dimension?.subtotals === false) {
    attributes.push(`defaultSubtotal="0"`);
  } else if (Array.isArray(dimension?.subtotals) && dimension.subtotals.length > 0) {
    attributes.push(`defaultSubtotal="0"`);
    dimension.subtotals.forEach((subtotal) => {
      attributes.push(`${SUBTOTAL_ATTRIBUTE_BY_KIND[subtotal]}="1"`);
    });
  }
  return attributes.join(" ");
}
function serializePivotTableDefinition(pivotTable, binding, source) {
  const rowFields = (pivotTable.rowFields ?? []).map(normalizePivotDimension);
  const columnFields = (pivotTable.columnFields ?? []).map(normalizePivotDimension);
  const filterFields = (pivotTable.filterFields ?? []).map((name) => ({ name }));
  const dataFieldNames = new Set(pivotTable.valueFields.map((field) => field.name));
  const calculatedFields = pivotTable.calculatedFields ?? [];
  const allFieldNames = [
    ...source.sourceFields.map((field) => field.name),
    ...calculatedFields.map((field) => field.name)
  ];
  const fieldIndexByName = new Map(allFieldNames.map((name, index) => [name, index]));
  const hasMultipleValues = pivotTable.valueFields.length > 1 && (rowFields.length > 0 || columnFields.length > 0);
  const valuesAxis = hasMultipleValues ? pivotTable.valuesAxis ?? (columnFields.length > 0 ? "column" : "row") : void 0;
  const pivotFieldsXml = allFieldNames.map((fieldName) => {
    const dimension = rowFields.find((field) => field.name === fieldName) ?? columnFields.find((field) => field.name === fieldName) ?? filterFields.find((field) => field.name === fieldName);
    const axis = rowFields.some((field) => field.name === fieldName) ? "axisRow" : columnFields.some((field) => field.name === fieldName) ? "axisCol" : filterFields.some((field) => field.name === fieldName) ? "axisPage" : null;
    const attributes = buildPivotFieldAttributes(dimension, axis, dataFieldNames.has(fieldName));
    return `<pivotField${attributes ? ` ${attributes}` : ""}/>`;
  }).join("");
  const rowFieldIndexes = rowFields.map((field) => fieldIndexByName.get(field.name) ?? -1);
  const columnFieldIndexes = columnFields.map((field) => fieldIndexByName.get(field.name) ?? -1);
  if (hasMultipleValues) {
    if (valuesAxis === "row") {
      rowFieldIndexes.push(-2);
    } else {
      columnFieldIndexes.push(-2);
    }
  }
  const filterFieldIndexes = filterFields.map((field) => fieldIndexByName.get(field.name) ?? -1);
  const dataFieldsXml = pivotTable.valueFields.map((field) => {
    const fieldIndex = fieldIndexByName.get(field.name);
    if (fieldIndex === void 0) {
      throw new Error(`Pivot table ${pivotTable.name} references unknown value field ${field.name}`);
    }
    return `<dataField fld="${fieldIndex}" subtotal="${DATA_FIELD_SUBTOTAL[field.summarizeBy ?? "sum"]}" name="${escapeXml(field.title ?? `${field.summarizeBy ?? "sum"} of ${field.name}`)}"/>`;
  }).join("");
  const target = parseCellRef(pivotTable.targetCell);
  const locationWidth = Math.max(2, rowFields.length + pivotTable.valueFields.length + (pivotTable.showRowGrandTotals === false ? 0 : 1));
  const locationHeight = Math.max(3, columnFields.length + 3 + (pivotTable.showColumnGrandTotals === false ? 0 : 1));
  const locationRef = rangeRef(
    target.row,
    target.col,
    target.row + locationHeight,
    target.col + locationWidth
  );
  return [
    XML_DECLARATION,
    `<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" name="${escapeXml(pivotTable.name)}" cacheId="${binding.cacheId}" dataCaption="Values" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataOnRows="${valuesAxis === "row" ? 1 : 0}" rowGrandTotals="${pivotTable.showRowGrandTotals === false ? 0 : 1}" colGrandTotals="${pivotTable.showColumnGrandTotals === false ? 0 : 1}">`,
    `<location ref="${locationRef}" firstHeaderRow="1" firstDataRow="${Math.max(1, columnFields.length + 1)}" firstDataCol="${Math.max(1, rowFields.length)}"/>`,
    `<pivotFields count="${allFieldNames.length}">${pivotFieldsXml}</pivotFields>`,
    rowFieldIndexes.length > 0 ? `<rowFields count="${rowFieldIndexes.length}">${rowFieldIndexes.map((index) => `<field x="${index}"/>`).join("")}</rowFields>` : "",
    columnFieldIndexes.length > 0 ? `<colFields count="${columnFieldIndexes.length}">${columnFieldIndexes.map((index) => `<field x="${index}"/>`).join("")}</colFields>` : "",
    filterFieldIndexes.length > 0 ? `<pageFields count="${filterFieldIndexes.length}">${filterFieldIndexes.map((index) => `<pageField fld="${index}" item="0"/>`).join("")}</pageFields>` : "",
    `<dataFields count="${pivotTable.valueFields.length}">${dataFieldsXml}</dataFields>`,
    `<pivotTableStyleInfo name="${escapeXml(pivotTable.style?.name ?? "PivotStyleLight16")}" showRowHeaders="${pivotTable.style?.showRowHeaders === false ? 0 : 1}" showColHeaders="${pivotTable.style?.showColumnHeaders === false ? 0 : 1}" showRowStripes="${pivotTable.style?.showRowStripes ? 1 : 0}" showColStripes="${pivotTable.style?.showColumnStripes ? 1 : 0}" showLastColumn="${pivotTable.style?.showLastColumn ? 1 : 0}"/>`,
    `</pivotTableDefinition>`
  ].filter(Boolean).join("");
}
function serializePivotChartSeries(seriesNames) {
  return seriesNames.map((name, index) => [
    `<c:ser>`,
    `<c:idx val="${index}"/>`,
    `<c:order val="${index}"/>`,
    `<c:tx><c:v>${escapeXml(name)}</c:v></c:tx>`,
    `</c:ser>`
  ].join("")).join("");
}
function serializePivotChartPlotArea(chart, seriesNames) {
  const series = serializePivotChartSeries(seriesNames);
  switch (chart.type) {
    case "bar":
    case "col":
      return [
        `<c:plotArea><c:layout/>`,
        `<c:barChart><c:barDir val="${chart.type === "bar" ? "bar" : "col"}"/><c:grouping val="clustered"/>${series}<c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>`,
        `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="${chart.type === "bar" ? "l" : "b"}"/><c:crossAx val="222222222"/></c:catAx>`,
        `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="${chart.type === "bar" ? "b" : "l"}"/><c:crossAx val="111111111"/></c:valAx>`,
        `</c:plotArea>`
      ].join("");
    case "line":
      return `<c:plotArea><c:layout/><c:lineChart><c:grouping val="standard"/>${series}<c:axId val="111111111"/><c:axId val="222222222"/></c:lineChart><c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx><c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx></c:plotArea>`;
    case "pie":
    case "doughnut":
      return `<c:plotArea><c:layout/><c:${chart.type === "pie" ? "pieChart" : "doughnutChart"}>${series}${chart.type === "doughnut" ? `<c:holeSize val="50"/>` : ""}</c:${chart.type === "pie" ? "pieChart" : "doughnutChart"}></c:plotArea>`;
    default:
      return `<c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>${series}<c:axId val="111111111"/><c:axId val="222222222"/></c:barChart><c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx><c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx></c:plotArea>`;
  }
}
function serializePivotChart(chart, pivotTableName, seriesNames) {
  return [
    XML_DECLARATION,
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`,
    `<c:pivotSource><c:name>${escapeXml(pivotTableName)}</c:name><c:fmtId val="0"/></c:pivotSource>`,
    `<c:chart>`,
    chart.title ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>` : `<c:autoTitleDeleted val="1"/>`,
    serializePivotChartPlotArea(chart, seriesNames),
    chart.style?.showLegend === false ? "" : `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>`,
    `<c:plotVisOnly val="1"/>`,
    `</c:chart>`,
    `</c:chartSpace>`
  ].join("");
}
function buildPivotArtifacts(document, startingChartIndex = 0, dateSystem = "1900") {
  let nextPivotId = 1;
  let nextChartIndex = startingChartIndex;
  const bindingsBySheet = document.sheets.map(() => []);
  const workbookPivotCaches = [];
  const pivotTableParts = [];
  const pivotCacheDefinitionParts = [];
  const pivotCacheDefinitionRelationshipParts = [];
  const pivotCacheRecordParts = [];
  const pivotChartParts = [];
  const pivotNameLookup = /* @__PURE__ */ new Map();
  document.sheets.forEach((sheet, sheetIndex) => {
    for (const pivotTable of sheet.pivotTables ?? []) {
      const binding = {
        tableId: nextPivotId,
        cacheId: nextPivotId,
        partName: `pivotTable${nextPivotId}.xml`,
        cacheDefinitionPartName: `pivotCacheDefinition${nextPivotId}.xml`,
        cacheRecordsPartName: `pivotCacheRecords${nextPivotId}.xml`,
        definition: pivotTable
      };
      const source = resolvePivotSource(document, pivotTable);
      const valueFieldTitles = pivotTable.valueFields.map((field) => field.title ?? `${field.summarizeBy ?? "sum"} of ${field.name}`);
      bindingsBySheet[sheetIndex].push(binding);
      workbookPivotCaches.push({
        cacheId: binding.cacheId,
        relationshipId: `rIdPivotCache${binding.cacheId}`,
        partName: binding.cacheDefinitionPartName
      });
      pivotTableParts.push({
        path: `xl/pivotTables/${binding.partName}`,
        xml: serializePivotTableDefinition(pivotTable, binding, source)
      });
      pivotCacheDefinitionParts.push({
        path: `xl/pivotCache/${binding.cacheDefinitionPartName}`,
        xml: serializePivotCacheDefinition(pivotTable, binding, source)
      });
      pivotCacheDefinitionRelationshipParts.push({
        path: `xl/pivotCache/_rels/${binding.cacheDefinitionPartName}.rels`,
        xml: serializePivotCacheDefinitionRelationships(binding)
      });
      pivotCacheRecordParts.push({
        path: `xl/pivotCache/${binding.cacheRecordsPartName}`,
        xml: serializePivotCacheRecords(pivotTable, source, dateSystem)
      });
      pivotNameLookup.set(pivotTable.name, {
        binding,
        source,
        valueFieldTitles
      });
      nextPivotId += 1;
    }
  });
  document.sheets.forEach((sheet, sheetIndex) => {
    for (const pivotChart of sheet.pivotCharts ?? []) {
      const target = pivotNameLookup.get(pivotChart.pivotTable);
      if (!target) {
        throw new Error(`Pivot chart references unknown pivot table ${pivotChart.pivotTable}`);
      }
      nextChartIndex += 1;
      pivotChartParts.push({
        path: `xl/charts/chart${nextChartIndex}.xml`,
        xml: serializePivotChart(pivotChart, pivotChart.pivotTable, target.valueFieldTitles),
        sheetIndex,
        definition: pivotChart
      });
    }
  });
  return {
    bindingsBySheet,
    workbookPivotCaches,
    pivotTableParts,
    pivotCacheDefinitionParts,
    pivotCacheDefinitionRelationshipParts,
    pivotCacheRecordParts,
    pivotChartParts
  };
}

// src/serializers/sheet-xml-builder.ts
var WORKSHEET_SECTION_ORDER = {
  sheetPr: 1,
  dimension: 2,
  sheetViews: 3,
  sheetFormatPr: 4,
  cols: 5,
  sheetData: 6,
  autoFilter: 11,
  sheetProtection: 13,
  mergeCells: 15,
  conditionalFormatting: 17,
  dataValidations: 18,
  hyperlinks: 19,
  printOptions: 20,
  pageMargins: 21,
  pageSetup: 22,
  rowBreaks: 23,
  drawing: 24,
  legacyDrawing: 25,
  tableParts: 26,
  pivotTableParts: 27,
  extLst: 28
};
var SHEET_DATA_POSITION = WORKSHEET_SECTION_ORDER.sheetData;
var SheetXmlBuilder = class {
  constructor(rootAttributes) {
    this.rootAttributes = rootAttributes;
  }
  sections = /* @__PURE__ */ new Map();
  setSheetPr(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetPr, xml);
  }
  setDimension(xml) {
    this.set(WORKSHEET_SECTION_ORDER.dimension, xml);
  }
  setSheetViews(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetViews, xml);
  }
  setSheetFormatPr(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetFormatPr, xml);
  }
  setCols(xml) {
    this.set(WORKSHEET_SECTION_ORDER.cols, xml);
  }
  setSheetData(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetData, xml);
  }
  setAutoFilter(xml) {
    this.set(WORKSHEET_SECTION_ORDER.autoFilter, xml);
  }
  setSheetProtection(xml) {
    this.set(WORKSHEET_SECTION_ORDER.sheetProtection, xml);
  }
  setMergeCells(xml) {
    this.set(WORKSHEET_SECTION_ORDER.mergeCells, xml);
  }
  addConditionalFormatting(xml) {
    this.add(WORKSHEET_SECTION_ORDER.conditionalFormatting, xml);
  }
  setDataValidations(xml) {
    this.set(WORKSHEET_SECTION_ORDER.dataValidations, xml);
  }
  setHyperlinks(xml) {
    this.set(WORKSHEET_SECTION_ORDER.hyperlinks, xml);
  }
  setPrintOptions(xml) {
    this.set(WORKSHEET_SECTION_ORDER.printOptions, xml);
  }
  setPageMargins(xml) {
    this.set(WORKSHEET_SECTION_ORDER.pageMargins, xml);
  }
  setPageSetup(xml) {
    this.set(WORKSHEET_SECTION_ORDER.pageSetup, xml);
  }
  setRowBreaks(xml) {
    this.set(WORKSHEET_SECTION_ORDER.rowBreaks, xml);
  }
  setTableParts(xml) {
    this.set(WORKSHEET_SECTION_ORDER.tableParts, xml);
  }
  setPivotTableParts(xml) {
    this.set(WORKSHEET_SECTION_ORDER.pivotTableParts, xml);
  }
  setExtLst(xml) {
    this.set(WORKSHEET_SECTION_ORDER.extLst, xml);
  }
  setLegacyDrawing(xml) {
    this.set(WORKSHEET_SECTION_ORDER.legacyDrawing, xml);
  }
  setDrawing(xml) {
    this.set(WORKSHEET_SECTION_ORDER.drawing, xml);
  }
  build() {
    const parts = [
      XML_DECLARATION,
      `<worksheet ${this.rootAttributes.join(" ")}>`
    ];
    for (const [, sectionParts] of [...this.sections.entries()].sort((left, right) => left[0] - right[0])) {
      parts.push(...sectionParts);
    }
    parts.push("</worksheet>");
    return parts.join("");
  }
  buildSheetDataEnvelope() {
    const prefix = [
      XML_DECLARATION,
      `<worksheet ${this.rootAttributes.join(" ")}>`
    ];
    const suffix = [];
    for (const [position, sectionParts] of [...this.sections.entries()].sort((left, right) => left[0] - right[0])) {
      if (position < SHEET_DATA_POSITION) {
        prefix.push(...sectionParts);
        continue;
      }
      if (position > SHEET_DATA_POSITION) {
        suffix.push(...sectionParts);
      }
    }
    prefix.push("<sheetData>");
    suffix.unshift("</sheetData>");
    suffix.push("</worksheet>");
    return {
      prefix: prefix.join(""),
      suffix: suffix.join("")
    };
  }
  set(position, xml) {
    if (!xml) {
      return;
    }
    this.sections.set(position, [xml]);
  }
  add(position, xml) {
    if (!xml) {
      return;
    }
    const section = this.sections.get(position) ?? [];
    section.push(xml);
    this.sections.set(position, section);
  }
};

// src/serializers/worksheet-rels-serializer.ts
var RELATIONSHIP_TYPE_URIS = {
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  table: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table",
  vmlDrawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
  comment: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  drawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
  pivotTable: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotTable"
};
function serializeWorksheetRelationships(relationships) {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    ...relationships.map((relationship) => {
      const typeUri = RELATIONSHIP_TYPE_URIS[relationship.type];
      const targetMode = relationship.type === "hyperlink" ? ` TargetMode="External"` : "";
      return `<Relationship Id="${relationship.id}" Type="${typeUri}" Target="${escapeXml(relationship.target)}"${targetMode}/>`;
    }),
    `</Relationships>`
  ].join("");
}

// src/serializers/table-serializer.ts
function cellValueToDisplayString(value) {
  if (value === void 0 || value === null) {
    return "";
  }
  if (isRichTextValue(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
function makeUniqueTableColumnNames(names) {
  const seen = /* @__PURE__ */ new Map();
  return names.map((rawName, index) => {
    const baseName = rawName.trim() || `Column${index + 1}`;
    const normalized = baseName.toLowerCase();
    const count = (seen.get(normalized) ?? 0) + 1;
    seen.set(normalized, count);
    return count === 1 ? baseName : `${baseName}_${count}`;
  });
}
function resolveTableColumnNames(sheet, table, formulaEvaluator) {
  const range = parseRangeRef(table.ref);
  const headerRowIndex = range.startRow;
  const headerRow = sheet.rows[headerRowIndex];
  const explicitColumns = table.columns ?? [];
  const names = [];
  for (let offset = 0; offset <= range.endCol - range.startCol; offset += 1) {
    const explicitName = explicitColumns[offset]?.name;
    if (explicitName) {
      names.push(explicitName);
      continue;
    }
    const columnIndex = range.startCol + offset;
    const cell = headerRow?.cells[columnIndex];
    const displayValue2 = cell?.formula ? typeof cell.formula === "string" ? formulaEvaluator?.evaluateCell(cell, sheet.name, cellRef(headerRowIndex, columnIndex)) ?? cell?.value : cell.formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheet.name, cellRef(headerRowIndex, columnIndex)) ?? cell?.value : cell?.value;
    names.push(cellValueToDisplayString(displayValue2));
  }
  return makeUniqueTableColumnNames(names);
}
function serializeTableColumn(column, id, name) {
  const attributes = [
    `id="${id}"`,
    `name="${escapeXml(name)}"`
  ];
  if (column?.totalsRowLabel) {
    attributes.push(`totalsRowLabel="${escapeXml(column.totalsRowLabel)}"`);
  }
  if (column?.totalsRowFunction) {
    attributes.push(`totalsRowFunction="${column.totalsRowFunction}"`);
  }
  if (column?.totalsRowFormula) {
    return `<tableColumn ${attributes.join(" ")}><totalsRowFormula>${escapeXml(column.totalsRowFormula)}</totalsRowFormula></tableColumn>`;
  }
  return `<tableColumn ${attributes.join(" ")}/>`;
}
function totalsRowFunctionCode(value) {
  switch (value) {
    case "average":
      return 101;
    case "countNums":
      return 102;
    case "count":
      return 103;
    case "max":
      return 104;
    case "min":
      return 105;
    case "stdDev":
      return 107;
    case "sum":
      return 109;
    case "var":
      return 110;
    default:
      return null;
  }
}
function createTotalsRowCell(table, range, column, columnIndex) {
  if (column?.totalsRowLabel) {
    return { value: column.totalsRowLabel };
  }
  if (column?.totalsRowFormula) {
    return {
      formula: column.totalsRowFormula.startsWith("=") ? column.totalsRowFormula.slice(1) : column.totalsRowFormula
    };
  }
  if (column?.totalsRowFunction) {
    const functionCode = totalsRowFunctionCode(column.totalsRowFunction);
    const dataStartRow = range.startRow + 1;
    const dataEndRow = Math.max(range.startRow + 1, range.endRow - 1);
    if (functionCode !== null && dataEndRow >= dataStartRow) {
      return {
        formula: `SUBTOTAL(${functionCode},${cellRef(dataStartRow, columnIndex)}:${cellRef(dataEndRow, columnIndex)})`
      };
    }
  }
  if (table.totalsRow) {
    return { value: "" };
  }
  return { value: "" };
}
function buildWorksheetSyntheticTableCells(bindings) {
  const cellsByRow = /* @__PURE__ */ new Map();
  for (const binding of bindings ?? []) {
    const table = binding.definition;
    if (table.totalsRow !== true) {
      continue;
    }
    const range = parseRangeRef(table.ref);
    const totalsRowIndex = range.endRow;
    const columns = table.columns ?? [];
    const rowCells = cellsByRow.get(totalsRowIndex) ?? [];
    for (let offset = 0; offset <= range.endCol - range.startCol; offset += 1) {
      const columnIndex = range.startCol + offset;
      rowCells.push({
        row: totalsRowIndex,
        col: columnIndex,
        cell: createTotalsRowCell(table, range, columns[offset], columnIndex)
      });
    }
    cellsByRow.set(totalsRowIndex, rowCells);
  }
  return cellsByRow;
}
function buildWorksheetTableBindings(document) {
  let nextTableId = 1;
  return document.sheets.map((sheet) => (sheet.tables ?? []).map((table) => {
    const binding = {
      tableId: nextTableId,
      partName: `table${nextTableId}.xml`,
      definition: table
    };
    nextTableId += 1;
    return binding;
  }));
}
function serializeTableParts(document, bindingsBySheet, formulaEvaluator) {
  const parts = [];
  document.sheets.forEach((sheet, sheetIndex) => {
    const bindings = bindingsBySheet[sheetIndex] ?? [];
    bindings.forEach((binding) => {
      const table = binding.definition;
      const range = parseRangeRef(table.ref);
      const columnNames = resolveTableColumnNames(sheet, table, formulaEvaluator);
      const columnDefinitions = table.columns ?? [];
      const totalsRow = table.totalsRow === true;
      const tableRef = rangeRef(range.startRow, range.startCol, range.endRow, range.endCol);
      const autoFilterEndRow = totalsRow && range.endRow > range.startRow ? range.endRow - 1 : range.endRow;
      const autoFilterRef = rangeRef(range.startRow, range.startCol, autoFilterEndRow, range.endCol);
      const styleName = table.style?.name ?? "TableStyleMedium2";
      const xml = [
        XML_DECLARATION,
        `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${binding.tableId}" name="${escapeXml(table.name)}" displayName="${escapeXml(table.displayName ?? table.name)}" ref="${tableRef}" headerRowCount="1"${totalsRow ? ` totalsRowCount="1"` : ""}>`,
        `<autoFilter ref="${autoFilterRef}"/>`,
        `<tableColumns count="${columnNames.length}">`,
        ...columnNames.map((name, index) => serializeTableColumn(columnDefinitions[index], index + 1, name)),
        `</tableColumns>`,
        `<tableStyleInfo name="${escapeXml(styleName)}" showFirstColumn="${table.style?.showFirstColumn ? 1 : 0}" showLastColumn="${table.style?.showLastColumn ? 1 : 0}" showRowStripes="${table.style?.showRowStripes ?? true ? 1 : 0}" showColumnStripes="${table.style?.showColumnStripes ? 1 : 0}"/>`,
        `</table>`
      ].join("");
      parts.push({
        path: `xl/tables/${binding.partName}`,
        xml
      });
    });
  });
  return parts;
}

// src/serializers/sheet-serializer.ts
var noRefCellOpenTagCache = /* @__PURE__ */ new Map();
var noRefCellEmptyTagCache = /* @__PURE__ */ new Map();
var noRefInlineStringOpenTagCache = /* @__PURE__ */ new Map();
var LARGE_ROW_REF_OMISSION_THRESHOLD = 512;
var SIMPLE_ROW_OPEN_TAG = "<row>";
var SIMPLE_ROW_CLOSE_TAG = "</row>";
var DEFAULT_FITTED_PAGE_MARGINS = {
  bottom: 0.3,
  footer: 0.15,
  header: 0.15,
  left: 0.35,
  right: 0.35,
  top: 0.3
};
function inferredPrintArea(sheet, structure) {
  if (sheet.pageSetup?.printArea) return sheet.pageSetup.printArea;
  const bounds = structure.originCells.flatMap((row) => row.cells.map((entry) => ({
    endCol: entry.col + (entry.cell.colSpan ?? 1) - 1,
    endRow: entry.row + (entry.cell.rowSpan ?? 1) - 1,
    startCol: entry.col,
    startRow: entry.row
  })));
  for (const merge of structure.mergeRanges) bounds.push(merge.bounds);
  for (const table of sheet.tables ?? []) bounds.push(parseRangeRef(table.ref));
  const addDrawing = (drawing) => {
    const fallbackEndCol = drawing.anchor.from.col + Math.max(1, Math.ceil((drawing.width ?? 64) / 64));
    const fallbackEndRow = drawing.anchor.from.row + Math.max(1, Math.ceil((drawing.height ?? 20) / 20));
    bounds.push({
      startCol: drawing.anchor.from.col,
      startRow: drawing.anchor.from.row,
      endCol: drawing.anchor.to?.col ?? fallbackEndCol,
      endRow: drawing.anchor.to?.row ?? fallbackEndRow
    });
  };
  for (const chart of sheet.charts ?? []) addDrawing(chart);
  for (const image of sheet.images ?? []) addDrawing(image);
  if (bounds.length === 0) return void 0;
  let startRow = bounds[0].startRow;
  let startCol = bounds[0].startCol;
  let endRow = bounds[0].endRow;
  let endCol = bounds[0].endCol;
  for (let index = 1; index < bounds.length; index += 1) {
    const bound = bounds[index];
    startRow = Math.min(startRow, bound.startRow);
    startCol = Math.min(startCol, bound.startCol);
    endRow = Math.max(endRow, bound.endRow);
    endCol = Math.max(endCol, bound.endCol);
  }
  return absRangeRef(startRow, startCol, endRow, endCol).replaceAll("$", "");
}
function sheetHasMaterialTextOverflow(sheet) {
  return sheet.rows.some((row) => row.cells.length > 1 && row.cells.some((cell, columnIndex) => {
    const width = sheet.columns?.[columnIndex]?.width;
    return typeof cell.value === "string" && width !== void 0 && cell.value.length > width * 1.35;
  }));
}
function densityAdaptivePageSetup(sheet, printArea) {
  let pageSetup = sheet.pageSetup ? { ...sheet.pageSetup } : void 0;
  if (!printArea) return pageSetup;
  const used = parseRangeRef(printArea);
  const usedRows = used.endRow - used.startRow + 1;
  const usedColumns = used.endCol - used.startCol + 1;
  const hasDrawings = (sheet.charts?.length ?? 0) + (sheet.images?.length ?? 0) > 0;
  const hasMaterialTextOverflow = sheetHasMaterialTextOverflow(sheet);
  const denseCompactTable = hasMaterialTextOverflow && usedRows >= 10 && !sheet.rows.some((row) => row.cells.length === 0);
  if (pageSetup === void 0 && hasDrawings && usedRows <= 24 && usedColumns <= 12) {
    pageSetup = {
      fitToHeight: 1,
      fitToWidth: 1,
      margins: DEFAULT_FITTED_PAGE_MARGINS,
      orientation: "landscape",
      paperSize: 11,
      printArea
    };
  } else if (pageSetup?.scale === void 0 && pageSetup?.paperSize === void 0 && !hasDrawings && usedRows <= 24 && usedColumns <= 8) {
    pageSetup = {
      ...pageSetup,
      // Auto-configured compact sheets use a single page. Preserve an explicit
      // zero unless material text overflow would otherwise force microtext;
      // that dense compact case is safer as a wrapped one-page table.
      fitToHeight: denseCompactTable ? 1 : pageSetup?.fitToHeight ?? 1,
      fitToWidth: 1,
      orientation: "landscape",
      paperSize: 11,
      printArea
    };
  } else if (usedRows > 24 && pageSetup?.scale === void 0 && pageSetup?.fitToWidth === 1 && pageSetup.fitToHeight === void 0) {
    if (hasDrawings) {
      const maximumChartSpan = Math.max(0, ...(sheet.charts ?? []).map((chart) => (chart.anchor.to?.row ?? chart.anchor.from.row + Math.ceil((chart.height ?? 300) / 20)) - chart.anchor.from.row));
      const compactChartSheet = maximumChartSpan > 0 && sheet.rows.length + maximumChartSpan <= 42;
      pageSetup = { ...pageSetup, fitToHeight: compactChartSheet ? 1 : 0 };
    } else if (usedRows <= 34 && usedColumns > 10) {
      pageSetup = { ...pageSetup, fitToHeight: 1 };
    } else if (usedRows > 32 && usedColumns > 10) {
      pageSetup = { ...pageSetup, fitToHeight: 2 };
    } else if (usedRows > 48) {
      pageSetup = { ...pageSetup, fitToHeight: Math.ceil(usedRows / 48) };
    }
  }
  if (pageSetup?.scale === void 0 && pageSetup?.fitToWidth === 1 && pageSetup.margins === void 0 && (hasDrawings || pageSetup.paperSize === 11 && usedRows >= 6)) {
    pageSetup = { ...pageSetup, margins: DEFAULT_FITTED_PAGE_MARGINS };
  }
  return pageSetup;
}
function printRowExpansionFactor(sheet, defaults, printArea, pageSetup) {
  if (!printArea || pageSetup?.scale !== void 0 || (sheet.images?.length ?? 0) > 0) return 1;
  const hasCharts = (sheet.charts?.length ?? 0) > 0;
  if (hasCharts && pageSetup?.fitToHeight !== 0) return 1;
  const used = parseRangeRef(printArea);
  const usedColumnCount = used.endCol - used.startCol + 1;
  const contentEndRow = hasCharts ? sheet.rows.length - 1 : used.endRow;
  const contentRowCount = contentEndRow - used.startRow + 1;
  const fittedPageCount = typeof pageSetup?.fitToHeight === "number" && pageSetup.fitToHeight > 1 ? pageSetup.fitToHeight : 1;
  if (Math.ceil(contentRowCount / fittedPageCount) > 48) return 1;
  const layout = estimatePrintLayout({
    ...sheet,
    pageSetup: { ...pageSetup, printArea }
  }, defaults);
  const contentHeight = layout.rowHeights.slice(used.startRow, contentEndRow + 1).reduce((sum, height) => sum + height, 0);
  const printedContentHeight = contentHeight / fittedPageCount * Math.max(0.01, layout.scale);
  const hasRepeatedTitles = sheet.pageSetup?.printTitles?.rows !== void 0;
  const hasKeyValueSummary = sheet.rows.slice(0, 10).filter((row) => row.cells.length === 2 && typeof row.cells[0]?.value === "string").length >= 3 && sheet.rows.some((row) => row.cells.length >= 5);
  const compactFittedPage = pageSetup?.paperSize === 11 && pageSetup.fitToHeight === 1;
  const denseCompactFittedPage = compactFittedPage && contentRowCount >= 10 && !sheet.rows.some((row) => row.cells.length === 0);
  const compactTargetFillRatio = denseCompactFittedPage ? 1.4 : 0.95;
  const targetFillRatio = hasCharts ? 0.8 : hasRepeatedTitles ? pageSetup?.orientation === "portrait" ? hasKeyValueSummary ? 1.05 : contentRowCount <= 30 ? 0.99 : 0.94 : 0.82 : pageSetup?.paperSize === 11 && usedColumnCount <= 4 && contentRowCount >= 6 && contentRowCount <= 10 ? usedColumnCount <= 3 ? 1.15 : 1.04 : compactFittedPage ? compactTargetFillRatio : pageSetup?.fitToHeight === 1 ? 0.95 : contentRowCount > 12 ? 0.82 : 0.95;
  const maximumExpansion = !hasCharts && usedColumnCount >= 12 ? 1.6 : denseCompactFittedPage ? 3.75 : pageSetup?.paperSize === 11 && usedColumnCount <= 4 && contentRowCount >= 6 && contentRowCount <= 10 ? usedColumnCount <= 3 ? 4 : 3.2 : 2.75;
  return Math.max(1, Math.min(maximumExpansion, layout.printableHeightPoints * targetFillRatio / Math.max(1, printedContentHeight)));
}
function balancedUnconstrainedTablePages(sheet, pageSetup, printArea, serializedRowHeights, defaults) {
  if (!printArea || pageSetup?.fitToWidth !== 1 || pageSetup.fitToHeight !== 0 || (sheet.charts?.length ?? 0) > 0 || (sheet.images?.length ?? 0) > 0 || sheet.pageSetup?.printTitles?.rows === void 0) return { breaks: [] };
  const used = parseRangeRef(printArea);
  const titleRows = sheet.pageSetup.printTitles.rows;
  const dataStart = Math.max(used.startRow, titleRows.end + 1);
  const dataEnd = Math.min(used.endRow, serializedRowHeights.length - 1);
  if (dataEnd - dataStart + 1 < 24) return { breaks: [] };
  const layout = estimatePrintLayout({ ...sheet, pageSetup: { ...pageSetup, printArea } }, defaults);
  const pageHeight = layout.printableHeightPoints / Math.max(0.1, layout.scale);
  const sumHeights = (start, end) => {
    let total = 0;
    for (let row = start; row <= end; row += 1) total += serializedRowHeights[row] ?? 0;
    return total;
  };
  const preambleHeight = sumHeights(used.startRow, dataStart - 1);
  const repeatedTitleHeight2 = sumHeights(titleRows.start, titleRows.end);
  const dataHeight = sumHeights(dataStart, dataEnd);
  const firstPageCapacity = Math.max(1, pageHeight - preambleHeight);
  const continuationCapacity = Math.max(1, pageHeight - repeatedTitleHeight2);
  let pageCount = 1;
  while (firstPageCapacity + continuationCapacity * (pageCount - 1) < dataHeight && pageCount < dataEnd - dataStart + 1) pageCount += 1;
  if (pageCount <= 1) return { breaks: [] };
  if (pageCount > 1) {
    const compactPageCount = pageCount - 1;
    const compactCapacity = firstPageCapacity + continuationCapacity * (compactPageCount - 1);
    if (dataHeight / compactCapacity <= 1.06) {
      return { breaks: [], fitToHeight: compactPageCount };
    }
  }
  const totalCapacity = firstPageCapacity + continuationCapacity * (pageCount - 1);
  const breaks = [];
  let accumulatedHeight = 0;
  let nextBreakPage = 1;
  for (let row = dataStart; row <= dataEnd && nextBreakPage < pageCount; row += 1) {
    accumulatedHeight += serializedRowHeights[row] ?? 0;
    const capacityThroughPage = firstPageCapacity + continuationCapacity * (nextBreakPage - 1);
    const targetHeight = dataHeight * capacityThroughPage / totalCapacity;
    const remainingRows = dataEnd - row;
    const remainingPages = pageCount - nextBreakPage;
    if (accumulatedHeight >= targetHeight && remainingRows >= remainingPages) {
      breaks.push(row + 1);
      nextBreakPage += 1;
    }
  }
  return { breaks };
}
function getNoRefCellOpenTag(styleAttr, typeAttr) {
  const key = `${typeAttr}|${styleAttr}`;
  const cached = noRefCellOpenTagCache.get(key);
  if (cached !== void 0) {
    return cached;
  }
  const tag = `<c${typeAttr}${styleAttr}><v>`;
  noRefCellOpenTagCache.set(key, tag);
  return tag;
}
function getNoRefCellEmptyTag(styleAttr) {
  const cached = noRefCellEmptyTagCache.get(styleAttr);
  if (cached !== void 0) {
    return cached;
  }
  const tag = `<c${styleAttr}/>`;
  noRefCellEmptyTagCache.set(styleAttr, tag);
  return tag;
}
function getNoRefInlineStringOpenTag(styleAttr) {
  const cached = noRefInlineStringOpenTagCache.get(styleAttr);
  if (cached !== void 0) {
    return cached;
  }
  const tag = `<c t="inlineStr"${styleAttr}>`;
  noRefInlineStringOpenTagCache.set(styleAttr, tag);
  return tag;
}
function serializeSheetPr(sheet, pageSetup = sheet.pageSetup) {
  const parts = [];
  if (sheet.tabColor) {
    parts.push(`<tabColor rgb="FF${sheet.tabColor.replace(/^#/, "").toUpperCase()}"/>`);
  }
  if (pageSetup && (pageSetup.fitToWidth !== void 0 || pageSetup.fitToHeight !== void 0)) {
    parts.push(`<pageSetUpPr fitToPage="1"/>`);
  }
  return parts.length > 0 ? `<sheetPr>${parts.join("")}</sheetPr>` : "";
}
function serializePrintOptions(sheet) {
  const options = sheet.pageSetup?.options;
  if (!options) {
    return "";
  }
  const attributes = [];
  if (options.gridLines !== void 0) {
    attributes.push(`gridLines="${options.gridLines ? 1 : 0}"`);
  }
  if (options.headings !== void 0) {
    attributes.push(`headings="${options.headings ? 1 : 0}"`);
  }
  return attributes.length > 0 ? `<printOptions ${attributes.join(" ")}/>` : "";
}
function serializePageMargins(sheet) {
  const margins = sheet.pageSetup?.margins;
  if (!margins) {
    return "";
  }
  const attributes = [];
  if (margins.left !== void 0) attributes.push(`left="${margins.left}"`);
  if (margins.right !== void 0) attributes.push(`right="${margins.right}"`);
  if (margins.top !== void 0) attributes.push(`top="${margins.top}"`);
  if (margins.bottom !== void 0) attributes.push(`bottom="${margins.bottom}"`);
  if (margins.header !== void 0) attributes.push(`header="${margins.header}"`);
  if (margins.footer !== void 0) attributes.push(`footer="${margins.footer}"`);
  return attributes.length > 0 ? `<pageMargins ${attributes.join(" ")}/>` : "";
}
function serializePageSetup(pageSetup) {
  if (!pageSetup) {
    return "";
  }
  const attributes = [];
  if (pageSetup.paperSize !== void 0) attributes.push(`paperSize="${pageSetup.paperSize}"`);
  if (pageSetup.orientation) attributes.push(`orientation="${pageSetup.orientation}"`);
  if (pageSetup.scale !== void 0) attributes.push(`scale="${pageSetup.scale}"`);
  if (pageSetup.fitToWidth !== void 0) attributes.push(`fitToWidth="${pageSetup.fitToWidth}"`);
  if (pageSetup.fitToHeight !== void 0) attributes.push(`fitToHeight="${pageSetup.fitToHeight}"`);
  return attributes.length > 0 ? `<pageSetup ${attributes.join(" ")}/>` : "";
}
function dateToSerial2(value, dateSystem) {
  return dateToSerialString(value, dateSystem);
}
function serializeRichText(value, cellStyle, defaults) {
  const runs = value.map((run) => {
    const font = normalizeFont({
      ...cellStyle?.font,
      ...run.font
    }, defaults);
    const textAttrs = needsXmlSpacePreserve(run.text) ? ` xml:space="preserve"` : "";
    return `<r>${serializeRichTextRunFont(font)}<t${textAttrs}>${escapeXml(run.text)}</t></r>`;
  }).join("");
  return `<is>${runs}</is>`;
}
function serializeInlineString(value) {
  const sanitized = sanitizeSharedString(value);
  const textAttrs = needsXmlSpacePreserve(sanitized) ? ` xml:space="preserve"` : "";
  return `<is><t${textAttrs}>${escapeXml(sanitized)}</t></is>`;
}
function serializeCell(ref, cell, styleAttr, resolvedStyle, defaults, sheetName, formulaEvaluator, sharedStrings, dateSystem) {
  const refAttr = ref ? ` r="${ref}"` : "";
  const rawFormula = cell.formula;
  if (!rawFormula) {
    if (cell.value === null || cell.value === void 0) {
      if (!styleAttr) {
        return "";
      }
      return refAttr ? `<c${refAttr}${styleAttr}/>` : getNoRefCellEmptyTag(styleAttr);
    }
    if (isRichTextValue(cell.value)) {
      const defaultFont = {
        family: defaults?.font?.family ?? "Calibri",
        size: defaults?.font?.size ?? 11
      };
      return `<c${refAttr} t="inlineStr"${styleAttr}>${serializeRichText(cell.value, resolvedStyle, defaultFont)}</c>`;
    }
    if (isErrorValue(cell.value)) {
      const openTag2 = refAttr ? `<c${refAttr} t="e"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="e"`);
      return `${openTag2}${cell.value.error}</v></c>`;
    }
    if (typeof cell.value === "string") {
      if (sharedStrings) {
        const sharedIndex = sharedStrings.register(cell.value);
        const openTag3 = refAttr ? `<c${refAttr} t="s"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="s"`);
        return `${openTag3}${sharedIndex}</v></c>`;
      }
      const openTag2 = refAttr ? `<c${refAttr} t="inlineStr"${styleAttr}>` : getNoRefInlineStringOpenTag(styleAttr);
      return `${openTag2}${serializeInlineString(cell.value)}</c>`;
    }
    if (typeof cell.value === "boolean") {
      const openTag2 = refAttr ? `<c${refAttr} t="b"${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, ` t="b"`);
      return `${openTag2}${cell.value ? 1 : 0}</v></c>`;
    }
    if (cell.value instanceof Date) {
      const openTag2 = refAttr ? `<c${refAttr}${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, "");
      return `${openTag2}${dateToSerial2(cell.value, dateSystem)}</v></c>`;
    }
    const openTag = refAttr ? `<c${refAttr}${styleAttr}><v>` : getNoRefCellOpenTag(styleAttr, "");
    return `${openTag}${formatNumberForCell(cell.value)}</v></c>`;
  }
  const formula = formulaEvaluator?.getFormulaDefinition(cell) ?? null;
  if (!formula) {
    const rawExpression = typeof rawFormula === "string" ? rawFormula : rawFormula.expression;
    const formulaTag2 = `<f>${escapeXml(rawExpression)}</f>`;
    return `<c${refAttr}${styleAttr}>${formulaTag2}</c>`;
  }
  const cachedValue = formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheetName, ref ?? "");
  const formulaAttributes = [];
  const dynamicAttr = formula.dynamic ? ` cm="1"` : "";
  if (formula.arrayRange) {
    formulaAttributes.push(`t="array"`, `ref="${formula.arrayRange}"`);
  }
  const formulaTag = formulaAttributes.length > 0 ? `<f ${formulaAttributes.join(" ")}>${escapeXml(formula.expression)}</f>` : `<f>${escapeXml(formula.expression)}</f>`;
  if (cachedValue === void 0 || cachedValue === null) {
    return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}</c>`;
  }
  if (isRichTextValue(cachedValue)) {
    const text = cachedValue.map((run) => run.text).join("");
    return `<c${refAttr} t="str"${styleAttr}${dynamicAttr}>${formulaTag}<v>${escapeXml(text)}</v></c>`;
  }
  if (isErrorValue(cachedValue)) {
    return `<c${refAttr} t="e"${styleAttr}${dynamicAttr}>${formulaTag}<v>${cachedValue.error}</v></c>`;
  }
  if (typeof cachedValue === "string") {
    return `<c${refAttr} t="str"${styleAttr}${dynamicAttr}>${formulaTag}<v>${escapeXml(cachedValue)}</v></c>`;
  }
  if (typeof cachedValue === "boolean") {
    return `<c${refAttr} t="b"${styleAttr}${dynamicAttr}>${formulaTag}<v>${cachedValue ? 1 : 0}</v></c>`;
  }
  if (cachedValue instanceof Date) {
    return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}<v>${dateToSerial2(cachedValue, dateSystem)}</v></c>`;
  }
  return `<c${refAttr}${styleAttr}${dynamicAttr}>${formulaTag}<v>${formatNumberForCell(cachedValue)}</v></c>`;
}
function resolveStyleAttr(styleRegistry, resolvedStyle, cache) {
  if (!resolvedStyle) {
    return "";
  }
  const cached = cache.get(resolvedStyle);
  if (cached !== void 0) {
    return cached;
  }
  const styleIndex = styleRegistry.registerResolvedStyle(resolvedStyle);
  const styleAttr = styleIndex > 0 ? ` s="${styleIndex}"` : "";
  cache.set(resolvedStyle, styleAttr);
  return styleAttr;
}
function canCacheRawCellStyle(style, value, rowStyle) {
  return rowStyle === void 0 && typeof style === "object" && style !== null && style.preset === void 0 && !(value instanceof Date && style.numberFormat === void 0);
}
function resolveCellStyleBundle(cell, rowStyle, styleRegistry, styleAttrCache, rawStyleCache) {
  if (canCacheRawCellStyle(cell.style, cell.value, rowStyle)) {
    const cached = rawStyleCache.get(cell.style);
    if (cached !== void 0) {
      return cached;
    }
    const resolvedStyle2 = resolveCellStyle(cell.style, cell.value, rowStyle);
    const bundle = {
      resolvedStyle: resolvedStyle2,
      styleAttr: resolveStyleAttr(styleRegistry, resolvedStyle2, styleAttrCache)
    };
    rawStyleCache.set(cell.style, bundle);
    return bundle;
  }
  const resolvedStyle = resolveCellStyle(cell.style, cell.value, rowStyle);
  return {
    resolvedStyle,
    styleAttr: resolveStyleAttr(styleRegistry, resolvedStyle, styleAttrCache)
  };
}
function getDisplayValueForMetrics(cell, formulaEvaluator, sheetName, ref) {
  if (!cell.formula || !formulaEvaluator) {
    return cell.value;
  }
  const formula = formulaEvaluator.getFormulaDefinition(cell);
  if (!formula) {
    return cell.value;
  }
  return formula.cachedValue ?? formulaEvaluator?.evaluateCell(cell, sheetName, ref);
}
function resolveCellOverflowStyle(resolvedStyle, displayValue2, columnWidth, defaults, textOverflowMode) {
  if (columnWidth === void 0 || resolvedStyle?.alignment?.wrapText === true || resolvedStyle?.alignment?.shrinkToFit === true) {
    return resolvedStyle;
  }
  const requiredWidth = estimateHeuristicColumnWidth(displayValue2, resolvedStyle, defaults);
  if (requiredWidth === void 0 || requiredWidth <= columnWidth) return resolvedStyle;
  if (typeof displayValue2 === "string" && textOverflowMode !== null && requiredWidth > columnWidth * 1.35) {
    if (textOverflowMode === "wrap") {
      return {
        ...resolvedStyle,
        alignment: {
          ...resolvedStyle?.alignment,
          vertical: resolvedStyle?.alignment?.vertical ?? "top",
          wrapText: true
        }
      };
    }
    return {
      ...resolvedStyle,
      alignment: {
        ...resolvedStyle?.alignment,
        shrinkToFit: true
      }
    };
  }
  if (typeof displayValue2 !== "number" || requiredWidth <= columnWidth * 1.2) return resolvedStyle;
  return {
    ...resolvedStyle,
    alignment: {
      ...resolvedStyle?.alignment,
      shrinkToFit: true
    }
  };
}
function estimateWrappedCellHeight(cell, resolvedStyle, columnWidth, defaults) {
  if (!resolvedStyle?.alignment?.wrapText) {
    return void 0;
  }
  const displayLength = estimateDisplayLength(cell.value, resolvedStyle);
  if (displayLength === 0) {
    return void 0;
  }
  const charsPerLine = Math.max(1, Math.floor((columnWidth || (defaults?.columnWidth ?? 8.43)) * 1.15));
  const rawText = typeof cell.value === "string" ? cell.value : Array.isArray(cell.value) ? cell.value.map((run) => run.text).join("") : "";
  const explicitLineCount = rawText.length > 0 ? rawText.split(/\r\n|\r|\n/).length : 1;
  const lines = Math.max(explicitLineCount, Math.ceil(displayLength / charsPerLine));
  if (lines <= 1) {
    return void 0;
  }
  const fontSize = resolvedStyle.font?.size ?? defaults?.font?.size ?? 11;
  const estimatedHeight = Math.min(lines * fontSize * 1.6, 409);
  const defaultRowHeight = defaults?.rowHeight ?? 15;
  return estimatedHeight > defaultRowHeight ? estimatedHeight : void 0;
}
function formatFormula(value, type, dateSystem) {
  if (Array.isArray(value)) return `"${value.join(",")}"`;
  if (typeof value === "number") return String(value);
  if (type === "date" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    return dateToSerial2(new Date(value), dateSystem);
  }
  return value;
}
function serializeDataValidations(dataValidations, dateSystem) {
  if (!dataValidations || dataValidations.length === 0) {
    return "";
  }
  return `<dataValidations count="${dataValidations.length}">${dataValidations.map((validation) => {
    const attributes = [
      `sqref="${validation.ref}"`,
      `type="${validation.type}"`
    ];
    if (validation.operator) attributes.push(`operator="${validation.operator}"`);
    attributes.push(`allowBlank="${validation.allowBlank === false ? 0 : 1}"`);
    if (validation.showInputMessage !== void 0) attributes.push(`showInputMessage="${validation.showInputMessage ? 1 : 0}"`);
    attributes.push(`showErrorMessage="${validation.showErrorMessage === false ? 0 : 1}"`);
    if (validation.showDropDown !== void 0) attributes.push(`showDropDown="${validation.showDropDown ? 0 : 1}"`);
    if (validation.errorStyle) attributes.push(`errorStyle="${validation.errorStyle}"`);
    if (validation.errorTitle) attributes.push(`errorTitle="${escapeXml(validation.errorTitle)}"`);
    if (validation.error) attributes.push(`error="${escapeXml(validation.error)}"`);
    if (validation.promptTitle) attributes.push(`promptTitle="${escapeXml(validation.promptTitle)}"`);
    if (validation.prompt) attributes.push(`prompt="${escapeXml(validation.prompt)}"`);
    const f1 = formatFormula(validation.formula1, validation.type, dateSystem);
    const formulas = [`<formula1>${escapeXml(f1)}</formula1>`];
    if (validation.formula2 !== void 0) {
      const f2 = formatFormula(validation.formula2, validation.type, dateSystem);
      formulas.push(`<formula2>${escapeXml(f2)}</formula2>`);
    }
    return `<dataValidation ${attributes.join(" ")}>${formulas.join("")}</dataValidation>`;
  }).join("")}</dataValidations>`;
}
function hashPassword(password) {
  let hash = 0;
  for (let i = password.length - 1; i >= 0; i--) {
    hash = hash >> 14 & 1 | hash << 1 & 32767;
    hash ^= password.charCodeAt(i);
  }
  hash ^= password.length;
  hash ^= 52811;
  return hash.toString(16).toUpperCase().padStart(4, "0");
}
function serializeSheetProtection(protection) {
  if (!protection) {
    return "";
  }
  const attributes = [];
  if (protection.password) {
    attributes.push(`password="${hashPassword(protection.password)}"`);
  }
  const sheetEnabled = protection.sheet !== false;
  attributes.push(`sheet="${sheetEnabled ? "1" : "0"}"`);
  if (protection.objects !== void 0) {
    attributes.push(`objects="${protection.objects ? "1" : "0"}"`);
  }
  if (protection.scenarios !== void 0) {
    attributes.push(`scenarios="${protection.scenarios ? "1" : "0"}"`);
  }
  const protectedByDefault = [
    ["formatCells", "formatCells"],
    ["formatColumns", "formatColumns"],
    ["formatRows", "formatRows"],
    ["insertColumns", "insertColumns"],
    ["insertRows", "insertRows"],
    ["insertHyperlinks", "insertHyperlinks"],
    ["deleteColumns", "deleteColumns"],
    ["deleteRows", "deleteRows"],
    ["sort", "sort"],
    ["autoFilter", "autoFilter"],
    ["pivotTables", "pivotTables"]
  ];
  for (const [key, attr] of protectedByDefault) {
    const value = protection[key];
    if (value !== void 0) {
      attributes.push(`${attr}="${value ? "1" : "0"}"`);
    }
  }
  if (protection.selectLockedCells !== void 0) {
    attributes.push(`selectLockedCells="${protection.selectLockedCells ? "1" : "0"}"`);
  }
  if (protection.selectUnlockedCells !== void 0) {
    attributes.push(`selectUnlockedCells="${protection.selectUnlockedCells ? "1" : "0"}"`);
  }
  return `<sheetProtection ${attributes.join(" ")}/>`;
}
function isEmptyPlaceholderCell(cell) {
  return cell.formula === void 0 && (cell.value === null || cell.value === void 0);
}
function serializesCellWithoutGap(cell) {
  return cell.formula !== void 0 || cell.value !== null && cell.value !== void 0 || cell.style !== void 0;
}
function canInferCellRefFromPosition(cell) {
  return cell.formula === void 0 && cell.hyperlink === void 0 && cell.comment === void 0;
}
function columnNeedsHeuristicWidth2(column) {
  return column?.width === void 0 && column?.bestFit === true;
}
function shouldEstimateWrappedRowHeights(sheet, totalSourceRows, sheetColumnCount, rowExpansionFactor) {
  if (rowExpansionFactor !== 1 || sheet.pageSetup?.printArea || sheet.pageSetup?.fitToHeight !== void 0) {
    return true;
  }
  return totalSourceRows * Math.max(1, sheetColumnCount) <= 1e5;
}
function serializeSheetChunks(sheet, options) {
  const defaultColWidth = String(clampColumnWidth(options.defaults?.columnWidth ?? 8.43));
  const rowChunkSize = Math.min(1e4, Math.max(100, options.rowChunkSize ?? 1e3));
  const sheetColumnCount = getSheetColumnCount(sheet);
  const columnLetters = Array.from({ length: sheetColumnCount }, (_unused, index) => colIndexToLetter(index));
  const tableBindings = options.tableBindings ?? [];
  const pivotTableBindings = options.pivotTableBindings ?? [];
  const dateSystem = options.dateSystem ?? "1900";
  const builder = new SheetXmlBuilder([
    `xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`,
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`
  ]);
  const structure = compileSheetStructure(sheet);
  const printArea = inferredPrintArea(sheet, structure);
  const densityPageSetup = densityAdaptivePageSetup(sheet, printArea);
  const printBounds = printArea === void 0 ? void 0 : parseRangeRef(printArea);
  const usedPrintRows = printBounds === void 0 ? 0 : printBounds.endRow - printBounds.startRow + 1;
  const usedPrintColumns = printBounds === void 0 ? 0 : printBounds.endCol - printBounds.startCol + 1;
  const autoWrapMaterialText = densityPageSetup?.paperSize !== 11 || usedPrintRows >= 10 && !sheet.rows.some((row) => row.cells.length === 0);
  const hasDedicatedChartFollowingData = (sheet.charts ?? []).some((chart) => chart.anchor.from.row >= sheet.rows.length);
  const onePageDashboardWrapColumn = hasDedicatedChartFollowingData && sheet.pageSetup?.fitToHeight === 1 ? (sheet.columns ?? []).findIndex((column, columnIndex) => column.width !== void 0 && column.width >= 24 && sheet.rows.some((row) => {
    const value = row.cells[columnIndex]?.value;
    return typeof value === "string" && value.length > column.width * 1.35;
  })) : -1;
  const explicitColumnWidth = (sheet.columns ?? []).reduce((sum, column) => sum + (column.width ?? 0), 0);
  const hasCompactKeyValueSummary = sheet.rows.slice(0, 10).some((row) => row.cells.length === 2 && typeof row.cells[0]?.value === "string" && row.cells[0].value.length >= 12) && sheet.rows.some((row) => row.cells.length >= 5);
  const semanticMinimumColumnWidths = (sheet.columns ?? []).map((_column, columnIndex) => Math.min(
    30,
    Math.max(0, ...sheet.rows.map((row) => {
      const cell = row.cells[columnIndex];
      const style = typeof cell?.style === "object" && cell.style !== null ? cell.style : void 0;
      const explicitWidth = sheet.columns?.[columnIndex]?.width;
      return typeof cell?.value === "string" && style?.alignment?.horizontal === "right" && explicitWidth !== void 0 && cell.value.length > explicitWidth * 1.6 ? cell.value.length / 1.05 : 0;
    }))
  ));
  const dedicatedDashboardColumnExpansion = hasDedicatedChartFollowingData && usedPrintColumns <= 10 && explicitColumnWidth > 0 ? Math.max(1, Math.min(1.4, 125 / explicitColumnWidth)) : 1;
  const portraitRegisterColumnExpansion = (sheet.charts?.length ?? 0) === 0 && densityPageSetup?.orientation === "portrait" && densityPageSetup.fitToWidth === 1 && densityPageSetup.fitToHeight === 0 && usedPrintRows >= 10 && usedPrintColumns <= 7 && explicitColumnWidth > 0 ? Math.max(1, Math.min(1.8, 105 / explicitColumnWidth)) : 1;
  const columnExpansionFactor = dedicatedDashboardColumnExpansion > 1 ? dedicatedDashboardColumnExpansion : portraitRegisterColumnExpansion > 1 ? portraitRegisterColumnExpansion : densityPageSetup?.paperSize === 11 && densityPageSetup.fitToHeight === 1 && usedPrintRows >= 10 && usedPrintRows <= 24 && usedPrintColumns <= 8 && sheetHasMaterialTextOverflow(sheet) && !sheet.rows.some((row) => row.cells.length === 0) ? 1.55 : densityPageSetup?.fitToHeight === 2 && usedPrintRows <= 48 && usedPrintColumns > 10 && (sheet.charts?.length ?? 0) === 0 && (sheet.images?.length ?? 0) === 0 ? 1.35 : 1;
  const expandedColumnWidth = (width, index) => Math.max(
    width * columnExpansionFactor,
    hasCompactKeyValueSummary && index === 0 ? 18 : 0,
    semanticMinimumColumnWidths[index] ?? 0
  );
  const hasSemanticColumnExpansion = (sheet.columns ?? []).some((column, index) => column.width !== void 0 && (semanticMinimumColumnWidths[index] ?? 0) > column.width);
  const printLayoutSheet = columnExpansionFactor === 1 && !hasCompactKeyValueSummary && !hasSemanticColumnExpansion ? sheet : {
    ...sheet,
    columns: sheet.columns?.map((column, index) => column.width === void 0 ? column : { ...column, width: expandedColumnWidth(column.width, index) })
  };
  const rowExpansionFactor = printRowExpansionFactor(
    printLayoutSheet,
    options.defaults,
    printArea,
    densityPageSetup
  );
  const hasChartDrawings = (sheet.charts?.length ?? 0) > 0;
  const defaultRowHeight = String((options.defaults?.rowHeight ?? 15) * (hasChartDrawings ? 1 : rowExpansionFactor));
  const sheetViewAttributes = [`workbookViewId="0"`];
  if (options.selected) {
    sheetViewAttributes.push(`tabSelected="1"`);
  }
  if (sheet.rightToLeft) {
    sheetViewAttributes.push(`rightToLeft="1"`);
  }
  const freezePane = sheet.freezePane;
  if ((freezePane?.row ?? 0) > 0 || (freezePane?.col ?? 0) > 0) {
    const xSplit = freezePane && freezePane.col > 0 ? ` xSplit="${freezePane.col}"` : "";
    const ySplit = freezePane && freezePane.row > 0 ? ` ySplit="${freezePane.row}"` : "";
    const topLeftCell = cellRef(freezePane?.row ?? 0, freezePane?.col ?? 0);
    const activePane = freezePane && freezePane.row > 0 && freezePane.col > 0 ? "bottomRight" : freezePane && freezePane.row > 0 ? "bottomLeft" : "topRight";
    builder.setSheetViews(
      `<sheetViews><sheetView ${sheetViewAttributes.join(" ")}><pane${xSplit}${ySplit} topLeftCell="${topLeftCell}" activePane="${activePane}" state="frozen"/><selection pane="${activePane}" activeCell="${topLeftCell}" sqref="${topLeftCell}"/></sheetView></sheetViews>`
    );
  } else {
    builder.setSheetViews(`<sheetViews><sheetView ${sheetViewAttributes.join(" ")}/></sheetViews>`);
  }
  const dimensionRef = structure.maxCol >= 0 && structure.maxRow >= 0 ? structure.maxCol === 0 && structure.maxRow === 0 ? cellRef(0, 0) : absRangeRef(0, 0, structure.maxRow, structure.maxCol).replaceAll("$", "") : "A1";
  builder.setDimension(`<dimension ref="${dimensionRef}"/>`);
  builder.setSheetFormatPr(`<sheetFormatPr defaultRowHeight="${defaultRowHeight}" defaultColWidth="${defaultColWidth}"/>`);
  const columnCount = getSheetColumnCount(sheet);
  const computedColumns = Array.from(
    { length: columnCount },
    (_unused, index) => {
      const explicit = sheet.columns?.[index];
      return explicit?.width !== void 0 ? { width: clampColumnWidth(expandedColumnWidth(explicit.width, index)), bestFit: explicit.bestFit ?? false } : void 0;
    }
  );
  const hyperlinkParts = [];
  const collectedComments = [];
  const worksheetRelationships = [];
  const styleAttrCache = /* @__PURE__ */ new WeakMap();
  const rawCellStyleCache = /* @__PURE__ */ new WeakMap();
  const syntheticTableCellsByRow = buildWorksheetSyntheticTableCells(tableBindings);
  const syntheticRowIndices = [...syntheticTableCellsByRow.keys()];
  const maxSyntheticRowIndex = syntheticRowIndices.length > 0 ? Math.max(...syntheticRowIndices) : -1;
  const totalSourceRows = Math.max(sheet.rows.length, maxSyntheticRowIndex + 1);
  const estimateWrappedRowHeights = shouldEstimateWrappedRowHeights(
    sheet,
    totalSourceRows,
    sheetColumnCount,
    rowExpansionFactor
  );
  const rowChunks = [];
  let chunkStartRowNumber = 0;
  let chunkEndRowNumber = 0;
  let chunkSourceRowCount = 0;
  let chunkSerializedRowCount = 0;
  let chunkCellCount = 0;
  let chunkXml = "";
  let totalSerializedRows = 0;
  let totalCellsWritten = 0;
  const serializedRowHeights = Array.from(
    { length: totalSourceRows },
    () => Number(defaultRowHeight)
  );
  const canUseSimpleRowPath = syntheticTableCellsByRow.size === 0 && structure.mergeRanges.length === 0 && structure.rows.length === sheet.rows.length && structure.rows.every((structuredRow, rowIndex) => structuredRow.row === rowIndex && structuredRow.cells.length === (sheet.rows[rowIndex]?.cells.length ?? 0) && structuredRow.cells.every((entry, columnIndex) => entry.col === columnIndex));
  const flushChunk = () => {
    if (chunkSourceRowCount === 0) {
      return;
    }
    const xml = chunkXml;
    rowChunks.push({
      startRowNumber: chunkStartRowNumber,
      endRowNumber: chunkEndRowNumber,
      sourceRowCount: chunkSourceRowCount,
      serializedRowCount: chunkSerializedRowCount,
      cellCount: chunkCellCount,
      byteLength: Buffer.byteLength(xml, "utf8"),
      xml
    });
    chunkStartRowNumber = 0;
    chunkEndRowNumber = 0;
    chunkSourceRowCount = 0;
    chunkSerializedRowCount = 0;
    chunkCellCount = 0;
    chunkXml = "";
  };
  const positionedRowMap = canUseSimpleRowPath ? void 0 : new Map(structure.rows.map((row) => [row.row, row]));
  const originRowMap = canUseSimpleRowPath ? void 0 : new Map(structure.originCells.map((row) => [row.row, row]));
  const headerRowStyle = resolveCellStyle(sheet.styling?.headerRow, void 0);
  const alternateOddStyle = resolveCellStyle(sheet.styling?.alternateRows?.odd, void 0);
  const alternateEvenStyle = resolveCellStyle(sheet.styling?.alternateRows?.even, void 0);
  for (let rowIndex = 0; rowIndex < totalSourceRows; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? { cells: [] };
    const mergedCells = canUseSimpleRowPath ? [] : (() => {
      const positionedRow = positionedRowMap?.get(rowIndex) ?? { row: rowIndex, cells: [] };
      const syntheticCells = syntheticTableCellsByRow.get(rowIndex) ?? [];
      const cellMap = new Map(
        positionedRow.cells.map((entry) => [entry.col, entry])
      );
      syntheticCells.forEach((entry) => {
        const existing = cellMap.get(entry.col);
        if (!existing || isEmptyPlaceholderCell(existing.cell)) {
          cellMap.set(entry.col, {
            col: entry.col,
            cell: entry.cell
          });
        }
      });
      return [...cellMap.values()].sort((left, right) => left.col - right.col);
    })();
    const rowNumber = rowIndex + 1;
    if (chunkSourceRowCount === 0) {
      chunkStartRowNumber = rowNumber;
    }
    chunkEndRowNumber = rowNumber;
    chunkSourceRowCount += 1;
    const rowStyle = rowIndex === 0 ? headerRowStyle : rowNumber % 2 === 0 ? alternateEvenStyle : alternateOddStyle;
    let cellXml = "";
    let cellCount = 0;
    const preserveCompactSpacerHeight = row.height === void 0 && rowExpansionFactor > 1 && row.cells.length === 0;
    const expandChartTableRow = row.height === void 0 && hasChartDrawings && rowExpansionFactor > 1 && row.cells.length > 0;
    let estimatedHeight = row.height === void 0 ? preserveCompactSpacerHeight || expandChartTableRow ? (options.defaults?.rowHeight ?? 15) * (expandChartTableRow ? rowExpansionFactor : 1) : void 0 : row.height * rowExpansionFactor;
    let adjustedHeight = row.height !== void 0 || preserveCompactSpacerHeight || expandChartTableRow;
    const originColumns = canUseSimpleRowPath ? void 0 : new Set((originRowMap?.get(rowIndex)?.cells ?? []).map((cell) => cell.col));
    const canOmitCellRefs = canUseSimpleRowPath && row.cells.length >= 16 && row.cells.every((cell) => serializesCellWithoutGap(cell) && canInferCellRefFromPosition(cell));
    if (canUseSimpleRowPath) {
      for (let col = 0; col < row.cells.length; col += 1) {
        const cell = row.cells[col];
        const needsColumnWidth = columnNeedsHeuristicWidth2(sheet.columns?.[col]);
        const needsWrappedHeight = estimateWrappedRowHeights && row.height === void 0;
        const needsRef = !canOmitCellRefs || cell.hyperlink !== void 0 || cell.comment !== void 0 || options.formulaEvaluator !== null && cell.formula !== void 0;
        let fallbackRef;
        const getFallbackRef = () => {
          if (fallbackRef === void 0) {
            fallbackRef = `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`;
          }
          return fallbackRef;
        };
        const ref = needsRef ? getFallbackRef() : void 0;
        const styleBundle = resolveCellStyleBundle(
          cell,
          rowStyle,
          options.styleRegistry,
          styleAttrCache,
          rawCellStyleCache
        );
        const resolvedStyle = resolveCellOverflowStyle(
          styleBundle.resolvedStyle,
          getDisplayValueForMetrics(cell, options.formulaEvaluator, sheet.name, ref ?? getFallbackRef()),
          sheet.columns?.[col]?.width === void 0 ? void 0 : computedColumns[col]?.width,
          options.defaults,
          (cell.colSpan ?? 1) !== 1 || row.cells.length <= 1 ? null : hasDedicatedChartFollowingData ? col === onePageDashboardWrapColumn ? "wrap" : "shrink" : autoWrapMaterialText ? densityPageSetup?.fitToHeight === 1 && usedPrintColumns < 8 ? "wrap" : "shrink" : null
        );
        const styleAttr = resolvedStyle === styleBundle.resolvedStyle ? styleBundle.styleAttr : resolveStyleAttr(options.styleRegistry, resolvedStyle, styleAttrCache);
        const serialized = serializeCell(
          ref,
          cell,
          styleAttr,
          resolvedStyle,
          options.defaults,
          sheet.name,
          options.formulaEvaluator,
          options.sharedStrings,
          dateSystem
        );
        if (serialized) {
          cellXml += serialized;
          cellCount += 1;
        }
        let displayValue2;
        if (needsColumnWidth || needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          displayValue2 = getDisplayValueForMetrics(
            cell,
            options.formulaEvaluator,
            sheet.name,
            ref ?? getFallbackRef()
          );
        }
        if (needsColumnWidth) {
          const heuristicWidth = estimateHeuristicColumnWidth(
            displayValue2,
            resolvedStyle,
            options.defaults
          );
          if (heuristicWidth !== void 0) {
            const existing = computedColumns[col];
            if (!existing || heuristicWidth > existing.width) {
              computedColumns[col] = {
                width: heuristicWidth,
                bestFit: true
              };
            }
          }
        }
        if (cell.hyperlink) {
          const hyperlink = normalizeHyperlink(cell.hyperlink);
          const attributes = [`ref="${ref}"`];
          if (hyperlink.display) {
            attributes.push(`display="${escapeXml(hyperlink.display)}"`);
          }
          if (hyperlink.tooltip) {
            attributes.push(`tooltip="${escapeXml(hyperlink.tooltip)}"`);
          }
          if (hyperlink.mode === "internal") {
            attributes.push(`location="${escapeXml(hyperlink.location)}"`);
          } else {
            const relationshipId = `rId${worksheetRelationships.length + 1}`;
            worksheetRelationships.push({
              id: relationshipId,
              target: hyperlink.target,
              type: "hyperlink"
            });
            attributes.push(`r:id="${relationshipId}"`);
          }
          hyperlinkParts.push(`<hyperlink ${attributes.join(" ")}/>`);
        }
        if (cell.comment) {
          collectedComments.push({
            ref,
            row: rowIndex,
            col,
            author: cell.comment.author,
            text: cell.comment.text
          });
        }
        if (needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          const wrappedHeight = estimateWrappedCellHeight(
            { ...cell, value: displayValue2 },
            resolvedStyle,
            Array.from({ length: cell.colSpan ?? 1 }, (_unused, offset) => computedColumns[col + offset]?.width ?? (options.defaults?.columnWidth ?? 8.43)).reduce((sum, width) => sum + width, 0),
            options.defaults
          );
          if (wrappedHeight !== void 0) {
            estimatedHeight = Math.max(
              estimatedHeight ?? (options.defaults?.rowHeight ?? 15) * rowExpansionFactor,
              wrappedHeight * rowExpansionFactor
            );
            adjustedHeight = true;
          }
        }
      }
    } else {
      for (const { cell, col } of mergedCells) {
        let ref;
        const isOriginCell = originColumns?.has(col) === true;
        const needsColumnWidth = isOriginCell && columnNeedsHeuristicWidth2(sheet.columns?.[col]);
        const needsWrappedHeight = estimateWrappedRowHeights && row.height === void 0;
        const needsRef = !canOmitCellRefs || isOriginCell && (cell.hyperlink !== void 0 || cell.comment !== void 0) || options.formulaEvaluator !== null && cell.formula !== void 0;
        const ensureRef = () => {
          if (ref === void 0) {
            ref = `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`;
          }
          return ref;
        };
        const styleBundle = resolveCellStyleBundle(
          cell,
          rowStyle,
          options.styleRegistry,
          styleAttrCache,
          rawCellStyleCache
        );
        const resolvedStyle = resolveCellOverflowStyle(
          styleBundle.resolvedStyle,
          getDisplayValueForMetrics(
            cell,
            options.formulaEvaluator,
            sheet.name,
            needsRef ? ensureRef() : `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`
          ),
          sheet.columns?.[col]?.width === void 0 ? void 0 : computedColumns[col]?.width,
          options.defaults,
          (cell.colSpan ?? 1) !== 1 || mergedCells.length <= 1 ? null : hasDedicatedChartFollowingData ? col === onePageDashboardWrapColumn ? "wrap" : "shrink" : autoWrapMaterialText ? densityPageSetup?.fitToHeight === 1 && usedPrintColumns < 8 ? "wrap" : "shrink" : null
        );
        const styleAttr = resolvedStyle === styleBundle.resolvedStyle ? styleBundle.styleAttr : resolveStyleAttr(options.styleRegistry, resolvedStyle, styleAttrCache);
        const serialized = serializeCell(
          needsRef ? ensureRef() : void 0,
          cell,
          styleAttr,
          resolvedStyle,
          options.defaults,
          sheet.name,
          options.formulaEvaluator,
          options.sharedStrings,
          dateSystem
        );
        if (serialized) {
          cellXml += serialized;
          cellCount += 1;
        }
        let displayValue2;
        const getDisplayValue = () => {
          if (displayValue2 === void 0) {
            displayValue2 = getDisplayValueForMetrics(
              cell,
              options.formulaEvaluator,
              sheet.name,
              needsRef ? ensureRef() : `${columnLetters[col] ?? colIndexToLetter(col)}${rowNumber}`
            );
          }
          return displayValue2;
        };
        if (needsColumnWidth) {
          const heuristicWidth = estimateHeuristicColumnWidth(
            getDisplayValue(),
            resolvedStyle,
            options.defaults
          );
          if (heuristicWidth !== void 0) {
            const existing = computedColumns[col];
            if (!existing || heuristicWidth > existing.width) {
              computedColumns[col] = {
                width: heuristicWidth,
                bestFit: true
              };
            }
          }
        }
        if (isOriginCell && cell.hyperlink) {
          const refValue = ensureRef();
          const hyperlink = normalizeHyperlink(cell.hyperlink);
          const attributes = [`ref="${refValue}"`];
          if (hyperlink.display) {
            attributes.push(`display="${escapeXml(hyperlink.display)}"`);
          }
          if (hyperlink.tooltip) {
            attributes.push(`tooltip="${escapeXml(hyperlink.tooltip)}"`);
          }
          if (hyperlink.mode === "internal") {
            attributes.push(`location="${escapeXml(hyperlink.location)}"`);
          } else {
            const relationshipId = `rId${worksheetRelationships.length + 1}`;
            worksheetRelationships.push({
              id: relationshipId,
              target: hyperlink.target,
              type: "hyperlink"
            });
            attributes.push(`r:id="${relationshipId}"`);
          }
          hyperlinkParts.push(`<hyperlink ${attributes.join(" ")}/>`);
        }
        if (isOriginCell && cell.comment) {
          collectedComments.push({
            ref: ensureRef(),
            row: rowIndex,
            col,
            author: cell.comment.author,
            text: cell.comment.text
          });
        }
        if (needsWrappedHeight && resolvedStyle?.alignment?.wrapText) {
          const wrappedHeight = estimateWrappedCellHeight(
            { ...cell, value: getDisplayValue() },
            resolvedStyle,
            Array.from({ length: cell.colSpan ?? 1 }, (_unused, offset) => computedColumns[col + offset]?.width ?? (options.defaults?.columnWidth ?? 8.43)).reduce((sum, width) => sum + width, 0),
            options.defaults
          );
          if (wrappedHeight !== void 0) {
            estimatedHeight = Math.max(
              estimatedHeight ?? (options.defaults?.rowHeight ?? 15) * rowExpansionFactor,
              wrappedHeight * rowExpansionFactor
            );
            adjustedHeight = true;
          }
        }
      }
    }
    serializedRowHeights[rowIndex] = row.hidden ? 0 : estimatedHeight ?? Number(defaultRowHeight);
    const shouldSerializeRow = cellCount > 0 || row.hidden || estimatedHeight !== void 0;
    if (!shouldSerializeRow) {
      continue;
    }
    const canOmitRowRef = canOmitCellRefs && totalSourceRows >= LARGE_ROW_REF_OMISSION_THRESHOLD && !adjustedHeight && !row.hidden;
    if (canOmitRowRef) {
      chunkXml += `${SIMPLE_ROW_OPEN_TAG}${cellXml}${SIMPLE_ROW_CLOSE_TAG}`;
    } else if (!adjustedHeight && !row.hidden) {
      chunkXml += `<row r="${rowNumber}">${cellXml}</row>`;
    } else {
      const rowAttributes = [`r="${rowNumber}"`];
      if (estimatedHeight !== void 0 && adjustedHeight) {
        rowAttributes.push(`ht="${estimatedHeight}"`, `customHeight="1"`);
      }
      if (row.hidden) {
        rowAttributes.push(`hidden="1"`);
      }
      chunkXml += `<row ${rowAttributes.join(" ")}>${cellXml}</row>`;
    }
    chunkSerializedRowCount += 1;
    totalSerializedRows += 1;
    chunkCellCount += cellCount;
    totalCellsWritten += cellCount;
    if (chunkSourceRowCount >= rowChunkSize) {
      flushChunk();
    }
  }
  flushChunk();
  const columnLayout = buildColumnLayout(printLayoutSheet, computedColumns, options.defaults);
  if (columnLayout.segments.length > 0) {
    builder.setCols(`<cols>${columnLayout.segments.map((segment) => {
      const attributes = [`min="${segment.start}"`, `max="${segment.end}"`, `width="${segment.width}"`];
      if (segment.customWidth) attributes.push(`customWidth="1"`);
      if (segment.hidden) attributes.push(`hidden="1"`);
      if (segment.bestFit) attributes.push(`bestFit="1"`);
      return `<col ${attributes.join(" ")}/>`;
    }).join("")}</cols>`);
  }
  const densityAwareSheet = densityPageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: densityPageSetup };
  const autoFitToWidth = densityPageSetup?.scale === void 0 && densityPageSetup?.fitToWidth === void 0 && sheetExceedsPrintableWidth(densityAwareSheet, options.defaults);
  const widthAwarePageSetup = autoFitToWidth ? { ...densityPageSetup, fitToWidth: 1, fitToHeight: densityPageSetup?.fitToHeight ?? 0 } : densityPageSetup;
  const effectivePageSetup = densityAdaptivePageSetup(
    widthAwarePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: widthAwarePageSetup },
    printArea
  );
  const sheetPr = serializeSheetPr(sheet, effectivePageSetup);
  if (sheetPr) {
    builder.setSheetPr(sheetPr);
  }
  if (structure.autoFilterRef) {
    builder.setAutoFilter(`<autoFilter ref="${structure.autoFilterRef}"/>`);
  }
  const sheetProtectionXml = serializeSheetProtection(sheet.protection);
  if (sheetProtectionXml) {
    builder.setSheetProtection(sheetProtectionXml);
  }
  if (structure.mergeRanges.length > 0) {
    builder.setMergeCells(
      `<mergeCells count="${structure.mergeRanges.length}">${structure.mergeRanges.map((merge) => `<mergeCell ref="${merge.ref}"/>`).join("")}</mergeCells>`
    );
  }
  const conditionalFormatting = serializeConditionalFormatting(sheet.conditionalFormatting, options.styleRegistry);
  if (conditionalFormatting.xml) {
    builder.addConditionalFormatting(conditionalFormatting.xml);
  }
  if (conditionalFormatting.extLst) {
    builder.setExtLst(conditionalFormatting.extLst);
  }
  const dataValidations = serializeDataValidations(sheet.dataValidations, dateSystem);
  if (dataValidations) {
    builder.setDataValidations(dataValidations);
  }
  if (hyperlinkParts.length > 0) {
    builder.setHyperlinks(`<hyperlinks>${hyperlinkParts.join("")}</hyperlinks>`);
  }
  const printOptions = serializePrintOptions(sheet);
  if (printOptions) {
    builder.setPrintOptions(printOptions);
  }
  const pageMargins = serializePageMargins(
    effectivePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: effectivePageSetup }
  );
  if (pageMargins) {
    builder.setPageMargins(pageMargins);
  }
  const candidateRowBreaks = chartSafeRowBreaks(
    effectivePageSetup === sheet.pageSetup ? sheet : { ...sheet, pageSetup: effectivePageSetup },
    options.defaults
  );
  const balancedTablePages = balancedUnconstrainedTablePages(
    printLayoutSheet,
    effectivePageSetup,
    printArea,
    serializedRowHeights,
    options.defaults
  );
  const rowBreaks = [.../* @__PURE__ */ new Set([
    ...(sheet.charts?.length ?? 0) > 0 || hasCompactKeyValueSummary ? candidateRowBreaks : [],
    ...balancedTablePages.breaks
  ])].sort((left, right) => left - right);
  const pageSetupWithManualBalance = rowBreaks.length > 0 && (sheet.charts?.length ?? 0) === 0 && typeof effectivePageSetup?.fitToHeight === "number" && effectivePageSetup.fitToHeight > 1 && hasCompactKeyValueSummary && sheet.pageSetup?.fitToHeight !== effectivePageSetup.fitToHeight ? { ...effectivePageSetup, fitToHeight: 0 } : effectivePageSetup;
  const pageSetup = serializePageSetup(
    balancedTablePages.fitToHeight === void 0 ? pageSetupWithManualBalance : { ...pageSetupWithManualBalance, fitToHeight: balancedTablePages.fitToHeight }
  );
  if (pageSetup) {
    builder.setPageSetup(pageSetup);
  }
  if (rowBreaks.length > 0) {
    const breaks = rowBreaks.map((row) => `<brk id="${row}" min="0" max="16383" man="1"/>`).join("");
    builder.setRowBreaks(`<rowBreaks count="${rowBreaks.length}" manualBreakCount="${rowBreaks.length}">${breaks}</rowBreaks>`);
  }
  if (tableBindings.length > 0) {
    const tableParts = tableBindings.map((binding) => {
      const relationshipId = `rId${worksheetRelationships.length + 1}`;
      worksheetRelationships.push({
        id: relationshipId,
        target: `../tables/${binding.partName}`,
        type: "table"
      });
      return `<tablePart r:id="${relationshipId}"/>`;
    });
    builder.setTableParts(`<tableParts count="${tableParts.length}">${tableParts.join("")}</tableParts>`);
  }
  if (pivotTableBindings.length > 0) {
    pivotTableBindings.forEach((binding) => {
      const relationshipId = `rId${worksheetRelationships.length + 1}`;
      worksheetRelationships.push({
        id: relationshipId,
        target: `../pivotTables/${binding.partName}`,
        type: "pivotTable"
      });
    });
  }
  if (collectedComments.length > 0) {
    const sheetNumber = options.sheetIndex + 1;
    const commentRelId = `rId${worksheetRelationships.length + 1}`;
    worksheetRelationships.push({
      id: commentRelId,
      target: `../comments${sheetNumber}.xml`,
      type: "comment"
    });
    const vmlRelId = `rId${worksheetRelationships.length + 1}`;
    worksheetRelationships.push({
      id: vmlRelId,
      target: `../drawings/vmlDrawing${sheetNumber}.vml`,
      type: "vmlDrawing"
    });
    builder.setLegacyDrawing(`<legacyDrawing r:id="${vmlRelId}"/>`);
  }
  const hasImages = sheet.images && sheet.images.length > 0;
  const hasCharts = sheet.charts && sheet.charts.length > 0;
  if (hasImages || hasCharts) {
    const drawingRelId = `rId${worksheetRelationships.length + 1}`;
    const sheetNumber = options.sheetIndex + 1;
    worksheetRelationships.push({
      id: drawingRelId,
      target: `../drawings/drawing${sheetNumber}.xml`,
      type: "drawing"
    });
    builder.setDrawing(`<drawing r:id="${drawingRelId}"/>`);
  }
  const envelope = builder.buildSheetDataEnvelope();
  return {
    prefix: envelope.prefix,
    suffix: envelope.suffix,
    rowChunks,
    comments: collectedComments,
    metrics: {
      totalRowsWritten: totalSourceRows,
      totalSerializedRows,
      totalCellsWritten,
      chunkCount: rowChunks.length
    },
    autoFilterRef: structure.autoFilterRef,
    printArea,
    printTitles: sheet.pageSetup?.printTitles,
    relationships: worksheetRelationships.length > 0 ? serializeWorksheetRelationships(worksheetRelationships) : void 0
  };
}

// src/serializers/theme-serializer.ts
var DEFAULT_COLORS = {
  dk2: "44546A",
  lt2: "E7E6E6",
  accent1: "4472C4",
  accent2: "ED7D31",
  accent3: "A9D18E",
  accent4: "FFC000",
  accent5: "5B9BD5",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72"
};
function stripHash(hex) {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}
function emitColorSlot(slot, override) {
  if (override) {
    return `<a:${slot}><a:srgbClr val="${stripHash(override).toUpperCase()}"/></a:${slot}>`;
  }
  if (slot === "dk1") {
    return `<a:dk1><a:sysClr lastClr="000000" val="windowText"/></a:dk1>`;
  }
  if (slot === "lt1") {
    return `<a:lt1><a:sysClr lastClr="FFFFFF" val="window"/></a:lt1>`;
  }
  return `<a:${slot}><a:srgbClr val="${DEFAULT_COLORS[slot]}"/></a:${slot}>`;
}
function serializeTheme(themeConfig) {
  const themeName = themeConfig?.name ?? "Office Theme";
  const colorSlots = [
    "dk1",
    "lt1",
    "dk2",
    "lt2",
    "accent1",
    "accent2",
    "accent3",
    "accent4",
    "accent5",
    "accent6",
    "hlink",
    "folHlink"
  ];
  const colorSchemeXml = colorSlots.map((slot) => emitColorSlot(slot, themeConfig?.colorScheme?.[slot])).join("");
  const majorLatin = themeConfig?.fontScheme?.majorLatin ?? "Calibri Light";
  const minorLatin = themeConfig?.fontScheme?.minorLatin ?? "Calibri";
  const majorEa = themeConfig?.fontScheme?.majorEa ?? "";
  const minorEa = themeConfig?.fontScheme?.minorEa ?? "";
  return [
    XML_DECLARATION,
    `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(themeName)}">`,
    `<a:themeElements>`,
    `<a:clrScheme name="${escapeXml(themeName)}">${colorSchemeXml}</a:clrScheme>`,
    `<a:fontScheme name="Office">`,
    `<a:majorFont>`,
    `<a:latin typeface="${escapeXml(majorLatin)}" panose="020F0302020204030204"/>`,
    `<a:ea typeface="${escapeXml(majorEa)}"/>`,
    `<a:cs typeface=""/>`,
    `<a:font script="Jpan" typeface="Yu Gothic Light"/>`,
    `<a:font script="Hang" typeface="Malgun Gothic"/>`,
    `<a:font script="Hans" typeface="DengXian Light"/>`,
    `<a:font script="Hant" typeface="PMingLiU"/>`,
    `<a:font script="Arab" typeface="Times New Roman"/>`,
    `<a:font script="Hebr" typeface="Times New Roman"/>`,
    `<a:font script="Thai" typeface="Angsana New"/>`,
    `<a:font script="Deva" typeface="Mangal"/>`,
    `</a:majorFont>`,
    `<a:minorFont>`,
    `<a:latin typeface="${escapeXml(minorLatin)}" panose="020F0502020204030204"/>`,
    `<a:ea typeface="${escapeXml(minorEa)}"/>`,
    `<a:cs typeface=""/>`,
    `<a:font script="Jpan" typeface="Yu Gothic"/>`,
    `<a:font script="Hang" typeface="Malgun Gothic"/>`,
    `<a:font script="Hans" typeface="DengXian"/>`,
    `<a:font script="Hant" typeface="PMingLiU"/>`,
    `<a:font script="Arab" typeface="Arial"/>`,
    `<a:font script="Hebr" typeface="Arial"/>`,
    `<a:font script="Thai" typeface="Cordia New"/>`,
    `<a:font script="Deva" typeface="Mangal"/>`,
    `</a:minorFont>`,
    `</a:fontScheme>`,
    `<a:fmtScheme name="Office">`,
    `<a:fillStyleLst>`,
    `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`,
    `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`,
    `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`,
    `</a:fillStyleLst>`,
    `<a:lnStyleLst>`,
    `<a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`,
    `<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`,
    `<a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`,
    `</a:lnStyleLst>`,
    `<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst>`,
    `<a:bgFillStyleLst>`,
    `<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>`,
    `<a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>`,
    `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:lumMod val="102000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="90000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`,
    `</a:bgFillStyleLst>`,
    `</a:fmtScheme>`,
    `</a:themeElements>`,
    `<a:objectDefaults/>`,
    `<a:extraClrSchemeLst/>`,
    `</a:theme>`
  ].join("");
}

// src/serializers/workbook-serializer.ts
function absolutizeWorksheetRef(ref) {
  const [sheetName, range] = ref.split("!");
  if (!range) {
    const parsed2 = parseRangeRef(ref);
    return absRangeRef(parsed2.startRow, parsed2.startCol, parsed2.endRow, parsed2.endCol);
  }
  const parsed = parseRangeRef(range);
  return `${sheetName}!${absRangeRef(parsed.startRow, parsed.startCol, parsed.endRow, parsed.endCol)}`;
}
function parseDefinedNameSheetName2(ref) {
  const match = /^(?:'((?:''|[^'])+)'|([^!]+))!(.+)$/.exec(ref.trim());
  if (!match) {
    return void 0;
  }
  return (match[1] ?? match[2] ?? "").replaceAll("''", "'");
}
function assertNamedRangesResolve(document) {
  if (!document.namedRanges || document.namedRanges.length === 0) {
    return;
  }
  const sheetNames = new Set(document.sheets.map((sheet) => sheet.name));
  const issues = [];
  document.namedRanges.forEach((namedRange, index) => {
    if (namedRange.scope && !sheetNames.has(namedRange.scope)) {
      issues.push({
        path: `namedRanges[${index}].scope`,
        code: "NAMED_RANGE_INVALID",
        message: `Named range scope ${namedRange.scope} does not match a sheet name`
      });
    }
    const sheetName = parseDefinedNameSheetName2(namedRange.ref);
    if (sheetName && !sheetNames.has(sheetName)) {
      issues.push({
        path: `namedRanges[${index}].ref`,
        code: "NAMED_RANGE_INVALID",
        message: `Named range ${namedRange.name} references missing sheet ${sheetName}`
      });
    }
  });
  if (issues.length > 0) {
    throw new SpreadsheetValidationError(issues);
  }
}
function formatPrintRowRange(range) {
  return `$${range.start + 1}:$${range.end + 1}`;
}
function formatPrintColumnRange(range) {
  return `$${colIndexToLetter(range.start)}:$${colIndexToLetter(range.end)}`;
}
function formatPrintTitles(sheetName, titles) {
  const parts = [];
  if (titles.rows) {
    parts.push(`${quoteSheetName(sheetName)}!${formatPrintRowRange(titles.rows)}`);
  }
  if (titles.columns) {
    parts.push(`${quoteSheetName(sheetName)}!${formatPrintColumnRange(titles.columns)}`);
  }
  return parts.join(",");
}
function serializeWorkbook(document, options) {
  assertNamedRangesResolve(document);
  const parts = [
    XML_DECLARATION,
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
    `<fileVersion appName="Runstamp"/>`,
    document.date1904 ? `<workbookPr date1904="1"/>` : "",
    `<sheets>`
  ];
  document.sheets.forEach((sheet, index) => {
    const attributes = [
      `name="${escapeXml(sheet.name)}"`,
      `sheetId="${index + 1}"`,
      `r:id="rId${index + 1}"`
    ];
    if (sheet.state && sheet.state !== "visible") {
      attributes.push(`state="${sheet.state}"`);
    }
    parts.push(`<sheet ${attributes.join(" ")}/>`);
  });
  parts.push(`</sheets>`);
  const definedNames = [];
  options?.sheetFeatures?.forEach((sheetFeature, index) => {
    const sheet = document.sheets[index];
    if (!sheet) {
      return;
    }
    if (sheetFeature.autoFilterRef) {
      definedNames.push(
        `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">${escapeXml(`${quoteSheetName(sheet.name)}!${absolutizeWorksheetRef(sheetFeature.autoFilterRef)}`)}</definedName>`
      );
    }
    if (sheetFeature.printArea) {
      definedNames.push(
        `<definedName name="_xlnm.Print_Area" localSheetId="${index}">${escapeXml(`${quoteSheetName(sheet.name)}!${absolutizeWorksheetRef(sheetFeature.printArea)}`)}</definedName>`
      );
    }
    if (sheetFeature.printTitles) {
      definedNames.push(
        `<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${escapeXml(formatPrintTitles(sheet.name, sheetFeature.printTitles))}</definedName>`
      );
    }
  });
  document.namedRanges?.forEach((namedRange) => {
    const attributes = [`name="${escapeXml(namedRange.name)}"`];
    if (namedRange.scope) {
      const sheetIndex = document.sheets.findIndex((sheet) => sheet.name === namedRange.scope);
      if (sheetIndex >= 0) {
        attributes.push(`localSheetId="${sheetIndex}"`);
      }
    }
    definedNames.push(
      `<definedName ${attributes.join(" ")}>${escapeXml(absolutizeWorksheetRef(namedRange.ref))}</definedName>`
    );
  });
  if (definedNames.length > 0) {
    parts.push(`<definedNames>${definedNames.join("")}</definedNames>`);
  }
  if ((options?.pivotCaches?.length ?? 0) > 0) {
    parts.push(
      `<pivotCaches>${options.pivotCaches.map((pivotCache) => `<pivotCache cacheId="${pivotCache.cacheId}" r:id="${pivotCache.relationshipId}"/>`).join("")}</pivotCaches>`
    );
  }
  parts.push(`</workbook>`);
  return parts.join("");
}
function serializeWorkbookRels(sheetCount, options) {
  const parts = [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  ];
  for (let index = 0; index < sheetCount; index += 1) {
    parts.push(
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    );
  }
  parts.push(
    `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
  );
  let nextRelationshipId = sheetCount + 2;
  if (options?.includeSharedStrings !== false) {
    parts.push(
      `<Relationship Id="rId${nextRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`
    );
    nextRelationshipId += 1;
  }
  parts.push(
    `<Relationship Id="rId${nextRelationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>`
  );
  for (const pivotCache of options?.pivotCaches ?? []) {
    parts.push(
      `<Relationship Id="${pivotCache.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="pivotCache/${escapeXml(pivotCache.partName)}"/>`
    );
  }
  parts.push(`</Relationships>`);
  return parts.join("");
}

// src/workers/sheet-serialization-worker-pool.ts
import { existsSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, resolve } from "node:path";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath, pathToFileURL } from "node:url";
function hasEntries(value) {
  return value !== void 0 && value.length > 0;
}
function hasCellValueThatNeedsRegistryReconciliation(value) {
  const cellValue = value;
  if (cellValue === void 0 || cellValue === null || typeof cellValue === "string" || typeof cellValue === "number" || typeof cellValue === "boolean" || cellValue instanceof Date || isRichTextValue(cellValue) || isErrorValue(cellValue)) {
    return false;
  }
  return true;
}
function sheetHasUnsupportedWorkerFeatures(sheet) {
  if (sheet.styling) {
    return "sheet styling requires workbook-global style ordering";
  }
  if (hasEntries(sheet.conditionalFormatting)) {
    return "conditional formatting requires workbook-global DXF style ordering";
  }
  if (hasEntries(sheet.tables)) {
    return "tables require workbook-global table part ordering";
  }
  if (hasEntries(sheet.pivotTables) || hasEntries(sheet.pivotCharts)) {
    return "pivots require workbook-global pivot part ordering";
  }
  if (hasEntries(sheet.images) || hasEntries(sheet.charts)) {
    return "drawings require workbook-global media/chart part ordering";
  }
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      if (cell.style !== void 0) {
        return "cell styles require workbook-global style ordering";
      }
      if (cell.formula !== void 0) {
        return "formulas require main-thread formula evaluation and ordering";
      }
      if (hasCellValueThatNeedsRegistryReconciliation(cell.value)) {
        return "cell value requires unsupported worker reconciliation";
      }
    }
  }
  return void 0;
}
function getWorkerSheetSerializationEligibility(input) {
  if (input.options?.warmPath !== true) {
    return { eligible: false, reason: "warmPath is not enabled" };
  }
  if (!isMainThread) {
    return { eligible: false, reason: "nested worker serialization is disabled" };
  }
  if (input.document.sheets.length < 2) {
    return { eligible: false, reason: "at least two sheets are required" };
  }
  if (input.resolvedStringStrategy !== "inlineStrings") {
    return { eligible: false, reason: "shared strings require workbook-global string ordering" };
  }
  for (const sheet of input.document.sheets) {
    const reason = sheetHasUnsupportedWorkerFeatures(sheet);
    if (reason) {
      return { eligible: false, reason };
    }
  }
  return { eligible: true };
}
function resolveRuntimeAssetPath(candidates) {
  const runtimeDir = dirname(fileURLToPath(import.meta.url));
  for (const candidate of candidates) {
    const absolutePath = resolve(runtimeDir, candidate);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
  }
  throw new Error(
    `XLSX runtime asset is missing. Looked for: ${candidates.join(", ")}`
  );
}
function getWorkerUrl() {
  const workerPath = resolveRuntimeAssetPath([
    "./workers/sheet-serializer-worker.js",
    "./sheet-serializer-worker.ts"
  ]);
  return pathToFileURL(workerPath);
}
function createWorker() {
  const workerUrl = getWorkerUrl();
  const execArgv = workerUrl.pathname.endsWith(".ts") ? [
    "--import",
    `data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register(${JSON.stringify(resolveRuntimeAssetPath(["./source-js-extension-loader.mjs"]))}, pathToFileURL("./"));`
  ] : void 0;
  return new Worker(workerUrl, { execArgv });
}
function getWorkerCount(taskCount) {
  const parallelism = Math.max(1, availableParallelism() - 1);
  return Math.max(1, Math.min(taskCount, parallelism, 4));
}
var WorkerSheetSerializationPool = class {
  queue = [];
  slots = [];
  nextBatchId = 1;
  createdWorkerCount = 0;
  get stats() {
    return {
      createdWorkerCount: this.createdWorkerCount,
      idleWorkerCount: this.slots.filter((slot) => slot.active === void 0).length,
      workerCount: this.slots.length,
      queuedBatchCount: this.queue.length
    };
  }
  async runTasks(tasks) {
    const workerCount = getWorkerCount(tasks.length);
    this.ensureWorkerCount(workerCount);
    const batches = splitTasksIntoBatches(tasks, workerCount);
    const batchResults = await Promise.all(batches.map((batch) => this.runBatch(batch)));
    return batchResults.flat();
  }
  async terminate() {
    const slots = [...this.slots];
    this.slots.length = 0;
    const queued = this.queue.splice(0);
    for (const batch of queued) {
      batch.reject(new Error("XLSX sheet worker pool was terminated before task execution"));
    }
    await Promise.all(slots.map((slot) => slot.worker.terminate().then(() => void 0)));
  }
  runBatch(tasks) {
    return new Promise((resolve2, reject) => {
      this.queue.push({
        id: this.nextBatchId,
        tasks,
        resolve: resolve2,
        reject
      });
      this.nextBatchId += 1;
      this.dispatch();
    });
  }
  ensureWorkerCount(count) {
    while (this.slots.length < count) {
      const slot = {
        worker: createWorker()
      };
      this.createdWorkerCount += 1;
      slot.worker.unref();
      slot.worker.on("message", (response) => {
        this.handleWorkerMessage(slot, response);
      });
      slot.worker.on("error", (error) => {
        this.handleWorkerFailure(slot, error);
      });
      slot.worker.on("exit", (code) => {
        if (code !== 0) {
          this.handleWorkerFailure(slot, new Error(`XLSX sheet worker exited with code ${code}`));
        }
      });
      this.slots.push(slot);
    }
  }
  handleWorkerMessage(slot, response) {
    const active = slot.active;
    slot.active = void 0;
    if (!active) {
      slot.worker.unref();
      return;
    }
    if (!response.ok || !response.artifacts) {
      const error = new Error(response.error?.message ?? "XLSX sheet worker failed");
      if (response.error?.stack) {
        error.stack = response.error.stack;
      }
      active.reject(error);
      void this.replaceFailedWorker(slot);
      return;
    }
    active.resolve(response.artifacts);
    slot.worker.unref();
    this.dispatch();
  }
  handleWorkerFailure(slot, error) {
    const active = slot.active;
    slot.active = void 0;
    if (active) {
      active.reject(error);
    }
    void this.replaceFailedWorker(slot);
  }
  async replaceFailedWorker(slot) {
    const index = this.slots.indexOf(slot);
    if (index >= 0) {
      this.slots.splice(index, 1);
    }
    try {
      await slot.worker.terminate();
    } catch {
    }
    if (this.queue.length > 0) {
      this.ensureWorkerCount(1);
      this.dispatch();
    }
  }
  dispatch() {
    for (const slot of this.slots) {
      if (slot.active || this.queue.length === 0) {
        continue;
      }
      const nextTask = this.queue.shift();
      if (!nextTask) {
        continue;
      }
      slot.active = nextTask;
      slot.worker.ref();
      const request = {
        id: nextTask.id,
        tasks: nextTask.tasks
      };
      slot.worker.postMessage(request);
    }
  }
};
function splitTasksIntoBatches(tasks, batchCount) {
  const batches = [];
  const normalizedBatchCount = Math.max(1, Math.min(batchCount, tasks.length));
  const batchSize = Math.ceil(tasks.length / normalizedBatchCount);
  for (let index = 0; index < tasks.length; index += batchSize) {
    batches.push(tasks.slice(index, index + batchSize));
  }
  return batches;
}
var workerPool;
function getWorkerPool() {
  workerPool ??= new WorkerSheetSerializationPool();
  return workerPool;
}
async function serializeSheetsInWorkers(tasks) {
  if (tasks.length === 0) {
    return [];
  }
  return getWorkerPool().runTasks(tasks);
}
function isWorkerSheetSerializationPoolPrimed() {
  return (workerPool?.stats.workerCount ?? 0) > 0;
}

// src/spreadsheet-engine.ts
var MIN_WORKER_SERIALIZATION_CELL_COUNT = 1e5;
var MIN_WORKER_SERIALIZATION_XML_BYTES = 4e6;
var PRINT_PAGE_DEDICATED_CHART_PREFERRED_ROW_SPAN = 34;
var PRINT_PAGE_DASHBOARD_CHART_ROW_SPAN = 18;
var PRINT_PAGE_DASHBOARD_MINIMUM_TABLE_ROWS = 9;
var PRINT_PAGE_COMPACT_MARGINS = {
  bottom: 0.3,
  footer: 0.15,
  header: 0.15,
  left: 0.35,
  right: 0.35,
  top: 0.3
};
function rebalanceOnePageDashboardColumns(sheet) {
  if (sheet.columns === void 0) return void 0;
  const longestText = sheet.columns.map((_column, columnIndex) => Math.max(
    0,
    ...sheet.rows.map((row) => {
      const value = row.cells[columnIndex]?.value;
      return typeof value === "string" ? value.length : 0;
    })
  ));
  const wrapColumn = sheet.columns.findIndex((column, columnIndex) => column.width !== void 0 && column.width >= 24 && (longestText[columnIndex] ?? 0) > column.width * 1.35);
  if (wrapColumn < 0) return sheet.columns;
  return sheet.columns.map((column, columnIndex) => {
    if (column.width === void 0) return column;
    const textLength = longestText[columnIndex] ?? 0;
    if (columnIndex === wrapColumn) {
      return { ...column, width: Math.min(48, Math.ceil(column.width * 1.1)) };
    }
    if (textLength > column.width * 1.2) {
      const divisor = column.width >= 24 ? 1.55 : 1.2;
      return { ...column, width: Math.min(38, Math.max(column.width, Math.ceil(textLength / divisor))) };
    }
    if (textLength < column.width * 0.85) {
      return { ...column, width: Math.max(6, Math.ceil(textLength * 1.05)) };
    }
    return column;
  });
}
function spanPrintNarratives(sheet) {
  const columnCount = sheet.columns?.length ?? 0;
  if (columnCount < 2) return sheet;
  const totalColumnWidth = sheet.columns?.reduce((sum, column) => sum + (column.width ?? 8.43), 0) ?? 0;
  let changed = false;
  const rows = sheet.rows.map((row) => {
    const cell = row.cells[0];
    const style = typeof cell?.style === "object" && cell.style !== null ? cell.style : void 0;
    const fontSize = style?.font?.size ?? 11;
    const shouldSpan = row.cells.length === 1 && typeof cell?.value === "string" && cell.colSpan === void 0 && fontSize <= 10 && cell.value.length > totalColumnWidth * 1.15;
    if (!shouldSpan) return row;
    changed = true;
    return {
      ...row,
      cells: [{
        ...cell,
        colSpan: columnCount,
        style: {
          ...style,
          alignment: {
            ...style?.alignment,
            vertical: style?.alignment?.vertical ?? "top",
            wrapText: true
          }
        }
      }]
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}
function repeatPrintContinuationContext(sheet) {
  const titleRows = sheet.pageSetup?.printTitles?.rows;
  const usedColumnCount = Math.max(
    sheet.columns?.length ?? 0,
    ...sheet.rows.map((row) => row.cells.length)
  );
  if (sheet.pageSetup?.fitToWidth !== 1 || titleRows === void 0 || titleRows.start === 0 || sheet.rows.length < 30 || usedColumnCount > 11 || !sheet.rows.slice(0, titleRows.start).every((row) => row.cells.length <= 1)) return sheet;
  const titleCell = sheet.rows[0]?.cells[0];
  const titleStyle = typeof titleCell?.style === "object" && titleCell.style !== null ? titleCell.style : void 0;
  if (typeof titleCell?.value !== "string" || (titleStyle?.font?.size ?? 0) < 12) return sheet;
  return {
    ...sheet,
    pageSetup: {
      ...sheet.pageSetup,
      margins: sheet.pageSetup.margins ?? PRINT_PAGE_COMPACT_MARGINS,
      printTitles: {
        ...sheet.pageSetup.printTitles,
        rows: { start: 0, end: titleRows.end }
      }
    }
  };
}
function styleUnformattedChartSheetChrome(sheet) {
  if ((sheet.charts?.length ?? 0) === 0) return sheet;
  let changed = false;
  const rows = sheet.rows.map((row, rowIndex) => {
    if (rowIndex === 0 && row.cells.length === 1 && typeof row.cells[0]?.value === "string" && row.cells[0].style === void 0) {
      changed = true;
      return {
        ...row,
        height: row.height ?? 28,
        cells: [{
          ...row.cells[0],
          style: {
            font: { bold: true, color: "FF203A4F", size: 18 },
            alignment: { vertical: "center" }
          }
        }]
      };
    }
    const unformattedHeader = rowIndex > 0 && row.cells.length >= 2 && row.cells.every((cell) => typeof cell.value === "string" && cell.style === void 0);
    if (!unformattedHeader) return row;
    changed = true;
    return {
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        style: {
          font: { bold: true, color: "FFFFFFFF" },
          fill: { type: "solid", fgColor: "FF203A4F" },
          alignment: { vertical: "center" }
        }
      }))
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}
function polishPrintTableSemantics(sheet) {
  const repeatedHeaderIndex = sheet.pageSetup?.printTitles?.rows?.start;
  const keyValueRowIndices = new Set(
    sheet.rows.slice(0, 10).flatMap((row, rowIndex) => row.cells.length === 2 && typeof row.cells[0]?.value === "string" ? [rowIndex] : [])
  );
  const normalizeKeyValues = keyValueRowIndices.size >= 3 && sheet.rows.some((row) => row.cells.length >= 5);
  let changed = false;
  const rows = sheet.rows.map((row, rowIndex) => {
    if (rowIndex === repeatedHeaderIndex && row.cells.length >= 2 && row.cells.every((cell) => typeof cell.value === "string")) {
      changed = true;
      return {
        ...row,
        cells: row.cells.map((cell, columnIndex) => {
          const style = typeof cell.style === "object" && cell.style !== null ? cell.style : {};
          return {
            ...cell,
            style: {
              ...style,
              border: {
                ...style.border,
                ...columnIndex > 0 ? { left: { style: "thin", color: "FFFFFFFF" } } : {}
              },
              alignment: {
                ...style.alignment,
                ...style.alignment?.horizontal === "left" ? { indent: Math.max(1, style.alignment.indent ?? 0) } : {},
                vertical: style.alignment?.vertical ?? "center",
                wrapText: true
              }
            }
          };
        })
      };
    }
    if (!normalizeKeyValues || !keyValueRowIndices.has(rowIndex)) return row;
    changed = true;
    return {
      ...row,
      cells: row.cells.map((cell, columnIndex) => {
        const style = typeof cell.style === "object" && cell.style !== null ? cell.style : {};
        return {
          ...cell,
          style: {
            ...style,
            ...columnIndex === 0 ? { font: { ...style.font, bold: true } } : typeof cell.value !== "string" || cell.value.length <= 14 ? { alignment: { ...style.alignment, horizontal: "right" } } : {}
          }
        };
      })
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}
function topAlignRowsWithWrappedText(sheet) {
  let changed = false;
  const rows = sheet.rows.map((row) => {
    const wraps = row.cells.some((cell, columnIndex) => {
      const style = typeof cell.style === "object" && cell.style !== null ? cell.style : void 0;
      const width = sheet.columns?.[columnIndex]?.width;
      return typeof cell.value === "string" && width !== void 0 && cell.value.length > width * 1.35 && style?.alignment?.wrapText !== false;
    });
    if (!wraps || row.cells.length < 3) return row;
    changed = true;
    return {
      ...row,
      cells: row.cells.map((cell) => {
        const style = typeof cell.style === "object" && cell.style !== null ? cell.style : {};
        if (style.alignment?.vertical !== void 0) return cell;
        return {
          ...cell,
          style: {
            ...style,
            alignment: { ...style.alignment, vertical: "top" }
          }
        };
      })
    };
  });
  return changed ? { ...sheet, rows } : sheet;
}
function normalizeNonnegativeDataBarBaselines(sheet) {
  if (!sheet.conditionalFormatting) return sheet;
  const conditionalFormatting = sheet.conditionalFormatting.map((entry) => {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/u.exec(entry.ref);
    if (!match || match[1] !== match[3]) return entry;
    const columnLetters = match[1];
    let columnIndex = 0;
    for (const character of columnLetters) columnIndex = columnIndex * 26 + character.charCodeAt(0) - 64;
    columnIndex -= 1;
    const startRow = Number(match[2]) - 1;
    const endRow = Number(match[4]) - 1;
    const values = sheet.rows.slice(startRow, endRow + 1).map((row) => row.cells[columnIndex]?.value);
    const allNonnegative = values.length > 0 && values.every((value) => typeof value === "number" && value >= 0);
    if (!allNonnegative) return entry;
    return {
      ...entry,
      rules: entry.rules.map((rule) => rule.type === "dataBar" && rule.min.type === "min" ? { ...rule, min: { type: "num", value: 0 } } : rule)
    };
  });
  return { ...sheet, conditionalFormatting };
}
function optimizePrintPageChartAnchors(document) {
  return {
    ...document,
    sheets: document.sheets.map((sourceSheet) => {
      const sheet = spanPrintNarratives(normalizeNonnegativeDataBarBaselines(topAlignRowsWithWrappedText(
        polishPrintTableSemantics(styleUnformattedChartSheetChrome(repeatPrintContinuationContext(sourceSheet)))
      )));
      const charts = sheet.charts ?? [];
      const compactSideBySideChart = sheet.pageSetup == null && sheet.rows.length <= 18 && charts.length > 0 && charts.length <= 2 && charts.every((chart) => chart.anchor.from.row < sheet.rows.length && chart.anchor.from.col > 0);
      if (compactSideBySideChart) {
        const chartStartRow = sheet.rows.length + 1;
        const chartValueRanges = new Set(charts.flatMap((chart) => chart.series.flatMap((series) => typeof series.values === "string" ? [series.values.split("!").at(-1).replaceAll("$", "")] : [])));
        const conditionalFormatting = sheet.conditionalFormatting?.flatMap((entry) => {
          if (!chartValueRanges.has(entry.ref.replaceAll("$", ""))) return [entry];
          const rules = entry.rules.filter((rule) => rule.type !== "dataBar");
          return rules.length > 0 ? [{ ...entry, rules }] : [];
        });
        return {
          ...sheet,
          conditionalFormatting: conditionalFormatting?.length ? conditionalFormatting : void 0,
          columns: sheet.columns?.map((column, columnIndex) => ({
            ...column,
            width: column.width === void 0 ? void 0 : columnIndex < 2 ? column.width * 5 : Math.max(8, column.width)
          })),
          pageSetup: {
            fitToHeight: 1,
            fitToWidth: 1,
            margins: PRINT_PAGE_COMPACT_MARGINS,
            orientation: "landscape",
            paperSize: 11
          },
          charts: charts.map((chart) => ({
            ...chart,
            anchor: {
              // A short table beside a tall chart leaves an unusable void below
              // the table. Stack the chart below the data so both elements use
              // the page width and read in natural top-to-bottom order.
              from: { ...chart.anchor.from, col: 0, row: chartStartRow },
              to: {
                col: 2,
                row: chartStartRow + 32
              }
            }
          }))
        };
      }
      const printFitted = sheet.pageSetup?.scale === void 0 && sheet.pageSetup?.fitToWidth === 1;
      const chartsFollowData = charts.length > 0 && charts.every((chart) => chart.anchor.from.row >= sheet.rows.length);
      const composeDashboardOnOnePage = printFitted && chartsFollowData && charts.length <= 2 && sheet.rows.length >= PRINT_PAGE_DASHBOARD_MINIMUM_TABLE_ROWS && sheet.rows.length <= 36;
      if (composeDashboardOnOnePage) {
        const chartStartRow = sheet.rows.length + 1;
        const usedColumnCount = Math.max(
          sheet.columns?.length ?? 0,
          ...sheet.rows.map((row) => row.cells.length)
        );
        const splitColumn = Math.max(4, Math.ceil(usedColumnCount / 2));
        return {
          ...sheet,
          columns: charts.length === 1 ? rebalanceOnePageDashboardColumns(sheet) : sheet.columns,
          pageSetup: {
            ...sheet.pageSetup,
            fitToHeight: 1,
            margins: sheet.pageSetup?.margins ?? PRINT_PAGE_COMPACT_MARGINS
          },
          charts: charts.map((chart, index) => {
            const sideBySide = charts.length === 2;
            const fromColumn = sideBySide ? index * splitColumn : 0;
            const toColumn = sideBySide ? (index + 1) * splitColumn : Math.max(8, usedColumnCount);
            return {
              ...chart,
              anchor: {
                from: { ...chart.anchor.from, col: fromColumn, row: chartStartRow },
                to: {
                  col: toColumn,
                  row: chartStartRow + PRINT_PAGE_DASHBOARD_CHART_ROW_SPAN
                }
              }
            };
          })
        };
      }
      let nextDedicatedChartRow = sheet.rows.length + 1;
      return {
        ...sheet,
        charts: charts.map((chart) => {
          const endRow = chart.anchor.to?.row ?? chart.anchor.from.row + Math.ceil((chart.height ?? 300) / 20);
          const rowSpan = endRow - chart.anchor.from.row;
          const chartFollowsData = chart.anchor.from.row >= sheet.rows.length;
          const printFitted2 = sheet.pageSetup?.scale === void 0 && sheet.pageSetup?.fitToWidth === 1;
          if (!printFitted2 || !chartFollowsData) {
            return chart;
          }
          const printAnchorRow = nextDedicatedChartRow;
          const printRowSpan = Math.max(rowSpan, PRINT_PAGE_DEDICATED_CHART_PREFERRED_ROW_SPAN);
          nextDedicatedChartRow = printAnchorRow + printRowSpan + 1;
          return {
            ...chart,
            anchor: {
              from: { ...chart.anchor.from, row: printAnchorRow },
              to: {
                col: Math.max(
                  chart.anchor.to?.col ?? 0,
                  chart.anchor.from.col + 8,
                  sheet.columns?.length ?? 0
                ),
                row: printAnchorRow + printRowSpan
              }
            }
          };
        })
      };
    })
  };
}
var SpreadsheetEngine = class {
  static warmPathCacheLimit = 8;
  static warmPathCache = /* @__PURE__ */ new Map();
  static durationMs(start, end) {
    return Number(end - start) / 1e6;
  }
  static validateDocument(document) {
    return validateSpreadsheetDocument(document);
  }
  static supports(capability) {
    switch (capability) {
      case "quality-reporting":
        return true;
      case "repair-pipeline":
      case "template-assembly":
        return true;
      default:
        return false;
    }
  }
  static validateAccessibility(document) {
    const validated = validateSpreadsheetDocument(document);
    return validateSpreadsheetAccessibility(validated);
  }
  /**
   * Static lint pass — detects structural issues Excel rejects but our
   * Zod schema accepts (sheet name length/chars, autoFilter/CF refs out of
   * bounds, between/notBetween formula shape, duplicate names case-insensitive).
   * Pure walker; no rendering side effects.
   */
  static lint(document) {
    return lintSpreadsheetDocument(document);
  }
  static remediateAccessibility(document) {
    const validated = validateSpreadsheetDocument(document);
    return remediateSpreadsheetAccessibility(validated);
  }
  static validate(input, options) {
    if (Buffer.isBuffer(input)) {
      return validateSpreadsheetBuffer(input, options);
    }
    return this.validateDocument(input);
  }
  static preflight(document, options) {
    const validated = validateSpreadsheetDocument(document, options);
    return preflightSpreadsheet(validated, options);
  }
  static async renderWithQuality(document, options) {
    const validated = validateSpreadsheetDocument(document, options);
    const rendered = await this.renderValidatedWithMetrics(validated, options);
    const qualityResult = await validateAndRepairSpreadsheetBuffer(rendered.buffer, {
      deterministic: options?.deterministic
    });
    const output = qualityResult.repair.repaired ? qualityResult.repair.buffer : rendered.buffer;
    return {
      output,
      quality: buildSharedSpreadsheetQualityReport(
        qualityResult,
        rendered.metrics.totalGenerationTimeMs
      )
    };
  }
  static plan(document, options) {
    const validated = validateSpreadsheetDocument(document, options);
    return createRenderPlan(validated, options);
  }
  static async render(document, options) {
    const validated = validateSpreadsheetDocument(document, options);
    return this.renderValidated(validated, options);
  }
  static async renderStream(document, options) {
    const validated = validateSpreadsheetDocument(document, options);
    return this.renderValidatedStream(validated, options);
  }
  static async renderValidated(document, options) {
    const rendered = await this.renderValidatedWithMetrics(document, options);
    return rendered.buffer;
  }
  static async renderWithMetrics(document, options) {
    const validated = validateSpreadsheetDocument(document, options);
    return this.renderValidatedWithMetrics(validated, options);
  }
  static async parseTemplate(buffer, options) {
    return parseTemplate(buffer, options);
  }
  static inspectTemplate(index) {
    return inspectTemplate(index);
  }
  static async assembleFromTemplate(index, injection, options) {
    return assembleFromTemplate(index, injection, options);
  }
  static async assembleFromTemplateStream(index, injection, options) {
    return assembleFromTemplateStream(index, injection, options);
  }
  static async repair(buffer, options) {
    return repairSpreadsheetBuffer(buffer, options);
  }
  static async validateAndRepair(buffer, options) {
    return validateAndRepairSpreadsheetBuffer(buffer, options);
  }
  static async renderValidatedWithMetrics(document, options) {
    const renderStart = process.hrtime.bigint();
    const prepared = await this.prepareValidatedWorkbook(document, options);
    const {
      deterministic,
      partMetrics,
      parts,
      plan,
      serializedSheets,
      sharedStrings,
      stringStrategy,
      styleRegistry,
      serializationStageMetrics
    } = prepared;
    const zipStart = process.hrtime.bigint();
    const assembled = await assembleXlsxWithMetadata(parts, { deterministic });
    const renderEnd = process.hrtime.bigint();
    const totalRowsWritten = serializedSheets.reduce((sum, sheet) => sum + sheet.metrics.totalRowsWritten, 0);
    const totalSerializedRows = serializedSheets.reduce((sum, sheet) => sum + sheet.metrics.totalSerializedRows, 0);
    const totalCellsWritten = serializedSheets.reduce((sum, sheet) => sum + sheet.metrics.totalCellsWritten, 0);
    const archiveFinalizationTimeMs = this.durationMs(zipStart, renderEnd);
    const buffer = assembled.buffer;
    const keyPartBytes = this.collectKeyPartBytes(parts, assembled);
    return {
      buffer,
      plan,
      metrics: {
        renderMode: plan.recommendedRenderMode,
        stringStrategy,
        totalRowsWritten,
        totalSerializedRows,
        totalCellsWritten,
        uniqueStringsCount: sharedStrings?.uniqueCount ?? plan.qualityReport.estimates.uniqueStringCount,
        styleCount: styleRegistry.cellStyleCount,
        estimatedZipSizeBytes: plan.qualityReport.estimates.projectedZipBytes,
        outputSizeBytes: buffer.length,
        outputSizeDeltaBytes: buffer.length - plan.qualityReport.estimates.projectedZipBytes,
        totalGenerationTimeMs: this.durationMs(renderStart, renderEnd),
        zipFinalizationTimeMs: archiveFinalizationTimeMs,
        stageMetrics: {
          ...serializationStageMetrics,
          archiveFinalizationTimeMs
        },
        keyPartBytes,
        partMetrics,
        sheetMetrics: serializedSheets.map((sheet, index) => ({
          name: document.sheets[index]?.name ?? `Sheet${index + 1}`,
          totalRowsWritten: sheet.metrics.totalRowsWritten,
          totalSerializedRows: sheet.metrics.totalSerializedRows,
          totalCellsWritten: sheet.metrics.totalCellsWritten,
          chunkCount: sheet.metrics.chunkCount,
          chunkMetrics: sheet.rowChunks.map((chunk) => ({
            startRowNumber: chunk.startRowNumber,
            endRowNumber: chunk.endRowNumber,
            sourceRowCount: chunk.sourceRowCount,
            serializedRowCount: chunk.serializedRowCount,
            cellCount: chunk.cellCount,
            byteLength: chunk.byteLength
          }))
        }))
      }
    };
  }
  static async renderValidatedStream(document, options) {
    const core = await this.prepareWorkbookCore(document, options);
    const streamableParts = {
      contentTypes: core.commonParts.contentTypes,
      packageRels: core.commonParts.packageRels,
      workbook: core.commonParts.workbook,
      workbookRels: core.commonParts.workbookRels,
      styles: core.commonParts.styles,
      sharedStrings: core.commonParts.sharedStrings,
      theme: core.commonParts.theme,
      sheetRelationships: core.commonParts.sheetRelationships,
      tables: core.commonParts.tables,
      pivotTables: core.commonParts.pivotTables,
      pivotTableRelationships: core.commonParts.pivotTableRelationships,
      pivotCacheDefinitions: core.commonParts.pivotCacheDefinitions,
      pivotCacheDefinitionRelationships: core.commonParts.pivotCacheDefinitionRelationships,
      pivotCacheRecords: core.commonParts.pivotCacheRecords,
      comments: core.commonParts.comments,
      vmlDrawings: core.commonParts.vmlDrawings,
      drawings: core.commonParts.drawings,
      drawingRelationships: core.commonParts.drawingRelationships,
      media: core.commonParts.media,
      charts: core.commonParts.charts,
      coreProps: core.commonParts.coreProps,
      appProps: core.commonParts.appProps,
      sheets: core.serializedSheets.map((serializedSheet, index) => ({
        name: `sheet${index + 1}.xml`,
        prefix: serializedSheet.prefix,
        rowChunks: serializedSheet.rowChunks.map((chunk) => chunk.xml),
        suffix: serializedSheet.suffix
      }))
    };
    return assembleXlsxStreamable(streamableParts, { deterministic: core.deterministic });
  }
  static async prepareWorkbookCore(sourceDocument, options) {
    const document = optimizePrintPageChartAnchors(sourceDocument);
    const scaffold = this.prepareWarmPathScaffold(document, options);
    const {
      effectiveMeta,
      firstVisibleSheetIndex,
      plan,
      pivotArtifacts,
      tableBindingsBySheet
    } = scaffold;
    const deterministic = plan.deterministic;
    const stringStrategy = plan.resolvedStringStrategy;
    const dateSystem = document.date1904 ? "1904" : "1900";
    const formulaEvaluator = this.documentHasFormulas(document) ? new FormulaEvaluator(document, dateSystem) : null;
    const sharedStrings = plan.includeSharedStrings ? new SharedStringTable() : void 0;
    const styleRegistry = new StyleRegistry(document.defaults);
    const worksheetSerializationStart = process.hrtime.bigint();
    const workerEligibility = getWorkerSheetSerializationEligibility({
      document,
      options,
      resolvedStringStrategy: stringStrategy
    });
    const useWorkerSheetSerialization = workerEligibility.eligible && this.shouldUseWorkerSheetSerialization(plan);
    if (useWorkerSheetSerialization && this.documentHasDateValues(document)) {
      styleRegistry.registerStyle(void 0, new Date(Date.UTC(2e3, 0, 1)));
    }
    const serializedSheets = useWorkerSheetSerialization ? await serializeSheetsInWorkers(document.sheets.map((sheet, index) => ({
      dateSystem,
      defaults: document.defaults,
      rowChunkSize: plan.rowChunkSize,
      selected: index === (firstVisibleSheetIndex >= 0 ? firstVisibleSheetIndex : 0),
      sheet,
      sheetIndex: index,
      stringStrategy: "inlineStrings"
    }))) : document.sheets.map((sheet, index) => serializeSheetChunks(sheet, {
      dateSystem,
      defaults: document.defaults,
      formulaEvaluator,
      rowChunkSize: plan.rowChunkSize,
      sharedStrings,
      styleRegistry,
      selected: index === (firstVisibleSheetIndex >= 0 ? firstVisibleSheetIndex : 0),
      sheetIndex: index,
      stringStrategy,
      tableBindings: tableBindingsBySheet[index],
      pivotTableBindings: pivotArtifacts.bindingsBySheet[index]
    }));
    const worksheetSerializationTimeMs = this.durationMs(worksheetSerializationStart, process.hrtime.bigint());
    const serializedTables = serializeTableParts(document, tableBindingsBySheet, formulaEvaluator);
    const commentSheetIndices = [];
    const commentParts = [];
    const vmlDrawingParts = [];
    serializedSheets.forEach((serializedSheet, index) => {
      if (serializedSheet.comments.length === 0) {
        return;
      }
      const sheetNumber = index + 1;
      commentSheetIndices.push(index);
      commentParts.push([
        `comments${sheetNumber}.xml`,
        serializeComments(serializedSheet.comments.map((c) => ({
          ref: c.ref,
          author: c.author,
          text: c.text
        })))
      ]);
      vmlDrawingParts.push([
        `vmlDrawing${sheetNumber}.vml`,
        serializeCommentsVml(serializedSheet.comments.map((c) => ({
          row: c.row,
          col: c.col
        })))
      ]);
    });
    const drawingSheetIndices = [];
    const drawingParts = [];
    const drawingRelParts = [];
    const mediaParts = [];
    const chartParts = [];
    const imageTypesUsed = /* @__PURE__ */ new Set();
    let globalMediaIndex = 0;
    let globalChartIndex = 0;
    document.sheets.forEach((sheet, index) => {
      const hasImages = sheet.images && sheet.images.length > 0;
      const pivotCharts = pivotArtifacts.pivotChartParts.filter((part) => part.sheetIndex === index);
      const hasCharts = sheet.charts && sheet.charts.length > 0 || pivotCharts.length > 0;
      if (!hasImages && !hasCharts) {
        return;
      }
      const sheetNumber = index + 1;
      drawingSheetIndices.push(index);
      const drawingImages = [];
      const drawingCharts = [];
      const drawingRelEntries = [];
      let relIdCounter = 0;
      if (hasImages) {
        sheet.images.forEach((image) => {
          globalMediaIndex += 1;
          relIdCounter += 1;
          const mediaFileName = `image${globalMediaIndex}.${image.type}`;
          const relationshipId = `rId${relIdCounter}`;
          imageTypesUsed.add(image.type);
          mediaParts.push([mediaFileName, image.data]);
          drawingImages.push({
            relationshipId,
            anchor: image.anchor,
            name: image.name,
            description: image.description,
            width: image.width,
            height: image.height
          });
          drawingRelEntries.push({
            relationshipId,
            target: `../media/${mediaFileName}`,
            type: "image"
          });
        });
      }
      if (hasCharts) {
        sheet.charts?.forEach((chart) => {
          globalChartIndex += 1;
          relIdCounter += 1;
          const chartFileName = `chart${globalChartIndex}.xml`;
          const relationshipId = `rId${relIdCounter}`;
          chartParts.push([
            chartFileName,
            serializeChart(chart, { document, sheetName: sheet.name })
          ]);
          drawingCharts.push({
            relationshipId,
            anchor: chart.anchor,
            name: chart.title,
            width: chart.width,
            height: chart.height
          });
          drawingRelEntries.push({
            relationshipId,
            target: `../charts/${chartFileName}`,
            type: "chart"
          });
        });
        pivotCharts.forEach((chartPart) => {
          relIdCounter += 1;
          const chartFileName = chartPart.path.replace("xl/charts/", "");
          const relationshipId = `rId${relIdCounter}`;
          chartParts.push([chartFileName, chartPart.xml]);
          drawingCharts.push({
            relationshipId,
            anchor: chartPart.definition.anchor,
            name: chartPart.definition.title,
            width: chartPart.definition.width,
            height: chartPart.definition.height
          });
          drawingRelEntries.push({
            relationshipId,
            target: `../charts/${chartFileName}`,
            type: "chart"
          });
        });
      }
      drawingParts.push([
        `drawing${sheetNumber}.xml`,
        serializeDrawing(drawingImages, drawingCharts)
      ]);
      drawingRelParts.push([
        `drawing${sheetNumber}.xml.rels`,
        serializeDrawingRelationships(drawingRelEntries)
      ]);
    });
    const sheetRelationships = serializedSheets.flatMap((serializedSheet, index) => serializedSheet.relationships ? [[`sheet${index + 1}.xml.rels`, serializedSheet.relationships]] : []);
    const sheetFeatures = serializedSheets.map((serializedSheet) => ({
      autoFilterRef: serializedSheet.autoFilterRef,
      printArea: serializedSheet.printArea,
      printTitles: serializedSheet.printTitles
    }));
    const packageSerializationStart = process.hrtime.bigint();
    const contentTypes = serializeContentTypes(document.sheets.length, {
      includeSharedStrings: plan.includeSharedStrings,
      tableCount: serializedTables.length,
      commentSheetIndices,
      drawingSheetIndices,
      imageTypes: [...imageTypesUsed],
      chartCount: globalChartIndex + pivotArtifacts.pivotChartParts.length,
      pivotTableCount: pivotArtifacts.pivotTableParts.length,
      pivotCacheDefinitionCount: pivotArtifacts.pivotCacheDefinitionParts.length,
      pivotCacheRecordCount: pivotArtifacts.pivotCacheRecordParts.length
    });
    const packageRels = serializePackageRels();
    const workbook = serializeWorkbook(document, { sheetFeatures, pivotCaches: pivotArtifacts.workbookPivotCaches });
    const workbookRels = serializeWorkbookRels(document.sheets.length, {
      includeSharedStrings: plan.includeSharedStrings,
      pivotCaches: pivotArtifacts.workbookPivotCaches
    });
    const stylesSerializationStart = process.hrtime.bigint();
    const styles = styleRegistry.toXml();
    const stylesSerializationTimeMs = this.durationMs(stylesSerializationStart, process.hrtime.bigint());
    const sharedStringsSerializationStart = process.hrtime.bigint();
    const sharedStringsXml = sharedStrings?.toXml();
    const sharedStringsSerializationTimeMs = this.durationMs(sharedStringsSerializationStart, process.hrtime.bigint());
    const theme = serializeTheme(document.theme);
    const packageSerializationTimeMs = Math.max(
      0,
      this.durationMs(packageSerializationStart, process.hrtime.bigint()) - stylesSerializationTimeMs - sharedStringsSerializationTimeMs
    );
    const commonParts = {
      contentTypes,
      packageRels,
      workbook,
      workbookRels,
      styles,
      sharedStrings: sharedStringsXml,
      theme,
      sheetRelationships,
      tables: serializedTables.map((table) => [table.path.replace("xl/tables/", ""), table.xml]),
      pivotTables: pivotArtifacts.pivotTableParts.map((pivotTable) => [pivotTable.path.replace("xl/pivotTables/", ""), pivotTable.xml]),
      pivotTableRelationships: pivotArtifacts.bindingsBySheet.flatMap(
        (bindings) => bindings.map((binding) => [
          `${binding.partName}.rels`,
          serializePivotTableRelationships(binding)
        ])
      ),
      pivotCacheDefinitions: pivotArtifacts.pivotCacheDefinitionParts.map((part) => [part.path.replace("xl/pivotCache/", ""), part.xml]),
      pivotCacheDefinitionRelationships: pivotArtifacts.pivotCacheDefinitionRelationshipParts.map((part) => [part.path.replace("xl/pivotCache/_rels/", ""), part.xml]),
      pivotCacheRecords: pivotArtifacts.pivotCacheRecordParts.map((part) => [part.path.replace("xl/pivotCache/", ""), part.xml]),
      comments: commentParts,
      vmlDrawings: vmlDrawingParts,
      drawings: drawingParts,
      drawingRelationships: drawingRelParts,
      media: mediaParts,
      charts: chartParts,
      coreProps: serializeCoreProps(effectiveMeta, deterministic),
      appProps: serializeAppProps(document.sheets.map((sheet) => sheet.name), effectiveMeta)
    };
    return {
      deterministic,
      plan,
      serializedSheets,
      sharedStrings,
      stringStrategy,
      styleRegistry,
      serializationStageMetrics: {
        worksheetSerializationTimeMs,
        stylesSerializationTimeMs,
        sharedStringsSerializationTimeMs,
        packageSerializationTimeMs
      },
      commonParts
    };
  }
  static prepareWarmPathScaffold(document, options) {
    if (options?.warmPath !== true) {
      return this.buildWarmPathScaffold(document, options);
    }
    const key = this.getWarmPathCacheKey(document, options);
    const cached = this.warmPathCache.get(key);
    if (cached) {
      this.warmPathCache.delete(key);
      this.warmPathCache.set(key, cached);
      return cached;
    }
    const scaffold = this.buildWarmPathScaffold(document, options);
    this.warmPathCache.set(key, scaffold);
    if (this.warmPathCache.size > this.warmPathCacheLimit) {
      const oldestKey = this.warmPathCache.keys().next().value;
      if (oldestKey) {
        this.warmPathCache.delete(oldestKey);
      }
    }
    return scaffold;
  }
  static buildWarmPathScaffold(document, options) {
    const accessibilityConfig = document.accessible && document.accessible !== true ? document.accessible : void 0;
    const effectiveMeta = accessibilityConfig && (accessibilityConfig.language !== void 0 || accessibilityConfig.title !== void 0) ? {
      ...document.meta,
      language: accessibilityConfig.language ?? document.meta?.language,
      title: accessibilityConfig.title ?? document.meta?.title
    } : document.meta;
    const plan = createRenderPlan(document, options);
    const dateSystem = document.date1904 ? "1904" : "1900";
    const tableBindingsBySheet = buildWorksheetTableBindings(document);
    const ordinaryChartCount = document.sheets.reduce((sum, sheet) => sum + (sheet.charts?.length ?? 0), 0);
    const pivotArtifacts = buildPivotArtifacts(document, ordinaryChartCount, dateSystem);
    const firstVisibleSheetIndex = document.sheets.findIndex((sheet) => (sheet.state ?? "visible") === "visible");
    return {
      effectiveMeta,
      firstVisibleSheetIndex,
      plan,
      pivotArtifacts,
      tableBindingsBySheet
    };
  }
  static getWarmPathCacheKey(document, options) {
    const { warmPath: _warmPath, ...normalizedOptions } = options ?? {};
    return JSON.stringify({
      document,
      options: normalizedOptions
    });
  }
  static documentHasFormulas(document) {
    return document.sheets.some((sheet) => sheet.rows.some((row) => row.cells.some((cell) => cell.formula !== void 0)));
  }
  static documentHasDateValues(document) {
    return document.sheets.some((sheet) => sheet.rows.some((row) => row.cells.some((cell) => cell.value instanceof Date)));
  }
  static shouldUseWorkerSheetSerialization(plan) {
    if (isWorkerSheetSerializationPoolPrimed()) {
      return true;
    }
    const estimatedCellCount = plan.sheetPlans.reduce((sum, sheet) => sum + sheet.cellCount, 0);
    const estimatedWorksheetXmlBytes = plan.sheetPlans.reduce(
      (sum, sheet) => sum + sheet.estimatedWorksheetXmlBytes,
      0
    );
    return estimatedCellCount >= MIN_WORKER_SERIALIZATION_CELL_COUNT || estimatedWorksheetXmlBytes >= MIN_WORKER_SERIALIZATION_XML_BYTES;
  }
  static async prepareValidatedWorkbook(document, options) {
    const core = await this.prepareWorkbookCore(document, options);
    const sheets = core.serializedSheets.map((serializedSheet, index) => [
      `sheet${index + 1}.xml`,
      serializedSheet.prefix + serializedSheet.rowChunks.map((chunk) => chunk.xml).join("") + serializedSheet.suffix
    ]);
    const parts = {
      ...core.commonParts,
      sheets
    };
    return {
      deterministic: core.deterministic,
      partMetrics: this.collectPartMetrics(parts, core.plan.partManifest),
      parts,
      plan: core.plan,
      serializationStageMetrics: core.serializationStageMetrics,
      serializedSheets: core.serializedSheets,
      sharedStrings: core.sharedStrings,
      stringStrategy: core.stringStrategy,
      styleRegistry: core.styleRegistry
    };
  }
  static collectPartMetrics(parts, manifest) {
    const partMap = /* @__PURE__ */ new Map([
      ["[Content_Types].xml", Buffer.byteLength(parts.contentTypes, "utf8")],
      ["_rels/.rels", Buffer.byteLength(parts.packageRels, "utf8")],
      ["docProps/core.xml", Buffer.byteLength(parts.coreProps, "utf8")],
      ["docProps/app.xml", Buffer.byteLength(parts.appProps, "utf8")],
      ["xl/workbook.xml", Buffer.byteLength(parts.workbook, "utf8")],
      ["xl/_rels/workbook.xml.rels", Buffer.byteLength(parts.workbookRels, "utf8")],
      ["xl/styles.xml", Buffer.byteLength(parts.styles, "utf8")],
      ["xl/theme/theme1.xml", Buffer.byteLength(parts.theme, "utf8")]
    ]);
    parts.sheets.forEach(([name, content]) => {
      partMap.set(`xl/worksheets/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.sheetRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/worksheets/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    if (parts.sharedStrings) {
      partMap.set("xl/sharedStrings.xml", Buffer.byteLength(parts.sharedStrings, "utf8"));
    }
    parts.tables?.forEach(([name, content]) => {
      partMap.set(`xl/tables/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotTables?.forEach(([name, content]) => {
      partMap.set(`xl/pivotTables/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotTableRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/pivotTables/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotCacheDefinitions?.forEach(([name, content]) => {
      partMap.set(`xl/pivotCache/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotCacheDefinitionRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/pivotCache/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.pivotCacheRecords?.forEach(([name, content]) => {
      partMap.set(`xl/pivotCache/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.comments?.forEach(([name, content]) => {
      partMap.set(`xl/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.vmlDrawings?.forEach(([name, content]) => {
      partMap.set(`xl/drawings/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.drawings?.forEach(([name, content]) => {
      partMap.set(`xl/drawings/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.drawingRelationships?.forEach(([name, content]) => {
      partMap.set(`xl/drawings/_rels/${name}`, Buffer.byteLength(content, "utf8"));
    });
    parts.media?.forEach(([name, content]) => {
      partMap.set(`xl/media/${name}`, content.length);
    });
    parts.charts?.forEach(([name, content]) => {
      partMap.set(`xl/charts/${name}`, Buffer.byteLength(content, "utf8"));
    });
    return manifest.map((entry) => ({
      path: entry.path,
      stage: entry.stage,
      byteLength: partMap.get(entry.path) ?? 0
    }));
  }
  static collectKeyPartBytes(parts, assembled) {
    const entryMetricsByPath = new Map(assembled.entryMetrics.map((entry) => [entry.path, entry]));
    const sheetEntry = entryMetricsByPath.get("xl/worksheets/sheet1.xml");
    const stylesEntry = entryMetricsByPath.get("xl/styles.xml");
    const sharedStringsEntry = entryMetricsByPath.get("xl/sharedStrings.xml");
    const keyedZipContributionBytes = (sheetEntry?.zipContributionBytes ?? 0) + (stylesEntry?.zipContributionBytes ?? 0) + (sharedStringsEntry?.zipContributionBytes ?? 0);
    return {
      sheet1XmlBytes: parts.sheets[0] ? Buffer.byteLength(parts.sheets[0][1], "utf8") : 0,
      stylesXmlBytes: Buffer.byteLength(parts.styles, "utf8"),
      sharedStringsXmlBytes: parts.sharedStrings ? Buffer.byteLength(parts.sharedStrings, "utf8") : 0,
      zipBytes: assembled.buffer.length,
      sheet1XmlCompressedBytes: sheetEntry?.compressedBytes ?? 0,
      stylesXmlCompressedBytes: stylesEntry?.compressedBytes ?? 0,
      sharedStringsXmlCompressedBytes: sharedStringsEntry?.compressedBytes ?? 0,
      sheet1XmlZipContributionBytes: sheetEntry?.zipContributionBytes ?? 0,
      stylesXmlZipContributionBytes: stylesEntry?.zipContributionBytes ?? 0,
      sharedStringsXmlZipContributionBytes: sharedStringsEntry?.zipContributionBytes ?? 0,
      otherZipContributionBytes: Math.max(0, assembled.buffer.length - keyedZipContributionBytes)
    };
  }
};

export {
  FREE_XLSX_CHART_TYPES,
  isRichTextValue,
  FormulaEvaluator,
  preflightSpreadsheet,
  validateSpreadsheetBuffer,
  repairSpreadsheetBuffer,
  computeColumnLayout,
  setDeterministicMode2 as setDeterministicMode,
  isDeterministicModeEnabled2 as isDeterministicModeEnabled,
  createRenderPlan,
  shiftFormulaRows,
  offsetFormulaRows,
  serializeConditionalFormatting,
  SharedStringTable,
  StyleRegistry,
  validateSpreadsheetAccessibility,
  remediateSpreadsheetAccessibility,
  lintSpreadsheetDocument,
  SpreadsheetEngine
};
//# sourceMappingURL=chunk-GCRW3VCZ.js.map
