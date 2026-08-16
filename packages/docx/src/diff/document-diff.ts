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
import { docxToStructured } from "../adapters/docx-to-structured.js";
import { DocxDocumentSchema, type DocxDocument } from "../schema.js";
import type {
  ContainerElement,
  HeaderFooterContent,
  StructuredElement,
  TableElement,
  TableRow,
} from "../types.js";

type DiffableRecord = Record<string, unknown>;

interface DiffDocxDocument {
  metadata?: DocxDocument["metadata"];
  pageSize?: DocxDocument["pageSize"];
  orientation?: DocxDocument["orientation"];
  margins?: DocxDocument["margins"];
  theme?: DocxDocument["theme"];
  template?: DocxDocument["template"];
  tableOfContents?: DocxDocument["tableOfContents"];
  header?: DocxDocument["header"];
  footer?: DocxDocument["footer"];
  firstPageHeader?: DocxDocument["firstPageHeader"];
  firstPageFooter?: DocxDocument["firstPageFooter"];
  differentFirstPage?: DocxDocument["differentFirstPage"];
  watermark?: DocxDocument["watermark"];
  options?: DocxDocument["options"];
  pages: Array<{
    pageNumber: number;
    sectionBreak?: string;
    header?: { elements: unknown[] };
    footer?: { elements: unknown[] };
    elements: unknown[];
  }>;
}

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

