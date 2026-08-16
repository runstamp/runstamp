/**
 * Composition slides — caller-supplied primitive layouts.
 *
 * Sophisticated callers escape the slideType-template layer by sending a
 * `slideType: "composition"` slide. Each block names a primitive, supplies
 * its input, and places itself on a 12×12 grid carved out of the
 * usable canvas area (slide minus canvas.margin and footer reserve).
 *
 * Validation contract:
 *   - The block schema is a discriminated union over `primitive`, so
 *     the input shape is type-checked per primitive.
 *   - Region coords are clamped to [0, gridCols-1] / [0, gridRows-1] with
 *     spans bounded against grid edges.
 *   - The compiler still runs validateAbsoluteSlideLayout on the
 *     resulting PaperSlide. Composition does not skip layout safety —
 *     overlapping blocks fail the same as any other slide.
 *
 * Footer chrome remains auto-emitted by the compiler when
 * tokens.chrome.footer.enabled — composition controls the body region,
 * not the slide chrome.
 */
import { z } from "zod";
import { bulletList, chartBlock, comparisonBand, imageBleed, infoCard, kpiHero, matrixTable, metricStack, orgTree, quadrantMap, sectionRibbon, sectionTag, sourceLine, stepTimeline, textBlock, titleBlock, tocTiles, tombstoneStack, waterfallBars, 
// Phase 9 primitives.
bannerBand, calloutBox, chevronArrow, connectorLine, diagonalStamp, groupBorder, harveyBall, legendTable, numberedChip, pageStamp, } from "@runstamp/pptx-primitives";
// ---------------------------------------------------------------------------
// Per-primitive input schemas — minimal Zod mirrors of the TS interfaces.
// ---------------------------------------------------------------------------
const trendSchema = z.enum(["up", "down", "flat"]);
const trendOrNoneSchema = z.enum(["up", "down", "flat", "none"]);
const TitleBlockInputSchema = z.strictObject({
    title: z.string().min(1),
    eyebrow: z.string().min(1).optional(),
    subtitle: z.string().min(1).optional(),
});
const BulletListInputSchema = z.strictObject({
    items: z
        .array(z.strictObject({
        text: z.string().min(1),
        level: z.number().int().min(1).max(2).optional(),
    }))
        .min(1)
        .max(24),
    resume: z.strictObject({ startIndex: z.number().int().min(0) }).optional(),
});
const SectionRibbonInputSchema = z.strictObject({
    label: z.string().min(1),
});
const SectionTagInputSchema = z.strictObject({
    label: z.string().min(1),
    fill: z.enum(["foreground", "muted", "accent"]).optional(),
    transform: z.enum(["none", "upper"]).optional(),
});
const SourceLineInputSchema = z.strictObject({
    content: z.string().min(1),
    kind: z.enum(["source", "note", "plain"]).optional(),
    align: z.enum(["left", "right"]).optional(),
});
const TextBlockTextRunSchema = z.strictObject({
    text: z.string().min(1),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    color: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontFamily: z.string().optional(),
    underline: z.boolean().optional(),
});
const TextBlockBulletConfigSchema = z.union([
    z.strictObject({
        type: z.literal("char").optional(),
        char: z.string().min(1),
        color: z.string().optional(),
        size: z.number().positive().optional(),
        fontFamily: z.string().optional(),
    }),
    z.strictObject({
        type: z.literal("autoNum"),
        scheme: z.enum([
            "arabicPeriod", "arabicParenR", "romanUcPeriod", "romanLcPeriod",
            "alphaUcPeriod", "alphaLcPeriod", "alphaLcParenR", "alphaUcParenR",
        ]),
        startAt: z.number().int().min(1).optional(),
    }),
    z.strictObject({ type: z.literal("none") }),
]);
const TextBlockParagraphSchema = z.strictObject({
    runs: z.array(TextBlockTextRunSchema).min(1),
    align: z.enum(["left", "center", "right", "justify"]).optional(),
    level: z.number().int().min(0).max(8).optional(),
    indent: z.number().optional(),
    marginLeft: z.number().optional(),
    hangingIndent: z.number().optional(),
    spaceBefore: z.number().optional(),
    spaceAfter: z.number().optional(),
    bullet: TextBlockBulletConfigSchema.optional(),
});
const TextBlockColorRoleSchema = z.enum([
    "foreground", "muted", "faint", "accent", "accentInverse", "accentSecondary",
]);
const TextBlockFillRoleSchema = z.enum([
    "foreground", "muted", "faint", "accent", "accentSecondary", "surface", "none",
]);
const TextBlockBorderRoleSchema = z.enum([
    "foreground", "muted", "faint", "accent", "rule",
]);
const TextBlockInputSchema = z.strictObject({
    content: z.union([
        z.string().min(1),
        z.array(TextBlockParagraphSchema).min(1).max(40),
        z.array(TextBlockTextRunSchema).min(1).max(32),
    ]),
    role: z.enum(["display", "title", "body", "caption", "eyebrow"]).optional(),
    fill: z.union([TextBlockFillRoleSchema, z.string()]).optional(),
    border: z
        .strictObject({
        color: z.union([TextBlockBorderRoleSchema, z.string()]).optional(),
        width: z.number().min(0).optional(),
        style: z.enum(["solid", "dashed", "dotted"]).optional(),
    })
        .optional(),
    insets: z
        .strictObject({
        top: z.number().min(0).optional(),
        right: z.number().min(0).optional(),
        bottom: z.number().min(0).optional(),
        left: z.number().min(0).optional(),
    })
        .optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
    color: z.union([TextBlockColorRoleSchema, z.string()]).optional(),
    italic: z.boolean().optional(),
    weight: z.number().int().min(100).max(900).optional(),
    size: z.number().positive().optional(),
    lineHeight: z
        .number()
        .positive()
        .optional()
        .describe("Line height as a multiple of font size (e.g. 1.4 for 1.4× spacing). Values ≥ 4 are deprecated legacy points."),
    rotation: z.number().min(-180).max(180).optional(),
});
const InfoCardInputSchema = z.strictObject({
    sideLabel: z
        .strictObject({
        text: z.string().min(1),
        position: z.enum(["left", "top"]).optional(),
        fill: z.union([TextBlockFillRoleSchema, z.string()]).optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
    })
        .optional(),
    lead: z
        .union([z.string().min(1), z.array(TextBlockTextRunSchema).min(1).max(16)])
        .optional(),
    body: z
        .array(z.strictObject({
        text: z.string().min(1),
        level: z.number().int().min(1).max(2).optional(),
    }))
        .min(1)
        .max(24),
    footer: z
        .strictObject({
        text: z.union([
            z.string().min(1),
            z.array(TextBlockTextRunSchema).min(1).max(16),
        ]),
        style: z.enum(["italic-quote", "plain"]).optional(),
    })
        .optional(),
    fill: z.union([TextBlockFillRoleSchema, z.string()]).optional(),
    border: z
        .strictObject({
        color: z.union([TextBlockBorderRoleSchema, z.string()]).optional(),
        width: z.number().min(0).optional(),
    })
        .optional(),
    padding: z.number().min(0).optional(),
    gap: z.number().min(0).optional(),
});
const TextRunSchemaForMatrix = z.strictObject({
    text: z.string().min(1),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    color: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontFamily: z.string().optional(),
    underline: z.boolean().optional(),
});
// Paragraph schema for matrixTable cells — mirrors the Paragraph type
// in pptx-primitives/layout/types. Bullet config supports the three
// engine-side variants (char glyph, autoNum scheme, none).
const BulletConfigSchema = z.union([
    z.strictObject({
        type: z.literal("char").optional(),
        char: z.string().min(1),
        color: z.string().optional(),
        size: z.number().positive().optional(),
        fontFamily: z.string().optional(),
    }),
    z.strictObject({
        type: z.literal("autoNum"),
        scheme: z.enum([
            "arabicPeriod", "arabicParenR", "romanUcPeriod", "romanLcPeriod",
            "alphaUcPeriod", "alphaLcPeriod", "alphaLcParenR", "alphaUcParenR",
        ]),
        startAt: z.number().int().min(1).optional(),
    }),
    z.strictObject({ type: z.literal("none") }),
]);
const ParagraphSchemaForMatrix = z.strictObject({
    runs: z.array(TextRunSchemaForMatrix).min(1),
    align: z.enum(["left", "center", "right", "justify"]).optional(),
    level: z.number().int().min(0).max(8).optional(),
    indent: z.number().optional(),
    marginLeft: z.number().optional(),
    hangingIndent: z.number().optional(),
    spaceBefore: z.number().optional(),
    spaceAfter: z.number().optional(),
    bullet: BulletConfigSchema.optional(),
});
const MatrixTableInputSchema = z.strictObject({
    columnHeaders: z.array(z.union([z.string(), z.null()])).optional(),
    // Per-column header fill role override. Index [0] is the row-label
    // corner cell; [1..N] correspond to data columns. null = use the
    // table-wide default (accent). Used by Bain p6 to render Goods/Travel
    // headers in accentSecondary (Bain Sea blue) while Local stays muted.
    columnHeaderFills: z
        .array(z.union([z.enum(["foreground", "muted", "accent", "accentSecondary"]), z.null()]))
        .optional(),
    rows: z
        .array(z.strictObject({
        // Label types — discriminator is the element shape, same union
        // ordering rules as cells.
        label: z.union([
            z.string().min(1),
            z.array(ParagraphSchemaForMatrix).min(1).max(8),
            z.array(TextRunSchemaForMatrix).min(1).max(16),
        ]),
        // Cell types — discriminator is the element shape:
        //   string         → plain
        //   string[]       → bulleted-list sugar (literal "• " prefix)
        //   TextRun[]      → rich-runs paragraph (element has `text`)
        //   Paragraph[]    → bullet hierarchy (element has `runs`)
        // Order matters in the union: Paragraph[] must precede TextRun[]
        // since both are arrays-of-objects; Paragraph has the deeper
        // shape so we test it first.
        cells: z
            .array(z.union([
            z.string(),
            z.array(z.string()).max(8),
            z.array(ParagraphSchemaForMatrix).min(1).max(20),
            z.array(TextRunSchemaForMatrix).min(1).max(16),
        ]))
            .max(8),
        accent: z.boolean().optional(),
        labelFill: z.enum(["foreground", "muted", "faint", "accent"]).optional(),
    }))
        .min(1)
        .max(20),
    rowLabelWidth: z.number().positive().optional(),
    labelColumnWidthRatio: z.number().min(0.05).max(0.6).optional(),
    rowLabelStyle: z.enum(["filled", "plain"]).optional(),
    rowLabelRotation: z.number().min(-180).max(180).optional(),
    minRowHeight: z.number().positive().optional(),
    rowHeight: z.number().positive().optional(),
    distributeRows: z.boolean().optional(),
    /**
     * Per-data-column relative widths. Length must equal the number of
     * data columns (excluding the row-label column). Values are relative
     * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
     * When supplied, `labelColumnWidthRatio`-driven distribution is
     * overridden. Use this when one column has long values that would
     * otherwise force every other cell to wrap.
     */
    colW: z.array(z.number().positive()).min(1).max(8).optional(),
    /**
     * How to handle a data cell whose content would overflow its column width:
     *   - "wrap"     — wrap to multiple lines (default; preserves all text).
     *   - "ellipsis" — truncate to a single line and append "…" when text
     *                  exceeds column width. Use for dense comparison tables
     *                  where row height parity is more important than full
     *                  text fidelity.
     *   - "shrink"   — iteratively reduce font size (down to 8pt floor) until
     *                  the cell fits on a single line.
     *
     * Applies only to plain-string and TextRun[] cells. string[] (bulleted)
     * and Paragraph[] (rich-paragraph) cells always wrap, since their author
     * already structured the content as multi-line.
     */
    wrapPolicy: z.enum(["wrap", "ellipsis", "shrink"]).optional(),
    resume: z.strictObject({ startRowIndex: z.number().int().min(0) }).optional(),
});
const ComparisonBandInputSchema = z.strictObject({
    columns: z.array(z.string()).min(2).max(8),
    rows: z
        .array(z.strictObject({
        label: z.string().min(1),
        values: z.array(z.string()).min(1).max(8),
        accent: z.boolean().optional(),
    }))
        .min(1)
        .max(20),
    resume: z.strictObject({ startRowIndex: z.number().int().min(0) }).optional(),
    labelColumnWidthRatio: z.number().min(0.05).max(0.6).optional(),
});
const StepTimelineInputSchema = z.strictObject({
    steps: z
        .array(z.strictObject({
        tag: z.string().min(1),
        label: z.string().min(1),
        description: z.string().optional(),
    }))
        .min(2)
        .max(10),
});
const WaterfallBarsInputSchema = z.strictObject({
    steps: z
        .array(z.strictObject({
        kind: z.enum(["start", "end", "up", "down"]),
        label: z.string().min(1),
        value: z.number(),
        valueLabel: z.string().optional(),
    }))
        .min(3)
        .max(20),
    barWidthRatio: z.number().min(0.1).max(1).optional(),
    minStepWidth: z.number().positive().optional(),
    showConnectors: z.boolean().optional(),
});
const OrgTreeInputSchema = z.strictObject({
    root: z.strictObject({
        title: z.string().min(1),
        subtitle: z.string().optional(),
    }),
    children: z
        .array(z.strictObject({
        title: z.string().min(1),
        subtitle: z.string().optional(),
        accent: z.boolean().optional(),
    }))
        .min(1)
        .max(8),
    rootHeightRatio: z.number().min(0.1).max(0.6).optional(),
    minChildWidth: z.number().positive().optional(),
    childGap: z.number().nonnegative().optional(),
    rootFill: z.enum(["foreground", "surface"]).optional(),
});
const TombstoneStackInputSchema = z.strictObject({
    tiles: z
        .array(z.strictObject({
        logo: z.string().optional(),
        title: z.string().min(1),
        body: z.string().optional(),
        accent: z.boolean().optional(),
    }))
        .min(1)
        .max(20),
    columns: z.number().int().min(1).max(6).optional(),
    rowGap: z.number().nonnegative().optional(),
    columnGap: z.number().nonnegative().optional(),
    logoHeight: z.number().nonnegative().optional(),
    resume: z.strictObject({ startTileIndex: z.number().int().min(0) }).optional(),
    compact: z.boolean().optional(),
});
const TocTilesInputSchema = z.strictObject({
    tiles: z
        .array(z.strictObject({
        marker: z.union([z.string().min(1), z.number()]),
        title: z.string().min(1),
        body: z.string().optional(),
    }))
        .min(1)
        .max(8),
    columns: z.number().int().min(1).max(8).optional(),
    columnGap: z.number().nonnegative().optional(),
    markerSizePt: z.number().positive().optional(),
});
const MetricStackInputSchema = z.strictObject({
    rows: z
        .array(z.strictObject({
        label: z.string().min(1),
        value: z.string().min(1),
        delta: z.string().optional(),
        trend: trendSchema.optional(),
    }))
        .min(1)
        .max(8),
    resume: z.strictObject({ startIndex: z.number().int().min(0) }).optional(),
});
const KpiHeroInputSchema = z.strictObject({
    label: z.string().min(1),
    value: z.string().min(1),
    delta: z.string().optional(),
    trend: trendSchema.optional(),
    support: z.string().optional(),
    verticalAlign: z.enum(["top", "center"]).optional(),
});
const ChartBlockInputSchema = z.strictObject({
    chartData: z.unknown(),
    altText: z.string().optional(),
    preserveCallerStyling: z.boolean().optional(),
});
const ImageBleedInputSchema = z.strictObject({
    src: z.string().min(1).optional(),
    alt: z.string().optional(),
    crop: z
        .strictObject({
        left: z.number().min(0).max(1),
        top: z.number().min(0).max(1),
        right: z.number().min(0).max(1),
        bottom: z.number().min(0).max(1),
    })
        .optional(),
    bleed: z.enum(["full", "half", "quarter", "inline", "none"]).optional(),
    fallbackText: z.string().optional(),
    overlay: z
        .strictObject({
        text: z.string().min(1),
        role: z.enum(["display", "title", "body", "caption", "eyebrow", "nav"]).optional(),
        align: z.enum(["left", "center", "right"]).optional(),
        verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
    })
        .optional(),
});
const QuadrantMapInputSchema = z.strictObject({
    xAxisLabel: z
        .strictObject({ low: z.string().min(1), high: z.string().min(1) })
        .optional(),
    yAxisLabel: z
        .strictObject({ low: z.string().min(1), high: z.string().min(1) })
        .optional(),
    quadrants: z.array(z.string().min(1)).length(4).optional(),
    points: z
        .array(z.strictObject({
        name: z.string().min(1),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        emphasis: z.enum(["primary", "secondary"]).optional(),
    }))
        .max(24)
        .optional(),
    dotRadius: z.number().positive().optional(),
    axisLabelReserve: z.number().nonnegative().optional(),
});
// Phase 9 primitive schemas. Each mirrors the TS interface in pptx-primitives.
const HarveyBallInputSchema = z.strictObject({
    filled: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});
