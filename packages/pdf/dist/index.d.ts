import { Readable } from 'node:stream';

interface RelaxedInputCoercion {
    code: string;
    path: string;
    description: string;
    legacyShape: string;
    modernShape: string;
}
interface PdfInputWarning {
    code: string;
    message: string;
    path: string;
    from?: unknown;
    to?: unknown;
}
interface PdfRelaxedInputOptions {
    onInputWarning?: (warning: PdfInputWarning) => void;
    relaxed?: boolean;
}
declare const PDF_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[];
declare function preprocessPdfDocumentInput(input: unknown, options?: PdfRelaxedInputOptions): {
    value: unknown;
    warnings: PdfInputWarning[];
};

type PdfValidationIssueCode = "PDF_VALIDATE_SCHEMA" | "PDF_VALIDATE_COLOR_INVALID" | "PDF_VALIDATE_PAGES_EMPTY" | "PDF_VALIDATE_EDGE_WARNING" | "PDF_VALIDATE_PAGE_MARGINS_INVALID";
interface PdfValidationIssue {
    severity: "error" | "warning";
    code: PdfValidationIssueCode;
    message: string;
    path: string;
    suggestion?: string;
}
interface PdfValidationResult {
    ok: boolean;
    issues: PdfValidationIssue[];
}
/**
 * Validate a `PdfDocument` (or relaxed-input shape) without rendering.
 * Returns every issue at once. Does not throw on schema failure.
 */
declare function validatePdfDocumentSafe$1(input: unknown, options?: PdfRelaxedInputOptions): PdfValidationResult;

type PDFValue = PDFArray | PDFDictionary | PDFName | PDFNumber | PDFRaw | PDFRef | PDFStream | PDFString | boolean | null;
type PDFDictionaryEntries = Record<string, PDFValue>;
declare class PDFNumber {
    readonly value: number;
    constructor(value: number);
}
declare class PDFName {
    readonly value: string;
    constructor(value: string);
}
declare class PDFString {
    readonly value: string;
    constructor(value: string);
}
declare class PDFRef {
    readonly objectNumber: number;
    readonly generationNumber: number;
    constructor(objectNumber: number, generationNumber?: number);
}
declare class PDFRaw {
    readonly value: Buffer;
    constructor(value: Buffer | Uint8Array | string);
}
declare class PDFArray {
    readonly values: PDFValue[];
    constructor(values: PDFValue[]);
}
declare class PDFDictionary {
    readonly entries: PDFDictionaryEntries;
    constructor(entries?: PDFDictionaryEntries);
}
declare class PDFStream {
    readonly entries: PDFDictionaryEntries;
    readonly data: Buffer;
    constructor(entries: PDFDictionaryEntries | undefined, data: Buffer | Uint8Array);
}
interface PDFIndirectObject {
    ref: PDFRef;
    value: PDFValue;
}
declare function serializePdfObject(value: PDFValue): Buffer;

type PdfEncryptionAlgorithm = "aes-128" | "aes-256";
interface PdfPermissionFlags {
    print?: boolean;
    modify?: boolean;
    copy?: boolean;
    annotate?: boolean;
    fillForms?: boolean;
    extract?: boolean;
    assemble?: boolean;
    printHighQuality?: boolean;
}
interface PdfEncryptionConfig {
    userPassword: string;
    ownerPassword?: string;
    permissions?: PdfPermissionFlags;
    algorithm?: PdfEncryptionAlgorithm;
}
interface PdfEncryptionResult {
    encryptDict: Record<string, PDFValue>;
    fileId: [Buffer, Buffer];
    encryptString(data: Buffer, objectNumber: number, generationNumber: number): Buffer;
    encryptStream(data: Buffer, objectNumber: number, generationNumber: number): Buffer;
}

interface PDFWriteOptions {
    encrypt?: PdfEncryptionResult;
    fileId?: [Buffer, Buffer];
    info: PDFRef;
    objects: PDFIndirectObject[];
    root: PDFRef;
    version?: string;
    /**
     * Emit a `/Type /XRef` cross-reference stream instead of the classic
     * `xref ... trailer` block. The renderer sets this true only when the
     * caller has explicitly opted into a 1.5+ target via
     * `options.pdfVersion`; feature-implied version bumps (PDF/A-2b → 1.7,
     * AES-256 → 1.7) do NOT switch the xref format on their own, because
     * downstream tooling (validator, repair, signature byte-range
     * computation) depends on the classic xref layout for those code paths.
     */
    useXrefStream?: boolean;
    /**
     * Pack non-stream generation-0 dictionary objects into `/Type /ObjStm`
     * compressed object streams. Requires `useXrefStream: true` (object
     * streams cannot be referenced by classic xref). Mutually exclusive
     * with `encrypt` for now — per ISO 32000-1 §7.5.7, object streams
     * follow per-stream encryption rather than per-object, but the
     * encryption interop is intentionally deferred to a follow-up.
     */
    packObjectStreams?: boolean;
}
declare function writePdfDocument(options: PDFWriteOptions): Buffer;

interface PdfCapabilities {
    assets: boolean;
    encryption: boolean;
    flatPages: boolean;
    forms: boolean;
    interactive: boolean;
    layout: boolean;
    pdfa: boolean;
    signature: boolean;
    streaming: boolean;
    tables: boolean;
    taggedAccessibility: boolean;
}
type PdfSelectedPhase = "phase2-flat" | "phase3-layout" | "phase5-tables" | "phase6-interactive" | "phase7-tagged" | "phase8-pdfa";
interface PdfCapabilityPlan {
    capabilities: PdfCapabilities;
    passes: string[];
    selectedPhase: PdfSelectedPhase;
}
declare function analyzePdfCapabilities(document: PdfDocument, options?: PdfRenderOptions): PdfCapabilities;
declare function planPdfCapabilities(document: PdfDocument, options?: PdfRenderOptions): PdfCapabilityPlan;

type PdfBinarySource = Buffer | Uint8Array | string;
type PdfColor = {
    space: "cmyk";
    c: number;
    k: number;
    m: number;
    y: number;
} | {
    b: number;
    g: number;
    r: number;
    space: "rgb";
};
interface PdfGradientStop {
    color: PdfColor;
    offset: number;
}
interface PdfLinearGradientFill {
    endX: number;
    endY: number;
    opacity?: number;
    space: "linear-gradient";
    startX: number;
    startY: number;
    stops: [PdfGradientStop, PdfGradientStop];
}
interface PdfRadialGradientFill {
    endRadius: number;
    endX: number;
    endY: number;
    opacity?: number;
    space: "radial-gradient";
    startRadius: number;
    startX: number;
    startY: number;
    stops: [PdfGradientStop, PdfGradientStop];
}
interface PdfSolidFill {
    color: PdfColor;
    opacity?: number;
    space: "solid";
}
type PdfFill = PdfLinearGradientFill | PdfRadialGradientFill | PdfSolidFill;
interface PdfStrokeStyle {
    color: PdfColor;
    dash?: number[];
    lineCap?: "butt" | "round" | "square";
    opacity?: number;
    style?: "dashed" | "dotted" | "solid";
    width?: number;
}
interface PdfRectGraphic {
    fill?: PdfFill;
    height: number;
    layer?: "background" | "foreground";
    radius?: number;
    stroke?: PdfStrokeStyle;
    type: "rect";
    width: number;
    x: number;
    y: number;
}
interface PdfLineGraphic {
    layer?: "background" | "foreground";
    stroke: PdfStrokeStyle;
    type: "line";
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}
interface PdfPathGraphic {
    d: string;
    fill?: PdfFill;
    fillRule?: "evenodd" | "nonzero";
    layer?: "background" | "foreground";
    scaleX?: number;
    scaleY?: number;
    stroke?: PdfStrokeStyle;
    type: "path";
    x?: number;
    y?: number;
}
interface PdfImageGraphic {
    format?: "jpeg" | "png";
    height: number;
    layer?: "background" | "foreground";
    opacity?: number;
    source: PdfBinarySource;
    type: "image";
    width: number;
    x: number;
    y: number;
}
interface PdfSvgGraphic {
    height: number;
    layer?: "background" | "foreground";
    opacity?: number;
    source: PdfBinarySource;
    type: "svg";
    width: number;
    x: number;
    y: number;
}
type PdfGraphic = PdfImageGraphic | PdfLineGraphic | PdfPathGraphic | PdfRectGraphic | PdfSvgGraphic;

type PdfQualityVerdict = "PASS" | "WARN" | "FAIL";
type PdfValidationVerdict = "clean" | "warnings" | "errors";
type PdfFindingSeverity = "info" | "warning" | "error";
type PdfFindingCategory = "signature" | "xref" | "stream" | "font" | "image" | "pageTree" | "tagging" | "metadata" | "compliance" | "operational";
type PdfComplianceLevel = "base" | "interactive" | "tagged" | "pdfa" | "signed" | "signed_timestamped";
type PdfFindingCode = "SIGNATURE_INVALID" | "SIGNATURE_MISSING" | "TIMESTAMP_MISSING" | "TIMESTAMP_INVALID" | "XREF_OFFSET_MISMATCH" | "XREF_ENTRY_ZERO_OFFSET" | "XREF_MISSING" | "STREAM_LENGTH_MISMATCH" | "EOF_MARKER_MISSING" | "ROOT_OBJECT_INVALID" | "FONT_SUBSET_INCOMPLETE" | "OBJECT_NUMBER_REUSE" | "FONT_REFERENCE_MISSING" | "FONT_NOT_EMBEDDED" | "IMAGE_REFERENCE_MISSING" | "PAGE_TREE_COUNT_MISMATCH" | "MCID_GAP" | "SELF_REFERENCE" | "INFO_XMP_MISMATCH";
interface PdfP12CertificateSource {
    format: "p12";
    passphrase?: string;
    source: PdfBinarySource;
}
interface PdfPemCertificateSource {
    cert: PdfBinarySource;
    format: "pem";
    key: PdfBinarySource;
    passphrase?: string;
}
type PdfCertificateSource = PdfP12CertificateSource | PdfPemCertificateSource;
interface PdfTimestampAuthorityOptions {
    certificate: PdfCertificateSource;
    fieldName?: string;
    placeholderBytes?: number;
    policyOid?: string;
}
interface PdfSignOptions {
    certificate: PdfCertificateSource;
    contactInfo?: string;
    fieldName?: string;
    location?: string;
    placeholderBytes?: number;
    reason?: string;
    signerName?: string;
    signingDate?: Date | string;
    timestamp?: false | PdfTimestampAuthorityOptions;
}
interface PdfValidationCheck {
    id: string;
    message: string;
    passed: boolean;
    severity: PdfFindingSeverity;
}
interface PdfQualityFinding {
    category: PdfFindingCategory;
    code: PdfFindingCode;
    message: string;
    metadata?: Record<string, boolean | number | string>;
    objectNumber?: number;
    repairable: boolean;
    repaired?: boolean;
    severity: PdfFindingSeverity;
}
interface PdfValidationSummary {
    checks: PdfValidationCheck[];
    complianceLevel: PdfComplianceLevel;
    findings: PdfQualityFinding[];
    fontCount: number;
    imageCount: number;
    pageCount: number;
    signatureCount: number;
    verdict: PdfValidationVerdict;
}
interface PdfRepairAction {
    code: string;
    description: string;
    objectNumber?: number;
}
interface PdfRepairOptions {
    deterministic?: boolean;
    recalculateStreamLengths?: boolean;
    rebuildXref?: boolean;
    repairPageTreeCount?: boolean;
    syncMetadata?: boolean;
}
interface PdfRepairResult {
    actions: PdfRepairAction[];
    buffer: Buffer;
    findings: PdfQualityFinding[];
    repaired: boolean;
    riskyTransformations: boolean;
}
interface PdfRepairValidationResult {
    original: PdfValidationSummary;
    repair: PdfRepairResult;
    repaired: PdfValidationSummary;
}
interface PdfQualityReport {
    complianceLevel: PdfComplianceLevel;
    findings: PdfQualityFinding[];
    fontCount: number;
    imageCount: number;
    pageCount: number;
    projectedFileSizeBytes: number;
    signatureCount: number;
    validation: PdfValidationSummary;
    verdict: PdfQualityVerdict;
}
interface PdfExtractedSignature {
    byteRange: [number, number, number, number];
    contents: Buffer;
    fieldName?: string;
    kind: "signature" | "timestamp";
    objectNumber?: number;
    subFilter: string;
}

type PdfVersion = "1.4" | "1.5" | "1.6" | "1.7" | "2.0";
interface PdfAssetPolicy {
    /**
     * Remote URL sources are disabled by default. Set this to true to permit
     * `http:` / `https:` sources after scheme and byte-limit checks.
     */
    allowRemoteSources?: boolean;
    /** Schemes accepted for string sources. Defaults to file/data/http/https with remote gated separately. */
    allowedSchemes?: Array<"file" | "data" | "http" | "https">;
    /** Optional directory that file paths must resolve within. */
    baseDirectory?: string;
    /** Maximum bytes for a single source. Per-loader defaults still apply when omitted. */
    maxSourceBytes?: number;
    /** Timeout for remote fetches. Defaults to 5000ms. */
    timeoutMs?: number;
}
interface PdfRenderTrace extends PdfCapabilityPlan {
    annotationsCount: number;
    durationMs: number;
    fontCount: number;
    imageCount: number;
    outputBytes: number;
    pageCount: number;
    structureElementCount: number;
    warningCount: number;
}
interface PdfRenderOptions {
    assetPolicy?: PdfAssetPolicy;
    /** Explicit signed license. Takes precedence over RUNSTAMP_LICENSE_KEY. */
    licenseKey?: string;
    encryption?: PdfEncryptionConfig;
    flattenForms?: boolean;
    linearize?: boolean;
    onInputWarning?: (warning: PdfInputWarning) => void;
    onPageSerialized?: (pageIndex: number, totalPages: number) => void;
    onRenderTrace?: (trace: PdfRenderTrace) => void;
    pdfA?: "PDF/A-1b" | "PDF/A-2b";
    /**
     * Target PDF specification version for the file header. The engine
     * may auto-bump above this if a feature requires it (PDF/A-2b → 1.7,
     * AES-256 → 1.7, AES-128 → 1.6) but will never auto-downgrade. When
     * omitted, the engine picks the lowest version that satisfies the
     * requested feature set (1.4 default; bumped only by encryption /
     * PDF/A constraints). Future versions will use this hint to gate
     * 1.5+ features such as object streams.
     */
    pdfVersion?: PdfVersion;
    relaxed?: boolean;
    /**
     * Emit deterministic trailer identifiers for byte-stable test output.
     * Defaults to the package-level `setDeterministicMode()` value.
     */
    deterministic?: boolean;
    signature?: PdfSignOptions;
    /**
     * Throw `PdfError("SCHEMA_REJECTED")` if the input fails Zod schema
     * validation. Defaults to `true`; pass `strict: false` to surface schema
     * failures through `onInputWarning` and render the original input.
     */
    strict?: boolean;
    /**
     * @deprecated Use `strict` instead. When supplied, this legacy option still
     * overrides the default so existing callers can opt into permissive rendering
     * with `strictSchema: false`.
     */
    strictSchema?: boolean;
}

interface PdfEmbeddedFontInput {
    family: string;
    postscriptName?: string;
    source: Buffer | Uint8Array | string;
}
type PdfBuiltInFont = "Helvetica" | "Helvetica-Bold";
type PdfFontInput = PdfBuiltInFont | PdfEmbeddedFontInput;

interface PdfPhase5Border {
    color: PdfColor;
    style?: "dashed" | "dotted" | "double" | "none" | "solid";
    width?: number;
}
interface PdfPhase5TableColumn {
    maxWidth?: number;
    minWidth?: number;
    width?: number | string;
}
interface PdfPhase5CellStyle {
    backgroundColor?: PdfColor;
    borderBottom?: PdfPhase5Border;
    borderLeft?: PdfPhase5Border;
    borderRight?: PdfPhase5Border;
    borderTop?: PdfPhase5Border;
    minHeight?: number;
    padding?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    verticalAlign?: "bottom" | "middle" | "top";
}
interface PdfPhase5RowStyle {
    backgroundColor?: PdfColor;
}
interface PdfPhase5TableStyle extends PdfPhase3Style {
    backgroundColor?: PdfColor;
    borderBottom?: PdfPhase5Border;
    borderCollapse?: "collapse";
    borderLeft?: PdfPhase5Border;
    borderRight?: PdfPhase5Border;
    borderTop?: PdfPhase5Border;
}
type PdfPhase5CellContentNode = PdfPhase3ContainerNode | PdfPhase3HeadingNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode | PdfPhase5TableNode;
interface PdfPhase5TableCell {
    children: PdfPhase5CellContentNode[];
    colSpan?: number;
    role?: "td" | "th";
    rowSpan?: number;
    style?: PdfPhase5CellStyle;
}
interface PdfPhase5TableRow {
    cells: PdfPhase5TableCell[];
    keepTogether?: boolean;
    style?: PdfPhase5RowStyle;
}
interface PdfPhase5TableNode {
    body: PdfPhase5TableRow[];
    borderCollapse?: "collapse";
    columns?: PdfPhase5TableColumn[];
    footer?: PdfPhase5TableRow[];
    header?: PdfPhase5TableRow[];
    style?: PdfPhase5TableStyle;
    type: "table";
}

type PdfPhase3Size = "A4" | "Letter" | "a4" | "letter" | {
    height: number;
    width: number;
};
interface PdfPhase3Margins {
    bottom: number;
    left: number;
    right: number;
    top: number;
}
interface PdfPhase3Page {
    margin?: number | Partial<PdfPhase3Margins>;
    size?: PdfPhase3Size;
}
interface PdfPhase3Style {
    alignItems?: "center" | "flex-end" | "flex-start" | "stretch";
    alignSelf?: "center" | "flex-end" | "flex-start" | "stretch";
    bottom?: number;
    columnGap?: number;
    flexBasis?: number | string;
    flexDirection?: "column" | "row";
    flexGrow?: number;
    flexShrink?: number;
    flexWrap?: "nowrap" | "wrap";
    gap?: number;
    height?: number | string;
    justifyContent?: "center" | "flex-end" | "flex-start" | "space-around" | "space-between";
    left?: number;
    margin?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    marginTop?: number;
    maxHeight?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    minWidth?: number | string;
    padding?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    position?: "absolute" | "relative";
    right?: number;
    rowGap?: number;
    top?: number;
    width?: number | string;
}
interface PdfPhase3WidowOrphan {
    minLinesAfterBreak?: number;
    minLinesBeforeBreak?: number;
}
interface PdfPhase3ExternalLink {
    kind: "external";
    url: string;
}
interface PdfPhase3InternalLink {
    kind: "internal";
    target: string;
}
type PdfPhase3Link = PdfPhase3ExternalLink | PdfPhase3InternalLink;
interface PdfPhase3TextBase {
    direction?: "auto" | "ltr" | "rtl";
    font?: PdfFontInput;
    fontSize?: number;
    id?: string;
    lang?: string;
    lineHeight?: number;
    link?: PdfPhase3Link;
    style?: PdfPhase3Style;
    text?: string;
    textAlign?: "center" | "justify" | "left" | "right";
    value?: string;
    widowOrphan?: PdfPhase3WidowOrphan;
}
interface PdfPhase3ParagraphNode extends PdfPhase3TextBase {
    type: "paragraph";
}
interface PdfPhase3HeadingNode extends PdfPhase3TextBase {
    keepWithNext?: boolean;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    type: "heading";
}
interface PdfPhase3ContainerNode {
    children: PdfDocumentLayoutNode[];
    graphics?: PdfGraphic[];
    id?: string;
    lang?: string;
    style?: PdfPhase3Style;
    type: "container";
}
interface PdfPhase3PreformattedNode extends PdfPhase3TextBase {
    type: "preformatted";
}
interface PdfPhase3DividerNode {
    id?: string;
    lang?: string;
    style?: PdfPhase3Style;
    type: "divider";
}
interface PdfPhase3PageBreakNode {
    id?: string;
    style?: PdfPhase3Style;
    type: "page-break";
}
type PdfPhase3Node = PdfPhase3ContainerNode | PdfPhase3DividerNode | PdfPhase3HeadingNode | PdfPhase3PageBreakNode | PdfPhase3ParagraphNode | PdfPhase3PreformattedNode;
type PdfDocumentLayoutNode = PdfPhase3Node | PdfPhase5TableNode;
interface PdfDocumentPhase3 {
    children?: PdfDocumentLayoutNode[];
    content?: PdfDocumentLayoutNode[];
    meta?: {
        author?: string;
        creationDate?: Date | string;
        creator?: string;
        keywords?: string[];
        modDate?: Date | string;
        producer?: string;
        subject?: string;
        title?: string;
    };
    page?: PdfPhase3Page;
}

