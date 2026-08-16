import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type {
  PdfAccessibilityStructureSpec,
  PdfColor,
  PdfDocumentInteractiveSpec,
  PdfEmbeddedFontInput,
  PdfExternalLinkAnnotationSpec,
  PdfFill,
  PdfGraphic,
  PdfImageGraphic,
  PdfInternalLinkAnnotationSpec,
  PdfMarkedContentSpec,
  PdfPageAnnotationSpec,
  PdfRenderedPage,
  PdfRenderableGraphic,
  PdfRenderableText,
  PdfTextAnnotationSpec,
  PdfTransformMatrix,
} from "@runstamp/pdf";
import { renderPdfPages, SRGB_ICC_PROFILE } from "@runstamp/pdf";
import { PaperError } from "../errors.js";
import { escapeXml } from "../ooxml/drawing/xmlEscape.js";
import { fetchWithRetry } from "../fetchRetry.js";
import { runLayout } from "../layout/index.js";
import { resolveEffectiveViewGeometry } from "../viewGeometry.js";
import type {
  LayoutAudio,
  LayoutChart,
  LayoutConnector,
  LayoutGroup,
  LayoutImage,
  LayoutNode,
  LayoutSlide,
  LayoutTable,
  LayoutText,
  LayoutView,
} from "../layout/extract.js";
import { getLogger } from "../logger.js";
import { FETCH_TIMEOUT_MS, DEFAULT_SLIDE_HEIGHT_PX, DEFAULT_SLIDE_WIDTH_PX, validateDataUrlSize } from "../ooxml/constants.js";
import { normalizeToParagraphsFromFields, resolveHyperlink } from "../ooxml/drawing/textUtils.js";
import { validateFetchUrl } from "../ooxml/urlGuard.js";
import { resolveColorValue } from "../renderer/colorResolver.js";
import { FONT_FILE_MAP } from "../typography/fontPaths.js";
import { getFontOrNull } from "../typography/fontCache.js";
import { shapeSegmentWidth } from "../typography/shaper.js";
import { autoLoadDocumentFonts } from "../typography/autoFont.js";
import { resolveLineHeightPixels } from "../typography/lineHeight.js";
import type {
  ColorValue,
  Fill,
  FontEmbedConfig,
  GradientFill,
  HyperlinkTarget,
  ImageFill,
  PaperDocument,
  Paragraph,
  PatternBackground,
  PatternFill,
  SlideBackground,
  TextRun,
  TextRunStyle,
  TextStyle,
  ThemeColorScheme,
} from "../types/ast.js";
import { validateDocument } from "../engine/documentValidation.js";
import { flattenDocumentZIndex } from "../zIndex.js";

const POINTS_PER_PIXEL = 72 / 96;
const SCREEN_SCALE = 1;
const PRINT_SCALE = 300 / 96;
const DEFAULT_OUTPUT_CONDITION_IDENTIFIER = "sRGB IEC61966-2.1";
const DEFAULT_PRODUCER = "Runstamp PPTX";
const DEFAULT_NOTE_TITLE = "Speaker Notes";
const REQUIRE = createRequire(import.meta.url);
const HB_DIR = dirname(REQUIRE.resolve("harfbuzzjs/hb.js"));
const FALLBACK_NOTO_PATH = join(HB_DIR, "test", "fonts", "noto", "NotoSans-Regular.ttf");

const SYSTEM_FONT_DIRS_MAC = [
  "/System/Library/Fonts/Supplemental",
  "/Library/Fonts",
  "/System/Library/Fonts",
];

const SYSTEM_FONT_DIRS_WIN = [
  "C:\\Windows\\Fonts",
];

const SYSTEM_FONT_DIRS_LINUX = [
  "/usr/share/fonts/truetype/dejavu",
  "/usr/share/fonts/truetype/liberation",
  "/usr/share/fonts/truetype/noto",
  "/usr/share/fonts/truetype",
  "/usr/share/fonts",
];

const FONT_BOLD_FILE_MAP: Record<string, string[]> = {
  Arial: ["Arial Bold.ttf", "Arial-Bold.ttf"],
  Calibri: ["Calibri Bold.ttf", "Arial Bold.ttf", "Arial-Bold.ttf"],
  Helvetica: ["Helvetica Bold.ttf", "Helvetica-Bold.ttf", "Arial Bold.ttf"],
  "Times New Roman": ["Times New Roman Bold.ttf"],
  Georgia: ["Georgia Bold.ttf"],
  Verdana: ["Verdana Bold.ttf"],
  "Trebuchet MS": ["Trebuchet MS Bold.ttf"],
  "Courier New": ["Courier New Bold.ttf"],
  Tahoma: ["Tahoma Bold.ttf"],
};

const FONT_ITALIC_FILE_MAP: Record<string, string[]> = {
  Arial: ["Arial Italic.ttf", "Arial-Italic.ttf"],
  Calibri: ["Calibri Italic.ttf", "Arial Italic.ttf", "Arial-Italic.ttf"],
  Helvetica: ["Helvetica Oblique.ttf", "Helvetica-Oblique.ttf", "Arial Italic.ttf"],
  "Times New Roman": ["Times New Roman Italic.ttf"],
  Georgia: ["Georgia Italic.ttf"],
  Verdana: ["Verdana Italic.ttf"],
  "Trebuchet MS": ["Trebuchet MS Italic.ttf"],
  "Courier New": ["Courier New Italic.ttf"],
  Tahoma: ["Tahoma Italic.ttf"],
};

const FONT_BOLD_ITALIC_FILE_MAP: Record<string, string[]> = {
  Arial: ["Arial Bold Italic.ttf", "Arial-BoldItalic.ttf"],
  Calibri: ["Calibri Bold Italic.ttf", "Arial Bold Italic.ttf", "Arial-BoldItalic.ttf"],
  Helvetica: ["Helvetica BoldOblique.ttf", "Helvetica-BoldOblique.ttf", "Arial Bold Italic.ttf"],
  "Times New Roman": ["Times New Roman Bold Italic.ttf"],
  Georgia: ["Georgia Bold Italic.ttf"],
  Verdana: ["Verdana Bold Italic.ttf"],
  "Trebuchet MS": ["Trebuchet MS Bold Italic.ttf"],
  "Courier New": ["Courier New Bold Italic.ttf"],
  Tahoma: ["Tahoma Bold Italic.ttf"],
};

const COLOR_NAME_MAP: Record<string, string> = {
  black: "#000000",
  blue: "#0000FF",
  green: "#008000",
  red: "#FF0000",
  white: "#FFFFFF",
  yellow: "#FFFF00",
  gray: "#808080",
  grey: "#808080",
  orange: "#FFA500",
};

type LinkAnnotation = PdfExternalLinkAnnotationSpec | PdfInternalLinkAnnotationSpec;
type PdfLinkTarget =
  | { kind: "link-external"; url: string }
  | { destination: PdfInternalLinkAnnotationSpec["destination"]; kind: "link-internal" };

interface ConverterState {
  accessibility?: AccessibilityBuilder;
  fontCache: Map<string, PdfEmbeddedFontInput | "Helvetica">;
  qualityScale: number;
  slideCount: number;
  themeColors?: ThemeColorScheme;
}

interface TextFragment {
  color?: ColorValue;
  font: PdfEmbeddedFontInput | "Helvetica";
  fontSize: number;
  height: number;
  hyperlink?: string | HyperlinkTarget;
  lang?: string;
  text: string;
  width: number;
}

interface TextLayoutLine {
  fragments: TextFragment[];
  height: number;
  width: number;
}

interface TextLayoutResult {
  annotations: LinkAnnotation[];
  texts: PdfRenderableText[];
}

export interface EnginePdfRenderOptions {
  includeNotes?: boolean;
  onInputWarning?: (warning: import("../interpreter/relaxed-input.js").PptxInputWarning) => void;
  onProgress?: (slideIndex: number, totalSlides: number) => void;
  pdfA?: "PDF/A-1b" | "PDF/A-2b";
  quality?: "print" | "screen";
  relaxed?: boolean;
  signal?: AbortSignal;
  tagged?: boolean;
}

function resolveAccessibilityConfig(
  doc: PaperDocument,
): Exclude<PaperDocument["accessible"], boolean | undefined> | undefined {
  if (!doc.accessible || doc.accessible === true) {
    return undefined;
  }
  return doc.accessible;
}

class AccessibilityBuilder {
  private readonly documentId = "doc";
  private readonly structure: PdfAccessibilityStructureSpec[] = [];
  private counter = 0;

