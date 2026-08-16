import type { Readable } from "node:stream";
import type { PdfEmbeddedFontInput, PdfFontInput } from "./font-embedding.js";
import { renderPdfPages } from "./pdf-renderer.js";
import type { PdfDocumentPhase3 } from "./phase3-types.js";
import type { PdfGraphic } from "./phase4-types.js";
import type { PdfDocumentPhase6 } from "./phase6-types.js";
import type { PdfDocumentPhase7 } from "./phase7-types.js";
import type { PdfDocumentPhase8 } from "./phase8-types.js";
import { linearizePdfBuffer, streamPdfBuffer } from "./phase9-stream.js";
import type { PdfRenderOptions } from "./phase9-types.js";
import { buildPdfQualityReport } from "./phase10-quality.js";
import { repairPdfBuffer, validateAndRepairPdfBuffer } from "./phase10-repair.js";
import { buildSharedPdfQualityReport } from "./shared-quality.js";
import { preprocessPdfDocumentInput } from "./relaxed-input.js";
import { fillExistingPdfForm, inspectExistingPdfForm } from "./pdf-form-fill.js";
import { PdfError } from "./errors.js";
import { PdfDocumentSchema } from "./schema.js";
import {
  validatePdfDocumentSafe,
  type PdfValidationResult,
} from "./validate-document.js";
import type { PdfFillExistingFormOptions, PdfFillExistingFormResult, PdfFormInspection, PdfFormValue } from "./pdf-form-fill.js";
import type {
  PdfQualityReport,
  PdfRepairOptions,
  PdfRepairResult,
  PdfRepairValidationResult,
  PdfSignOptions,
  PdfValidationSummary,
} from "./phase10-types.js";
import { validatePdfBuffer } from "./phase10-validate.js";
import type { RenderWithQualityResult } from "./public-quality-types.js";
import type { Phase, PhaseOutput } from "./phase.js";
import {
  normalizeShorthandTables,
  resolveAutomaticFallbackFont,
} from "./phase-helpers.js";
import { planPdfCapabilities, type PdfCapabilityPlan, type PdfSelectedPhase } from "./capability-planner.js";
import { phase2Flat } from "./phases/phase2-flat.js";
import { phase3Layout } from "./phases/phase3-layout.js";
import { phase5Tables } from "./phases/phase5-tables.js";
import { phase6Interactive } from "./phases/phase6-interactive.js";
import { phase7Tagged } from "./phases/phase7-tagged.js";
import { phase8Pdfa } from "./phases/phase8-pdfa.js";
import { isDeterministicModeEnabled } from "./deterministic-mode.js";
import { applyPdfEdgePolicies, warnForPaginatedSingleElement } from "./edge-policy.js";

export interface PdfMetaPhase1 {
  author?: string;
  creationDate?: Date | string;
  creator?: string;
  keywords?: string[];
  modDate?: Date | string;
  producer?: string;
  subject?: string;
  title?: string;
}

export interface PdfTextPhase1 {
  direction?: "auto" | "ltr" | "rtl";
  font?: PdfFontInput;
  fallbackFonts?: PdfEmbeddedFontInput[];
  fontSize?: number;
  value: string;
  x?: number;
  y?: number;
}

export interface PdfPagePhase2 {
  graphics?: PdfGraphic[];
  height?: number;
  text?: PdfTextPhase1;
  texts?: PdfTextPhase1[];
  width?: number;
}

export interface PdfDocumentPhase2 {
  meta?: PdfMetaPhase1;
  pages: PdfPagePhase2[];
}

export type PdfTextPhase2 = PdfTextPhase1;
export type PdfPagePhase1 = PdfPagePhase2;
export type PdfDocumentPhase1 = PdfDocumentPhase2;
export type PdfDocumentPhase5 = PdfDocumentPhase3;
export type { PdfDocumentPhase6 };
export type { PdfDocumentPhase7 };
export type { PdfDocumentPhase8 };
export type { PdfRenderOptions };
export type PdfDocument = PdfDocumentPhase2 | PdfDocumentPhase8;

function clonePdfInput<T>(value: T): T {
  if (Buffer.isBuffer(value)) {
    return Buffer.from(value) as T;
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value) as T;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => clonePdfInput(entry)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, clonePdfInput(entry)]),
    ) as T;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface SchemaIssueLike {
  code?: string;
  errors?: unknown;
}

function issueAllowsPermissiveFallback(issue: SchemaIssueLike): boolean {
  if (issue.code === "unrecognized_keys") {
    return true;
  }
  if (issue.code !== "invalid_union" || !Array.isArray(issue.errors)) {
    return false;
  }
  return issue.errors.some((branch) =>
    Array.isArray(branch) &&
    branch.length > 0 &&
    branch.every((entry) => issueAllowsPermissiveFallback(entry as SchemaIssueLike)),
  );
}

