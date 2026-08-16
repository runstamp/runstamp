/**
 * PresentationSpec → PaperDocument compiler.
 *
 * This is the Phase-2 rewrite: a thin dispatcher over `@runstamp/pptx-primitives`.
 * The old hand-drawn layout engine (~2100 LOC with per-family branching) has
 * been replaced by a pipeline that:
 *
 *   1. Resolves a token bundle (caller-supplied `spec.tokens`, or the
 *      BOOTSTRAP_TOKENS default). Aesthetic lives here — not in code.
 *   2. For each slide, builds a `{title, content, footer}` region set,
 *      dispatches the slide's `slideType` to the matching primitive(s),
 *      and collects PrimitiveNodes.
 *   3. Translates the PrimitiveNodes to PaperNodes (engine AST) and
 *      wraps as a PaperSlide.
 *   4. Threads notes / transitions / animations / stable morph IDs /
 *      lineage manifest through unchanged from the old compiler.
 *
 * Backward compat:
 *   - `layoutFamily` is optional and retired. It is ignored by rendering;
 *     passing it emits PROTOCOL_LAYOUTFAMILY_DEPRECATED.
 *   - `accentColor` is optional and retired. Prefer tokens.palette.accent.
 */

import {
  collectAbsoluteSlideLayoutDebug,
  validateAbsoluteSlideLayout,
  type AbsoluteSlideLayoutDebug,
} from "../layout/absoluteSafety.js";
import { PaperError } from "../errors.js";
import type {
  CustomProperty,
  PaperDocument,
  PaperNode,
  PaperSlide,
  SlideTransition,
} from "../types/ast.js";
import {
  BOOTSTRAP_TOKENS,
  resolveTokens,
  footerChrome,
  emitHorizontalRule,
  titleBlock,
  bulletList,
  matrixTable,
  comparisonBand,
  stepTimeline,
  orgTree,
  waterfallBars,
  tombstoneStack,
  quadrantMap,
  metricStack,
  kpiHero,
  toPaperNodes,
  toEngineEmbeddedFonts,
  attachMetricsProvider,
  type ResolvedTokens,
  type TokenBundle,
} from "@runstamp/pptx-primitives";
import type { PrimitiveNode, Rect } from "@runstamp/pptx-primitives";
import type {
  ComparisonTableSlide,
  CompositionSlide,
  KpiGridSlide,
  MarketMapSlide,
  OrgChartSlide,
  PresentationSpec,
  SlideSpec,
  TimelineSlide,
  TitleBodySlide,
  TombstoneGridSlide,
  WaterfallSlide,
} from "@runstamp/protocol";
import {
  PresentationSpecSchema,
  buildCompositionBlocks,
  minRegionFor,
  remediationFor,
  type CompositionCanvas,
} from "@runstamp/protocol";

interface PaperErrorIssue {
  path: string;
  code?: string;
  message: string;
  expected?: string;
  received?: string;
  remediation?: string;
  slideIndex?: number;
  blockIndex?: number;
  primitive?: string;
  actual?: { colSpan?: number; rowSpan?: number };
  minimum?: { colSpan?: number; rowSpan?: number };
}

/**
 * Parses a composition lossy-block key of the form `<primitive>_<index>`
 * (or container-prefixed `container_<i>/<primitive>_<j>`). Returns null if
 * the key shape doesn't match (e.g. `title`, `edgeRule_0`).
 */
function parseBlockKey(key: string): { primitive: string; blockIndex: number } | null {
  // Take the leaf segment for nested keys.
  const leaf = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
  const m = /^([A-Za-z]+)_(\d+)$/.exec(leaf);
  if (!m) return null;
  return { primitive: m[1], blockIndex: Number(m[2]) };
}

/**
 * Builds a structured PaperErrorIssue from a composition block that the
 * primitive layer reported as "clipped" or "paginated". When the slide has
 * `composition` blocks available, includes the block's region and the
 * recommended minimum from MIN_REGION.
 */
function compositionLossyToIssue(
  key: string,
  kind: string,
  slideIndex: number,
  slide: SlideSpec,
): PaperErrorIssue {
  const parsed = parseBlockKey(key);
  const code = kind === "paginated" ? "CONTENT_PAGINATED" : kind === "clipped" ? "CONTENT_CLIPPED" : "VALIDATION_FAILED";

  let blockIndex: number | undefined;
  let primitive: string | undefined;
  let actual: { colSpan?: number; rowSpan?: number } | undefined;
  let minimum: { colSpan?: number; rowSpan?: number } | undefined;
  let remediation: string | undefined;

  if (parsed) {
    primitive = parsed.primitive;
    blockIndex = parsed.blockIndex;
    if (slide.slideType === "composition") {
      const block = slide.blocks?.[parsed.blockIndex];
      const region = block?.region;
      // Grid regions carry colSpan/rowSpan; pixel regions (x/y/w/h) skip
      // the MIN_REGION lookup since the user already opted out of the grid.
      if (region && "colSpan" in region) {
        actual = { colSpan: region.colSpan, rowSpan: region.rowSpan };
        const min = minRegionFor(parsed.primitive);
        if (min) {
          minimum = { colSpan: min.colSpan, rowSpan: min.rowSpan };
          remediation = remediationFor(parsed.primitive, actual, min);
        }
      }
    }
  }

  return {
    path: `slides[${slideIndex}].blocks[${blockIndex ?? "?"}]`,
    code,
    message: `${kind}@${key}`,
    slideIndex,
    blockIndex,
    primitive,
    actual,
    minimum,
    remediation,
  };
}

