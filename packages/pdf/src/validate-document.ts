/**
 * Soft `PdfDocument` validator — does not throw on schema failure.
 *
 * The pre-existing `validatePdfDocument` throws a `PdfError` on the first
 * Zod failure, which is fine for "give me a typed doc or die" call sites
 * but unhelpful for IDE/CLI/UI flows that want to surface every issue at
 * once. This soft variant returns `{ ok, issues }` matching the shape used
 * by `validateDocxDocument` and `lintSpreadsheetDocument` so an LLM or
 * tool can call `validate()` on any engine and get a uniform result.
 *
 * Driven by `docs/0428-claude-test-based-directive2.md` cross-engine
 * §"Add a `validate(doc)` public method on every engine".
 */
import { PdfDocumentSchema } from "./schema.js";
import { preprocessPdfDocumentInput, type PdfRelaxedInputOptions } from "./relaxed-input.js";
import { normalizeShorthandTables } from "./phase-helpers.js";
import { tryParseColor } from "./parse-color.js";
import { applyPdfEdgePolicies } from "./edge-policy.js";
import { isPdfError } from "./errors.js";

export type PdfValidationIssueCode =
  | "PDF_VALIDATE_SCHEMA"
  | "PDF_VALIDATE_COLOR_INVALID"
  | "PDF_VALIDATE_PAGES_EMPTY"
  | "PDF_VALIDATE_EDGE_WARNING"
  | "PDF_VALIDATE_PAGE_MARGINS_INVALID";

export interface PdfValidationIssue {
  severity: "error" | "warning";
  code: PdfValidationIssueCode;
  message: string;
  path: string;
  suggestion?: string;
}

export interface PdfValidationResult {
  ok: boolean;
  issues: PdfValidationIssue[];
}

function walkColors(value: unknown, path: string, issues: PdfValidationIssue[]): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    // Heuristic: treat hex-color-shaped strings on color-typed paths as
    // candidates for validation. The schema's color transform already runs
    // on accepted shapes; this catches shapes that bypass schema (e.g.
    // strict-mode opt-out paths) so users see a structured message instead
    // of a deep render-time stack.
    if (/color$/i.test(path) && /^#?[0-9a-fA-F]{3,8}$/.test(value)) {
      const parsed = tryParseColor(value);
      if (!parsed) {
        issues.push({
          severity: "error",
          code: "PDF_VALIDATE_COLOR_INVALID",
          message: `Color "${value}" could not be parsed.`,
          path,
          suggestion: 'Use #RGB / #RRGGBB hex, or { space: "rgb", r, g, b } with components in 0..1.',
        });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkColors(item, `${path}[${index}]`, issues));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walkColors(child, path ? `${path}.${key}` : key, issues);
    }
  }
}

/**
 * Validate a `PdfDocument` (or relaxed-input shape) without rendering.
 * Returns every issue at once. Does not throw on schema failure.
 */
export function validatePdfDocumentSafe(
  input: unknown,
  options?: PdfRelaxedInputOptions,
): PdfValidationResult {
  const issues: PdfValidationIssue[] = [];
  let prepared: { value: unknown };
  try {
    prepared = preprocessPdfDocumentInput(input, options);
  } catch (error) {
    issues.push({
      severity: "error",
      code: "PDF_VALIDATE_SCHEMA",
      message: error instanceof Error ? error.message : String(error),
      path: "",
    });
    return { ok: false, issues };
  }

  try {
    applyPdfEdgePolicies(prepared.value, (warning) => {
      issues.push({
        severity: "warning",
        code: "PDF_VALIDATE_EDGE_WARNING",
        message: warning.message,
        path: warning.path,
      });
    });
    normalizeShorthandTables(prepared.value as never);
  } catch (error) {
    issues.push({
      severity: "error",
      code: isPdfError(error) && error.code === "PAGE_MARGINS_INVALID"
        ? "PDF_VALIDATE_PAGE_MARGINS_INVALID"
        : "PDF_VALIDATE_SCHEMA",
      message: error instanceof Error ? error.message : String(error),
      path: isPdfError(error) && typeof error.details?.path === "string" ? error.details.path : "",
    });
  }

  const parsed = PdfDocumentSchema.safeParse(prepared.value);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        severity: "error",
        code: "PDF_VALIDATE_SCHEMA",
        message: issue.message,
        path: issue.path.join("."),
      });
    }
  }

  // Defense-in-depth: walk for hex-color strings on `*color` paths even if
  // schema validation failed elsewhere. Catches user-facing patterns where
  // the schema rejects an unrelated field but the color was still wrong.
  if (input && typeof input === "object") {
    walkColors(input, "", issues);
  }

  const doc = (parsed.success ? parsed.data : (prepared.value as { pages?: unknown[] })) ?? {};
  if (Array.isArray((doc as { pages?: unknown[] }).pages) && (doc as { pages: unknown[] }).pages.length === 0) {
    issues.push({
      severity: "warning",
      code: "PDF_VALIDATE_PAGES_EMPTY",
      message: "Document has no pages; rendering will produce an empty PDF.",
      path: "pages",
    });
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
