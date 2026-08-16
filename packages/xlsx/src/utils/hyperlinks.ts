import type { SpreadsheetHyperlink } from "../types/spreadsheet-ast.js";
import { parseRangeRef } from "./cell-ref.js";
import { quoteSheetName } from "../worksheet/structure.js";

export type NormalizedHyperlink =
  | {
    mode: "external";
    target: string;
    display?: string;
    tooltip?: string;
  }
  | {
    mode: "internal";
    location: string;
    display?: string;
    tooltip?: string;
  };

function unquoteSheetName(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }

  return value;
}

function splitHyperlinkLocation(value: string): { sheetName?: string; ref: string } {
  const normalized = value.startsWith("#") ? value.slice(1) : value;
  const separatorIndex = normalized.lastIndexOf("!");
  if (separatorIndex === -1) {
    return { ref: normalized };
  }

  return {
    sheetName: unquoteSheetName(normalized.slice(0, separatorIndex)),
    ref: normalized.slice(separatorIndex + 1),
  };
}

function isCellOrRangeRef(value: string): boolean {
  try {
    parseRangeRef(value);
    return true;
  } catch {
    return false;
  }
}

function isInternalLocation(value: string): boolean {
  const { ref } = splitHyperlinkLocation(value.trim());
  return isCellOrRangeRef(ref);
}

export function normalizeHyperlinkLocation(value: string): string {
  const { sheetName, ref } = splitHyperlinkLocation(value.trim());
  if (!sheetName) {
    return ref;
  }

  return `${quoteSheetName(sheetName)}!${ref}`;
}

export function getExplicitHyperlinkSheetName(value: string): string | undefined {
  return splitHyperlinkLocation(value.trim()).sheetName;
}

export function normalizeHyperlink(hyperlink: SpreadsheetHyperlink): NormalizedHyperlink {
  if (typeof hyperlink === "string") {
    const normalized = hyperlink.trim();
    if (isInternalLocation(normalized)) {
      return {
        mode: "internal",
        location: normalizeHyperlinkLocation(normalized),
      };
    }

    return {
      mode: "external",
      target: normalized,
    };
  }

  if ("location" in hyperlink) {
    return {
      mode: "internal",
      location: normalizeHyperlinkLocation(hyperlink.location),
      display: hyperlink.display,
      tooltip: hyperlink.tooltip,
    };
  }

  return {
    mode: "external",
    target: hyperlink.target,
    display: hyperlink.display,
    tooltip: hyperlink.tooltip,
  };
}
