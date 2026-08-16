/**
 * Phase 6 widget appearance builders.
 *
 * Extracted from `pdf-renderer.ts` during M4 — this module owns
 * everything required to materialize PDF AcroForm widget appearance
 * streams (the `/AP /N` content), plus the "flattened" path that
 * inlines the same appearance into the page graphics for callers
 * that opt into `flattenForms`. The renderer still owns object
 * numbering (via `RenderContext`) and stitching widget objects into
 * the page tree; this module is pure command-stream construction.
 */

import { encodeWinAnsi, escapeWinAnsiBytes } from "../winansi-encoding.js";
import { formatPdfNumber, type PdfEmbeddedFontInput } from "../font-embedding.js";
import {
  buildColorOperators,
  buildRoundedRectPath,
  type PreparedPdfaState,
} from "../pdf-graphics-ops.js";
import {
  PDFArray,
  PDFDictionary,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFStream,
  PDFString,
} from "../pdf-objects.js";
import type { PdfColor, PdfStrokeStyle } from "../phase4-types.js";
import type {
  PdfCheckboxWidgetSpec,
  PdfDropdownWidgetSpec,
  PdfPageAnnotationSpec,
  PdfRadioWidgetSpec,
  PdfRenderedPage,
  PdfSignatureWidgetSpec,
  PdfTextEncodingWarning,
  PdfTextFieldWidgetSpec,
  PdfWidgetAnnotationSpec,
} from "../pdf-renderer.js";
import { DEFAULT_FONT } from "../phase-helpers.js";

const DEFAULT_FORM_TEXT_COLOR: PdfColor = { b: 0, g: 0, r: 0, space: "rgb" };

export function parseFormColor(value: string | undefined): PdfColor | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return {
      b: Number.parseInt(hex.slice(4, 6), 16) / 255,
      g: Number.parseInt(hex.slice(2, 4), 16) / 255,
      r: Number.parseInt(hex.slice(0, 2), 16) / 255,
      space: "rgb",
    };
  }
  if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
    return {
      b: Number.parseInt(hex.slice(2, 3).repeat(2), 16) / 255,
      g: Number.parseInt(hex.slice(1, 2).repeat(2), 16) / 255,
      r: Number.parseInt(hex.slice(0, 1).repeat(2), 16) / 255,
      space: "rgb",
    };
  }

  throw new TypeError(`Unsupported fontColor value "${value}"`);
}

/**
 * Widget appearance text goes through the same WinAnsi encoder as page text, so
 * it has the same failure mode: an unmappable character becomes `?`. Page text
 * has reported that since the encoder gained `onUnmappable`; widget text did
 * not, which made form values a silent-loss site (OC-1 R16). The sink is
 * optional only so the pure-construction tests can call this without plumbing.
 */