interface PdfPhase6TocNode {
    fontSize?: number;
    id?: string;
    indentPerLevel?: number;
    lineHeight?: number;
    maxLevel?: 1 | 2 | 3 | 4 | 5 | 6;
    style?: PdfPhase3Style;
    title?: string;
    titleFontSize?: number;
    type: "toc";
}
interface PdfPhase6TextFieldNode {
    calculate?: string;
    fontColor?: string;
    fontSize?: number;
    height?: number;
    label?: string;
    maxLength?: number;
    multiline?: boolean;
    name: string;
    readOnly?: boolean;
    required?: boolean;
    tooltip?: string;
    tabOrder?: number;
    style?: PdfPhase3Style;
    type: "form-text";
    value?: string;
    width?: number | string;
}
interface PdfPhase6CheckboxNode {
    calculate?: string;
    checked?: boolean;
    fontColor?: string;
    label?: string;
    name: string;
    size?: number;
    readOnly?: boolean;
    required?: boolean;
    tabOrder?: number;
    tooltip?: string;
    style?: PdfPhase3Style;
    type: "form-checkbox";
}
interface PdfPhase6DropdownNode {
    calculate?: string;
    fontColor?: string;
    fontSize?: number;
    height?: number;
    label?: string;
    name: string;
    readOnly?: boolean;
    required?: boolean;
    options: string[];
    tabOrder?: number;
    tooltip?: string;
    style?: PdfPhase3Style;
    type: "form-dropdown";
    value?: string;
    width?: number | string;
}
interface PdfPhase6RadioButtonNode {
    calculate?: string;
    checked?: boolean;
    fontColor?: string;
    label?: string;
    name: string;
    group: string;
    readOnly?: boolean;
    required?: boolean;
    size?: number;
    tabOrder?: number;
    tooltip?: string;
    style?: PdfPhase3Style;
    type: "form-radio";
    value: string;
}
interface PdfPhase6SignatureFieldNode {
    fieldName: string;
    fontColor?: string;
    fontSize?: number;
    height?: number;
    label?: string;
    mode?: "digital" | "visual";
    style?: PdfPhase3Style;
    tabOrder?: number;
    tooltip?: string;
    type: "form-signature";
    value?: string;
    width?: number | string;
}
interface PdfPhase6NoteAnnotationNode {
    contents: string;
    height?: number;
    open?: boolean;
    style?: PdfPhase3Style;
    title?: string;
    type: "note-annotation";
    width?: number | string;
}
interface PdfPhase6HighlightAnnotationNode {
    contents?: string;
    style?: PdfPhase3Style;
    target: string;
    type: "highlight-annotation";
}
interface PdfPhase6PageLabel {
    prefix?: string;
    startNumber?: number;
    startPage: number;
    style: "arabic" | "roman-lower" | "roman-upper";
}
interface PdfPhase6PageNumberOptions {
    fontSize?: number;
    format?: string;
    x?: number;
    y?: number;
}
interface PdfPhase6BookmarkOptions {
    fromHeadings?: boolean;
}
type PdfPhase6DocumentNode = PdfDocumentLayoutNode | PdfPhase6CheckboxNode | PdfPhase6DropdownNode | PdfPhase6HighlightAnnotationNode | PdfPhase6NoteAnnotationNode | PdfPhase6RadioButtonNode | PdfPhase6SignatureFieldNode | PdfPhase6TextFieldNode | PdfPhase6TocNode;
type PdfDynamicHeaderFooterContent = string | PdfDocumentLayoutNode[];
/** Standard report header/footer zones. Each zone is aligned within one third of the configured region. */
interface PdfDynamicHeaderFooterZones {
    center?: string;
    left?: string;
    right?: string;
}
type PdfDynamicHeaderFooterConfiguredContent = PdfDynamicHeaderFooterContent | PdfDynamicHeaderFooterZones;
interface PdfDynamicHeaderFooterOptions {
    content: PdfDynamicHeaderFooterConfiguredContent;
    fontSize?: number;
    height?: number;
    /** Omit this running region from page 1 while retaining its reserved body space. */
    skipFirstPage?: boolean;
    width?: number;
    x?: number;
    y?: number;
}
interface PdfDynamicHeaderOptions extends PdfDynamicHeaderFooterOptions {
    y?: number;
}
interface PdfDynamicFooterOptions extends PdfDynamicHeaderFooterOptions {
    y?: number;
}
interface PdfDocumentPhase6 extends Omit<PdfDocumentPhase3, "children" | "content"> {
    bookmarks?: PdfPhase6BookmarkOptions;
    children?: PdfPhase6DocumentNode[];
    content?: PdfPhase6DocumentNode[];
    dynamicHeader?: PdfDynamicHeaderOptions;
    dynamicFooter?: PdfDynamicFooterOptions;
    pageLabels?: PdfPhase6PageLabel[];
    pageNumber?: PdfPhase6PageNumberOptions;
}

interface PdfPhase7AccessibilityOptions {
    lang?: string;
    tagged?: boolean;
}
interface PdfPhase7FigureNode {
    alt: string;
    format?: "jpeg" | "png" | "svg";
    height: number;
    id?: string;
    lang?: string;
    source: PdfBinarySource;
    style?: PdfPhase3Style;
    type: "figure";
    width: number | string;
}
interface PdfPhase7GraphicNode {
    alt?: string;
    graphic: PdfGraphic;
    id?: string;
    lang?: string;
    style?: PdfPhase3Style;
    type: "graphic";
}
interface PdfPhase7ListItemNode {
    id?: string;
    lang?: string;
    text: string;
}
interface PdfPhase7ListNode {
    id?: string;
    items: PdfPhase7ListItemNode[];
    lang?: string;
    ordered?: boolean;
    style?: PdfPhase3Style;
    type: "list";
}
type PdfPhase7DocumentNode = PdfPhase7FigureNode | PdfPhase7GraphicNode | PdfPhase7ListNode | PdfPhase6DocumentNode;
interface PdfDocumentPhase7 extends Omit<PdfDocumentPhase6, "children" | "content"> {
    accessibility?: PdfPhase7AccessibilityOptions;
    children?: PdfPhase7DocumentNode[];
    content?: PdfPhase7DocumentNode[];
}

type PdfaConformanceLevel = "1b" | "2a" | "2b";
interface PdfPhase8PdfaOptions {
    conformance?: PdfaConformanceLevel;
    enabled?: boolean;
    fallbackFont?: PdfEmbeddedFontInput;
    fallbackFonts?: PdfEmbeddedFontInput[];
    iccProfile?: PdfBinarySource;
    outputConditionIdentifier?: string;
}
interface PdfDocumentPhase8 extends PdfDocumentPhase7 {
    pdfa?: PdfPhase8PdfaOptions;
}

type PdfFormValue = string | boolean | null;
type PdfExistingFormFieldType = "text" | "checkbox" | "radio" | "dropdown" | "signature" | "unsupported";
interface PdfFormFieldInfo {
    name: string;
    type: PdfExistingFormFieldType;
    value?: string | boolean | null;
    required: boolean;
    readOnly: boolean;
    options?: string[];
    maxLength?: number;
    widgetCount: number;
}
interface PdfFormInspection {
    fields: PdfFormFieldInfo[];
    hasXfa: boolean;
    isEncrypted: boolean;
    hasSignatures: boolean;
    unsupported: string[];
}
interface PdfFillExistingFormOptions {
    strict?: boolean;
    updateDefaultValues?: boolean;
    appearance?: "regenerate" | "needAppearances";
}
interface PdfFormFillWarning {
    code: "appearance.need_appearances" | "appearance.fallback_font" | "field.unknown" | "field.readonly";
    field?: string;
    message: string;
}
interface PdfFillExistingFormResult {
    buffer: Buffer;
    filled: string[];
    warnings: PdfFormFillWarning[];
    inspection: PdfFormInspection;
}

type QualityVerdict = "native_editable" | "editable_with_constraints" | "visual_fallback" | "rejected";
type RepairRisk = "none" | "low" | "medium" | "high";
type FindingCode = "SHARED_RELATIONSHIP_TARGET_MISSING" | "SHARED_CONTENT_TYPE_DUPLICATE" | "SHARED_CONTENT_TYPE_MISSING" | "SHARED_CONTENT_TYPE_UNEXPECTED" | "SHARED_RID_NOT_UNIQUE" | "SHARED_ZIP_BOMB_DETECTED" | "SHARED_XML_PARSE_FAILURE" | "SHARED_MEDIA_EMBED_MISSING" | "PPTX_NORMAUTOFIT_MISSING_FONTSCALE" | "PPTX_TABLE_CELL_TEXT_OVERFLOW" | "PPTX_CHART_FORMAT_CODE_UNESCAPED" | "PPTX_ELEMENT_POSITION_CASCADE" | "PPTX_CHART_WORKBOOK_MISSING" | "PPTX_CHART_LABEL_COLLISION" | "PPTX_OVERFLOW_BODY_TEXT" | "PPTX_FONT_FALLBACK_USED" | "PPTX_SLIDE_ID_NOT_UNIQUE" | "PPTX_CUSTDATALIST_CONFLICT" | "PPTX_ELEMENT_ORDER_VIOLATION" | "PPTX_ANIMATION_REF_BROKEN" | "PPTX_HYPERLINK_DANGLING" | "PPTX_MASTER_REF_UNRESOLVED" | "PPTX_FONT_EMBED_FAILED" | "PPTX_STRUCTURAL_VALIDATION_FAILED" | "DOCX_NUMBERING_DEF_MISSING" | "DOCX_STYLE_REF_MISSING" | "DOCX_SECT_PR_MISSING" | "DOCX_TABLE_WIDTH_MISMATCH" | "DOCX_RUN_SPLIT_FORMATTING_LOSS" | "DOCX_TRACKED_CHANGE_MALFORMED" | "DOCX_HEADING_HIERARCHY_BROKEN" | "DOCX_IMAGE_REF_MISSING" | "DOCX_FONT_FALLBACK_USED" | "DOCX_PARAGRAPH_OVERFLOW" | "DOCX_CONTENT_CONTROL_REF_BROKEN" | "DOCX_RELATIONSHIP_TARGET_MISSING" | "XLSX_SHARED_STRING_INDEX_OOB" | "XLSX_STYLE_INDEX_OOB" | "XLSX_MERGE_OVERLAP" | "XLSX_NAMED_RANGE_DEAD_REF" | "XLSX_CHART_WORKBOOK_MISSING" | "XLSX_FORMULA_CACHED_VALUE_MISSING" | "XLSX_SHEET_NAME_INVALID" | "XLSX_DUPLICATE_SHEET_NAME" | "XLSX_RELATIONSHIP_TARGET_MISSING" | "XLSX_TABLE_RELATIONSHIP_BROKEN" | "XLSX_TABLE_NAME_DUPLICATE" | "XLSX_TABLE_REF_INVALID" | "XLSX_WORKSHEET_DIMENSION_MISMATCH" | "XLSX_RANGE_REF_INVALID" | "XLSX_MERGE_RANGE_OUT_OF_BOUNDS" | "XLSX_HYPERLINK_TARGET_INVALID" | "XLSX_MACRO_STRIPPED" | "XLSX_EXTERNAL_CONNECTION_STRIPPED" | "XLSX_GOOGLE_SHEETS_IMPORT_RISK" | "XLSX_NUMBERS_COMPATIBILITY_WARNING" | "XLSX_HIGH_UNIQUE_STRING_COUNT" | "XLSX_STYLE_CARDINALITY_EXCESSIVE" | "XLSX_STREAM_MODE_RECOMMENDED" | "XLSX_FORMULA_REF_BROKEN" | "XLSX_DATE_BEFORE_1900" | "XLSX_LARGE_FILE_WARNING" | "PDF_XREF_OFFSET_INCORRECT" | "PDF_XREF_ENTRY_ZERO_OFFSET" | "PDF_XREF_TABLE_MISSING" | "PDF_FONT_OBJECT_MISSING" | "PDF_FONT_NOT_EMBEDDED" | "PDF_IMAGE_REFERENCE_MISSING" | "PDF_STREAM_LENGTH_INCORRECT" | "PDF_EOF_MARKER_MISSING" | "PDF_ROOT_OBJECT_INVALID" | "PDF_FONT_SUBSET_INCOMPLETE" | "PDF_SIGNATURE_INVALID" | "PDF_SIGNATURE_MISSING" | "PDF_SIGNATURE_BYTERANGE_INVALID" | "PDF_TIMESTAMP_MISSING" | "PDF_TIMESTAMP_INVALID" | "PDF_PAGE_TREE_COUNT_MISMATCH" | "PDF_TAG_MCID_GAP" | "PDF_SELF_REFERENCE" | "PDF_METADATA_INFO_XMP_MISMATCH" | "PDF_OBJECT_NUMBER_REUSE";
interface QualityFinding {
    code: FindingCode;
    severity: "error" | "warning" | "info";
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
    paragraphIndex?: number;
    nodeId?: string;
    message: string;
    autoFixed: boolean;
    repairDescription?: string;
}
interface RepairEntry {
    strategy: string;
    finding: FindingCode;
    description: string;
    success: boolean;
    slideIndex?: number;
    sheetIndex?: number;
    pageIndex?: number;
}
interface QualityReport {
    verdict: QualityVerdict;
    repairRisk: RepairRisk;
    findings: QualityFinding[];
    slideCount?: number;
    sheetCount?: number;
    pageCount?: number;
    chartCount?: number;
    tableCount?: number;
    imageCount?: number;
    fontCount?: number;
    renderTimeMs: number;
    autoFixesApplied: number;
    repairLog: RepairEntry[];
}
interface RenderWithQualityResult {
    output: Buffer;
    quality: QualityReport;
}

interface PdfMetaPhase1 {
    author?: string;
    creationDate?: Date | string;
    creator?: string;
    keywords?: string[];
    modDate?: Date | string;
    producer?: string;
    subject?: string;
    title?: string;
}
interface PdfTextPhase1 {
    direction?: "auto" | "ltr" | "rtl";
    font?: PdfFontInput;
    fallbackFonts?: PdfEmbeddedFontInput[];
    fontSize?: number;
    value: string;
    x?: number;
    y?: number;
}
interface PdfPagePhase2 {
    graphics?: PdfGraphic[];
    height?: number;
    text?: PdfTextPhase1;
    texts?: PdfTextPhase1[];
    width?: number;
}
interface PdfDocumentPhase2 {
    meta?: PdfMetaPhase1;
    pages: PdfPagePhase2[];
}
type PdfDocument = PdfDocumentPhase2 | PdfDocumentPhase8;
declare class PdfEngine {
    private static renderBuffer;
    static render(document: PdfDocument, options?: PdfRenderOptions): Promise<Buffer>;
    static inspectForm(input: Buffer | Uint8Array): Promise<PdfFormInspection>;
    static fillForm(input: Buffer | Uint8Array, values: Record<string, PdfFormValue>, options?: PdfFillExistingFormOptions): Promise<PdfFillExistingFormResult>;
    static renderWithQuality(document: PdfDocument, options?: PdfRenderOptions): Promise<RenderWithQualityResult>;
    static sign(document: PdfDocument, options: PdfSignOptions): Promise<Buffer>;
    /**
     * Validate a `PdfDocument` (synchronous) — returns `{ ok, issues }`
     * without throwing. Mirror of `validateDocxDocument` and
     * `lintSpreadsheetDocument` so a tool can call `validate(doc)` against
     * any engine and get a uniform issue list.
     *
     * Buffer overload — async, returns the deeper post-emit summary.
     */
    static validate(document: unknown): PdfValidationResult;
    static validate(buffer: Buffer): Promise<PdfValidationSummary>;
    static quality(buffer: Buffer): Promise<PdfQualityReport>;
    static repair(buffer: Buffer, options?: PdfRepairOptions): Promise<PdfRepairResult>;
    static validateAndRepair(buffer: Buffer, options?: PdfRepairOptions): Promise<PdfRepairValidationResult>;
    static renderStream(document: PdfDocument, options?: PdfRenderOptions): Readable;
}
declare function validatePdfDocument(document: unknown, options?: Parameters<typeof preprocessPdfDocumentInput>[1]): PdfDocument;

