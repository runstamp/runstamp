// src/interpreter/interpreter.ts — Router: AgentDocument → PaperDocument
//
// Validates AI-generated input via Zod schemas and compiles it into
// full PaperDocument AST using template factories.

import type { PaperSlide, PaperDocument, ThemeConfig } from "../types/ast.js";
import { PaperError } from "../errors.js";
import { AgentDocumentSchema } from "./agentSchema.js";
import type { AgentSlide, AgentDocument } from "./agentSchema.js";
import { getLogger } from "../logger.js";
import { autoLoadDocumentFonts } from "../typography/autoFont.js";
import { ZodError } from "zod";
import {
  type ResolvedAgentDesignTokens,
  resolveAgentDesignTokens,
} from "./design-tokens.js";
import {
  buildTitleLayout,
  buildStatementLayout,
  buildDashboardLayout,
  buildComparisonLayout,
  buildChartFocusLayout,
  buildBulletsLayout,
  buildAgentPaginationFooter,
} from "./templates.js";
import {
  type CompileAgentDocumentOptions,
  preprocessAgentDocumentInput,
} from "./relaxed-input.js";
import { validateAgentDocumentLayout } from "./layout-validator.js";
import type { AgentLayoutWarning } from "./layout-validator.js";
import { emitRenderabilityWarnings } from "../engine/renderabilityWarnings.js";
import { markLayoutValidated } from "../engine/layoutValidator.js";
import { assertAgentCompilationSemantics } from "./agent-quality-gates.js";
import { parseComparisonEntry, parseComparisonOwnership } from "./composition-semantics.js";

function comparisonSemanticWarnings(document: AgentDocument): AgentLayoutWarning[] {
  return document.slides.flatMap((slide, slideIndex) => {
    if (slide.pattern !== "comparison" || slide.content.comparison || !slide.content.bulletPoints?.length) {
      return [];
    }
    const ownership = parseComparisonOwnership(slide.content.subtitle);
    const ownsEveryPair = ownership
      && slide.content.bulletPoints.every((entry) => parseComparisonEntry(entry) !== undefined);
    if (ownsEveryPair) return [];
    return [{
      code: "POTENTIAL_UNOWNED_COMPARISON" as const,
      message: "Comparison content lacks explicit left/right ownership and will use the legacy generic split.",
      slideIndex,
      nodePath: `slides[${slideIndex}].content.bulletPoints`,
    }];
  });
}

// ---------------------------------------------------------------------------
// Theme builder (matches demo/app/api/generate-ast/route.ts)
// ---------------------------------------------------------------------------

function buildTheme(tokens: ResolvedAgentDesignTokens): ThemeConfig {
  return {
    name: "Generated",
    colorScheme: {
      dk1: tokens.colors.themeDark1,
      lt1: tokens.colors.themeLight1,
      dk2: tokens.colors.themeDark2,
      lt2: tokens.colors.themeLight2,
      accent1: tokens.colors.accent,
      accent2: tokens.colors.chartPalette[1] ?? tokens.colors.chartPalette[0],
      accent3: tokens.colors.chartPalette[2] ?? tokens.colors.chartPalette[0],
      accent4: tokens.colors.chartPalette[3] ?? tokens.colors.chartPalette[0],
      accent5: tokens.colors.chartPalette[4] ?? tokens.colors.chartPalette[0],
      accent6: tokens.colors.chartPalette[5] ?? tokens.colors.chartPalette[0],
    },
    fontScheme: {
      majorLatin: tokens.typography.titleFontFamily,
      minorLatin: tokens.typography.bodyFontFamily,
    },
  };
}

// ---------------------------------------------------------------------------
// Slide compiler
// ---------------------------------------------------------------------------

/**
 * Compiles a single AgentSlide into a PaperSlide using the appropriate
 * template factory based on the slide's pattern.
 */
export function compileAgentSlide(
  slide: AgentSlide,
  accentColor: string,
  fontFamily?: string,
  designTokens?: ResolvedAgentDesignTokens,
  companyName?: string,
): PaperSlide {
  let compiled: PaperSlide;
  switch (slide.pattern) {
    case "title":
      compiled = buildTitleLayout(slide.content, accentColor, fontFamily, designTokens, companyName);
      break;
    case "statement":
      compiled = buildStatementLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "dashboard":
      compiled = buildDashboardLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "comparison":
      compiled = buildComparisonLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "chart-focus":
      compiled = buildChartFocusLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    case "bullets":
      compiled = buildBulletsLayout(slide.content, accentColor, fontFamily, designTokens);
      break;
    default: {
      // Exhaustiveness guard — treat unknown patterns as bullets, but log
      // an explicit UNKNOWN_AGENT_PATTERN warning so the fall-back is not
      // silent. AgentDocumentSchema.parse rejects unknown patterns before
      // reaching here; this default fires only when the schema union is
      // extended but the dispatcher isn't (defensive coverage, WS-1b).
      const _exhaustive: never = slide.pattern;
      void _exhaustive;
      getLogger().warn(
        `[interpreter] UNKNOWN_AGENT_PATTERN: slide.pattern="${(slide as { pattern?: unknown }).pattern}" has no registered builder; rendering as "bullets".`,
      );
      compiled = buildBulletsLayout(slide.content, accentColor, fontFamily, designTokens);
    }
  }
  compiled.agentPattern = slide.pattern;
  return compiled;
}

// ---------------------------------------------------------------------------
// Document compiler
// ---------------------------------------------------------------------------