const SLIDE_W = 960;
const SLIDE_H = 540;

export interface CompilePresentationSpecOptions {
  /** Overrides `spec.accentColor` and the resolved `tokens.palette.accent`. */
  accentColor?: string;
  /** Overrides the resolved `tokens.type.title.family` (and body) — legacy
   *  convenience. Prefer passing a full `tokens` bundle on the spec. */
  fontFamily?: string;
  /** Optional fontkit-backed metrics provider attached to the resolved
   *  tokens before primitives run. When supplied, line-wrap + cell-height
   *  estimates use the real font's glyph advances instead of the
   *  empirical width-ratio table. Required for fidelity layouts whose
   *  bundles use families not in the empirical table — without it,
   *  matrixTable / bulletList over-estimate widths and trip pagination. */
  metricsProvider?: import("@runstamp/pptx-primitives").MetricsProvider;
}

// ---------------------------------------------------------------------------
// Lineage / diagnostics shapes (preserved from the old compiler).
// ---------------------------------------------------------------------------

interface CompiledSlideLineage {
  slideId: string;
  componentId: string;
  title: string;
  slideType: SlideSpec["slideType"];
  componentIds: string[];
  bindingKeys: string[];
}

interface CompiledDocumentLineage {
  deckId: string;
  workflowId?: string;
  workflowRunId?: string;
  releaseId?: string;
  sourceType?: string;
  sourceId?: string;
  slides: CompiledSlideLineage[];
}

interface SlideDiagnostics {
  slideType: SlideSpec["slideType"];
  overflows: Record<string, string>;
  layoutDebug: AbsoluteSlideLayoutDebug;
  /** "standard" when the first-pass layout fit; "readability" when the
   *  compiler fell back to the taller title-region pass. Useful for
   *  downstream QA to flag slides that the primitive layer had to rescue. */
  mode: "standard" | "readability";
  validationIssueCount: number;
}

// ---------------------------------------------------------------------------
// Deprecation guards — emit a single warning per process for retired
// top-level style shorthands.
// ---------------------------------------------------------------------------
let layoutFamilyWarningEmitted = false;
let accentColorWarningEmitted = false;

function emitDeprecationWarning(code: string, message: string): void {
  if (typeof process !== "undefined" && typeof process.emitWarning === "function") {
    process.emitWarning(message, {
      code,
      type: "DeprecationWarning",
    });
  } else {
    console.warn(`[runstamp:${code}] ${message}`);
  }
}

function maybeWarnLayoutFamily(layoutFamily: unknown): void {
  if (layoutFamily === undefined || layoutFamilyWarningEmitted) return;
  layoutFamilyWarningEmitted = true;
  emitDeprecationWarning(
    "PROTOCOL_LAYOUTFAMILY_DEPRECATED",
    "`layoutFamily` is retired; omit it and use `tokens` when styling is needed.",
  );
}

function maybeWarnAccentColor(accentColor: unknown): void {
  if (accentColor === undefined || accentColorWarningEmitted) return;
  accentColorWarningEmitted = true;
  emitDeprecationWarning(
    "PROTOCOL_ACCENTCOLOR_DEPRECATED",
    "`accentColor` is retired; use `tokens.palette.accent` instead.",
  );
}

// ---------------------------------------------------------------------------
// Stable id / morphId / animation helpers — preserved from the old compiler.
// ---------------------------------------------------------------------------

function slugifyFragment(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "item";
}

function resolveStableId(explicitId: string | undefined, fallbackPrefix: string, label: string): string {
  return explicitId?.trim() || `${fallbackPrefix}-${slugifyFragment(label)}`;
}

function attachStableMorphIds(
  node: PaperNode,
  componentId: string,
  componentIds: string[],
): PaperNode {
  const base = node as PaperNode & { morphId?: string; altText?: string; children?: PaperNode[] };
  const nextId = base.morphId?.trim() || componentId;
  componentIds.push(nextId);

  const withChildren = Array.isArray(base.children)
    ? base.children.map((child, index) => attachStableMorphIds(child, `${nextId}.${index + 1}`, componentIds))
    : undefined;

  const normalized: PaperNode & { morphId?: string; altText?: string; children?: PaperNode[] } = {
    ...base,
    morphId: nextId,
  };
  if ("altText" in base && (!base.altText || base.altText.trim().length === 0)) {
    normalized.altText = `runstamp:${nextId}`;
  }
  if (withChildren) {
    normalized.children = withChildren;
  }
  return normalized;
}

