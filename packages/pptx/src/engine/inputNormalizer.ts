// src/engine/inputNormalizer.ts — unified render-input normalizer.
//
// PaperEngine accepts two input shapes:
//   1. PaperDocument — type: "Document", slides[] with `children` nodes.
//   2. AgentDocument — type: "presentation", slides[] with `pattern` strings.
//
// Historically, calling PaperEngine.render with an AgentDocument produced
// five low-level PaperDocument validation errors (PRD P0-3 / P0-5). This
// module centralizes the detection + compile path so every engine entry
// point accepts either shape and produces a structured AGENT_INPUT_INVALID
// error when the AgentDocument itself is malformed.

import { ZodError } from "zod";
import { PaperError, type PaperErrorIssue } from "../errors.js";
import type { PaperDocument } from "../types/ast.js";
import {
  compileAgentDocument,
} from "../interpreter/interpreter.js";
import type {
  AgentLayoutValidationMode,
  AgentLayoutWarning,
} from "../interpreter/layout-validator.js";
import type { PptxInputWarning } from "../interpreter/relaxed-input.js";

export interface NormalizeInputOptions {
  onInputWarning?: (warning: PptxInputWarning) => void;
  onLayoutWarning?: (warning: AgentLayoutWarning) => void;
  layoutValidation?: AgentLayoutValidationMode;
  relaxed?: boolean;
}

/**
 * Returns true when the input looks like an AgentDocument: either it has
 * the `"presentation"` discriminator, or its first slide carries a
 * `pattern` string (the Agent-mode signature). The `type: "Document"` +
 * `slides[].pattern` combination is the legacy relaxed-agent shape and
 * also routes through the Agent compiler so the relaxed-input coercions
 * can rewrite it.
 *
 * Only a doc that is `type: "Document"` AND whose slides have no
 * `pattern` key is treated as a canonical PaperDocument.
 */
export function isAgentDocumentShape(input: unknown): boolean {
  if (input === null || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  if (obj.type === "presentation") return true;
  const slides = obj.slides;
  if (Array.isArray(slides) && slides.length > 0) {
    const first = slides[0];
    if (first !== null && typeof first === "object" && "pattern" in first) {
      return true;
    }
  }
  return false;
}

function remediationForZodIssue(issue: {
  code: string;
  path: readonly PropertyKey[];
  message: string;
}): string {
  const dotted = issue.path.map((p) => String(p)).join(".") || "<root>";
  switch (issue.code) {
    case "invalid_type":
      return `Check that '${dotted}' matches the expected type. Run the input through AgentDocumentSchema to see the expected shape.`;
    case "invalid_literal":
      return `Value at '${dotted}' must match the required literal. See AgentDocumentSchema for allowed values.`;
    case "invalid_enum_value":
    case "invalid_union_discriminator":
      return `Value at '${dotted}' must be one of the enum options. Common fix: check spelling and casing against the schema.`;
    case "invalid_union":
      return `Value at '${dotted}' did not match any option in a union. Check the discriminator field and ensure nested fields match that variant.`;
    case "unrecognized_keys":
      return `Unknown key(s) at '${dotted}'. Remove them or confirm the schema field name.`;
    case "too_small":
    case "too_big":
      return `Value at '${dotted}' is out of the allowed range. See the schema bounds.`;
    case "custom":
      return issue.message;
    default:
      return `Fix the value at '${dotted}' and re-run. See https://runstamp.com/docs/schemas for the AgentDocument schema.`;
  }
}

function zodIssuesToPaperIssues(err: ZodError): PaperErrorIssue[] {
  return err.issues.map((issue): PaperErrorIssue => {
    const path = issue.path.map((p) => String(p)).join(".") || "<root>";
    const entry: PaperErrorIssue = {
      path,
      code: issue.code,
      message: issue.message,
      remediation: remediationForZodIssue(issue),
    };
    const anyIssue = issue as { expected?: unknown; received?: unknown };
    if (typeof anyIssue.expected === "string") entry.expected = anyIssue.expected;
    if (typeof anyIssue.received === "string") entry.received = anyIssue.received;
    return entry;
  });
}

/**
 * Normalize render input to a PaperDocument. PaperDocument passes through
 * unchanged. AgentDocument is compiled through `compileAgentDocument`;
 * Zod failures are rethrown as a `PaperError` with code
 * `AGENT_INPUT_INVALID`, first-issue `path` + `remediation`, and the full
 * issue list on `issues`.
 */
export function normalizeRenderInput(
  input: PaperDocument | unknown,
  options?: NormalizeInputOptions,
): PaperDocument {
  if (!isAgentDocumentShape(input)) {
    return input as PaperDocument;
  }
  try {
    return compileAgentDocument(input, {
      onInputWarning: options?.onInputWarning,
      onLayoutWarning: options?.onLayoutWarning,
      layoutValidation: options?.layoutValidation,
      relaxed: options?.relaxed,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = zodIssuesToPaperIssues(err);
      const first = issues[0];
      const pathArr = first?.path ? first.path.split(".").filter((p) => p.length > 0) : undefined;
      const headline = first
        ? `AgentDocument validation failed (${err.issues.length} issue${err.issues.length === 1 ? "" : "s"}): ${first.message} at '${first.path}'`
        : `AgentDocument validation failed (${err.issues.length} issues).`;
      throw new PaperError(headline, {
        code: "AGENT_INPUT_INVALID",
        phase: "compilation",
        path: pathArr,
        remediation: first?.remediation
          ?? "Run the input through AgentDocumentSchema to see the expected shape.",
        issues,
        cause: err,
      });
    }
    if (err instanceof PaperError) throw err;
    throw new PaperError(
      err instanceof Error ? err.message : "AgentDocument compilation failed.",
      {
        code: "AGENT_INPUT_INVALID",
        phase: "compilation",
        remediation:
          "AgentDocument compilation threw a non-Zod error. See `cause` for the underlying exception.",
        cause: err,
      },
    );
  }
}