type EvidenceJsonValue = string | number | boolean | null | EvidenceJsonValue[] | {
    [key: string]: EvidenceJsonValue;
};
interface EvidenceDiagnostic {
    code: string;
    message: string;
    locator?: PdfEvidenceLocator;
}
interface EvidenceExtensionResult {
    artifacts: Array<{
        byteLength: number;
        mediaType: string;
        name: string;
        sha256: string;
    }>;
    losses: EvidenceDiagnostic[];
    output?: EvidenceJsonValue;
    status: "error" | "ok";
    warnings: EvidenceDiagnostic[];
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
}
interface EvidenceExtensionContext {
    budget: {
        maxEntries: number;
        maxInputBytes: number;
    };
    checkpoint(usage: {
        entries?: number;
        inputBytes?: number;
    }): void;
    reportProgress(update: {
        completed: number;
        message?: string;
        total: number;
    }): void;
    signal: AbortSignal;
}
interface PdfEvidenceExtensionDefinition {
    manifest: {
        catalogItemId: "A03";
        id: string;
        lossCodes: Array<{
            code: string;
            description: string;
        }>;
        operations: Array<{
            inputKinds: string[];
            name: string;
            outputKinds: string[];
            summary: string;
        }>;
        schemaVersion: 1;
        title: string;
        version: string;
        warningCodes: Array<{
            code: string;
            description: string;
        }>;
    };
    execute(request: {
        input: EvidenceJsonValue;
        operation: string;
    }, context: EvidenceExtensionContext): Promise<EvidenceExtensionResult>;
}
type PdfEvidenceLossCode = "PDF_ANNOTATIONS_STRIPPED" | "PDF_ATTACHMENTS_STRIPPED" | "PDF_FORM_INTERACTIVITY_STRIPPED" | "PDF_GEOMETRY_APPROXIMATED" | "PDF_GRAPHICS_NOT_PRESERVED" | "PDF_METADATA_STRIPPED" | "PDF_OCR_REQUIRED" | "PDF_SIGNATURE_INVALIDATED" | "PDF_TEXT_UNDECODABLE";
interface PdfEvidenceLoss {
    code: PdfEvidenceLossCode;
    message: string;
    locator?: PdfEvidenceLocator;
}
interface PdfEvidenceLocator {
    artifactId: string;
    scheme: "pdf.page" | "pdf.text" | "pdf.table";
    value: Array<string | number>;
}
interface PdfEvidenceRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface PdfEvidenceTextRun {
    confidence: number;
    fontSize: number;
    locator: PdfEvidenceLocator;
    order: number;
    pageIndex: number;
    rect: PdfEvidenceRect;
    source: "native" | "ocr";
    text: string;
}
interface PdfEvidenceTable {
    locator: PdfEvidenceLocator;
    pageIndex: number;
    rows: Array<{
        cells: PdfEvidenceTextRun[];
    }>;
}
interface PdfEvidencePage {
    height: number;
    imageCount: number;
    index: number;
    locator: PdfEvidenceLocator;
    nativeTextRunCount: number;
    ocrRoute: "mixed" | "native" | "scanned";
    width: number;
}
interface PdfEvidenceInspection {
    annotations: Array<{
        objectNumber: number;
        subtype: string;
    }>;
    artifactId: string;
    attachments: Array<{
        objectNumber: number;
        name?: string;
    }>;
    byteLength: number;
    form: PdfFormInspection;
    hasJavaScript: boolean;
    isEncrypted: boolean;
    metadata: Record<string, string>;
    objectCount: number;
    pages: PdfEvidencePage[];
    signatures: Array<{
        fieldName?: string;
        kind: "signature" | "timestamp";
        objectNumber: number;
        subFilter: string;
    }>;
    version: string;
}
interface PdfEvidenceExtraction {
    inspection: PdfEvidenceInspection;
    losses: PdfEvidenceLoss[];
    tables: PdfEvidenceTable[];
    textRuns: PdfEvidenceTextRun[];
}
interface PdfEvidenceMatch {
    end: number;
    locator: PdfEvidenceLocator;
    matchedText: string;
    rect: PdfEvidenceRect;
    start: number;
}
interface PdfEvidenceRedactionPreview {
    matches: PdfEvidenceMatch[];
    rectangles: Array<{
        locator: PdfEvidenceLocator;
        pageIndex: number;
        rect: PdfEvidenceRect;
    }>;
}
interface PdfEvidenceRedaction {
    buffer: Buffer;
    losses: PdfEvidenceLoss[];
    redacted: PdfEvidenceMatch[];
    sha256: string;
}
interface PdfEvidenceExport {
    buffer: Buffer;
    byteLength: number;
    mediaType: "application/pdf";
    sha256: string;
}
interface PdfEvidenceResidual {
    channel: "bytes" | "parser" | "text";
    query: string;
}
interface PdfEvidenceVerification {
    parserVerdict: "clean" | "errors" | "warnings";
    residuals: PdfEvidenceResidual[];
    status: "FAIL" | "PASS";
}
interface PdfEvidenceBudget {
    maxDecodedStreamBytes?: number;
    maxInputBytes?: number;
    maxObjects?: number;
    maxPages?: number;
    maxTextRuns?: number;
    signal?: AbortSignal;
}
interface PdfOcrAdapterContext {
    artifactId: string;
    page: PdfEvidencePage;
    signal: AbortSignal;
}
interface PdfOcrAdapterResult {
    confidence: number;
    runs: Array<{
        confidence?: number;
        rect: PdfEvidenceRect;
        text: string;
    }>;
}
interface PdfOcrAdapter {
    readonly id: string;
    recognize(pdf: Buffer, context: PdfOcrAdapterContext): Promise<PdfOcrAdapterResult>;
}
interface PdfOcrRoute {
    extraction: PdfEvidenceExtraction;
    pages: Array<{
        pageIndex: number;
        route: "mixed" | "native" | "scanned";
        reviewed: boolean;
    }>;
}
declare class PdfEvidenceError extends Error {
    readonly code: "PDF_ABORTED" | "PDF_ACTIVE_CONTENT_REJECTED" | "PDF_MALFORMED" | "PDF_PROTECTED" | "PDF_RESOURCE_LIMIT" | "PDF_UNSUPPORTED";
    readonly details?: Record<string, boolean | number | string>;
    constructor(code: PdfEvidenceError["code"], message: string, details?: Record<string, boolean | number | string>);
}
declare function extractPdfEvidence(input: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<PdfEvidenceExtraction>;
declare function inspectPdfEvidence(input: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<PdfEvidenceInspection>;
declare function routePdfOcr(input: Buffer | Uint8Array, adapter?: PdfOcrAdapter, budget?: PdfEvidenceBudget): Promise<PdfOcrRoute>;
declare function findPdfEvidence(extraction: PdfEvidenceExtraction, query: string, options?: {
    caseSensitive?: boolean;
    mode?: "exact" | "regex";
}): PdfEvidenceMatch[];
declare function previewPdfRedactions(matches: PdfEvidenceMatch[]): PdfEvidenceRedactionPreview;
declare function renderPdfEvidence(extraction: PdfEvidenceExtraction, omitted?: PdfEvidenceMatch[]): Promise<Buffer>;
declare function redactPdfEvidence(input: Buffer | Uint8Array, matches: PdfEvidenceMatch[], budget?: PdfEvidenceBudget): Promise<PdfEvidenceRedaction>;
declare function exportPdfEvidence(buffer: Buffer | Uint8Array, budget?: PdfEvidenceBudget): Promise<PdfEvidenceExport>;
declare function verifyPdfRedaction(bufferInput: Buffer | Uint8Array, forbidden: string[], budget?: PdfEvidenceBudget): Promise<PdfEvidenceVerification>;
declare function createPdfEvidenceExtension(): PdfEvidenceExtensionDefinition;

/**
 * Public color parser. Accepts the relaxed forms an LLM or hand-authored JSON
 * is likely to emit (hex strings, `rgb(...)` strings, named colors, RGB or
 * CMYK objects with mixed 0–1 vs 0–255 components) and returns the canonical
 * `PdfColor` shape with all components in the strict 0..1 PDF range.
 *
 * Addresses `docs/0428-claude-test-based-directive2.md` §"@runstamp/pdf"
 * items (1) and (2): hex must be accepted at the API boundary, and a single
 * helper must produce the canonical shape used everywhere downstream.
 */

type PdfColorInput = string | {
    space: "rgb";
    r: number;
    g: number;
    b: number;
} | {
    space: "cmyk";
    c: number;
    m: number;
    y: number;
    k: number;
} | {
    r: number;
    g: number;
    b: number;
} | {
    c: number;
    m: number;
    y: number;
    k: number;
};
declare class PdfColorParseError extends Error {
    readonly input: unknown;
    readonly path: string | undefined;
    constructor(message: string, input: unknown, path?: string);
}
/**
 * Parse a relaxed color input into the canonical `PdfColor` shape.
 *
 * Accepted inputs:
 *   - Hex strings: "#RGB", "#RRGGBB", "RGB", "RRGGBB"
 *   - rgb()/rgba() strings: "rgb(229, 231, 235)" / "rgba(0, 0, 0, 0.5)" (alpha is ignored)
 *   - Named colors: black, white, red, green, blue, gray
 *   - RGB object: { r, g, b } or { space: "rgb", r, g, b } (components in 0..1)
 *   - CMYK object: { c, m, y, k } or { space: "cmyk", c, m, y, k } (components in 0..1)
 *
 * @throws PdfColorParseError with a path-prefixed message
 */
declare function parseColor(input: PdfColorInput, path?: string): PdfColor;
declare function tryParseColor(input: unknown, path?: string): PdfColor | undefined;

interface PdfRenderMeta {
    author?: string;
    creationDate?: Date | string;
    creator?: string;
    keywords?: string[];
    modificationDate?: Date | string;
    producer?: string;
    subject?: string;
    title?: string;
}
type PdfTransformMatrix = [number, number, number, number, number, number];
interface PdfRenderableText {
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
type PdfRenderableGraphic = PdfGraphic & {
    accessibility?: PdfMarkedContentSpec;
    layer?: "background" | "foreground";
    transform?: PdfTransformMatrix;
};
interface PdfMarkedContentSpec {
    actualText?: string;
    alt?: string;
    artifact?: boolean;
    headers?: string[];
    lang?: string;
    role: string;
    scope?: "Column" | "Row";
    structureId?: string;
}
interface PdfAccessibilityStructureSpec {
    alt?: string;
    headers?: string[];
    id: string;
    lang?: string;
    parentId?: string | null;
    role: string;
    scope?: "Column" | "Row";
}
interface PdfDocumentAccessibilitySpec {
    lang?: string;
    structure: PdfAccessibilityStructureSpec[];
}
type PdfPageExtraCommand = string | {
    accessibility?: PdfMarkedContentSpec;
    command: string;
};
interface PdfRenderedPage {
    annotations?: PdfPageAnnotationSpec[];
    extraCommands?: PdfPageExtraCommand[];
    graphics?: PdfRenderableGraphic[];
    height: number;
    texts: PdfRenderableText[];
    width: number;
}
interface PdfDestinationSpec {
    left: number;
    pageIndex: number;
    top: number;
    zoom?: number | null;
}
interface PdfPageLabelSpec {
    prefix?: string;
    startNumber?: number;
    startPage: number;
    style: "arabic" | "roman-lower" | "roman-upper";
}
interface PdfExternalLinkAnnotationSpec {
    kind: "link-external";
    rect: [number, number, number, number];
    url: string;
}
interface PdfInternalLinkAnnotationSpec {
    destination: PdfDestinationSpec;
    kind: "link-internal";
    rect: [number, number, number, number];
}
interface PdfTextAnnotationSpec {
    contents: string;
    kind: "note";
    open?: boolean;
    rect: [number, number, number, number];
    title?: string;
}
interface PdfHighlightAnnotationSpec {
    color?: PdfColor;
    contents?: string;
    kind: "highlight";
    quadPoints: [number, number, number, number, number, number, number, number];
    rect: [number, number, number, number];
}
interface PdfTextFieldWidgetSpec {
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
interface PdfCheckboxWidgetSpec {
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
interface PdfDropdownWidgetSpec {
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
interface PdfRadioWidgetSpec {
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
interface PdfSignatureWidgetSpec {
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
type PdfPageAnnotationSpec = PdfCheckboxWidgetSpec | PdfDropdownWidgetSpec | PdfExternalLinkAnnotationSpec | PdfHighlightAnnotationSpec | PdfInternalLinkAnnotationSpec | PdfTextAnnotationSpec | PdfRadioWidgetSpec | PdfSignatureWidgetSpec | PdfTextFieldWidgetSpec;
interface PdfOutlineItemSpec {
    children?: PdfOutlineItemSpec[];
    destination: PdfDestinationSpec;
    title: string;
}
interface PdfDocumentInteractiveSpec {
    accessibility?: PdfDocumentAccessibilitySpec;
    sharedForms?: PdfSharedFormSpec[];
    metadataXml?: string;
    outlines?: PdfOutlineItemSpec[];
    pageLabels?: PdfPageLabelSpec[];
    pdfa?: PdfRenderPdfaSpec;
}
interface PdfRenderPdfaSpec {
    conformance: "1b" | "2a" | "2b";
    defaultFont?: PdfEmbeddedFontInput;
    defaultFontKey?: string;
    iccProfile: PdfBinarySource;
    outputConditionIdentifier: string;
}
interface PdfTextEncodingWarning {
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
interface PdfRenderRuntimeOptions {
    assetPolicy?: PdfAssetPolicy;
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
interface PdfSharedFormSpec {
    alias: string;
    bbox: [number, number, number, number];
    commands: string;
    fontResourceKey?: string;
}
declare function renderPdfPages(options: {
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
}): Promise<Buffer>;

declare const SRGB_ICC_PROFILE: Buffer;

type _JSONSchema = boolean | JSONSchema;
type JSONSchema = {
    [k: string]: unknown;
    $schema?: "https://json-schema.org/draft/2020-12/schema" | "http://json-schema.org/draft-07/schema#" | "http://json-schema.org/draft-04/schema#";
    $id?: string;
    $anchor?: string;
    $ref?: string;
    $dynamicRef?: string;
    $dynamicAnchor?: string;
    $vocabulary?: Record<string, boolean>;
    $comment?: string;
    $defs?: Record<string, JSONSchema>;
    type?: "object" | "array" | "string" | "number" | "boolean" | "null" | "integer";
    additionalItems?: _JSONSchema;
    unevaluatedItems?: _JSONSchema;
    prefixItems?: _JSONSchema[];
    items?: _JSONSchema | _JSONSchema[];
    contains?: _JSONSchema;
    additionalProperties?: _JSONSchema;
    unevaluatedProperties?: _JSONSchema;
    properties?: Record<string, _JSONSchema>;
    patternProperties?: Record<string, _JSONSchema>;
    dependentSchemas?: Record<string, _JSONSchema>;
    propertyNames?: _JSONSchema;
    if?: _JSONSchema;
    then?: _JSONSchema;
    else?: _JSONSchema;
    allOf?: JSONSchema[];
    anyOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    not?: _JSONSchema;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number | boolean;
    minimum?: number;
    exclusiveMinimum?: number | boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    dependentRequired?: Record<string, string[]>;
    enum?: Array<string | number | boolean | null>;
    const?: string | number | boolean | null;
    id?: string;
    title?: string;
    description?: string;
    default?: unknown;
    deprecated?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    nullable?: boolean;
    examples?: unknown[];
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    contentSchema?: JSONSchema;
    _prefault?: unknown;
};
type BaseSchema = JSONSchema;

/** The Standard interface. */
interface StandardTypedV1<Input = unknown, Output = Input> {
    /** The Standard properties. */
    readonly "~standard": StandardTypedV1.Props<Input, Output>;
}
declare namespace StandardTypedV1 {
    /** The Standard properties interface. */
    interface Props<Input = unknown, Output = Input> {
        /** The version number of the standard. */
        readonly version: 1;
        /** The vendor name of the schema library. */
        readonly vendor: string;
        /** Inferred types associated with the schema. */
        readonly types?: Types<Input, Output> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> {
        /** The input type of the schema. */
        readonly input: Input;
        /** The output type of the schema. */
        readonly output: Output;
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["input"];
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
    /** The Standard Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Validates unknown input values. */
        readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
    }
    /** The result interface of the validate function. */
    type Result<Output> = SuccessResult<Output> | FailureResult;
    /** The result interface if validation succeeds. */
    interface SuccessResult<Output> {
        /** The typed output value. */
        readonly value: Output;
        /** The absence of issues indicates success. */
        readonly issues?: undefined;
    }
    interface Options {
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The result interface if validation fails. */
    interface FailureResult {
        /** The issues of failed validation. */
        readonly issues: ReadonlyArray<Issue>;
    }
    /** The issue interface of the failure output. */
    interface Issue {
        /** The error message of the issue. */
        readonly message: string;
        /** The path of the issue, if any. */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    /** The path segment interface of the issue. */
    interface PathSegment {
        /** The key representing a path segment. */
        readonly key: PropertyKey;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
/** The Standard JSON Schema interface. */
interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
    /** The Standard JSON Schema properties. */
    readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}
declare namespace StandardJSONSchemaV1 {
    /** The Standard JSON Schema properties interface. */
    interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
        /** Methods for generating the input/output JSON Schema. */
        readonly jsonSchema: Converter;
    }
    /** The Standard JSON Schema converter interface. */
    interface Converter {
        /** Converts the input type to JSON Schema. May throw if conversion is not supported. */
        readonly input: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
        /** Converts the output type to JSON Schema. May throw if conversion is not supported. */
        readonly output: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
    }
    /** The target version of the generated JSON Schema.
     *
     * It is *strongly recommended* that implementers support `"draft-2020-12"` and `"draft-07"`, as they are both in wide use.
     *
     * The `"openapi-3.0"` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema `"draft-04"`.
     *
     * All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.
     */
    type Target = "draft-2020-12" | "draft-07" | "openapi-3.0" | ({} & string);
    /** The options for the input/output methods. */
    interface Options {
        /** Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. */
        readonly target: Target;
        /** Implicit support for additional vendor-specific parameters, if needed. */
        readonly libraryOptions?: Record<string, unknown> | undefined;
    }
    /** The Standard types interface. */
    interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {
    }
    /** Infers the input type of a Standard. */
    type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
    /** Infers the output type of a Standard. */
    type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
interface StandardSchemaWithJSONProps<Input = unknown, Output = Input> extends StandardSchemaV1.Props<Input, Output>, StandardJSONSchemaV1.Props<Input, Output> {
}

declare const $output: unique symbol;
type $output = typeof $output;
declare const $input: unique symbol;
type $input = typeof $input;
type $replace<Meta, S extends $ZodType> = Meta extends $output ? output<S> : Meta extends $input ? input<S> : Meta extends (infer M)[] ? $replace<M, S>[] : Meta extends (...args: infer P) => infer R ? (...args: {
    [K in keyof P]: $replace<P[K], S>;
}) => $replace<R, S> : Meta extends object ? {
    [K in keyof Meta]: $replace<Meta[K], S>;
} : Meta;
type MetadataType = object | undefined;
declare class $ZodRegistry<Meta extends MetadataType = MetadataType, Schema extends $ZodType = $ZodType> {
    _meta: Meta;
    _schema: Schema;
    _map: WeakMap<Schema, $replace<Meta, Schema>>;
    _idmap: Map<string, Schema>;
    add<S extends Schema>(schema: S, ..._meta: undefined extends Meta ? [$replace<Meta, S>?] : [$replace<Meta, S>]): this;
    clear(): this;
    remove(schema: Schema): this;
    get<S extends Schema>(schema: S): $replace<Meta, S> | undefined;
    has(schema: Schema): boolean;
}
interface JSONSchemaMeta {
    id?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    deprecated?: boolean | undefined;
    [k: string]: unknown;
}
interface GlobalMeta extends JSONSchemaMeta {
}

type Processor<T extends $ZodType = $ZodType> = (schema: T, ctx: ToJSONSchemaContext, json: BaseSchema, params: ProcessParams) => void;
interface JSONSchemaGeneratorParams {
    processors: Record<string, Processor>;
    /** A registry used to look up metadata for each schema. Any schema with an `id` property will be extracted as a $def.
     *  @default globalRegistry */
    metadata?: $ZodRegistry<Record<string, any>>;
    /** The JSON Schema version to target.
     * - `"draft-2020-12"` — Default. JSON Schema Draft 2020-12
     * - `"draft-07"` — JSON Schema Draft 7
     * - `"draft-04"` — JSON Schema Draft 4
     * - `"openapi-3.0"` — OpenAPI 3.0 Schema Object */
    target?: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string) | undefined;
    /** How to handle unrepresentable types.
     * - `"throw"` — Default. Unrepresentable types throw an error
     * - `"any"` — Unrepresentable types become `{}` */
    unrepresentable?: "throw" | "any";
    /** Arbitrary custom logic that can be used to modify the generated JSON Schema. */
    override?: (ctx: {
        zodSchema: $ZodTypes;
        jsonSchema: BaseSchema;
        path: (string | number)[];
    }) => void;
    /** Whether to extract the `"input"` or `"output"` type. Relevant to transforms, defaults, coerced primitives, etc.
     * - `"output"` — Default. Convert the output schema.
     * - `"input"` — Convert the input schema. */
    io?: "input" | "output";
    cycles?: "ref" | "throw";
    reused?: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, BaseSchema>;
    } | undefined;
}
/**
 * Parameters for the toJSONSchema function.
 */
type ToJSONSchemaParams = Omit<JSONSchemaGeneratorParams, "processors" | "external">;
interface ProcessParams {
    schemaPath: $ZodType[];
    path: (string | number)[];
}
interface Seen {
    /** JSON Schema result for this Zod schema */
    schema: BaseSchema;
    /** A cached version of the schema that doesn't get overwritten during ref resolution */
    def?: BaseSchema;
    defId?: string | undefined;
    /** Number of times this schema was encountered during traversal */
    count: number;
    /** Cycle path */
    cycle?: (string | number)[] | undefined;
    isParent?: boolean | undefined;
    /** Schema to inherit JSON Schema properties from (set by processor for wrappers) */
    ref?: $ZodType | null;
    /** JSON Schema property path for this schema */
    path?: (string | number)[] | undefined;
}
interface ToJSONSchemaContext {
    processors: Record<string, Processor>;
    metadataRegistry: $ZodRegistry<Record<string, any>>;
    target: "draft-04" | "draft-07" | "draft-2020-12" | "openapi-3.0" | ({} & string);
    unrepresentable: "throw" | "any";
    override: (ctx: {
        zodSchema: $ZodType;
        jsonSchema: BaseSchema;
        path: (string | number)[];
    }) => void;
    io: "input" | "output";
    counter: number;
    seen: Map<$ZodType, Seen>;
    cycles: "ref" | "throw";
    reused: "ref" | "inline";
    external?: {
        registry: $ZodRegistry<{
            id?: string | undefined;
        }>;
        uri?: ((id: string) => string) | undefined;
        defs: Record<string, BaseSchema>;
    } | undefined;
}
type ZodStandardSchemaWithJSON$1<T> = StandardSchemaWithJSONProps<input<T>, output<T>>;
interface ZodStandardJSONSchemaPayload<T> extends BaseSchema {
    "~standard": ZodStandardSchemaWithJSON$1<T>;
}

type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "PS256" | "PS384" | "PS512" | "EdDSA" | (string & {});
type MimeTypes = "application/json" | "application/xml" | "application/x-www-form-urlencoded" | "application/javascript" | "application/pdf" | "application/zip" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/octet-stream" | "application/graphql" | "text/html" | "text/plain" | "text/css" | "text/javascript" | "text/csv" | "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" | "image/webp" | "audio/mpeg" | "audio/ogg" | "audio/wav" | "audio/webm" | "video/mp4" | "video/webm" | "video/ogg" | "font/woff" | "font/woff2" | "font/ttf" | "font/otf" | "multipart/form-data" | (string & {});
type IsAny<T> = 0 extends 1 & T ? true : false;
type Omit$1<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type MakePartial<T, K extends keyof T> = Omit$1<T, K> & InexactPartial<Pick<T, K>>;
type NoUndefined<T> = T extends undefined ? never : T;
type LoosePartial<T extends object> = InexactPartial<T> & {
    [k: string]: unknown;
};
type Mask<Keys extends PropertyKey> = {
    [K in Keys]?: true;
};
type InexactPartial<T> = {
    [P in keyof T]?: T[P] | undefined;
};
type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
type SomeObject = Record<PropertyKey, any>;
type Identity<T> = T;
type Flatten<T> = Identity<{
    [k in keyof T]: T[k];
}>;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type Extend<A extends SomeObject, B extends SomeObject> = Flatten<keyof A & keyof B extends never ? A & B : {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & {
    [K in keyof B]: B[K];
}>;
type TupleItems = ReadonlyArray<SomeType>;
type AnyFunc = (...args: any[]) => any;
type MaybeAsync<T> = T | Promise<T>;
type EnumValue = string | number;
type EnumLike = Readonly<Record<string, EnumValue>>;
type ToEnum<T extends EnumValue> = Flatten<{
    [k in T]: k;
}>;
type Literal = string | number | bigint | boolean | null | undefined;
type Primitive = string | number | symbol | bigint | boolean | null | undefined;
type HasLength = {
    length: number;
};
type Numeric = number | bigint | Date;
type PropValues = Record<string, Set<Primitive>>;
type PrimitiveSet = Set<Primitive>;
type EmptyToNever<T> = keyof T extends never ? never : T;
declare abstract class Class {
    constructor(..._args: any[]);
}

declare const version: {
    readonly major: 4;
    readonly minor: 3;
    readonly patch: number;
};

interface ParseContext<T extends $ZodIssueBase = never> {
    /** Customize error messages. */
    readonly error?: $ZodErrorMap<T>;
    /** Include the `input` field in issue objects. Default `false`. */
    readonly reportInput?: boolean;
    /** Skip eval-based fast path. Default `false`. */
    readonly jitless?: boolean;
}
/** @internal */
interface ParseContextInternal<T extends $ZodIssueBase = never> extends ParseContext<T> {
    readonly async?: boolean | undefined;
    readonly direction?: "forward" | "backward";
    readonly skipChecks?: boolean;
}
interface ParsePayload<T = unknown> {
    value: T;
    issues: $ZodRawIssue[];
    /** A may to mark a whole payload as aborted. Used in codecs/pipes. */
    aborted?: boolean;
}
type CheckFn<T> = (input: ParsePayload<T>) => MaybeAsync<void>;
interface $ZodTypeDef {
    type: "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "null" | "undefined" | "void" | "never" | "any" | "unknown" | "date" | "object" | "record" | "file" | "array" | "tuple" | "union" | "intersection" | "map" | "set" | "enum" | "literal" | "nullable" | "optional" | "nonoptional" | "success" | "transform" | "default" | "prefault" | "catch" | "nan" | "pipe" | "readonly" | "template_literal" | "promise" | "lazy" | "function" | "custom";
    error?: $ZodErrorMap<never> | undefined;
    checks?: $ZodCheck<never>[];
}
interface _$ZodTypeInternals {
    /** The `@zod/core` version of this schema */
    version: typeof version;
    /** Schema definition. */
    def: $ZodTypeDef;
    /** @internal Randomly generated ID for this schema. */
    /** @internal List of deferred initializers. */
    deferred: AnyFunc[] | undefined;
    /** @internal Parses input and runs all checks (refinements). */
    run(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
    /** @internal Parses input, doesn't run checks. */
    parse(payload: ParsePayload<any>, ctx: ParseContextInternal): MaybeAsync<ParsePayload>;
    /** @internal  Stores identifiers for the set of traits implemented by this schema. */
    traits: Set<string>;
    /** @internal Indicates that a schema output type should be considered optional inside objects.
     * @default Required
     */
    /** @internal */
    optin?: "optional" | undefined;
    /** @internal */
    optout?: "optional" | undefined;
    /** @internal The set of literal values that will pass validation. Must be an exhaustive set. Used to determine optionality in z.record().
     *
     * Defined on: enum, const, literal, null, undefined
     * Passthrough: optional, nullable, branded, default, catch, pipe
     * Todo: unions?
     */
    values?: PrimitiveSet | undefined;
    /** Default value bubbled up from  */
    /** @internal A set of literal discriminators used for the fast path in discriminated unions. */
    propValues?: PropValues | undefined;
    /** @internal This flag indicates that a schema validation can be represented with a regular expression. Used to determine allowable schemas in z.templateLiteral(). */
    pattern: RegExp | undefined;
    /** @internal The constructor function of this schema. */
    constr: new (def: any) => $ZodType;
    /** @internal A catchall object for bag metadata related to this schema. Commonly modified by checks using `onattach`. */
    bag: Record<string, unknown>;
    /** @internal The set of issues this schema might throw during type checking. */
    isst: $ZodIssueBase;
    /** @internal Subject to change, not a public API. */
    processJSONSchema?: ((ctx: ToJSONSchemaContext, json: BaseSchema, params: ProcessParams) => void) | undefined;
    /** An optional method used to override `toJSONSchema` logic. */
    toJSONSchema?: () => unknown;
    /** @internal The parent of this schema. Only set during certain clone operations. */
    parent?: $ZodType | undefined;
}
/** @internal */
interface $ZodTypeInternals<out O = unknown, out I = unknown> extends _$ZodTypeInternals {
    /** @internal The inferred output type */
    output: O;
    /** @internal The inferred input type */
    input: I;
}
type $ZodStandardSchema<T> = StandardSchemaV1.Props<input<T>, output<T>>;
type SomeType = {
    _zod: _$ZodTypeInternals;
};
interface _$ZodType<T extends $ZodTypeInternals = $ZodTypeInternals> extends $ZodType<T["output"], T["input"], T> {
}
interface $ZodType<O = unknown, I = unknown, Internals extends $ZodTypeInternals<O, I> = $ZodTypeInternals<O, I>> {
    _zod: Internals;
    "~standard": $ZodStandardSchema<this>;
}
declare const $ZodType: $constructor<$ZodType>;

interface $ZodStringDef extends $ZodTypeDef {
    type: "string";
    coerce?: boolean;
    checks?: $ZodCheck<string>[];
}
interface $ZodStringInternals<Input> extends $ZodTypeInternals<string, Input> {
    def: $ZodStringDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        patterns: Set<RegExp>;
        format: string;
        contentEncoding: string;
    }>;
}
interface $ZodString<Input = unknown> extends _$ZodType<$ZodStringInternals<Input>> {
}
declare const $ZodString: $constructor<$ZodString>;
interface $ZodStringFormatDef<Format extends string = string> extends $ZodStringDef, $ZodCheckStringFormatDef<Format> {
}
interface $ZodStringFormatInternals<Format extends string = string> extends $ZodStringInternals<string>, $ZodCheckStringFormatInternals {
    def: $ZodStringFormatDef<Format>;
}
interface $ZodStringFormat<Format extends string = string> extends $ZodType {
    _zod: $ZodStringFormatInternals<Format>;
}
declare const $ZodStringFormat: $constructor<$ZodStringFormat>;
interface $ZodGUIDInternals extends $ZodStringFormatInternals<"guid"> {
}
interface $ZodGUID extends $ZodType {
    _zod: $ZodGUIDInternals;
}
declare const $ZodGUID: $constructor<$ZodGUID>;
interface $ZodUUIDDef extends $ZodStringFormatDef<"uuid"> {
    version?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8";
}
interface $ZodUUIDInternals extends $ZodStringFormatInternals<"uuid"> {
    def: $ZodUUIDDef;
}
interface $ZodUUID extends $ZodType {
    _zod: $ZodUUIDInternals;
}
declare const $ZodUUID: $constructor<$ZodUUID>;
interface $ZodEmailInternals extends $ZodStringFormatInternals<"email"> {
}
interface $ZodEmail extends $ZodType {
    _zod: $ZodEmailInternals;
}
declare const $ZodEmail: $constructor<$ZodEmail>;
interface $ZodURLDef extends $ZodStringFormatDef<"url"> {
    hostname?: RegExp | undefined;
    protocol?: RegExp | undefined;
    normalize?: boolean | undefined;
}
interface $ZodURLInternals extends $ZodStringFormatInternals<"url"> {
    def: $ZodURLDef;
}
interface $ZodURL extends $ZodType {
    _zod: $ZodURLInternals;
}
declare const $ZodURL: $constructor<$ZodURL>;
interface $ZodEmojiInternals extends $ZodStringFormatInternals<"emoji"> {
}
interface $ZodEmoji extends $ZodType {
    _zod: $ZodEmojiInternals;
}
declare const $ZodEmoji: $constructor<$ZodEmoji>;
interface $ZodNanoIDInternals extends $ZodStringFormatInternals<"nanoid"> {
}
interface $ZodNanoID extends $ZodType {
    _zod: $ZodNanoIDInternals;
}
declare const $ZodNanoID: $constructor<$ZodNanoID>;
interface $ZodCUIDInternals extends $ZodStringFormatInternals<"cuid"> {
}
interface $ZodCUID extends $ZodType {
    _zod: $ZodCUIDInternals;
}
declare const $ZodCUID: $constructor<$ZodCUID>;
interface $ZodCUID2Internals extends $ZodStringFormatInternals<"cuid2"> {
}
interface $ZodCUID2 extends $ZodType {
    _zod: $ZodCUID2Internals;
}
declare const $ZodCUID2: $constructor<$ZodCUID2>;
interface $ZodULIDInternals extends $ZodStringFormatInternals<"ulid"> {
}
interface $ZodULID extends $ZodType {
    _zod: $ZodULIDInternals;
}
declare const $ZodULID: $constructor<$ZodULID>;
interface $ZodXIDInternals extends $ZodStringFormatInternals<"xid"> {
}
interface $ZodXID extends $ZodType {
    _zod: $ZodXIDInternals;
}
declare const $ZodXID: $constructor<$ZodXID>;
interface $ZodKSUIDInternals extends $ZodStringFormatInternals<"ksuid"> {
}
interface $ZodKSUID extends $ZodType {
    _zod: $ZodKSUIDInternals;
}
declare const $ZodKSUID: $constructor<$ZodKSUID>;
interface $ZodISODateTimeDef extends $ZodStringFormatDef<"datetime"> {
    precision: number | null;
    offset: boolean;
    local: boolean;
}
interface $ZodISODateTimeInternals extends $ZodStringFormatInternals {
    def: $ZodISODateTimeDef;
}
interface $ZodISODateTime extends $ZodType {
    _zod: $ZodISODateTimeInternals;
}
declare const $ZodISODateTime: $constructor<$ZodISODateTime>;
interface $ZodISODateInternals extends $ZodStringFormatInternals<"date"> {
}
interface $ZodISODate extends $ZodType {
    _zod: $ZodISODateInternals;
}
declare const $ZodISODate: $constructor<$ZodISODate>;
interface $ZodISOTimeDef extends $ZodStringFormatDef<"time"> {
    precision?: number | null;
}
interface $ZodISOTimeInternals extends $ZodStringFormatInternals<"time"> {
    def: $ZodISOTimeDef;
}
interface $ZodISOTime extends $ZodType {
    _zod: $ZodISOTimeInternals;
}
declare const $ZodISOTime: $constructor<$ZodISOTime>;
interface $ZodISODurationInternals extends $ZodStringFormatInternals<"duration"> {
}
interface $ZodISODuration extends $ZodType {
    _zod: $ZodISODurationInternals;
}
declare const $ZodISODuration: $constructor<$ZodISODuration>;
interface $ZodIPv4Def extends $ZodStringFormatDef<"ipv4"> {
    version?: "v4";
}
interface $ZodIPv4Internals extends $ZodStringFormatInternals<"ipv4"> {
    def: $ZodIPv4Def;
}
interface $ZodIPv4 extends $ZodType {
    _zod: $ZodIPv4Internals;
}
declare const $ZodIPv4: $constructor<$ZodIPv4>;
interface $ZodIPv6Def extends $ZodStringFormatDef<"ipv6"> {
    version?: "v6";
}
interface $ZodIPv6Internals extends $ZodStringFormatInternals<"ipv6"> {
    def: $ZodIPv6Def;
}
interface $ZodIPv6 extends $ZodType {
    _zod: $ZodIPv6Internals;
}
declare const $ZodIPv6: $constructor<$ZodIPv6>;
interface $ZodCIDRv4Def extends $ZodStringFormatDef<"cidrv4"> {
    version?: "v4";
}
interface $ZodCIDRv4Internals extends $ZodStringFormatInternals<"cidrv4"> {
    def: $ZodCIDRv4Def;
}
interface $ZodCIDRv4 extends $ZodType {
    _zod: $ZodCIDRv4Internals;
}
declare const $ZodCIDRv4: $constructor<$ZodCIDRv4>;
interface $ZodCIDRv6Def extends $ZodStringFormatDef<"cidrv6"> {
    version?: "v6";
}
interface $ZodCIDRv6Internals extends $ZodStringFormatInternals<"cidrv6"> {
    def: $ZodCIDRv6Def;
}
interface $ZodCIDRv6 extends $ZodType {
    _zod: $ZodCIDRv6Internals;
}
declare const $ZodCIDRv6: $constructor<$ZodCIDRv6>;
interface $ZodBase64Internals extends $ZodStringFormatInternals<"base64"> {
}
interface $ZodBase64 extends $ZodType {
    _zod: $ZodBase64Internals;
}
declare const $ZodBase64: $constructor<$ZodBase64>;
interface $ZodBase64URLInternals extends $ZodStringFormatInternals<"base64url"> {
}
interface $ZodBase64URL extends $ZodType {
    _zod: $ZodBase64URLInternals;
}
declare const $ZodBase64URL: $constructor<$ZodBase64URL>;
interface $ZodE164Internals extends $ZodStringFormatInternals<"e164"> {
}
interface $ZodE164 extends $ZodType {
    _zod: $ZodE164Internals;
}
declare const $ZodE164: $constructor<$ZodE164>;
interface $ZodJWTDef extends $ZodStringFormatDef<"jwt"> {
    alg?: JWTAlgorithm | undefined;
}
interface $ZodJWTInternals extends $ZodStringFormatInternals<"jwt"> {
    def: $ZodJWTDef;
}
interface $ZodJWT extends $ZodType {
    _zod: $ZodJWTInternals;
}
declare const $ZodJWT: $constructor<$ZodJWT>;
interface $ZodNumberDef extends $ZodTypeDef {
    type: "number";
    coerce?: boolean;
}
interface $ZodNumberInternals<Input = unknown> extends $ZodTypeInternals<number, Input> {
    def: $ZodNumberDef;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    /** @deprecated Internal API, use with caution (not deprecated) */
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        exclusiveMinimum: number;
        exclusiveMaximum: number;
        format: string;
        pattern: RegExp;
    }>;
}
interface $ZodNumber<Input = unknown> extends $ZodType {
    _zod: $ZodNumberInternals<Input>;
}
declare const $ZodNumber: $constructor<$ZodNumber>;
interface $ZodBooleanDef extends $ZodTypeDef {
    type: "boolean";
    coerce?: boolean;
    checks?: $ZodCheck<boolean>[];
}
interface $ZodBooleanInternals<T = unknown> extends $ZodTypeInternals<boolean, T> {
    pattern: RegExp;
    def: $ZodBooleanDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodBoolean<T = unknown> extends $ZodType {
    _zod: $ZodBooleanInternals<T>;
}
declare const $ZodBoolean: $constructor<$ZodBoolean>;
interface $ZodBigIntDef extends $ZodTypeDef {
    type: "bigint";
    coerce?: boolean;
}
interface $ZodBigIntInternals<T = unknown> extends $ZodTypeInternals<bigint, T> {
    pattern: RegExp;
    /** @internal Internal API, use with caution */
    def: $ZodBigIntDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: bigint;
        maximum: bigint;
        format: string;
    }>;
}
interface $ZodBigInt<T = unknown> extends $ZodType {
    _zod: $ZodBigIntInternals<T>;
}
declare const $ZodBigInt: $constructor<$ZodBigInt>;
interface $ZodSymbolDef extends $ZodTypeDef {
    type: "symbol";
}
interface $ZodSymbolInternals extends $ZodTypeInternals<symbol, symbol> {
    def: $ZodSymbolDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodSymbol extends $ZodType {
    _zod: $ZodSymbolInternals;
}
declare const $ZodSymbol: $constructor<$ZodSymbol>;
interface $ZodUndefinedDef extends $ZodTypeDef {
    type: "undefined";
}
interface $ZodUndefinedInternals extends $ZodTypeInternals<undefined, undefined> {
    pattern: RegExp;
    def: $ZodUndefinedDef;
    values: PrimitiveSet;
    isst: $ZodIssueInvalidType;
}
interface $ZodUndefined extends $ZodType {
    _zod: $ZodUndefinedInternals;
}
declare const $ZodUndefined: $constructor<$ZodUndefined>;
interface $ZodNullDef extends $ZodTypeDef {
    type: "null";
}
interface $ZodNullInternals extends $ZodTypeInternals<null, null> {
    pattern: RegExp;
    def: $ZodNullDef;
    values: PrimitiveSet;
    isst: $ZodIssueInvalidType;
}
interface $ZodNull extends $ZodType {
    _zod: $ZodNullInternals;
}
declare const $ZodNull: $constructor<$ZodNull>;
interface $ZodAnyDef extends $ZodTypeDef {
    type: "any";
}
interface $ZodAnyInternals extends $ZodTypeInternals<any, any> {
    def: $ZodAnyDef;
    isst: never;
}
interface $ZodAny extends $ZodType {
    _zod: $ZodAnyInternals;
}
declare const $ZodAny: $constructor<$ZodAny>;
interface $ZodUnknownDef extends $ZodTypeDef {
    type: "unknown";
}
interface $ZodUnknownInternals extends $ZodTypeInternals<unknown, unknown> {
    def: $ZodUnknownDef;
    isst: never;
}
interface $ZodUnknown extends $ZodType {
    _zod: $ZodUnknownInternals;
}
declare const $ZodUnknown: $constructor<$ZodUnknown>;
interface $ZodNeverDef extends $ZodTypeDef {
    type: "never";
}
interface $ZodNeverInternals extends $ZodTypeInternals<never, never> {
    def: $ZodNeverDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodNever extends $ZodType {
    _zod: $ZodNeverInternals;
}
declare const $ZodNever: $constructor<$ZodNever>;
interface $ZodVoidDef extends $ZodTypeDef {
    type: "void";
}
interface $ZodVoidInternals extends $ZodTypeInternals<void, void> {
    def: $ZodVoidDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodVoid extends $ZodType {
    _zod: $ZodVoidInternals;
}
declare const $ZodVoid: $constructor<$ZodVoid>;
interface $ZodDateDef extends $ZodTypeDef {
    type: "date";
    coerce?: boolean;
}
interface $ZodDateInternals<T = unknown> extends $ZodTypeInternals<Date, T> {
    def: $ZodDateDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: Date;
        maximum: Date;
        format: string;
    }>;
}
interface $ZodDate<T = unknown> extends $ZodType {
    _zod: $ZodDateInternals<T>;
}
declare const $ZodDate: $constructor<$ZodDate>;
interface $ZodArrayDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "array";
    element: T;
}
interface $ZodArrayInternals<T extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodArrayDef<T>;
    isst: $ZodIssueInvalidType;
    output: output<T>[];
    input: input<T>[];
}
interface $ZodArray<T extends SomeType = $ZodType> extends $ZodType<any, any, $ZodArrayInternals<T>> {
}
declare const $ZodArray: $constructor<$ZodArray>;
type OptionalOutSchema = {
    _zod: {
        optout: "optional";
    };
};
type OptionalInSchema = {
    _zod: {
        optin: "optional";
    };
};
type $InferObjectOutput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? IsAny<T[keyof T]> extends true ? Record<string, unknown> : Record<string, output<T[keyof T]>> : keyof (T & Extra) extends never ? Record<string, never> : Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? never : k]: T[k]["_zod"]["output"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalOutSchema ? k : never]?: T[k]["_zod"]["output"];
} & Extra>;
type $InferObjectInput<T extends $ZodLooseShape, Extra extends Record<string, unknown>> = string extends keyof T ? IsAny<T[keyof T]> extends true ? Record<string, unknown> : Record<string, input<T[keyof T]>> : keyof (T & Extra) extends never ? Record<string, never> : Prettify<{
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? never : k]: T[k]["_zod"]["input"];
} & {
    -readonly [k in keyof T as T[k] extends OptionalInSchema ? k : never]?: T[k]["_zod"]["input"];
} & Extra>;
type $ZodObjectConfig = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
type $loose = {
    out: Record<string, unknown>;
    in: Record<string, unknown>;
};
type $strict = {
    out: {};
    in: {};
};
type $strip = {
    out: {};
    in: {};
};
type $catchall<T extends SomeType> = {
    out: {
        [k: string]: output<T>;
    };
    in: {
        [k: string]: input<T>;
    };
};
type $ZodShape = Readonly<{
    [k: string]: $ZodType;
}>;
interface $ZodObjectDef<Shape extends $ZodShape = $ZodShape> extends $ZodTypeDef {
    type: "object";
    shape: Shape;
    catchall?: $ZodType | undefined;
}
interface $ZodObjectInternals<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodShape, out Config extends $ZodObjectConfig = $ZodObjectConfig> extends _$ZodTypeInternals {
    def: $ZodObjectDef<Shape>;
    config: Config;
    isst: $ZodIssueInvalidType | $ZodIssueUnrecognizedKeys;
    propValues: PropValues;
    output: $InferObjectOutput<Shape, Config["out"]>;
    input: $InferObjectInput<Shape, Config["in"]>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
type $ZodLooseShape = Record<string, any>;
interface $ZodObject<
/** @ts-ignore Cast variance */
out Shape extends Readonly<$ZodShape> = Readonly<$ZodShape>, out Params extends $ZodObjectConfig = $ZodObjectConfig> extends $ZodType<any, any, $ZodObjectInternals<Shape, Params>> {
}
declare const $ZodObject: $constructor<$ZodObject>;
type $InferUnionOutput<T extends SomeType> = T extends any ? output<T> : never;
type $InferUnionInput<T extends SomeType> = T extends any ? input<T> : never;
interface $ZodUnionDef<Options extends readonly SomeType[] = readonly $ZodType[]> extends $ZodTypeDef {
    type: "union";
    options: Options;
    inclusive?: boolean;
}
type IsOptionalIn<T extends SomeType> = T extends OptionalInSchema ? true : false;
type IsOptionalOut<T extends SomeType> = T extends OptionalOutSchema ? true : false;
interface $ZodUnionInternals<T extends readonly SomeType[] = readonly $ZodType[]> extends _$ZodTypeInternals {
    def: $ZodUnionDef<T>;
    isst: $ZodIssueInvalidUnion;
    pattern: T[number]["_zod"]["pattern"];
    values: T[number]["_zod"]["values"];
    output: $InferUnionOutput<T[number]>;
    input: $InferUnionInput<T[number]>;
    optin: IsOptionalIn<T[number]> extends false ? "optional" | undefined : "optional";
    optout: IsOptionalOut<T[number]> extends false ? "optional" | undefined : "optional";
}
interface $ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends $ZodType<any, any, $ZodUnionInternals<T>> {
    _zod: $ZodUnionInternals<T>;
}
declare const $ZodUnion: $constructor<$ZodUnion>;
interface $ZodIntersectionDef<Left extends SomeType = $ZodType, Right extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "intersection";
    left: Left;
    right: Right;
}
interface $ZodIntersectionInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _$ZodTypeInternals {
    def: $ZodIntersectionDef<A, B>;
    isst: never;
    optin: A["_zod"]["optin"] | B["_zod"]["optin"];
    optout: A["_zod"]["optout"] | B["_zod"]["optout"];
    output: output<A> & output<B>;
    input: input<A> & input<B>;
}
interface $ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodIntersectionInternals<A, B>;
}
declare const $ZodIntersection: $constructor<$ZodIntersection>;
interface $ZodTupleDef<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodTypeDef {
    type: "tuple";
    items: T;
    rest: Rest;
}
type $InferTupleInputType<T extends TupleItems, Rest extends SomeType | null> = [
    ...TupleInputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? input<Rest>[] : [])
];
type TupleInputTypeNoOptionals<T extends TupleItems> = {
    [k in keyof T]: input<T[k]>;
};
type TupleInputTypeWithOptionals<T extends TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optin"] extends "optional" ? [...TupleInputTypeWithOptionals<Prefix>, input<Tail>?] : TupleInputTypeNoOptionals<T> : [];
type $InferTupleOutputType<T extends TupleItems, Rest extends SomeType | null> = [
    ...TupleOutputTypeWithOptionals<T>,
    ...(Rest extends SomeType ? output<Rest>[] : [])
];
type TupleOutputTypeNoOptionals<T extends TupleItems> = {
    [k in keyof T]: output<T[k]>;
};
type TupleOutputTypeWithOptionals<T extends TupleItems> = T extends readonly [
    ...infer Prefix extends SomeType[],
    infer Tail extends SomeType
] ? Tail["_zod"]["optout"] extends "optional" ? [...TupleOutputTypeWithOptionals<Prefix>, output<Tail>?] : TupleOutputTypeNoOptionals<T> : [];
interface $ZodTupleInternals<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends _$ZodTypeInternals {
    def: $ZodTupleDef<T, Rest>;
    isst: $ZodIssueInvalidType | $ZodIssueTooBig<unknown[]> | $ZodIssueTooSmall<unknown[]>;
    output: $InferTupleOutputType<T, Rest>;
    input: $InferTupleInputType<T, Rest>;
}
interface $ZodTuple<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends $ZodType {
    _zod: $ZodTupleInternals<T, Rest>;
}
declare const $ZodTuple: $constructor<$ZodTuple>;
type $ZodRecordKey = $ZodType<string | number | symbol, unknown>;
interface $ZodRecordDef<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "record";
    keyType: Key;
    valueType: Value;
    /** @default "strict" - errors on keys not matching keyType. "loose" passes through non-matching keys unchanged. */
    mode?: "strict" | "loose";
}
type $InferZodRecordOutput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<output<Key>, output<Value>>> : Record<output<Key>, output<Value>>;
type $InferZodRecordInput<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> = Key extends $partial ? Partial<Record<input<Key> & PropertyKey, input<Value>>> : Record<input<Key> & PropertyKey, input<Value>>;
interface $ZodRecordInternals<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodTypeInternals<$InferZodRecordOutput<Key, Value>, $InferZodRecordInput<Key, Value>> {
    def: $ZodRecordDef<Key, Value>;
    isst: $ZodIssueInvalidType | $ZodIssueInvalidKey<Record<PropertyKey, unknown>>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
type $partial = {
    "~~partial": true;
};
interface $ZodRecord<Key extends $ZodRecordKey = $ZodRecordKey, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodRecordInternals<Key, Value>;
}
declare const $ZodRecord: $constructor<$ZodRecord>;
interface $ZodMapDef<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "map";
    keyType: Key;
    valueType: Value;
}
interface $ZodMapInternals<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodTypeInternals<Map<output<Key>, output<Value>>, Map<input<Key>, input<Value>>> {
    def: $ZodMapDef<Key, Value>;
    isst: $ZodIssueInvalidType | $ZodIssueInvalidKey | $ZodIssueInvalidElement<unknown>;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
interface $ZodMap<Key extends SomeType = $ZodType, Value extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodMapInternals<Key, Value>;
}
declare const $ZodMap: $constructor<$ZodMap>;
interface $ZodSetDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "set";
    valueType: T;
}
interface $ZodSetInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Set<output<T>>, Set<input<T>>> {
    def: $ZodSetDef<T>;
    isst: $ZodIssueInvalidType;
    optin?: "optional" | undefined;
    optout?: "optional" | undefined;
}
interface $ZodSet<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSetInternals<T>;
}
declare const $ZodSet: $constructor<$ZodSet>;
type $InferEnumOutput<T extends EnumLike> = T[keyof T] & {};
type $InferEnumInput<T extends EnumLike> = T[keyof T] & {};
interface $ZodEnumDef<T extends EnumLike = EnumLike> extends $ZodTypeDef {
    type: "enum";
    entries: T;
}
interface $ZodEnumInternals<
/** @ts-ignore Cast variance */
out T extends EnumLike = EnumLike> extends $ZodTypeInternals<$InferEnumOutput<T>, $InferEnumInput<T>> {
    def: $ZodEnumDef<T>;
    /** @deprecated Internal API, use with caution (not deprecated) */
    values: PrimitiveSet;
    /** @deprecated Internal API, use with caution (not deprecated) */
    pattern: RegExp;
    isst: $ZodIssueInvalidValue;
}
interface $ZodEnum<T extends EnumLike = EnumLike> extends $ZodType {
    _zod: $ZodEnumInternals<T>;
}
declare const $ZodEnum: $constructor<$ZodEnum>;
interface $ZodLiteralDef<T extends Literal> extends $ZodTypeDef {
    type: "literal";
    values: T[];
}
interface $ZodLiteralInternals<T extends Literal = Literal> extends $ZodTypeInternals<T, T> {
    def: $ZodLiteralDef<T>;
    values: Set<T>;
    pattern: RegExp;
    isst: $ZodIssueInvalidValue;
}
interface $ZodLiteral<T extends Literal = Literal> extends $ZodType {
    _zod: $ZodLiteralInternals<T>;
}
declare const $ZodLiteral: $constructor<$ZodLiteral>;
type _File = typeof globalThis extends {
    File: infer F extends new (...args: any[]) => any;
} ? InstanceType<F> : {};
/** Do not reference this directly. */
interface File extends _File {
    readonly type: string;
    readonly size: number;
}
interface $ZodFileDef extends $ZodTypeDef {
    type: "file";
}
interface $ZodFileInternals extends $ZodTypeInternals<File, File> {
    def: $ZodFileDef;
    isst: $ZodIssueInvalidType;
    bag: LoosePartial<{
        minimum: number;
        maximum: number;
        mime: MimeTypes[];
    }>;
}
interface $ZodFile extends $ZodType {
    _zod: $ZodFileInternals;
}
declare const $ZodFile: $constructor<$ZodFile>;
interface $ZodTransformDef extends $ZodTypeDef {
    type: "transform";
    transform: (input: unknown, payload: ParsePayload<unknown>) => MaybeAsync<unknown>;
}
interface $ZodTransformInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I> {
    def: $ZodTransformDef;
    isst: never;
}
interface $ZodTransform<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodTransformInternals<O, I>;
}
declare const $ZodTransform: $constructor<$ZodTransform>;
interface $ZodOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "optional";
    innerType: T;
}
interface $ZodOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T> | undefined, input<T> | undefined> {
    def: $ZodOptionalDef<T>;
    optin: "optional";
    optout: "optional";
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
interface $ZodOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodOptionalInternals<T>;
}
declare const $ZodOptional: $constructor<$ZodOptional>;
interface $ZodExactOptionalDef<T extends SomeType = $ZodType> extends $ZodOptionalDef<T> {
}
interface $ZodExactOptionalInternals<T extends SomeType = $ZodType> extends $ZodOptionalInternals<T> {
    def: $ZodExactOptionalDef<T>;
    output: output<T>;
    input: input<T>;
}
interface $ZodExactOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodExactOptionalInternals<T>;
}
declare const $ZodExactOptional: $constructor<$ZodExactOptional>;
interface $ZodNullableDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nullable";
    innerType: T;
}
interface $ZodNullableInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T> | null, input<T> | null> {
    def: $ZodNullableDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
    pattern: T["_zod"]["pattern"];
}
interface $ZodNullable<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNullableInternals<T>;
}
declare const $ZodNullable: $constructor<$ZodNullable>;
interface $ZodDefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "default";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: NoUndefined<output<T>>;
}
interface $ZodDefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, input<T> | undefined> {
    def: $ZodDefaultDef<T>;
    optin: "optional";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodDefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodDefaultInternals<T>;
}
declare const $ZodDefault: $constructor<$ZodDefault>;
interface $ZodPrefaultDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "prefault";
    innerType: T;
    /** The default value. May be a getter. */
    defaultValue: input<T>;
}
interface $ZodPrefaultInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, input<T> | undefined> {
    def: $ZodPrefaultDef<T>;
    optin: "optional";
    optout?: "optional" | undefined;
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodPrefault<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPrefaultInternals<T>;
}
declare const $ZodPrefault: $constructor<$ZodPrefault>;
interface $ZodNonOptionalDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "nonoptional";
    innerType: T;
}
interface $ZodNonOptionalInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<NoUndefined<output<T>>, NoUndefined<input<T>>> {
    def: $ZodNonOptionalDef<T>;
    isst: $ZodIssueInvalidType;
    values: T["_zod"]["values"];
    optin: "optional" | undefined;
    optout: "optional" | undefined;
}
interface $ZodNonOptional<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodNonOptionalInternals<T>;
}
declare const $ZodNonOptional: $constructor<$ZodNonOptional>;
interface $ZodSuccessDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "success";
    innerType: T;
}
interface $ZodSuccessInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<boolean, input<T>> {
    def: $ZodSuccessDef<T>;
    isst: never;
    optin: T["_zod"]["optin"];
    optout: "optional" | undefined;
}
interface $ZodSuccess<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodSuccessInternals<T>;
}
declare const $ZodSuccess: $constructor<$ZodSuccess>;
interface $ZodCatchCtx extends ParsePayload {
    /** @deprecated Use `ctx.issues` */
    error: {
        issues: $ZodIssue[];
    };
    /** @deprecated Use `ctx.value` */
    input: unknown;
}
interface $ZodCatchDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "catch";
    innerType: T;
    catchValue: (ctx: $ZodCatchCtx) => unknown;
}
interface $ZodCatchInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>, input<T>> {
    def: $ZodCatchDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    values: T["_zod"]["values"];
}
interface $ZodCatch<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodCatchInternals<T>;
}
declare const $ZodCatch: $constructor<$ZodCatch>;
interface $ZodNaNDef extends $ZodTypeDef {
    type: "nan";
}
interface $ZodNaNInternals extends $ZodTypeInternals<number, number> {
    def: $ZodNaNDef;
    isst: $ZodIssueInvalidType;
}
interface $ZodNaN extends $ZodType {
    _zod: $ZodNaNInternals;
}
declare const $ZodNaN: $constructor<$ZodNaN>;
interface $ZodPipeDef<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "pipe";
    in: A;
    out: B;
    /** Only defined inside $ZodCodec instances. */
    transform?: (value: output<A>, payload: ParsePayload<output<A>>) => MaybeAsync<input<B>>;
    /** Only defined inside $ZodCodec instances. */
    reverseTransform?: (value: input<B>, payload: ParsePayload<input<B>>) => MaybeAsync<output<A>>;
}
interface $ZodPipeInternals<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodTypeInternals<output<B>, input<A>> {
    def: $ZodPipeDef<A, B>;
    isst: never;
    values: A["_zod"]["values"];
    optin: A["_zod"]["optin"];
    optout: B["_zod"]["optout"];
    propValues: A["_zod"]["propValues"];
}
interface $ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPipeInternals<A, B>;
}
declare const $ZodPipe: $constructor<$ZodPipe>;
interface $ZodReadonlyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "readonly";
    innerType: T;
}
interface $ZodReadonlyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<MakeReadonly<output<T>>, MakeReadonly<input<T>>> {
    def: $ZodReadonlyDef<T>;
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
    isst: never;
    propValues: T["_zod"]["propValues"];
    values: T["_zod"]["values"];
}
interface $ZodReadonly<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodReadonlyInternals<T>;
}
declare const $ZodReadonly: $constructor<$ZodReadonly>;
interface $ZodTemplateLiteralDef extends $ZodTypeDef {
    type: "template_literal";
    parts: $ZodTemplateLiteralPart[];
    format?: string | undefined;
}
interface $ZodTemplateLiteralInternals<Template extends string = string> extends $ZodTypeInternals<Template, Template> {
    pattern: RegExp;
    def: $ZodTemplateLiteralDef;
    isst: $ZodIssueInvalidType;
}
type LiteralPart = Exclude<Literal, symbol>;
interface SchemaPartInternals extends $ZodTypeInternals<LiteralPart, LiteralPart> {
    pattern: RegExp;
}
interface SchemaPart extends $ZodType {
    _zod: SchemaPartInternals;
}
type $ZodTemplateLiteralPart = LiteralPart | SchemaPart;
interface $ZodTemplateLiteral<Template extends string = string> extends $ZodType {
    _zod: $ZodTemplateLiteralInternals<Template>;
}
declare const $ZodTemplateLiteral: $constructor<$ZodTemplateLiteral>;
type $ZodFunctionArgs = $ZodType<unknown[], unknown[]>;
type $ZodFunctionIn = $ZodFunctionArgs;
type $ZodFunctionOut = $ZodType;
type $InferInnerFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : output<Args>) => input<Returns>;
type $InferInnerFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : output<Args>) => MaybeAsync<input<Returns>>;
type $InferOuterFunctionType<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : input<Args>) => output<Returns>;
type $InferOuterFunctionTypeAsync<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> = (...args: $ZodFunctionIn extends Args ? never[] : input<Args>) => Promise<output<Returns>>;
interface $ZodFunctionDef<In extends $ZodFunctionIn = $ZodFunctionIn, Out extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodTypeDef {
    type: "function";
    input: In;
    output: Out;
}
interface $ZodFunctionInternals<Args extends $ZodFunctionIn, Returns extends $ZodFunctionOut> extends $ZodTypeInternals<$InferOuterFunctionType<Args, Returns>, $InferInnerFunctionType<Args, Returns>> {
    def: $ZodFunctionDef<Args, Returns>;
    isst: $ZodIssueInvalidType;
}
interface $ZodFunction<Args extends $ZodFunctionIn = $ZodFunctionIn, Returns extends $ZodFunctionOut = $ZodFunctionOut> extends $ZodType<any, any, $ZodFunctionInternals<Args, Returns>> {
    /** @deprecated */
    _def: $ZodFunctionDef<Args, Returns>;
    _input: $InferInnerFunctionType<Args, Returns>;
    _output: $InferOuterFunctionType<Args, Returns>;
    implement<F extends $InferInnerFunctionType<Args, Returns>>(func: F): (...args: Parameters<this["_output"]>) => ReturnType<F> extends ReturnType<this["_output"]> ? ReturnType<F> : ReturnType<this["_output"]>;
    implementAsync<F extends $InferInnerFunctionTypeAsync<Args, Returns>>(func: F): F extends $InferOuterFunctionTypeAsync<Args, Returns> ? F : $InferOuterFunctionTypeAsync<Args, Returns>;
    input<const Items extends TupleItems, const Rest extends $ZodFunctionOut = $ZodFunctionOut>(args: Items, rest?: Rest): $ZodFunction<$ZodTuple<Items, Rest>, Returns>;
    input<NewArgs extends $ZodFunctionIn>(args: NewArgs): $ZodFunction<NewArgs, Returns>;
    input(...args: any[]): $ZodFunction<any, Returns>;
    output<NewReturns extends $ZodType>(output: NewReturns): $ZodFunction<Args, NewReturns>;
}
declare const $ZodFunction: $constructor<$ZodFunction>;
interface $ZodPromiseDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "promise";
    innerType: T;
}
interface $ZodPromiseInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<Promise<output<T>>, MaybeAsync<input<T>>> {
    def: $ZodPromiseDef<T>;
    isst: never;
}
interface $ZodPromise<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodPromiseInternals<T>;
}
declare const $ZodPromise: $constructor<$ZodPromise>;
interface $ZodLazyDef<T extends SomeType = $ZodType> extends $ZodTypeDef {
    type: "lazy";
    getter: () => T;
}
interface $ZodLazyInternals<T extends SomeType = $ZodType> extends $ZodTypeInternals<output<T>, input<T>> {
    def: $ZodLazyDef<T>;
    isst: never;
    /** Auto-cached way to retrieve the inner schema */
    innerType: T;
    pattern: T["_zod"]["pattern"];
    propValues: T["_zod"]["propValues"];
    optin: T["_zod"]["optin"];
    optout: T["_zod"]["optout"];
}
interface $ZodLazy<T extends SomeType = $ZodType> extends $ZodType {
    _zod: $ZodLazyInternals<T>;
}
declare const $ZodLazy: $constructor<$ZodLazy>;
interface $ZodCustomDef<O = unknown> extends $ZodTypeDef, $ZodCheckDef {
    type: "custom";
    check: "custom";
    path?: PropertyKey[] | undefined;
    error?: $ZodErrorMap | undefined;
    params?: Record<string, any> | undefined;
    fn: (arg: O) => unknown;
}
interface $ZodCustomInternals<O = unknown, I = unknown> extends $ZodTypeInternals<O, I>, $ZodCheckInternals<O> {
    def: $ZodCustomDef;
    issc: $ZodIssue;
    isst: never;
    bag: LoosePartial<{
        Class: typeof Class;
    }>;
}
interface $ZodCustom<O = unknown, I = unknown> extends $ZodType {
    _zod: $ZodCustomInternals<O, I>;
}
declare const $ZodCustom: $constructor<$ZodCustom>;
type $ZodTypes = $ZodString | $ZodNumber | $ZodBigInt | $ZodBoolean | $ZodDate | $ZodSymbol | $ZodUndefined | $ZodNullable | $ZodNull | $ZodAny | $ZodUnknown | $ZodNever | $ZodVoid | $ZodArray | $ZodObject | $ZodUnion | $ZodIntersection | $ZodTuple | $ZodRecord | $ZodMap | $ZodSet | $ZodLiteral | $ZodEnum | $ZodFunction | $ZodPromise | $ZodLazy | $ZodOptional | $ZodDefault | $ZodPrefault | $ZodTemplateLiteral | $ZodCustom | $ZodTransform | $ZodNonOptional | $ZodReadonly | $ZodNaN | $ZodPipe | $ZodSuccess | $ZodCatch | $ZodFile;

