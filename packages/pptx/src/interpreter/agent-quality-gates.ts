import { PaperError } from "../errors.js";
import type { LayoutNode } from "../layout/extract.js";
import type { PaperDocument, PaperNode, TextRun } from "../types/ast.js";
import type { AgentDocument } from "./agentSchema.js";
import { isChartTitleEcho } from "./templates.js";
import {
  isQualitativeKpiValue,
  isTimelineSequence,
  parseComparisonEntry,
  parseComparisonOwnership,
  parseRegisterEntry,
  parseTimelineEntry,
} from "./composition-semantics.js";

function childNodes(node: PaperNode | LayoutNode): Array<PaperNode | LayoutNode> {
  return "children" in node && Array.isArray(node.children) ? node.children : [];
}

function collectNodes<T extends PaperNode | LayoutNode>(
  roots: T[],
  predicate: (node: PaperNode | LayoutNode) => boolean,
): Array<PaperNode | LayoutNode> {
  const matches: Array<PaperNode | LayoutNode> = [];
  const pending: Array<PaperNode | LayoutNode> = [...roots];
  while (pending.length > 0) {
    const node = pending.pop() as PaperNode | LayoutNode;
    if (predicate(node)) matches.push(node);
    pending.push(...childNodes(node));
  }
  return matches;
}

function textRuns(node: PaperNode | LayoutNode): TextRun[] {
  if (node.type !== "Text" || node.content === undefined) return [];
  return typeof node.content === "string" ? [{ text: node.content }] : node.content;
}

function nodeText(node: PaperNode | LayoutNode): string {
  return textRuns(node).map((run) => run.text).join("");
}

