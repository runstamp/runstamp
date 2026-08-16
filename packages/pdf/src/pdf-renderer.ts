import { createHash } from "node:crypto";
import bidiFactory from "bidi-js";
import { deflate } from "pako";
import {
  PDFArray,
  PDFDictionary,
  PDFName,
  PDFNumber,
  PDFRaw,
  PDFRef,
  PDFStream,
  PDFString,
  serializePdfObject,
  type PDFValue,
} from "./pdf-objects.js";
import {
  buildFontInputKey,
  buildEmbeddedFontObjects,
  formatPdfNumber,
  preparedFontSupportsText,
  prepareEmbeddedFonts,
  shapeEmbeddedText,
  type PdfEmbeddedFontInput,
  type PdfFontInput,
  type PreparedEmbeddedFont,
} from "./font-embedding.js";
import { buildPdfBinarySourceKey, loadFontSourceBuffer } from "./font-source.js";
import { preparePdfImage, type PreparedPdfImage } from "./image-embedding.js";
import { createEncryption } from "./encryption/pdf-encrypt.js";
import type { PdfEncryptionConfig } from "./encryption/types.js";
import { PdfError } from "./errors.js";
import {
  buildColorOperators,
  buildRectPath,
  buildRoundedRectPath,
  colorComponents,
  colorToRgb,
  validateColorComponent,
  type PreparedPdfaState,
} from "./pdf-graphics-ops.js";
import {
  appendFlattenedWidgetAppearance,
  buildCheckboxFlags,
  buildCheckboxStateAppearance,
  buildChoiceFieldFlags,
  buildJavaScriptAction,
  buildRadioFieldFlags,
  buildRadioStateAppearance,
  buildTextFieldFlags,
  buildWidgetAppearanceStream,
  isInteractiveWidgetAnnotation,
  isWidgetAnnotation,
  normalizeInteractivePages,
} from "./phases/phase6-widgets.js";
import { writePdfDocument } from "./pdf-writer.js";
import type { PdfVersion } from "./phase9-types.js";
import { RenderContext } from "./render-context.js";
import {
  applyPdfSignaturePlan,
  createPdfSignaturePlan,
  formatPdfSignatureDate,
} from "./phase10-signature.js";
import type { PdfSignOptions } from "./phase10-types.js";
import type {
  PdfBinarySource,
  PdfColor,
  PdfFill,
  PdfGradientStop,
  PdfGraphic,
  PdfImageGraphic,
  PdfLinearGradientFill,
  PdfRadialGradientFill,
  PdfStrokeStyle,
  PdfSvgGraphic,
} from "./phase4-types.js";
import { expandSvgGraphic } from "./svg.js";
import { encodeWinAnsi, escapeWinAnsiBytes } from "./winansi-encoding.js";
import { deterministicPdfFileIdSeed } from "./deterministic-mode.js";
import { measureHelveticaText } from "./helvetica-widths.js";

export interface PdfRenderMeta {
  author?: string;
  creationDate?: Date | string;
  creator?: string;
  keywords?: string[];
  modificationDate?: Date | string;
  producer?: string;
  subject?: string;
  title?: string;
}

export type PdfTransformMatrix = [number, number, number, number, number, number];

export interface PdfRenderableText {
  accessibility?: PdfMarkedContentSpec;
  color?: PdfColor;
  direction?: "auto" | "ltr" | "rtl";
  font?: PdfFontInput;
  fallbackFonts?: PdfEmbeddedFontInput[];
  fontSize: number;
  spaceCount?: number;
  transform?: PdfTransformMatrix;
  value: string;
  width?: number;
  wordSpacing?: number;
  x: number;
  y: number;
}

export type PdfRenderableGraphic = PdfGraphic & {
  accessibility?: PdfMarkedContentSpec;
  layer?: "background" | "foreground";
  transform?: PdfTransformMatrix;
};

export interface PdfMarkedContentSpec {
  actualText?: string;
  alt?: string;
  artifact?: boolean;
  headers?: string[];
  lang?: string;
  role: string;
  scope?: "Column" | "Row";
  structureId?: string;
}

export interface PdfAccessibilityStructureSpec {
  alt?: string;
  headers?: string[];
  id: string;
  lang?: string;
  parentId?: string | null;
  role: string;
  scope?: "Column" | "Row";
}

export interface PdfDocumentAccessibilitySpec {
  lang?: string;
  structure: PdfAccessibilityStructureSpec[];
}

export type PdfPageExtraCommand =
  | string
  | {
      accessibility?: PdfMarkedContentSpec;
      command: string;
    };

export interface PdfRenderedPage {
  annotations?: PdfPageAnnotationSpec[];
  extraCommands?: PdfPageExtraCommand[];
  graphics?: PdfRenderableGraphic[];
  height: number;
  texts: PdfRenderableText[];
  width: number;
}

export interface PdfDestinationSpec {
  left: number;
  pageIndex: number;
  top: number;
  zoom?: number | null;
}

export interface PdfPageLabelSpec {
  prefix?: string;
  startNumber?: number;
  startPage: number;
  style: "arabic" | "roman-lower" | "roman-upper";
}

export interface PdfExternalLinkAnnotationSpec {
  kind: "link-external";
  rect: [number, number, number, number];
  url: string;
}

export interface PdfInternalLinkAnnotationSpec {
  destination: PdfDestinationSpec;
  kind: "link-internal";
  rect: [number, number, number, number];
}

export interface PdfTextAnnotationSpec {
  contents: string;
  kind: "note";
  open?: boolean;
  rect: [number, number, number, number];
  title?: string;
}

export interface PdfHighlightAnnotationSpec {
  color?: PdfColor;
  contents?: string;
  kind: "highlight";
  quadPoints: [number, number, number, number, number, number, number, number];
  rect: [number, number, number, number];
}

export interface PdfTextFieldWidgetSpec {
  calculationScript?: string;
  fontColor?: string;
  fontSize?: number;
  kind: "form-text";
  label?: string;
  maxLength?: number;
  multiline?: boolean;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  rect: [number, number, number, number];
  tabOrder?: number;
  tooltip?: string;
  value?: string;
}

export interface PdfCheckboxWidgetSpec {
  calculationScript?: string;
  checked?: boolean;
  fontColor?: string;
  kind: "form-checkbox";
  label?: string;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  rect: [number, number, number, number];
  tabOrder?: number;
  tooltip?: string;
}

export interface PdfDropdownWidgetSpec {
  calculationScript?: string;
  fontColor?: string;
  kind: "form-dropdown";
  label?: string;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  options: string[];
  rect: [number, number, number, number];
  tabOrder?: number;
  tooltip?: string;
  value?: string;
}

export interface PdfRadioWidgetSpec {
  calculationScript?: string;
  checked?: boolean;
  fontColor?: string;
  group: string;
  kind: "form-radio";
  label?: string;
  name: string;
  readOnly?: boolean;
  required?: boolean;
  rect: [number, number, number, number];
  tabOrder?: number;
  tooltip?: string;
  value: string;
}

export interface PdfSignatureWidgetSpec {
  fieldName: string;
  fontColor?: string;
  fontSize?: number;
  kind: "form-signature";
  label?: string;
  mode: "digital" | "visual";
  rect: [number, number, number, number];
  tabOrder?: number;
  tooltip?: string;
  value?: string;
}

export type PdfWidgetAnnotationSpec =
  | PdfCheckboxWidgetSpec
  | PdfDropdownWidgetSpec
  | PdfRadioWidgetSpec
  | PdfSignatureWidgetSpec
  | PdfTextFieldWidgetSpec;

export type PdfPageAnnotationSpec =
  | PdfCheckboxWidgetSpec
  | PdfDropdownWidgetSpec
  | PdfExternalLinkAnnotationSpec
  | PdfHighlightAnnotationSpec
  | PdfInternalLinkAnnotationSpec
  | PdfTextAnnotationSpec
  | PdfRadioWidgetSpec
  | PdfSignatureWidgetSpec
  | PdfTextFieldWidgetSpec;

export interface PdfOutlineItemSpec {
  children?: PdfOutlineItemSpec[];
  destination: PdfDestinationSpec;
  title: string;
}

export interface PdfDocumentInteractiveSpec {
  accessibility?: PdfDocumentAccessibilitySpec;
  sharedForms?: PdfSharedFormSpec[];
  metadataXml?: string;
  outlines?: PdfOutlineItemSpec[];
  pageLabels?: PdfPageLabelSpec[];
  pdfa?: PdfRenderPdfaSpec;
}

export interface PdfRenderPdfaSpec {
  conformance: "1b" | "2a" | "2b";
  defaultFont?: PdfEmbeddedFontInput;
  defaultFontKey?: string;
  iccProfile: PdfBinarySource;
  outputConditionIdentifier: string;
}

export interface PdfTextEncodingWarning {
  /**
   * Why the character could not be rendered faithfully.
   *
   * - `winansi` — no WinAnsi code point exists, so a `?` was written.
   * - `missing-glyph` — a font *was* selected, but it has no glyph for this
   *   character, so the reader sees `.notdef` (a blank or a box). This is the
   *   more dangerous of the two: the output looks well-formed and the character
   *   is simply gone.
   *
   * Optional for backwards compatibility; absent means `winansi`.
   */
  reason?: "winansi" | "missing-glyph";
  /** The embedded font that lacked the glyph, for `missing-glyph`. */
  fontFamily?: string;
  /** The character that fell outside WinAnsiEncoding. */
  char: string;
  /** Unicode code point of the offending character. */
  codePoint: number;
  /** Suggested ASCII substitution that renders correctly with the standard-14 fonts. */
  suggestion: string;
  /** First 80 characters of the text run that triggered the warning. */
  textPreview: string;
  /** Zero-based page index where the warning was emitted. */
  pageIndex: number;
  /** PDF tagged-structure element id, when available (e.g. headings, list items). */
  elementId?: string;
}

export interface PdfRenderRuntimeOptions {
  assetPolicy?: import("./phase9-types.js").PdfAssetPolicy;
  onPageSerialized?: (pageIndex: number, totalPages: number) => void;
  /**
   * Invoked once per character that cannot be encoded with the standard-14
   * WinAnsi fonts. Lets callers surface actionable warnings instead of silently
   * emitting `?` glyphs (the failure flagged in
   * `docs/0428-claude-test-based-directive2.md` §"@runstamp/pdf" item 4).
   * If you embed a custom font that covers the character, no warning fires.
   */
  onTextEncodingWarning?: (warning: PdfTextEncodingWarning) => void;
}

export interface PdfSharedFormSpec {
  alias: string;
  bbox: [number, number, number, number];
  commands: string;
  fontResourceKey?: string;
}

interface PreparedImageAsset {
  alias: string;
  image: PreparedPdfImage;
}

interface PreparedShadingAsset {
  alias: string;
  fill: PdfLinearGradientFill | PdfRadialGradientFill;
  key: string;
}

interface PreparedFormAsset {
  alias: string;
  form: PdfSharedFormSpec;
}

interface PreparedExtGState {
  alias: string;
  fillOpacity: number;
  key: string;
  strokeOpacity: number;
}

interface PreparedPageResources {
  expandedPages: PdfRenderedPage[];
  extGStates: Map<string, PreparedExtGState>;
  forms: Map<string, PreparedFormAsset>;
  images: Map<string, PreparedImageAsset>;
  shadings: Map<string, PreparedShadingAsset>;
}

interface TaggedContentReference {
  mcid: number;
  pageIndex: number;
  structureId: string;
}

interface PageTagState {
  mcid: number;
  structParents: number;
}

interface PreparedAccessibilityState {
  pageStates: PageTagState[];
  referencesByStructureId: Map<string, TaggedContentReference[]>;
  structure: PdfAccessibilityStructureSpec[];
}

interface PreparedRadioWidget {
  annotation: PdfRadioWidgetSpec;
  offAppearanceRef: PDFRef;
  parentRef: PDFRef;
  onAppearanceRef: PDFRef;
  widgetRef: PDFRef;
}

interface PreparedRadioGroup {
  calculationScript?: string;
  parentRef: PDFRef;
  selectedValue?: string;
  widgets: PreparedRadioWidget[];
}

interface PreparedSignatureTarget {
  annotation: PdfSignatureWidgetSpec;
  fieldName: string;
  pageIndex: number;
}

const DEFAULT_FONT = "Helvetica";
const BUILT_IN_SPECIAL_GLYPHS = new Map<string, { advance: number; byte: number; font: "Symbol" }>([
  ["≥", { advance: 0.549, byte: 0xB3, font: "Symbol" }],
  ["≤", { advance: 0.549, byte: 0xA3, font: "Symbol" }],
  ["−", { advance: 0.549, byte: 0x2D, font: "Symbol" }],
  ["×", { advance: 0.549, byte: 0xB4, font: "Symbol" }],
]);
const BUILT_IN_SUBSCRIPT_DIGITS = new Map<string, string>([
  ["₀", "0"], ["₁", "1"], ["₂", "2"], ["₃", "3"], ["₄", "4"],
  ["₅", "5"], ["₆", "6"], ["₇", "7"], ["₈", "8"], ["₉", "9"],
]);
const BUILT_IN_FALLBACK_PATTERN = /[≥≤−×₀-₉]/u;
const DEFAULT_PRODUCER = "Runstamp PDF";
const JPEG_PROC_SETS = [new PDFName("PDF"), new PDFName("Text"), new PDFName("ImageB"), new PDFName("ImageC"), new PDFName("ImageI")];
const DETERMINISTIC_CONTENT_PADDING = "% Runstamp deterministic content padding padding padding padding padding padding padding";
type BidiDirection = "ltr" | "rtl";

