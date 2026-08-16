/**
 * Structural → engine-AST translation.
 *
 * Primitives emit PrimitiveNode (our internal structural shape). The engine
 * consumes a richer PaperNode tree. This module is the single translation
 * seam; keeping it here means primitives never import from @runstamp/core,
 * and the engine AST can evolve without rippling into every primitive.
 *
 * We emit untyped objects shaped to match the current PaperDocument AST.
 * Typing against `@runstamp/pptx`'s PaperNode is deliberately
 * deferred — tsc in this package would need a workspace path alias and the
 * engine build present, which we want to keep optional at this stage.
 */

import type {
  Paragraph,
  PrimitiveNode,
  Rect,
  TableCellSpec,
  TextRun,
} from "../layout/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EnginePaperNode = any;

export function toPaperNodes(nodes: PrimitiveNode[]): EnginePaperNode[] {
  return nodes.map(toPaperNode);
}

export function toPaperNode(node: PrimitiveNode): EnginePaperNode {
  switch (node.kind) {
    case "view":
      return translateView(node);
    case "text":
      return translateText(node);
    case "image":
      return translateImage(node);
    case "chart":
      return translateChart(node);
    case "table":
      return translateTable(node);
    case "connector":
      return translateConnector(node);
  }
}

function translateView(node: PrimitiveNode & { kind: "view" }): EnginePaperNode {
  // Fill: scalar hex stays on `backgroundColor`; pattern fill becomes
  // engine's `fill: PatternFill` (FlexStyle takes either backgroundColor
  // or fill). Pattern fills require the engine's `fill` field, not
  // `backgroundColor`, since OOXML's <a:pattFill> sits on the same path
  // as solid/gradient.
  const fillStyle: Record<string, unknown> = {};
  if (typeof node.fill === "string") {
    fillStyle.backgroundColor = node.fill;
  } else if (node.fill && typeof node.fill === "object" && node.fill.type === "pattern") {
    fillStyle.fill = {
      type: "pattern",
      pattern: node.fill.preset,
      foreground: node.fill.fg,
      background: node.fill.bg,
    };
  }

  const out: EnginePaperNode = {
    type: "View",
    shapeType: node.shape ?? "rect",
    ...(node.shapeAdjustments ? { shapeAdjustments: node.shapeAdjustments } : {}),
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      {
        ...fillStyle,
        ...(node.border
          ? {
              borderColor: node.border.color,
              borderWidth: node.border.width,
              borderStyle: node.border.style ?? "solid",
            }
          : {}),
        ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
        // zIndex belongs INSIDE style — the engine's layout validator reads
        // `node.style?.zIndex`, not `node.zIndex`.
        ...(node.zIndex !== undefined ? { zIndex: node.zIndex } : {}),
      },
      node.rect,
    ),
    children: (node.children ?? []).map(toPaperNode),
  };
  return out;
}

/** Conversion factor: token schema documents type sizes in points
 *  (PPTX convention), but the engine's TextStyle.fontSize is in
 *  pixels (FlexStyle convention — engine multiplies by 75 to derive
 *  OOXML pt-hundredths, so a fontSize of 32 px = 24 pt). Convert at the
 *  bridge so primitives never need to know about the engine's unit
 *  semantics. Same factor for lineHeight on TextStyle (also px). */
const PT_TO_PX = 96 / 72;

/** Translate one TextRun (primitive layer) → engine TextRun. Leaves the
 *  base style on the parent TextNode unchanged; only run-level overrides
 *  go onto the run.style object. */
function translateRun(run: TextRun): Record<string, unknown> {
  const runStyle: Record<string, unknown> = {};
  if (run.bold) runStyle.fontWeight = "bold";
  if (run.italic) runStyle.fontStyle = "italic";
  if (run.underline) runStyle.textDecorationLine = "underline";
  if (run.color !== undefined) runStyle.color = run.color;
  if (run.fontSize !== undefined) runStyle.fontSize = run.fontSize * PT_TO_PX;
  if (run.fontFamily !== undefined) runStyle.fontFamily = run.fontFamily;
  const out: Record<string, unknown> = { text: run.text };
  if (Object.keys(runStyle).length > 0) out.style = runStyle;
  return out;
}