export function assertAgentCompilationSemantics(
  source: AgentDocument,
  compiled: PaperDocument,
): void {
  source.slides.forEach((slide, slideIndex) => {
    const compiledNodes = collectNodes(compiled.slides[slideIndex]?.children ?? [], () => true);
    const paginationFooters = compiledNodes.filter((node) => (
      node.type === "View" && node.altText === "Agent pagination footer"
    ));
    if (slide.pattern === "title") {
      if (paginationFooters.length > 0) {
        throw new PaperError(`Agent title slide ${slideIndex + 1} unexpectedly contains pagination chrome.`, {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "compilation",
          slideIndex,
          remediation: "Keep title slides intentionally sparse and add pagination only to content slides.",
        });
      }
    } else {
      const expectedPage = `${String(slideIndex + 1).padStart(2, "0")} / ${String(source.slides.length).padStart(2, "0")}`;
      const hasExpectedPage = paginationFooters.length === 1 && collectNodes(
        paginationFooters,
        (node) => node.type === "Text" && nodeText(node) === expectedPage,
      ).length === 1;
      if (!hasExpectedPage) {
        throw new PaperError(`Agent content slide ${slideIndex + 1} is missing deterministic pagination footer "${expectedPage}".`, {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "compilation",
          slideIndex,
          remediation: "Add one professional footer with the deck label and zero-padded current/total slide count.",
        });
      }
    }
    const expected = slide.content.chart?.type === "area"
      ? slide.content.chart.areaGrouping
      : undefined;
    if (expected !== undefined) {
      const charts = collectNodes(compiled.slides[slideIndex]?.children ?? [], (node) => node.type === "Chart");
      const actual = charts[0]?.type === "Chart" ? charts[0].chartData.areaGrouping : undefined;
      if (actual !== expected) {
        throw new PaperError(
          `Agent area-chart grouping was not preserved on slide ${slideIndex + 1}: expected ${expected}, received ${actual ?? "none"}.`,
          {
            code: "AGENT_INPUT_INVALID",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "chart", "areaGrouping"],
            remediation: "Preserve areaGrouping when converting agent chart input to ChartData.",
          },
        );
      }
    }

    const bullets = slide.content.bulletPoints ?? [];
    if (slide.pattern === "bullets" && isTimelineSequence(bullets)) {
      const expectedMilestones = bullets.filter((entry) => parseTimelineEntry(entry) !== undefined).length;
      const actualMilestones = compiledNodes.filter((node) => node.type === "View" && node.altText === "Agent timeline milestone").length;
      if (actualMilestones !== expectedMilestones) {
        throw new PaperError(
          `Agent timeline on slide ${slideIndex + 1} was not composed as a source-ordered runway.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "bulletPoints"],
            remediation: "Render date/month/phase-prefixed bullets as milestones on one chronological runway.",
          },
        );
      }
    }

    const explicitComparison = slide.pattern === "comparison"
      ? slide.content.comparison
      : undefined;
    const ownership = explicitComparison
      ? { left: explicitComparison.leftLabel, right: explicitComparison.rightLabel }
      : slide.pattern === "comparison"
        ? parseComparisonOwnership(slide.content.subtitle)
        : undefined;
    const hasRelationalPairs = explicitComparison
      ? explicitComparison.rows.length > 0
      : ownership
        && bullets.length > 0
        && bullets.every((entry) => parseComparisonEntry(entry) !== undefined);
    if (hasRelationalPairs) {
      const ownedFields = compiledNodes.filter((node) => (
        node.type === "View" && node.altText?.startsWith("Agent comparison owned field:")
      ));
      if (ownedFields.length !== 2) {
        throw new PaperError(
          `Agent comparison on slide ${slideIndex + 1} does not expose two owned source fields.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "subtitle"],
            remediation: "Use explicit left/right subtitle clauses and relational source delimiters to build two owned fields.",
          },
        );
      }
    }

    if (slide.pattern === "bullets" && !isTimelineSequence(bullets)) {
      for (const entry of bullets) {
        const parts = parseRegisterEntry(entry);
        if (!parts.anchor) continue;
        const entryNode = compiledNodes.find((node) => node.type === "Text" && nodeText(node) === entry);
        const runs = entryNode ? textRuns(entryNode) : [];
        if (runs.length < 2 || runs[0].text !== parts.anchor || runs[0].style?.fontWeight !== "bold") {
          throw new PaperError(
            `Agent register anchor "${parts.anchor}" on slide ${slideIndex + 1} was not promoted verbatim.`,
            {
              code: "AGENT_LAYOUT_VALIDATION_FAILED",
              phase: "compilation",
              slideIndex,
              path: ["slides", String(slideIndex), "content", "bulletPoints"],
              remediation: "Promote compact source prefixes as bold rich-text anchors without rewriting the entry.",
            },
          );
        }
      }
    }

    if (slide.pattern === "statement" && (slide.content.prose?.length ?? 0) > 0) {
      const proseNodes = (slide.content.prose ?? []).map((entry) => (
        compiledNodes.find((node) => node.type === "Text" && nodeText(node) === entry)
      ));
      if (proseNodes.some((node) => node?.type !== "Text" || (node.style?.fontSize ?? 0) < 18)) {
        throw new PaperError(
          `Agent statement evidence on slide ${slideIndex + 1} is below the 18pt composition floor.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "prose"],
            remediation: "Balance the statement and evidence fields before shrinking supporting prose.",
          },
        );
      }
    }

    if (slide.content.chart) {
      const chartNode = compiledNodes.find((node) => node.type === "Chart");
      if (chartNode?.type !== "Chart") {
        throw new PaperError(`Agent chart is missing on slide ${slideIndex + 1}.`, {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "compilation",
          slideIndex,
        });
      }
      const chartData = chartNode.chartData;
      const sourceChartTitle = slide.content.chart.title;
      if (sourceChartTitle) {
        const echoesSlideHeading = [slide.content.title, slide.content.subtitle]
          .some((title) => isChartTitleEcho(sourceChartTitle, title));
        if (echoesSlideHeading && chartData.title !== undefined) {
          throw new PaperError(
            `Agent chart title on slide ${slideIndex + 1} repeats the surrounding slide heading.`,
            {
              code: "AGENT_LAYOUT_VALIDATION_FAILED",
              phase: "compilation",
              slideIndex,
              path: ["slides", String(slideIndex), "content", "chart", "title"],
              remediation: "Suppress a chart title that normalizes to the slide title or subtitle; retain distinct evidence titles.",
            },
          );
        }
        if (!echoesSlideHeading && chartData.title?.text !== sourceChartTitle) {
          throw new PaperError(
            `Agent chart title on slide ${slideIndex + 1} was lost even though it adds distinct evidence.`,
            {
              code: "AGENT_LAYOUT_VALIDATION_FAILED",
              phase: "compilation",
              slideIndex,
              path: ["slides", String(slideIndex), "content", "chart", "title"],
              remediation: "Preserve chart titles that do not duplicate the slide title or subtitle.",
            },
          );
        }
      }
      const labelsAreLegible = (chartData.legend?.fontSize ?? 0) >= 14
        && (chartData.categoryAxis?.labelFont?.fontSize ?? 0) >= 14
        && (chartData.valueAxis?.labelFont?.fontSize ?? 0) >= 14
        && (chartData.dataLabels?.fontSize ?? 0) >= 12;
      const lineHasEvidenceMarkers = chartData.chartType !== "line"
        || (chartData.marker?.size ?? 0) >= 6;
      if (!labelsAreLegible || !lineHasEvidenceMarkers) {
        throw new PaperError(
          `Agent chart evidence on slide ${slideIndex + 1} uses timid labels or line emphasis.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "chart"],
            remediation: "Use legible legend, axis, and data labels and visible markers for line evidence without changing values.",
          },
        );
      }
    }

    for (const kpi of slide.content.kpis ?? []) {
      if (!isQualitativeKpiValue(kpi.value)) continue;
      const valueNode = collectNodes(
        compiled.slides[slideIndex]?.children ?? [],
        (node) => node.type === "Text" && nodeText(node) === kpi.value,
      )[0];
      if (
        valueNode?.type !== "Text"
        || valueNode.style?.textAlign !== "left"
        || (valueNode.style?.fontSize ?? 0) < 30
        || valueNode.style?.fontWeight !== "bold"
      ) {
        throw new PaperError(
          `Qualitative KPI value "${kpi.value}" on slide ${slideIndex + 1} was not composed as a left-aligned statement.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "kpis"],
            remediation: "Render qualitative KPI values as statements and reserve oversized metric typography for numeric values.",
          },
        );
      }
    }

    if (slide.pattern === "dashboard" && !slide.content.chart && (slide.content.kpis?.length ?? 0) >= 2) {
      const [primaryKpi, supportingKpi] = slide.content.kpis ?? [];
      const primaryField = compiledNodes.find((node) => (
        node.type === "View"
        && childNodes(node).some((child) => child.type === "Text" && nodeText(child) === primaryKpi?.label)
      ));
      const supportingField = compiledNodes.find((node) => (
        node.type === "View"
        && childNodes(node).some((child) => child.type === "Text" && nodeText(child) === supportingKpi?.label)
      ));
      const primaryValue = compiledNodes.find((node) => (
        node.type === "Text" && nodeText(node) === primaryKpi?.value
      ));
      const hasStructuredSublabelBand = !primaryKpi?.sublabel || (
        primaryField?.type === "View"
        && childNodes(primaryField).some((node) => (
          node.type === "View" && node.altText === "Agent primary metric sublabel band"
        ))
      );
      if (
        primaryField?.type !== "View"
        || supportingField?.type !== "View"
        || typeof primaryField.style?.width !== "number"
        || typeof supportingField.style?.width !== "number"
        || primaryField.style.width >= supportingField.style.width
        || !hasStructuredSublabelBand
        || primaryValue?.type !== "Text"
        || (primaryValue.style?.fontSize ?? 0) < (primaryKpi && primaryKpi.value.length <= 14 ? 78 : 48)
      ) {
        throw new PaperError(
          `Agent dashboard on slide ${slideIndex + 1} lacks a decisive primary metric field.`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "compilation",
            slideIndex,
            path: ["slides", String(slideIndex), "content", "kpis"],
            remediation: "Use a compact lead field with oversized primary evidence and a wider supporting register.",
          },
        );
      }
    }
  });
}

function bottomEdge(node: LayoutNode): number {
  return node.layout.y + node.layout.height;
}

function isRegisterRow(node: LayoutNode): boolean {
  return node.type === "View" && (
    node.altText === "Agent register row"
    || (node.children ?? []).some((child) => (
      child.type === "Text"
      && typeof child.content === "string"
      && /^\d{2}$/u.test(child.content)
    ))
  );
}

function isTimelineMilestone(node: LayoutNode): boolean {
  return node.type === "View" && node.altText === "Agent timeline milestone";
}

function containsText(node: LayoutNode): boolean {
  return collectNodes(node.children ?? [], (child) => child.type === "Text").length > 0;
}

function assertRegisterContainment(rows: LayoutNode[]): void {
  const tolerance = 1.5;
  for (const row of rows) {
    const rowRight = row.layout.x + row.layout.width;
    const rowBottom = row.layout.y + row.layout.height;
    for (const child of collectNodes(row.children ?? [], () => true) as LayoutNode[]) {
      if (
        child.layout.x < row.layout.x - tolerance
        || child.layout.y < row.layout.y - tolerance
        || child.layout.x + child.layout.width > rowRight + tolerance
        || child.layout.y + child.layout.height > rowBottom + tolerance
      ) {
        throw new PaperError(
          "Agent register content exceeds its assigned row and may clip or overlap adjacent rows.",
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "layout",
            remediation: "Recompute register row height and text fit from the available content field.",
          },
        );
      }
    }
  }
}

function assertNoRepeatedEqualPanels(
  pattern: string | undefined,
  nodes: LayoutNode[],
  slideWidth: number,
  slideHeight: number,
): void {
  if (pattern !== "dashboard" && pattern !== "comparison" && pattern !== "bullets") return;
  const panels = nodes.filter((node) => (
    node.type === "View"
    && containsText(node)
    && (node.style?.fill !== undefined
      || node.style?.backgroundColor !== undefined
      || node.style?.borderWidth !== undefined)
    && node.layout.width * node.layout.height >= slideWidth * slideHeight * 0.06
  ));
  const groups = new Map<string, number>();
  for (const panel of panels) {
    const key = `${Math.round(panel.layout.width / 4)}:${Math.round(panel.layout.height / 4)}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  if ([...groups.values()].some((count) => count >= 4)) {
    throw new PaperError(
      `Agent ${pattern} recipe repeats four or more equal-weight decorated panels.`,
      {
        code: "AGENT_LAYOUT_VALIDATION_FAILED",
        phase: "layout",
        remediation: "Promote one source-supported protagonist and use a flat supporting register instead of a card grid.",
      },
    );
  }
}

function assertChartFieldUtilization(
  pattern: string | undefined,
  nodes: LayoutNode[],
  slideWidth: number,
  slideHeight: number,
): void {
  if (pattern !== "chart-focus" && pattern !== "dashboard") return;
  const charts = nodes.filter((node) => node.type === "Chart");
  for (const chart of charts) {
    const supportingRegister = nodes.some((node) => (
      node.type === "View"
      && node.layout.y >= chart.layout.y - 1
      && node.layout.height >= chart.layout.height * 0.8
      && containsText(node)
    ));
    const minimumWidthRatio = supportingRegister ? 0.58 : 0.8;
    if (
      chart.layout.width < slideWidth * minimumWidthRatio
      || chart.layout.height < slideHeight * 0.65
      || bottomEdge(chart) < slideHeight * 0.82
    ) {
      throw new PaperError(
        `Agent ${pattern} chart occupies a timid visual field (${Math.round(chart.layout.width)}×${Math.round(chart.layout.height)}px).`,
        {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "layout",
          remediation: "Expand the chart through the usable content width and lower canvas; reserve a rail only for source KPIs.",
        },
      );
    }
  }
}

function assertOwnedComparisonFields(pattern: string | undefined, nodes: LayoutNode[], slideWidth: number): void {
  if (pattern !== "comparison") return;
  const fields = nodes.filter((node) => (
    node.type === "View" && node.altText?.startsWith("Agent comparison owned field:")
  ));
  if (fields.length === 0) return;
  if (
    fields.length !== 2
    || fields.some((field) => field.layout.width < slideWidth * 0.38)
    || Math.abs(fields[0].layout.height - fields[1].layout.height) > 1
  ) {
    throw new PaperError("Agent relational comparison does not maintain two full owned fields.", {
      code: "AGENT_LAYOUT_VALIDATION_FAILED",
      phase: "layout",
      remediation: "Give both source-owned comparison sides a substantial, aligned field.",
    });
  }
}

function assertSharedRegisterGrid(pattern: string | undefined, rows: LayoutNode[]): void {
  if (pattern !== "bullets" || rows.length < 5) return;
  const columns = new Map<number, LayoutNode[]>();
  for (const row of rows) {
    const key = Math.round(row.layout.x);
    const column = columns.get(key) ?? [];
    column.push(row);
    columns.set(key, column);
  }
  if (columns.size < 2) return;
  const orderedColumns = [...columns.values()].map((column) => (
    column.sort((left, right) => left.layout.y - right.layout.y)
  ));
  const [first, ...rest] = orderedColumns;
  for (const column of rest) {
    const sharedCount = Math.min(first.length, column.length);
    for (let index = 0; index < sharedCount; index += 1) {
      if (
        Math.abs(first[index].layout.y - column[index].layout.y) > 1
        || Math.abs(first[index].layout.height - column[index].layout.height) > 1
      ) {
        throw new PaperError("Agent bullet columns do not share one measured row grid.", {
          code: "AGENT_LAYOUT_VALIDATION_FAILED",
          phase: "layout",
          remediation: "Plan row demand across both columns and reuse the same row boundaries.",
        });
      }
    }
  }
}

function assertIntentionalWhitespaceAnchor(
  pattern: string | undefined,
  nodes: LayoutNode[],
  slideWidth: number,
  slideHeight: number,
): void {
  if (pattern !== "title" && pattern !== "statement") return;
  const expectedAltText = pattern === "title"
    ? "Agent title editorial field"
    : ["Agent statement evidence field", "Agent statement full-height anchor"];
  const anchors = nodes.filter((node) => node.type === "View" && (
    Array.isArray(expectedAltText)
      ? expectedAltText.includes(node.altText ?? "")
      : node.altText === expectedAltText
  ));
  if (anchors.some((node) => (
    node.layout.width >= slideWidth * 0.12
    && node.layout.height >= slideHeight * 0.65
    && bottomEdge(node) >= slideHeight * 0.82
  ))) return;
  throw new PaperError(`Agent ${pattern} whitespace lacks a deliberate full-height anchor.`, {
    code: "AGENT_LAYOUT_VALIDATION_FAILED",
    phase: "layout",
    remediation: "Anchor intentional whitespace with a substantial source-appropriate field.",
  });
}

export function assertAgentRecipeLayoutUtilization(
  slide: LayoutNode,
  slideHeight: number,
): void {
  const pattern = slide.type === "Slide" ? slide.agentPattern : undefined;
  const nodes = collectNodes(slide.children ?? [], () => true) as LayoutNode[];
  const slideWidth = slide.layout.width;
  assertNoRepeatedEqualPanels(pattern, nodes, slideWidth, slideHeight);
  assertChartFieldUtilization(pattern, nodes, slideWidth, slideHeight);
  assertOwnedComparisonFields(pattern, nodes, slideWidth);

  const registerRows = nodes.filter(isRegisterRow);
  const timelineMilestones = nodes.filter(isTimelineMilestone);
  assertSharedRegisterGrid(pattern, registerRows);
  assertIntentionalWhitespaceAnchor(pattern, nodes, slideWidth, slideHeight);

  if (pattern === "bullets" || pattern === "dashboard") {
    const contentNodes = pattern === "bullets"
      ? [...registerRows, ...timelineMilestones, ...nodes.filter((node) => (
          node.type === "View" && node.altText === "Agent timeline support rail"
        ))]
      : nodes.filter((node) => node.type === "Chart" || (
        node.type === "View"
        && (node.style?.fill !== undefined
          || node.style?.backgroundColor !== undefined
          || node.style?.borderWidth !== undefined)
      ));

    if (contentNodes.length > 0) {
      const usedBottom = Math.max(...contentNodes.map(bottomEdge));
      // Keep the thresholds recipe-specific so the gate rejects clustering
      // without forcing unrelated layouts into one geometry.
      const minimumBottom = slideHeight * (pattern === "dashboard" ? 0.65 : 0.72);
      if (usedBottom + 0.5 < minimumBottom) {
        throw new PaperError(
          `Agent ${pattern} recipe clusters content in the top band (${Math.round(usedBottom)}px of ${Math.round(slideHeight)}px used).`,
          {
            code: "AGENT_LAYOUT_VALIDATION_FAILED",
            phase: "layout",
            remediation: "Expand or distribute the recipe content through the lower canvas.",
          },
        );
      }
    }
  }
  assertRegisterContainment([...registerRows, ...timelineMilestones]);
}