const TextRunSchemaForCallout = z.strictObject({
    text: z.string().min(1),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    color: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontFamily: z.string().optional(),
    underline: z.boolean().optional(),
});
const CalloutBoxInputSchema = z.strictObject({
    content: z.union([z.string().min(1), z.array(TextRunSchemaForCallout).min(1)]),
    fill: z.enum(["surface", "muted", "faint", "accent"]).optional(),
    borderColor: z.enum(["foreground", "muted", "faint", "accent"]).optional(),
    borderWidth: z.number().nonnegative().optional(),
    role: z.enum(["body", "caption", "eyebrow"]).optional(),
    shape: z.enum(["rect", "roundRect"]).optional(),
});
const ChevronArrowInputSchema = z.strictObject({
    direction: z.enum(["left", "right"]).optional(),
    label: z.string().optional(),
    fill: z.enum(["accent", "foreground", "muted"]).optional(),
});
const NumberedChipInputSchema = z.strictObject({
    index: z.number().int(),
    shape: z.enum(["rect", "ellipse", "roundRect"]).optional(),
    fill: z.enum(["foreground", "muted", "accent"]).optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    size: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    anchor: z.enum(["topLeft", "topRight", "bottomLeft", "bottomRight", "center"]).optional(),
});
const DiagonalStampInputSchema = z.strictObject({
    text: z.string().min(1),
    rotation: z.number().optional(),
    color: z.enum(["muted", "faint", "foreground", "accent"]).optional(),
});
const LegendItemSchema = z.strictObject({
    color: z.string().min(1),
    label: z.string().min(1),
    value: z.string().optional(),
});
const LegendTableInputSchema = z.strictObject({
    items: z.array(LegendItemSchema).min(1).max(20),
    direction: z.enum(["vertical", "horizontal"]).optional(),
});
const BannerBandInputSchema = z.strictObject({
    text: z.string().min(1),
    role: z.enum(["display", "title", "body", "eyebrow"]).optional(),
    fill: z.enum(["foreground", "muted", "accent", "accentSecondary"]).optional(),
    parallelogram: z.boolean().optional(),
});
const ConnectorLineInputSchema = z.strictObject({
    kind: z.enum(["straight", "elbow", "curved"]).optional(),
    start: z.strictObject({ x: z.number(), y: z.number() }),
    end: z.strictObject({ x: z.number(), y: z.number() }),
    width: z.number().positive().optional(),
    color: z.enum(["foreground", "muted", "faint", "accent", "rule"]).optional(),
    dashStyle: z.enum(["solid", "dashed", "dotted", "dotDash"]).optional(),
    arrowStart: z.boolean().optional(),
    arrowEnd: z.boolean().optional(),
    bounds: z.enum(["endpoints", "region"]).optional(),
});
const GroupBorderInputSchema = z.strictObject({
    label: z.string().optional(),
    color: z.enum(["foreground", "muted", "faint", "accent"]).optional(),
    width: z.number().positive().optional(),
    style: z.enum(["solid", "dashed", "dotted"]).optional(),
});
const PageStampInputSchema = z.strictObject({
    src: z.string().optional(),
    alt: z.string().optional(),
    fallbackText: z.string().optional(),
});
const PRIMITIVE_REGISTRY = {
    titleBlock: { schema: TitleBlockInputSchema, fn: titleBlock },
    bulletList: { schema: BulletListInputSchema, fn: bulletList },
    sectionRibbon: { schema: SectionRibbonInputSchema, fn: sectionRibbon },
    sectionTag: { schema: SectionTagInputSchema, fn: sectionTag },
    sourceLine: { schema: SourceLineInputSchema, fn: sourceLine },
    textBlock: { schema: TextBlockInputSchema, fn: textBlock },
    infoCard: { schema: InfoCardInputSchema, fn: infoCard },
    matrixTable: { schema: MatrixTableInputSchema, fn: matrixTable },
    comparisonBand: { schema: ComparisonBandInputSchema, fn: comparisonBand },
    stepTimeline: { schema: StepTimelineInputSchema, fn: stepTimeline },
    waterfallBars: { schema: WaterfallBarsInputSchema, fn: waterfallBars },
    orgTree: { schema: OrgTreeInputSchema, fn: orgTree },
    tombstoneStack: { schema: TombstoneStackInputSchema, fn: tombstoneStack },
    tocTiles: { schema: TocTilesInputSchema, fn: tocTiles },
    metricStack: { schema: MetricStackInputSchema, fn: metricStack },
    kpiHero: { schema: KpiHeroInputSchema, fn: kpiHero },
    chartBlock: { schema: ChartBlockInputSchema, fn: chartBlock },
    quadrantMap: { schema: QuadrantMapInputSchema, fn: quadrantMap },
    imageBleed: { schema: ImageBleedInputSchema, fn: imageBleed },
    // Phase 9.
    harveyBall: { schema: HarveyBallInputSchema, fn: harveyBall },
    calloutBox: { schema: CalloutBoxInputSchema, fn: calloutBox },
    chevronArrow: { schema: ChevronArrowInputSchema, fn: chevronArrow },
    numberedChip: { schema: NumberedChipInputSchema, fn: numberedChip },
    diagonalStamp: { schema: DiagonalStampInputSchema, fn: diagonalStamp },
    legendTable: { schema: LegendTableInputSchema, fn: legendTable },
    bannerBand: { schema: BannerBandInputSchema, fn: bannerBand },
    connectorLine: { schema: ConnectorLineInputSchema, fn: connectorLine },
    groupBorder: { schema: GroupBorderInputSchema, fn: groupBorder },
    pageStamp: { schema: PageStampInputSchema, fn: pageStamp },
};
export const COMPOSITION_PRIMITIVE_NAMES = Object.keys(PRIMITIVE_REGISTRY);
// ---------------------------------------------------------------------------
// Block + slide schemas.
// ---------------------------------------------------------------------------
const RegionGridSchema = z.strictObject({
    col: z.number().int().min(0).max(11),
    row: z.number().int().min(0).max(11),
    colSpan: z.number().int().min(1).max(12),
    rowSpan: z.number().int().min(1).max(12),
}).refine((r) => r.col + r.colSpan <= 12 && r.row + r.rowSpan <= 12, { message: "Region escapes the 12×12 grid (col+colSpan or row+rowSpan > 12)" });
/** Pixel-coordinate region. Values are absolute slide-space pixels at the
 *  default 960×540 canvas. Use for chart callout pointers, leader lines,
 *  hand-positioned annotations — anything where the 12×12 grid coarsens
 *  too much. The compiler does not clamp; out-of-canvas placements emit
 *  layout-safety violations the same as any out-of-bounds primitive. */