/** Translate a Paragraph (primitive layer) → engine Paragraph. Maps
 *  bullet config + indent + alignment + level so the OOXML emitter writes
 *  real `<a:pPr>` + `<a:buChar>` / `<a:buAutoNum>` blocks. The result is
 *  PowerPoint-editable as a list. */
function translateParagraph(para: Paragraph): Record<string, unknown> {
  const out: Record<string, unknown> = {
    runs: para.runs.map(translateRun),
  };
  if (para.align !== undefined) out.align = para.align;
  if (para.level !== undefined) out.level = para.level;
  if (para.indent !== undefined) out.indent = para.indent;
  if (para.marginLeft !== undefined) out.marginLeft = para.marginLeft;
  if (para.hangingIndent !== undefined) out.hangingIndent = para.hangingIndent;
  if (para.spaceBefore !== undefined) out.spaceBefore = para.spaceBefore;
  if (para.spaceAfter !== undefined) out.spaceAfter = para.spaceAfter;
  if (para.bullet !== undefined) out.bullet = para.bullet;
  return out;
}

function translateText(node: PrimitiveNode & { kind: "text" }): EnginePaperNode {
  // Resolution priority: paragraphs > runs > content. Once one is set,
  // the lower-precedence fields are ignored. Real bullet paragraphs hit
  // the engine's PaperText.paragraphs path; rich runs without paragraph
  // structure hit PaperText.content as TextRun[]; flat strings stay flat.
  let content: unknown;
  let paragraphs: unknown;
  if (node.paragraphs && node.paragraphs.length > 0) {
    paragraphs = node.paragraphs.map(translateParagraph);
  } else if (node.runs && node.runs.length > 0) {
    content = node.runs.map(translateRun);
  } else {
    content = node.content ?? "";
  }

  const out: EnginePaperNode = {
    type: "Text",
    ...(paragraphs !== undefined ? { paragraphs } : { content }),
    autoFit: node.autoFit ?? false,
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      {
        fontFamily: node.style.family,
        fontWeight: node.style.weight >= 600 ? "bold" : "normal",
        fontSize: node.style.size * PT_TO_PX,
        ...(node.style.lineHeight !== undefined ? { lineHeight: node.style.lineHeight * PT_TO_PX } : {}),
        ...(node.style.letterSpacing !== undefined ? { letterSpacing: node.style.letterSpacing } : {}),
        ...(node.style.italic ? { fontStyle: "italic" } : {}),
        color: node.style.color,
        ...(node.style.align ? { textAlign: node.style.align } : {}),
        ...(node.style.verticalAlign ? { verticalAlign: node.style.verticalAlign } : {}),
        ...(node.style.textDirection ? { textDirection: node.style.textDirection } : {}),
        ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
        ...(node.zIndex !== undefined ? { zIndex: node.zIndex } : {}),
      },
      node.rect,
    ),
  };
  return out;
}

function translateChart(node: PrimitiveNode & { kind: "chart" }): EnginePaperNode {
  return {
    type: "Chart",
    chartData: node.chartData,
    ...(node.altText ? { altText: node.altText } : {}),
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== undefined ? { zIndex: node.zIndex } : {},
      node.rect,
    ),
  };
}

function translateImage(node: PrimitiveNode & { kind: "image" }): EnginePaperNode {
  const out: EnginePaperNode = {
    type: "Image",
    src: node.src,
    ...(node.alt ? { alt: node.alt } : {}),
    ...(node.crop ? { crop: node.crop } : {}),
    ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== undefined ? { zIndex: node.zIndex } : {},
      node.rect,
    ),
  };
  return out;
}

