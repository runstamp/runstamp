/**
 * Layout types used across primitives.
 *
 * We intentionally avoid importing PaperNode types from @runstamp/pptx
 * at this layer — primitives emit a *structural* node description that the
 * adapter layer translates to the engine's AST. This keeps primitives
 * testable without a full engine dep graph, and keeps the engine free to
 * evolve its AST without breaking the primitive contract.
 *
 * For now, the structural description is nominally identical to a subset
 * of PaperNode; see src/ast/toPaperNodes.ts for the translation.
 */
/** Axis-aligned rectangle in slide-space px. */
export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}
/** Minimal structural node emitted by primitives. */
export type PrimitiveNode = ViewNode | TextNode | ImageNode | ChartNode | TableNode | ConnectorNode;
export interface BaseNodeProps {
    /** Absolute bbox in slide-space px. */
    rect: Rect;
    /** z-ordering hint; higher draws on top. Compiler applies. */
    zIndex?: number;
    /** Mark nodes that exist for decoration only (engine may skip a11y). */
    decorative?: boolean;
}
/** DrawingML preset geometry names that primitives can target without
 *  building a CustomGeometry. The bridge passes the name straight through
 *  to the engine's `shapeType` field; the engine validates against the
 *  full ECMA-376 ShapeType union. We keep the primitive-side type loose
 *  (`string`) so primitive code never has to import the engine literal
 *  union — invalid presets fail at the engine validator, not in the
 *  primitive layer. */
export type ViewShape = string;
/** Pattern fill — maps to OOXML `<a:pattFill>`. Used for forecast-bar
 *  hatching, "preliminary" diagonal stripes, etc. The `preset` value is
 *  one of the DrawingML PatternType strings (e.g., "ltDnDiag",
 *  "dkUpDiag"); the engine's PatternFill validator rejects unknowns. */
export interface PatternFill {
    type: "pattern";
    preset: string;
    /** Hex foreground (the pattern strokes / dots). */
    fg: string;
    /** Hex background. */
    bg: string;
}
export type ViewFill = string | PatternFill;
export interface ViewNode extends BaseNodeProps {
    kind: "view";
    shape?: ViewShape;
    fill?: ViewFill;
    /** Rotation in degrees. Maps to engine FlexStyle.rotation. Used for
     *  diagonal stamps + tilted callouts. */
    rotation?: number;
    /** Adjustment values for preset geometry (DrawingML "guides"). When
     *  the engine's preset-shape adjustment system is in use, these tune
     *  shape proportions (chevron point depth, callout pointer position,
     *  etc.). Numbers in [0, 100000] per ECMA-376. */
    shapeAdjustments?: number[];
    border?: {
        width: number;
        color: string;
        style?: "solid" | "dashed" | "dotted";
    };
    children?: PrimitiveNode[];
}
/** Per-run override for rich-text emphasis inside a single TextNode. The
 *  base style on the node supplies any unset field. Primitives that want
 *  bold lead-ins, italic emphasis, or color-shifted phrases inside one
 *  paragraph emit `runs: TextRun[]` instead of a flat `content: string`.
 *  The bridge translates each run into the engine's TextRun schema; the
 *  width/wrap estimator sums advances across runs. */
export interface TextRun {
    text: string;
    bold?: boolean;
    italic?: boolean;
    /** Override TextNode.style.color for this run. Hex. */
    color?: string;
    /** Override TextNode.style.size (in pt). Resolves through the same
     *  PT_TO_PX bridge as the node-level size. */
    fontSize?: number;
    /** Override TextNode.style.family for this run. */
    fontFamily?: string;
    underline?: boolean;
}
/** Bullet config for a paragraph. Mirrors the engine's BulletConfig shape;
 *  the bridge maps these directly to OOXML `<a:buChar>` / `<a:buAutoNum>`
 *  via the engine's PaperText.paragraphs path. Token-driven primitives
 *  build BulletChar from `tokens.ornament.bullet`; numbered primitives
 *  build BulletAutoNum. `none` suppresses bullet emission for the
 *  paragraph (used for nested-but-unmarked items). */
export type BulletAutoNumScheme = "arabicPeriod" | "arabicParenR" | "romanUcPeriod" | "romanLcPeriod" | "alphaUcPeriod" | "alphaLcPeriod" | "alphaLcParenR" | "alphaUcParenR";
export interface BulletChar {
    type?: "char";
    /** Bullet glyph (e.g. "•", "–", "▸"). */
    char: string;
    color?: string;
    /** Percentage of font size (100 = same size). */
    size?: number;
    fontFamily?: string;
}
export interface BulletAutoNum {
    type: "autoNum";
    scheme: BulletAutoNumScheme;
    startAt?: number;
}
export interface BulletNone {
    type: "none";
}
export type BulletConfig = BulletChar | BulletAutoNum | BulletNone;
/** Single paragraph inside a TextNode. Primitives that want real bullet
 *  hierarchy (proper hanging indent, OOXML-native list semantics that
 *  PowerPoint can re-edit) emit `paragraphs: Paragraph[]` instead of a
 *  flat string with a literal "• " prefix. The bridge maps to the
 *  engine's PaperText.paragraphs path. */