/**
 * Validates and compiles an AgentDocument into a PaperDocument.
 *
 * - Validates input via AgentDocumentSchema.parse()
 * - Builds theme from accentColor
 * - Maps each slide via compileAgentSlide
 * - Returns a complete PaperDocument ready for PaperEngine.render()
 */
export function compileAgentDocument(
  input: unknown,
  options?: CompileAgentDocumentOptions,
): PaperDocument {
  let validated: AgentDocument;
  try {
    const prepared = preprocessAgentDocumentInput(input, options);
    validated = AgentDocumentSchema.parse(prepared.value);
  } catch (e) {
    if (e instanceof ZodError) {
      getLogger().schemaError?.({
        schemaName: "AgentDocumentSchema",
        errorCount: e.issues.length,
        issues: e.issues.slice(0, 20).map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
        timestamp: Date.now(),
      });
    }
    throw e;
  }
  if (validated.type !== "presentation") {
    throw new Error(
      `compileAgentDocument only supports presentation agent documents. Received "${validated.type}".`,
    );
  }
  const tokens = resolveAgentDesignTokens({
    theme: validated.theme,
    accentColor: validated.accentColor,
    designTokens: validated.designTokens,
  });
  const theme = buildTheme(tokens);
  const accentColor = tokens.colors.accent;

  const footerLabel = validated.companyName
    ? `${validated.companyName} · ${validated.presentationTitle}`
    : validated.presentationTitle;
  const slides = validated.slides.map((slide, slideIndex) => {
    const compiled = compileAgentSlide(slide, accentColor, undefined, tokens, validated.companyName);
    if (slide.pattern !== "title") {
      compiled.children.push(buildAgentPaginationFooter(
        footerLabel,
        slideIndex + 1,
        validated.slides.length,
        tokens,
      ));
    }
    return compiled;
  });

  const document: PaperDocument = {
    type: "Document",
    meta: {
      title: validated.presentationTitle,
      author: validated.companyName,
    },
    theme,
    fontStrategy: tokens.typography.fontStrategy,
    slides,
  };

  assertAgentCompilationSemantics(validated, document);

  emitRenderabilityWarnings(document);

  const layoutValidation = options?.layoutValidation ?? "warn";
  if (layoutValidation === "off") {
    // Mark so the engine-side pre-render validator doesn't re-run.
    markLayoutValidated(document);
    return document;
  }

  const warnings = [
    ...comparisonSemanticWarnings(validated),
    ...validateAgentDocumentLayout(document),
  ];
  warnings.forEach((warning) => options?.onLayoutWarning?.(warning));

  if (layoutValidation === "warn") {
    warnings.forEach((warning) => {
      getLogger().warn(
        `[agent-layout] ${warning.code} on slide ${warning.slideIndex + 1} at ${warning.nodePath}: ${warning.message}`,
      );
    });
    markLayoutValidated(document);
    return document;
  }

  if (warnings.length > 0) {
    const first = warnings[0];
    const summary = warnings
      .map((warning) => `${warning.code} slide ${warning.slideIndex + 1} at ${warning.nodePath}`)
      .join("; ");
    throw new PaperError(
      `Agent layout validation failed: ${summary}`,
      {
        code: "AGENT_LAYOUT_VALIDATION_FAILED",
        phase: "validation",
        slideIndex: first.slideIndex,
        path: first.nodePath.split(".").filter((p) => p.length > 0),
        remediation:
          "Shorten text, enlarge the container, or loosen overlaps. Pass `layoutValidation: \"warn\"` to downgrade to a logged warning.",
      },
    );
  }

  markLayoutValidated(document);
  return document;
}

/**
 * Compiles an AgentDocument the way `compileAgentDocument` does, but measures text against the
 * document's own fonts rather than whatever happens to be in the process font cache.
 *
 * `compileAgentDocument` is synchronous, so it cannot load a font. Font loading happens later,
 * inside `PaperEngine.render`. Every autofit decision the templates make — `titleHeight`, the
 * `maxLines` a `textFit` policy is given, the divider position derived from them — is therefore
 * measured before a single font exists, and `resolveBoldFamily` silently measures bold text with
 * the regular face when the bold face has not been loaded yet
 * (`typography/segmentCache.ts:212`). Bold faces are wider, so the estimate is short, the line
 * count is low, and the block is compiled smaller than the text it will hold.
 *
 * The consequence is worse than an inaccurate estimate: the cache is process-global, so the
 * *second* document rendered in a process measures against the *first* document's fonts. The same
 * input compiles to different bytes depending on what was rendered before it — a determinism
 * violation in an engine whose output is hash-bound (`docs/quality-policy.md`).
 *
 * Two passes fix it because the first pass exists only to discover which fonts the document
 * references; its layout is discarded. After `autoLoadDocumentFonts` the cache is guaranteed to
 * hold the document's own faces, so the second pass measures the same way no matter what ran
 * before it. Prefer this over `compileAgentDocument` wherever byte-for-byte reproducibility
 * matters.
 */
export async function compileAgentDocumentWithFonts(
  input: unknown,
  options?: CompileAgentDocumentOptions,
): Promise<PaperDocument> {
  // The probe is compiled with layout validation off: it is measured against an empty cache by
  // definition, so its warnings describe a document that is never rendered.
  const probe = compileAgentDocument(input, { ...options, layoutValidation: "off" });
  await autoLoadDocumentFonts(probe);
  return compileAgentDocument(input, options);
}