interface BidiApi {
  getEmbeddingLevels(text: string, explicitDirection?: BidiDirection): {
    levels: Uint8Array;
    paragraphs: Array<{ end: number; level: number; start: number }>;
  };
}

let bidiApi: BidiApi | undefined;

function getBidiApi(): BidiApi {
  bidiApi ??= (bidiFactory as () => BidiApi)();
  return bidiApi;
}

function isEmbeddedFontInput(font: PdfFontInput | undefined): font is PdfEmbeddedFontInput {
  return typeof font === "object" && font !== null;
}

function directionForBidiLevel(level: number): BidiDirection {
  return (level & 1) === 1 ? "rtl" : "ltr";
}

function resolveTextDirection(value: string, requested?: "auto" | "ltr" | "rtl"): BidiDirection {
  if (requested && requested !== "auto") {
    return requested;
  }
  return /[\u0590-\u08FF]/u.test(value) ? "rtl" : "ltr";
}

function splitDirectionalTextRuns(value: string, requested?: "auto" | "ltr" | "rtl"): Array<{ direction: BidiDirection; value: string }> {
  if (value.length === 0) {
    return [];
  }
  if (!/[\u0590-\u08FF]/u.test(value)) {
    return [{ direction: resolveTextDirection(value, requested), value }];
  }

  const explicitDirection = requested && requested !== "auto" ? requested : undefined;
  const embedding = getBidiApi().getEmbeddingLevels(value, explicitDirection);
  const { levels } = embedding;
  if (levels.length === 0) {
    return [{ direction: explicitDirection ?? "ltr", value }];
  }

  const runs: Array<{ direction: BidiDirection; value: string }> = [];
  let start = 0;
  let direction = directionForBidiLevel(levels[0] ?? 0);
  for (let index = 1; index < value.length; index += 1) {
    const nextDirection = directionForBidiLevel(levels[index] ?? levels[index - 1] ?? 0);
    if (nextDirection === direction) {
      continue;
    }
    runs.push({ direction, value: value.slice(start, index) });
    start = index;
    direction = nextDirection;
  }
  runs.push({ direction, value: value.slice(start) });

  return runs.filter((run) => run.value.length > 0);
}

function needsActualTextExtractionHint(value: string, text: PdfRenderableText): boolean {
  return !text.accessibility?.actualText && /[\u0590-\u08FF]/u.test(value);
}

function wrapWithActualTextExtractionHint(command: string, value: string, text: PdfRenderableText): string {
  if (!needsActualTextExtractionHint(value, text)) {
    return command;
  }

  return [`/ReversedChars << /ActualText ${escapeBuiltInText(value)} >> BDC`, command, "EMC"].join("\n");
}

interface TextFontRun {
  direction: BidiDirection;
  font: PreparedEmbeddedFont;
  value: string;
}

function selectRunFont(
  value: string,
  primary: PreparedEmbeddedFont | undefined,
  fallbacks: PreparedEmbeddedFont[],
  current: PreparedEmbeddedFont | undefined,
): PreparedEmbeddedFont | undefined {
  if (/^\s$/u.test(value)) {
    return current ?? primary ?? fallbacks[0];
  }
  const candidates = [
    ...(current ? [current] : []),
    ...(primary && primary !== current ? [primary] : []),
    ...fallbacks.filter((font) => font !== current && font !== primary),
  ];
  return candidates.find((font) => preparedFontSupportsText(font, value)) ?? primary ?? fallbacks[0];
}

function buildTextFontRuns(
  text: PdfRenderableText,
  primary: PreparedEmbeddedFont | undefined,
  preparedFonts: Map<string, PreparedEmbeddedFont>,
  onMissingGlyph?: (character: string, font: PreparedEmbeddedFont) => void,
): TextFontRun[] | undefined {
  const fallbacks = (text.fallbackFonts ?? [])
    .map((font) => preparedFonts.get(buildFontInputKey(font)))
    .filter((font): font is PreparedEmbeddedFont => Boolean(font));
  const allFonts = [primary, ...fallbacks].filter((font): font is PreparedEmbeddedFont => Boolean(font));
  if (allFonts.length === 0) {
    return undefined;
  }

  const runs: TextFontRun[] = [];
  for (const directionalRun of splitDirectionalTextRuns(text.value, text.direction)) {
    const fullRunFont = allFonts.find((font) => preparedFontSupportsText(font, directionalRun.value));
    if (fullRunFont) {
      runs.push({ direction: directionalRun.direction, font: fullRunFont, value: directionalRun.value });
      continue;
    }

    let currentFont: PreparedEmbeddedFont | undefined;
    let currentValue = "";
    for (const character of directionalRun.value) {
      const font = selectRunFont(character, primary, fallbacks, currentFont);
      if (!font) {
        continue;
      }
      // `selectRunFont` falls back to the primary font when nothing covers the
      // character, which renders `.notdef`. Detecting it here is the only place
      // the information still exists — downstream there is just a glyph id of 0.
      if (onMissingGlyph && !/\s/u.test(character) && !preparedFontSupportsText(font, character)) {
        onMissingGlyph(character, font);
      }
      if (currentFont && font !== currentFont) {
        runs.push({ direction: directionalRun.direction, font: currentFont, value: currentValue });
        currentValue = "";
      }
      currentFont = font;
      currentValue += character;
    }

    if (currentFont && currentValue.length > 0) {
      runs.push({ direction: directionalRun.direction, font: currentFont, value: currentValue });
      currentValue = "";
    }
  }

  return runs.length > 0 ? runs : undefined;
}

async function buildEmbeddedTextOperator(
  text: PdfRenderableText,
  runs: TextFontRun[],
): Promise<string> {
  const baseDirection = resolveTextDirection(text.value, text.direction);
  const measuredRuns = await Promise.all(runs.map(async (run) => ({
    ...run,
    shapedAtOrigin: await shapeEmbeddedText(
      run.font,
      run.value,
      text.fontSize,
      0,
      text.y,
      run.direction,
      text.wordSpacing ?? 0,
    ),
  })));

  let cursor = baseDirection === "rtl"
    ? text.x + measuredRuns.reduce((sum, run) => sum + run.shapedAtOrigin.totalAdvancePoints, 0)
    : text.x;
  const commands: string[] = [];
  for (const run of measuredRuns) {
    const runX = baseDirection === "rtl"
      ? cursor - run.shapedAtOrigin.totalAdvancePoints
      : cursor;
    const shaped = await shapeEmbeddedText(
      run.font,
      run.value,
      text.fontSize,
      runX,
      text.y,
      run.direction,
      text.wordSpacing ?? 0,
    );
    const runCommand = [
      "BT",
      `/${run.font.alias} ${formatPdfNumber(text.fontSize)} Tf`,
      `${formatPdfNumber(text.wordSpacing ?? 0)} Tw`,
      shaped.content,
      "ET",
    ].join("\n");
    commands.push(wrapWithActualTextExtractionHint(runCommand, run.value, text));
    cursor += (baseDirection === "rtl" ? -1 : 1) * shaped.totalAdvancePoints;
  }
  return commands.join("\n");
}

export function assertExplicitWordSpacingOperators(command: string): void {
  const textObjects = command.match(/BT\n[\s\S]*?\nET/gu) ?? [];
  for (const textObject of textObjects) {
    const spacingOperators = textObject.match(/^-?(?:\d+\.?\d*|\.\d+) Tw$/gmu) ?? [];
    if (spacingOperators.length !== 1) {
      throw new Error("Every PDF text object must set exactly one explicit Tw word-spacing operator.");
    }
  }
}

function escapeBuiltInText(value: string): string {
  return serializePdfObject(new PDFString(value)).toString("utf8");
}

function prepareAccessibilityState(
  accessibility: PdfDocumentAccessibilitySpec | undefined,
  pageCount: number,
): PreparedAccessibilityState | undefined {
  if (!accessibility || accessibility.structure.length === 0) {
    return undefined;
  }

  return {
    pageStates: Array.from({ length: pageCount }, (_, index) => ({ mcid: 0, structParents: index })),
    referencesByStructureId: new Map<string, TaggedContentReference[]>(),
    structure: accessibility.structure,
  };
}

function wrapMarkedContent(
  command: string,
  accessibility: PdfMarkedContentSpec | undefined,
  pageIndex: number,
  preparedAccessibility: PreparedAccessibilityState | undefined,
): string {
  if (!accessibility) {
    return command;
  }

  if (accessibility.artifact) {
    return ["/Artifact BMC", command, "EMC"].join("\n");
  }

  if (!preparedAccessibility || !accessibility.structureId) {
    return command;
  }

  const pageState = preparedAccessibility.pageStates[pageIndex];
  if (!pageState) {
    return command;
  }

  const mcid = pageState.mcid;
  pageState.mcid += 1;
  const refs = preparedAccessibility.referencesByStructureId.get(accessibility.structureId) ?? [];
  refs.push({ mcid, pageIndex, structureId: accessibility.structureId });
  preparedAccessibility.referencesByStructureId.set(accessibility.structureId, refs);

  const propertyParts = [`/MCID ${mcid}`];
  if (accessibility.lang) {
    propertyParts.push(`/Lang ${escapeBuiltInText(accessibility.lang)}`);
  }
  if (accessibility.actualText) {
    propertyParts.push(`/ActualText ${escapeBuiltInText(accessibility.actualText)}`);
  }
  if (accessibility.alt) {
    propertyParts.push(`/Alt ${escapeBuiltInText(accessibility.alt)}`);
  }

  return [`/${accessibility.role} << ${propertyParts.join(" ")} >> BDC`, command, "EMC"].join("\n");
}

function wrapWithMatrix(command: string, transform: PdfTransformMatrix | undefined): string {
  if (!transform) {
    return command;
  }

  const [a, b, c, d, e, f] = transform;
  return [
    "q",
    `${formatPdfNumber(a)} ${formatPdfNumber(b)} ${formatPdfNumber(c)} ${formatPdfNumber(d)} ${formatPdfNumber(e)} ${formatPdfNumber(f)} cm`,
    command,
    "Q",
  ].join("\n");
}

