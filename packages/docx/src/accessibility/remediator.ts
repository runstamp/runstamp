import type {
  AccessibilityConfigBase,
  AccessibilityFix,
  AccessibilityRemediationResult as CanonicalAccessibilityRemediationResult,
} from "./protocol.js";
import type {
  StructuredDocument,
  StructuredElement,
  HeadingElement,
  ImageElement,
  TableElement,
  ContainerElement,
} from "../types.js";
import type { AccessibilityReport } from "./types.js";
import { validateAccessibility } from "./validator.js";

export interface AccessibilityRemediationResult extends CanonicalAccessibilityRemediationResult {
  document: StructuredDocument;
  reportBefore: AccessibilityReport;
  reportAfter: AccessibilityReport;
}

function walkElements(
  elements: StructuredElement[],
  callback: (element: StructuredElement, path: string) => void,
  parentPath: string,
): void {
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    const path = `${parentPath}.elements[${index}]`;
    callback(element, path);
    if (element.type === "container") {
      walkElements((element as ContainerElement).children, callback, path);
    }
  }
}

function addFix(
  fixesApplied: AccessibilityFix[],
  code: AccessibilityFix["code"],
  action: string,
  target: string | undefined,
): void {
  fixesApplied.push({ code, action, applied: true, target });
}

export function remediateAccessibility(
  doc: StructuredDocument,
  config?: AccessibilityConfigBase,
): AccessibilityRemediationResult {
  const reportBefore = validateAccessibility(doc);
  const document = structuredClone(doc);
  const fixesApplied: AccessibilityFix[] = [];

  if (!document.metadata.title && config?.title) {
    document.metadata.title = config.title;
    addFix(fixesApplied, "document.title_missing", "Propagated accessible.title into document metadata.", "metadata.title");
  }

  if (!document.metadata.language && config?.language) {
    document.metadata.language = config.language;
    addFix(fixesApplied, "document.language_missing", "Propagated accessible.language into document metadata.", "metadata.language");
  }

  let previousHeadingLevel: number | undefined;
  for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex++) {
    const page = document.pages[pageIndex];
    walkElements(page.elements, (element, path) => {
      if (element.type === "heading") {
        const heading = element as HeadingElement;
        if (
          previousHeadingLevel !== undefined
          && heading.level > previousHeadingLevel + 1
        ) {
          heading.level = (previousHeadingLevel + 1) as HeadingElement["level"];
          addFix(
            fixesApplied,
            "structure.heading_skipped",
            "Collapsed a skipped heading level by one step.",
            path,
          );
        }
        previousHeadingLevel = heading.level;
      }

      if (element.type === "image") {
        const image = element as ImageElement;
        if (image.decorative !== true && (!image.alt || image.alt.trim().length === 0)) {
          image.alt = "Image";
          addFix(fixesApplied, "image.alt_missing", "Applied placeholder alt text to an image.", path);
        }
      }

      if (element.type === "table") {
        const table = element as TableElement;
        if (!table.headerRowCount && table.rows.length > 0) {
          table.headerRowCount = 1;
          table.rows[0].isHeader = true;
          for (const cell of table.rows[0].cells) {
            cell.isHeader = true;
          }
          addFix(
            fixesApplied,
            "table.header_missing",
            "Enabled header metadata on the first table row.",
            path,
          );
        }
      }
    }, `pages[${pageIndex}]`);
  }

  const reportAfter = validateAccessibility(document);
  return {
    document,
    reportBefore,
    reportAfter,
    fixesApplied,
  };
}