const BUILD_BY_POINT_ANIM = {
  type: "entrance" as const,
  effect: "fade" as const,
  trigger: "onClick" as const,
  duration: 300,
};

const FADE_IN_ANIM = {
  type: "entrance" as const,
  effect: "fade" as const,
  trigger: "withPrevious" as const,
  duration: 300,
};

function applySlideAnimation(
  slide: PaperSlide,
  animation: "buildByPoint" | "fadeIn" | "none" | undefined,
): PaperSlide {
  if (!animation || animation === "none") return slide;
  if (animation === "fadeIn") {
    const children = slide.children.map((child) => ({ ...child, animations: [FADE_IN_ANIM] }) as PaperNode);
    return { ...slide, children };
  }
  // buildByPoint — the first two children (typically title + rule) stay
  // static; subsequent children fade in on click.
  const children = slide.children.map((child, index) => {
    if (index < 2) return child;
    return { ...child, animations: [BUILD_BY_POINT_ANIM] } as PaperNode;
  });
  return { ...slide, children };
}

// ---------------------------------------------------------------------------
// Token resolution — weave accentColor / fontFamily overrides into the bundle.
// ---------------------------------------------------------------------------

function resolveCompilerTokens(
  spec: PresentationSpec,
  options: CompilePresentationSpecOptions | undefined,
): ResolvedTokens {
  maybeWarnLayoutFamily(spec.layoutFamily);
  maybeWarnAccentColor(spec.accentColor);
  const accentOverride = options?.accentColor ?? spec.accentColor;
  const fontOverride = options?.fontFamily;

  if (spec.tokens) {
    const resolved = resolveTokens(mergeOverrides(spec.tokens, accentOverride, fontOverride));
    if (options?.metricsProvider) attachMetricsProvider(resolved, options.metricsProvider);
    return resolved;
  }

  // BOOTSTRAP fallback with optional caller overrides baked in. We still
  // pass through `resolveTokens` (not the frozen BOOTSTRAP) so the warning
  // hooks / font audit fire consistently.
  const base: TokenBundle = {
    version: "1.0",
    palette: accentOverride ? { accent: accentOverride } : undefined,
    type: fontOverride
      ? {
          display: { family: fontOverride, weight: 500, size: 56, letterSpacing: -0.5, lineHeight: 62, italic: false, transform: "none" },
          title: { family: fontOverride, weight: 500, size: 28, letterSpacing: -0.2, lineHeight: 34, italic: false, transform: "none" },
          body: { family: fontOverride, weight: 400, size: 14, letterSpacing: 0, lineHeight: 20, italic: false, transform: "none" },
          caption: { family: fontOverride, weight: 400, size: 10, letterSpacing: 0, lineHeight: 14, italic: false, transform: "none" },
          eyebrow: { family: fontOverride, weight: 700, size: 10, letterSpacing: 1.4, lineHeight: 12, italic: false, transform: "upper" },
          nav: { family: fontOverride, weight: 500, size: 10, letterSpacing: 2.0, lineHeight: 12, italic: false, transform: "upper" },
        }
      : undefined,
  };
  const resolved = resolveTokens(base);
  if (options?.metricsProvider) attachMetricsProvider(resolved, options.metricsProvider);
  return resolved;
}

function mergeOverrides(
  tokens: TokenBundle,
  accent: string | undefined,
  font: string | undefined,
): TokenBundle {
  if (!accent && !font) return tokens;
  const next: TokenBundle = { ...tokens };
  if (accent) {
    next.palette = { ...(tokens.palette ?? {}), accent };
  }
  if (font) {
    const existing = tokens.type ?? {};
    const overrideFont = (role: Record<string, unknown> | undefined) => ({
      ...(role ?? {}),
      family: font,
    });
    next.type = {
      display: overrideFont(existing.display),
      title: overrideFont(existing.title),
      body: overrideFont(existing.body),
      caption: overrideFont(existing.caption),
      eyebrow: overrideFont(existing.eyebrow),
      nav: overrideFont(existing.nav),
    } as TokenBundle["type"];
  }
  return next;
}

// ---------------------------------------------------------------------------
// Region helpers — one slide-region set drives all slide builders.
// ---------------------------------------------------------------------------

interface SlideRegions {
  title: Rect;
  content: Rect;
  footer: Rect;
}

function buildSlideRegions(tokens: ResolvedTokens, mode: "standard" | "readability" = "standard"): SlideRegions {
  const margin = tokens.canvas.margin;
  const footerEnabled = tokens.chrome.footer.enabled;
  const footerHeight = footerEnabled ? tokens.chrome.footer.height : 0;
  // Top inset honors canvas.margin so photo-driven bundles (margin=0)
  // can bleed all the way to the slide edge. Existing callers that
  // relied on the previous fixed 40px gap should pin margin >= 40.
  const titleTop = margin;
  const titleHeight = mode === "readability" ? 200 : 96;
  const contentTop = titleTop + titleHeight + 8;
  const contentBottom = SLIDE_H - (footerEnabled ? footerHeight + 16 : 16);
  return {
    title: {
      left: margin,
      top: titleTop,
      width: SLIDE_W - margin * 2,
      height: titleHeight,
    },
    content: {
      left: margin,
      top: contentTop,
      width: SLIDE_W - margin * 2,
      height: Math.max(80, contentBottom - contentTop),
    },
    footer: footerEnabled
      ? {
          left: margin,
          top: SLIDE_H - footerHeight - 8,
          width: SLIDE_W - margin * 2,
          height: footerHeight,
        }
      : { left: 0, top: 0, width: 0, height: 0 },
  };
}