const RegionPixelSchema = z.strictObject({
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
});
const RegionSchema = z.union([RegionGridSchema, RegionPixelSchema]);
const BlockZIndexSchema = z.number().finite().optional();
const blockVariant = (name) => z.strictObject({
    primitive: z.literal(name),
    region: RegionSchema,
    zIndex: BlockZIndexSchema,
    input: PRIMITIVE_REGISTRY[name].schema,
});
/** The discriminated union over registered primitives — does not include
 *  the recursive `container` variant. We wrap it in a plain union below
 *  to add `container`, since `discriminatedUnion` does not accept lazy
 *  variants and the container's input schema needs `z.lazy()` to break
 *  the self-reference cycle. */
const RegisteredBlockSchema = z.discriminatedUnion("primitive", [
    blockVariant("titleBlock"),
    blockVariant("bulletList"),
    blockVariant("sectionRibbon"),
    blockVariant("sectionTag"),
    blockVariant("sourceLine"),
    blockVariant("textBlock"),
    blockVariant("infoCard"),
    blockVariant("matrixTable"),
    blockVariant("comparisonBand"),
    blockVariant("stepTimeline"),
    blockVariant("waterfallBars"),
    blockVariant("orgTree"),
    blockVariant("tombstoneStack"),
    blockVariant("tocTiles"),
    blockVariant("metricStack"),
    blockVariant("kpiHero"),
    blockVariant("chartBlock"),
    blockVariant("quadrantMap"),
    blockVariant("imageBleed"),
    // Phase 9.
    blockVariant("harveyBall"),
    blockVariant("calloutBox"),
    blockVariant("chevronArrow"),
    blockVariant("numberedChip"),
    blockVariant("diagonalStamp"),
    blockVariant("legendTable"),
    blockVariant("bannerBand"),
    blockVariant("connectorLine"),
    blockVariant("groupBorder"),
    blockVariant("pageStamp"),
]);
const ContainerBlockSchema = z.lazy(() => z.strictObject({
    primitive: z.literal("container"),
    region: RegionSchema,
    zIndex: BlockZIndexSchema,
    input: z.strictObject({
        blocks: z.array(CompositionBlockSchema).min(1).max(48),
        background: z.string().optional(),
        padding: z.number().nonnegative().optional(),
        gap: z.number().nonnegative().optional(),
    }),
}));
export const CompositionBlockSchema = z.lazy(() => z.union([RegisteredBlockSchema, ContainerBlockSchema]));
export const COMPOSITION_GRID_COLS = 12;
export const COMPOSITION_GRID_ROWS = 12;
export function resolveBlockRect(region, canvas) {
    // Pixel-coord region: values are absolute slide-space; canvas offset
    // and gap are NOT applied (callers asked for absolute placement on the
    // slide and own all spacing).
    if ("x" in region) {
        return {
            left: region.x,
            top: region.y,
            width: region.w,
            height: region.h,
        };
    }
    const colW = canvas.width / COMPOSITION_GRID_COLS;
    const rowH = canvas.height / COMPOSITION_GRID_ROWS;
    const gap = canvas.gap ?? 0;
    const halfGap = gap / 2;
    return {
        left: canvas.left + region.col * colW + halfGap,
        top: canvas.top + region.row * rowH + halfGap,
        width: Math.max(0, region.colSpan * colW - gap),
        height: Math.max(0, region.rowSpan * rowH - gap),
    };
}
export function buildCompositionBlocks(blocks, tokens, canvas) {
    const nodes = [];
    const nodeKeys = [];
    const overflows = {};
    const applyBlockZIndex = (node, zIndex) => {
        if (zIndex === undefined)
            return node;
        return { ...node, zIndex };
    };
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const rect = resolveBlockRect(block.region, canvas);
        if (block.primitive === "container") {
            // Recursive composition. The container's rect becomes a fresh
            // sub-canvas with its own 12×12 grid; nested grid-coord blocks
            // resolve relative to it. Pixel-coord nested blocks remain absolute.
            const input = block.input;
            const pad = input.padding ?? 0;
            const subCanvas = {
                left: rect.left + pad,
                top: rect.top + pad,
                width: Math.max(0, rect.width - pad * 2),
                height: Math.max(0, rect.height - pad * 2),
                gap: input.gap ?? canvas.gap,
            };
            if (input.background) {
                // Background fill draws first; nested blocks paint on top.
                nodes.push({
                    kind: "view",
                    shape: "rect",
                    rect,
                    fill: input.background,
                    ...(block.zIndex !== undefined ? { zIndex: block.zIndex } : {}),
                    decorative: true,
                });
                nodeKeys.push(`container_${i}`);
            }
            const nested = buildCompositionBlocks(input.blocks, tokens, subCanvas);
            nodes.push(...nested.nodes);
            nodeKeys.push(...nested.nodeKeys.map((key) => `container_${i}/${key}`));
            // Roll up nested overflow kinds with a deterministic key prefix so
            // the compiler still surfaces them. "container_0/<inner-key>" form.
            for (const [k, v] of Object.entries(nested.overflows)) {
                overflows[`container_${i}/${k}`] = v;
            }
            // The container itself doesn't have its own overflow signal — it's
            // a layout shell. Record "fit" as the parent's status; nested
            // overflows are surfaced under the prefixed keys above.
            overflows[`container_${i}`] = "fit";
            continue;
        }
        const entry = PRIMITIVE_REGISTRY[block.primitive];
        const key = `${block.primitive}_${i}`;
        const result = entry.fn(block.input, tokens, rect);
        nodes.push(...result.nodes.map((node) => applyBlockZIndex(node, block.zIndex)));
        nodeKeys.push(...result.nodes.map(() => key));
        overflows[key] = result.overflow.kind;
    }
    return { nodes, nodeKeys, overflows };
}
//# sourceMappingURL=composition.js.map