function translateTableCell(cell: TableCellSpec): Record<string, unknown> {
  // Engine TableCell accepts `text` (flat), `content` (TextRun[]),
  // or `paragraphs` (Paragraph[]). Pick the right field based on the
  // primitive layer's discriminated input.
  const out: Record<string, unknown> = {};
  if (typeof cell.content === "string") {
    out.text = cell.content;
  } else if (Array.isArray(cell.content) && cell.content.length > 0 && "runs" in cell.content[0]) {
    // Paragraph[] — the discriminator is the presence of `runs` on the
    // first element.
    out.paragraphs = (cell.content as Paragraph[]).map(translateParagraph);
    out.text = ""; // engine wants `text` always set; paragraphs override it
  } else {
    // TextRun[]
    out.content = (cell.content as TextRun[]).map(translateRun);
    out.text = "";
  }
  if (cell.colSpan !== undefined) out.colSpan = cell.colSpan;
  if (cell.rowSpan !== undefined) out.rowSpan = cell.rowSpan;
  if (cell.style) {
    const style: Record<string, unknown> = {};
    if (cell.style.fill !== undefined) style.fill = cell.style.fill;
    if (cell.style.borders !== undefined) style.borders = cell.style.borders;
    if (cell.style.fontWeight !== undefined) style.fontWeight = cell.style.fontWeight;
    if (cell.style.fontStyle !== undefined) style.fontStyle = cell.style.fontStyle;
    if (cell.style.fontSize !== undefined) style.fontSize = cell.style.fontSize * PT_TO_PX;
    if (cell.style.fontFamily !== undefined) style.fontFamily = cell.style.fontFamily;
    if (cell.style.color !== undefined) style.color = cell.style.color;
    if (cell.style.textAlign !== undefined) style.textAlign = cell.style.textAlign;
    if (cell.style.verticalAlign !== undefined) style.verticalAlign = cell.style.verticalAlign;
    if (cell.style.padding !== undefined) style.padding = cell.style.padding;
    out.style = style;
  }
  return out;
}

function translateTable(node: PrimitiveNode & { kind: "table" }): EnginePaperNode {
  const tableData: Record<string, unknown> = {
    columns: node.columns,
    rows: node.rows.map((row) => {
      const r: Record<string, unknown> = { cells: row.cells.map(translateTableCell) };
      if (row.height !== undefined) r.height = row.height;
      if (row.minHeight !== undefined) r.minHeight = row.minHeight;
      return r;
    }),
  };
  if (node.borders) {
    const ts: Record<string, unknown> = {};
    if (node.borders.outer) ts.outerBorder = node.borders.outer;
    if (node.borders.innerH) ts.innerBorderH = node.borders.innerH;
    if (node.borders.innerV) ts.innerBorderV = node.borders.innerV;
    tableData.style = ts;
  }
  return {
    type: "Table",
    tableData,
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== undefined ? { zIndex: node.zIndex } : {},
      node.rect,
    ),
  };
}

function translateConnector(node: PrimitiveNode & { kind: "connector" }): EnginePaperNode {
  // Engine ConnectorType is a friendly enum: "straight" | "elbow" |
  // "curved". The engine handles the OOXML preset (`straightConnector1`,
  // `bentConnector3`, `curvedConnector3`) internally. Our primitive layer
  // mirrors the same friendly names — pass through unchanged.
  const out: EnginePaperNode = {
    type: "Connector",
    connectorType: node.connectorKind,
    start: node.start,
    end: node.end,
    decorative: node.decorative ?? false,
    style: withAbsoluteRect(
      node.zIndex !== undefined ? { zIndex: node.zIndex } : {},
      node.rect,
    ),
  };
  if (node.lineWidth !== undefined) out.lineWidth = node.lineWidth;
  if (node.lineColor !== undefined) out.lineColor = node.lineColor;
  if (node.lineDashStyle !== undefined) out.lineDashStyle = node.lineDashStyle;
  if (node.arrowStart) out.arrowStart = true;
  if (node.arrowEnd) out.arrowEnd = true;
  return out;
}

function withAbsoluteRect(style: Record<string, unknown>, rect: Rect): Record<string, unknown> {
  return {
    position: "absolute",
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    ...style,
  };
}