interface $ZodCheckDef {
    check: string;
    error?: $ZodErrorMap<never> | undefined;
    /** If true, no later checks will be executed if this check fails. Default `false`. */
    abort?: boolean | undefined;
    /** If provided, this check will only be executed if the function returns `true`. Defaults to `payload => z.util.isAborted(payload)`. */
    when?: ((payload: ParsePayload) => boolean) | undefined;
}
interface $ZodCheckInternals<T> {
    def: $ZodCheckDef;
    /** The set of issues this check might throw. */
    issc?: $ZodIssueBase;
    check(payload: ParsePayload<T>): MaybeAsync<void>;
    onattach: ((schema: $ZodType) => void)[];
}
interface $ZodCheck<in T = never> {
    _zod: $ZodCheckInternals<T>;
}
declare const $ZodCheck: $constructor<$ZodCheck<any>>;
interface $ZodCheckLessThanDef extends $ZodCheckDef {
    check: "less_than";
    value: Numeric;
    inclusive: boolean;
}
interface $ZodCheckLessThanInternals<T extends Numeric = Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckLessThanDef;
    issc: $ZodIssueTooBig<T>;
}
interface $ZodCheckLessThan<T extends Numeric = Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckLessThanInternals<T>;
}
declare const $ZodCheckLessThan: $constructor<$ZodCheckLessThan>;
interface $ZodCheckGreaterThanDef extends $ZodCheckDef {
    check: "greater_than";
    value: Numeric;
    inclusive: boolean;
}
interface $ZodCheckGreaterThanInternals<T extends Numeric = Numeric> extends $ZodCheckInternals<T> {
    def: $ZodCheckGreaterThanDef;
    issc: $ZodIssueTooSmall<T>;
}
interface $ZodCheckGreaterThan<T extends Numeric = Numeric> extends $ZodCheck<T> {
    _zod: $ZodCheckGreaterThanInternals<T>;
}
declare const $ZodCheckGreaterThan: $constructor<$ZodCheckGreaterThan>;
interface $ZodCheckMultipleOfDef<T extends number | bigint = number | bigint> extends $ZodCheckDef {
    check: "multiple_of";
    value: T;
}
interface $ZodCheckMultipleOfInternals<T extends number | bigint = number | bigint> extends $ZodCheckInternals<T> {
    def: $ZodCheckMultipleOfDef<T>;
    issc: $ZodIssueNotMultipleOf;
}
interface $ZodCheckMultipleOf<T extends number | bigint = number | bigint> extends $ZodCheck<T> {
    _zod: $ZodCheckMultipleOfInternals<T>;
}
declare const $ZodCheckMultipleOf: $constructor<$ZodCheckMultipleOf<number | bigint>>;
type $ZodNumberFormats = "int32" | "uint32" | "float32" | "float64" | "safeint";
interface $ZodCheckNumberFormatDef extends $ZodCheckDef {
    check: "number_format";
    format: $ZodNumberFormats;
}
interface $ZodCheckNumberFormatInternals extends $ZodCheckInternals<number> {
    def: $ZodCheckNumberFormatDef;
    issc: $ZodIssueInvalidType | $ZodIssueTooBig<"number"> | $ZodIssueTooSmall<"number">;
}
interface $ZodCheckNumberFormat extends $ZodCheck<number> {
    _zod: $ZodCheckNumberFormatInternals;
}
declare const $ZodCheckNumberFormat: $constructor<$ZodCheckNumberFormat>;
interface $ZodCheckMaxLengthDef extends $ZodCheckDef {
    check: "max_length";
    maximum: number;
}
interface $ZodCheckMaxLengthInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMaxLengthDef;
    issc: $ZodIssueTooBig<T>;
}
interface $ZodCheckMaxLength<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMaxLengthInternals<T>;
}
declare const $ZodCheckMaxLength: $constructor<$ZodCheckMaxLength>;
interface $ZodCheckMinLengthDef extends $ZodCheckDef {
    check: "min_length";
    minimum: number;
}
interface $ZodCheckMinLengthInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckMinLengthDef;
    issc: $ZodIssueTooSmall<T>;
}
interface $ZodCheckMinLength<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckMinLengthInternals<T>;
}
declare const $ZodCheckMinLength: $constructor<$ZodCheckMinLength>;
interface $ZodCheckLengthEqualsDef extends $ZodCheckDef {
    check: "length_equals";
    length: number;
}
interface $ZodCheckLengthEqualsInternals<T extends HasLength = HasLength> extends $ZodCheckInternals<T> {
    def: $ZodCheckLengthEqualsDef;
    issc: $ZodIssueTooBig<T> | $ZodIssueTooSmall<T>;
}
interface $ZodCheckLengthEquals<T extends HasLength = HasLength> extends $ZodCheck<T> {
    _zod: $ZodCheckLengthEqualsInternals<T>;
}
declare const $ZodCheckLengthEquals: $constructor<$ZodCheckLengthEquals>;
type $ZodStringFormats = "email" | "url" | "emoji" | "uuid" | "guid" | "nanoid" | "cuid" | "cuid2" | "ulid" | "xid" | "ksuid" | "datetime" | "date" | "time" | "duration" | "ipv4" | "ipv6" | "cidrv4" | "cidrv6" | "base64" | "base64url" | "json_string" | "e164" | "lowercase" | "uppercase" | "regex" | "jwt" | "starts_with" | "ends_with" | "includes";
interface $ZodCheckStringFormatDef<Format extends string = string> extends $ZodCheckDef {
    check: "string_format";
    format: Format;
    pattern?: RegExp | undefined;
}
interface $ZodCheckStringFormatInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStringFormatDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegexDef extends $ZodCheckStringFormatDef {
    format: "regex";
    pattern: RegExp;
}
interface $ZodCheckRegexInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckRegexDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckRegex extends $ZodCheck<string> {
    _zod: $ZodCheckRegexInternals;
}
declare const $ZodCheckRegex: $constructor<$ZodCheckRegex>;
interface $ZodCheckLowerCaseDef extends $ZodCheckStringFormatDef<"lowercase"> {
}
interface $ZodCheckLowerCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckLowerCaseDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckLowerCase extends $ZodCheck<string> {
    _zod: $ZodCheckLowerCaseInternals;
}
declare const $ZodCheckLowerCase: $constructor<$ZodCheckLowerCase>;
interface $ZodCheckUpperCaseDef extends $ZodCheckStringFormatDef<"uppercase"> {
}
interface $ZodCheckUpperCaseInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckUpperCaseDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckUpperCase extends $ZodCheck<string> {
    _zod: $ZodCheckUpperCaseInternals;
}
declare const $ZodCheckUpperCase: $constructor<$ZodCheckUpperCase>;
interface $ZodCheckIncludesDef extends $ZodCheckStringFormatDef<"includes"> {
    includes: string;
    position?: number | undefined;
}
interface $ZodCheckIncludesInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckIncludesDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckIncludes extends $ZodCheck<string> {
    _zod: $ZodCheckIncludesInternals;
}
declare const $ZodCheckIncludes: $constructor<$ZodCheckIncludes>;
interface $ZodCheckStartsWithDef extends $ZodCheckStringFormatDef<"starts_with"> {
    prefix: string;
}
interface $ZodCheckStartsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckStartsWithDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckStartsWith extends $ZodCheck<string> {
    _zod: $ZodCheckStartsWithInternals;
}
declare const $ZodCheckStartsWith: $constructor<$ZodCheckStartsWith>;
interface $ZodCheckEndsWithDef extends $ZodCheckStringFormatDef<"ends_with"> {
    suffix: string;
}
interface $ZodCheckEndsWithInternals extends $ZodCheckInternals<string> {
    def: $ZodCheckEndsWithDef;
    issc: $ZodIssueInvalidStringFormat;
}
interface $ZodCheckEndsWith extends $ZodCheckInternals<string> {
    _zod: $ZodCheckEndsWithInternals;
}
declare const $ZodCheckEndsWith: $constructor<$ZodCheckEndsWith>;