function canRenderWithPermissiveSchemaFallback(issues: SchemaIssueLike[]): boolean {
  return issues.length > 0 && issues.every(issueAllowsPermissiveFallback);
}

const RENDERABLE_FALLBACK_NODE_TYPES = new Set([
  "container",
  "divider",
  "figure",
  "form-checkbox",
  "form-dropdown",
  "form-radio",
  "form-signature",
  "form-text",
  "graphic",
  "heading",
  "highlight-annotation",
  "list",
  "note-annotation",
  "page-break",
  "paragraph",
  "preformatted",
  "table",
  "toc",
]);

function hasRenderableFallbackRows(rows: unknown): boolean {
  if (rows === undefined) {
    return true;
  }
  if (!Array.isArray(rows)) {
    return false;
  }
  return rows.every((row) => {
    if (!isRecord(row) || !Array.isArray(row.cells)) {
      return false;
    }
    return row.cells.every((cell) =>
      isRecord(cell) &&
      Array.isArray(cell.children) &&
      cell.children.every((child) => isRenderableFallbackNode(child)),
    );
  });
}

function isRenderableFallbackNode(node: unknown): boolean {
  if (!isRecord(node) || typeof node.type !== "string" || !RENDERABLE_FALLBACK_NODE_TYPES.has(node.type)) {
    return false;
  }

  if (node.type === "container") {
    return Array.isArray(node.children) && node.children.every((child) => isRenderableFallbackNode(child));
  }
  if (node.type === "table") {
    return hasRenderableFallbackRows(node.header) &&
      hasRenderableFallbackRows(node.body) &&
      hasRenderableFallbackRows(node.footer);
  }
  if (node.type === "list") {
    return Array.isArray(node.items);
  }
  return true;
}

function isRuntimeRenderableFallbackDocument(document: PdfDocument): boolean {
  const candidate = document as { children?: unknown; content?: unknown };
  const nodes = candidate.children ?? candidate.content;
  return Array.isArray(nodes) && nodes.every((node) => isRenderableFallbackNode(node));
}

function canRenderWithStrictFalseFallback(document: PdfDocument, issues: SchemaIssueLike[]): boolean {
  return canRenderWithPermissiveSchemaFallback(issues) || isRuntimeRenderableFallbackDocument(document);
}

function countTraceFonts(pages: PhaseOutput["pages"], interactive: PhaseOutput["interactive"]): number {
  const fonts = new Set<string>();
  for (const page of pages) {
    for (const text of page.texts) {
      if (typeof text.font === "string") {
        fonts.add(text.font);
      } else if (text.font) {
        fonts.add(`${text.font.family}:${typeof text.font.source === "string" ? text.font.source : "buffer"}`);
      }
    }
  }
  for (const form of interactive?.sharedForms ?? []) {
    if (form.fontResourceKey) {
      fonts.add(form.fontResourceKey);
    }
  }
  return fonts.size;
}

function countTraceImages(pages: PhaseOutput["pages"]): number {
  return pages.reduce((sum, page) =>
    sum + (page.graphics ?? []).filter((graphic) => graphic.type === "image" || graphic.type === "svg").length,
  0);
}

const phasesByName: Record<PdfSelectedPhase, Phase> = {
  "phase2-flat": phase2Flat,
  "phase3-layout": phase3Layout,
  "phase5-tables": phase5Tables,
  "phase6-interactive": phase6Interactive,
  "phase7-tagged": phase7Tagged,
  "phase8-pdfa": phase8Pdfa,
};

function buildRenderTrace(
  plan: PdfCapabilityPlan,
  phaseOutput: PhaseOutput,
  output: Buffer,
  warningCount: number,
  durationMs: number,
): import("./phase9-types.js").PdfRenderTrace {
  const annotationsCount = phaseOutput.pages.reduce((sum, page) => sum + (page.annotations?.length ?? 0), 0);
  return {
    ...plan,
    annotationsCount,
    durationMs,
    fontCount: countTraceFonts(phaseOutput.pages, phaseOutput.interactive),
    imageCount: countTraceImages(phaseOutput.pages),
    outputBytes: output.length,
    pageCount: phaseOutput.pages.length,
    structureElementCount: phaseOutput.interactive?.accessibility?.structure.length ?? 0,
    warningCount,
  };
}