function normalizePdfDateInput(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError("Invalid PDF metadata date");
    }
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    const hours = String(value.getUTCHours()).padStart(2, "0");
    const minutes = String(value.getUTCMinutes()).padStart(2, "0");
    const seconds = String(value.getUTCSeconds()).padStart(2, "0");
    return `D:${year}${month}${day}${hours}${minutes}${seconds}Z00'00'`;
  }
  if (value.startsWith("D:")) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid PDF metadata date: ${value}`);
  }
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const hours = String(parsed.getUTCHours()).padStart(2, "0");
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0");
  const seconds = String(parsed.getUTCSeconds()).padStart(2, "0");
  return `D:${year}${month}${day}${hours}${minutes}${seconds}Z00'00'`;
}

function buildInfoDictionary(meta: PdfRenderMeta): PDFDictionary {
  const entries: Record<string, PDFString> = {
    Producer: new PDFString(meta.producer ?? DEFAULT_PRODUCER),
  };

  if (meta.author) {
    entries.Author = new PDFString(meta.author);
  }
  if (meta.creator) {
    entries.Creator = new PDFString(meta.creator);
  }
  if (meta.creationDate) {
    entries.CreationDate = new PDFString(normalizePdfDateInput(meta.creationDate) as string);
  }
  if (meta.keywords && meta.keywords.length > 0) {
    entries.Keywords = new PDFString(meta.keywords.join(", "));
  }
  if (meta.modificationDate) {
    entries.ModDate = new PDFString(normalizePdfDateInput(meta.modificationDate) as string);
  }
  if (meta.subject) {
    entries.Subject = new PDFString(meta.subject);
  }
  if (meta.title) {
    entries.Title = new PDFString(meta.title);
  }

  return new PDFDictionary(entries);
}

function buildBuiltInTextOperator(
  text: PdfRenderableText,
  aliasLookup: Map<string, string>,
  pageIndex: number,
  onWarning: ((warning: PdfTextEncodingWarning) => void) | undefined,
): string {
  const fontName = typeof text.font === "string" ? text.font : DEFAULT_FONT;
  const alias = aliasLookup.get(fontName) ?? aliasLookup.get(DEFAULT_FONT);
  if (!alias) {
    throw new Error(`Built-in font resource is missing for ${fontName}`);
  }
  if (BUILT_IN_FALLBACK_PATTERN.test(text.value)) {
    const commands: string[] = [];
    let cursorX = text.x;
    let ordinary = "";
    const flushOrdinary = (): void => {
      if (ordinary.length === 0) return;
      const encoded = encodeWinAnsi(ordinary, onWarning ? (unmappable) => onWarning({
        char: unmappable.char,
        codePoint: unmappable.codePoint,
        suggestion: unmappable.suggestion,
        textPreview: text.value.slice(0, 80),
        pageIndex,
        elementId: text.accessibility?.structureId,
      }) : undefined);
      const textCommands = [
        "BT",
        `/${alias} ${formatPdfNumber(text.fontSize)} Tf`,
        `${formatPdfNumber(text.wordSpacing ?? 0)} Tw`,
      ];
      textCommands.push(
        `1 0 0 1 ${formatPdfNumber(cursorX)} ${formatPdfNumber(text.y)} Tm`,
        `${escapeWinAnsiBytes(encoded)} Tj`,
        "ET",
      );
      commands.push(textCommands.join("\n"));
      const spaces = ordinary.match(/ /gu)?.length ?? 0;
      cursorX += measureHelveticaText(ordinary, text.fontSize) + ((text.wordSpacing ?? 0) * spaces);
      ordinary = "";
    };

    for (const character of text.value) {
      const special = BUILT_IN_SPECIAL_GLYPHS.get(character);
      const subscript = BUILT_IN_SUBSCRIPT_DIGITS.get(character);
      if (!special && !subscript) {
        ordinary += character;
        continue;
      }
      flushOrdinary();
      const glyphAlias = special ? aliasLookup.get(special.font) : aliasLookup.get(DEFAULT_FONT);
      if (!glyphAlias) {
        throw new Error(`Built-in fallback font resource is missing for ${character}`);
      }
      const glyphSize = subscript ? text.fontSize * 0.7 : text.fontSize;
      const glyphY = subscript ? text.y - (text.fontSize * 0.2) : text.y;
      const glyphByte = special?.byte ?? subscript?.charCodeAt(0);
      if (glyphByte === undefined) {
        throw new Error(`Built-in fallback glyph is missing for ${character}`);
      }
      const glyphBytes = Buffer.from([glyphByte]);
      const glyphCommand = [
        "BT",
        `/${glyphAlias} ${formatPdfNumber(glyphSize)} Tf`,
        "0 Tw",
        `1 0 0 1 ${formatPdfNumber(cursorX)} ${formatPdfNumber(glyphY)} Tm`,
        `${escapeWinAnsiBytes(glyphBytes)} Tj`,
        "ET",
      ].join("\n");
      commands.push(`/Span << /ActualText ${escapeBuiltInText(character)} >> BDC\n${glyphCommand}\nEMC`);
      cursorX += subscript ? measureHelveticaText(subscript, glyphSize) : text.fontSize * (special?.advance ?? 0);
    }
    flushOrdinary();
    return commands.join("\n");
  }

  const commands = [
    "BT",
    `/${alias} ${formatPdfNumber(text.fontSize)} Tf`,
    `${formatPdfNumber(text.wordSpacing ?? 0)} Tw`,
  ];

  commands.push(`1 0 0 1 ${formatPdfNumber(text.x)} ${formatPdfNumber(text.y)} Tm`);
  const encoded = onWarning
    ? encodeWinAnsi(text.value, (unmappable) => {
        onWarning({
          char: unmappable.char,
          codePoint: unmappable.codePoint,
          suggestion: unmappable.suggestion,
          textPreview: text.value.slice(0, 80),
          pageIndex,
          elementId: text.accessibility?.structureId,
        });
      })
    : encodeWinAnsi(text.value);
  commands.push(`${escapeWinAnsiBytes(encoded)} Tj`);
  commands.push("ET");
  return commands.join("\n");
}

async function renderTextOperator(
  text: PdfRenderableText,
  aliasLookup: Map<string, string>,
  preparedFonts: Map<string, PreparedEmbeddedFont>,
  pageIndex: number,
  preparedAccessibility: PreparedAccessibilityState | undefined,
  onTextEncodingWarning: ((warning: PdfTextEncodingWarning) => void) | undefined,
  pdfa: PreparedPdfaState | undefined,
): Promise<string> {
  const font = text.font ?? DEFAULT_FONT;
  // Shared by both call sites so the embedded-font path reports missing glyphs
  // the same way the built-in path reports unmappable characters.
  const reportMissingGlyph = onTextEncodingWarning
    ? (character: string, missingIn: PreparedEmbeddedFont): void => {
        onTextEncodingWarning({
          reason: "missing-glyph",
          fontFamily: missingIn.family,
          char: character,
          codePoint: character.codePointAt(0) ?? 0,
          suggestion: "",
          textPreview: text.value.slice(0, 80),
          pageIndex,
          ...(text.accessibility?.structureId ? { elementId: text.accessibility.structureId } : {}),
        });
      }
    : undefined;

  const wrap = (command: string): string => {
    assertExplicitWordSpacingOperators(command);
    const colored = text.color
      ? ["q", ...buildColorOperators(text.color, "fill", pdfa), command, "Q"].join("\n")
      : command;
    return wrapMarkedContent(colored, text.accessibility, pageIndex, preparedAccessibility);
  };
  if (text.value.length === 0) {
    return wrap("");
  }
  if (!isEmbeddedFontInput(font)) {
    const runs = buildTextFontRuns(text, undefined, preparedFonts, reportMissingGlyph);
    if (runs) {
      return wrap(await buildEmbeddedTextOperator(text, runs));
    }
    return wrap(
      buildBuiltInTextOperator(text, aliasLookup, pageIndex, onTextEncodingWarning),
    );
  }

  const prepared = preparedFonts.get(buildFontInputKey(font));
  const runs = buildTextFontRuns(text, prepared, preparedFonts, reportMissingGlyph);
  if (!runs) {
    throw new Error(`Prepared font missing for ${font.family} while rendering "${text.value.slice(0, 80)}"`);
  }

  return wrap(await buildEmbeddedTextOperator(text, runs));
}

function clampUnitInterval(value: number | undefined, label: string): number {
  const resolved = value ?? 1;
  if (!Number.isFinite(resolved) || resolved < 0 || resolved > 1) {
    throw new TypeError(`${label} must be between 0 and 1`);
  }
  return resolved;
}

function colorToKey(color: PdfColor): string {
  return `${color.space}:${colorComponents(color).map((value) => value.toFixed(4)).join(",")}`;
}

function buildExtGStateKey(fillOpacity: number, strokeOpacity: number): string {
  return `${fillOpacity.toFixed(4)}:${strokeOpacity.toFixed(4)}`;
}

function fillExtGStateKey(fill: PdfFill | undefined): string | undefined {
  const opacity = clampUnitInterval(fill?.space === "solid" ? fill.opacity : undefined, "fill.opacity");
  return opacity < 1 ? buildExtGStateKey(opacity, opacity) : undefined;
}

function strokeExtGStateKey(stroke: PdfStrokeStyle | undefined): string | undefined {
  const opacity = clampUnitInterval(stroke?.opacity, "stroke.opacity");
  return opacity < 1 ? buildExtGStateKey(opacity, opacity) : undefined;
}

function imageExtGStateKey(opacity: number | undefined): string | undefined {
  const resolved = clampUnitInterval(opacity, "image.opacity");
  return resolved < 1 ? buildExtGStateKey(resolved, resolved) : undefined;
}

function buildGradientKey(fill: PdfLinearGradientFill | PdfRadialGradientFill): string {
  const stopKey = fill.stops.map((stop) => `${stop.offset.toFixed(4)}:${colorToKey(stop.color)}`).join("|");
  if (fill.space === "linear-gradient") {
    return `linear:${fill.startX},${fill.startY},${fill.endX},${fill.endY}:${stopKey}`;
  }
  return `radial:${fill.startX},${fill.startY},${fill.startRadius},${fill.endX},${fill.endY},${fill.endRadius}:${stopKey}`;
}

function buildImageKey(graphic: PdfImageGraphic, prepared: PreparedPdfImage): string {
  return `${graphic.format ?? prepared.format}:${prepared.hash}`;
}

function normalizeDash(stroke: PdfStrokeStyle): { dashArray: number[]; lineCap: "butt" | "round" | "square" } {
  const style = stroke.style ?? "solid";
  if (stroke.dash && stroke.dash.length > 0) {
    return { dashArray: stroke.dash, lineCap: stroke.lineCap ?? "butt" };
  }
  if (style === "dashed") {
    return { dashArray: [6, 3], lineCap: stroke.lineCap ?? "butt" };
  }
  if (style === "dotted") {
    return { dashArray: [1, 3], lineCap: stroke.lineCap ?? "round" };
  }
  return { dashArray: [], lineCap: stroke.lineCap ?? "butt" };
}

function lineCapOperator(lineCap: "butt" | "round" | "square"): string {
  if (lineCap === "round") {
    return "1 J";
  }
  if (lineCap === "square") {
    return "2 J";
  }
  return "0 J";
}

function buildStrokeOperators(stroke: PdfStrokeStyle | undefined, pdfa?: PreparedPdfaState): string[] {
  if (!stroke) {
    return [];
  }

  const width = stroke.width ?? 1;
  if (!Number.isFinite(width) || width <= 0) {
    throw new TypeError("stroke.width must be greater than zero");
  }

  const { dashArray, lineCap } = normalizeDash(stroke);
  return [
    ...buildColorOperators(stroke.color, "stroke", pdfa),
    `${formatPdfNumber(width)} w`,
    `${lineCapOperator(lineCap)}`,
    `[${dashArray.map(formatPdfNumber).join(" ")}] 0 d`,
  ];
}

function buildFillOperators(fill: PdfFill | undefined, pdfa?: PreparedPdfaState): string[] {
  if (!fill || fill.space !== "solid") {
    return [];
  }
  return buildColorOperators(fill.color, "fill", pdfa);
}

function buildPathPaintOperator(fill: PdfFill | undefined, stroke: PdfStrokeStyle | undefined, fillRule?: "evenodd" | "nonzero"): string {
  if (fill && stroke) {
    return fillRule === "evenodd" ? "B*" : "B";
  }
  if (fill) {
    return fillRule === "evenodd" ? "f*" : "f";
  }
  if (stroke) {
    return "S";
  }
  return "n";
}

function wrapWithTransform(
  commands: string[],
  transform: { scaleX?: number; scaleY?: number; x?: number; y?: number },
): string[] {
  if (transform.x === undefined && transform.y === undefined && transform.scaleX === undefined && transform.scaleY === undefined) {
    return commands;
  }

  return [
    "q",
    `${formatPdfNumber(transform.scaleX ?? 1)} 0 0 ${formatPdfNumber(transform.scaleY ?? 1)} ${formatPdfNumber(transform.x ?? 0)} ${formatPdfNumber(transform.y ?? 0)} cm`,
    ...commands,
    "Q",
  ];
}

function renderSolidPath(
  path: string,
  fill: PdfFill | undefined,
  stroke: PdfStrokeStyle | undefined,
  extGStates: Map<string, PreparedExtGState>,
  pdfa: PreparedPdfaState | undefined,
  fillRule?: "evenodd" | "nonzero",
): string {
  const commands = ["q"];
  const fillExt = fillExtGStateKey(fill);
  const strokeExt = strokeExtStateKey(stroke);
  const extKey = fillExt ?? strokeExt;
  if (extKey) {
    const ext = extGStates.get(extKey);
    if (ext) {
      commands.push(`/${ext.alias} gs`);
    }
  }
  commands.push(...buildFillOperators(fill, pdfa));
  commands.push(...buildStrokeOperators(stroke, pdfa));
  commands.push(path);
  commands.push(buildPathPaintOperator(fill, stroke, fillRule));
  commands.push("Q");
  return commands.join("\n");
}

function strokeExtStateKey(stroke: PdfStrokeStyle | undefined): string | undefined {
  return strokeExtGStateKey(stroke);
}

function buildGradientClipCommands(
  path: string,
  fill: PdfLinearGradientFill | PdfRadialGradientFill,
  shadings: Map<string, PreparedShadingAsset>,
  extGStates: Map<string, PreparedExtGState>,
  pdfa: PreparedPdfaState | undefined,
): string {
  const key = buildGradientKey(fill);
  const shading = shadings.get(key);
  if (!shading) {
    throw new Error(`Missing gradient shading for ${key}`);
  }

  const commands = ["q"];
  const extKey = fillExtGStateKey(fill);
  if (extKey) {
    const ext = extGStates.get(extKey);
    if (ext) {
      commands.push(`/${ext.alias} gs`);
    }
  }
  commands.push(path);
  commands.push("W");
  commands.push("n");
  commands.push(`/${shading.alias} sh`);
  commands.push("Q");
  return commands.join("\n");
}

function renderRectGraphic(
  graphic: Extract<PdfRenderableGraphic, { type: "rect" }>,
  shadings: Map<string, PreparedShadingAsset>,
  extGStates: Map<string, PreparedExtGState>,
  pdfa: PreparedPdfaState | undefined,
): string[] {
  const path = graphic.radius && graphic.radius > 0
    ? buildRoundedRectPath(graphic.x, graphic.y, graphic.width, graphic.height, graphic.radius)
    : buildRectPath(graphic.x, graphic.y, graphic.width, graphic.height);

  if (graphic.fill && graphic.fill.space !== "solid") {
    const commands = [buildGradientClipCommands(path, graphic.fill, shadings, extGStates, pdfa)];
    if (graphic.stroke) {
      commands.push(renderSolidPath(path, undefined, graphic.stroke, extGStates, pdfa));
    }
    return commands.map((command) => wrapWithMatrix(command, graphic.transform));
  }

  return [wrapWithMatrix(renderSolidPath(path, graphic.fill, graphic.stroke, extGStates, pdfa), graphic.transform)];
}

function renderLineGraphic(
  graphic: Extract<PdfRenderableGraphic, { type: "line" }>,
  extGStates: Map<string, PreparedExtGState>,
  pdfa: PreparedPdfaState | undefined,
): string {
  const path = [
    `${formatPdfNumber(graphic.x1)} ${formatPdfNumber(graphic.y1)} m`,
    `${formatPdfNumber(graphic.x2)} ${formatPdfNumber(graphic.y2)} l`,
  ].join("\n");
  return wrapWithMatrix(renderSolidPath(path, undefined, graphic.stroke, extGStates, pdfa), graphic.transform);
}

function renderPathGraphic(
  graphic: Extract<PdfRenderableGraphic, { type: "path" }>,
  shadings: Map<string, PreparedShadingAsset>,
  extGStates: Map<string, PreparedExtGState>,
  pdfa: PreparedPdfaState | undefined,
): string[] {
  const transform = {
    scaleX: graphic.scaleX,
    scaleY: graphic.scaleY,
    x: graphic.x,
    y: graphic.y,
  };

  if (graphic.fill && graphic.fill.space !== "solid") {
    const commands = [
      wrapWithTransform(
        [buildGradientClipCommands(graphic.d, graphic.fill, shadings, extGStates, pdfa)],
        transform,
      ).join("\n"),
    ];
    if (graphic.stroke) {
      commands.push(
        wrapWithTransform(
          [renderSolidPath(graphic.d, undefined, graphic.stroke, extGStates, pdfa, graphic.fillRule)],
          transform,
        ).join("\n"),
      );
    }
    return commands;
  }

  return [
    wrapWithTransform(
      [renderSolidPath(graphic.d, graphic.fill, graphic.stroke, extGStates, pdfa, graphic.fillRule)],
      transform,
    ).join("\n"),
  ];
}

function renderImageGraphic(
  graphic: Extract<PdfRenderableGraphic, { type: "image" }>,
  images: Map<string, PreparedImageAsset>,
  extGStates: Map<string, PreparedExtGState>,
  preparedKey: string,
): string {
  const image = images.get(preparedKey);
  if (!image) {
    throw new Error(`Missing image resource ${preparedKey}`);
  }

  const commands = ["q"];
  const extKey = imageExtGStateKey(graphic.opacity);
  if (extKey) {
    const ext = extGStates.get(extKey);
    if (ext) {
      commands.push(`/${ext.alias} gs`);
    }
  }
  commands.push(`${formatPdfNumber(graphic.width)} 0 0 ${formatPdfNumber(graphic.height)} ${formatPdfNumber(graphic.x)} ${formatPdfNumber(graphic.y)} cm`);
  commands.push(`/${image.alias} Do`);
  commands.push("Q");
  return wrapWithMatrix(commands.join("\n"), graphic.transform);
}

function buildColorArray(stop: PdfGradientStop, pdfa?: PreparedPdfaState): PDFArray {
  const values = pdfa
    ? colorComponents(colorToRgb(stop.color))
    : colorComponents(stop.color);
  return new PDFArray(values.map((value) => new PDFNumber(value)));
}

function buildShadingDictionary(fill: PdfLinearGradientFill | PdfRadialGradientFill, pdfa?: PreparedPdfaState): PDFDictionary {
  const [firstStop, secondStop] = fill.stops;
  const firstColor = firstStop?.color;
  const secondColor = secondStop?.color;
  if (!firstColor || !secondColor) {
    throw new Error("Gradients require exactly two stops");
  }
  if (!pdfa && firstColor.space !== secondColor.space) {
    throw new Error("Gradient stops must share the same color space");
  }

  const functionDictionary = new PDFDictionary({
    C0: buildColorArray(firstStop, pdfa),
    C1: buildColorArray(secondStop, pdfa),
    Domain: new PDFArray([new PDFNumber(0), new PDFNumber(1)]),
    FunctionType: new PDFNumber(2),
    N: new PDFNumber(1),
  });

  const shadingColorSpace = pdfa
    ? pdfa.colorSpaceArray
    : new PDFName(firstColor.space === "rgb" ? "DeviceRGB" : "DeviceCMYK");

  if (fill.space === "linear-gradient") {
    return new PDFDictionary({
      ColorSpace: shadingColorSpace,
      Coords: new PDFArray([
        new PDFNumber(fill.startX),
        new PDFNumber(fill.startY),
        new PDFNumber(fill.endX),
        new PDFNumber(fill.endY),
      ]),
      Extend: new PDFArray([true, true]),
      Function: functionDictionary,
      ShadingType: new PDFNumber(2),
    });
  }

  return new PDFDictionary({
    ColorSpace: shadingColorSpace,
    Coords: new PDFArray([
      new PDFNumber(fill.startX),
      new PDFNumber(fill.startY),
      new PDFNumber(fill.startRadius),
      new PDFNumber(fill.endX),
      new PDFNumber(fill.endY),
      new PDFNumber(fill.endRadius),
    ]),
    Extend: new PDFArray([true, true]),
    Function: functionDictionary,
    ShadingType: new PDFNumber(3),
  });
}

async function expandPageGraphics(
  graphics: PdfRenderableGraphic[] | undefined,
  assetPolicy?: import("./phase9-types.js").PdfAssetPolicy,
): Promise<PdfRenderableGraphic[]> {
  const expanded: PdfRenderableGraphic[] = [];

  for (const graphic of graphics ?? []) {
    if (graphic.type === "svg") {
      expanded.push(...(await expandSvgGraphic(graphic as PdfSvgGraphic, assetPolicy)).map((expandedGraphic) => ({
        ...expandedGraphic,
        accessibility: graphic.accessibility,
        layer: graphic.layer,
        transform: graphic.transform,
      })));
      continue;
    }
    expanded.push(graphic);
  }

  return expanded;
}

async function preparePageResources(
  pages: PdfRenderedPage[],
  interactive?: PdfDocumentInteractiveSpec,
  assetPolicy?: import("./phase9-types.js").PdfAssetPolicy,
): Promise<PreparedPageResources> {
  const expandedPages: PdfRenderedPage[] = [];
  const images = new Map<string, PreparedImageAsset>();
  const preparedImageCache = new Map<string, PreparedPdfImage>();
  const extGStates = new Map<string, PreparedExtGState>();
  const forms = new Map<string, PreparedFormAsset>();
  const shadings = new Map<string, PreparedShadingAsset>();
  let imageCounter = 1;
  let extCounter = 1;
  let formCounter = 1;
  let shadingCounter = 1;

  for (const form of interactive?.sharedForms ?? []) {
    forms.set(form.alias, {
      alias: form.alias || `Fm${formCounter++}`,
      form,
    });
  }

  for (const page of pages) {
    const expandedGraphics = await expandPageGraphics(page.graphics, assetPolicy);
    expandedPages.push({ ...page, graphics: expandedGraphics });

    for (const graphic of expandedGraphics) {
      if (graphic.type === "image") {
        const preparedSourceKey = `${graphic.format ?? "auto"}:${buildPdfBinarySourceKey(graphic.source)}`;
        let prepared = preparedImageCache.get(preparedSourceKey);
        if (!prepared) {
          prepared = await preparePdfImage(graphic.source, graphic.format, assetPolicy);
          preparedImageCache.set(preparedSourceKey, prepared);
        }
        const key = buildImageKey(graphic, prepared);
        if (!images.has(key)) {
          images.set(key, {
            alias: `Im${imageCounter}`,
            image: prepared,
          });
          imageCounter += 1;
        }

        const extKey = imageExtGStateKey(graphic.opacity);
        if (extKey && !extGStates.has(extKey)) {
          extGStates.set(extKey, {
            alias: `GS${extCounter}`,
            fillOpacity: clampUnitInterval(graphic.opacity, "image.opacity"),
            key: extKey,
            strokeOpacity: clampUnitInterval(graphic.opacity, "image.opacity"),
          });
          extCounter += 1;
        }
      }

      if (graphic.type === "rect" || graphic.type === "path") {
        const fill = graphic.fill;
        const fillKey = fillExtGStateKey(fill);
        if (fillKey && !extGStates.has(fillKey)) {
          const opacity = clampUnitInterval(fill?.space === "solid" ? fill.opacity : undefined, "fill.opacity");
          extGStates.set(fillKey, {
            alias: `GS${extCounter}`,
            fillOpacity: opacity,
            key: fillKey,
            strokeOpacity: opacity,
          });
          extCounter += 1;
        }

        if (fill && fill.space !== "solid") {
          const shadingKey = buildGradientKey(fill);
          if (!shadings.has(shadingKey)) {
            shadings.set(shadingKey, {
              alias: `Sh${shadingCounter}`,
              fill,
              key: shadingKey,
            });
            shadingCounter += 1;
          }
        }
      }

      if ("stroke" in graphic) {
        const strokeKey = strokeExtStateKey(graphic.stroke);
        if (strokeKey && !extGStates.has(strokeKey)) {
          const opacity = clampUnitInterval(graphic.stroke?.opacity, "stroke.opacity");
          extGStates.set(strokeKey, {
            alias: `GS${extCounter}`,
            fillOpacity: opacity,
            key: strokeKey,
            strokeOpacity: opacity,
          });
          extCounter += 1;
        }
      }
    }
  }

  return { expandedPages, extGStates, forms, images, shadings };
}

async function buildGraphicCommands(
  graphics: PdfRenderableGraphic[] | undefined,
  images: Map<string, PreparedImageAsset>,
  shadings: Map<string, PreparedShadingAsset>,
  extGStates: Map<string, PreparedExtGState>,
  pageIndex: number,
  preparedAccessibility: PreparedAccessibilityState | undefined,
  pdfa: PreparedPdfaState | undefined,
  assetPolicy: import("./phase9-types.js").PdfAssetPolicy | undefined,
  layer: "background" | "foreground",
): Promise<string[]> {
  const commands: string[] = [];
  const wrapGraphic = (command: string, graphic: PdfRenderableGraphic): string =>
    wrapMarkedContent(command, graphic.accessibility, pageIndex, preparedAccessibility);

  for (const graphic of graphics ?? []) {
    if ((graphic.layer ?? "background") !== layer) {
      continue;
    }
    if (graphic.type === "rect") {
      commands.push(...renderRectGraphic(graphic, shadings, extGStates, pdfa).map((command) => wrapGraphic(command, graphic)));
      continue;
    }
    if (graphic.type === "line") {
      commands.push(wrapGraphic(renderLineGraphic(graphic, extGStates, pdfa), graphic));
      continue;
    }
    if (graphic.type === "path") {
      commands.push(...renderPathGraphic(graphic, shadings, extGStates, pdfa).map((command) => wrapGraphic(command, graphic)));
      continue;
    }
    if (graphic.type === "image") {
      const prepared = await preparePdfImage(graphic.source, graphic.format, assetPolicy);
      commands.push(wrapGraphic(renderImageGraphic(graphic, images, extGStates, buildImageKey(graphic, prepared)), graphic));
      continue;
    }
  }

  return commands;
}

async function buildCompressedPageContentStreams(
  pages: PdfRenderedPage[],
  aliasLookup: Map<string, string>,
  preparedFonts: Map<string, PreparedEmbeddedFont>,
  resources: PreparedPageResources,
  preparedAccessibility: PreparedAccessibilityState | undefined,
  pdfa: PreparedPdfaState | undefined,
  runtimeOptions: PdfRenderRuntimeOptions | undefined,
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = resources.expandedPages[pageIndex] as PdfRenderedPage;
    const commands: string[] = [];
    commands.push(...await buildGraphicCommands(page.graphics, resources.images, resources.shadings, resources.extGStates, pageIndex, preparedAccessibility, pdfa, runtimeOptions?.assetPolicy, "background"));
    for (const text of page.texts) {
      const textCommand = await renderTextOperator(
        text,
        aliasLookup,
        preparedFonts,
        pageIndex,
        preparedAccessibility,
        runtimeOptions?.onTextEncodingWarning,
        pdfa,
      );
      commands.push(wrapWithMatrix(textCommand, text.transform));
    }
    commands.push(...await buildGraphicCommands(page.graphics, resources.images, resources.shadings, resources.extGStates, pageIndex, preparedAccessibility, pdfa, runtimeOptions?.assetPolicy, "foreground"));
    for (const extraCommand of page.extraCommands ?? []) {
      if (typeof extraCommand === "string") {
        commands.push(extraCommand);
        continue;
      }
      commands.push(wrapMarkedContent(extraCommand.command, extraCommand.accessibility, pageIndex, preparedAccessibility));
    }
    commands.push(DETERMINISTIC_CONTENT_PADDING);
    buffers.push(Buffer.from(deflate(Buffer.from(commands.join("\n"), "utf8"))));
    runtimeOptions?.onPageSerialized?.(pageIndex, pages.length);
  }

  return buffers;
}

function buildPageResources(
  ctx: RenderContext,
  aliasLookup: Map<string, string>,
  pdfa: PreparedPdfaState | undefined,
): PDFDictionary {
  const fontEntries: Record<string, PDFRef> = {};
  const imageEntries: Record<string, PDFRef> = {};
  const formEntries: Record<string, PDFRef> = {};
  const extEntries: Record<string, PDFRef> = {};
  const shadingEntries: Record<string, PDFRef> = {};

  for (const [resourceKey, ref] of ctx.iterateFonts()) {
    const alias = aliasLookup.get(resourceKey);
    if (alias) {
      fontEntries[alias] = ref;
    }
  }

  for (const [, ref, alias] of ctx.iterateImages()) {
    imageEntries[alias] = ref;
  }

  for (const [, ref, alias] of ctx.iterateForms()) {
    formEntries[alias] = ref;
  }

  for (const [, ref, alias] of ctx.iterateExtGStates()) {
    extEntries[alias] = ref;
  }

  for (const [, ref, alias] of ctx.iterateShadings()) {
    shadingEntries[alias] = ref;
  }

  const entries: Record<string, PDFDictionary | PDFArray> = {
    Font: new PDFDictionary(fontEntries),
    ProcSet: new PDFArray(JPEG_PROC_SETS),
  };

  if (Object.keys(extEntries).length > 0) {
    entries.ExtGState = new PDFDictionary(extEntries);
  }
  if (Object.keys(imageEntries).length > 0) {
    entries.XObject = new PDFDictionary(imageEntries);
  }
  if (Object.keys(formEntries).length > 0) {
    entries.XObject = new PDFDictionary({
      ...(entries.XObject instanceof PDFDictionary ? entries.XObject.entries as Record<string, PDFRef> : {}),
      ...formEntries,
    });
  }
  if (Object.keys(shadingEntries).length > 0) {
    entries.Shading = new PDFDictionary(shadingEntries);
  }
  if (pdfa) {
    entries.ColorSpace = new PDFDictionary({
      CS0: pdfa.colorSpaceArray,
    });
  }

  return new PDFDictionary(entries);
}

function colorToPdfArray(color: PdfColor): PDFArray {
  return new PDFArray(colorComponents(color).map((value) => new PDFNumber(value)));
}


function buildMetadataStream(xml: string): PDFStream {
  return new PDFStream(
    {
      Subtype: new PDFName("XML"),
      Type: new PDFName("Metadata"),
    },
    Buffer.from(xml, "utf8"),
  );
}

async function preparePdfaState(
  pdfa: PdfRenderPdfaSpec | undefined,
  runtimeOptions?: PdfRenderRuntimeOptions,
): Promise<PreparedPdfaState | undefined> {
  if (!pdfa) {
    return undefined;
  }

  const iccProfileBuffer = await loadFontSourceBuffer(pdfa.iccProfile, undefined, {
    assetPolicy: runtimeOptions?.assetPolicy,
    sourceKind: "icc-profile",
  });
  return {
    colorSpaceArray: new PDFArray([]),
    iccProfileBuffer,
    outputConditionIdentifier: pdfa.outputConditionIdentifier,
  };
}

function createPdfaFileId(
  objects: Array<{ ref: PDFRef; value: PDFDictionary | PDFStream }>,
  root: PDFRef,
  info: PDFRef,
  version: string | undefined,
): [Buffer, Buffer] {
  const hash = createHash("sha256");
  // Frozen at the Runstamp rename: a hash domain separator, not a brand string.
  // This digest becomes the PDF /ID pair, so changing it rewrites every PDF's
  // identifier and invalidates signatures bound to it. Do not rename.
  hash.update(`paperjsx-pdfa:${version ?? "1.4"}:${root.objectNumber}:${info.objectNumber}\n`);
  const orderedObjects = [...objects].sort((left, right) => left.ref.objectNumber - right.ref.objectNumber);
  for (const object of orderedObjects) {
    hash.update(`${object.ref.objectNumber} ${object.ref.generationNumber} obj\n`);
    hash.update(serializePdfObject(object.value));
    hash.update("\nendobj\n");
  }
  const digest = hash.digest();
  return [digest.subarray(0, 16), digest.subarray(16, 32)];
}

function createDeterministicFileId(
  objects: Array<{ ref: PDFRef; value: PDFDictionary | PDFStream }>,
  root: PDFRef,
  info: PDFRef,
  version: string | undefined,
): [Buffer, Buffer] {
  const hash = createHash("sha256");
  hash.update(`${deterministicPdfFileIdSeed()}:${version ?? "1.4"}:${root.objectNumber}:${info.objectNumber}\n`);
  const orderedObjects = [...objects].sort((left, right) => left.ref.objectNumber - right.ref.objectNumber);
  for (const object of orderedObjects) {
    hash.update(`${object.ref.objectNumber} ${object.ref.generationNumber} obj\n`);
    hash.update(serializePdfObject(object.value));
    hash.update("\nendobj\n");
  }
  const digest = hash.digest();
  return [digest.subarray(0, 16), digest.subarray(16, 32)];
}

function buildPdfaIccProfileStream(buffer: Buffer): PDFStream {
  return new PDFStream(
    {
      Alternate: new PDFName("DeviceRGB"),
      N: new PDFNumber(3),
      Range: new PDFArray([
        new PDFNumber(0), new PDFNumber(1),
        new PDFNumber(0), new PDFNumber(1),
        new PDFNumber(0), new PDFNumber(1),
      ]),
    },
    buffer,
  );
}

function buildPdfaOutputIntentDictionary(iccRef: PDFRef, outputConditionIdentifier: string): PDFDictionary {
  return new PDFDictionary({
    DestOutputProfile: iccRef,
    Info: new PDFString(outputConditionIdentifier),
    OutputConditionIdentifier: new PDFString(outputConditionIdentifier),
    RegistryName: new PDFString("http://www.color.org"),
    S: new PDFName("GTS_PDFA1"),
    Type: new PDFName("OutputIntent"),
  });
}


function collectSignatureTargets(pages: PdfRenderedPage[]): PreparedSignatureTarget[] {
  const targets: PreparedSignatureTarget[] = [];
  const seen = new Set<string>();

  pages.forEach((page, pageIndex) => {
    for (const annotation of page.annotations ?? []) {
      if (annotation.kind !== "form-signature" || annotation.mode !== "digital") {
        continue;
      }
      if (seen.has(annotation.fieldName)) {
        throw new Error(`Duplicate digital signature fieldName "${annotation.fieldName}"`);
      }
      seen.add(annotation.fieldName);
      targets.push({
        annotation,
        fieldName: annotation.fieldName,
        pageIndex,
      });
    }
  });

  return targets;
}

function resolveSignatureTarget(
  targets: PreparedSignatureTarget[],
  options: PdfSignOptions | undefined,
): PreparedSignatureTarget | undefined {
  if (!options || targets.length === 0) {
    return undefined;
  }
  if (options.fieldName) {
    return targets.find((target) => target.fieldName === options.fieldName);
  }
  return targets.length === 1 ? targets[0] : undefined;
}


function buildPageLabelDictionary(label: PdfPageLabelSpec): PDFDictionary {
  const style = label.style === "roman-lower"
    ? new PDFName("r")
    : label.style === "roman-upper"
      ? new PDFName("R")
      : new PDFName("D");

  return new PDFDictionary({
    P: label.prefix ? new PDFString(label.prefix) : null,
    S: style,
    St: new PDFNumber(label.startNumber ?? 1),
  });
}

function countOutlines(items: PdfOutlineItemSpec[] | undefined): number {
  return (items ?? []).reduce((sum, item) => sum + 1 + countOutlines(item.children), 0);
}

function buildStructureElementDictionary(
  element: PdfAccessibilityStructureSpec,
  parentRef: PDFRef,
  childRefs: PDFRef[],
  pageRefs: PDFRef[],
  contentRefs: TaggedContentReference[],
  structureRefLookup: Map<string, PDFRef>,
): PDFDictionary {
  const contentEntries = contentRefs.map((contentRef) => new PDFDictionary({
    MCID: new PDFNumber(contentRef.mcid),
    Pg: pageRefs[contentRef.pageIndex] as PDFRef,
    Type: new PDFName("MCR"),
  }));
  const kEntries: PDFValue[] = [
    ...childRefs,
    ...contentEntries,
  ];

  const entries: Record<string, PDFValue> = {
    K: kEntries.length === 0 ? new PDFArray([]) : kEntries.length === 1 ? kEntries[0] as PDFValue : new PDFArray(kEntries),
    P: parentRef,
    S: new PDFName(element.role),
    Type: new PDFName("StructElem"),
  };

  if (element.alt) {
    entries.Alt = new PDFString(element.alt);
  }
  if (element.headers && element.headers.length > 0) {
    entries.Headers = new PDFArray(
      element.headers
        .map((headerId) => structureRefLookup.get(headerId))
        .filter((ref): ref is PDFRef => Boolean(ref)),
    );
  }
  if (element.lang) {
    entries.Lang = new PDFString(element.lang);
  }
  if (element.scope) {
    entries.Scope = new PDFName(element.scope);
  }

  return new PDFDictionary(entries);
}

export async function renderPdfPages(options: {
  deterministic?: boolean;
  encryption?: PdfEncryptionConfig;
  flattenForms?: boolean;
  interactive?: PdfDocumentInteractiveSpec;
  meta?: PdfRenderMeta;
  pages: PdfRenderedPage[];
  /** User-requested PDF version. Engine may auto-bump but never auto-downgrade. */
  pdfVersion?: PdfVersion;
  runtimeOptions?: PdfRenderRuntimeOptions;
  signature?: PdfSignOptions;
}): Promise<Buffer> {
  const interactive = options.interactive ?? {};
  const meta = options.meta ?? {};
  const pages = normalizeInteractivePages(options.pages, options.flattenForms, interactive.pdfa?.defaultFont);
  const runtimeOptions = options.runtimeOptions;
  const signatureTargets = collectSignatureTargets(pages);
  const signatureTarget = resolveSignatureTarget(signatureTargets, options.signature);
  const signaturePlan = options.signature
    ? createPdfSignaturePlan({
        ...options.signature,
        fieldName: signatureTarget?.fieldName ?? options.signature.fieldName,
      })
    : undefined;
  const pdfa = await preparePdfaState(interactive.pdfa, runtimeOptions);
  const embeddedFontGroups = new Map<string, { alias: string; font: PdfEmbeddedFontInput; sampleSet: Set<string> }>();
  let fontAliasCounter = 1;
  const aliasLookup = new Map<string, string>();
  const builtInFonts = new Set<string>();
  if (!pdfa) {
    for (const page of pages) {
      for (const text of page.texts) {
        if (!text.font || typeof text.font === "string") {
          builtInFonts.add(text.font ?? DEFAULT_FONT);
        }
        if (BUILT_IN_FALLBACK_PATTERN.test(text.value)) {
          builtInFonts.add(DEFAULT_FONT);
          builtInFonts.add("Symbol");
        }
      }
    }
  }
  if ([...(interactive.sharedForms ?? [])].some((form) => !form.fontResourceKey || form.fontResourceKey === DEFAULT_FONT)) {
    builtInFonts.add(DEFAULT_FONT);
  }
  for (const font of builtInFonts) {
    aliasLookup.set(font, `F${fontAliasCounter}`);
    fontAliasCounter += 1;
  }

  if (pdfa) {
    for (const page of pages) {
      for (const text of page.texts) {
        const font = text.font ?? DEFAULT_FONT;
        if (!isEmbeddedFontInput(font)) {
          throw new PdfError(
            "PDFA_VIOLATION",
            "PDF/A requires embedded fonts for all page text",
            { constraint: "embedded-fonts-required" },
          );
        }
      }
      for (const annotation of page.annotations ?? []) {
        if (annotation.kind === "link-external") {
          throw new PdfError(
            "PDFA_VIOLATION",
            "PDF/A does not allow external URI annotations",
            { constraint: "no-external-uri-annotations", annotation: annotation.kind },
          );
        }
      }
    }
  }

  for (const page of pages) {
    for (const text of page.texts) {
      const fontCandidates = [
        text.font ?? DEFAULT_FONT,
        ...(text.fallbackFonts ?? []),
      ];
      for (const font of fontCandidates) {
        if (!isEmbeddedFontInput(font)) {
          continue;
        }
        const key = buildFontInputKey(font);
        const existing = embeddedFontGroups.get(key);
        if (existing) {
          existing.sampleSet.add(text.value);
          continue;
        }
        const alias = `F${fontAliasCounter}`;
        fontAliasCounter += 1;
        embeddedFontGroups.set(key, {
          alias,
          font,
          sampleSet: new Set([text.value]),
        });
        aliasLookup.set(key, alias);
      }
    }
  }

  if (interactive.pdfa?.defaultFont) {
    const fallbackFont = interactive.pdfa.defaultFont;
    const fallbackKey = buildFontInputKey(fallbackFont);
    const existing = embeddedFontGroups.get(fallbackKey);
    if (!existing) {
      const alias = `F${fontAliasCounter}`;
      fontAliasCounter += 1;
      embeddedFontGroups.set(fallbackKey, {
        alias,
        font: fallbackFont,
        sampleSet: new Set<string>(),
      });
      aliasLookup.set(fallbackKey, alias);
    }

      const sampleSet = embeddedFontGroups.get(fallbackKey)?.sampleSet;
      if (sampleSet) {
        for (const page of pages) {
          for (const annotation of page.annotations ?? []) {
            if ((annotation.kind === "form-text" || annotation.kind === "form-dropdown") && annotation.value) {
              sampleSet.add(annotation.value);
            }
            if (annotation.kind === "form-signature") {
              if (annotation.value) {
                sampleSet.add(annotation.value);
              }
              if (annotation.label) {
                sampleSet.add(annotation.label);
              }
            }
          }
        }
        if (sampleSet.size === 0) {
          sampleSet.add(" ");
        }
    }
  }

  const preparedFonts = await prepareEmbeddedFonts(
    [...embeddedFontGroups.values()].map((entry) => ({
      alias: entry.alias,
      font: entry.font,
      samples: [...entry.sampleSet],
    })),
    { assetPolicy: runtimeOptions?.assetPolicy, subset: !pdfa },
  );
  const preparedResources = await preparePageResources(pages, interactive, runtimeOptions?.assetPolicy);
  const preparedAccessibility = prepareAccessibilityState(interactive.accessibility, pages.length);
  const compressedContentStreams = await buildCompressedPageContentStreams(pages, aliasLookup, preparedFonts, preparedResources, preparedAccessibility, pdfa, runtimeOptions);

  const ctx = new RenderContext();

  let helveticaRef: PDFRef | undefined;
  for (const font of builtInFonts) {
    const fontRef = ctx.allocateRef();
    if (font === DEFAULT_FONT) helveticaRef = fontRef;
    ctx.registerFont(font, fontRef);
    ctx.addObject(fontRef, new PDFDictionary({
      BaseFont: new PDFName(font),
      ...(font === "Symbol" ? {} : { Encoding: new PDFName("WinAnsiEncoding") }),
      Subtype: new PDFName("Type1"),
      Type: new PDFName("Font"),
    }));
  }

  for (const [sourceKey, prepared] of preparedFonts.entries()) {
    const [type0, cidFont, descriptor, fontFile, cidToGidMap, cidSet, toUnicode] = ctx.allocateRefBlock(7);
    const refs = { type0, cidFont, descriptor, fontFile, cidToGidMap, cidSet, toUnicode };
    ctx.registerFont(sourceKey, refs.type0);
    buildEmbeddedFontObjects(prepared, refs).forEach((object) => {
      ctx.addObject(object.ref, object.value as PDFDictionary | PDFStream);
    });
  }

  const iccProfileRef = pdfa ? ctx.allocateRef() : undefined;
  const outputIntentRef = pdfa ? ctx.allocateRef() : undefined;
  const pdfaColorSpace = pdfa && iccProfileRef
    ? new PDFArray([new PDFName("ICCBased"), iccProfileRef])
    : undefined;

  for (const [key, asset] of preparedResources.images.entries()) {
    if (asset.image.format === "jpeg") {
      if (pdfa && asset.image.colorSpace !== "DeviceRGB") {
        throw new PdfError(
          "PDFA_VIOLATION",
          "PDF/A currently supports only RGB JPEG images",
          { constraint: "rgb-jpeg-only", colorSpace: asset.image.colorSpace },
        );
      }
      const ref = ctx.allocateRef();
      ctx.registerImage(key, ref, asset.alias);
      ctx.addObject(ref, new PDFStream(
        {
          BitsPerComponent: new PDFNumber(8),
          ColorSpace: pdfaColorSpace ?? new PDFName(asset.image.colorSpace),
          Filter: new PDFName("DCTDecode"),
          Height: new PDFNumber(asset.image.height),
          Subtype: new PDFName("Image"),
          Type: new PDFName("XObject"),
          Width: new PDFNumber(asset.image.width),
        },
        asset.image.buffer,
      ));
      continue;
    }

    if (interactive.pdfa?.conformance === "1b" && asset.image.compressedAlpha) {
      throw new PdfError(
        "PDFA_VIOLATION",
        "PDF/A-1b does not allow transparency. Image has an alpha channel (soft mask). Use PDF/A-2b which permits transparency, or use images without alpha channels.",
        { constraint: "no-transparency", conformance: "1b", source: "image-soft-mask" },
      );
    }
    // Object-numbering invariant: when an alpha SMask is present, allocate
    // its ref BEFORE the image ref so the image's /SMask entry references
    // a lower-numbered object — matches the historical layout exactly.
    const smaskRef = asset.image.compressedAlpha ? ctx.allocateRef() : undefined;
    const imageRef = ctx.allocateRef();
    ctx.registerImage(key, imageRef, asset.alias);

    if (smaskRef) {
      ctx.addObject(smaskRef, new PDFStream(
        {
          BitsPerComponent: new PDFNumber(8),
          ColorSpace: new PDFName("DeviceGray"),
          DecodeParms: new PDFDictionary({
            BitsPerComponent: new PDFNumber(8),
            Colors: new PDFNumber(1),
            Columns: new PDFNumber(asset.image.width),
            Predictor: new PDFNumber(15),
          }),
          Filter: new PDFName("FlateDecode"),
          Height: new PDFNumber(asset.image.height),
          Subtype: new PDFName("Image"),
          Type: new PDFName("XObject"),
          Width: new PDFNumber(asset.image.width),
        },
        asset.image.compressedAlpha as Buffer,
      ));
    }

    ctx.addObject(imageRef, new PDFStream(
      {
        BitsPerComponent: new PDFNumber(8),
        ColorSpace: pdfaColorSpace ?? new PDFName("DeviceRGB"),
        DecodeParms: new PDFDictionary({
          BitsPerComponent: new PDFNumber(8),
          Colors: new PDFNumber(3),
          Columns: new PDFNumber(asset.image.width),
          Predictor: new PDFNumber(15),
        }),
        Filter: new PDFName("FlateDecode"),
        Height: new PDFNumber(asset.image.height),
        SMask: smaskRef ?? null,
        Subtype: new PDFName("Image"),
        Type: new PDFName("XObject"),
        Width: new PDFNumber(asset.image.width),
      },
      asset.image.compressedRgb,
    ));
  }

  for (const [key, formAsset] of preparedResources.forms.entries()) {
    const ref = ctx.allocateRef();
    ctx.registerForm(key, ref, formAsset.alias);
    const fontResourceKey = formAsset.form.fontResourceKey ?? DEFAULT_FONT;
    const fontRef = ctx.getFontRef(fontResourceKey) ?? helveticaRef;
    if (!fontRef) {
      throw new Error(`Missing form font resource "${fontResourceKey}"`);
    }
    ctx.addObject(ref, new PDFStream(
      {
        BBox: new PDFArray(formAsset.form.bbox.map((value) => new PDFNumber(value))),
        FormType: new PDFNumber(1),
        Resources: new PDFDictionary({
          Font: new PDFDictionary({
            F1: fontRef,
          }),
        }),
        Subtype: new PDFName("Form"),
        Type: new PDFName("XObject"),
      },
      Buffer.from(formAsset.form.commands, "utf8"),
    ));
  }

  for (const [key, ext] of preparedResources.extGStates.entries()) {
    const ref = ctx.allocateRef();
    ctx.registerExtGState(key, ref, ext.alias);
    ctx.addObject(ref, new PDFDictionary({
      CA: new PDFNumber(ext.strokeOpacity),
      Type: new PDFName("ExtGState"),
      ca: new PDFNumber(ext.fillOpacity),
    }));
  }

  if (interactive.pdfa?.conformance === "1b") {
    for (const [, ext] of preparedResources.extGStates) {
      if (ext.fillOpacity < 1 || ext.strokeOpacity < 1) {
        throw new PdfError(
          "PDFA_VIOLATION",
          "PDF/A-1b does not allow transparency. Remove opacity values from fills, strokes, and images, or use PDF/A-2b which permits transparency.",
          { constraint: "no-transparency", conformance: "1b", source: "extgstate-opacity" },
        );
      }
    }
  }

  for (const [key, shading] of preparedResources.shadings.entries()) {
    const ref = ctx.allocateRef();
    ctx.registerShading(key, ref, shading.alias);
    ctx.addObject(ref, buildShadingDictionary(shading.fill, pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined));
  }

  const pagesRef = ctx.allocateRef();
  const contentRefs: PDFRef[] = [];
  const pageRefs: PDFRef[] = [];
  for (let index = 0; index < preparedResources.expandedPages.length; index += 1) {
    // Per-page allocation pairs content-ref then page-ref. Order is
    // load-bearing: tests assert sequential object numbering.
    contentRefs.push(ctx.allocateRef());
    pageRefs.push(ctx.allocateRef());
  }

  const metadataRef = interactive.metadataXml ? ctx.allocateRef() : undefined;
  const pageLabelsRef = interactive.pageLabels && interactive.pageLabels.length > 0 ? ctx.allocateRef() : undefined;
  const outlinesRootRef = interactive.outlines && interactive.outlines.length > 0 ? ctx.allocateRef() : undefined;
  const structTreeRootRef = preparedAccessibility ? ctx.allocateRef() : undefined;
  const parentTreeRef = preparedAccessibility ? ctx.allocateRef() : undefined;
  const catalogRef = ctx.allocateRef();
  const infoRef = ctx.allocateRef();
  const hasAcroFields = preparedResources.expandedPages.some((page) => (page.annotations ?? []).some((annotation) =>
    isInteractiveWidgetAnnotation(annotation)));
  const needsEmbeddedFormFont = preparedResources.expandedPages.some((page) => (page.annotations ?? []).some((annotation) =>
    annotation.kind === "form-text" || annotation.kind === "form-checkbox" || annotation.kind === "form-dropdown" || annotation.kind === "form-signature"));
  const radioGroups = new Map<string, PreparedRadioGroup>();
  const radioWidgetsByAnnotation = new WeakMap<PdfRadioWidgetSpec, PreparedRadioWidget>();
  const acroFieldRefs: PDFRef[] = [];
  for (let pageIndex = 0; pageIndex < preparedResources.expandedPages.length; pageIndex += 1) {
    const page = preparedResources.expandedPages[pageIndex];
    for (const annotation of page.annotations ?? []) {
      if (annotation.kind !== "form-radio") {
        continue;
      }
      let group = radioGroups.get(annotation.group);
      if (!group) {
        group = {
          calculationScript: annotation.calculationScript,
          parentRef: ctx.allocateRef(),
          widgets: [],
        };
        radioGroups.set(annotation.group, group);
        acroFieldRefs.push(group.parentRef);
      } else if (!group.calculationScript && annotation.calculationScript) {
        group.calculationScript = annotation.calculationScript;
      }

      const widgetRef = ctx.allocateRef();
      const offAppearanceRef = ctx.allocateRef();
      const onAppearanceRef = ctx.allocateRef();
      const prepared = {
        annotation,
        offAppearanceRef,
        parentRef: group.parentRef,
        onAppearanceRef,
        widgetRef,
      };
      radioWidgetsByAnnotation.set(annotation, prepared);
      group.widgets.push(prepared);
      if (annotation.checked) {
        group.selectedValue = annotation.value;
      }
    }
  }
  const acroFormRef = hasAcroFields || signaturePlan ? ctx.allocateRef() : undefined;
  const signatureValueRef = signaturePlan ? ctx.allocateRef() : undefined;
  const signatureWidgetRef = signaturePlan && !signatureTarget ? ctx.allocateRef() : undefined;
  const timestampValueRef = signaturePlan?.timestamp ? ctx.allocateRef() : undefined;
  const timestampWidgetRef = signaturePlan?.timestamp ? ctx.allocateRef() : undefined;

  const pageResources = buildPageResources(
    ctx,
    aliasLookup,
    pdfa && pdfaColorSpace
      ? {
          ...pdfa,
          colorSpaceArray: pdfaColorSpace,
        }
      : undefined,
  );

  const defaultFormFontRef = pdfa
    ? (interactive.pdfa?.defaultFontKey ? ctx.getFontRef(interactive.pdfa.defaultFontKey) : undefined)
    : helveticaRef;

  if (pdfa && needsEmbeddedFormFont && acroFormRef && !defaultFormFontRef) {
    throw new PdfError(
      "PDFA_VIOLATION",
      "PDF/A form appearances require an embedded default font",
      { constraint: "embedded-default-form-font" },
    );
  }
  const formFontRef = defaultFormFontRef as PDFRef;

  const outlineItemRefs: Array<{ item: PdfOutlineItemSpec; ref: PDFRef }> = [];

  const assignOutlineRefs = (items: PdfOutlineItemSpec[] | undefined): void => {
    for (const item of items ?? []) {
      const ref = ctx.allocateRef();
      outlineItemRefs.push({ item, ref });
      assignOutlineRefs(item.children);
    }
  };
  assignOutlineRefs(interactive.outlines);
  const outlineRefMap = new Map(outlineItemRefs.map((entry) => [entry.item, entry.ref]));
  const structureRefLookup = new Map<string, PDFRef>();
  if (preparedAccessibility) {
    for (const structure of preparedAccessibility.structure) {
      structureRefLookup.set(structure.id, ctx.allocateRef());
    }
  }

  const createDestinationArray = (destination: PdfDestinationSpec): PDFArray => new PDFArray([
    pageRefs[destination.pageIndex] as PDFRef,
    new PDFName("XYZ"),
    new PDFNumber(destination.left),
    new PDFNumber(destination.top),
    destination.zoom === undefined || destination.zoom === null ? null : new PDFNumber(destination.zoom),
  ]);

  preparedResources.expandedPages.forEach((page, pageIndex) => {
    ctx.addObject(contentRefs[pageIndex] as PDFRef, new PDFStream(
      {
        Filter: new PDFName("FlateDecode"),
      },
      compressedContentStreams[pageIndex] as Buffer,
    ));

    const annotationRefs: PDFRef[] = [];
    const annotationsWithIndex = (page.annotations ?? []).map((annotation, index) => ({ annotation, index }));
    const hasExplicitTabOrder = annotationsWithIndex.some(({ annotation }) => isWidgetAnnotation(annotation) && annotation.tabOrder !== undefined);
    const orderedAnnotations = hasExplicitTabOrder
      ? [...annotationsWithIndex].sort((left, right) => {
          const leftIsWidget = isWidgetAnnotation(left.annotation);
          const rightIsWidget = isWidgetAnnotation(right.annotation);
          const leftWidget: PdfWidgetAnnotationSpec | undefined = leftIsWidget
            ? left.annotation as PdfWidgetAnnotationSpec
            : undefined;
          const rightWidget: PdfWidgetAnnotationSpec | undefined = rightIsWidget
            ? right.annotation as PdfWidgetAnnotationSpec
            : undefined;
          if (leftIsWidget !== rightIsWidget) {
            return leftIsWidget ? -1 : 1;
          }
          const leftOrder = leftWidget?.tabOrder ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = rightWidget?.tabOrder ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return left.index - right.index;
        })
      : annotationsWithIndex;

    if (pageIndex === 0 && signaturePlan && signatureValueRef && signatureWidgetRef && !signatureTarget) {
      annotationRefs.push(signatureWidgetRef);
      acroFieldRefs.push(signatureWidgetRef);
      ctx.addObject(signatureValueRef, new PDFDictionary({
        ByteRange: new PDFRaw(signaturePlan.signature.byteRangePlaceholder),
        ContactInfo: options.signature?.contactInfo ? new PDFString(options.signature.contactInfo) : null,
        Contents: new PDFRaw(signaturePlan.signature.contentsPlaceholder),
        Filter: new PDFName("Adobe.PPKLite"),
        Location: options.signature?.location ? new PDFString(options.signature.location) : null,
        M: formatPdfSignatureDate(options.signature?.signingDate)
          ? new PDFString(formatPdfSignatureDate(options.signature?.signingDate) as string)
          : null,
        Name: options.signature?.signerName ? new PDFString(options.signature.signerName) : null,
        Reason: options.signature?.reason ? new PDFString(options.signature.reason) : null,
        SubFilter: new PDFName("adbe.pkcs7.detached"),
        Type: new PDFName("Sig"),
      }));
      ctx.addObject(signatureWidgetRef, new PDFDictionary({
        F: new PDFNumber(4),
        FT: new PDFName("Sig"),
        P: pageRefs[pageIndex] as PDFRef,
        Rect: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(0), new PDFNumber(0)]),
        Subtype: new PDFName("Widget"),
        T: new PDFString(signaturePlan.signature.fieldName),
        Type: new PDFName("Annot"),
        V: signatureValueRef,
      }));
    }

    if (pageIndex === 0 && signaturePlan?.timestamp && timestampValueRef && timestampWidgetRef) {
      annotationRefs.push(timestampWidgetRef);
      acroFieldRefs.push(timestampWidgetRef);
      ctx.addObject(timestampValueRef, new PDFDictionary({
        ByteRange: new PDFRaw(signaturePlan.timestamp.byteRangePlaceholder),
        Contents: new PDFRaw(signaturePlan.timestamp.contentsPlaceholder),
        Filter: new PDFName("Adobe.PPKLite"),
        SubFilter: new PDFName("ETSI.RFC3161"),
        Type: new PDFName("DocTimeStamp"),
        V: new PDFNumber(0),
      }));
      ctx.addObject(timestampWidgetRef, new PDFDictionary({
        F: new PDFNumber(4),
        FT: new PDFName("Sig"),
        P: pageRefs[pageIndex] as PDFRef,
        Rect: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(0), new PDFNumber(0)]),
        Subtype: new PDFName("Widget"),
        T: new PDFString(signaturePlan.timestamp.fieldName),
        Type: new PDFName("Annot"),
        V: timestampValueRef,
      }));
    }

    for (const { annotation } of orderedAnnotations) {
      if (annotation.kind === "form-checkbox") {
        const offAppearanceRef = ctx.allocateRef();
        const onAppearanceRef = ctx.allocateRef();
        const widgetRef = ctx.allocateRef();
        const width = annotation.rect[2] - annotation.rect[0];
        const height = annotation.rect[3] - annotation.rect[1];
        annotationRefs.push(widgetRef);
        acroFieldRefs.push(widgetRef);
        ctx.addObject(offAppearanceRef, buildCheckboxStateAppearance(width, height, false, annotation.fontColor, pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined));
        ctx.addObject(onAppearanceRef, buildCheckboxStateAppearance(width, height, true, annotation.fontColor, pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined));
        ctx.addObject(widgetRef, new PDFDictionary({
          AP: new PDFDictionary({
            N: new PDFDictionary({
              Off: offAppearanceRef,
              Yes: onAppearanceRef,
            }),
          }),
          Ff: new PDFNumber(buildCheckboxFlags(annotation)),
          AS: new PDFName(annotation.checked ? "Yes" : "Off"),
          FT: new PDFName("Btn"),
          F: new PDFNumber(4),
          MK: new PDFDictionary({ CA: new PDFString("4") }),
          P: pageRefs[pageIndex] as PDFRef,
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Widget"),
          T: new PDFString(annotation.name),
          Type: new PDFName("Annot"),
          AA: buildJavaScriptAction(annotation.calculationScript),
          TU: annotation.tooltip ? new PDFString(annotation.tooltip) : null,
          V: new PDFName(annotation.checked ? "Yes" : "Off"),
        }));
        continue;
      }

      if (annotation.kind === "form-radio") {
        const radio = radioWidgetsByAnnotation.get(annotation);
        if (!radio) {
          continue;
        }
        const group = radioGroups.get(annotation.group);
        const width = annotation.rect[2] - annotation.rect[0];
        const height = annotation.rect[3] - annotation.rect[1];
        const selected = group?.selectedValue === annotation.value;
        annotationRefs.push(radio.widgetRef);
        ctx.addObject(radio.offAppearanceRef, buildRadioStateAppearance(
          width,
          height,
          false,
          annotation.fontColor,
          formFontRef,
          pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined,
        ));
        ctx.addObject(radio.onAppearanceRef, buildRadioStateAppearance(
          width,
          height,
          true,
          annotation.fontColor,
          formFontRef,
          pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined,
        ));
        ctx.addObject(radio.widgetRef, new PDFDictionary({
          AP: new PDFDictionary({
            N: new PDFDictionary({
              Off: radio.offAppearanceRef,
              [annotation.value]: radio.onAppearanceRef,
            }),
          }),
          AS: new PDFName(selected ? annotation.value : "Off"),
          F: new PDFNumber(4),
          Parent: radio.parentRef,
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Widget"),
          Type: new PDFName("Annot"),
          TU: annotation.tooltip ? new PDFString(annotation.tooltip) : null,
        }));
        continue;
      }

      if (annotation.kind === "form-text" || annotation.kind === "form-dropdown") {
        const appearanceRef = ctx.allocateRef();
        const widgetRef = ctx.allocateRef();
        annotationRefs.push(widgetRef);
        acroFieldRefs.push(widgetRef);
        ctx.addObject(appearanceRef, buildWidgetAppearanceStream(annotation, formFontRef, pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined, runtimeOptions?.onTextEncodingWarning, pageIndex));

        const baseEntries: Record<string, PDFArray | PDFDictionary | PDFName | PDFNumber | PDFRef | PDFString | boolean | null> = {
          AP: new PDFDictionary({ N: appearanceRef }),
          DA: new PDFString(`/F1 ${annotation.kind === "form-text" ? annotation.fontSize ?? 12 : 12} Tf`),
          F: new PDFNumber(4),
          P: pageRefs[pageIndex] as PDFRef,
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Widget"),
          T: new PDFString(annotation.name),
          Type: new PDFName("Annot"),
          AA: buildJavaScriptAction(annotation.calculationScript),
          TU: annotation.tooltip ? new PDFString(annotation.tooltip) : null,
        };

        if (annotation.kind === "form-text") {
          ctx.addObject(widgetRef, new PDFDictionary({
            ...baseEntries,
            MaxLen: annotation.maxLength !== undefined ? new PDFNumber(annotation.maxLength) : null,
            DR: new PDFDictionary({ Font: new PDFDictionary({ F1: formFontRef }) }),
            FT: new PDFName("Tx"),
            Ff: new PDFNumber(buildTextFieldFlags(annotation)),
            DV: annotation.value ? new PDFString(annotation.value) : null,
            TU: annotation.tooltip ? new PDFString(annotation.tooltip) : null,
            V: annotation.value ? new PDFString(annotation.value) : null,
          }));
        } else {
          ctx.addObject(widgetRef, new PDFDictionary({
            ...baseEntries,
            FT: new PDFName("Ch"),
            Ff: new PDFNumber(buildChoiceFieldFlags(annotation)),
            Opt: new PDFArray(annotation.options.map((option) => new PDFString(option))),
            DV: annotation.value ? new PDFString(annotation.value) : null,
            TU: annotation.tooltip ? new PDFString(annotation.tooltip) : null,
            V: annotation.value ? new PDFString(annotation.value) : null,
          }));
        }
        continue;
      }

      if (annotation.kind === "form-signature") {
        const appearanceRef = ctx.allocateRef();
        const widgetRef = ctx.allocateRef();
        const isBoundTarget = signaturePlan
          && signatureTarget
          && signatureValueRef
          && signatureTarget.pageIndex === pageIndex
          && signatureTarget.annotation === annotation;
        annotationRefs.push(widgetRef);
        acroFieldRefs.push(widgetRef);
        ctx.addObject(appearanceRef, buildWidgetAppearanceStream(annotation, formFontRef, pdfaColorSpace && pdfa ? { ...pdfa, colorSpaceArray: pdfaColorSpace } : undefined, runtimeOptions?.onTextEncodingWarning, pageIndex));
        if (isBoundTarget) {
          ctx.addObject(signatureValueRef as PDFRef, new PDFDictionary({
            ByteRange: new PDFRaw(signaturePlan.signature.byteRangePlaceholder),
            ContactInfo: options.signature?.contactInfo ? new PDFString(options.signature.contactInfo) : null,
            Contents: new PDFRaw(signaturePlan.signature.contentsPlaceholder),
            Filter: new PDFName("Adobe.PPKLite"),
            Location: options.signature?.location ? new PDFString(options.signature.location) : null,
            M: formatPdfSignatureDate(options.signature?.signingDate)
              ? new PDFString(formatPdfSignatureDate(options.signature?.signingDate) as string)
              : null,
            Name: options.signature?.signerName ? new PDFString(options.signature.signerName) : null,
            Reason: options.signature?.reason ? new PDFString(options.signature.reason) : null,
            SubFilter: new PDFName("adbe.pkcs7.detached"),
            Type: new PDFName("Sig"),
          }));
        }
        ctx.addObject(widgetRef, new PDFDictionary({
          AP: new PDFDictionary({ N: appearanceRef }),
          F: new PDFNumber(4),
          FT: new PDFName("Sig"),
          P: pageRefs[pageIndex] as PDFRef,
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Widget"),
          T: new PDFString(annotation.fieldName),
          Type: new PDFName("Annot"),
          TU: annotation.tooltip ? new PDFString(annotation.tooltip) : null,
          V: isBoundTarget ? signatureValueRef as PDFRef : null,
        }));
        continue;
      }

      const annotRef = ctx.allocateRef();
      annotationRefs.push(annotRef);
      if (annotation.kind === "link-external") {
        if (pdfa) {
          throw new PdfError(
            "PDFA_VIOLATION",
            "PDF/A does not allow external URI annotations",
            { constraint: "no-external-uri-annotations" },
          );
        }
        ctx.addObject(annotRef, new PDFDictionary({
          A: new PDFDictionary({
            S: new PDFName("URI"),
            Type: new PDFName("Action"),
            URI: new PDFString(annotation.url),
          }),
          Border: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(0)]),
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Link"),
          Type: new PDFName("Annot"),
        }));
        continue;
      }
      if (annotation.kind === "link-internal") {
        ctx.addObject(annotRef, new PDFDictionary({
          A: new PDFDictionary({
            D: createDestinationArray(annotation.destination),
            S: new PDFName("GoTo"),
            Type: new PDFName("Action"),
          }),
          Border: new PDFArray([new PDFNumber(0), new PDFNumber(0), new PDFNumber(0)]),
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Link"),
          Type: new PDFName("Annot"),
        }));
        continue;
      }
      if (annotation.kind === "note") {
        ctx.addObject(annotRef, new PDFDictionary({
          Contents: new PDFString(annotation.contents),
          Name: new PDFName("Comment"),
          Open: annotation.open ?? false,
          Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
          Subtype: new PDFName("Text"),
          T: annotation.title ? new PDFString(annotation.title) : null,
          Type: new PDFName("Annot"),
        }));
        continue;
      }
      ctx.addObject(annotRef, new PDFDictionary({
        C: annotation.color ? colorToPdfArray(annotation.color) : null,
        Contents: annotation.contents ? new PDFString(annotation.contents) : null,
        QuadPoints: new PDFArray(annotation.quadPoints.map((value) => new PDFNumber(value))),
        Rect: new PDFArray(annotation.rect.map((value) => new PDFNumber(value))),
        Subtype: new PDFName("Highlight"),
        Type: new PDFName("Annot"),
      }));
    }

    ctx.addObject(pageRefs[pageIndex] as PDFRef, new PDFDictionary({
      Annots: annotationRefs.length > 0 ? new PDFArray(annotationRefs) : null,
      Contents: contentRefs[pageIndex] as PDFRef,
      MediaBox: new PDFArray([
        new PDFNumber(0),
        new PDFNumber(0),
        new PDFNumber(page.width),
        new PDFNumber(page.height),
      ]),
      Parent: pagesRef,
      Resources: pageResources,
      StructParents: preparedAccessibility ? new PDFNumber(preparedAccessibility.pageStates[pageIndex]?.structParents ?? pageIndex) : null,
      Tabs: hasExplicitTabOrder ? new PDFName("A") : (annotationRefs.length > 0 || preparedAccessibility ? new PDFName("S") : null),
      Type: new PDFName("Page"),
    }));
  });

  for (const [groupName, group] of radioGroups.entries()) {
    const selectedValue = group.selectedValue ? new PDFName(group.selectedValue) : null;
    ctx.addObject(group.parentRef, new PDFDictionary({
      AA: buildJavaScriptAction(group.calculationScript),
      DV: selectedValue,
      Ff: new PDFNumber(buildRadioFieldFlags({
        readOnly: group.widgets.some((widget) => widget.annotation.readOnly),
        required: group.widgets.some((widget) => widget.annotation.required),
      })),
      FT: new PDFName("Btn"),
      Kids: new PDFArray(group.widgets.map((widget) => widget.widgetRef)),
      T: new PDFString(groupName),
      V: selectedValue,
    }));
  }

  ctx.addObject(pagesRef, new PDFDictionary({
    Count: new PDFNumber(pageRefs.length),
    Kids: new PDFArray(pageRefs),
    Type: new PDFName("Pages"),
  }));

  if (pdfa && iccProfileRef && outputIntentRef && pdfaColorSpace) {
    ctx.addObject(iccProfileRef, buildPdfaIccProfileStream(pdfa.iccProfileBuffer));
    ctx.addObject(outputIntentRef, buildPdfaOutputIntentDictionary(iccProfileRef, pdfa.outputConditionIdentifier));
  }

  if (preparedAccessibility && structTreeRootRef && parentTreeRef) {
    const childrenByParent = new Map<string | null, PdfAccessibilityStructureSpec[]>();
    for (const structure of preparedAccessibility.structure) {
      const parentId = structure.parentId ?? null;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(structure);
      childrenByParent.set(parentId, siblings);
    }

    for (const structure of preparedAccessibility.structure) {
      const ref = structureRefLookup.get(structure.id) as PDFRef;
      const parentRef = structure.parentId ? (structureRefLookup.get(structure.parentId) as PDFRef) : structTreeRootRef;
      const childRefs = (childrenByParent.get(structure.id) ?? [])
        .map((child) => structureRefLookup.get(child.id))
        .filter((childRef): childRef is PDFRef => Boolean(childRef));
      const contentRefs = preparedAccessibility.referencesByStructureId.get(structure.id) ?? [];
      ctx.addObject(ref, buildStructureElementDictionary(
        structure,
        parentRef,
        childRefs,
        pageRefs,
        contentRefs,
        structureRefLookup,
      ));
    }

    const parentTreeNums: PDFValue[] = preparedAccessibility.pageStates.flatMap((pageState, pageIndex) => {
      const byMcid = new Map<number, PDFRef>();
      for (const refs of preparedAccessibility.referencesByStructureId.values()) {
        refs
          .filter((entry) => entry.pageIndex === pageIndex)
          .forEach((entry) => {
            const ref = structureRefLookup.get(entry.structureId);
            if (ref) {
              byMcid.set(entry.mcid, ref);
            }
          });
      }
      const refsArray = Array.from({ length: pageState.mcid }, (_, mcid) => byMcid.get(mcid) ?? null);
      return [
        new PDFNumber(pageState.structParents),
        new PDFArray(refsArray as PDFValue[]),
      ];
    });

    ctx.addObject(parentTreeRef, new PDFDictionary({
      Nums: new PDFArray(parentTreeNums),
    }));

    const rootChildren = (childrenByParent.get(null) ?? [])
      .map((child) => structureRefLookup.get(child.id))
      .filter((childRef): childRef is PDFRef => Boolean(childRef));
    ctx.addObject(structTreeRootRef, new PDFDictionary({
      K: new PDFArray(rootChildren),
      ParentTree: parentTreeRef,
      ParentTreeNextKey: new PDFNumber(preparedAccessibility.pageStates.length),
      Type: new PDFName("StructTreeRoot"),
    }));
  }

  if (metadataRef && interactive.metadataXml) {
    ctx.addObject(metadataRef, buildMetadataStream(interactive.metadataXml));
  }

  if (pageLabelsRef && interactive.pageLabels) {
    ctx.addObject(pageLabelsRef, new PDFDictionary({
      Nums: new PDFArray(
        interactive.pageLabels.flatMap((label) => [
          new PDFNumber(label.startPage),
          buildPageLabelDictionary(label),
        ]),
      ),
    }));
  }

  if (outlinesRootRef && interactive.outlines) {
    const buildOutlineObjects = (
      items: PdfOutlineItemSpec[],
      parentRef: PDFRef,
    ): { first?: PDFRef; last?: PDFRef } => {
      let first: PDFRef | undefined;
      let last: PDFRef | undefined;

      items.forEach((item, index) => {
        const ref = outlineRefMap.get(item) as PDFRef;
        const prevRef = index > 0 ? outlineRefMap.get(items[index - 1] as PdfOutlineItemSpec) : undefined;
        const nextRef = index + 1 < items.length ? outlineRefMap.get(items[index + 1] as PdfOutlineItemSpec) : undefined;
        const childResult = item.children && item.children.length > 0 ? buildOutlineObjects(item.children, ref) : undefined;
        ctx.addObject(ref, new PDFDictionary({
          Count: item.children && item.children.length > 0 ? new PDFNumber(-countOutlines(item.children)) : null,
          Dest: createDestinationArray(item.destination),
          First: childResult?.first ?? null,
          Last: childResult?.last ?? null,
          Next: nextRef ?? null,
          Parent: parentRef,
          Prev: prevRef ?? null,
          Title: new PDFString(item.title),
        }));
        if (!first) {
          first = ref;
        }
        last = ref;
      });

      return { first, last };
    };

    const topLevel = buildOutlineObjects(interactive.outlines, outlinesRootRef);
    ctx.addObject(outlinesRootRef, new PDFDictionary({
      Count: new PDFNumber(countOutlines(interactive.outlines)),
      First: topLevel.first ?? null,
      Last: topLevel.last ?? null,
      Type: new PDFName("Outlines"),
    }));
  }

  if (acroFormRef) {
    ctx.addObject(acroFormRef, new PDFDictionary({
      DA: new PDFString("/F1 12 Tf"),
      DR: new PDFDictionary({
        Font: new PDFDictionary({
          F1: formFontRef,
        }),
      }),
      Fields: new PDFArray(acroFieldRefs),
      NeedAppearances: pdfa ? null : true,
      SigFlags: signaturePlan ? new PDFNumber(3) : null,
    }));
  }

  const catalogEntries: Record<string, PDFValue> = {
    Pages: pagesRef,
    Type: new PDFName("Catalog"),
  };
  if (metadataRef) {
    catalogEntries.Metadata = metadataRef;
  }
  if (outputIntentRef && pdfa) {
    catalogEntries.OutputIntents = new PDFArray([outputIntentRef]);
  }
  if (structTreeRootRef && preparedAccessibility) {
    catalogEntries.Lang = new PDFString(interactive.accessibility?.lang ?? "en-US");
    catalogEntries.MarkInfo = new PDFDictionary({
      Marked: true,
    });
    catalogEntries.StructTreeRoot = structTreeRootRef;
    catalogEntries.ViewerPreferences = new PDFDictionary({
      DisplayDocTitle: true,
    });
  }
  if (outlinesRootRef) {
    catalogEntries.Outlines = outlinesRootRef;
    catalogEntries.PageMode = new PDFName("UseOutlines");
  }
  if (pageLabelsRef) {
    catalogEntries.PageLabels = pageLabelsRef;
  }
  if (acroFormRef) {
    catalogEntries.AcroForm = acroFormRef;
  }

  // AES-256 Extension dictionary (must be added before catalog object is created)
  if (options.encryption?.algorithm === "aes-256") {
    catalogEntries.Extensions = new PDFDictionary({
      ADBE: new PDFDictionary({
        BaseVersion: new PDFName("1.7"),
        ExtensionLevel: new PDFNumber(3),
      }),
    });
  }

  ctx.addObject(catalogRef, new PDFDictionary(catalogEntries));
  ctx.addObject(infoRef, buildInfoDictionary(meta));

  // Encryption
  const encryptionResult = options.encryption ? createEncryption(options.encryption) : undefined;

  // Version resolution: each feature implies a minimum version. We then
  // take the max of those minimums and the user's requested version
  // (`options.pdfVersion`). Never auto-downgrade, because doing so could
  // produce output some readers reject (e.g. AES-256 in a 1.4 file).
  const featureMinVersion = (() => {
    if (pdfa) {
      return interactive.pdfa?.conformance === "1b" ? "1.4" : "1.7";
    }
    if (encryptionResult) {
      return options.encryption?.algorithm === "aes-256" ? "1.7" : "1.6";
    }
    return undefined;
  })();
  const requested = options.pdfVersion;
  const pdfVersion: string | undefined = (() => {
    if (!featureMinVersion && !requested) return undefined;
    if (!requested) return featureMinVersion;
    if (!featureMinVersion) return requested;
    // Compare numerically: "1.7" > "1.6" etc., "2.0" > all 1.x.
    return parseFloat(requested) >= parseFloat(featureMinVersion) ? requested : featureMinVersion;
  })();

  const objects = [...ctx.iterateObjects()];
  // Xref streams (M6.b) — opt-in only. The user must explicitly request
  // pdfVersion 1.5+; feature-implied bumps (PDF/A-2b → 1.7, AES-256 → 1.7)
  // keep classic xref because the validator/repair/signature pipelines
  // are still classic-xref-aware. PDF/A and signed renders are also
  // explicitly classic-xref to avoid downstream incompatibility.
  const userRequestedXrefStream = (() => {
    if (!options.pdfVersion) return false;
    if (pdfa) return false;
    if (signaturePlan) return false;
    return parseFloat(options.pdfVersion) >= 1.5;
  })();
  // ObjStm packing is the file-size payoff of opting into 1.5+. Gate it
  // on the same conditions as xref-stream, plus no encryption (per ISO
  // 32000-1 §7.5.7 the encryption interop is intentionally deferred).
  const packObjectStreams = userRequestedXrefStream && !encryptionResult;
  const rendered = writePdfDocument({
    encrypt: encryptionResult,
    fileId: pdfa
      ? createPdfaFileId(objects, catalogRef, infoRef, pdfVersion)
      : options.deterministic
        ? createDeterministicFileId(objects, catalogRef, infoRef, pdfVersion)
        : undefined,
    info: infoRef,
    objects,
    packObjectStreams,
    root: catalogRef,
    useXrefStream: userRequestedXrefStream,
    version: pdfVersion,
  });

  return signaturePlan && options.signature
    ? applyPdfSignaturePlan(rendered, signaturePlan, options.signature)
    : rendered;
}