interface $ZodIssueBase {
    readonly code?: string;
    readonly input?: unknown;
    readonly path: PropertyKey[];
    readonly message: string;
}
type $ZodInvalidTypeExpected = "string" | "number" | "int" | "boolean" | "bigint" | "symbol" | "undefined" | "null" | "never" | "void" | "date" | "array" | "object" | "tuple" | "record" | "map" | "set" | "file" | "nonoptional" | "nan" | "function" | (string & {});
interface $ZodIssueInvalidType<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_type";
    readonly expected: $ZodInvalidTypeExpected;
    readonly input?: Input;
}
interface $ZodIssueTooBig<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_big";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly maximum: number | bigint;
    readonly inclusive?: boolean;
    readonly exact?: boolean;
    readonly input?: Input;
}
interface $ZodIssueTooSmall<Input = unknown> extends $ZodIssueBase {
    readonly code: "too_small";
    readonly origin: "number" | "int" | "bigint" | "date" | "string" | "array" | "set" | "file" | (string & {});
    readonly minimum: number | bigint;
    /** True if the allowable range includes the minimum */
    readonly inclusive?: boolean;
    /** True if the allowed value is fixed (e.g.` z.length(5)`), not a range (`z.minLength(5)`) */
    readonly exact?: boolean;
    readonly input?: Input;
}
interface $ZodIssueInvalidStringFormat extends $ZodIssueBase {
    readonly code: "invalid_format";
    readonly format: $ZodStringFormats | (string & {});
    readonly pattern?: string;
    readonly input?: string;
}
interface $ZodIssueNotMultipleOf<Input extends number | bigint = number | bigint> extends $ZodIssueBase {
    readonly code: "not_multiple_of";
    readonly divisor: number;
    readonly input?: Input;
}
interface $ZodIssueUnrecognizedKeys extends $ZodIssueBase {
    readonly code: "unrecognized_keys";
    readonly keys: string[];
    readonly input?: Record<string, unknown>;
}
interface $ZodIssueInvalidUnionNoMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: $ZodIssue[][];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive?: true;
}
interface $ZodIssueInvalidUnionMultipleMatch extends $ZodIssueBase {
    readonly code: "invalid_union";
    readonly errors: [];
    readonly input?: unknown;
    readonly discriminator?: string | undefined;
    readonly inclusive: false;
}
type $ZodIssueInvalidUnion = $ZodIssueInvalidUnionNoMatch | $ZodIssueInvalidUnionMultipleMatch;
interface $ZodIssueInvalidKey<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_key";
    readonly origin: "map" | "record";
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
interface $ZodIssueInvalidElement<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_element";
    readonly origin: "map" | "set";
    readonly key: unknown;
    readonly issues: $ZodIssue[];
    readonly input?: Input;
}
interface $ZodIssueInvalidValue<Input = unknown> extends $ZodIssueBase {
    readonly code: "invalid_value";
    readonly values: Primitive[];
    readonly input?: Input;
}
interface $ZodIssueCustom extends $ZodIssueBase {
    readonly code: "custom";
    readonly params?: Record<string, any> | undefined;
    readonly input?: unknown;
}
type $ZodIssue = $ZodIssueInvalidType | $ZodIssueTooBig | $ZodIssueTooSmall | $ZodIssueInvalidStringFormat | $ZodIssueNotMultipleOf | $ZodIssueUnrecognizedKeys | $ZodIssueInvalidUnion | $ZodIssueInvalidKey | $ZodIssueInvalidElement | $ZodIssueInvalidValue | $ZodIssueCustom;
type $ZodInternalIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue$1<T> : never;
type RawIssue$1<T extends $ZodIssueBase> = T extends any ? Flatten<MakePartial<T, "message" | "path"> & {
    /** The input data */
    readonly input: unknown;
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** If `true`, Zod will continue executing checks/refinements after this issue. */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
type $ZodRawIssue<T extends $ZodIssueBase = $ZodIssue> = $ZodInternalIssue<T>;
interface $ZodErrorMap<T extends $ZodIssueBase = $ZodIssue> {
    (issue: $ZodRawIssue<T>): {
        message: string;
    } | string | undefined | null;
}
interface $ZodError<T = unknown> extends Error {
    type: T;
    issues: $ZodIssue[];
    _zod: {
        output: T;
        def: $ZodIssue[];
    };
    stack?: string;
    name: string;
}
declare const $ZodError: $constructor<$ZodError>;
type $ZodFlattenedError<T, U = string> = _FlattenedError<T, U>;
type _FlattenedError<T, U = string> = {
    formErrors: U[];
    fieldErrors: {
        [P in keyof T]?: U[];
    };
};
type _ZodFormattedError<T, U = string> = T extends [any, ...any[]] ? {
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
} : T extends any[] ? {
    [k: number]: $ZodFormattedError<T[number], U>;
} : T extends object ? Flatten<{
    [K in keyof T]?: $ZodFormattedError<T[K], U>;
}> : any;
type $ZodFormattedError<T, U = string> = {
    _errors: U[];
} & Flatten<_ZodFormattedError<T, U>>;

type ZodTrait = {
    _zod: {
        def: any;
        [k: string]: any;
    };
};
interface $constructor<T extends ZodTrait, D = T["_zod"]["def"]> {
    new (def: D): T;
    init(inst: T, def: D): asserts inst is T;
}
declare function $constructor<T extends ZodTrait, D = T["_zod"]["def"]>(name: string, initializer: (inst: T, def: D) => void, params?: {
    Parent?: typeof Class;
}): $constructor<T, D>;
declare const $brand: unique symbol;
type $brand<T extends string | number | symbol = string | number | symbol> = {
    [$brand]: {
        [k in T]: true;
    };
};
type $ZodBranded<T extends SomeType, Brand extends string | number | symbol, Dir extends "in" | "out" | "inout" = "out"> = T & (Dir extends "inout" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
        output: output<T> & $brand<Brand>;
    };
} : Dir extends "in" ? {
    _zod: {
        input: input<T> & $brand<Brand>;
    };
} : {
    _zod: {
        output: output<T> & $brand<Brand>;
    };
});
type input<T> = T extends {
    _zod: {
        input: any;
    };
} ? T["_zod"]["input"] : unknown;
type output<T> = T extends {
    _zod: {
        output: any;
    };
} ? T["_zod"]["output"] : unknown;