function mergeSlideChrome(tokens: ResolvedTokens, slide: SlideSpec): ResolvedTokens {
  if (!slide.chrome) return tokens;
  return {
    ...tokens,
    chrome: {
      ...tokens.chrome,
      ...(slide.chrome.headerRibbon
        ? { headerRibbon: { ...tokens.chrome.headerRibbon, ...slide.chrome.headerRibbon } }
        : {}),
      ...(slide.chrome.footer
        ? { footer: { ...tokens.chrome.footer, ...slide.chrome.footer } }
        : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Slide dispatcher — one function per slideType.
// ---------------------------------------------------------------------------

interface SlideBuildResult {
  nodes: PrimitiveNode[];
  nodeKeys?: string[];
  overflows: Record<string, string>;
}

function mapIssueNodePathToBlockKey(nodePath: string | undefined, nodeKeys: string[] | undefined): string | undefined {
  if (!nodePath || !nodeKeys) return undefined;
  const match = /^slides\[\d+\]\.children\[(\d+)\]/.exec(nodePath);
  if (!match) return undefined;
  const index = Number(match[1]);
  return Number.isInteger(index) ? nodeKeys[index] : undefined;
}

function formatLayoutIssueReason(
  issue: ReturnType<typeof validateAbsoluteSlideLayout>[number],
  nodeKeys: string[] | undefined,
): string {
  const key = mapIssueNodePathToBlockKey(issue.nodePath, nodeKeys);
  const relatedKey = mapIssueNodePathToBlockKey(issue.relatedNodePath, nodeKeys);
  if (!key && !relatedKey) return `${issue.code}@${issue.nodePath}`;
  const related = relatedKey && relatedKey !== key ? `~${relatedKey}` : "";
  return `${issue.code}@${key ?? issue.nodePath}${related}`;
}

function attachCallerKeysToLayoutDebug(
  debug: AbsoluteSlideLayoutDebug,
  nodeKeys: string[] | undefined,
): AbsoluteSlideLayoutDebug {
  return {
    ...debug,
    nodes: debug.nodes.map((node) => ({
      ...node,
      blockKey: mapIssueNodePathToBlockKey(node.path, nodeKeys),
    })),
    issues: debug.issues.map((issue) => ({
      ...issue,
      blockKey: mapIssueNodePathToBlockKey(issue.nodePath, nodeKeys),
      relatedBlockKey: mapIssueNodePathToBlockKey(issue.relatedNodePath, nodeKeys),
    })),
  } as AbsoluteSlideLayoutDebug;
}

function buildTitleBodySlide(slide: TitleBodySlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    {
      title: slide.title,
      eyebrow: slide.eyebrow,
      subtitle: slide.subtitle,
    },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  const bullets = bulletList(
    { items: slide.body.map((text) => ({ text })) },
    tokens,
    regions.content,
  );
  nodes.push(...bullets.nodes);
  overflows.body = bullets.overflow.kind;
  return { nodes, overflows };
}

function buildKpiGridSlide(slide: KpiGridSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  // 2-item KPI grids read strongest as hero + supporting. 3+ go into a
  // metricStack grid. Split into rows of up to 3 metrics each.
  if (slide.items.length <= 3) {
    const stackResult = metricStack(
      {
        rows: slide.items.map((item) => ({
          label: item.label,
          value: item.value,
          delta: item.sublabel,
          trend: item.trend === "none" ? undefined : item.trend,
        })),
      },
      tokens,
      regions.content,
    );
    nodes.push(...stackResult.nodes);
    overflows.kpi = stackResult.overflow.kind;
  } else {
    // 4+ metrics → 2-column grid of metric cards, using metricStack per column.
    const cols = 2;
    const gap = tokens.spacing.md;
    const colWidth = (regions.content.width - gap * (cols - 1)) / cols;
    const perCol = Math.ceil(slide.items.length / cols);
    for (let c = 0; c < cols; c++) {
      const slice = slide.items.slice(c * perCol, (c + 1) * perCol);
      if (slice.length === 0) continue;
      const colRegion: Rect = {
        left: regions.content.left + c * (colWidth + gap),
        top: regions.content.top,
        width: colWidth,
        height: regions.content.height,
      };
      const stackResult = metricStack(
        {
          rows: slice.map((item) => ({
            label: item.label,
            value: item.value,
            delta: item.sublabel,
            trend: item.trend === "none" ? undefined : item.trend,
          })),
        },
        tokens,
        colRegion,
      );
      nodes.push(...stackResult.nodes);
      overflows[`kpi_col${c}`] = stackResult.overflow.kind;
    }
  }
  return { nodes, overflows };
}

function buildComparisonSlide(slide: ComparisonTableSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  const compResult = comparisonBand(
    {
      columns: slide.columns,
      rows: slide.rows.map((row) => ({
        label: row.label,
        values: row.values,
        accent: row.highlight,
      })),
    },
    tokens,
    regions.content,
  );
  nodes.push(...compResult.nodes);
  overflows.table = compResult.overflow.kind;
  return { nodes, overflows };
}

function buildMarketMapSlide(slide: MarketMapSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  const quadrants = slide.quadrants && slide.quadrants.length === 4
    ? ([slide.quadrants[0], slide.quadrants[1], slide.quadrants[2], slide.quadrants[3]] as [string, string, string, string])
    : undefined;

  const mapResult = quadrantMap(
    {
      xAxisLabel: slide.xAxisLabel ? { low: "Low", high: slide.xAxisLabel } : undefined,
      yAxisLabel: slide.yAxisLabel ? { low: "Low", high: slide.yAxisLabel } : undefined,
      quadrants,
      points: slide.companies.map((c) => ({
        name: c.name,
        x: c.x,
        y: c.y,
        emphasis: c.emphasis,
      })),
    },
    tokens,
    regions.content,
  );
  nodes.push(...mapResult.nodes);
  overflows.map = mapResult.overflow.kind;
  return { nodes, overflows };
}

function buildTimelineSlide(slide: TimelineSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  const timelineResult = stepTimeline(
    {
      steps: slide.events.map((event) => ({
        tag: event.date ?? event.label,
        label: event.label,
        description: event.description,
      })),
    },
    tokens,
    regions.content,
  );
  nodes.push(...timelineResult.nodes);
  overflows.timeline = timelineResult.overflow.kind;
  return { nodes, overflows };
}

function buildOrgChartSlide(slide: OrgChartSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  // OrgChart schema is a flat list with parent references. Extract the
  // root (the first node without a parent) + its immediate children.
  // Deeper trees collapse to the 2-level model — a conscious simplification;
  // deeper orgs should use multiple slides or a caller composition.
  const byId = new Map(slide.nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string | undefined, typeof slide.nodes>();
  for (const node of slide.nodes) {
    const parent = node.parentId ?? undefined;
    const list = childrenOf.get(parent) ?? [];
    list.push(node);
    childrenOf.set(parent, list);
  }
  const roots = slide.nodes.filter((n) => !n.parentId || !byId.has(n.parentId));
  const root = roots[0] ?? slide.nodes[0];
  const directChildren = childrenOf.get(root.id) ?? [];

  const treeResult = orgTree(
    {
      root: { title: root.label, subtitle: root.role },
      children: directChildren.map((c) => ({
        title: c.label,
        subtitle: c.role,
      })),
    },
    tokens,
    regions.content,
  );
  nodes.push(...treeResult.nodes);
  overflows.tree = treeResult.overflow.kind;
  return { nodes, overflows };
}

function buildWaterfallSlide(slide: WaterfallSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  // Waterfall entries carry an explicit `type` on the schema. Map to
  // the primitive's step kinds: "total" → start (first) or end (last);
  // "increase" → up; "decrease" → down.
  const wfResult = waterfallBars(
    {
      steps: slide.entries.map((entry, i, arr) => {
        const absValue = Math.abs(entry.value);
        if (entry.type === "total") {
          const isLast = i === arr.length - 1;
          return isLast
            ? { kind: "end" as const, label: entry.label, value: absValue }
            : { kind: "start" as const, label: entry.label, value: absValue };
        }
        return entry.type === "increase"
          ? { kind: "up" as const, label: entry.label, value: absValue }
          : { kind: "down" as const, label: entry.label, value: absValue };
      }),
    },
    tokens,
    regions.content,
  );
  nodes.push(...wfResult.nodes);
  overflows.waterfall = wfResult.overflow.kind;
  return { nodes, overflows };
}

function buildTombstoneSlide(slide: TombstoneGridSlide, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  const overflows: Record<string, string> = {};
  const nodes: PrimitiveNode[] = [];
  const titleResult = titleBlock(
    { title: slide.title, subtitle: slide.subtitle },
    tokens,
    regions.title,
  );
  nodes.push(...titleResult.nodes);
  overflows.title = titleResult.overflow.kind;

  const tombResult = tombstoneStack(
    {
      tiles: slide.items.map((item) => ({
        title: item.name,
        // Compose subtitle + bullet metrics into a single body line.
        body: [item.subtitle, ...(item.metrics ?? [])].filter(Boolean).join(" · ") || undefined,
      })),
      columns: slide.items.length <= 3 ? slide.items.length : 4,
      logoHeight: 0,
    },
    tokens,
    regions.content,
  );
  nodes.push(...tombResult.nodes);
  overflows.tiles = tombResult.overflow.kind;
  return { nodes, overflows };
}

function buildCompositionSlide(
  slide: CompositionSlide,
  tokens: ResolvedTokens,
  regions: SlideRegions,
): SlideBuildResult {
  // Composition canvas spans the full body region (title + content).
  // Title chrome is NOT auto-emitted — the caller composes their own
  // header via a titleBlock block when desired.
  const canvas: CompositionCanvas = {
    left: regions.title.left,
    top: regions.title.top,
    width: regions.title.width,
    height: regions.title.height + 8 + regions.content.height,
    gap: slide.gap,
  };
  const built = buildCompositionBlocks(slide.blocks, tokens, canvas);
  return { nodes: built.nodes, nodeKeys: built.nodeKeys, overflows: built.overflows };
}

function dispatchSlide(slide: SlideSpec, tokens: ResolvedTokens, regions: SlideRegions): SlideBuildResult {
  switch (slide.slideType) {
    case "title-body": return buildTitleBodySlide(slide, tokens, regions);
    case "kpi-grid": return buildKpiGridSlide(slide, tokens, regions);
    case "comparison-table": return buildComparisonSlide(slide, tokens, regions);
    case "market-map": return buildMarketMapSlide(slide, tokens, regions);
    case "timeline": return buildTimelineSlide(slide, tokens, regions);
    case "org-chart": return buildOrgChartSlide(slide, tokens, regions);
    case "waterfall": return buildWaterfallSlide(slide, tokens, regions);
    case "tombstone-grid": return buildTombstoneSlide(slide, tokens, regions);
    case "composition": return buildCompositionSlide(slide, tokens, regions);
  }
}

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------

function compileCustomProperties(
  manifest: CompiledDocumentLineage,
  diagnostics: SlideDiagnostics[],
): CustomProperty[] {
  const props: CustomProperty[] = [
    { name: "runstamp.deckId", value: manifest.deckId },
    { name: "runstamp.lineageManifest", value: JSON.stringify(manifest) },
    { name: "runstamp.layoutSafetyReport", value: JSON.stringify(diagnostics) },
  ];
  if (manifest.workflowId) props.push({ name: "runstamp.workflowId", value: manifest.workflowId });
  if (manifest.workflowRunId) props.push({ name: "runstamp.workflowRunId", value: manifest.workflowRunId });
  if (manifest.releaseId) props.push({ name: "runstamp.releaseId", value: manifest.releaseId });
  if (manifest.sourceType) props.push({ name: "runstamp.sourceType", value: manifest.sourceType });
  if (manifest.sourceId) props.push({ name: "runstamp.sourceId", value: manifest.sourceId });
  manifest.slides.forEach((slide, index) => {
    props.push({ name: `runstamp.slide.${index + 1}.id`, value: slide.slideId });
    props.push({ name: `runstamp.slide.${index + 1}.componentId`, value: slide.componentId });
  });
  return props;
}

export function compilePresentationSpec(
  spec: PresentationSpec,
  options?: CompilePresentationSpecOptions,
): PaperDocument {
  const parsed = PresentationSpecSchema.safeParse(spec);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 10)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new PaperError(`Invalid PresentationSpec: ${issues}`, {
      code: "VALIDATION_FAILED",
      phase: "validation",
      issues: parsed.error.issues.slice(0, 10).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
        remediation: "Correct the PresentationSpec field at this path and retry.",
      })),
    });
  }
  const validSpec = parsed.data;

  const tokens = resolveCompilerTokens(validSpec, options);

  const deckId = resolveStableId(validSpec.deckId, "deck", validSpec.title);
  const slideLineage: CompiledSlideLineage[] = [];
  const diagnostics: SlideDiagnostics[] = [];

  const edgeRuleNodes = (slideTokens: ResolvedTokens): PrimitiveNode[] => {
    const result = emitHorizontalRule(
      slideTokens.rules.edge,
      slideTokens.palette,
      slideTokens.canvas.margin,
      slideTokens.canvas.margin + 6,
      SLIDE_W - slideTokens.canvas.margin * 2,
    );
    return result.nodes.map((node) => ({ ...node, zIndex: -1 }));
  };

  // Emit footer once per slide (content identical except slide index).
  const footerNodes = (
    slideIndex: number,
    total: number,
    regions: SlideRegions,
    slideTokens: ResolvedTokens,
  ): PrimitiveNode[] => {
    if (!slideTokens.chrome.footer.enabled) return [];
    const result = footerChrome(
      { slideIndex: slideIndex + 1, totalSlides: total },
      slideTokens,
      regions.footer,
    );
    return result.nodes;
  };

  const buildSlidePaper = (
    slide: SlideSpec,
    slideIndex: number,
    regions: SlideRegions,
    slideTokens: ResolvedTokens,
    readability = false,
  ): { slide: PaperSlide; slideId: string; componentIds: string[]; componentId: string; built: SlideBuildResult } => {
    // Readability mode drops the subtitle — the titleBlock primitive then
    // has more vertical budget for the main title text. Subtitle loss is
    // the acceptable tradeoff vs. node collision.
    const effectiveSlide = readability && slide.subtitle
      ? ({ ...slide, subtitle: undefined } as SlideSpec)
      : slide;
    const built = dispatchSlide(effectiveSlide, slideTokens, regions);
    const edge = edgeRuleNodes(slideTokens);
    built.nodes.push(...edge);
    if (built.nodeKeys) {
      built.nodeKeys.push(...edge.map((_, index) => `edgeRule_${index}`));
    }
    const footer = footerNodes(slideIndex, validSpec.slides.length, regions, slideTokens);
    built.nodes.push(...footer);
    if (built.nodeKeys) {
      built.nodeKeys.push(...footer.map((_, index) => `footer_${index}`));
    }

    const slideId = resolveStableId(
      slide.slideId ?? slide.id,
      `${deckId}-slide-${slideIndex + 1}`,
      slide.title,
    );
    const componentId = resolveStableId(slide.componentId, slideId, slide.slideType);
    const componentIds: string[] = [];

    const children: PaperNode[] = toPaperNodes(built.nodes).map((child, index) =>
      attachStableMorphIds(child as PaperNode, `${componentId}.${index + 1}`, componentIds),
    );

    let normalizedSlide: PaperSlide = {
      type: "Slide",
      background: { type: "solid", color: slideTokens.canvas.surface },
      children,
    } as PaperSlide;

    if (slide.notes?.length) {
      normalizedSlide.notes = slide.notes.join("\n");
    }

    if (slide.transition) {
      const speedToDuration: Record<string, number> = { fast: 200, med: 500, slow: 1000 };
      if (slide.transition.type !== "none") {
        const transition: SlideTransition = {
          type: slide.transition.type,
          duration: speedToDuration[slide.transition.speed ?? "med"] ?? 500,
        };
        if (slide.transition.advanceOnClick !== undefined) transition.advanceOnClick = slide.transition.advanceOnClick;
        if (slide.transition.advanceAfterMs !== undefined) transition.advanceAfterTime = slide.transition.advanceAfterMs;
        normalizedSlide.transition = transition;
      }
    }

    if (slide.animation) {
      normalizedSlide = applySlideAnimation(normalizedSlide, slide.animation);
    }
    return { slide: normalizedSlide, slideId, componentIds, componentId, built };
  };

  const slides = validSpec.slides.map((slide, slideIndex): PaperSlide => {
    const slideTokens = mergeSlideChrome(tokens, slide);
    const standardRegions = buildSlideRegions(slideTokens, "standard");
    const readabilityRegions = buildSlideRegions(slideTokens, "readability");
    // Two-pass layout: standard regions first, readability fallback on
    // validation failure OR on any primitive-reported clip. The engine
    // validator ignores decorative nodes (including rule hairlines), so
    // a compound title rule can overlap body text without the validator
    // catching it. Primitives self-report "clipped" in those cases —
    // treat that report as a trigger to escalate to readability mode.
    const standardPass = buildSlidePaper(slide, slideIndex, standardRegions, slideTokens);
    let chosen = standardPass;
    let chosenMode: "standard" | "readability" = "standard";
    const standardIssues = validateAbsoluteSlideLayout(
      standardPass.slide,
      slideIndex,
      { width: SLIDE_W, height: SLIDE_H },
    );
    // Readability only grows the title region — retry only when the
    // title primitive itself clipped. Content-layer clips (e.g., too
    // many waterfall bars) won't be rescued by a taller header.
    // Composition slides skip the retry: callers placed primitives
    // explicitly, so re-layout would shift their work and surprise them.
    // Validation failures on composition surface as PaperError directly.
    const titleClipped = standardPass.built.overflows.title === "clipped";
    const isComposition = slide.slideType === "composition";
    if (!isComposition && (standardIssues.length > 0 || titleClipped)) {
      const readabilityPass = buildSlidePaper(slide, slideIndex, readabilityRegions, slideTokens, true);
      const readabilityIssues = validateAbsoluteSlideLayout(
        readabilityPass.slide,
        slideIndex,
        { width: SLIDE_W, height: SLIDE_H },
      );
      if (readabilityIssues.length > 0) {
        const issues: PaperErrorIssue[] = readabilityIssues.map((i) => ({
          path: `slides[${slideIndex}]`,
          code: i.code,
          message: `${i.code}@${i.nodePath}`,
          slideIndex,
        }));
        throw new PaperError(
          `Protocol layout safety failed for "${slide.title}": ${readabilityIssues
            .map((i) => `${i.code}@${i.nodePath}`)
            .join(", ")}`,
          { code: "VALIDATION_FAILED", phase: "layout", slideIndex, issues },
        );
      }
      chosen = readabilityPass;
      chosenMode = "readability";
    } else if (isComposition) {
      // Composition: surface validator issues AND any block that
      // self-reported a clip or pagination. Callers placed primitives
      // explicitly, so silent truncation (clip) or silent overflow into
      // nowhere (paginated — composition has no continuation mechanism)
      // both violate the reliability contract.
      const lossyEntries = Object.entries(standardPass.built.overflows)
        .filter(([, kind]) => kind === "clipped" || kind === "paginated");
      const lossyBlocks = lossyEntries.map(([key, kind]) => `${kind}@${key}`);
      if (standardIssues.length > 0 || lossyBlocks.length > 0) {
        const reasons = [
          ...standardIssues.map((i) => formatLayoutIssueReason(i, standardPass.built.nodeKeys)),
          ...lossyBlocks,
        ];
        const issues: PaperErrorIssue[] = [
          ...standardIssues.map((i) => ({
            path: `slides[${slideIndex}]`,
            code: i.code,
            message: `${i.code}@${i.nodePath}`,
            slideIndex,
          })),
          ...lossyEntries.map(([key, kind]) => compositionLossyToIssue(key, kind, slideIndex, slide)),
        ];
        throw new PaperError(
          `Protocol layout safety failed for "${slide.title}": ${reasons.join(", ")}`,
          { code: "VALIDATION_FAILED", phase: "layout", slideIndex, issues },
        );
      }
    }
    const normalizedSlide = chosen.slide;
    const slideId = chosen.slideId;
    const componentIds = chosen.componentIds;
    const componentId = chosen.componentId;
    const built = chosen.built;
    const layoutDebug = attachCallerKeysToLayoutDebug(
      collectAbsoluteSlideLayoutDebug(
        normalizedSlide,
        slideIndex,
        { width: SLIDE_W, height: SLIDE_H },
      ),
      built.nodeKeys,
    );

    slideLineage.push({
      slideId,
      componentId,
      title: slide.title,
      slideType: slide.slideType,
      componentIds,
      bindingKeys: [
        ...(validSpec.bindings ?? []).map((binding) => binding.bindingKey),
        ...(slide.bindings ?? []).map((binding) => binding.bindingKey),
      ],
    });

    diagnostics.push({
      slideType: slide.slideType,
      overflows: built.overflows,
      layoutDebug,
      mode: chosenMode,
      validationIssueCount: layoutDebug.issues.length,
    });

    return normalizedSlide;
  });

  const lineageManifest: CompiledDocumentLineage = {
    deckId,
    workflowId: validSpec.lineage?.workflowId,
    workflowRunId: validSpec.lineage?.workflowRunId,
    releaseId: validSpec.lineage?.releaseId,
    sourceType: validSpec.lineage?.sourceType,
    sourceId: validSpec.lineage?.sourceId,
    slides: slideLineage,
  };

  const majorFont = options?.fontFamily ?? tokens.type.title.family;
  const minorFont = options?.fontFamily ?? tokens.type.body.family;

  return {
    type: "Document",
    meta: {
      title: validSpec.title,
      author: "Runstamp Protocol Compiler",
    },
    slideSize: { width: SLIDE_W, height: SLIDE_H },
    theme: {
      name: "Runstamp Protocol",
      colorScheme: {
        dk1: tokens.palette.foreground,
        lt1: tokens.canvas.surface,
        dk2: tokens.palette.muted,
        lt2: tokens.palette.rule,
        accent1: tokens.palette.accent,
        accent2: tokens.palette.faint,
        accent3: tokens.palette.muted,
      },
      fontScheme: {
        majorLatin: majorFont,
        minorLatin: minorFont,
      },
    },
    customProperties: compileCustomProperties(lineageManifest, diagnostics),
    slides,
    ...(tokens.embeddedFonts.length > 0
      ? { embeddedFonts: toEngineEmbeddedFonts(tokens.embeddedFonts) }
      : {}),
  };
}