  constructor() {
    this.structure.push({
      id: this.documentId,
      parentId: null,
      role: "Document",
    });
  }

  addPage(pageIndex: number): string {
    const id = `page-${pageIndex + 1}`;
    this.structure.push({
      id,
      parentId: this.documentId,
      role: "Sect",
    });
    return id;
  }

  addText(parentId: string, lang: string | undefined, value: string): PdfMarkedContentSpec {
    const id = `text-${this.counter++}`;
    this.structure.push({
      id,
      lang,
      parentId,
      role: "P",
    });
    return {
      actualText: value,
      lang,
      role: "P",
      structureId: id,
    };
  }

  addFigure(parentId: string, alt: string | undefined): PdfMarkedContentSpec {
    const id = `figure-${this.counter++}`;
    this.structure.push({
      alt,
      id,
      parentId,
      role: "Figure",
    });
    return {
      alt,
      role: "Figure",
      structureId: id,
    };
  }

  build(language: string | undefined): PdfDocumentInteractiveSpec["accessibility"] {
    return {
      lang: language,
      structure: this.structure,
    };
  }
}

export async function renderDocumentToPdf(
  doc: PaperDocument,
  options: EnginePdfRenderOptions | undefined,
): Promise<Buffer> {

  const validated = validateDocument(doc, options);
  const normalized = flattenDocumentZIndex(validated);
  const accessibilityConfig = resolveAccessibilityConfig(normalized);
  const wantsTagged = options?.tagged ?? Boolean(normalized.accessible);
  await autoLoadDocumentFonts(normalized);

  const layoutWidth = normalized.slideSize?.width ?? DEFAULT_SLIDE_WIDTH_PX;
  const layoutHeight = normalized.slideSize?.height ?? DEFAULT_SLIDE_HEIGHT_PX;
  assertValidSlideDimension(layoutWidth, "width");
  assertValidSlideDimension(layoutHeight, "height");

  const state: ConverterState = {
    accessibility: wantsTagged ? new AccessibilityBuilder() : undefined,
    fontCache: new Map(),
    qualityScale: options?.quality === "print" ? PRINT_SCALE : SCREEN_SCALE,
    slideCount: normalized.slides.length,
    themeColors: normalized.theme?.colorScheme,
  };

  const pages: PdfRenderedPage[] = [];
  const meta = {
    author: normalized.meta.author,
    creator: DEFAULT_PRODUCER,
    producer: DEFAULT_PRODUCER,
    title: accessibilityConfig?.title ?? normalized.meta.title,
  };

  for (let slideIndex = 0; slideIndex < normalized.slides.length; slideIndex += 1) {
    assertNotAborted(options?.signal, slideIndex);
    const slide = normalized.slides[slideIndex];
    const layoutTree = await runLayout(slide, layoutWidth, layoutHeight);
    const page = await convertSlideToPage(layoutTree as LayoutSlide, normalized, slideIndex, state, options);
    pages.push(page);
    options?.onProgress?.(slideIndex, normalized.slides.length);
  }

  if (options?.pdfA && pages.some((page) => (page.annotations ?? []).some((annotation) => annotation.kind === "link-external"))) {
    throw new PaperError(
      "PDF/A export does not allow external URI link annotations in the current PDF engine.",
      { code: "VALIDATION_FAILED", phase: "serialization" },
    );
  }

  const interactive: PdfDocumentInteractiveSpec = {};
  if (state.accessibility) {
    interactive.accessibility = state.accessibility.build(
      accessibilityConfig?.language ?? normalized.meta.language,
    );
  }
  if (options?.pdfA) {
    const conformance = options.pdfA === "PDF/A-1b" ? "1b" : "2b";
    interactive.pdfa = {
      conformance,
      iccProfile: SRGB_ICC_PROFILE,
      outputConditionIdentifier: DEFAULT_OUTPUT_CONDITION_IDENTIFIER,
    };
    interactive.metadataXml = buildPdfaMetadataXml(
      meta,
      accessibilityConfig?.language ?? normalized.meta.language ?? "en-US",
      conformance,
    );
  }

  return renderPdfPages({
    interactive,
    meta,
    pages,
  });
}

async function convertSlideToPage(
  slideNode: LayoutSlide,
  document: PaperDocument,
  slideIndex: number,
  state: ConverterState,
  options: EnginePdfRenderOptions | undefined,
): Promise<PdfRenderedPage> {
  const width = pxToPoints(slideNode.layout.width);
  const height = pxToPoints(slideNode.layout.height);
  const graphics: PdfRenderableGraphic[] = [];
  const texts: PdfRenderableText[] = [];
  const annotations: PdfPageAnnotationSpec[] = [];
  const pageStructureId = state.accessibility?.addPage(slideIndex);

  const backgroundGraphic = await convertSlideBackground(slideNode.background, width, height, state.themeColors, pageStructureId, state);
  if (backgroundGraphic) {
    graphics.push(backgroundGraphic);
  }

  if (slideNode.children) {
    for (const child of slideNode.children) {
      const result = await convertNode(child, slideIndex, height, state, pageStructureId, options, undefined);
      graphics.push(...result.graphics);
      texts.push(...result.texts);
      annotations.push(...result.annotations);
    }
  }

  if (options?.includeNotes) {
    const noteAnnotation = buildSpeakerNoteAnnotation(document.slides[slideIndex]?.notes, height);
    if (noteAnnotation) {
      annotations.push(noteAnnotation);
    }
  }

  return {
    annotations,
    graphics,
    height,
    texts,
    width,
  };
}