type Params<T extends $ZodType | $ZodCheck, IssueTypes extends $ZodIssueBase, OmitKeys extends keyof T["_zod"]["def"] = never> = Flatten<Partial<EmptyToNever<Omit<T["_zod"]["def"], OmitKeys> & ([IssueTypes] extends [never] ? {} : {
    error?: string | $ZodErrorMap<IssueTypes> | undefined;
    /** @deprecated This parameter is deprecated. Use `error` instead. */
    message?: string | undefined;
})>>>;
type TypeParams<T extends $ZodType = $ZodType & {
    _isst: never;
}, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error"> = never> = Params<T, NonNullable<T["_zod"]["isst"]>, "type" | "checks" | "error" | AlsoOmit>;
type CheckParams<T extends $ZodCheck = $ZodCheck, // & { _issc: never },
AlsoOmit extends Exclude<keyof T["_zod"]["def"], "check" | "error"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "check" | "error" | AlsoOmit>;
type CheckStringFormatParams<T extends $ZodStringFormat = $ZodStringFormat, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "coerce" | "checks" | "error" | "check" | "format"> = never> = Params<T, NonNullable<T["_zod"]["issc"]>, "type" | "coerce" | "checks" | "error" | "check" | "format" | AlsoOmit>;
type CheckTypeParams<T extends $ZodType & $ZodCheck = $ZodType & $ZodCheck, AlsoOmit extends Exclude<keyof T["_zod"]["def"], "type" | "checks" | "error" | "check"> = never> = Params<T, NonNullable<T["_zod"]["isst"] | T["_zod"]["issc"]>, "type" | "checks" | "error" | "check" | AlsoOmit>;
type $ZodCheckEmailParams = CheckStringFormatParams<$ZodEmail, "when">;
type $ZodCheckGUIDParams = CheckStringFormatParams<$ZodGUID, "pattern" | "when">;
type $ZodCheckUUIDParams = CheckStringFormatParams<$ZodUUID, "pattern" | "when">;
type $ZodCheckURLParams = CheckStringFormatParams<$ZodURL, "when">;
type $ZodCheckEmojiParams = CheckStringFormatParams<$ZodEmoji, "when">;
type $ZodCheckNanoIDParams = CheckStringFormatParams<$ZodNanoID, "when">;
type $ZodCheckCUIDParams = CheckStringFormatParams<$ZodCUID, "when">;
type $ZodCheckCUID2Params = CheckStringFormatParams<$ZodCUID2, "when">;
type $ZodCheckULIDParams = CheckStringFormatParams<$ZodULID, "when">;
type $ZodCheckXIDParams = CheckStringFormatParams<$ZodXID, "when">;
type $ZodCheckKSUIDParams = CheckStringFormatParams<$ZodKSUID, "when">;
type $ZodCheckIPv4Params = CheckStringFormatParams<$ZodIPv4, "pattern" | "when" | "version">;
type $ZodCheckIPv6Params = CheckStringFormatParams<$ZodIPv6, "pattern" | "when" | "version">;
type $ZodCheckCIDRv4Params = CheckStringFormatParams<$ZodCIDRv4, "pattern" | "when">;
type $ZodCheckCIDRv6Params = CheckStringFormatParams<$ZodCIDRv6, "pattern" | "when">;
type $ZodCheckBase64Params = CheckStringFormatParams<$ZodBase64, "pattern" | "when">;
type $ZodCheckBase64URLParams = CheckStringFormatParams<$ZodBase64URL, "pattern" | "when">;
type $ZodCheckE164Params = CheckStringFormatParams<$ZodE164, "when">;
type $ZodCheckJWTParams = CheckStringFormatParams<$ZodJWT, "pattern" | "when">;
type $ZodCheckISODateTimeParams = CheckStringFormatParams<$ZodISODateTime, "pattern" | "when">;
type $ZodCheckISODateParams = CheckStringFormatParams<$ZodISODate, "pattern" | "when">;
type $ZodCheckISOTimeParams = CheckStringFormatParams<$ZodISOTime, "pattern" | "when">;
type $ZodCheckISODurationParams = CheckStringFormatParams<$ZodISODuration, "when">;
type $ZodCheckNumberFormatParams = CheckParams<$ZodCheckNumberFormat, "format" | "when">;
type $ZodCheckLessThanParams = CheckParams<$ZodCheckLessThan, "inclusive" | "value" | "when">;
type $ZodCheckGreaterThanParams = CheckParams<$ZodCheckGreaterThan, "inclusive" | "value" | "when">;
type $ZodCheckMultipleOfParams = CheckParams<$ZodCheckMultipleOf, "value" | "when">;
type $ZodCheckMaxLengthParams = CheckParams<$ZodCheckMaxLength, "maximum" | "when">;
type $ZodCheckMinLengthParams = CheckParams<$ZodCheckMinLength, "minimum" | "when">;
type $ZodCheckLengthEqualsParams = CheckParams<$ZodCheckLengthEquals, "length" | "when">;
type $ZodCheckRegexParams = CheckParams<$ZodCheckRegex, "format" | "pattern" | "when">;
type $ZodCheckLowerCaseParams = CheckParams<$ZodCheckLowerCase, "format" | "when">;
type $ZodCheckUpperCaseParams = CheckParams<$ZodCheckUpperCase, "format" | "when">;
type $ZodCheckIncludesParams = CheckParams<$ZodCheckIncludes, "includes" | "format" | "when" | "pattern">;
type $ZodCheckStartsWithParams = CheckParams<$ZodCheckStartsWith, "prefix" | "format" | "when" | "pattern">;
type $ZodCheckEndsWithParams = CheckParams<$ZodCheckEndsWith, "suffix" | "format" | "pattern" | "when">;
type $ZodEnumParams = TypeParams<$ZodEnum, "entries">;
type $ZodNonOptionalParams = TypeParams<$ZodNonOptional, "innerType">;
type $ZodCustomParams = CheckTypeParams<$ZodCustom, "fn">;
type $ZodSuperRefineIssue<T extends $ZodIssueBase = $ZodIssue> = T extends any ? RawIssue<T> : never;
type RawIssue<T extends $ZodIssueBase> = T extends any ? Flatten<MakePartial<T, "message" | "path"> & {
    /** The schema or check that originated this issue. */
    readonly inst?: $ZodType | $ZodCheck;
    /** If `true`, Zod will execute subsequent checks/refinements instead of immediately aborting */
    readonly continue?: boolean | undefined;
} & Record<string, unknown>> : never;
interface $RefinementCtx<T = unknown> extends ParsePayload<T> {
    addIssue(arg: string | $ZodSuperRefineIssue): void;
}

/** An Error-like class used to store Zod validation issues.  */
interface ZodError<T = unknown> extends $ZodError<T> {
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    format(): $ZodFormattedError<T>;
    format<U>(mapper: (issue: $ZodIssue) => U): $ZodFormattedError<T, U>;
    /** @deprecated Use the `z.treeifyError(err)` function instead. */
    flatten(): $ZodFlattenedError<T>;
    flatten<U>(mapper: (issue: $ZodIssue) => U): $ZodFlattenedError<T, U>;
    /** @deprecated Push directly to `.issues` instead. */
    addIssue(issue: $ZodIssue): void;
    /** @deprecated Push directly to `.issues` instead. */
    addIssues(issues: $ZodIssue[]): void;
    /** @deprecated Check `err.issues.length === 0` instead. */
    isEmpty: boolean;
}
declare const ZodError: $constructor<ZodError>;

type ZodSafeParseResult<T> = ZodSafeParseSuccess<T> | ZodSafeParseError<T>;
type ZodSafeParseSuccess<T> = {
    success: true;
    data: T;
    error?: never;
};
type ZodSafeParseError<T> = {
    success: false;
    data?: never;
    error: ZodError<T>;
};

