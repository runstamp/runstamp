export interface RelaxedInputCoercion {
  code: string;
  path: string;
  description: string;
  legacyShape: string;
  modernShape: string;
}

export interface PdfInputWarning {
  code: string;
  message: string;
  path: string;
  from?: unknown;
  to?: unknown;
}

export interface PdfRelaxedInputOptions {
  onInputWarning?: (warning: PdfInputWarning) => void;
  relaxed?: boolean;
}

export const PDF_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[] = [
  {
    code: "PDF_RELAXED_TABLE_ROWS",
    path: "children[].rows",
    description: "Converts legacy flat table rows into the supported header/body/footer cell-child shape.",
    legacyShape: '{ "rows": [{ "isHeader": true, "cells": [{ "value": "Header" }] }] }',
    modernShape: '{ "header": [{ "cells": [{ "children": [{ "type": "paragraph", "value": "Header" }] }] }] }',
  },
  {
    code: "PDF_RELAXED_LIST_ITEMS",
    path: "children[].items",
    description: "Maps legacy list `listType` and item `value` fields to `ordered` and `text`.",
    legacyShape: '{ "type": "list", "listType": "bullet", "items": [{ "value": "One" }] }',
    modernShape: '{ "type": "list", "ordered": false, "items": [{ "text": "One" }] }',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneInput<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function pushWarning(
  warnings: PdfInputWarning[],
  options: PdfRelaxedInputOptions | undefined,
  warning: PdfInputWarning,
): void {
  warnings.push(warning);
  options?.onInputWarning?.(warning);
}

function wrapLegacyCellValue(value: unknown): { children: Array<{ type: "paragraph"; value: string }> } {
  return {
    children: [
      {
        type: "paragraph",
        value: typeof value === "string" ? value : String(value ?? ""),
      },
    ],
  };
}

function normalizeLegacyTable(
  node: Record<string, unknown>,
  path: string,
  warnings: PdfInputWarning[],
  options: PdfRelaxedInputOptions | undefined,
): void {
  if (!Array.isArray(node.rows)) {
    return;
  }

  const header: unknown[] = [];
  const body: unknown[] = [];
  const footer: unknown[] = Array.isArray(node.footer) ? node.footer : [];

  for (const [rowIndex, row] of node.rows.entries()) {
    if (!isRecord(row) || !Array.isArray(row.cells)) {
      continue;
    }
    const normalizedRow = {
      cells: row.cells.map((cell) => {
        if (!isRecord(cell)) {
          return wrapLegacyCellValue(cell);
        }
        if (Array.isArray(cell.children)) {
          return cell;
        }
        if ("value" in cell) {
          // Drop the legacy `value` key so the strict schema (which rejects
          // unknown keys) accepts the cell after normalization.
          const { value: legacyValue, ...rest } = cell;
          return {
            ...rest,
            children: wrapLegacyCellValue(legacyValue).children,
          };
        }
        return cell;
      }),
    };

    if (row.isHeader === true) {
      header.push(normalizedRow);
    } else if (row.isFooter === true) {
      footer.push(normalizedRow);
    } else {
      body.push(normalizedRow);
    }

    pushWarning(warnings, options, {
      code: "PDF_RELAXED_TABLE_ROWS",
      message: "Converted legacy flat table row into header/body/footer cell children.",
      path: `${path}.rows[${rowIndex}]`,
    });
  }

  node.header = header;
  node.body = body;
  node.footer = footer.length > 0 ? footer : undefined;
  delete node.rows;
}

function normalizeLegacyList(
  node: Record<string, unknown>,
  path: string,
  warnings: PdfInputWarning[],
  options: PdfRelaxedInputOptions | undefined,
): void {
  if (typeof node.listType === "string" && typeof node.ordered !== "boolean") {
    const ordered = node.listType !== "bullet";
    pushWarning(warnings, options, {
      code: "PDF_RELAXED_LIST_ITEMS",
      message: "Mapped legacy listType to ordered.",
      path: `${path}.listType`,
      from: node.listType,
      to: ordered,
    });
    node.ordered = ordered;
    delete node.listType;
  }

  if (!Array.isArray(node.items)) {
    return;
  }

  node.items = node.items.map((item, index) => {
    if (!isRecord(item) || "text" in item || !("value" in item)) {
      return item;
    }
    const text = typeof item.value === "string" ? item.value : String(item.value ?? "");
    pushWarning(warnings, options, {
      code: "PDF_RELAXED_LIST_ITEMS",
      message: "Mapped legacy list item value to text.",
      path: `${path}.items[${index}].value`,
      from: item.value,
      to: text,
    });
    const { value: _legacyValue, ...rest } = item;
    void _legacyValue;
    return { ...rest, text };
  });
}

function normalizeNodes(
  nodes: unknown,
  path: string,
  warnings: PdfInputWarning[],
  options: PdfRelaxedInputOptions | undefined,
): void {
  if (!Array.isArray(nodes)) {
    return;
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!isRecord(node)) {
      continue;
    }
    const nodePath = `${path}[${index}]`;

    if (node.type === "table") {
      normalizeLegacyTable(node, nodePath, warnings, options);
      const rowGroups = [node.header, node.body, node.footer];
      for (const rows of rowGroups) {
        if (!Array.isArray(rows)) {
          continue;
        }
        for (const [rowIndex, row] of rows.entries()) {
          if (!isRecord(row) || !Array.isArray(row.cells)) {
            continue;
          }
          for (const [cellIndex, cell] of row.cells.entries()) {
            if (isRecord(cell) && Array.isArray(cell.children)) {
              normalizeNodes(cell.children, `${nodePath}.rows[${rowIndex}].cells[${cellIndex}].children`, warnings, options);
            }
          }
        }
      }
      continue;
    }

    if (node.type === "list") {
      normalizeLegacyList(node, nodePath, warnings, options);
    }

    if (Array.isArray(node.children)) {
      normalizeNodes(node.children, `${nodePath}.children`, warnings, options);
    }
  }
}

export function preprocessPdfDocumentInput(
  input: unknown,
  options?: PdfRelaxedInputOptions,
): { value: unknown; warnings: PdfInputWarning[] } {
  // `relaxed` defaults to true: the README documents the relaxed shorthand
  // (`rows[]`, `{ value: "..." }` cells, list `value` fields) as the canonical
  // input, and `docs/0428-claude-test-based-directive2.md` §"@runstamp/pdf"
  // calls out that ceremony-free input must work. Callers can opt back into
  // strict-only validation with `{ relaxed: false }`.
  if (options?.relaxed === false || !isRecord(input)) {
    return { value: input, warnings: [] };
  }

  const warnings: PdfInputWarning[] = [];
  const document = cloneInput(input) as Record<string, unknown>;
  normalizeNodes(document.children, "children", warnings, options);
  normalizeNodes(document.content, "content", warnings, options);
  return { value: document, warnings };
}
