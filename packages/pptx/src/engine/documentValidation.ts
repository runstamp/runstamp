import { ZodError } from "zod";
import { getLogger } from "../logger.js";
import { PaperError } from "../errors.js";
import type { PaperDocument, PaperNode } from "../types/ast.js";
import { PaperDocumentSchema } from "../validator/schema.js";
import type { PptxInputWarning } from "../interpreter/relaxed-input.js";
import { emitRenderabilityWarnings } from "./renderabilityWarnings.js";

const MAX_TOTAL_NODES = 50_000;
const MAX_NESTING_DEPTH = 20;

export interface PptxInputValidationOptions {
  onInputWarning?: (warning: PptxInputWarning) => void;
  relaxed?: boolean;
}

function checkNodeLimits(slides: PaperDocument["slides"]): void {
  let totalNodes = 0;

  function walk(children: unknown[] | undefined, depth: number): void {
    if (!children) return;
    if (depth > MAX_NESTING_DEPTH) {
      throw new PaperError(
        `Document exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`,
        { code: "VALIDATION_FAILED", phase: "validation" },
      );
    }
    for (const child of children) {
      totalNodes += 1;
      if (totalNodes > MAX_TOTAL_NODES) {
        throw new PaperError(
          `Document exceeds maximum node count of ${MAX_TOTAL_NODES}`,
          { code: "RESOURCE_LIMIT_EXCEEDED", phase: "validation" },
        );
      }
      const node = child as { children?: unknown[] };
      if (node.children) walk(node.children, depth + 1);
    }
  }

  for (const slide of slides) {
    walk(slide.children as unknown[] | undefined, 1);
  }
}

function normalizeGradientFillAlias<T>(value: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const fill = value as Record<string, unknown>;
  if (fill.type !== "gradient" || !Array.isArray(fill.stops)) {
    return value;
  }

  return {
    ...fill,
    type: "linear",
    angle: fill.angle ?? 0,
  } as T;
}

function normalizeStyleFillAliases<
  T extends {
    fill?: unknown;
    gradientFill?: unknown;
  } | undefined,
>(style: T): T {
  if (!style) return style;

  const normalizedFill = normalizeGradientFillAlias(style.fill);
  const normalizedGradientFill = normalizeGradientFillAlias(style.gradientFill);

  if (normalizedFill === style.fill && normalizedGradientFill === style.gradientFill) {
    return style;
  }

  return {
    ...style,
    fill: normalizedFill,
    gradientFill: normalizedGradientFill,
  };
}

function normalizeNodeFillAliases(node: PaperNode): PaperNode {
  switch (node.type) {
    case "View":
    case "Group": {
      const normalizedStyle = normalizeStyleFillAliases(node.style);
      const existingChildren = node.children ?? [];
      const normalizedChildren = existingChildren.map(normalizeNodeFillAliases);
      const childrenChanged = normalizedChildren.some((child, index) => child !== existingChildren[index]);

      if (normalizedStyle === node.style && !childrenChanged) {
        return node;
      }

      return {
        ...node,
        style: normalizedStyle,
        children: normalizedChildren,
      };
    }
    default: {
      const normalizedStyle = normalizeStyleFillAliases(node.style);
      if (normalizedStyle === node.style) {
        return node;
      }

      return {
        ...node,
        style: normalizedStyle,
      };
    }
  }
}

function normalizeDocumentFillAliases(doc: PaperDocument): PaperDocument {
  const normalizedSlides = doc.slides.map((slide) => {
    const normalizedStyle = normalizeStyleFillAliases(slide.style);
    const existingChildren = slide.children ?? [];
    const normalizedChildren = existingChildren.map(normalizeNodeFillAliases);
    const childrenChanged = normalizedChildren.some((child, index) => child !== existingChildren[index]);

    if (normalizedStyle === slide.style && !childrenChanged) {
      return slide;
    }

    return {
      ...slide,
      style: normalizedStyle,
      children: normalizedChildren,
    };
  });

  if (normalizedSlides.every((slide, index) => slide === doc.slides[index])) {
    return doc;
  }

  return {
    ...doc,
    slides: normalizedSlides,
  };
}

export function validateDocument(doc: unknown, options?: PptxInputValidationOptions): PaperDocument {
  try {
    // Schema validation must run before node walking. In particular, a truthy
    // non-array `slides` value must become a structured PaperError instead of
    // leaking a native iterator/flatMap failure from a later stage.
    const parsed = PaperDocumentSchema.parse(doc) as PaperDocument;
    checkNodeLimits(parsed.slides);
    const normalized = normalizeDocumentFillAliases(parsed);
    emitRenderabilityWarnings(normalized);
    return normalized;
  } catch (error) {
    if (error instanceof ZodError) {
      getLogger().schemaError?.({
        schemaName: "PaperDocumentSchema",
        errorCount: error.issues.length,
        issues: error.issues.slice(0, 20).map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
        timestamp: Date.now(),
      });
      const maxDisplayed = 20;
      const issues = error.issues.slice(0, maxDisplayed).map((issue) => {
        const path = issue.path.join(".");
        let hint = "";
        if (issue.code === "invalid_type") {
          hint = ` (expected ${(issue as any).expected}, received ${(issue as any).received})`;
        } else if (issue.code === "too_big") {
          hint = ` (maximum: ${(issue as any).maximum})`;
        }
        return `  - ${path}: ${issue.message}${hint}`;
      }).join("\n");
      const suffix = error.issues.length > maxDisplayed
        ? `\n  ... and ${error.issues.length - maxDisplayed} more error(s)`
        : "";
      throw new PaperError(
        `Invalid PaperDocument: ${error.issues.length} validation error(s):\n${issues}${suffix}`,
        { code: "VALIDATION_FAILED", phase: "validation" },
      );
    }
    throw error;
  }
}
