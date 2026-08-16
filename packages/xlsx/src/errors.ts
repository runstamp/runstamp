import type { ZodIssue } from "zod";

export type SpreadsheetValidationIssueCode =
  | "WORKBOOK_NO_SHEETS"
  | "WORKBOOK_TOO_MANY_SHEETS"
  | "SHEET_NAME_EMPTY"
  | "SHEET_NAME_TOO_LONG"
  | "SHEET_NAME_INVALID_CHARS"
  | "SHEET_NAME_EDGE_APOSTROPHE"
  | "SHEET_NAME_DUPLICATE"
  | "ROW_COUNT_EXCEEDED"
  | "COLUMN_COUNT_EXCEEDED"
  | "COLUMN_WIDTH_OUT_OF_RANGE"
  | "ROW_HEIGHT_OUT_OF_RANGE"
  | "DATE_OUT_OF_RANGE"
  | "CELL_VALUE_NAN"
  | "CELL_VALUE_INFINITE"
  | "MERGE_RANGE_OVERLAP"
  | "MERGE_RANGE_OUT_OF_BOUNDS"
  | "MERGE_RANGE_CONSUMED_CELL"
  | "NAMED_RANGE_INVALID"
  | "NAMED_RANGE_DUPLICATE"
  | "DRAWING_ANCHOR_OUT_OF_RANGE"
  | "DRAWING_DIMENSION_OUT_OF_RANGE"
  | "DATA_VALIDATION_INVALID"
  | "HYPERLINK_INVALID"
  | "PRINT_SETUP_INVALID"
  | "UNSUPPORTED_FEATURE"
  | "INVALID_TYPE"
  | "VALIDATION_FAILED";

export interface SpreadsheetValidationIssue {
  path: string;
  code: SpreadsheetValidationIssueCode;
  message: string;
  received?: unknown;
}

export type SpreadsheetTemplateParseIssueCode =
  | "TEMPLATE_ENCRYPTED"
  | "TEMPLATE_TOO_MANY_PARTS"
  | "TEMPLATE_TOO_LARGE"
  | "TEMPLATE_PART_TOO_LARGE"
  | "TEMPLATE_XML_UNSAFE"
  | "TEMPLATE_FILENAME_UNSAFE"
  | "TEMPLATE_WORKBOOK_MISSING"
  | "TEMPLATE_WORKBOOK_RELS_MISSING"
  | "TEMPLATE_INVALID";

export interface SpreadsheetTemplateParseIssue {
  code: SpreadsheetTemplateParseIssueCode;
  message: string;
  path?: string;
}

export type SpreadsheetTemplateAssemblyIssueCode =
  | "TEMPLATE_SOURCE_MISSING"
  | "TEMPLATE_ASSEMBLY_UNSAFE_SANITIZATION"
  | "TEMPLATE_INJECTION_TARGET_MISSING"
  | "TEMPLATE_INJECTION_SHAPE_MISMATCH"
  | "TEMPLATE_INJECTION_UNSUPPORTED";

export interface SpreadsheetTemplateAssemblyIssue {
  code: SpreadsheetTemplateAssemblyIssueCode;
  message: string;
  path?: string;
}

export class SpreadsheetValidationError extends Error {
  readonly issues: SpreadsheetValidationIssue[];

  constructor(issues: SpreadsheetValidationIssue[]) {
    super(issues[0]?.message ?? "Spreadsheet validation failed");
    this.name = "SpreadsheetValidationError";
    this.issues = issues;
  }
}

export class SpreadsheetTemplateParseError extends Error {
  readonly issues: SpreadsheetTemplateParseIssue[];

  constructor(issues: SpreadsheetTemplateParseIssue[]) {
    super(issues[0]?.message ?? "Spreadsheet template parse failed");
    this.name = "SpreadsheetTemplateParseError";
    this.issues = issues;
  }
}

export class SpreadsheetTemplateAssemblyError extends Error {
  readonly issues: SpreadsheetTemplateAssemblyIssue[];

  constructor(issues: SpreadsheetTemplateAssemblyIssue[]) {
    super(issues[0]?.message ?? "Spreadsheet template assembly failed");
    this.name = "SpreadsheetTemplateAssemblyError";
    this.issues = issues;
  }
}

export function formatIssuePath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "";
  }

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    return acc.length === 0 ? String(segment) : `${acc}.${String(segment)}`;
  }, "");
}

export function zodIssueToSpreadsheetIssue(issue: ZodIssue): SpreadsheetValidationIssue {
  const path = formatIssuePath(issue.path);
  const received = "input" in issue ? issue.input : undefined;
  const customCode = issue.code === "custom"
    ? issue.params?.["spreadsheetCode"]
    : undefined;

  if (typeof customCode === "string") {
    return {
      path,
      code: customCode as SpreadsheetValidationIssueCode,
      message: issue.message,
      received,
    };
  }

  if (path === "sheets" && issue.code === "too_small") {
    return {
      path,
      code: "WORKBOOK_NO_SHEETS",
      message: issue.message,
      received,
    };
  }

  if (path === "sheets" && issue.code === "too_big") {
    return {
      path,
      code: "WORKBOOK_TOO_MANY_SHEETS",
      message: issue.message,
      received,
    };
  }

  if (/\.name$/.test(path) && issue.code === "too_small") {
    return {
      path,
      code: "SHEET_NAME_EMPTY",
      message: issue.message,
      received,
    };
  }

  if (/\.name$/.test(path) && issue.code === "too_big") {
    return {
      path,
      code: "SHEET_NAME_TOO_LONG",
      message: issue.message,
      received,
    };
  }

  if (issue.message === "Rows cannot exceed 16,384 columns") {
    return {
      path,
      code: "COLUMN_COUNT_EXCEEDED",
      message: issue.message,
      received,
    };
  }

  if (issue.message === "Sheets cannot exceed 16,384 columns") {
    return {
      path,
      code: "COLUMN_COUNT_EXCEEDED",
      message: issue.message,
      received,
    };
  }

  if (issue.message === "Sheets cannot exceed 1,048,576 rows") {
    return {
      path,
      code: "ROW_COUNT_EXCEEDED",
      message: issue.message,
      received,
    };
  }

  if (issue.message === "Column width must be between 0 and 255") {
    return {
      path,
      code: "COLUMN_WIDTH_OUT_OF_RANGE",
      message: issue.message,
      received,
    };
  }

  if (
    issue.message.includes("Drawing dimensions must be <=")
    || issue.message.includes("Drawing anchor offsets must be <=")
  ) {
    return {
      path,
      code: issue.message.includes("offsets")
        ? "DRAWING_ANCHOR_OUT_OF_RANGE"
        : "DRAWING_DIMENSION_OUT_OF_RANGE",
      message: issue.message,
      received,
    };
  }

  if (
    issue.message.includes("Drawing anchor column must stay within Excel's 16,384-column limit")
    || issue.message.includes("Drawing anchor row must stay within Excel's 1,048,576-row limit")
  ) {
    return {
      path,
      code: "DRAWING_ANCHOR_OUT_OF_RANGE",
      message: issue.message,
      received,
    };
  }

  return {
    path,
    code: "VALIDATION_FAILED",
    message: issue.message,
    received,
  };
}