async function convertNode(
  node: LayoutNode,
  slideIndex: number,
  pageHeight: number,
  state: ConverterState,
  pageStructureId: string | undefined,
  options: EnginePdfRenderOptions | undefined,
  inheritedTransform: PdfTransformMatrix | undefined,
): Promise<{ annotations: PdfPageAnnotationSpec[]; graphics: PdfRenderableGraphic[]; texts: PdfRenderableText[] }> {
  const graphics: PdfRenderableGraphic[] = [];
  const texts: PdfRenderableText[] = [];
  const annotations: PdfPageAnnotationSpec[] = [];
  const nodeTransform = combineTransforms(
    inheritedTransform,
    buildNodeTransform(node),
  );

  switch (node.type) {
    case "View": {
      const view = node as LayoutView;
      const shapeGraphic = await convertViewGraphic(view, pageHeight, state.themeColors, pageStructureId, state, nodeTransform);
      if (shapeGraphic) {
        graphics.push(shapeGraphic);
      }

      if (view.textParagraphs || view.textContent) {
        const insets = view.textStyle?.textInsets;
        const tx = view.layout.x + (insets?.left ?? 0);
        const ty = view.layout.y + (insets?.top ?? 0);
        const tw = view.layout.width - (insets?.left ?? 0) - (insets?.right ?? 0);
        const th = view.layout.height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
        const textResult = layoutTextBox(
          tx,
          ty,
          tw,
          th,
          normalizeToParagraphsFromFields(view.textContent, view.textParagraphs),
          view.textStyle,
          slideIndex,
          pageHeight,
          state,
          pageStructureId,
          nodeTransform,
        );
        texts.push(...textResult.texts);
        annotations.push(...textResult.annotations);
      }

      if (view.hyperlink) {
        const link = resolvePdfLink(view.hyperlink, slideIndex, pageHeight, state.slideCount);
        if (link) {
          annotations.push(
            addRectToLink(
              link,
              transformRect(
                nodeTransform,
                toPdfRect(view.layout.x, view.layout.y, view.layout.width, view.layout.height, pageHeight),
              ),
            ),
          );
        }
      }

      if (view.children && !view.textParagraphs && !view.textContent) {
        for (const child of view.children) {
          const result = await convertNode(child, slideIndex, pageHeight, state, pageStructureId, options, nodeTransform);
          graphics.push(...result.graphics);
          texts.push(...result.texts);
          annotations.push(...result.annotations);
        }
      }
      break;
    }

    case "Text": {
      const textNode = node as LayoutText;
      const style = effectiveTextStyle(textNode.style, textNode._autoFitResult?.fontScale);
      const background = convertTextBackground(textNode, pageHeight, state.themeColors, pageStructureId, state, nodeTransform);
      if (background) {
        graphics.push(background);
      }
      const insets = style?.textInsets;
      const tx = textNode.layout.x + (insets?.left ?? 0);
      const ty = textNode.layout.y + (insets?.top ?? 0);
      const tw = textNode.layout.width - (insets?.left ?? 0) - (insets?.right ?? 0);
      const th = textNode.layout.height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
      const textResult = layoutTextBox(
        tx,
        ty,
        tw,
        th,
        normalizeToParagraphsFromFields(textNode.content, textNode.paragraphs),
        style,
        slideIndex,
        pageHeight,
        state,
        pageStructureId,
        nodeTransform,
      );
      texts.push(...textResult.texts);
      annotations.push(...textResult.annotations);

      if (textNode.children) {
        for (const child of textNode.children) {
          const result = await convertNode(child, slideIndex, pageHeight, state, pageStructureId, options, nodeTransform);
          graphics.push(...result.graphics);
          texts.push(...result.texts);
          annotations.push(...result.annotations);
        }
      }
      break;
    }

    case "Image": {
      const imageGraphic = await convertImageGraphic(node as LayoutImage, pageHeight, pageStructureId, state, nodeTransform);
      graphics.push(imageGraphic);
      if ((node as LayoutImage).hyperlink) {
        const link = resolvePdfLink((node as LayoutImage).hyperlink!, slideIndex, pageHeight, state.slideCount);
        if (link) {
          annotations.push(
            addRectToLink(
              link,
              transformRect(
                nodeTransform,
                toPdfRect(node.layout.x, node.layout.y, node.layout.width, node.layout.height, pageHeight),
              ),
            ),
          );
        }
      }
      break;
    }

    case "Chart": {
      const chartGraphic = await convertChartGraphic(node as LayoutChart, pageHeight, pageStructureId, state, nodeTransform);
      graphics.push(chartGraphic);
      break;
    }

    case "Connector": {
      const connectorGraphic = convertConnectorGraphic(node as LayoutConnector, pageHeight, state.themeColors, nodeTransform);
      if (connectorGraphic) {
        graphics.push(connectorGraphic);
      }
      break;
    }

    case "Table": {
      const tableResult = await convertTable(node as LayoutTable, slideIndex, pageHeight, state, pageStructureId, nodeTransform);
      graphics.push(...tableResult.graphics);
      texts.push(...tableResult.texts);
      annotations.push(...tableResult.annotations);
      break;
    }

    case "Group": {
      const group = node as LayoutGroup;
      if (group.children) {
        for (const child of group.children) {
          const result = await convertNode(child, slideIndex, pageHeight, state, pageStructureId, options, nodeTransform);
          graphics.push(...result.graphics);
          texts.push(...result.texts);
          annotations.push(...result.annotations);
        }
      }
      break;
    }

    case "Audio":
    case "Video": {
      const mediaGraphic = convertMediaPlaceholder(node as LayoutAudio, pageHeight, pageStructureId, state, nodeTransform);
      if (mediaGraphic) {
        graphics.push(mediaGraphic);
      }
      break;
    }

    default:
      if (node.children) {
        for (const child of node.children) {
          const result = await convertNode(child, slideIndex, pageHeight, state, pageStructureId, options, nodeTransform);
          graphics.push(...result.graphics);
          texts.push(...result.texts);
          annotations.push(...result.annotations);
        }
      }
      break;
  }

  return { annotations, graphics, texts };
}

function convertTextBackground(
  node: LayoutText,
  pageHeight: number,
  themeColors: ThemeColorScheme | undefined,
  pageStructureId: string | undefined,
  state: ConverterState,
  transform: PdfTransformMatrix | undefined,
): PdfRenderableGraphic | undefined {
  const fill = node.style?.fill ?? (node.style?.backgroundColor ? { color: node.style.backgroundColor, type: "solid" as const } : undefined);
  const graphic = convertRectLikeGraphic(
    node.layout.x,
    node.layout.y,
    node.layout.width,
    node.layout.height,
    fill,
    node.style?.borderWidth,
    node.style?.borderColor,
    node.style?.borderStyle,
    pageHeight,
    themeColors,
    transform,
  );

  if (graphic && state.accessibility) {
    graphic.accessibility = { artifact: true, role: "Artifact" };
  }

  return graphic;
}

async function convertViewGraphic(
  node: LayoutView,
  pageHeight: number,
  themeColors: ThemeColorScheme | undefined,
  pageStructureId: string | undefined,
  state: ConverterState,
  transform: PdfTransformMatrix | undefined,
): Promise<PdfRenderableGraphic | undefined> {
  const fill = node.style?.fill ?? (node.style?.backgroundColor ? { color: node.style.backgroundColor, type: "solid" as const } : undefined);
  const borderWidth = node.style?.borderWidth;
  const borderColor = node.style?.borderColor;
  const borderStyle = node.style?.borderStyle;
  const shapeType = node.shapeType ?? "rect";
  const accessibility = state.accessibility
    ? node.decorative
      ? { artifact: true, role: "Artifact" }
      : node.altText
        ? state.accessibility.addFigure(pageStructureId ?? "doc", node.altText)
        : undefined
    : undefined;

  if (shapeType === "ellipse") {
    return {
      accessibility,
      height: pxToPoints(node.layout.height),
      source: ellipseSvg(pxToPoints(node.layout.width), pxToPoints(node.layout.height), fill, borderWidth, borderColor, borderStyle, themeColors, node.style?.opacity),
      transform,
      type: "svg",
      width: pxToPoints(node.layout.width),
      x: pxToPoints(node.layout.x),
      y: toPdfY(node.layout.y + node.layout.height, pageHeight),
    };
  }

  if (shapeType !== "rect" && shapeType !== "roundRect") {
    const path = buildShapePath(shapeType, node.layout.width, node.layout.height);
    if (path) {
      return {
        accessibility,
        fill: convertFill(fill, 0, 0, node.layout.width, node.layout.height, pageHeight, themeColors, node.style?.opacity),
        fillRule: shapeType === "donut" ? "evenodd" : "nonzero",
        stroke: convertStroke(borderWidth, borderColor, borderStyle, themeColors, node.style?.opacity),
        transform: combineTransforms(
          transform,
          [
            1,
            0,
            0,
            1,
            pxToPoints(node.layout.x),
            toPdfY(node.layout.y + node.layout.height, pageHeight),
          ],
        ),
        type: "path",
        d: path,
      };
    }

    getLogger().warn(`[pptx-to-pdf] Unsupported shapeType "${shapeType}" on slide export, falling back to rectangle.`);
  }

  const rectGraphic = convertRectLikeGraphic(
    node.layout.x,
    node.layout.y,
    node.layout.width,
    node.layout.height,
    fill,
    borderWidth,
    borderColor,
    borderStyle,
    pageHeight,
    themeColors,
    transform,
    resolveEffectiveViewGeometry(node, node.layout.width, node.layout.height).cornerRadiusPx,
  );
  if (rectGraphic && accessibility) {
    rectGraphic.accessibility = accessibility;
  }
  return rectGraphic;
}

async function convertImageGraphic(
  node: LayoutImage,
  pageHeight: number,
  pageStructureId: string | undefined,
  state: ConverterState,
  transform: PdfTransformMatrix | undefined,
): Promise<PdfRenderableGraphic> {
  const source = await loadBinarySource(node.svgSrc ?? node.src);
  const graphic: PdfImageGraphic | PdfRenderableGraphic = {
    accessibility: state.accessibility
      ? node.decorative
        ? { artifact: true, role: "Artifact" }
        : state.accessibility.addFigure(pageStructureId ?? "doc", node.altText)
      : undefined,
    height: pxToPoints(node.layout.height),
    source,
    transform,
    type: "image",
    width: pxToPoints(node.layout.width),
    x: pxToPoints(node.layout.x),
    y: toPdfY(node.layout.y + node.layout.height, pageHeight),
  };
  return graphic;
}