function findNearestElement(
  context: DiffInterpretContext<DiffDocxDocument>,
): { element: DiffableRecord; path: DiffPathSegment[] } | undefined {
  for (let index = context.path.length; index > 0; index -= 1) {
    const candidatePath = context.path.slice(0, index);
    const afterElement = asRecord(getValueAtPath(context.normalizedAfter, candidatePath));
    if (afterElement && typeof afterElement.type === "string") {
      return { element: afterElement, path: candidatePath };
    }

    const beforeElement = asRecord(getValueAtPath(context.normalizedBefore, candidatePath));
    if (beforeElement && typeof beforeElement.type === "string") {
      return { element: beforeElement, path: candidatePath };
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

function simplifyHeaderFooter(content: HeaderFooterContent | undefined): { elements: unknown[] } | undefined {
  if (!content) {
    return undefined;
  }

  return {
    elements: content.elements.map(simplifyElement),
  };
}

function simplifyTableRows(rows: TableRow[]): unknown[] {
  return rows.map((row) => ({
    index: row.index,
    isHeader: row.isHeader,
    isFooter: row.isFooter,
    cells: row.cells.map((cell) => ({
      row: cell.row,
      col: cell.col,
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
      text: cell.text,
      content: cell.content,
      style: cell.style,
      isHeader: cell.isHeader,
    })),
  }));
}

function simplifyElement(element: StructuredElement): unknown {
  switch (element.type) {
    case "heading":
      return {
        type: element.type,
        level: element.level,
        text: element.text,
        runs: element.runs,
        style: element.style,
        docx: element.docx,
      };
    case "paragraph":
    case "text-run":
      return {
        type: element.type,
        text: element.text,
        runs: element.runs,
        style: element.style,
        docx: element.docx,
      };
    case "table": {
      const table = element as TableElement;
      return {
        type: table.type,
        columns: table.columns,
        rows: simplifyTableRows(table.rows),
        headerRowCount: table.headerRowCount,
        footerRowCount: table.footerRowCount,
        repeatHeaders: table.repeatHeaders,
        caption: table.caption,
        tableDescription: table.tableDescription,
        tableCaption: table.tableCaption,
        style: table.style,
        docx: table.docx,
      };
    }
    case "image":
      return {
        type: element.type,
        src: element.src,
        alt: element.alt,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
        decorative: element.decorative,
        style: element.style,
        docx: element.docx,
      };
    case "chart":
      return {
        type: element.type,
        chartType: element.chartType,
        title: element.title,
        series: element.series,
        categories: element.categories,
        legend: element.legend,
        axes: element.axes,
        style: element.style,
        docx: element.docx,
      };
    case "shape":
      return {
        type: element.type,
        shapeType: element.shapeType,
        text: element.text,
        runs: element.runs,
        fill: element.fill,
        stroke: element.stroke,
        style: element.style,
        docx: element.docx,
      };
    case "list":
      return {
        type: element.type,
        listType: element.listType,
        start: element.start,
        level: element.level,
        items: element.items,
        style: element.style,
        docx: element.docx,
      };
    case "container": {
      const container = element as ContainerElement;
      return {
        type: container.type,
        style: container.style,
        docx: container.docx,
        children: container.children.map(simplifyElement),
      };
    }
    default:
      return {
        type: (element as StructuredElement & { type: string }).type,
      };
  }
}

function annotateElement(element: DiffableRecord): void {
  if (element.type === "heading") {
    const docx = asRecord(element.docx);
    if (typeof docx?.bookmarkId === "string") {
      element.__diffKey = createDiffKey("heading", docx.bookmarkId);
    }
  }

  if (element.type === "container" && Array.isArray(element.children)) {
    element.children.forEach((child) => {
      const childRecord = asRecord(child);
      if (childRecord) {
        annotateElement(childRecord);
      }
    });
  }
}

function normalizeDocxDocument(document: unknown): DiffDocxDocument {
  const parsed = DocxDocumentSchema.parse(document);
  const structured = docxToStructured(parsed);

  const normalized: DiffDocxDocument = {
    metadata: parsed.metadata,
    pageSize: parsed.pageSize,
    orientation: parsed.orientation,
    margins: parsed.margins,
    theme: parsed.theme,
    template: parsed.template,
    tableOfContents: parsed.tableOfContents,
    header: parsed.header,
    footer: parsed.footer,
    firstPageHeader: parsed.firstPageHeader,
    firstPageFooter: parsed.firstPageFooter,
    differentFirstPage: parsed.differentFirstPage,
    watermark: parsed.watermark,
    options: parsed.options,
    pages: structured.pages.map((page, index) => ({
      pageNumber: page.pageNumber,
      sectionBreak: page.sectionBreak?.type,
      header: simplifyHeaderFooter(parsed.pages[index]?.header ? page.header : undefined),
      footer: simplifyHeaderFooter(parsed.pages[index]?.footer ? page.footer : undefined),
      elements: page.elements.map(simplifyElement),
    })),
  };

  normalized.pages.forEach((page) => {
    page.header?.elements.forEach((element) => {
      const record = asRecord(element);
      if (record) {
        annotateElement(record);
      }
    });
    page.footer?.elements.forEach((element) => {
      const record = asRecord(element);
      if (record) {
        annotateElement(record);
      }
    });
    page.elements.forEach((element) => {
      const record = asRecord(element);
      if (record) {
        annotateElement(record);
      }
    });
  });

  return normalized;
}

function elementNoun(element: DiffableRecord): string {
  switch (element.type) {
    case "heading":
      return "heading";
    case "paragraph":
      return "paragraph";
    case "table":
      return "table";
    case "image":
      return "image";
    case "chart":
      return "chart";
    case "shape":
      return "shape";
    case "list":
      return "list";
    case "container":
      return "container";
    default:
      return "content";
  }
}

function capitalize(value: string): string {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
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

function interpretTopLevel(context: DiffInterpretContext<DiffDocxDocument>): DiffInterpretResult | undefined {
  if (context.path[0] === "pages" && typeof context.path[1] === "number" && context.path.length === 2) {
    const pageNumber = (context.path[1] as number) + 1;
    return {
      description: `Page ${pageNumber} ${verbPhrase(context.type)}`,
      severity: "major",
      summaryLabel: `page ${context.type === "modified" ? "modified" : context.type}`,
    };
  }

  if (context.path[0] === "tableOfContents") {
    return {
      description: "Table of contents changed",
      severity: "minor",
      summaryLabel: "table of contents modified",
    };
  }

  if (context.path[0] === "watermark") {
    return {
      description: "Watermark changed",
      severity: "cosmetic",
      summaryLabel: "watermark modified",
    };
  }

  if (context.path[0] === "header" || context.path[0] === "footer" || context.path[0] === "firstPageHeader" || context.path[0] === "firstPageFooter") {
    return {
      description: `${String(context.path[0])} changed`,
      severity: "minor",
      summaryLabel: "header/footer modified",
    };
  }

  if (context.path[0] === "theme" || context.path[0] === "template") {
    return {
      description: `${String(context.path[0])} changed`,
      severity: "cosmetic",
      summaryLabel: "document styling modified",
    };
  }

  return undefined;
}

function interpretDocxChange(context: DiffInterpretContext<DiffDocxDocument>): DiffInterpretResult {
  const topLevel = interpretTopLevel(context);
  if (topLevel) {
    return topLevel;
  }

  const pageIndex = firstNumericAfter(context.path, "pages");
  const pageLabel = pageIndex === undefined ? "document" : `page ${pageIndex + 1}`;

  if (pageIndex !== undefined && (pathIncludes(context.path, "header") || pathIncludes(context.path, "footer"))) {
    return {
      description: `Header or footer changed on ${pageLabel}`,
      severity: "minor",
      summaryLabel: "header/footer modified",
    };
  }

  if (pageIndex !== undefined && pathIncludes(context.path, "rows")) {
    const rowIndex = firstNumericAfter(context.path, "rows");
    const cellIndex = firstNumericAfter(context.path, "cells");
    if (rowIndex !== undefined && cellIndex !== undefined) {
      return {
        description: `Table cell changed on ${pageLabel}`,
        severity: "minor",
        summaryLabel: "table cell modified",
      };
    }
    if (rowIndex !== undefined) {
      return {
        description: `Table row ${rowIndex + 1} ${verbPhrase(context.type)} on ${pageLabel}`,
        severity: context.type === "modified" ? "minor" : "major",
        summaryLabel: `table row ${context.type === "modified" ? "modified" : context.type}`,
      };
    }
  }

  const nearestElement = findNearestElement(context);
  if (pageIndex !== undefined && nearestElement) {
    const noun = elementNoun(nearestElement.element);
    if (nearestElement.path.length === context.path.length && context.type !== "modified") {
      return {
        description: `${capitalize(noun)} ${verbPhrase(context.type)} on ${pageLabel}`,
        severity: "major",
        summaryLabel: `${noun} ${context.type}`,
      };
    }

    if ((noun === "heading" || noun === "paragraph") && (pathIncludes(context.path, "text") || pathIncludes(context.path, "runs"))) {
      return {
        description: `${capitalize(noun)} text changed on ${pageLabel}`,
        severity: "minor",
        summaryLabel: `${noun} text modified`,
      };
    }

    if (pathIncludes(context.path, "keepLines") || pathIncludes(context.path, "keepNext") || pathIncludes(context.path, "pageBreakBefore")) {
      return {
        description: `Pagination hint changed on ${pageLabel}`,
        severity: "cosmetic",
        summaryLabel: "pagination hint modified",
      };
    }

    return {
      description: `${capitalize(noun)} changed on ${pageLabel}`,
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

function shouldSuppressDocxChange(context: DiffInterpretContext<DiffDocxDocument>): boolean {
  if (!pathIncludes(context.path, "runs")) {
    return false;
  }

  const nearestElement = findNearestElement(context);
  if (!nearestElement) {
    return false;
  }

  const beforeElement = asRecord(getValueAtPath(context.normalizedBefore, nearestElement.path));
  const afterElement = asRecord(getValueAtPath(context.normalizedAfter, nearestElement.path));
  return typeof beforeElement?.text === "string" || typeof afterElement?.text === "string";
}

const docxDiffPlugin: DiffPlugin<DiffDocxDocument> = {
  normalize: normalizeDocxDocument,
  interpretChange: interpretDocxChange,
  shouldSuppress: shouldSuppressDocxChange,
};

export function diffDocxDocuments(
  before: DocxDocument,
  after: DocxDocument,
  options?: DiffOptions,
): ChangeSet {
  return diffSchemaDocuments(before, after, docxDiffPlugin, options);
}

export type {
  Change,
  ChangeSet,
  DiffOptions,
} from "@runstamp/document-diff";