export class PdfEngine {
  private static async renderBuffer(document: PdfDocument, options?: PdfRenderOptions): Promise<Buffer> {
    const startedAt = Date.now();
    let warningCount = 0;
    const onInputWarning: PdfRenderOptions["onInputWarning"] = (warning) => {
      warningCount += 1;
      options?.onInputWarning?.(warning);
    };
    const renderOptions: PdfRenderOptions = {
      ...(options ?? {}),
      onInputWarning,
    };

    const prepared = preprocessPdfDocumentInput(document, renderOptions);
    const normalizedInput = clonePdfInput(prepared.value) as PdfDocument;

    applyPdfEdgePolicies(normalizedInput, onInputWarning);
    normalizeShorthandTables(normalizedInput);
    const parseResult = PdfDocumentSchema.safeParse(normalizedInput);
    if (!parseResult.success) {
      const issues = parseResult.error.issues;
      const strict = renderOptions.strict ?? renderOptions.strictSchema ?? true;
      if (strict || !canRenderWithStrictFalseFallback(normalizedInput, issues)) {
        throw new PdfError(
          "SCHEMA_REJECTED",
          `Document failed schema validation (${issues.length} issue${issues.length === 1 ? "" : "s"}).`,
          { issues, phase: "input-normalization" },
          { cause: parseResult.error },
        );
      }
      onInputWarning({
        code: "PDF_SCHEMA_VALIDATION_FAILED",
        message: `Schema validation failed; rendering original input (${issues.length} issue${issues.length === 1 ? "" : "s"}). This only happens with options.strict: false.`,
        path: issues[0]?.path?.join(".") ?? "",
      });
    }
    const validatedInput = clonePdfInput((parseResult.success ? parseResult.data : normalizedInput) as PdfDocument);

    if (renderOptions.linearize && renderOptions.signature) {
      throw new PdfError(
        "OPTIONS_CONFLICT",
        "Signed PDFs cannot be linearized after serialization; render without linearize when signature is enabled.",
        { conflict: ["linearize", "signature"] },
      );
    }
    if (renderOptions.flattenForms && renderOptions.signature) {
      throw new PdfError(
        "OPTIONS_CONFLICT",
        "Signed PDFs cannot flatten interactive forms during serialization; render without flattenForms when signature is enabled.",
        { conflict: ["flattenForms", "signature"] },
      );
    }

    if (renderOptions.pdfA) {
      const conformance = renderOptions.pdfA === "PDF/A-1b" ? "1b" : "2b";
      const phase8Doc = validatedInput as PdfDocumentPhase8;
      phase8Doc.pdfa = {
        ...phase8Doc.pdfa,
        conformance,
        enabled: true,
      };
    }

    // Always resolved. Gating the fallback font meant the published package could
    // not render anything outside Latin-1 — it emitted "?" — which is not a
    // pricing decision, it is a broken renderer.
    const automaticFallbackFont = resolveAutomaticFallbackFont();

    // Encryption validation
    if (renderOptions.encryption && renderOptions.pdfA) {
      throw new PdfError(
        "OPTIONS_CONFLICT",
        "PDF/A documents must not use encryption",
        { conflict: ["encryption", "pdfA"] },
      );
    }
    if (renderOptions.encryption) {
      const phase8Doc = validatedInput as PdfDocumentPhase8;
      if (phase8Doc.pdfa?.enabled) {
        throw new PdfError(
          "OPTIONS_CONFLICT",
          "PDF/A documents must not use encryption",
          { conflict: ["encryption", "pdfa.enabled"] },
        );
      }
    }

    const capabilityPlan = planPdfCapabilities(validatedInput, renderOptions);
    const selectedPhase = phasesByName[capabilityPlan.selectedPhase];
    const phaseOutput = await selectedPhase.run(
      { document: validatedInput, options: renderOptions, automaticFallbackFont },
    );
    warnForPaginatedSingleElement(validatedInput, phaseOutput.pages.length, onInputWarning);

    const deterministic = renderOptions.deterministic ?? isDeterministicModeEnabled();
    const buffer = await renderPdfPages({
      deterministic,
      encryption: renderOptions.encryption,
      flattenForms: renderOptions.flattenForms,
      interactive: phaseOutput.interactive,
      meta: phaseOutput.meta,
      pages: phaseOutput.pages,
      pdfVersion: renderOptions.pdfVersion,
      runtimeOptions: {
        assetPolicy: renderOptions.assetPolicy,
        onPageSerialized: renderOptions.onPageSerialized,
        onTextEncodingWarning: onInputWarning
          ? (warning) => {
              const elementSuffix = warning.elementId ? ` element=${warning.elementId}` : "";
              const codePoint = `U+${warning.codePoint
                .toString(16)
                .toUpperCase()
                .padStart(4, "0")}`;

              if (warning.reason === "missing-glyph") {
                // The character survived encoding but the selected font has no
                // glyph for it, so the page shows `.notdef`. Nothing downstream
                // can tell this apart from a correctly rendered document.
                onInputWarning({
                  code: "PDF_FONT_GLYPH_MISSING",
                  message:
                    `Character "${warning.char}" (${codePoint}) has no glyph in the embedded font ` +
                    `"${warning.fontFamily ?? "unknown"}" and was rendered as .notdef (a blank or box). ` +
                    `Embed a font covering this script via the text's font or fallbackFonts. ` +
                    `Page ${warning.pageIndex}${elementSuffix} text="${warning.textPreview}"`,
                  path: `pages[${warning.pageIndex}].text`,
                  from: warning.char,
                  to: "",
                });
                return;
              }

              onInputWarning({
                code: "PDF_WINANSI_UNMAPPABLE",
                message:
                  `Character "${warning.char}" (${codePoint}) is not in WinAnsiEncoding and was rendered as "?". ` +
                  `Suggestion: replace with "${warning.suggestion}", or embed a custom font that covers it. ` +
                  `Page ${warning.pageIndex}${elementSuffix} text="${warning.textPreview}"`,
                path: `pages[${warning.pageIndex}].text`,
                from: warning.char,
                to: warning.suggestion,
              });
            }
          : undefined,
      },
      signature: renderOptions.signature,
    });
    const output = renderOptions.linearize ? await linearizePdfBuffer(buffer) : buffer;
    renderOptions.onRenderTrace?.(buildRenderTrace(capabilityPlan, phaseOutput, output, warningCount, Date.now() - startedAt));
    return output;
  }