async function convertChartGraphic(
  node: LayoutChart,
  pageHeight: number,
  pageStructureId: string | undefined,
  state: ConverterState,
  transform: PdfTransformMatrix | undefined,
): Promise<PdfRenderableGraphic> {
  try {
    const { renderChartToSvg } = await import("../ooxml/chart/rasterizer.js");
    const rendered = await renderChartToSvg(
      node.chartData,
      { width: Math.max(1, Math.round(node.layout.width)), height: Math.max(1, Math.round(node.layout.height)) },
      state.themeColors,
    );
    if (!rendered) {
      throw new PaperError("Chart SVG renderer returned no image data.", {
        code: "VALIDATION_FAILED",
        phase: "chart",
      });
    }
    return {
      accessibility: state.accessibility
        ? state.accessibility.addFigure(pageStructureId ?? "doc", node.altText ?? "Chart")
        : undefined,
      height: pxToPoints(node.layout.height),
      source: rendered.svg,
      transform,
      type: "svg",
      width: pxToPoints(node.layout.width),
      x: pxToPoints(node.layout.x),
      y: toPdfY(node.layout.y + node.layout.height, pageHeight),
    };
  } catch (cause) {
    throw new PaperError(
      `Chart rendering failed during PPTX to PDF conversion: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause, code: "VALIDATION_FAILED", phase: "chart" },
    );
  }
}

function convertConnectorGraphic(
  node: LayoutConnector,
  pageHeight: number,
  themeColors: ThemeColorScheme | undefined,
  transform: PdfTransformMatrix | undefined,
): PdfRenderableGraphic | undefined {
  const stroke = convertStroke(node.lineWidth ?? 1, node.lineColor ?? "#000000", normalizeDashStyle(node.lineDashStyle), themeColors);
  if (!stroke) {
    return undefined;
  }

  return {
    stroke,
    transform,
    type: "line",
    x1: pxToPoints(node.start.x),
    x2: pxToPoints(node.end.x),
    y1: toPdfY(node.start.y, pageHeight),
    y2: toPdfY(node.end.y, pageHeight),
  };
}

function convertMediaPlaceholder(
  node: LayoutAudio,
  pageHeight: number,
  pageStructureId: string | undefined,
  state: ConverterState,
  transform: PdfTransformMatrix | undefined,
): PdfRenderableGraphic | undefined {
  return convertRectLikeGraphic(
    node.layout.x,
    node.layout.y,
    node.layout.width,
    node.layout.height,
    { color: "#111827", type: "solid" },
    1,
    "#6B7280",
    "dashed",
    pageHeight,
    state.themeColors,
    transform,
  );
}

async function convertTable(
  node: LayoutTable,
  slideIndex: number,
  pageHeight: number,
  state: ConverterState,
  pageStructureId: string | undefined,
  transform: PdfTransformMatrix | undefined,
): Promise<{ annotations: PdfPageAnnotationSpec[]; graphics: PdfRenderableGraphic[]; texts: PdfRenderableText[] }> {
  const graphics: PdfRenderableGraphic[] = [];
  const texts: PdfRenderableText[] = [];
  const annotations: PdfPageAnnotationSpec[] = [];
  const columnWidths = node.tableData.columns;
  const totalColumnWidth = columnWidths.reduce((sum, value) => sum + value, 0) || node.layout.width;
  const widthScale = node.layout.width / totalColumnWidth;
  const explicitRowHeight = node.tableData.rows.reduce((sum, row) => sum + (row.height ?? 0), 0);
  const autoRowCount = node.tableData.rows.filter((row) => !row.height).length;
  const remainingHeight = Math.max(0, node.layout.height - explicitRowHeight);
  const defaultRowHeight = autoRowCount > 0 ? remainingHeight / autoRowCount : 0;

  let currentY = node.layout.y;
  for (let rowIndex = 0; rowIndex < node.tableData.rows.length; rowIndex += 1) {
    const row = node.tableData.rows[rowIndex];
    const rowHeight = row.height ?? defaultRowHeight;
    let currentX = node.layout.x;

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
      const cell = row.cells[cellIndex];
      const cellWidth = (columnWidths[cellIndex] ?? 0) * widthScale;
      if (cell.hMerge || cell.vMerge) {
        currentX += cellWidth;
        continue;
      }

      const rect = convertRectLikeGraphic(
        currentX,
        currentY,
        cellWidth,
        rowHeight,
        cell.style?.fill
          ? typeof cell.style.fill === "string" || !("type" in cell.style.fill)
            ? { color: cell.style.fill, type: "solid" as const }
            : cell.style.fill
          : undefined,
        cell.style?.borders?.left?.width ?? cell.style?.borders?.top?.width ?? node.tableData.style?.outerBorder?.width,
        cell.style?.borders?.left?.color ?? cell.style?.borders?.top?.color ?? node.tableData.style?.outerBorder?.color,
        "solid",
        pageHeight,
        state.themeColors,
        transform,
      );
      if (rect) {
        rect.accessibility = state.accessibility ? { artifact: true, role: "Artifact" } : undefined;
        graphics.push(rect);
      }

      const padding = cell.style?.padding ?? 6;
      const paragraphs = normalizeToParagraphsFromFields(cell.content, cell.paragraphs);
      const textStyle: TextStyle = {
        color: cell.style?.color,
        fontFamily: cell.style?.fontFamily,
        fontSize: cell.style?.fontSize,
        fontStyle: cell.style?.fontStyle,
        fontWeight: cell.style?.fontWeight,
        textAlign: cell.style?.textAlign,
      };
      const textResult = layoutTextBox(
        currentX + padding,
        currentY + padding,
        Math.max(0, cellWidth - padding * 2),
        Math.max(0, rowHeight - padding * 2),
        paragraphs,
        textStyle,
        slideIndex,
        pageHeight,
        state,
        pageStructureId,
        transform,
      );
      texts.push(...textResult.texts);
      annotations.push(...textResult.annotations);
      currentX += cellWidth;
    }

    currentY += rowHeight;
  }

  return { annotations, graphics, texts };
}

function layoutTextBox(
  x: number,
  y: number,
  width: number,
  height: number,
  paragraphs: Paragraph[],
  style: TextStyle | undefined,
  slideIndex: number,
  pageHeight: number,
  state: ConverterState,
  pageStructureId: string | undefined,
  transform: PdfTransformMatrix | undefined,
): TextLayoutResult {
  const texts: PdfRenderableText[] = [];
  const annotations: LinkAnnotation[] = [];

  if (width <= 0 || height <= 0) {
    return { annotations, texts };
  }

  let cursorY = y;
  for (const paragraph of paragraphs) {
    cursorY += paragraph.spaceBefore ?? 0;
    if (cursorY - y >= height) {
      break;
    }

    const paragraphFontSize = style?.fontSize ?? 14;
    const paragraphFontSizePx = paragraphFontSize / POINTS_PER_PIXEL;
    const lineHeightFallback = paragraph.lineHeight !== undefined
      ? resolveLineHeightPixels(paragraph.lineHeight, paragraphFontSizePx, paragraphFontSizePx * 1.3, "points")
      : resolveLineHeightPixels(style?.lineHeight, paragraphFontSizePx, paragraphFontSizePx * 1.3);
    const lines = layoutParagraph(paragraph, style, width, state);
    const align = paragraph.align ?? style?.textAlign ?? "left";

    for (const line of lines) {
      if (cursorY - y >= height) {
        break;
      }

      const lineHeight = Math.max(line.height, lineHeightFallback);
      const lineX = alignLine(x, width, line.width, align);
      let cursorX = lineX;

      for (const fragment of line.fragments) {
        if (!fragment.text) {
          continue;
        }

        const structure = state.accessibility
          ? state.accessibility.addText(pageStructureId ?? "doc", fragment.lang ?? style?.lang, fragment.text)
          : undefined;
        const textColor = fragment.color ? toPdfColor(fragment.color, state.themeColors) : undefined;
        texts.push({
          accessibility: structure,
          ...(textColor ? { color: textColor } : {}),
          direction: style?.rtl || paragraph.rtl ? "rtl" : "ltr",
          font: fragment.font,
          fontSize: fragment.fontSize,
          transform,
          value: fragment.text,
          x: pxToPoints(cursorX),
          y: toPdfTextBaseline(cursorY, lineHeight, pageHeight),
        });

        if (fragment.hyperlink) {
          const link = resolvePdfLink(fragment.hyperlink, slideIndex, pageHeight, state.slideCount);
          if (link) {
            annotations.push(
              addRectToLink(
                link,
                transformRect(
                  transform,
                  toPdfRect(cursorX, cursorY, fragment.width, lineHeight, pageHeight),
                ),
              ),
            );
          }
        }

        cursorX += fragment.width;
      }

      cursorY += lineHeight;
    }

    cursorY += paragraph.spaceAfter ?? 0;
  }

  return { annotations, texts };
}

function layoutParagraph(
  paragraph: Paragraph,
  style: TextStyle | undefined,
  maxWidth: number,
  state: ConverterState,
): TextLayoutLine[] {
  const fragments = paragraph.runs.flatMap((run) => splitRun(run, style, state));
  if (fragments.length === 0) {
    return [];
  }

  const lines: TextLayoutLine[] = [];
  let current: TextLayoutLine = { fragments: [], height: 0, width: 0 };

  for (const fragment of fragments) {
    const nextWidth = current.width + fragment.width;
    if (current.fragments.length > 0 && nextWidth > maxWidth && fragment.text.trim().length > 0) {
      trimTrailingWhitespace(current);
      lines.push(current);
      const trimmed = trimLeadingWhitespace(fragment);
      current = { fragments: [], height: 0, width: 0 };
      if (trimmed.text.length === 0) {
        continue;
      }
      current.fragments.push(trimmed);
      current.height = Math.max(current.height, trimmed.height);
      current.width = trimmed.width;
      continue;
    }

    current.fragments.push(fragment);
    current.height = Math.max(current.height, fragment.height);
    current.width = nextWidth;
  }

  trimTrailingWhitespace(current);
  if (current.fragments.length > 0) {
    lines.push(current);
  }

  return lines;
}

function splitRun(
  run: TextRun,
  parentStyle: TextStyle | undefined,
  state: ConverterState,
): TextFragment[] {
  const fontFamily = run.style?.fontFamily ?? parentStyle?.fontFamily ?? "Arial";
  const fontSize = run.style?.fontSize ?? parentStyle?.fontSize ?? 14;
  const font = resolvePdfFontInput(fontFamily, run.style, state);
  const text = applyTextTransform(run.text, run.style?.textTransform);
  const segments = splitIntoSegments(text);
  // Text sizes are points while the layout coordinate system is CSS pixels.
  // Keeping widths/heights in points until the final placement compressed every
  // fragment by 25%, causing adjacent runs and lines to overlap in converted PDFs.
  const fontSizePx = fontSize / POINTS_PER_PIXEL;
  const lineHeight = resolveLineHeightPixels(parentStyle?.lineHeight, fontSizePx, fontSizePx * 1.3);

  return segments.map((segment) => ({
    color: run.style?.color ?? parentStyle?.color,
    font,
    fontSize,
    height: lineHeight,
    hyperlink: run.hyperlink,
    lang: run.style?.lang ?? parentStyle?.lang,
    text: segment,
    width: measureTextWidth(segment, fontFamily, fontSize),
  }));
}

function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (isCjkCodePoint(cp)) {
      if (current) {
        segments.push(current);
        current = "";
      }
      segments.push(char);
      continue;
    }

    if (/\s/.test(char)) {
      current += char;
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current) {
    segments.push(current);
  }

  return segments.length > 0 ? segments : [text];
}

function trimLeadingWhitespace(fragment: TextFragment): TextFragment {
  const text = fragment.text.replace(/^\s+/, "");
  if (text === fragment.text) {
    return fragment;
  }
  return {
    ...fragment,
    text,
    width: measureTextWidth(text, fragment.font === "Helvetica" ? "Helvetica" : fragment.font.family, fragment.fontSize),
  };
}

function trimTrailingWhitespace(line: TextLayoutLine): void {
  if (line.fragments.length === 0) {
    return;
  }
  const last = line.fragments[line.fragments.length - 1];
  const trimmedText = last?.text.replace(/\s+$/, "") ?? "";
  if (last && trimmedText !== last.text) {
    last.text = trimmedText;
    last.width = measureTextWidth(trimmedText, last.font === "Helvetica" ? "Helvetica" : last.font.family, last.fontSize);
  }
  line.width = line.fragments.reduce((sum, fragment) => sum + fragment.width, 0);
}

function alignLine(
  x: number,
  width: number,
  lineWidth: number,
  align: "center" | "justify" | "left" | "right",
): number {
  if (align === "center") {
    return x + (width - lineWidth) / 2;
  }
  if (align === "right") {
    return x + width - lineWidth;
  }
  return x;
}

function resolvePdfFontInput(
  fontFamily: string,
  runStyle: TextRunStyle | undefined,
  state: ConverterState,
): PdfEmbeddedFontInput | "Helvetica" {
  const styleKey = `${fontFamily}:${runStyle?.fontWeight ?? "normal"}:${runStyle?.fontStyle ?? "normal"}`;
  const cached = state.fontCache.get(styleKey);
  if (cached) {
    return cached;
  }

  const resolved = resolveFontSource(fontFamily, runStyle);
  if (!resolved) {
    getLogger().warn(`[pptx-to-pdf] Falling back to Helvetica because font "${fontFamily}" was not found on disk.`);
    state.fontCache.set(styleKey, "Helvetica");
    return "Helvetica";
  }

  const input: PdfEmbeddedFontInput = {
    family: resolved.family,
    source: resolved.path,
  };
  state.fontCache.set(styleKey, input);
  return input;
}

function resolveFontSource(
  fontFamily: string,
  runStyle: TextRunStyle | undefined,
): { family: string; path: string } | undefined {
  const explicit = resolveSystemFontPath(fontFamily, runStyle);
  if (explicit) {
    return { family: fontFamily, path: explicit };
  }

  const fallbacks = [fontFamily, "Arial", "Helvetica", "Calibri"];
  for (const fallback of fallbacks) {
    const path = resolveSystemFontPath(fallback, runStyle);
    if (path) {
      return { family: fallback, path };
    }
  }

  if (existsSync(FALLBACK_NOTO_PATH)) {
    return { family: "Noto Sans", path: FALLBACK_NOTO_PATH };
  }

  return undefined;
}

function resolveSystemFontPath(fontFamily: string, runStyle: TextRunStyle | undefined): string | undefined {
  if (fontFamily.includes("/") || fontFamily.includes("\\") || fontFamily.includes("..")) {
    return undefined;
  }

  const isBold = runStyle?.fontWeight === "bold";
  const isItalic = runStyle?.fontStyle === "italic";
  const dirs = process.platform === "darwin"
    ? SYSTEM_FONT_DIRS_MAC
    : process.platform === "win32"
      ? SYSTEM_FONT_DIRS_WIN
      : SYSTEM_FONT_DIRS_LINUX;

  const candidateMap = isBold && isItalic
    ? FONT_BOLD_ITALIC_FILE_MAP
    : isBold
      ? FONT_BOLD_FILE_MAP
      : isItalic
        ? FONT_ITALIC_FILE_MAP
        : FONT_FILE_MAP;
  const candidates = candidateMap[fontFamily] ?? [`${fontFamily}.ttf`, `${fontFamily}.otf`];

  for (const dir of dirs) {
    for (const file of candidates) {
      const path = join(dir, file);
      if (existsSync(path)) {
        return path;
      }
    }
  }

  return undefined;
}

function measureTextWidth(text: string, fontFamily: string, fontSize: number): number {
  if (!text) {
    return 0;
  }

  try {
    const font = getFontOrNull(fontFamily);
    const unitsPerEm = font?.unitsPerEm ?? 1000;
    const width = shapeSegmentWidth(text, fontFamily, fontSize, unitsPerEm);
    if (width > 0) {
      return width / POINTS_PER_PIXEL;
    }
  } catch {
    // Fall back below.
  }

  return (text.length * fontSize * 0.6) / POINTS_PER_PIXEL;
}

function convertSlideBackground(
  background: SlideBackground | undefined,
  width: number,
  height: number,
  themeColors: ThemeColorScheme | undefined,
  pageStructureId: string | undefined,
  state: ConverterState,
): Promise<PdfRenderableGraphic | undefined> | PdfRenderableGraphic | undefined {
  if (!background) {
    return {
      accessibility: state.accessibility ? { artifact: true, role: "Artifact" } : undefined,
      fill: { color: { b: 1, g: 1, r: 1, space: "rgb" }, space: "solid" },
      height,
      type: "rect",
      width,
      x: 0,
      y: 0,
    };
  }

  if (background.type === "image") {
    return loadBinarySource(background.src).then((source) => ({
      accessibility: state.accessibility ? { artifact: true, role: "Artifact" } : undefined,
      height,
      source,
      type: "image",
      width,
      x: 0,
      y: 0,
    }));
  }

  if (background.type === "pattern") {
    return {
      accessibility: state.accessibility ? { artifact: true, role: "Artifact" } : undefined,
      height,
      source: patternRectSvg(width, height, background, undefined, undefined, undefined, themeColors),
      type: "svg",
      width,
      x: 0,
      y: 0,
    };
  }

  return {
    accessibility: state.accessibility ? { artifact: true, role: "Artifact" } : undefined,
    fill: convertBackgroundFill(background, width / POINTS_PER_PIXEL, height / POINTS_PER_PIXEL, themeColors),
    height,
    type: "rect",
    width,
    x: 0,
    y: 0,
  };
}

function convertRectLikeGraphic(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: Fill | GradientFill | { color: ColorValue; type: "solid" } | undefined,
  borderWidth: number | undefined,
  borderColor: ColorValue | undefined,
  borderStyle: string | undefined,
  pageHeight: number,
  themeColors: ThemeColorScheme | undefined,
  transform: PdfTransformMatrix | undefined,
  radius?: number,
): PdfRenderableGraphic | undefined {
  if (width <= 0 || height <= 0) {
    return undefined;
  }

  if (fill?.type === "pattern") {
    return {
      height: pxToPoints(height),
      source: patternRectSvg(
        pxToPoints(width),
        pxToPoints(height),
        fill,
        borderWidth,
        borderColor,
        borderStyle,
        themeColors,
        radius ? pxToPoints(radius) : undefined,
      ),
      transform,
      type: "svg",
      width: pxToPoints(width),
      x: pxToPoints(x),
      y: toPdfY(y + height, pageHeight),
    };
  }

  return {
    fill: convertFill(fill, x, y, width, height, pageHeight, themeColors),
    height: pxToPoints(height),
    radius: radius ? pxToPoints(radius) : undefined,
    stroke: convertStroke(borderWidth, borderColor, borderStyle, themeColors),
    transform,
    type: "rect",
    width: pxToPoints(width),
    x: pxToPoints(x),
    y: toPdfY(y + height, pageHeight),
  };
}

function convertFill(
  fill: Fill | GradientFill | { color: ColorValue; type: "solid" } | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  pageHeight: number,
  themeColors: ThemeColorScheme | undefined,
  opacity?: number,
): PdfFill | undefined {
  if (!fill) {
    return undefined;
  }

  if (fill.type === "solid") {
    const color = toPdfColor(fill.color, themeColors);
    return color ? { color, opacity, space: "solid" } : undefined;
  }

  if (fill.type === "pattern") {
    const color = toPdfColor(fill.background ?? fill.foreground, themeColors);
    return color ? { color, opacity, space: "solid" } : undefined;
  }

  if (fill.type === "image") {
    return undefined;
  }

  const stops = fill.stops.filter((stop) => Boolean(toPdfColor(stop.color, themeColors)));
  if (stops.length < 2) {
    const fallback = stops[0];
    if (!fallback) {
      return undefined;
    }
    const color = toPdfColor(fallback.color, themeColors);
    return color ? { color, opacity, space: "solid" } : undefined;
  }

  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  const firstColor = toPdfColor(first.color, themeColors)!;
  const lastColor = toPdfColor(last.color, themeColors)!;

  if (fill.type === "linear") {
    const angle = ((fill.angle ?? 0) * Math.PI) / 180;
    const halfWidth = pxToPoints(width) / 2;
    const halfHeight = pxToPoints(height) / 2;
    const centerX = pxToPoints(x) + halfWidth;
    const centerY = toPdfY(y + height / 2, pageHeight);
    const dx = Math.cos(angle) * halfWidth;
    const dy = Math.sin(angle) * halfHeight;

    return {
      endX: centerX + dx,
      endY: centerY + dy,
      opacity,
      space: "linear-gradient",
      startX: centerX - dx,
      startY: centerY - dy,
      stops: [
        { color: firstColor, offset: first.position / 100 },
        { color: lastColor, offset: last.position / 100 },
      ],
    };
  }

  return {
    endRadius: Math.max(pxToPoints(width), pxToPoints(height)) / 2,
    endX: pxToPoints(x + width / 2),
    endY: toPdfY(y + height / 2, pageHeight),
    opacity,
    space: "radial-gradient",
    startRadius: 0,
    startX: pxToPoints(x + width / 2),
    startY: toPdfY(y + height / 2, pageHeight),
    stops: [
      { color: firstColor, offset: first.position / 100 },
      { color: lastColor, offset: last.position / 100 },
    ],
  };
}

function convertBackgroundFill(
  background: SlideBackground | PatternBackground | { color: ColorValue; type: "solid" },
  widthPx: number,
  heightPx: number,
  themeColors: ThemeColorScheme | undefined,
): PdfFill | undefined {
  if (background.type === "solid") {
    const color = toPdfColor(background.color, themeColors);
    return color ? { color, space: "solid" } : undefined;
  }

  if (background.type === "gradient") {
    return convertFill(
      {
        angle: background.angle,
        stops: background.stops,
        type: "linear",
      },
      0,
      0,
      widthPx,
      heightPx,
      pxToPoints(heightPx),
      themeColors,
    );
  }

  const color = toPdfColor(background.type === "pattern" ? background.background : "#FFFFFF", themeColors);
  return color ? { color, space: "solid" } : undefined;
}

function convertStroke(
  width: number | undefined,
  color: ColorValue | undefined,
  style: string | undefined,
  themeColors: ThemeColorScheme | undefined,
  opacity?: number,
) {
  if (!width || !color) {
    return undefined;
  }

  const pdfColor = toPdfColor(color, themeColors);
  if (!pdfColor) {
    return undefined;
  }

  return {
    color: pdfColor,
    dash: style === "dashed" || style === "dotDash"
      ? [6, 3]
      : style === "dotted"
        ? [1, 3]
        : undefined,
    opacity,
    style: style === "dotDash" ? "dashed" : (style as "dashed" | "dotted" | "solid" | undefined),
    width: pxToPoints(width),
  };
}

function toPdfColor(color: ColorValue, themeColors: ThemeColorScheme | undefined): PdfColor | undefined {
  const resolved = resolveColorValue(color, themeColors);
  if (!resolved) {
    return undefined;
  }

  const normalized = resolved.startsWith("#")
    ? resolved
    : COLOR_NAME_MAP[resolved.toLowerCase()] ?? resolved;
  const match = normalized.match(/^#?([0-9a-f]{6})$/i);
  if (!match) {
    return undefined;
  }

  const hex = match[1]!;
  return {
    b: Number.parseInt(hex.slice(4, 6), 16) / 255,
    g: Number.parseInt(hex.slice(2, 4), 16) / 255,
    r: Number.parseInt(hex.slice(0, 2), 16) / 255,
    space: "rgb",
  };
}

function buildSpeakerNoteAnnotation(notes: PaperDocument["slides"][number]["notes"] | undefined, pageHeight: number): PdfTextAnnotationSpec | undefined {
  const contents = notesToString(notes);
  if (!contents) {
    return undefined;
  }

  return {
    contents,
    kind: "note",
    open: false,
    rect: [12, Math.max(12, pageHeight - 28), 28, Math.max(28, pageHeight - 12)],
    title: DEFAULT_NOTE_TITLE,
  };
}

function notesToString(notes: PaperDocument["slides"][number]["notes"] | undefined): string | undefined {
  if (!notes) {
    return undefined;
  }
  if (typeof notes === "string") {
    return notes.trim() || undefined;
  }
  const value = notes
    .map((paragraph) => paragraph.runs.map((run) => run.text).join(""))
    .join("\n")
    .trim();
  return value || undefined;
}

function addRectToLink(
  link: PdfLinkTarget,
  rect: [number, number, number, number],
): LinkAnnotation {
  return link.kind === "link-external"
    ? { kind: "link-external", rect, url: link.url }
    : { destination: link.destination, kind: "link-internal", rect };
}

function resolvePdfLink(
  hyperlink: string | HyperlinkTarget,
  slideIndex: number,
  pageHeight: number,
  slideCount: number,
): PdfLinkTarget | undefined {
  const hyperlinkRels: Array<{ external?: boolean; rId: string; url: string }> = [];
  const counter = { current: 1 };
  const { hlinkXml: _ignored } = resolveHyperlink(hyperlink, hyperlinkRels, counter);
  const relation = hyperlinkRels[0];

  if (typeof hyperlink !== "string" && hyperlink.action) {
    const destination = resolveActionDestination(hyperlink.action, slideIndex, slideCount, pageHeight);
    return destination
      ? { destination, kind: "link-internal" }
      : undefined;
  }

  if (!relation) {
    return undefined;
  }

  if (relation.external === false) {
    const match = relation.url.match(/^slide(\d+)\.xml$/);
    const targetSlide = match ? Number.parseInt(match[1]!, 10) - 1 : Number.NaN;
    if (!Number.isInteger(targetSlide) || targetSlide < 0 || targetSlide >= slideCount) {
      getLogger().warn(
        `[pptx-to-pdf] Removing hyperlink on slide ${slideIndex + 1} targeting non-existent slide ${targetSlide + 1}.`,
      );
      return undefined;
    }
    return {
      destination: {
        left: 0,
        pageIndex: targetSlide,
        top: pageHeight,
      },
      kind: "link-internal",
    };
  }

  return {
    kind: "link-external",
    url: relation.url,
  };
}

function resolveActionDestination(
  action: NonNullable<HyperlinkTarget["action"]>,
  slideIndex: number,
  slideCount: number,
  pageHeight: number,
): PdfInternalLinkAnnotationSpec["destination"] | undefined {
  let targetPageIndex: number | undefined;
  switch (action) {
    case "firstSlide":
      targetPageIndex = 0;
      break;
    case "lastSlide":
      targetPageIndex = slideCount - 1;
      break;
    case "nextSlide":
      targetPageIndex = slideIndex + 1 < slideCount ? slideIndex + 1 : undefined;
      break;
    case "previousSlide":
      targetPageIndex = slideIndex > 0 ? slideIndex - 1 : undefined;
      break;
    case "endShow":
      targetPageIndex = undefined;
      break;
  }

  if (targetPageIndex === undefined) {
    return undefined;
  }

  return {
    left: 0,
    pageIndex: targetPageIndex,
    top: pageHeight,
  };
}

function assertValidSlideDimension(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > 40000) {
    throw new PaperError(
      `Invalid slide ${label}: ${value} (must be between 1 and 40000 pixels)`,
      { code: "VALIDATION_FAILED", phase: "validation" },
    );
  }
}

function assertNotAborted(signal: AbortSignal | undefined, slideIndex: number): void {
  if (signal?.aborted) {
    throw new PaperError(
      `Render cancelled at slide ${slideIndex}`,
      { code: "RENDER_CANCELLED", phase: "rendering", slideIndex },
    );
  }
}

function pxToPoints(value: number): number {
  return value * POINTS_PER_PIXEL;
}

function toPdfY(topPx: number, pageHeightPt: number): number {
  return pageHeightPt - pxToPoints(topPx);
}

function toPdfTextBaseline(topPx: number, lineHeightPx: number, pageHeightPt: number): number {
  return pageHeightPt - pxToPoints(topPx + lineHeightPx * 0.2);
}

function toPdfRect(
  x: number,
  y: number,
  width: number,
  height: number,
  pageHeightPt: number,
): [number, number, number, number] {
  return [
    pxToPoints(x),
    toPdfY(y + height, pageHeightPt),
    pxToPoints(x + width),
    toPdfY(y, pageHeightPt),
  ];
}

function effectiveTextStyle(style: TextStyle | undefined, fontScale: number | undefined): TextStyle | undefined {
  if (!style || !fontScale || fontScale >= 100000) {
    return style;
  }

  return {
    ...style,
    fontSize: ((style.fontSize ?? 14) * fontScale) / 100000,
  };
}

function buildNodeTransform(node: LayoutNode): PdfTransformMatrix | undefined {
  const rotation = node.style?.rotation ?? 0;
  if (!rotation) {
    return undefined;
  }

  const cx = pxToPoints(node.layout.x + node.layout.width / 2);
  const cy = pxToPoints(node.layout.y + node.layout.height / 2);
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return [
    cos,
    sin,
    -sin,
    cos,
    cx - (cos * cx) + (sin * cy),
    cy - (sin * cx) - (cos * cy),
  ];
}

function combineTransforms(
  left: PdfTransformMatrix | undefined,
  right: PdfTransformMatrix | undefined,
): PdfTransformMatrix | undefined {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function transformPoint(
  transform: PdfTransformMatrix | undefined,
  x: number,
  y: number,
): [number, number] {
  if (!transform) {
    return [x, y];
  }

  const [a, b, c, d, e, f] = transform;
  return [
    (a * x) + (c * y) + e,
    (b * x) + (d * y) + f,
  ];
}

function transformRect(
  transform: PdfTransformMatrix | undefined,
  rect: [number, number, number, number],
): [number, number, number, number] {
  if (!transform) {
    return rect;
  }

  const [left, bottom, right, top] = rect;
  const points = [
    transformPoint(transform, left, bottom),
    transformPoint(transform, right, bottom),
    transformPoint(transform, right, top),
    transformPoint(transform, left, top),
  ];

  return [
    Math.min(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[1])),
  ];
}

async function loadBinarySource(source: string): Promise<Buffer> {
  if (source.startsWith("data:")) {
    const commaIndex = source.indexOf(",");
    const base64 = source.slice(commaIndex + 1);
    validateDataUrlSize(base64);
    return Buffer.from(base64, "base64");
  }

  if (source.startsWith("http://") || source.startsWith("https://")) {
    validateFetchUrl(source);
    const response = await fetchWithRetry(source, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      throw new PaperError(
        `Failed to fetch image asset: ${response.status} ${response.statusText}`,
        { code: "MEDIA_FETCH_FAILED", phase: "media" },
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (existsSync(source)) {
    return readFile(source);
  }

  throw new PaperError(
    `Unsupported image source for PPTX to PDF conversion: ${source.slice(0, 80)}`,
    { code: "MEDIA_FETCH_FAILED", phase: "media" },
  );
}

function buildPdfaMetadataXml(
  meta: {
    author?: string;
    creator?: string;
    producer?: string;
    title?: string;
  },
  lang: string,
  conformance: "1b" | "2b",
): string {
  const producer = meta.producer ?? DEFAULT_PRODUCER;
  const creator = meta.creator ?? producer;
  const now = new Date().toISOString();
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(meta.title ?? "")}</rdf:li></rdf:Alt></dc:title>\n<dc:creator><rdf:Seq><rdf:li>${escapeXml(meta.author ?? "")}</rdf:li></rdf:Seq></dc:creator>\n<dc:description><rdf:Alt><rdf:li xml:lang="${escapeXml(lang)}"></rdf:li></rdf:Alt></dc:description>\n<pdf:Producer>${escapeXml(producer)}</pdf:Producer>\n<xmp:CreatorTool>${escapeXml(creator)}</xmp:CreatorTool>\n<xmp:CreateDate>${escapeXml(now)}</xmp:CreateDate>\n<xmp:ModifyDate>${escapeXml(now)}</xmp:ModifyDate>\n<xmp:MetadataDate>${escapeXml(now)}</xmp:MetadataDate>\n<pdfaid:part>${conformance === "1b" ? "1" : "2"}</pdfaid:part>\n<pdfaid:conformance>B</pdfaid:conformance>\n</rdf:Description>\n</rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>`;
}

function applyTextTransform(text: string, transform?: string): string {
  if (!transform || transform === "none") {
    return text;
  }
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  if (transform === "capitalize") {
    return text.replace(/\b\w/g, (value) => value.toUpperCase());
  }
  return text;
}

function isCjkCodePoint(cp: number): boolean {
  return (
    (cp >= 0x3000 && cp <= 0x9FFF) ||
    (cp >= 0xAC00 && cp <= 0xD7AF) ||
    (cp >= 0xF900 && cp <= 0xFAFF) ||
    (cp >= 0xFF00 && cp <= 0xFFEF) ||
    (cp >= 0x20000 && cp <= 0x2FA1F)
  );
}

function normalizeDashStyle(style: LayoutConnector["lineDashStyle"]): "dashed" | "dotted" | "solid" | undefined {
  if (style === "dotDash") {
    return "dashed";
  }
  return style;
}

function ellipseSvg(
  width: number,
  height: number,
  fill: Fill | GradientFill | { color: ColorValue; type: "solid" } | undefined,
  borderWidth: number | undefined,
  borderColor: ColorValue | undefined,
  borderStyle: string | undefined,
  themeColors: ThemeColorScheme | undefined,
  opacity?: number,
): string {
  const fillColor = fill && "type" in fill && fill.type === "solid"
    ? resolveColorValue(fill.color, themeColors) ?? "#000000"
    : fill && "type" in fill && (fill.type === "linear" || fill.type === "radial")
      ? resolveColorValue(fill.stops[0]?.color, themeColors) ?? "#000000"
      : fill && "type" in fill && fill.type === "pattern"
        ? resolveColorValue(fill.background, themeColors) ?? "#000000"
      : "none";
  const strokeColor = borderColor ? resolveColorValue(borderColor, themeColors) ?? "#000000" : "none";
  const strokeDasharray = borderStyle === "dashed" || borderStyle === "dotDash"
    ? ' stroke-dasharray="6 3"'
    : borderStyle === "dotted"
      ? ' stroke-dasharray="1 3"'
      : "";
  const opacityAttr = opacity !== undefined ? ` opacity="${opacity}"` : "";
  const strokeWidth = borderWidth ? pxToPoints(borderWidth) : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"${strokeDasharray}${opacityAttr} /></svg>`;
}

function patternRectSvg(
  width: number,
  height: number,
  pattern: PatternFill | PatternBackground,
  borderWidth: number | undefined,
  borderColor: ColorValue | undefined,
  borderStyle: string | undefined,
  themeColors: ThemeColorScheme | undefined,
  radius?: number,
): string {
  const background = resolveColorValue(pattern.background, themeColors) ?? "#FFFFFF";
  const foreground = resolveColorValue(pattern.foreground, themeColors) ?? "#000000";
  const strokeColor = borderColor ? resolveColorValue(borderColor, themeColors) ?? "#000000" : undefined;
  const strokeDasharray = borderStyle === "dashed" || borderStyle === "dotDash"
    ? ' stroke-dasharray="6 3"'
    : borderStyle === "dotted"
      ? ' stroke-dasharray="1 3"'
      : "";
  const radiusAttr = radius ? ` rx="${radius}" ry="${radius}"` : "";
  const strokeWidth = borderWidth ? pxToPoints(borderWidth) : 0;
  const strokeAttr = strokeColor
    ? ` stroke="${strokeColor}" stroke-width="${strokeWidth}"${strokeDasharray}`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${background}"${radiusAttr} />`,
    buildPatternSvgElements(pattern.pattern, width, height, foreground),
    strokeColor
      ? `<rect x="0" y="0" width="${width}" height="${height}" fill="none"${strokeAttr}${radiusAttr} />`
      : "",
    "</svg>",
  ].join("");
}

function buildPatternSvgElements(
  pattern: PatternFill["pattern"] | PatternBackground["pattern"],
  width: number,
  height: number,
  color: string,
): string {
  switch (pattern) {
    case "ltHorz":
      return buildHorizontalPattern(width, height, color, 10, 0.35, 1);
    case "dkHorz":
      return buildHorizontalPattern(width, height, color, 6, 0.6, 1.2);
    case "ltVert":
      return buildVerticalPattern(width, height, color, 10, 0.35, 1);
    case "dkVert":
      return buildVerticalPattern(width, height, color, 6, 0.6, 1.2);
    case "ltDnDiag":
      return buildDiagonalPattern(width, height, color, 12, 0.35, 1, "down");
    case "dkDnDiag":
      return buildDiagonalPattern(width, height, color, 8, 0.6, 1.2, "down");
    case "ltUpDiag":
      return buildDiagonalPattern(width, height, color, 12, 0.35, 1, "up");
    case "dkUpDiag":
      return buildDiagonalPattern(width, height, color, 8, 0.6, 1.2, "up");
    case "cross":
      return [
        buildHorizontalPattern(width, height, color, 10, 0.45, 1),
        buildVerticalPattern(width, height, color, 10, 0.45, 1),
      ].join("");
    case "dnDiag":
      return buildDiagonalPattern(width, height, color, 10, 0.5, 1.1, "down");
    case "upDiag":
      return buildDiagonalPattern(width, height, color, 10, 0.5, 1.1, "up");
    case "diagCross":
      return [
        buildDiagonalPattern(width, height, color, 10, 0.45, 1, "down"),
        buildDiagonalPattern(width, height, color, 10, 0.45, 1, "up"),
      ].join("");
    case "smCheck":
      return [
        buildHorizontalPattern(width, height, color, 10, 0.4, 1),
        buildDiagonalPattern(width, height, color, 14, 0.55, 1.1, "up"),
      ].join("");
    case "lgCheck":
      return [
        buildHorizontalPattern(width, height, color, 16, 0.45, 1.15),
        buildVerticalPattern(width, height, color, 16, 0.45, 1.15),
      ].join("");
    case "pct25":
      return buildDotPattern(width, height, color, 12, 0.3, 1.1);
    case "pct50":
      return buildDotPattern(width, height, color, 8, 0.5, 1.2);
    default:
      return buildDotPattern(width, height, color, 10, 0.4, 1.1);
  }
}

function buildHorizontalPattern(
  width: number,
  height: number,
  color: string,
  spacing: number,
  opacity: number,
  strokeWidth: number,
): string {
  const lines: string[] = [];
  for (let y = 0; y <= height; y += spacing) {
    lines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" />`,
    );
  }
  return lines.join("");
}