export interface Paragraph {
    runs: TextRun[];
    align?: "left" | "center" | "right" | "justify";
    /** Indentation level (0-8). Maps to OOXML `<a:lvl{N}pPr>`. */
    level?: number;
    /** First-line indent in pixels. */
    indent?: number;
    /** Left margin in pixels. */
    marginLeft?: number;
    /** Hanging indent in pixels (negative indent for the wrapped lines so
     *  bullet sits in the gutter and continuation aligns with the first
     *  glyph of the bullet text). Standard for hanging-indent bullets. */
    hangingIndent?: number;
    /** Space before paragraph in points. */
    spaceBefore?: number;
    /** Space after paragraph in points. */
    spaceAfter?: number;
    bullet?: BulletConfig;
}
export interface TextNode extends BaseNodeProps {
    kind: "text";
    /** One of `content` (flat string), `runs` (single-paragraph rich runs),
     *  or `paragraphs` (multi-paragraph with bullet config). When more than
     *  one is set, precedence is `paragraphs` > `runs` > `content`. */
    content?: string;
    runs?: TextRun[];
    paragraphs?: Paragraph[];
    style: {
        family: string;
        weight: number;
        size: number;
        lineHeight?: number;
        letterSpacing?: number;
        italic?: boolean;
        color: string;
        align?: "left" | "center" | "right";
        verticalAlign?: "top" | "middle" | "bottom";
        /** Text body direction. "vertical" maps to OOXML `vert="vert270"`
         *  (reads bottom-to-top, wrap budget = rect.height). The shape
         *  itself stays axis-aligned — unlike `rotation`, which transforms
         *  the entire frame. Use this for rotated table row labels and
         *  vertical axis captions; the layout-safety pass sees the true
         *  bounding box and no `decorative` escape hatch is needed. */
        textDirection?: "horizontal" | "vertical";
    };
    /** Rotation in degrees, applied to the text box. Maps to OOXML
     *  `<p:spPr><a:xfrm rot="...">` (60000ths of a degree). Used for
     *  diagonal stamps, vertical chart axis labels. */
    rotation?: number;
    /** Does the engine auto-shrink text to fit the rect? Primitives set this
     *  deliberately per their adaptation policy; the compiler does not override. */
    autoFit?: boolean;
}
export interface ImageNode extends BaseNodeProps {
    kind: "image";
    src: string;
    alt?: string;
    crop?: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    opacity?: number;
}
/** Opaque chart payload. The primitive layer doesn't model chart schemas —
 *  callers pass a ChartData-shaped object through unchanged, and the
 *  adapter (toPaperNodes) forwards it to the engine's chart AST node.
 *  Keeping this untyped here avoids pulling the engine's ChartData types
 *  into the primitives package; callers that want type safety import
 *  ChartData from @runstamp/core and cast to `unknown` at the boundary. */
export interface ChartNode extends BaseNodeProps {
    kind: "chart";
    chartData: unknown;
    altText?: string;
}
export type TableCellContent = string | TextRun[] | Paragraph[];
export interface TableCellBorder {
    width?: number;
    color?: string;
}
export interface TableCellBorders {
    top?: TableCellBorder;
    right?: TableCellBorder;
    bottom?: TableCellBorder;
    left?: TableCellBorder;
}
export interface TableCellStyle {
    fill?: string;
    borders?: TableCellBorders;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    textAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    padding?: number;
}
export interface TableCellSpec {
    content: TableCellContent;
    style?: TableCellStyle;
    colSpan?: number;
    rowSpan?: number;
}
export interface TableRowSpec {
    /** Fixed row height in pixels. Omit to let cells size to content. */
    height?: number;
    minHeight?: number;
    cells: TableCellSpec[];
}
export interface TableNode extends BaseNodeProps {
    kind: "table";
    /** Per-column pixel widths. Sum should match the node's rect width;
     *  primitive authors should compute these explicitly rather than rely
     *  on auto-distribution to keep layout deterministic. */
    columns: number[];
    rows: TableRowSpec[];
    /** Bridge passes through `outerBorder`, `innerBorderH`, `innerBorderV`
     *  to the engine's TableStyle. Useful for matrix tables that draw a
     *  single hairline grid. */
    borders?: {
        outer?: TableCellBorder;
        innerH?: TableCellBorder;
        innerV?: TableCellBorder;
    };
}
export type ConnectorKind = "straight" | "elbow" | "curved";
export interface ConnectorPoint {
    x: number;
    y: number;
}
export interface ConnectorNode extends BaseNodeProps {
    kind: "connector";
    /** Style of connector path. Maps to OOXML connector preset:
     *  `straight` → `straightConnector1`,
     *  `elbow`    → `bentConnector3`,
     *  `curved`   → `curvedConnector3`. */
    connectorKind: ConnectorKind;
    start: ConnectorPoint;
    end: ConnectorPoint;
    lineWidth?: number;
    lineColor?: string;
    lineDashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
    /** Arrow head config — `true` enables a default triangle, `false` /
     *  undefined leaves the end plain. */
    arrowStart?: boolean;
    arrowEnd?: boolean;
}
//# sourceMappingURL=types.d.ts.map