export function buildWidgetAppearanceStream(
  widget: PdfWidgetAnnotationSpec,
  fontRef: PDFRef,
  pdfa: PreparedPdfaState | undefined,
  onTextEncodingWarning?: (warning: PdfTextEncodingWarning) => void,
  pageIndex = 0,
): PDFStream {
  const width = Math.max(1, widget.rect[2] - widget.rect[0]);
  const height = Math.max(1, widget.rect[3] - widget.rect[1]);
  const commands: string[] = ["q"];
  const widgetColor = parseFormColor((widget as { fontColor?: string }).fontColor) ?? DEFAULT_FORM_TEXT_COLOR;

  if (widget.kind === "form-checkbox") {
    commands.push(...buildColorOperators({ b: 1, g: 1, r: 1, space: "rgb" }, "fill", pdfa));
    commands.push(`0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`);
    commands.push("f");
    commands.push(...buildColorOperators(widgetColor, "stroke", pdfa));
    commands.push("1 w");
    commands.push(`0.5 0.5 ${formatPdfNumber(Math.max(0.5, width - 1))} ${formatPdfNumber(Math.max(0.5, height - 1))} re`);
    commands.push("S");
    if (widget.checked) {
      commands.push(`${formatPdfNumber(width * 0.2)} ${formatPdfNumber(height * 0.5)} m`);
      commands.push(`${formatPdfNumber(width * 0.42)} ${formatPdfNumber(height * 0.22)} l`);
      commands.push(`${formatPdfNumber(width * 0.8)} ${formatPdfNumber(height * 0.8)} l`);
      commands.push("S");
    }
  } else if (widget.kind === "form-radio") {
    const outer = Math.max(0.5, Math.min(width, height) / 2);
    commands.push(...buildColorOperators({ b: 1, g: 1, r: 1, space: "rgb" }, "fill", pdfa));
    commands.push(`0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`);
    commands.push("f");
    commands.push(...buildColorOperators(widgetColor, "stroke", pdfa));
    commands.push("1 w");
    commands.push(buildRoundedRectPath(0.5, 0.5, Math.max(0.5, width - 1), Math.max(0.5, height - 1), outer));
    commands.push("S");
    if (widget.checked) {
      const dotSize = Math.max(2, Math.min(width, height) * 0.48);
      const dotX = (width - dotSize) / 2;
      const dotY = (height - dotSize) / 2;
      commands.push(...buildColorOperators(widgetColor, "fill", pdfa));
      commands.push(buildRoundedRectPath(dotX, dotY, dotSize, dotSize, dotSize / 2));
      commands.push("f");
    }
  } else {
    const backgroundColor: PdfColor = widget.kind === "form-signature"
      ? { b: 0.98, g: 0.97, r: 0.94, space: "rgb" }
      : { b: 0.95, g: 0.95, r: 0.95, space: "rgb" };
    commands.push(...buildColorOperators(backgroundColor, "fill", pdfa));
    commands.push(`0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`);
    commands.push("f");
    commands.push(...buildColorOperators({ b: 0, g: 0, r: 0, space: "rgb" }, "stroke", pdfa));
    commands.push("1 w");
    commands.push(widget.kind === "form-signature"
      ? buildRoundedRectPath(0.5, 0.5, Math.max(0.5, width - 1), Math.max(0.5, height - 1), 4)
      : `0.5 0.5 ${formatPdfNumber(Math.max(0.5, width - 1))} ${formatPdfNumber(Math.max(0.5, height - 1))} re`);
    commands.push("S");

    let textValue = "";
    let fontSize = 12;
    if (widget.kind === "form-text" && widget.value) {
      textValue = widget.value;
      fontSize = widget.fontSize ?? 12;
    } else if (widget.kind === "form-dropdown" && widget.value) {
      textValue = widget.value;
    } else if (widget.kind === "form-signature") {
      textValue = widget.value ?? widget.label ?? (widget.mode === "digital" ? "Digitally sign here" : "Signature");
      fontSize = widget.fontSize ?? 10;
    }

    if (textValue.length > 0) {
      commands.push(...buildColorOperators(widgetColor, "fill", pdfa));
      commands.push("BT");
      commands.push(`/F1 ${formatPdfNumber(fontSize)} Tf`);
      commands.push(`2 ${formatPdfNumber(Math.max(2, (height / 2) - (fontSize * 0.35)))} Td`);
      const encoded = onTextEncodingWarning
        ? encodeWinAnsi(textValue, (unmappable) => {
            onTextEncodingWarning({
              char: unmappable.char,
              codePoint: unmappable.codePoint,
              suggestion: unmappable.suggestion,
              textPreview: textValue.slice(0, 80),
              pageIndex,
              // Signature widgets are unnamed; the field name identifies the rest.
              elementId: (widget as { name?: string }).name ?? widget.kind,
            });
          })
        : encodeWinAnsi(textValue);
      commands.push(`${escapeWinAnsiBytes(encoded)} Tj`);
      commands.push("ET");
    }
  }

  commands.push("Q");

  return new PDFStream(
    {
      BBox: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(width), new PDFNumber(height)]),
      FormType: new PDFNumber(1),
      Resources: new PDFDictionary({
        Font: new PDFDictionary({
          F1: fontRef,
        }),
      }),
      Subtype: new PDFName("Form"),
      Type: new PDFName("XObject"),
    },
    Buffer.from(commands.join("\n"), "utf8"),
  );
}

export function buildCheckboxStateAppearance(
  width: number,
  height: number,
  checked: boolean,
  fontColor: string | undefined,
  pdfa: PreparedPdfaState | undefined,
): PDFStream {
  const commands = ["q"];
  const color = parseFormColor(fontColor) ?? DEFAULT_FORM_TEXT_COLOR;
  commands.push(...buildColorOperators({ b: 1, g: 1, r: 1, space: "rgb" }, "fill", pdfa));
  commands.push(`0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`);
  commands.push("f");
  commands.push(...buildColorOperators(color, "stroke", pdfa));
  commands.push("1 w");
  commands.push(`0.5 0.5 ${formatPdfNumber(Math.max(0.5, width - 1))} ${formatPdfNumber(Math.max(0.5, height - 1))} re`);
  commands.push("S");

  if (checked) {
    commands.push(...buildColorOperators(color, "stroke", pdfa));
    commands.push(`${formatPdfNumber(width * 0.2)} ${formatPdfNumber(height * 0.5)} m`);
    commands.push(`${formatPdfNumber(width * 0.42)} ${formatPdfNumber(height * 0.22)} l`);
    commands.push(`${formatPdfNumber(width * 0.8)} ${formatPdfNumber(height * 0.8)} l`);
    commands.push("S");
  }
  commands.push("Q");

  return new PDFStream(
    {
      BBox: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(width), new PDFNumber(height)]),
      FormType: new PDFNumber(1),
      Subtype: new PDFName("Form"),
      Type: new PDFName("XObject"),
    },
    Buffer.from(commands.join("\n"), "utf8"),
  );
}