function buildVerticalPattern(
  width: number,
  height: number,
  color: string,
  spacing: number,
  opacity: number,
  strokeWidth: number,
): string {
  const lines: string[] = [];
  for (let x = 0; x <= width; x += spacing) {
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" />`,
    );
  }
  return lines.join("");
}

function buildDiagonalPattern(
  width: number,
  height: number,
  color: string,
  spacing: number,
  opacity: number,
  strokeWidth: number,
  direction: "down" | "up",
): string {
  const lines: string[] = [];
  for (let offset = -height; offset <= width + height; offset += spacing) {
    if (direction === "down") {
      lines.push(
        `<line x1="${offset}" y1="0" x2="${offset + height}" y2="${height}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" />`,
      );
    } else {
      lines.push(
        `<line x1="${offset}" y1="${height}" x2="${offset + height}" y2="0" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${strokeWidth}" />`,
      );
    }
  }
  return lines.join("");
}

function buildDotPattern(
  width: number,
  height: number,
  color: string,
  spacing: number,
  opacity: number,
  radius: number,
): string {
  const dots: string[] = [];
  for (let y = spacing / 2; y <= height; y += spacing) {
    for (let x = spacing / 2; x <= width; x += spacing) {
      dots.push(
        `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity="${opacity}" />`,
      );
    }
  }
  return dots.join("");
}