export type PreflightResult =
  | { ok: true; document: PaperDocument }
  | { ok: false; issues: PaperErrorIssue[]; message: string };

/**
 * Runs `compilePresentationSpec` and returns structured layout/validation
 * issues instead of throwing on the first failure. Use this when you need
 * to surface remediation hints to a caller (e.g. an LLM agent) rather than
 * propagate a string error message.
 *
 * `issues` is the same shape attached to a thrown PaperError: each entry
 * carries `slideIndex`, `blockIndex`, `primitive`, `actual` / `minimum`
 * region dimensions, and a one-line `remediation` hint sourced from
 * MIN_REGION when applicable.
 */
export function preflightPresentationSpec(
  spec: PresentationSpec,
  options?: CompilePresentationSpecOptions,
): PreflightResult {
  try {
    const document = compilePresentationSpec(spec, options);
    return { ok: true, document };
  } catch (error) {
    if (error instanceof PaperError) {
      return {
        ok: false,
        issues: (error.issues as PaperErrorIssue[] | undefined) ?? [
          { path: "", message: error.message, code: error.code, slideIndex: error.slideIndex },
        ],
        message: error.message,
      };
    }
    if (error instanceof Error) {
      return {
        ok: false,
        issues: [{ path: "", message: error.message }],
        message: error.message,
      };
    }
    return {
      ok: false,
      issues: [{ path: "", message: String(error) }],
      message: String(error),
    };
  }
}
