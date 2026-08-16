import {
  createDiffKey,
  diffDocuments as diffSchemaDocuments,
  type Change,
  type ChangeSet,
  type DiffInterpretContext,
  type DiffInterpretResult,
  type DiffOptions,
  type DiffPathSegment,
  type DiffPlugin,
} from "@runstamp/document-diff";
import type { PaperDocument, PaperNode } from "../types/ast.js";
import { PaperDocumentSchema } from "../validator/schema.js";

type DiffableRecord = Record<string, unknown>;

function asRecord(value: unknown): DiffableRecord | undefined {
  return value && typeof value === "object" ? value as DiffableRecord : undefined;
}

function getValueAtPath(value: unknown, path: DiffPathSegment[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
      continue;
    }
    current = (current as DiffableRecord)[segment];
  }
  return current;
}

function findNearestNode(
  context: DiffInterpretContext<PaperDocument>,
): { node: DiffableRecord; path: DiffPathSegment[] } | undefined {
  for (let index = context.path.length; index > 0; index -= 1) {
    const candidatePath = context.path.slice(0, index);
    const afterNode = asRecord(getValueAtPath(context.normalizedAfter, candidatePath));
    if (afterNode && typeof afterNode.type === "string") {
      return { node: afterNode, path: candidatePath };
    }

    const beforeNode = asRecord(getValueAtPath(context.normalizedBefore, candidatePath));
    if (beforeNode && typeof beforeNode.type === "string") {
      return { node: beforeNode, path: candidatePath };
    }
  }

  return undefined;
}

function firstNumericAfter(path: DiffPathSegment[], segmentName: string): number | undefined {
  const segmentIndex = path.indexOf(segmentName);
  if (segmentIndex === -1) {
    return undefined;
  }
  const candidate = path[segmentIndex + 1];
  return typeof candidate === "number" ? candidate : undefined;
}

function pathIncludes(path: DiffPathSegment[], segmentName: string): boolean {
  return path.includes(segmentName);
}