type ZodStandardSchemaWithJSON<T> = StandardSchemaWithJSONProps<input<T>, output<T>>;
interface _ZodType<out Internals extends $ZodTypeInternals = $ZodTypeInternals> extends ZodType<any, any, Internals> {
}
interface ZodType<out Output = unknown, out Input = unknown, out Internals extends $ZodTypeInternals<Output, Input> = $ZodTypeInternals<Output, Input>> extends $ZodType<Output, Input, Internals> {
    def: Internals["def"];
    type: Internals["def"]["type"];
    /** @deprecated Use `.def` instead. */
    _def: Internals["def"];
    /** @deprecated Use `z.output<typeof schema>` instead. */
    _output: Internals["output"];
    /** @deprecated Use `z.input<typeof schema>` instead. */
    _input: Internals["input"];
    "~standard": ZodStandardSchemaWithJSON<this>;
    /** Converts this schema to a JSON Schema representation. */
    toJSONSchema(params?: ToJSONSchemaParams): ZodStandardJSONSchemaPayload<this>;
    check(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
    with(...checks: (CheckFn<output<this>> | $ZodCheck<output<this>>)[]): this;
    clone(def?: Internals["def"], params?: {
        parent: boolean;
    }): this;
    register<R extends $ZodRegistry>(registry: R, ...meta: this extends R["_schema"] ? undefined extends R["_meta"] ? [$replace<R["_meta"], this>?] : [$replace<R["_meta"], this>] : ["Incompatible schema"]): this;
    brand<T extends PropertyKey = PropertyKey, Dir extends "in" | "out" | "inout" = "out">(value?: T): PropertyKey extends T ? this : $ZodBranded<this, T, Dir>;
    parse(data: unknown, params?: ParseContext<$ZodIssue>): output<this>;
    safeParse(data: unknown, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
    parseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
    safeParseAsync(data: unknown, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
    spa: (data: unknown, params?: ParseContext<$ZodIssue>) => Promise<ZodSafeParseResult<output<this>>>;
    encode(data: output<this>, params?: ParseContext<$ZodIssue>): input<this>;
    decode(data: input<this>, params?: ParseContext<$ZodIssue>): output<this>;
    encodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<input<this>>;
    decodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<output<this>>;
    safeEncode(data: output<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<input<this>>;
    safeDecode(data: input<this>, params?: ParseContext<$ZodIssue>): ZodSafeParseResult<output<this>>;
    safeEncodeAsync(data: output<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<input<this>>>;
    safeDecodeAsync(data: input<this>, params?: ParseContext<$ZodIssue>): Promise<ZodSafeParseResult<output<this>>>;
    refine<Ch extends (arg: output<this>) => unknown | Promise<unknown>>(check: Ch, params?: string | $ZodCustomParams): Ch extends (arg: any) => arg is infer R ? this & ZodType<R, input<this>> : this;
    superRefine(refinement: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => void | Promise<void>): this;
    overwrite(fn: (x: output<this>) => output<this>): this;
    optional(): ZodOptional<this>;
    exactOptional(): ZodExactOptional<this>;
    nonoptional(params?: string | $ZodNonOptionalParams): ZodNonOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    default(def: NoUndefined<output<this>>): ZodDefault<this>;
    default(def: () => NoUndefined<output<this>>): ZodDefault<this>;
    prefault(def: () => input<this>): ZodPrefault<this>;
    prefault(def: input<this>): ZodPrefault<this>;
    array(): ZodArray<this>;
    or<T extends SomeType>(option: T): ZodUnion<[this, T]>;
    and<T extends SomeType>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: output<this>, ctx: $RefinementCtx<output<this>>) => NewOut | Promise<NewOut>): ZodPipe<this, ZodTransform<Awaited<NewOut>, output<this>>>;
    catch(def: output<this>): ZodCatch<this>;
    catch(def: (ctx: $ZodCatchCtx) => output<this>): ZodCatch<this>;
    pipe<T extends $ZodType<any, output<this>>>(target: T | $ZodType<any, output<this>>): ZodPipe<this, T>;
    readonly(): ZodReadonly<this>;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified description */
    describe(description: string): this;
    description?: string;
    /** Returns the metadata associated with this instance in `z.globalRegistry` */
    meta(): $replace<GlobalMeta, this> | undefined;
    /** Returns a new instance that has been registered in `z.globalRegistry` with the specified metadata */
    meta(data: $replace<GlobalMeta, this>): this;
    /** @deprecated Try safe-parsing `undefined` (this is what `isOptional` does internally):
     *
     * ```ts
     * const schema = z.string().optional();
     * const isOptional = schema.safeParse(undefined).success; // true
     * ```
     */
    isOptional(): boolean;
    /**
     * @deprecated Try safe-parsing `null` (this is what `isNullable` does internally):
     *
     * ```ts
     * const schema = z.string().nullable();
     * const isNullable = schema.safeParse(null).success; // true
     * ```
     */
    isNullable(): boolean;
    apply<T>(fn: (schema: this) => T): T;
}
declare const ZodType: $constructor<ZodType>;
interface _ZodString<T extends $ZodStringInternals<unknown> = $ZodStringInternals<unknown>> extends _ZodType<T> {
    format: string | null;
    minLength: number | null;
    maxLength: number | null;
    regex(regex: RegExp, params?: string | $ZodCheckRegexParams): this;
    includes(value: string, params?: string | $ZodCheckIncludesParams): this;
    startsWith(value: string, params?: string | $ZodCheckStartsWithParams): this;
    endsWith(value: string, params?: string | $ZodCheckEndsWithParams): this;
    min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
    nonempty(params?: string | $ZodCheckMinLengthParams): this;
    lowercase(params?: string | $ZodCheckLowerCaseParams): this;
    uppercase(params?: string | $ZodCheckUpperCaseParams): this;
    trim(): this;
    normalize(form?: "NFC" | "NFD" | "NFKC" | "NFKD" | (string & {})): this;
    toLowerCase(): this;
    toUpperCase(): this;
    slugify(): this;
}
/** @internal */
declare const _ZodString: $constructor<_ZodString>;
interface ZodString extends _ZodString<$ZodStringInternals<string>> {
    /** @deprecated Use `z.email()` instead. */
    email(params?: string | $ZodCheckEmailParams): this;
    /** @deprecated Use `z.url()` instead. */
    url(params?: string | $ZodCheckURLParams): this;
    /** @deprecated Use `z.jwt()` instead. */
    jwt(params?: string | $ZodCheckJWTParams): this;
    /** @deprecated Use `z.emoji()` instead. */
    emoji(params?: string | $ZodCheckEmojiParams): this;
    /** @deprecated Use `z.guid()` instead. */
    guid(params?: string | $ZodCheckGUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuid(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv4(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv6(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.uuid()` instead. */
    uuidv7(params?: string | $ZodCheckUUIDParams): this;
    /** @deprecated Use `z.nanoid()` instead. */
    nanoid(params?: string | $ZodCheckNanoIDParams): this;
    /** @deprecated Use `z.guid()` instead. */
    guid(params?: string | $ZodCheckGUIDParams): this;
    /** @deprecated Use `z.cuid()` instead. */
    cuid(params?: string | $ZodCheckCUIDParams): this;
    /** @deprecated Use `z.cuid2()` instead. */
    cuid2(params?: string | $ZodCheckCUID2Params): this;
    /** @deprecated Use `z.ulid()` instead. */
    ulid(params?: string | $ZodCheckULIDParams): this;
    /** @deprecated Use `z.base64()` instead. */
    base64(params?: string | $ZodCheckBase64Params): this;
    /** @deprecated Use `z.base64url()` instead. */
    base64url(params?: string | $ZodCheckBase64URLParams): this;
    /** @deprecated Use `z.xid()` instead. */
    xid(params?: string | $ZodCheckXIDParams): this;
    /** @deprecated Use `z.ksuid()` instead. */
    ksuid(params?: string | $ZodCheckKSUIDParams): this;
    /** @deprecated Use `z.ipv4()` instead. */
    ipv4(params?: string | $ZodCheckIPv4Params): this;
    /** @deprecated Use `z.ipv6()` instead. */
    ipv6(params?: string | $ZodCheckIPv6Params): this;
    /** @deprecated Use `z.cidrv4()` instead. */
    cidrv4(params?: string | $ZodCheckCIDRv4Params): this;
    /** @deprecated Use `z.cidrv6()` instead. */
    cidrv6(params?: string | $ZodCheckCIDRv6Params): this;
    /** @deprecated Use `z.e164()` instead. */
    e164(params?: string | $ZodCheckE164Params): this;
    /** @deprecated Use `z.iso.datetime()` instead. */
    datetime(params?: string | $ZodCheckISODateTimeParams): this;
    /** @deprecated Use `z.iso.date()` instead. */
    date(params?: string | $ZodCheckISODateParams): this;
    /** @deprecated Use `z.iso.time()` instead. */
    time(params?: string | $ZodCheckISOTimeParams): this;
    /** @deprecated Use `z.iso.duration()` instead. */
    duration(params?: string | $ZodCheckISODurationParams): this;
}
declare const ZodString: $constructor<ZodString>;
interface _ZodNumber<Internals extends $ZodNumberInternals = $ZodNumberInternals> extends _ZodType<Internals> {
    gt(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    /** Identical to .min() */
    gte(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    min(value: number, params?: string | $ZodCheckGreaterThanParams): this;
    lt(value: number, params?: string | $ZodCheckLessThanParams): this;
    /** Identical to .max() */
    lte(value: number, params?: string | $ZodCheckLessThanParams): this;
    max(value: number, params?: string | $ZodCheckLessThanParams): this;
    /** Consider `z.int()` instead. This API is considered *legacy*; it will never be removed but a better alternative exists. */
    int(params?: string | $ZodCheckNumberFormatParams): this;
    /** @deprecated This is now identical to `.int()`. Only numbers in the safe integer range are accepted. */
    safe(params?: string | $ZodCheckNumberFormatParams): this;
    positive(params?: string | $ZodCheckGreaterThanParams): this;
    nonnegative(params?: string | $ZodCheckGreaterThanParams): this;
    negative(params?: string | $ZodCheckLessThanParams): this;
    nonpositive(params?: string | $ZodCheckLessThanParams): this;
    multipleOf(value: number, params?: string | $ZodCheckMultipleOfParams): this;
    /** @deprecated Use `.multipleOf()` instead. */
    step(value: number, params?: string | $ZodCheckMultipleOfParams): this;
    /** @deprecated In v4 and later, z.number() does not allow infinite values by default. This is a no-op. */
    finite(params?: unknown): this;
    minValue: number | null;
    maxValue: number | null;
    /** @deprecated Check the `format` property instead.  */
    isInt: boolean;
    /** @deprecated Number schemas no longer accept infinite values, so this always returns `true`. */
    isFinite: boolean;
    format: string | null;
}
interface ZodNumber extends _ZodNumber<$ZodNumberInternals<number>> {
}
declare const ZodNumber: $constructor<ZodNumber>;
interface _ZodBoolean<T extends $ZodBooleanInternals = $ZodBooleanInternals> extends _ZodType<T> {
}
interface ZodBoolean extends _ZodBoolean<$ZodBooleanInternals<boolean>> {
}
declare const ZodBoolean: $constructor<ZodBoolean>;
interface _ZodDate<T extends $ZodDateInternals = $ZodDateInternals> extends _ZodType<T> {
    min(value: number | Date, params?: string | $ZodCheckGreaterThanParams): this;
    max(value: number | Date, params?: string | $ZodCheckLessThanParams): this;
    /** @deprecated Not recommended. */
    minDate: Date | null;
    /** @deprecated Not recommended. */
    maxDate: Date | null;
}
interface ZodDate extends _ZodDate<$ZodDateInternals<Date>> {
}
declare const ZodDate: $constructor<ZodDate>;
interface ZodArray<T extends SomeType = $ZodType> extends _ZodType<$ZodArrayInternals<T>>, $ZodArray<T> {
    element: T;
    min(minLength: number, params?: string | $ZodCheckMinLengthParams): this;
    nonempty(params?: string | $ZodCheckMinLengthParams): this;
    max(maxLength: number, params?: string | $ZodCheckMaxLengthParams): this;
    length(len: number, params?: string | $ZodCheckLengthEqualsParams): this;
    unwrap(): T;
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodArray: $constructor<ZodArray>;
type SafeExtendShape<Base extends $ZodShape, Ext extends $ZodLooseShape> = {
    [K in keyof Ext]: K extends keyof Base ? output<Ext[K]> extends output<Base[K]> ? input<Ext[K]> extends input<Base[K]> ? Ext[K] : never : never : Ext[K];
};
interface ZodObject<
/** @ts-ignore Cast variance */
out Shape extends $ZodShape = $ZodLooseShape, out Config extends $ZodObjectConfig = $strip> extends _ZodType<$ZodObjectInternals<Shape, Config>>, $ZodObject<Shape, Config> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    shape: Shape;
    keyof(): ZodEnum<ToEnum<keyof Shape & string>>;
    /** Define a schema to validate all unrecognized keys. This overrides the existing strict/loose behavior. */
    catchall<T extends SomeType>(schema: T): ZodObject<Shape, $catchall<T>>;
    /** @deprecated Use `z.looseObject()` or `.loose()` instead. */
    passthrough(): ZodObject<Shape, $loose>;
    /** Consider `z.looseObject(A.shape)` instead */
    loose(): ZodObject<Shape, $loose>;
    /** Consider `z.strictObject(A.shape)` instead */
    strict(): ZodObject<Shape, $strict>;
    /** This is the default behavior. This method call is likely unnecessary. */
    strip(): ZodObject<Shape, $strip>;
    extend<U extends $ZodLooseShape>(shape: U): ZodObject<Extend<Shape, U>, Config>;
    safeExtend<U extends $ZodLooseShape>(shape: SafeExtendShape<Shape, U> & Partial<Record<keyof Shape, SomeType>>): ZodObject<Extend<Shape, U>, Config>;
    /**
     * @deprecated Use [`A.extend(B.shape)`](https://zod.dev/api?id=extend) instead.
     */
    merge<U extends ZodObject>(other: U): ZodObject<Extend<Shape, U["shape"]>, U["_zod"]["config"]>;
    pick<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<Flatten<Pick<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    omit<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<Flatten<Omit<Shape, Extract<keyof Shape, keyof M>>>, Config>;
    partial(): ZodObject<{
        [k in keyof Shape]: ZodOptional<Shape[k]>;
    }, Config>;
    partial<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        [k in keyof Shape]: k extends keyof M ? ZodOptional<Shape[k]> : Shape[k];
    }, Config>;
    required(): ZodObject<{
        [k in keyof Shape]: ZodNonOptional<Shape[k]>;
    }, Config>;
    required<M extends Mask<keyof Shape>>(mask: M & Record<Exclude<keyof M, keyof Shape>, never>): ZodObject<{
        [k in keyof Shape]: k extends keyof M ? ZodNonOptional<Shape[k]> : Shape[k];
    }, Config>;
}
declare const ZodObject: $constructor<ZodObject>;
interface ZodUnion<T extends readonly SomeType[] = readonly $ZodType[]> extends _ZodType<$ZodUnionInternals<T>>, $ZodUnion<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    options: T;
}
declare const ZodUnion: $constructor<ZodUnion>;
interface ZodIntersection<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodIntersectionInternals<A, B>>, $ZodIntersection<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodIntersection: $constructor<ZodIntersection>;
interface ZodTuple<T extends TupleItems = readonly $ZodType[], Rest extends SomeType | null = $ZodType | null> extends _ZodType<$ZodTupleInternals<T, Rest>>, $ZodTuple<T, Rest> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    rest<Rest extends SomeType = $ZodType>(rest: Rest): ZodTuple<T, Rest>;
}
declare const ZodTuple: $constructor<ZodTuple>;
interface ZodEnum<
/** @ts-ignore Cast variance */
out T extends EnumLike = EnumLike> extends _ZodType<$ZodEnumInternals<T>>, $ZodEnum<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    enum: T;
    options: Array<T[keyof T]>;
    extract<const U extends readonly (keyof T)[]>(values: U, params?: string | $ZodEnumParams): ZodEnum<Flatten<Pick<T, U[number]>>>;
    exclude<const U extends readonly (keyof T)[]>(values: U, params?: string | $ZodEnumParams): ZodEnum<Flatten<Omit<T, U[number]>>>;
}
declare const ZodEnum: $constructor<ZodEnum>;
interface ZodLiteral<T extends Literal = Literal> extends _ZodType<$ZodLiteralInternals<T>>, $ZodLiteral<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    values: Set<T>;
    /** @legacy Use `.values` instead. Accessing this property will throw an error if the literal accepts multiple values. */
    value: T;
}
declare const ZodLiteral: $constructor<ZodLiteral>;
interface ZodTransform<O = unknown, I = unknown> extends _ZodType<$ZodTransformInternals<O, I>>, $ZodTransform<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodTransform: $constructor<ZodTransform>;
interface ZodOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodOptionalInternals<T>>, $ZodOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodOptional: $constructor<ZodOptional>;
interface ZodExactOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodExactOptionalInternals<T>>, $ZodExactOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodExactOptional: $constructor<ZodExactOptional>;
interface ZodNullable<T extends SomeType = $ZodType> extends _ZodType<$ZodNullableInternals<T>>, $ZodNullable<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodNullable: $constructor<ZodNullable>;
interface ZodDefault<T extends SomeType = $ZodType> extends _ZodType<$ZodDefaultInternals<T>>, $ZodDefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use `.unwrap()` instead. */
    removeDefault(): T;
}
declare const ZodDefault: $constructor<ZodDefault>;
interface ZodPrefault<T extends SomeType = $ZodType> extends _ZodType<$ZodPrefaultInternals<T>>, $ZodPrefault<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodPrefault: $constructor<ZodPrefault>;
interface ZodNonOptional<T extends SomeType = $ZodType> extends _ZodType<$ZodNonOptionalInternals<T>>, $ZodNonOptional<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodNonOptional: $constructor<ZodNonOptional>;
interface ZodCatch<T extends SomeType = $ZodType> extends _ZodType<$ZodCatchInternals<T>>, $ZodCatch<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
    /** @deprecated Use `.unwrap()` instead. */
    removeCatch(): T;
}
declare const ZodCatch: $constructor<ZodCatch>;
interface ZodPipe<A extends SomeType = $ZodType, B extends SomeType = $ZodType> extends _ZodType<$ZodPipeInternals<A, B>>, $ZodPipe<A, B> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    in: A;
    out: B;
}
declare const ZodPipe: $constructor<ZodPipe>;
interface ZodReadonly<T extends SomeType = $ZodType> extends _ZodType<$ZodReadonlyInternals<T>>, $ZodReadonly<T> {
    "~standard": ZodStandardSchemaWithJSON<this>;
    unwrap(): T;
}
declare const ZodReadonly: $constructor<ZodReadonly>;
interface ZodCustom<O = unknown, I = unknown> extends _ZodType<$ZodCustomInternals<O, I>>, $ZodCustom<O, I> {
    "~standard": ZodStandardSchemaWithJSON<this>;
}
declare const ZodCustom: $constructor<ZodCustom>;

declare const PdfBinarySourceSchema: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
declare const PdfEmbeddedFontInputSchema: ZodObject<{
    family: ZodString;
    postscriptName: ZodOptional<ZodString>;
    source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
}, $strict>;
declare const PdfStructuredDocumentSchema: ZodObject<{
    meta: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        creationDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        creator: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
        modDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        producer: ZodOptional<ZodString>;
        subject: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
    }, $strict>>;
    page: ZodOptional<ZodObject<{
        margin: ZodOptional<ZodUnion<readonly [ZodNumber, ZodObject<{
            top: ZodOptional<ZodNumber>;
            right: ZodOptional<ZodNumber>;
            bottom: ZodOptional<ZodNumber>;
            left: ZodOptional<ZodNumber>;
        }, $strict>]>>;
        size: ZodOptional<ZodUnion<readonly [ZodEnum<{
            A4: "A4";
            Letter: "Letter";
            a4: "a4";
            letter: "letter";
        }>, ZodObject<{
            width: ZodNumber;
            height: ZodNumber;
        }, $strict>]>>;
    }, $strict>>;
    children: ZodOptional<ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>;
    content: ZodOptional<ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>;
    bookmarks: ZodOptional<ZodObject<{
        fromHeadings: ZodOptional<ZodBoolean>;
    }, $strict>>;
    dynamicHeader: ZodOptional<ZodObject<{
        content: ZodUnion<readonly [ZodString, ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>, ZodObject<{
            center: ZodOptional<ZodString>;
            left: ZodOptional<ZodString>;
            right: ZodOptional<ZodString>;
        }, $strict>]>;
        fontSize: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        skipFirstPage: ZodOptional<ZodBoolean>;
        width: ZodOptional<ZodNumber>;
        x: ZodOptional<ZodNumber>;
        y: ZodOptional<ZodNumber>;
    }, $strict>>;
    dynamicFooter: ZodOptional<ZodObject<{
        content: ZodUnion<readonly [ZodString, ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>, ZodObject<{
            center: ZodOptional<ZodString>;
            left: ZodOptional<ZodString>;
            right: ZodOptional<ZodString>;
        }, $strict>]>;
        fontSize: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        skipFirstPage: ZodOptional<ZodBoolean>;
        width: ZodOptional<ZodNumber>;
        x: ZodOptional<ZodNumber>;
        y: ZodOptional<ZodNumber>;
    }, $strict>>;
    pageLabels: ZodOptional<ZodArray<ZodObject<{
        prefix: ZodOptional<ZodString>;
        startNumber: ZodOptional<ZodNumber>;
        startPage: ZodNumber;
        style: ZodEnum<{
            arabic: "arabic";
            "roman-lower": "roman-lower";
            "roman-upper": "roman-upper";
        }>;
    }, $strict>>>;
    pageNumber: ZodOptional<ZodObject<{
        fontSize: ZodOptional<ZodNumber>;
        format: ZodOptional<ZodString>;
        x: ZodOptional<ZodNumber>;
        y: ZodOptional<ZodNumber>;
    }, $strict>>;
    accessibility: ZodOptional<ZodObject<{
        lang: ZodOptional<ZodString>;
        tagged: ZodOptional<ZodBoolean>;
    }, $strict>>;
    pdfa: ZodOptional<ZodObject<{
        conformance: ZodOptional<ZodEnum<{
            "1b": "1b";
            "2a": "2a";
            "2b": "2b";
        }>>;
        enabled: ZodOptional<ZodBoolean>;
        fallbackFont: ZodOptional<ZodObject<{
            family: ZodString;
            postscriptName: ZodOptional<ZodString>;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
        }, $strict>>;
        fallbackFonts: ZodOptional<ZodArray<ZodObject<{
            family: ZodString;
            postscriptName: ZodOptional<ZodString>;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
        }, $strict>>>;
        iccProfile: ZodOptional<ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>>;
        outputConditionIdentifier: ZodOptional<ZodString>;
    }, $strict>>;
}, $strict>;
/** Stable semantic name for the low-level page/text/graphics document schema. */
declare const PdfRawDocumentSchema: ZodObject<{
    meta: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        creationDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        creator: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
        modDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        producer: ZodOptional<ZodString>;
        subject: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
    }, $strict>>;
    pages: ZodArray<ZodObject<{
        graphics: ZodOptional<ZodArray<ZodUnion<readonly [ZodObject<{
            type: ZodLiteral<"image">;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            format: ZodOptional<ZodEnum<{
                jpeg: "jpeg";
                png: "png";
            }>>;
            x: ZodNumber;
            y: ZodNumber;
            width: ZodNumber;
            height: ZodNumber;
            opacity: ZodOptional<ZodNumber>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"line">;
            x1: ZodNumber;
            y1: ZodNumber;
            x2: ZodNumber;
            y2: ZodNumber;
            stroke: ZodObject<{
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                dash: ZodOptional<ZodArray<ZodNumber>>;
                lineCap: ZodOptional<ZodEnum<{
                    butt: "butt";
                    round: "round";
                    square: "square";
                }>>;
                opacity: ZodOptional<ZodNumber>;
                style: ZodOptional<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
                width: ZodOptional<ZodNumber>;
            }, $strict>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"path">;
            d: ZodString;
            fill: ZodOptional<ZodUnion<readonly [ZodObject<{
                space: ZodLiteral<"linear-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"radial-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                startRadius: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                endRadius: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"solid">;
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                opacity: ZodOptional<ZodNumber>;
            }, $strict>]>>;
            fillRule: ZodOptional<ZodEnum<{
                evenodd: "evenodd";
                nonzero: "nonzero";
            }>>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
            scaleX: ZodOptional<ZodNumber>;
            scaleY: ZodOptional<ZodNumber>;
            stroke: ZodOptional<ZodObject<{
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                dash: ZodOptional<ZodArray<ZodNumber>>;
                lineCap: ZodOptional<ZodEnum<{
                    butt: "butt";
                    round: "round";
                    square: "square";
                }>>;
                opacity: ZodOptional<ZodNumber>;
                style: ZodOptional<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
                width: ZodOptional<ZodNumber>;
            }, $strict>>;
            x: ZodOptional<ZodNumber>;
            y: ZodOptional<ZodNumber>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"rect">;
            x: ZodNumber;
            y: ZodNumber;
            width: ZodNumber;
            height: ZodNumber;
            radius: ZodOptional<ZodNumber>;
            fill: ZodOptional<ZodUnion<readonly [ZodObject<{
                space: ZodLiteral<"linear-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"radial-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                startRadius: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                endRadius: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"solid">;
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                opacity: ZodOptional<ZodNumber>;
            }, $strict>]>>;
            stroke: ZodOptional<ZodObject<{
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                dash: ZodOptional<ZodArray<ZodNumber>>;
                lineCap: ZodOptional<ZodEnum<{
                    butt: "butt";
                    round: "round";
                    square: "square";
                }>>;
                opacity: ZodOptional<ZodNumber>;
                style: ZodOptional<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
                width: ZodOptional<ZodNumber>;
            }, $strict>>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"svg">;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            x: ZodNumber;
            y: ZodNumber;
            width: ZodNumber;
            height: ZodNumber;
            opacity: ZodOptional<ZodNumber>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>]>>>;
        height: ZodOptional<ZodNumber>;
        text: ZodOptional<ZodObject<{
            direction: ZodOptional<ZodEnum<{
                ltr: "ltr";
                rtl: "rtl";
                auto: "auto";
            }>>;
            fallbackFonts: ZodOptional<ZodArray<ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>>>;
            font: ZodOptional<ZodUnion<readonly [ZodLiteral<"Helvetica">, ZodLiteral<"Helvetica-Bold">, ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>]>>;
            fontSize: ZodOptional<ZodNumber>;
            value: ZodString;
            x: ZodOptional<ZodNumber>;
            y: ZodOptional<ZodNumber>;
        }, $strict>>;
        texts: ZodOptional<ZodArray<ZodObject<{
            direction: ZodOptional<ZodEnum<{
                ltr: "ltr";
                rtl: "rtl";
                auto: "auto";
            }>>;
            fallbackFonts: ZodOptional<ZodArray<ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>>>;
            font: ZodOptional<ZodUnion<readonly [ZodLiteral<"Helvetica">, ZodLiteral<"Helvetica-Bold">, ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>]>>;
            fontSize: ZodOptional<ZodNumber>;
            value: ZodString;
            x: ZodOptional<ZodNumber>;
            y: ZodOptional<ZodNumber>;
        }, $strict>>>;
        width: ZodOptional<ZodNumber>;
    }, $strict>>;
}, $strict>;
declare const PdfDocumentSchema: ZodUnion<readonly [ZodObject<{
    meta: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        creationDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        creator: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
        modDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        producer: ZodOptional<ZodString>;
        subject: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
    }, $strict>>;
    pages: ZodArray<ZodObject<{
        graphics: ZodOptional<ZodArray<ZodUnion<readonly [ZodObject<{
            type: ZodLiteral<"image">;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            format: ZodOptional<ZodEnum<{
                jpeg: "jpeg";
                png: "png";
            }>>;
            x: ZodNumber;
            y: ZodNumber;
            width: ZodNumber;
            height: ZodNumber;
            opacity: ZodOptional<ZodNumber>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"line">;
            x1: ZodNumber;
            y1: ZodNumber;
            x2: ZodNumber;
            y2: ZodNumber;
            stroke: ZodObject<{
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                dash: ZodOptional<ZodArray<ZodNumber>>;
                lineCap: ZodOptional<ZodEnum<{
                    butt: "butt";
                    round: "round";
                    square: "square";
                }>>;
                opacity: ZodOptional<ZodNumber>;
                style: ZodOptional<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
                width: ZodOptional<ZodNumber>;
            }, $strict>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"path">;
            d: ZodString;
            fill: ZodOptional<ZodUnion<readonly [ZodObject<{
                space: ZodLiteral<"linear-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"radial-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                startRadius: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                endRadius: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"solid">;
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                opacity: ZodOptional<ZodNumber>;
            }, $strict>]>>;
            fillRule: ZodOptional<ZodEnum<{
                evenodd: "evenodd";
                nonzero: "nonzero";
            }>>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
            scaleX: ZodOptional<ZodNumber>;
            scaleY: ZodOptional<ZodNumber>;
            stroke: ZodOptional<ZodObject<{
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                dash: ZodOptional<ZodArray<ZodNumber>>;
                lineCap: ZodOptional<ZodEnum<{
                    butt: "butt";
                    round: "round";
                    square: "square";
                }>>;
                opacity: ZodOptional<ZodNumber>;
                style: ZodOptional<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
                width: ZodOptional<ZodNumber>;
            }, $strict>>;
            x: ZodOptional<ZodNumber>;
            y: ZodOptional<ZodNumber>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"rect">;
            x: ZodNumber;
            y: ZodNumber;
            width: ZodNumber;
            height: ZodNumber;
            radius: ZodOptional<ZodNumber>;
            fill: ZodOptional<ZodUnion<readonly [ZodObject<{
                space: ZodLiteral<"linear-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"radial-gradient">;
                startX: ZodNumber;
                startY: ZodNumber;
                startRadius: ZodNumber;
                endX: ZodNumber;
                endY: ZodNumber;
                endRadius: ZodNumber;
                opacity: ZodOptional<ZodNumber>;
                stops: ZodTuple<[ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>, ZodObject<{
                    color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                        space: ZodLiteral<"rgb">;
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        space: ZodLiteral<"cmyk">;
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>, ZodObject<{
                        r: ZodNumber;
                        g: ZodNumber;
                        b: ZodNumber;
                    }, $strict>, ZodObject<{
                        c: ZodNumber;
                        m: ZodNumber;
                        y: ZodNumber;
                        k: ZodNumber;
                    }, $strict>]>, ZodTransform<{
                        space: "cmyk";
                        c: number;
                        k: number;
                        m: number;
                        y: number;
                    } | {
                        b: number;
                        g: number;
                        r: number;
                        space: "rgb";
                    }, string | {
                        space: "rgb";
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        space: "cmyk";
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    } | {
                        r: number;
                        g: number;
                        b: number;
                    } | {
                        c: number;
                        m: number;
                        y: number;
                        k: number;
                    }>>;
                    offset: ZodNumber;
                }, $strict>], null>;
            }, $strict>, ZodObject<{
                space: ZodLiteral<"solid">;
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                opacity: ZodOptional<ZodNumber>;
            }, $strict>]>>;
            stroke: ZodOptional<ZodObject<{
                color: ZodPipe<ZodUnion<readonly [ZodString, ZodObject<{
                    space: ZodLiteral<"rgb">;
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    space: ZodLiteral<"cmyk">;
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>, ZodObject<{
                    r: ZodNumber;
                    g: ZodNumber;
                    b: ZodNumber;
                }, $strict>, ZodObject<{
                    c: ZodNumber;
                    m: ZodNumber;
                    y: ZodNumber;
                    k: ZodNumber;
                }, $strict>]>, ZodTransform<{
                    space: "cmyk";
                    c: number;
                    k: number;
                    m: number;
                    y: number;
                } | {
                    b: number;
                    g: number;
                    r: number;
                    space: "rgb";
                }, string | {
                    space: "rgb";
                    r: number;
                    g: number;
                    b: number;
                } | {
                    space: "cmyk";
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                } | {
                    r: number;
                    g: number;
                    b: number;
                } | {
                    c: number;
                    m: number;
                    y: number;
                    k: number;
                }>>;
                dash: ZodOptional<ZodArray<ZodNumber>>;
                lineCap: ZodOptional<ZodEnum<{
                    butt: "butt";
                    round: "round";
                    square: "square";
                }>>;
                opacity: ZodOptional<ZodNumber>;
                style: ZodOptional<ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
                width: ZodOptional<ZodNumber>;
            }, $strict>>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>, ZodObject<{
            type: ZodLiteral<"svg">;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            x: ZodNumber;
            y: ZodNumber;
            width: ZodNumber;
            height: ZodNumber;
            opacity: ZodOptional<ZodNumber>;
            layer: ZodOptional<ZodEnum<{
                background: "background";
                foreground: "foreground";
            }>>;
        }, $strict>]>>>;
        height: ZodOptional<ZodNumber>;
        text: ZodOptional<ZodObject<{
            direction: ZodOptional<ZodEnum<{
                ltr: "ltr";
                rtl: "rtl";
                auto: "auto";
            }>>;
            fallbackFonts: ZodOptional<ZodArray<ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>>>;
            font: ZodOptional<ZodUnion<readonly [ZodLiteral<"Helvetica">, ZodLiteral<"Helvetica-Bold">, ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>]>>;
            fontSize: ZodOptional<ZodNumber>;
            value: ZodString;
            x: ZodOptional<ZodNumber>;
            y: ZodOptional<ZodNumber>;
        }, $strict>>;
        texts: ZodOptional<ZodArray<ZodObject<{
            direction: ZodOptional<ZodEnum<{
                ltr: "ltr";
                rtl: "rtl";
                auto: "auto";
            }>>;
            fallbackFonts: ZodOptional<ZodArray<ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>>>;
            font: ZodOptional<ZodUnion<readonly [ZodLiteral<"Helvetica">, ZodLiteral<"Helvetica-Bold">, ZodObject<{
                family: ZodString;
                postscriptName: ZodOptional<ZodString>;
                source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
            }, $strict>]>>;
            fontSize: ZodOptional<ZodNumber>;
            value: ZodString;
            x: ZodOptional<ZodNumber>;
            y: ZodOptional<ZodNumber>;
        }, $strict>>>;
        width: ZodOptional<ZodNumber>;
    }, $strict>>;
}, $strict>, ZodObject<{
    meta: ZodOptional<ZodObject<{
        author: ZodOptional<ZodString>;
        creationDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        creator: ZodOptional<ZodString>;
        keywords: ZodOptional<ZodArray<ZodString>>;
        modDate: ZodOptional<ZodUnion<readonly [ZodString, ZodDate]>>;
        producer: ZodOptional<ZodString>;
        subject: ZodOptional<ZodString>;
        title: ZodOptional<ZodString>;
    }, $strict>>;
    page: ZodOptional<ZodObject<{
        margin: ZodOptional<ZodUnion<readonly [ZodNumber, ZodObject<{
            top: ZodOptional<ZodNumber>;
            right: ZodOptional<ZodNumber>;
            bottom: ZodOptional<ZodNumber>;
            left: ZodOptional<ZodNumber>;
        }, $strict>]>>;
        size: ZodOptional<ZodUnion<readonly [ZodEnum<{
            A4: "A4";
            Letter: "Letter";
            a4: "a4";
            letter: "letter";
        }>, ZodObject<{
            width: ZodNumber;
            height: ZodNumber;
        }, $strict>]>>;
    }, $strict>>;
    children: ZodOptional<ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>;
    content: ZodOptional<ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>;
    bookmarks: ZodOptional<ZodObject<{
        fromHeadings: ZodOptional<ZodBoolean>;
    }, $strict>>;
    dynamicHeader: ZodOptional<ZodObject<{
        content: ZodUnion<readonly [ZodString, ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>, ZodObject<{
            center: ZodOptional<ZodString>;
            left: ZodOptional<ZodString>;
            right: ZodOptional<ZodString>;
        }, $strict>]>;
        fontSize: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        skipFirstPage: ZodOptional<ZodBoolean>;
        width: ZodOptional<ZodNumber>;
        x: ZodOptional<ZodNumber>;
        y: ZodOptional<ZodNumber>;
    }, $strict>>;
    dynamicFooter: ZodOptional<ZodObject<{
        content: ZodUnion<readonly [ZodString, ZodArray<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>, ZodObject<{
            center: ZodOptional<ZodString>;
            left: ZodOptional<ZodString>;
            right: ZodOptional<ZodString>;
        }, $strict>]>;
        fontSize: ZodOptional<ZodNumber>;
        height: ZodOptional<ZodNumber>;
        skipFirstPage: ZodOptional<ZodBoolean>;
        width: ZodOptional<ZodNumber>;
        x: ZodOptional<ZodNumber>;
        y: ZodOptional<ZodNumber>;
    }, $strict>>;
    pageLabels: ZodOptional<ZodArray<ZodObject<{
        prefix: ZodOptional<ZodString>;
        startNumber: ZodOptional<ZodNumber>;
        startPage: ZodNumber;
        style: ZodEnum<{
            arabic: "arabic";
            "roman-lower": "roman-lower";
            "roman-upper": "roman-upper";
        }>;
    }, $strict>>>;
    pageNumber: ZodOptional<ZodObject<{
        fontSize: ZodOptional<ZodNumber>;
        format: ZodOptional<ZodString>;
        x: ZodOptional<ZodNumber>;
        y: ZodOptional<ZodNumber>;
    }, $strict>>;
    accessibility: ZodOptional<ZodObject<{
        lang: ZodOptional<ZodString>;
        tagged: ZodOptional<ZodBoolean>;
    }, $strict>>;
    pdfa: ZodOptional<ZodObject<{
        conformance: ZodOptional<ZodEnum<{
            "1b": "1b";
            "2a": "2a";
            "2b": "2b";
        }>>;
        enabled: ZodOptional<ZodBoolean>;
        fallbackFont: ZodOptional<ZodObject<{
            family: ZodString;
            postscriptName: ZodOptional<ZodString>;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
        }, $strict>>;
        fallbackFonts: ZodOptional<ZodArray<ZodObject<{
            family: ZodString;
            postscriptName: ZodOptional<ZodString>;
            source: ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>;
        }, $strict>>>;
        iccProfile: ZodOptional<ZodUnion<readonly [ZodString, ZodCustom<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>, ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>]>>;
        outputConditionIdentifier: ZodOptional<ZodString>;
    }, $strict>>;
}, $strict>]>;

/**
 * Deprecated licensing shim for `@runstamp/pdf`.
 *
 * The engine has no feature gates. Every rendering capability — font embedding,
 * complex-script shaping, validation, repair, signatures, PDF/A — is available
 * in the published Apache-2.0 package, because correctness is not a paid
 * feature. Monetization lives in the hosted API, agent actions and governance
 * surfaces, not in whether the SDK renders your document properly.
 *
 * Only the one symbol that was ever public survives, so callers keep compiling
 * through the §9.5 deprecation window. Everything else — the license context,
 * the validation call, and the `requirePdfPro` guards at 23 call sites — is
 * gone, along with the `@runstamp/license` dependency.
 */
/**
 * @deprecated Always `true`. The free/pro split was removed on 2026-08-12 and no
 * capability is gated. Scheduled for removal at the next major; delete the call.
 */
declare function hasPdfProLicense(_licenseKey?: string): boolean;

declare function linearizePdfBuffer(buffer: Buffer): Promise<Buffer>;

declare function extractPdfSignatures(buffer: Buffer): PdfExtractedSignature[];
declare function validatePdfBuffer(buffer: Buffer): Promise<PdfValidationSummary>;

declare function buildPdfQualityReport(buffer: Buffer): Promise<PdfQualityReport>;

declare function buildSharedPdfQualityReport(result: PdfRepairValidationResult, renderTimeMs: number): QualityReport;

declare function repairPdfBuffer(buffer: Buffer, options?: PdfRepairOptions): Promise<PdfRepairResult>;
declare function validateAndRepairPdfBuffer(buffer: Buffer, options?: PdfRepairOptions): Promise<PdfRepairValidationResult>;

/**
 * Structured errors for @runstamp/pdf.
 *
 * Every error thrown by the engine that isn't a license-tier issue
 * (RunstampFeatureError lives in @runstamp/license) carries a stable
 * `code` so callers can branch programmatically without string-matching
 * messages. Messages may change between versions; codes will not.
 *
 * New codes are added when a new throw site is introduced. Don't add
 * codes speculatively — every code in the union has a real emit site.
 */
type PdfErrorCode = 
/** Document failed Zod schema validation. Default behavior; opt out via options.relaxed. */
"SCHEMA_REJECTED"
/** A layout cannot make forward progress within the requested page metrics. */
 | "LAYOUT_IMPOSSIBLE"
/** Structured page margins leave no positive printable content area. */
 | "PAGE_MARGINS_INVALID"
/** Container nesting exceeded the engine's documented safety cap. */
 | "LAYOUT_RECURSION_LIMIT"
/** Two options requested that cannot be combined (e.g. signature + linearize, encryption + PDF/A). */
 | "OPTIONS_CONFLICT"
/** A PDF/A conformance constraint was violated (non-embedded font, external URI, non-RGB JPEG, etc.). */
 | "PDFA_VIOLATION"
/** A binary source was rejected by the configured asset loading policy. */
 | "ASSET_SOURCE_REJECTED"
/** A binary source matched policy but could not be loaded or decoded. */
 | "ASSET_SOURCE_FAILED";
interface PdfErrorDetails {
    [key: string]: unknown;
}
declare class PdfError extends Error {
    readonly code: PdfErrorCode;
    readonly details?: PdfErrorDetails;
    constructor(code: PdfErrorCode, message: string, details?: PdfErrorDetails, options?: {
        cause?: unknown;
    });
}
declare function isPdfError(value: unknown): value is PdfError;

/**
 * Deterministic mode for @runstamp/pdf.
 *
 * The enabled/disabled flag now lives in `@runstamp/contract` (OC-1 Phase 2), so
 * every Runstamp engine observes one flag instead of four independent copies that
 * could disagree. Public signatures are unchanged.
 */
declare function setDeterministicMode(enabled?: boolean): void;
declare function isDeterministicModeEnabled(): boolean;

declare function validatePdfDocumentSafe(...args: Parameters<typeof validatePdfDocumentSafe$1>): PdfValidationResult;

export { PDFArray, PDFDictionary, PDFName, PDFNumber, PDFRaw, PDFRef, PDFStream, PDFString, PDF_RELAXED_INPUT_COERCIONS, PdfBinarySourceSchema, PdfColorParseError, PdfDocumentSchema, PdfEmbeddedFontInputSchema, PdfEngine, PdfError, PdfEvidenceError, PdfRawDocumentSchema, PdfStructuredDocumentSchema, SRGB_ICC_PROFILE, analyzePdfCapabilities, buildPdfQualityReport, buildSharedPdfQualityReport, createPdfEvidenceExtension, exportPdfEvidence, extractPdfEvidence, extractPdfSignatures, findPdfEvidence, hasPdfProLicense, inspectPdfEvidence, isDeterministicModeEnabled, isPdfError, linearizePdfBuffer, parseColor, planPdfCapabilities, preprocessPdfDocumentInput, previewPdfRedactions, redactPdfEvidence, renderPdfEvidence, renderPdfPages, repairPdfBuffer, routePdfOcr, serializePdfObject, setDeterministicMode, tryParseColor, validateAndRepairPdfBuffer, validatePdfBuffer, validatePdfDocument, validatePdfDocumentSafe, verifyPdfRedaction, writePdfDocument };
export type { FindingCode, PDFDictionaryEntries, PDFIndirectObject, PDFValue, PdfAccessibilityStructureSpec, PdfAssetPolicy, PdfBinarySource, PdfCapabilities, PdfCapabilityPlan, PdfCertificateSource, PdfColor, PdfColorInput, PdfComplianceLevel, PdfDocument, PdfDocumentAccessibilitySpec, PdfDocumentInteractiveSpec, PdfDocumentLayoutNode, PdfDynamicFooterOptions, PdfDynamicHeaderFooterConfiguredContent, PdfDynamicHeaderFooterContent, PdfDynamicHeaderFooterOptions, PdfDynamicHeaderFooterZones, PdfDynamicHeaderOptions, PdfEmbeddedFontInput, PdfEncryptionAlgorithm, PdfEncryptionConfig, PdfErrorCode, PdfErrorDetails, PdfEvidenceBudget, PdfEvidenceExport, PdfEvidenceExtensionDefinition, PdfEvidenceExtraction, PdfEvidenceInspection, PdfEvidenceLocator, PdfEvidenceLoss, PdfEvidenceMatch, PdfEvidencePage, PdfEvidenceRedaction, PdfEvidenceTextRun, PdfEvidenceVerification, PdfExistingFormFieldType, PdfExternalLinkAnnotationSpec, PdfExtractedSignature, PdfFill, PdfFillExistingFormOptions, PdfFillExistingFormResult, PdfFindingCategory, PdfFindingCode, PdfFindingSeverity, PdfFontInput, PdfFormFieldInfo, PdfFormFillWarning, PdfFormInspection, PdfFormValue, PdfGradientStop, PdfGraphic, PdfImageGraphic, PdfInputWarning, PdfInternalLinkAnnotationSpec, PdfLineGraphic, PdfLinearGradientFill, PdfMarkedContentSpec, PdfOcrAdapter, PdfOcrAdapterContext, PdfOcrAdapterResult, PdfOcrRoute, PdfP12CertificateSource, PdfPageAnnotationSpec, PdfPageExtraCommand, PdfPathGraphic, PdfPemCertificateSource, PdfPermissionFlags, PdfQualityFinding, PdfQualityReport, PdfQualityVerdict, PdfRadialGradientFill, PdfRectGraphic, PdfRelaxedInputOptions, PdfRenderMeta, PdfRenderOptions, PdfRenderTrace, PdfRenderableGraphic, PdfRenderableText, PdfRenderedPage, PdfRepairAction, PdfRepairOptions, PdfRepairResult, PdfRepairValidationResult, PdfSelectedPhase, PdfSignOptions, PdfSignatureWidgetSpec, PdfSolidFill, PdfStrokeStyle, PdfSvgGraphic, PdfPhase5TableCell as PdfTableCell, PdfPhase5TableRow as PdfTableRow, PdfTextAnnotationSpec, PdfTextEncodingWarning, PdfTimestampAuthorityOptions, PdfTransformMatrix, PdfValidationCheck, PdfValidationIssue, PdfValidationIssueCode, PdfValidationResult, PdfValidationSummary, PdfValidationVerdict, PdfVersion, PdfaConformanceLevel, QualityFinding, QualityReport, QualityVerdict, RenderWithQualityResult, RepairEntry, RepairRisk };
