import {
  DeclarativeDocumentSchema,
  DeclarativeValidationError,
  toPresentationSpec,
  validate as validateSchema,
  type ValidationIssue,
  type ValidationResult,
} from "@runstamp/protocol";
import { compilePresentationSpec, preflightPresentationSpec } from "./compiler.js";

function pathFromPreflight(issue: { path?: unknown; slideIndex?: number }): Array<string | number> {
  if (typeof issue.path === "string" && issue.path.length > 0) {
    const segments: Array<string | number> = [];
    issue.path.replace(/([^[.\]]+)|\[(\d+)\]/g, (_match, property: string | undefined, index: string | undefined) => {
      segments.push(index === undefined ? property! : Number(index));
      return "";
    });
    if (segments.length > 0) return segments;
  }
  return issue.slideIndex === undefined ? [] : ["slides", issue.slideIndex];
}

/** Validate the schema and then run the engine-owned layout preflight. */
export function validate(input: unknown): ValidationResult {
  const schemaResult = validateSchema(input);
  if (!schemaResult.ok) return schemaResult;

  const document = DeclarativeDocumentSchema.parse(input);
  const preflight = preflightPresentationSpec(toPresentationSpec(document));
  if (preflight.ok) return { ok: true, issues: [] };

  const issues: ValidationIssue[] = preflight.issues.map((issue) => ({
    path: pathFromPreflight(issue),
    code: typeof issue.code === "string" ? issue.code : "layout_validation_failed",
    severity: "error",
    fix: typeof issue.remediation === "string" && issue.remediation.length > 0
      ? issue.remediation
      : "Reduce content density on this slide or split it into two slides.",
  }));
  return { ok: false, issues };
}

/** Validate, normalize, and compile through the core PresentationSpec compiler. */
export function compileDeclarativeDocument(input: unknown): ReturnType<typeof compilePresentationSpec> {
  const result = validate(input);
  if (!result.ok) throw new DeclarativeValidationError(result.issues);
  return compilePresentationSpec(toPresentationSpec(DeclarativeDocumentSchema.parse(input)));
}