function capitalize(value: string): string {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function isTextLikeNode(node: DiffableRecord): boolean {
  if (node.type === "Text") {
    return true;
  }
  if (node.type !== "View") {
    return false;
  }
  return typeof node.textContent === "string"
    || Array.isArray(node.textContent)
    || Array.isArray(node.textParagraphs);
}

function nodeNoun(node: DiffableRecord): string {
  if (isTextLikeNode(node)) {
    return "text";
  }
  switch (node.type) {
    case "Image":
      return "image";
    case "Table":
      return "table";
    case "Chart":
      return "chart";
    case "Group":
      return "group";
    case "Connector":
      return "connector";
    case "Video":
      return "video";
    case "Audio":
      return "audio";
    case "View":
      return "shape";
    default:
      return "content";
  }
}

function formatSlideLabel(slideIndex: number | undefined): string {
  return slideIndex === undefined ? "document" : `slide ${slideIndex + 1}`;
}

function verbPhrase(type: Change["type"]): string {
  switch (type) {
    case "added":
      return "added";
    case "removed":
      return "removed";
    case "moved":
      return "moved";
    default:
      return "changed";
  }
}

function annotateChartData(chartData: DiffableRecord | undefined): void {
  if (!chartData) {
    return;
  }

  if (Array.isArray(chartData.series)) {
    for (const entry of chartData.series) {
      const record = asRecord(entry);
      if (record && typeof record.name === "string") {
        record.__diffKey = createDiffKey("chart-series", record.name);
      }
    }
  }

  const visitCategories = (items: unknown[]): void => {
    for (const item of items) {
      const record = asRecord(item);
      if (!record || typeof record.name !== "string") {
        continue;
      }
      record.__diffKey = createDiffKey("chart-category", record.name);
      if (Array.isArray(record.children)) {
        visitCategories(record.children);
      }
    }
  };

  if (Array.isArray(chartData.categories)) {
    visitCategories(chartData.categories);
  }
}

function annotateNode(node: PaperNode): void {
  const record = node as unknown as DiffableRecord;
  const placeholder = asRecord(record.placeholder);
  const placeholderType = typeof placeholder?.type === "string" ? placeholder.type : undefined;
  const placeholderIndex = typeof placeholder?.idx === "number" ? placeholder.idx : undefined;
  const morphId = typeof record.morphId === "string" ? record.morphId : undefined;
  const diffKey = morphId
    ? createDiffKey(node.type, "morph", morphId)
    : createDiffKey(node.type, "placeholder", placeholderIndex ?? placeholderType);

  if (diffKey) {
    record.__diffKey = diffKey;
  }

  if (node.type === "View" && node.children) {
    node.children.forEach(annotateNode);
  }
  if (node.type === "Group") {
    node.children.forEach(annotateNode);
  }
  if (node.type === "Chart") {
    annotateChartData(node.chartData as unknown as DiffableRecord);
  }
}

function normalizePaperDocument(document: unknown): PaperDocument {
  const parsed = PaperDocumentSchema.parse(document) as unknown as PaperDocument;

  parsed.slides.forEach((slide) => {
    (slide.children as PaperNode[]).forEach(annotateNode);
    slide.comments?.forEach((comment, index) => {
      const record = comment as unknown as DiffableRecord;
      const author = typeof record.author === "string" ? record.author : undefined;
      record.__diffKey = createDiffKey("comment", author, index);
    });
  });

  parsed.masters?.forEach((master) => {
    (master as unknown as DiffableRecord).__diffKey = createDiffKey("master", master.name);
    master.layouts.forEach((layout) => {
      (layout as unknown as DiffableRecord).__diffKey = createDiffKey("layout", master.name, layout.name);
    });
  });
  parsed.sections?.forEach((section) => {
    (section as unknown as DiffableRecord).__diffKey = createDiffKey("section", section.name);
  });
  parsed.customShows?.forEach((show) => {
    (show as unknown as DiffableRecord).__diffKey = createDiffKey("custom-show", show.name);
  });
  parsed.customProperties?.forEach((property) => {
    (property as unknown as DiffableRecord).__diffKey = createDiffKey("custom-property", property.name);
  });
  parsed.embeddedFonts?.forEach((font) => {
    (font as unknown as DiffableRecord).__diffKey = createDiffKey("font", font.fontFamily, font.bold ? "bold" : "", font.italic ? "italic" : "");
  });

  return parsed;
}

function interpretTopLevel(context: DiffInterpretContext<PaperDocument>): DiffInterpretResult | undefined {
  if (context.path[0] === "slides" && typeof context.path[1] === "number" && context.path.length === 2) {
    const slideNumber = (context.path[1] as number) + 1;
    return {
      description: `Slide ${slideNumber} ${verbPhrase(context.type)}`,
      severity: "major",
      summaryLabel: `slide ${context.type === "modified" ? "modified" : context.type}`,
    };
  }

  if (context.path[0] === "template") {
    return {
      description: "Presentation template changed",
      severity: "major",
      summaryLabel: "template modified",
    };
  }

  if (context.path[0] === "masters") {
    return {
      description: "Slide master configuration changed",
      severity: "major",
      summaryLabel: "master modified",
    };
  }

  if (context.path[0] === "theme") {
    return {
      description: "Presentation theme changed",
      severity: "cosmetic",
      summaryLabel: "theme modified",
    };
  }

  if (context.path[0] === "slideSize" || context.path[0] === "notesSize") {
    return {
      description: `${String(context.path[0])} changed`,
      severity: "major",
      summaryLabel: "layout modified",
    };
  }

  return undefined;
}

function interpretPaperChange(context: DiffInterpretContext<PaperDocument>): DiffInterpretResult {
  const topLevel = interpretTopLevel(context);
  if (topLevel) {
    return topLevel;
  }

  const slideIndex = firstNumericAfter(context.path, "slides");
  const slideLabel = formatSlideLabel(slideIndex);

  if (slideIndex !== undefined && pathIncludes(context.path, "notes")) {
    return {
      description: `Speaker notes changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "notes modified",
    };
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "comments")) {
    return {
      description: `Comments changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "comment modified",
    };
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "layoutName")) {
    return {
      description: `Layout changed on ${slideLabel}`,
      severity: "major",
      summaryLabel: "layout modified",
    };
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "masterName")) {
    return {
      description: `Master changed on ${slideLabel}`,
      severity: "major",
      summaryLabel: "master modified",
    };
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "background")) {
    return {
      description: `Background changed on ${slideLabel}`,
      severity: "cosmetic",
      summaryLabel: "background modified",
    };
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "transition")) {
    return {
      description: `Transition changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "transition modified",
    };
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "tableData") && pathIncludes(context.path, "rows")) {
    const rowIndex = firstNumericAfter(context.path, "rows");
    const cellIndex = firstNumericAfter(context.path, "cells");
    if (rowIndex !== undefined && cellIndex !== undefined) {
      return {
        description: `Table cell changed on ${slideLabel}`,
        severity: "minor",
        summaryLabel: "table cell modified",
      };
    }

    if (rowIndex !== undefined) {
      return {
        description: `Table row ${rowIndex + 1} ${verbPhrase(context.type)} on ${slideLabel}`,
        severity: context.type === "modified" ? "minor" : "major",
        summaryLabel: `table row ${context.type === "modified" ? "modified" : context.type}`,
      };
    }
  }

  if (slideIndex !== undefined && pathIncludes(context.path, "chartData")) {
    return {
      description: `Chart data changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "chart modified",
    };
  }

  const nearestNode = findNearestNode(context);
  if (slideIndex !== undefined && nearestNode) {
    const noun = nodeNoun(nearestNode.node);
    if (nearestNode.path.length === context.path.length && context.type !== "modified") {
      return {
        description: `${capitalize(noun)} ${verbPhrase(context.type)} on ${slideLabel}`,
        severity: "major",
        summaryLabel: `${noun} ${context.type}`,
      };
    }

    if (noun === "text") {
      return {
        description: `Text changed on ${slideLabel}`,
        severity: "minor",
        summaryLabel: "text modified",
      };
    }

    return {
      description: `${capitalize(noun)} changed on ${slideLabel}`,
      severity: noun === "image" ? "major" : "minor",
      summaryLabel: `${noun} modified`,
    };
  }

  return {
    description: `${context.pathString} ${verbPhrase(context.type)}`,
    severity: context.type === "modified" ? "minor" : "major",
    summaryLabel: `document ${context.type === "modified" ? "modified" : context.type}`,
  };
}

const paperDiffPlugin: DiffPlugin<PaperDocument> = {
  normalize: normalizePaperDocument,
  interpretChange: interpretPaperChange,
};

export function diffDocuments(
  before: PaperDocument,
  after: PaperDocument,
  options?: DiffOptions,
): ChangeSet {
  return diffSchemaDocuments(before, after, paperDiffPlugin, options);
}

export type {
  Change,
  ChangeSet,
  DiffOptions,
} from "@runstamp/document-diff";