  static async render(document: PdfDocument, options?: PdfRenderOptions): Promise<Buffer> {
    return this.renderBuffer(document, options);
  }

  static async inspectForm(input: Buffer | Uint8Array): Promise<PdfFormInspection> {
    return inspectExistingPdfForm(input);
  }

  static async fillForm(
    input: Buffer | Uint8Array,
    values: Record<string, PdfFormValue>,
    options?: PdfFillExistingFormOptions,
  ): Promise<PdfFillExistingFormResult> {
    return fillExistingPdfForm(input, values, options);
  }

  static async renderWithQuality(
    document: PdfDocument,
    options?: PdfRenderOptions,
  ): Promise<RenderWithQualityResult> {
    const startedAt = Date.now();
    const output = await this.renderBuffer(document, options);
    const qualityResult = await validateAndRepairPdfBuffer(output);
    return {
      output: qualityResult.repair.repaired ? qualityResult.repair.buffer : output,
      quality: buildSharedPdfQualityReport(qualityResult, Date.now() - startedAt),
    };
  }

  static async sign(document: PdfDocument, options: PdfSignOptions): Promise<Buffer> {
    return this.renderBuffer(document, { signature: options });
  }

  /**
   * Validate a `PdfDocument` (synchronous) — returns `{ ok, issues }`
   * without throwing. Mirror of `validateDocxDocument` and
   * `lintSpreadsheetDocument` so a tool can call `validate(doc)` against
   * any engine and get a uniform issue list.
   *
   * Buffer overload — async, returns the deeper post-emit summary.
   */
  static validate(document: unknown): PdfValidationResult;
  static validate(buffer: Buffer): Promise<PdfValidationSummary>;
  static validate(
    input: unknown,
  ): PdfValidationResult | Promise<PdfValidationSummary> {
    if (Buffer.isBuffer(input)) {
      return validatePdfBuffer(input);
    }
    return validatePdfDocumentSafe(input);
  }

  static async quality(buffer: Buffer): Promise<PdfQualityReport> {
    return buildPdfQualityReport(buffer);
  }

  static async repair(buffer: Buffer, options?: PdfRepairOptions): Promise<PdfRepairResult> {
    return repairPdfBuffer(buffer, options);
  }

  static async validateAndRepair(
    buffer: Buffer,
    options?: PdfRepairOptions,
  ): Promise<PdfRepairValidationResult> {
    return validateAndRepairPdfBuffer(buffer, options);
  }

  static renderStream(document: PdfDocument, options?: PdfRenderOptions): Readable {
    if (options?.signature) {
      throw new PdfError(
        "OPTIONS_CONFLICT",
        "Signed PDFs are emitted as complete buffers; renderStream does not support signature mode.",
        { conflict: ["renderStream", "signature"] },
      );
    }
    return streamPdfBuffer(() => this.renderBuffer(document, options));
  }
}

export function validatePdfDocument(
  document: unknown,
  options?: Parameters<typeof preprocessPdfDocumentInput>[1],
): PdfDocument {
  const prepared = preprocessPdfDocumentInput(document, options);
  const normalizedInput = clonePdfInput(prepared.value) as PdfDocument;
  applyPdfEdgePolicies(normalizedInput, options?.onInputWarning);
  normalizeShorthandTables(normalizedInput);
  const parsed = PdfDocumentSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    throw new PdfError(
      "SCHEMA_REJECTED",
      `Document failed schema validation (${issues.length} issue${issues.length === 1 ? "" : "s"}).`,
      { issues },
      { cause: parsed.error },
    );
  }
  return parsed.data as PdfDocument;
}