export function buildRadioStateAppearance(
  width: number,
  height: number,
  checked: boolean,
  fontColor: string | undefined,
  fontRef: PDFRef | undefined,
  pdfa: PreparedPdfaState | undefined,
): PDFStream {
  const commands = ["q"];
  const color = parseFormColor(fontColor) ?? DEFAULT_FORM_TEXT_COLOR;
  const outer = Math.max(0.5, Math.min(width, height) / 2);
  commands.push(...buildColorOperators({ b: 1, g: 1, r: 1, space: "rgb" }, "fill", pdfa));
  commands.push(`0 0 ${formatPdfNumber(width)} ${formatPdfNumber(height)} re`);
  commands.push("f");
  commands.push(...buildColorOperators(color, "stroke", pdfa));
  commands.push("1 w");
  commands.push(buildRoundedRectPath(0.5, 0.5, Math.max(0.5, width - 1), Math.max(0.5, height - 1), outer));
  commands.push("S");

  if (checked) {
    const dotSize = Math.max(2, Math.min(width, height) * 0.48);
    const dotX = (width - dotSize) / 2;
    const dotY = (height - dotSize) / 2;
    commands.push(...buildColorOperators(color, "fill", pdfa));
    commands.push(buildRoundedRectPath(dotX, dotY, dotSize, dotSize, dotSize / 2));
    commands.push("f");
  }

  commands.push("Q");

  return new PDFStream(
    {
      BBox: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(width), new PDFNumber(height)]),
      FormType: new PDFNumber(1),
      Resources: new PDFDictionary({
        Font: fontRef ? new PDFDictionary({ F1: fontRef }) : null,
      }),
      Subtype: new PDFName("Form"),
      Type: new PDFName("XObject"),
    },
    Buffer.from(commands.join("\n"), "utf8"),
  );
}

export function buildTextFieldFlags(widget: Pick<PdfTextFieldWidgetSpec, "multiline" | "readOnly" | "required">): number {
  let flags = 0;
  if (widget.readOnly) {
    flags |= 1;
  }
  if (widget.required) {
    flags |= 2;
  }
  if (widget.multiline) {
    flags |= 1 << 12;
  }
  return flags;
}

export function buildChoiceFieldFlags(widget: Pick<PdfDropdownWidgetSpec, "readOnly" | "required">): number {
  let flags = 1 << 17;
  if (widget.readOnly) {
    flags |= 1;
  }
  if (widget.required) {
    flags |= 2;
  }
  return flags;
}

export function buildCheckboxFlags(widget: Pick<PdfCheckboxWidgetSpec, "readOnly" | "required">): number {
  let flags = 0;
  if (widget.readOnly) {
    flags |= 1;
  }
  if (widget.required) {
    flags |= 2;
  }
  return flags;
}

export function buildRadioFieldFlags(widget: Pick<PdfRadioWidgetSpec, "readOnly" | "required">): number {
  let flags = 1 << 15;
  if (widget.readOnly) {
    flags |= 1;
  }
  if (widget.required) {
    flags |= 2;
  }
  return flags;
}

export function isWidgetAnnotation(annotation: PdfPageAnnotationSpec): annotation is PdfWidgetAnnotationSpec {
  return annotation.kind === "form-text"
    || annotation.kind === "form-checkbox"
    || annotation.kind === "form-dropdown"
    || annotation.kind === "form-radio"
    || annotation.kind === "form-signature";
}

export function isInteractiveWidgetAnnotation(annotation: PdfPageAnnotationSpec): annotation is Exclude<PdfWidgetAnnotationSpec, PdfSignatureWidgetSpec> | PdfSignatureWidgetSpec {
  return isWidgetAnnotation(annotation) && !(annotation.kind === "form-signature" && annotation.mode === "visual");
}