function buildShapePath(shapeType: string, widthPx: number, heightPx: number): string | undefined {
  const width = pxToPoints(widthPx);
  const height = pxToPoints(heightPx);
  const move = (x: number, y: number) => `${x} ${height - y} m`;
  const line = (x: number, y: number) => `${x} ${height - y} l`;
  const close = "h";

  const polygon = (points: Array<[number, number]>) => [
    move(points[0]![0], points[0]![1]),
    ...points.slice(1).map(([x, y]) => line(x, y)),
    close,
  ].join("\n");

  switch (shapeType) {
    case "triangle":
      return polygon([[width / 2, 0], [width, height], [0, height]]);
    case "diamond":
      return polygon([[width / 2, 0], [width, height / 2], [width / 2, height], [0, height / 2]]);
    case "rightArrow": {
      const shaftHeight = height * 0.4;
      const shaftY = (height - shaftHeight) / 2;
      const headStart = width * 0.65;
      return polygon([
        [0, shaftY],
        [headStart, shaftY],
        [headStart, 0],
        [width, height / 2],
        [headStart, height],
        [headStart, shaftY + shaftHeight],
        [0, shaftY + shaftHeight],
      ]);
    }
    case "leftArrow": {
      const shaftHeight = height * 0.4;
      const shaftY = (height - shaftHeight) / 2;
      const headEnd = width * 0.35;
      return polygon([
        [width, shaftY],
        [headEnd, shaftY],
        [headEnd, 0],
        [0, height / 2],
        [headEnd, height],
        [headEnd, shaftY + shaftHeight],
        [width, shaftY + shaftHeight],
      ]);
    }
    case "parallelogram": {
      const offset = width * 0.2;
      return polygon([[offset, 0], [width, 0], [width - offset, height], [0, height]]);
    }
    case "trapezoid": {
      const offset = width * 0.15;
      return polygon([[offset, 0], [width - offset, 0], [width, height], [0, height]]);
    }
    case "chevron": {
      const point = width * 0.2;
      return polygon([[0, 0], [width - point, 0], [width, height / 2], [width - point, height], [0, height], [point, height / 2]]);
    }
    case "wedgeRectCallout": {
      const bodyHeight = height * 0.75;
      return [
        move(0, 0),
        line(width, 0),
        line(width, bodyHeight),
        line(width * 0.25, bodyHeight),
        line(width * 0.05, height),
        line(width * 0.15, bodyHeight),
        line(0, bodyHeight),
        close,
      ].join("\n");
    }
    default:
      return undefined;
  }
}