export function buildJavaScriptAction(script: string | undefined): PDFDictionary | null {
  if (!script || script.trim().length === 0) {
    return null;
  }
  return new PDFDictionary({
    C: new PDFDictionary({
      JS: new PDFString(script),
      S: new PDFName("JavaScript"),
      Type: new PDFName("Action"),
    }),
  });
}

export function appendFlattenedWidgetAppearance(
  page: PdfRenderedPage,
  widget: PdfWidgetAnnotationSpec,
  pdfaDefaultFont: PdfEmbeddedFontInput | undefined,
): void {
  page.graphics ??= [];
  page.texts ??= [];
  const width = Math.max(1, widget.rect[2] - widget.rect[0]);
  const height = Math.max(1, widget.rect[3] - widget.rect[1]);
  const x = widget.rect[0];
  const y = widget.rect[1];
  const borderColor = parseFormColor((widget as { fontColor?: string }).fontColor) ?? DEFAULT_FORM_TEXT_COLOR;
  const baseStroke: PdfStrokeStyle = { color: borderColor, width: 1 };

  if (widget.kind === "form-checkbox") {
    page.graphics.push({
      fill: { color: { b: 1, g: 1, r: 1, space: "rgb" }, space: "solid" },
      height,
      stroke: baseStroke,
      type: "rect",
      width,
      x,
      y,
    });
    if (widget.checked) {
      page.graphics.push(
        { stroke: baseStroke, type: "line", x1: x + (width * 0.2), x2: x + (width * 0.42), y1: y + (height * 0.5), y2: y + (height * 0.22) },
        { stroke: baseStroke, type: "line", x1: x + (width * 0.42), x2: x + (width * 0.8), y1: y + (height * 0.22), y2: y + (height * 0.8) },
      );
    }
    return;
  }

  if (widget.kind === "form-radio") {
    const size = Math.min(width, height);
    page.graphics.push({
      fill: { color: { b: 1, g: 1, r: 1, space: "rgb" }, space: "solid" },
      height: size,
      radius: size / 2,
      stroke: baseStroke,
      type: "rect",
      width: size,
      x,
      y,
    });
    if (widget.checked) {
      const dotSize = Math.max(2, size * 0.48);
      page.graphics.push({
        fill: { color: borderColor, space: "solid" },
        height: dotSize,
        radius: dotSize / 2,
        type: "rect",
        width: dotSize,
        x: x + ((size - dotSize) / 2),
        y: y + ((size - dotSize) / 2),
      });
    }
    return;
  }

  const backgroundColor: PdfColor = widget.kind === "form-signature"
    ? { b: 0.98, g: 0.97, r: 0.94, space: "rgb" }
    : { b: 0.95, g: 0.95, r: 0.95, space: "rgb" };
  page.graphics.push({
    fill: { color: backgroundColor, space: "solid" },
    height,
    radius: widget.kind === "form-signature" ? 4 : undefined,
    stroke: baseStroke,
    type: "rect",
    width,
    x,
    y,
  });

  let value = "";
  let fontSize = 12;
  if (widget.kind === "form-text") {
    value = widget.value ?? "";
    fontSize = widget.fontSize ?? 12;
  } else if (widget.kind === "form-dropdown") {
    value = widget.value ?? "";
  } else if (widget.kind === "form-signature") {
    value = widget.value ?? widget.label ?? (widget.mode === "digital" ? "Digitally sign here" : "Signature");
    fontSize = widget.fontSize ?? 10;
  }

  if (value.length > 0) {
    page.texts.push({
      font: pdfaDefaultFont ?? DEFAULT_FONT,
      fontSize,
      value,
      x: x + 4,
      y: y + Math.max(4, (height / 2) - (fontSize * 0.35)),
    });
  }
}

export function normalizeInteractivePages(
  pages: PdfRenderedPage[],
  flattenForms: boolean | undefined,
  pdfaDefaultFont: PdfEmbeddedFontInput | undefined,
): PdfRenderedPage[] {
  return pages.map((page) => {
    const nextPage: PdfRenderedPage = {
      ...page,
      annotations: [],
      extraCommands: [...(page.extraCommands ?? [])],
      graphics: [...(page.graphics ?? [])],
      texts: [...page.texts],
    };

    for (const annotation of page.annotations ?? []) {
      if (annotation.kind === "form-signature" && annotation.mode === "visual") {
        appendFlattenedWidgetAppearance(nextPage, annotation, pdfaDefaultFont);
        continue;
      }
      if (flattenForms && isWidgetAnnotation(annotation)) {
        appendFlattenedWidgetAppearance(nextPage, annotation, pdfaDefaultFont);
        continue;
      }
      nextPage.annotations?.push(annotation);
    }

    return nextPage;
  });
}
