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
import { type Primitive, type ResolvedTokens, type Rect } from "@runstamp/pptx-primitives";
import type { PrimitiveNode } from "@runstamp/pptx-primitives";
declare const PRIMITIVE_REGISTRY: {
    readonly titleBlock: {
        readonly schema: z.ZodObject<{
            title: z.ZodString;
            eyebrow: z.ZodOptional<z.ZodString>;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").TitleBlockInput>;
    };
    readonly bulletList: {
        readonly schema: z.ZodObject<{
            items: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                level: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            resume: z.ZodOptional<z.ZodObject<{
                startIndex: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").BulletListInput>;
    };
    readonly sectionRibbon: {
        readonly schema: z.ZodObject<{
            label: z.ZodString;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").SectionRibbonInput>;
    };
    readonly sectionTag: {
        readonly schema: z.ZodObject<{
            label: z.ZodString;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
            }>>;
            transform: z.ZodOptional<z.ZodEnum<{
                none: "none";
                upper: "upper";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").SectionTagInput>;
    };
    readonly sourceLine: {
        readonly schema: z.ZodObject<{
            content: z.ZodString;
            kind: z.ZodOptional<z.ZodEnum<{
                source: "source";
                note: "note";
                plain: "plain";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").SourceLineInput>;
    };
    readonly textBlock: {
        readonly schema: z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            border: z.ZodOptional<z.ZodObject<{
                color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    faint: "faint";
                    rule: "rule";
                }>, z.ZodString]>>;
                width: z.ZodOptional<z.ZodNumber>;
                style: z.ZodOptional<z.ZodEnum<{
                    solid: "solid";
                    dashed: "dashed";
                    dotted: "dotted";
                }>>;
            }, z.core.$strict>>;
            insets: z.ZodOptional<z.ZodObject<{
                top: z.ZodOptional<z.ZodNumber>;
                right: z.ZodOptional<z.ZodNumber>;
                bottom: z.ZodOptional<z.ZodNumber>;
                left: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentInverse: "accentInverse";
                accentSecondary: "accentSecondary";
            }>, z.ZodString]>>;
            italic: z.ZodOptional<z.ZodBoolean>;
            weight: z.ZodOptional<z.ZodNumber>;
            size: z.ZodOptional<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            rotation: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").TextBlockInput>;
    };
    readonly infoCard: {
        readonly schema: z.ZodObject<{
            sideLabel: z.ZodOptional<z.ZodObject<{
                text: z.ZodString;
                position: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    top: "top";
                }>>;
                fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                    none: "none";
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    faint: "faint";
                    accentSecondary: "accentSecondary";
                    surface: "surface";
                }>, z.ZodString]>>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            body: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                level: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>]>;
                style: z.ZodOptional<z.ZodEnum<{
                    plain: "plain";
                    "italic-quote": "italic-quote";
                }>>;
            }, z.core.$strict>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            border: z.ZodOptional<z.ZodObject<{
                color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    faint: "faint";
                    rule: "rule";
                }>, z.ZodString]>>;
                width: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>>;
            padding: z.ZodOptional<z.ZodNumber>;
            gap: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").InfoCardInput>;
    };
    readonly matrixTable: {
        readonly schema: z.ZodObject<{
            columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
            columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                accentSecondary: "accentSecondary";
            }>, z.ZodNull]>>>;
            rows: z.ZodArray<z.ZodObject<{
                label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                    runs: z.ZodArray<z.ZodObject<{
                        text: z.ZodString;
                        bold: z.ZodOptional<z.ZodBoolean>;
                        italic: z.ZodOptional<z.ZodBoolean>;
                        color: z.ZodOptional<z.ZodString>;
                        fontSize: z.ZodOptional<z.ZodNumber>;
                        fontFamily: z.ZodOptional<z.ZodString>;
                        underline: z.ZodOptional<z.ZodBoolean>;
                    }, z.core.$strict>>;
                    align: z.ZodOptional<z.ZodEnum<{
                        left: "left";
                        right: "right";
                        center: "center";
                        justify: "justify";
                    }>>;
                    level: z.ZodOptional<z.ZodNumber>;
                    indent: z.ZodOptional<z.ZodNumber>;
                    marginLeft: z.ZodOptional<z.ZodNumber>;
                    hangingIndent: z.ZodOptional<z.ZodNumber>;
                    spaceBefore: z.ZodOptional<z.ZodNumber>;
                    spaceAfter: z.ZodOptional<z.ZodNumber>;
                    bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                        type: z.ZodOptional<z.ZodLiteral<"char">>;
                        char: z.ZodString;
                        color: z.ZodOptional<z.ZodString>;
                        size: z.ZodOptional<z.ZodNumber>;
                        fontFamily: z.ZodOptional<z.ZodString>;
                    }, z.core.$strict>, z.ZodObject<{
                        type: z.ZodLiteral<"autoNum">;
                        scheme: z.ZodEnum<{
                            arabicPeriod: "arabicPeriod";
                            arabicParenR: "arabicParenR";
                            romanUcPeriod: "romanUcPeriod";
                            romanLcPeriod: "romanLcPeriod";
                            alphaUcPeriod: "alphaUcPeriod";
                            alphaLcPeriod: "alphaLcPeriod";
                            alphaLcParenR: "alphaLcParenR";
                            alphaUcParenR: "alphaUcParenR";
                        }>;
                        startAt: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>, z.ZodObject<{
                        type: z.ZodLiteral<"none">;
                    }, z.core.$strict>]>>;
                }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>]>;
                cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                    runs: z.ZodArray<z.ZodObject<{
                        text: z.ZodString;
                        bold: z.ZodOptional<z.ZodBoolean>;
                        italic: z.ZodOptional<z.ZodBoolean>;
                        color: z.ZodOptional<z.ZodString>;
                        fontSize: z.ZodOptional<z.ZodNumber>;
                        fontFamily: z.ZodOptional<z.ZodString>;
                        underline: z.ZodOptional<z.ZodBoolean>;
                    }, z.core.$strict>>;
                    align: z.ZodOptional<z.ZodEnum<{
                        left: "left";
                        right: "right";
                        center: "center";
                        justify: "justify";
                    }>>;
                    level: z.ZodOptional<z.ZodNumber>;
                    indent: z.ZodOptional<z.ZodNumber>;
                    marginLeft: z.ZodOptional<z.ZodNumber>;
                    hangingIndent: z.ZodOptional<z.ZodNumber>;
                    spaceBefore: z.ZodOptional<z.ZodNumber>;
                    spaceAfter: z.ZodOptional<z.ZodNumber>;
                    bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                        type: z.ZodOptional<z.ZodLiteral<"char">>;
                        char: z.ZodString;
                        color: z.ZodOptional<z.ZodString>;
                        size: z.ZodOptional<z.ZodNumber>;
                        fontFamily: z.ZodOptional<z.ZodString>;
                    }, z.core.$strict>, z.ZodObject<{
                        type: z.ZodLiteral<"autoNum">;
                        scheme: z.ZodEnum<{
                            arabicPeriod: "arabicPeriod";
                            arabicParenR: "arabicParenR";
                            romanUcPeriod: "romanUcPeriod";
                            romanLcPeriod: "romanLcPeriod";
                            alphaUcPeriod: "alphaUcPeriod";
                            alphaLcPeriod: "alphaLcPeriod";
                            alphaLcParenR: "alphaLcParenR";
                            alphaUcParenR: "alphaUcParenR";
                        }>;
                        startAt: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strict>, z.ZodObject<{
                        type: z.ZodLiteral<"none">;
                    }, z.core.$strict>]>>;
                }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>]>>;
                accent: z.ZodOptional<z.ZodBoolean>;
                labelFill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    faint: "faint";
                }>>;
            }, z.core.$strict>>;
            rowLabelWidth: z.ZodOptional<z.ZodNumber>;
            labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
            rowLabelStyle: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                filled: "filled";
            }>>;
            rowLabelRotation: z.ZodOptional<z.ZodNumber>;
            minRowHeight: z.ZodOptional<z.ZodNumber>;
            rowHeight: z.ZodOptional<z.ZodNumber>;
            distributeRows: z.ZodOptional<z.ZodBoolean>;
            /**
             * Per-data-column relative widths. Length must equal the number of
             * data columns (excluding the row-label column). Values are relative
             * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
             * When supplied, `labelColumnWidthRatio`-driven distribution is
             * overridden. Use this when one column has long values that would
             * otherwise force every other cell to wrap.
             */
            colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
            wrapPolicy: z.ZodOptional<z.ZodEnum<{
                wrap: "wrap";
                ellipsis: "ellipsis";
                shrink: "shrink";
            }>>;
            resume: z.ZodOptional<z.ZodObject<{
                startRowIndex: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").MatrixTableInput>;
    };
    readonly comparisonBand: {
        readonly schema: z.ZodObject<{
            columns: z.ZodArray<z.ZodString>;
            rows: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                values: z.ZodArray<z.ZodString>;
                accent: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            resume: z.ZodOptional<z.ZodObject<{
                startRowIndex: z.ZodNumber;
            }, z.core.$strict>>;
            labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").ComparisonBandInput>;
    };
    readonly stepTimeline: {
        readonly schema: z.ZodObject<{
            steps: z.ZodArray<z.ZodObject<{
                tag: z.ZodString;
                label: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").StepTimelineInput>;
    };
    readonly waterfallBars: {
        readonly schema: z.ZodObject<{
            steps: z.ZodArray<z.ZodObject<{
                kind: z.ZodEnum<{
                    up: "up";
                    down: "down";
                    start: "start";
                    end: "end";
                }>;
                label: z.ZodString;
                value: z.ZodNumber;
                valueLabel: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            barWidthRatio: z.ZodOptional<z.ZodNumber>;
            minStepWidth: z.ZodOptional<z.ZodNumber>;
            showConnectors: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").WaterfallBarsInput>;
    };
    readonly orgTree: {
        readonly schema: z.ZodObject<{
            root: z.ZodObject<{
                title: z.ZodString;
                subtitle: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>;
            children: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                subtitle: z.ZodOptional<z.ZodString>;
                accent: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            rootHeightRatio: z.ZodOptional<z.ZodNumber>;
            minChildWidth: z.ZodOptional<z.ZodNumber>;
            childGap: z.ZodOptional<z.ZodNumber>;
            rootFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                surface: "surface";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").OrgTreeInput>;
    };
    readonly tombstoneStack: {
        readonly schema: z.ZodObject<{
            tiles: z.ZodArray<z.ZodObject<{
                logo: z.ZodOptional<z.ZodString>;
                title: z.ZodString;
                body: z.ZodOptional<z.ZodString>;
                accent: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            columns: z.ZodOptional<z.ZodNumber>;
            rowGap: z.ZodOptional<z.ZodNumber>;
            columnGap: z.ZodOptional<z.ZodNumber>;
            logoHeight: z.ZodOptional<z.ZodNumber>;
            resume: z.ZodOptional<z.ZodObject<{
                startTileIndex: z.ZodNumber;
            }, z.core.$strict>>;
            compact: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").TombstoneStackInput>;
    };
    readonly tocTiles: {
        readonly schema: z.ZodObject<{
            tiles: z.ZodArray<z.ZodObject<{
                marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
                title: z.ZodString;
                body: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            columns: z.ZodOptional<z.ZodNumber>;
            columnGap: z.ZodOptional<z.ZodNumber>;
            markerSizePt: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").TocTilesInput>;
    };
    readonly metricStack: {
        readonly schema: z.ZodObject<{
            rows: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodString;
                delta: z.ZodOptional<z.ZodString>;
                trend: z.ZodOptional<z.ZodEnum<{
                    up: "up";
                    down: "down";
                    flat: "flat";
                }>>;
            }, z.core.$strict>>;
            resume: z.ZodOptional<z.ZodObject<{
                startIndex: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").MetricStackInput>;
    };
    readonly kpiHero: {
        readonly schema: z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
            support: z.ZodOptional<z.ZodString>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                center: "center";
                top: "top";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").KpiHeroInput>;
    };
    readonly chartBlock: {
        readonly schema: z.ZodObject<{
            chartData: z.ZodUnknown;
            altText: z.ZodOptional<z.ZodString>;
            preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").ChartBlockInput>;
    };
    readonly quadrantMap: {
        readonly schema: z.ZodObject<{
            xAxisLabel: z.ZodOptional<z.ZodObject<{
                low: z.ZodString;
                high: z.ZodString;
            }, z.core.$strict>>;
            yAxisLabel: z.ZodOptional<z.ZodObject<{
                low: z.ZodString;
                high: z.ZodString;
            }, z.core.$strict>>;
            quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
            points: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                x: z.ZodNumber;
                y: z.ZodNumber;
                emphasis: z.ZodOptional<z.ZodEnum<{
                    primary: "primary";
                    secondary: "secondary";
                }>>;
            }, z.core.$strict>>>;
            dotRadius: z.ZodOptional<z.ZodNumber>;
            axisLabelReserve: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").QuadrantMapInput>;
    };
    readonly imageBleed: {
        readonly schema: z.ZodObject<{
            src: z.ZodOptional<z.ZodString>;
            alt: z.ZodOptional<z.ZodString>;
            crop: z.ZodOptional<z.ZodObject<{
                left: z.ZodNumber;
                top: z.ZodNumber;
                right: z.ZodNumber;
                bottom: z.ZodNumber;
            }, z.core.$strict>>;
            bleed: z.ZodOptional<z.ZodEnum<{
                none: "none";
                full: "full";
                half: "half";
                quarter: "quarter";
                inline: "inline";
            }>>;
            fallbackText: z.ZodOptional<z.ZodString>;
            overlay: z.ZodOptional<z.ZodObject<{
                text: z.ZodString;
                role: z.ZodOptional<z.ZodEnum<{
                    title: "title";
                    eyebrow: "eyebrow";
                    display: "display";
                    body: "body";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
                verticalAlign: z.ZodOptional<z.ZodEnum<{
                    top: "top";
                    bottom: "bottom";
                    middle: "middle";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").ImageBleedInput>;
    };
    readonly harveyBall: {
        readonly schema: z.ZodObject<{
            filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").HarveyBallInput>;
    };
    readonly calloutBox: {
        readonly schema: z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            fill: z.ZodOptional<z.ZodEnum<{
                muted: "muted";
                accent: "accent";
                faint: "faint";
                surface: "surface";
            }>>;
            borderColor: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
            borderWidth: z.ZodOptional<z.ZodNumber>;
            role: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                body: "body";
                caption: "caption";
            }>>;
            shape: z.ZodOptional<z.ZodEnum<{
                rect: "rect";
                roundRect: "roundRect";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").CalloutBoxInput>;
    };
    readonly chevronArrow: {
        readonly schema: z.ZodObject<{
            direction: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
            }>>;
            label: z.ZodOptional<z.ZodString>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").ChevronArrowInput>;
    };
    readonly numberedChip: {
        readonly schema: z.ZodObject<{
            index: z.ZodNumber;
            shape: z.ZodOptional<z.ZodEnum<{
                rect: "rect";
                roundRect: "roundRect";
                ellipse: "ellipse";
            }>>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
            }>>;
            prefix: z.ZodOptional<z.ZodString>;
            suffix: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            anchor: z.ZodOptional<z.ZodEnum<{
                center: "center";
                topLeft: "topLeft";
                topRight: "topRight";
                bottomLeft: "bottomLeft";
                bottomRight: "bottomRight";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").NumberedChipInput>;
    };
    readonly diagonalStamp: {
        readonly schema: z.ZodObject<{
            text: z.ZodString;
            rotation: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").DiagonalStampInput>;
    };
    readonly legendTable: {
        readonly schema: z.ZodObject<{
            items: z.ZodArray<z.ZodObject<{
                color: z.ZodString;
                label: z.ZodString;
                value: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            direction: z.ZodOptional<z.ZodEnum<{
                vertical: "vertical";
                horizontal: "horizontal";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").LegendTableInput>;
    };
    readonly bannerBand: {
        readonly schema: z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
            }>>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                accentSecondary: "accentSecondary";
            }>>;
            parallelogram: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").BannerBandInput>;
    };
    readonly connectorLine: {
        readonly schema: z.ZodObject<{
            kind: z.ZodOptional<z.ZodEnum<{
                straight: "straight";
                elbow: "elbow";
                curved: "curved";
            }>>;
            start: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            end: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, z.core.$strict>;
            width: z.ZodOptional<z.ZodNumber>;
            color: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>>;
            dashStyle: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
                dotDash: "dotDash";
            }>>;
            arrowStart: z.ZodOptional<z.ZodBoolean>;
            arrowEnd: z.ZodOptional<z.ZodBoolean>;
            bounds: z.ZodOptional<z.ZodEnum<{
                endpoints: "endpoints";
                region: "region";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").ConnectorLineInput>;
    };
    readonly groupBorder: {
        readonly schema: z.ZodObject<{
            label: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").GroupBorderInput>;
    };
    readonly pageStamp: {
        readonly schema: z.ZodObject<{
            src: z.ZodOptional<z.ZodString>;
            alt: z.ZodOptional<z.ZodString>;
            fallbackText: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        readonly fn: Primitive<import("@runstamp/pptx-primitives").PageStampInput>;
    };
};
export type CompositionPrimitiveName = keyof typeof PRIMITIVE_REGISTRY;
export declare const COMPOSITION_PRIMITIVE_NAMES: CompositionPrimitiveName[];
declare const RegionGridSchema: z.ZodObject<{
    col: z.ZodNumber;
    row: z.ZodNumber;
    colSpan: z.ZodNumber;
    rowSpan: z.ZodNumber;
}, z.core.$strict>;
/** Pixel-coordinate region. Values are absolute slide-space pixels at the
 *  default 960×540 canvas. Use for chart callout pointers, leader lines,
 *  hand-positioned annotations — anything where the 12×12 grid coarsens
 *  too much. The compiler does not clamp; out-of-canvas placements emit
 *  layout-safety violations the same as any out-of-bounds primitive. */
declare const RegionPixelSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, z.core.$strict>;
declare const RegionSchema: z.ZodUnion<readonly [z.ZodObject<{
    col: z.ZodNumber;
    row: z.ZodNumber;
    colSpan: z.ZodNumber;
    rowSpan: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, z.core.$strict>]>;
export type CompositionRegion = z.infer<typeof RegionSchema>;
export type CompositionRegionGrid = z.infer<typeof RegionGridSchema>;
export type CompositionRegionPixel = z.infer<typeof RegionPixelSchema>;
/** Container input. The container primitive is resolved by the dispatcher
 *  rather than registered as a function: its rect becomes a 12×12 sub-grid
 *  (or pixel canvas) for nested blocks, optionally with a background fill
 *  + padding inset. Recursive nesting is allowed; the dispatcher recurses
 *  into nested containers. */
export interface ContainerInput {
    blocks: CompositionBlock[];
    /** Hex fill drawn behind the container before children render. Useful
     *  for tinted callout boxes that hold rich content. */
    background?: string;
    /** Padding (px) carved off the container's rect before nested blocks
     *  resolve. Lets callers mimic CSS-style breathing room. */
    padding?: number;
    /** Gutter (px) between adjacent grid cells inside this container. See
     *  `CompositionCanvas.gap`. When unset, inherits from the parent
     *  canvas. */
    gap?: number;
}
/** The discriminated union over registered primitives — does not include
 *  the recursive `container` variant. We wrap it in a plain union below
 *  to add `container`, since `discriminatedUnion` does not accept lazy
 *  variants and the container's input schema needs `z.lazy()` to break
 *  the self-reference cycle. */
declare const RegisteredBlockSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    primitive: z.ZodLiteral<"titleBlock">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"bulletList">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"sectionRibbon">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"sectionTag">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"sourceLine">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"textBlock">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"infoCard">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"matrixTable">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"comparisonBand">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"stepTimeline">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"waterfallBars">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"orgTree">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"tombstoneStack">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"tocTiles">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"metricStack">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"kpiHero">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"chartBlock">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"quadrantMap">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"imageBleed">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"harveyBall">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"calloutBox">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"chevronArrow">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"numberedChip">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"diagonalStamp">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"legendTable">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"bannerBand">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"connectorLine">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"groupBorder">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    primitive: z.ZodLiteral<"pageStamp">;
    region: z.ZodUnion<readonly [z.ZodObject<{
        col: z.ZodNumber;
        row: z.ZodNumber;
        colSpan: z.ZodNumber;
        rowSpan: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strict>]>;
    zIndex: z.ZodOptional<z.ZodNumber>;
    input: z.ZodObject<{
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        transform: z.ZodOptional<z.ZodEnum<{
            none: "none";
            upper: "upper";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<{
            source: "source";
            note: "note";
            plain: "plain";
        }>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            runs: z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
                justify: "justify";
            }>>;
            level: z.ZodOptional<z.ZodNumber>;
            indent: z.ZodOptional<z.ZodNumber>;
            marginLeft: z.ZodOptional<z.ZodNumber>;
            hangingIndent: z.ZodOptional<z.ZodNumber>;
            spaceBefore: z.ZodOptional<z.ZodNumber>;
            spaceAfter: z.ZodOptional<z.ZodNumber>;
            bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"char">>;
                char: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                size: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"autoNum">;
                scheme: z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>;
                startAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strict>, z.ZodObject<{
                type: z.ZodLiteral<"none">;
            }, z.core.$strict>]>>;
        }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
            caption: "caption";
        }>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            style: z.ZodOptional<z.ZodEnum<{
                solid: "solid";
                dashed: "dashed";
                dotted: "dotted";
            }>>;
        }, z.core.$strict>>;
        insets: z.ZodOptional<z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        align: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
            center: "center";
        }>>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            top: "top";
            bottom: "bottom";
            middle: "middle";
        }>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentInverse: "accentInverse";
            accentSecondary: "accentSecondary";
        }>, z.ZodString]>>;
        italic: z.ZodOptional<z.ZodBoolean>;
        weight: z.ZodOptional<z.ZodNumber>;
        size: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        rotation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        sideLabel: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            position: z.ZodOptional<z.ZodEnum<{
                left: "left";
                top: "top";
            }>>;
            fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                none: "none";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                accentSecondary: "accentSecondary";
                surface: "surface";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        lead: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>>;
        body: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            level: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            text: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            style: z.ZodOptional<z.ZodEnum<{
                plain: "plain";
                "italic-quote": "italic-quote";
            }>>;
        }, z.core.$strict>>;
        fill: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            none: "none";
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            accentSecondary: "accentSecondary";
            surface: "surface";
        }>, z.ZodString]>>;
        border: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
                rule: "rule";
            }>, z.ZodString]>>;
            width: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        padding: z.ZodOptional<z.ZodNumber>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        columnHeaders: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
        columnHeaderFills: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>, z.ZodNull]>>>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>;
            cells: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
                runs: z.ZodArray<z.ZodObject<{
                    text: z.ZodString;
                    bold: z.ZodOptional<z.ZodBoolean>;
                    italic: z.ZodOptional<z.ZodBoolean>;
                    color: z.ZodOptional<z.ZodString>;
                    fontSize: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                    underline: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strict>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                    justify: "justify";
                }>>;
                level: z.ZodOptional<z.ZodNumber>;
                indent: z.ZodOptional<z.ZodNumber>;
                marginLeft: z.ZodOptional<z.ZodNumber>;
                hangingIndent: z.ZodOptional<z.ZodNumber>;
                spaceBefore: z.ZodOptional<z.ZodNumber>;
                spaceAfter: z.ZodOptional<z.ZodNumber>;
                bullet: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"char">>;
                    char: z.ZodString;
                    color: z.ZodOptional<z.ZodString>;
                    size: z.ZodOptional<z.ZodNumber>;
                    fontFamily: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"autoNum">;
                    scheme: z.ZodEnum<{
                        arabicPeriod: "arabicPeriod";
                        arabicParenR: "arabicParenR";
                        romanUcPeriod: "romanUcPeriod";
                        romanLcPeriod: "romanLcPeriod";
                        alphaUcPeriod: "alphaUcPeriod";
                        alphaLcPeriod: "alphaLcPeriod";
                        alphaLcParenR: "alphaLcParenR";
                        alphaUcParenR: "alphaUcParenR";
                    }>;
                    startAt: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strict>, z.ZodObject<{
                    type: z.ZodLiteral<"none">;
                }, z.core.$strict>]>>;
            }, z.core.$strict>>, z.ZodArray<z.ZodObject<{
                text: z.ZodString;
                bold: z.ZodOptional<z.ZodBoolean>;
                italic: z.ZodOptional<z.ZodBoolean>;
                color: z.ZodOptional<z.ZodString>;
                fontSize: z.ZodOptional<z.ZodNumber>;
                fontFamily: z.ZodOptional<z.ZodString>;
                underline: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strict>>]>>;
            accent: z.ZodOptional<z.ZodBoolean>;
            labelFill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                faint: "faint";
            }>>;
        }, z.core.$strict>>;
        rowLabelWidth: z.ZodOptional<z.ZodNumber>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
        rowLabelStyle: z.ZodOptional<z.ZodEnum<{
            plain: "plain";
            filled: "filled";
        }>>;
        rowLabelRotation: z.ZodOptional<z.ZodNumber>;
        minRowHeight: z.ZodOptional<z.ZodNumber>;
        rowHeight: z.ZodOptional<z.ZodNumber>;
        distributeRows: z.ZodOptional<z.ZodBoolean>;
        /**
         * Per-data-column relative widths. Length must equal the number of
         * data columns (excluding the row-label column). Values are relative
         * weights — `[2, 1, 1]` allocates 50%/25%/25% of the data area.
         * When supplied, `labelColumnWidthRatio`-driven distribution is
         * overridden. Use this when one column has long values that would
         * otherwise force every other cell to wrap.
         */
        colW: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
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
        wrapPolicy: z.ZodOptional<z.ZodEnum<{
            wrap: "wrap";
            ellipsis: "ellipsis";
            shrink: "shrink";
        }>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startRowIndex: z.ZodNumber;
        }, z.core.$strict>>;
        labelColumnWidthRatio: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            tag: z.ZodString;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        steps: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                up: "up";
                down: "down";
                start: "start";
                end: "end";
            }>;
            label: z.ZodString;
            value: z.ZodNumber;
            valueLabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        barWidthRatio: z.ZodOptional<z.ZodNumber>;
        minStepWidth: z.ZodOptional<z.ZodNumber>;
        showConnectors: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        root: z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        children: z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        rootHeightRatio: z.ZodOptional<z.ZodNumber>;
        minChildWidth: z.ZodOptional<z.ZodNumber>;
        childGap: z.ZodOptional<z.ZodNumber>;
        rootFill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            surface: "surface";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            logo: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            accent: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        rowGap: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        logoHeight: z.ZodOptional<z.ZodNumber>;
        resume: z.ZodOptional<z.ZodObject<{
            startTileIndex: z.ZodNumber;
        }, z.core.$strict>>;
        compact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        tiles: z.ZodArray<z.ZodObject<{
            marker: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        columns: z.ZodOptional<z.ZodNumber>;
        columnGap: z.ZodOptional<z.ZodNumber>;
        markerSizePt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
            }>>;
        }, z.core.$strict>>;
        resume: z.ZodOptional<z.ZodObject<{
            startIndex: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
        }>>;
        support: z.ZodOptional<z.ZodString>;
        verticalAlign: z.ZodOptional<z.ZodEnum<{
            center: "center";
            top: "top";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        chartData: z.ZodUnknown;
        altText: z.ZodOptional<z.ZodString>;
        preserveCallerStyling: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        crop: z.ZodOptional<z.ZodObject<{
            left: z.ZodNumber;
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
        }, z.core.$strict>>;
        bleed: z.ZodOptional<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        fallbackText: z.ZodOptional<z.ZodString>;
        overlay: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            role: z.ZodOptional<z.ZodEnum<{
                title: "title";
                eyebrow: "eyebrow";
                display: "display";
                body: "body";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
            verticalAlign: z.ZodOptional<z.ZodEnum<{
                top: "top";
                bottom: "bottom";
                middle: "middle";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict> | z.ZodObject<{
        xAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        yAxisLabel: z.ZodOptional<z.ZodObject<{
            low: z.ZodString;
            high: z.ZodString;
        }, z.core.$strict>>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        points: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodOptional<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strict>>>;
        dotRadius: z.ZodOptional<z.ZodNumber>;
        axisLabelReserve: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict> | z.ZodObject<{
        filled: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    }, z.core.$strict> | z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
            color: z.ZodOptional<z.ZodString>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            underline: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>]>;
        fill: z.ZodOptional<z.ZodEnum<{
            muted: "muted";
            accent: "accent";
            faint: "faint";
            surface: "surface";
        }>>;
        borderColor: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        role: z.ZodOptional<z.ZodEnum<{
            eyebrow: "eyebrow";
            body: "body";
            caption: "caption";
        }>>;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        direction: z.ZodOptional<z.ZodEnum<{
            left: "left";
            right: "right";
        }>>;
        label: z.ZodOptional<z.ZodString>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        index: z.ZodNumber;
        shape: z.ZodOptional<z.ZodEnum<{
            rect: "rect";
            roundRect: "roundRect";
            ellipse: "ellipse";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
        }>>;
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        anchor: z.ZodOptional<z.ZodEnum<{
            center: "center";
            topLeft: "topLeft";
            topRight: "topRight";
            bottomLeft: "bottomLeft";
            bottomRight: "bottomRight";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        rotation: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        items: z.ZodArray<z.ZodObject<{
            color: z.ZodString;
            label: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        direction: z.ZodOptional<z.ZodEnum<{
            vertical: "vertical";
            horizontal: "horizontal";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        text: z.ZodString;
        role: z.ZodOptional<z.ZodEnum<{
            title: "title";
            eyebrow: "eyebrow";
            display: "display";
            body: "body";
        }>>;
        fill: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            accentSecondary: "accentSecondary";
        }>>;
        parallelogram: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict> | z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<{
            straight: "straight";
            elbow: "elbow";
            curved: "curved";
        }>>;
        start: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        end: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strict>;
        width: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
            rule: "rule";
        }>>;
        dashStyle: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
            dotDash: "dotDash";
        }>>;
        arrowStart: z.ZodOptional<z.ZodBoolean>;
        arrowEnd: z.ZodOptional<z.ZodBoolean>;
        bounds: z.ZodOptional<z.ZodEnum<{
            endpoints: "endpoints";
            region: "region";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            muted: "muted";
            accent: "accent";
            faint: "faint";
        }>>;
        width: z.ZodOptional<z.ZodNumber>;
        style: z.ZodOptional<z.ZodEnum<{
            solid: "solid";
            dashed: "dashed";
            dotted: "dotted";
        }>>;
    }, z.core.$strict> | z.ZodObject<{
        src: z.ZodOptional<z.ZodString>;
        alt: z.ZodOptional<z.ZodString>;
        fallbackText: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>], "primitive">;
/** Block type for the recursive container variant. Carries its own input
 *  shape — the dispatcher recognises `primitive === "container"` and
 *  recurses into `input.blocks` instead of looking up a primitive
 *  function in the registry. */
export interface ContainerBlock {
    primitive: "container";
    region: CompositionRegion;
    zIndex?: number;
    input: ContainerInput;
}
/** Type for a composition block. Either a registered primitive variant
 *  (TS narrows by the `primitive` literal — keeps the @ts-expect-error
 *  test guarantees intact) or the recursive container variant. */
export type CompositionBlock = z.infer<typeof RegisteredBlockSchema> | ContainerBlock;
export declare const CompositionBlockSchema: z.ZodType<CompositionBlock>;
export interface CompositionCanvas {
    /** Usable canvas region (slide minus margins and footer reserve). */
    left: number;
    top: number;
    width: number;
    height: number;
    /** Gutter (px) between adjacent grid cells. Each grid cell is inset by
     *  `gap/2` on every side, so two adjacent cells leave a full `gap` of
     *  white space between them. Pixel-coord regions are not affected.
     *  Defaults to 0 (back-compat: cells touch edge-to-edge). */
    gap?: number;
}
export declare const COMPOSITION_GRID_COLS = 12;
export declare const COMPOSITION_GRID_ROWS = 12;
export declare function resolveBlockRect(region: CompositionRegion, canvas: CompositionCanvas): Rect;
export interface CompositionBuildResult {
    nodes: PrimitiveNode[];
    /** Parallel to `nodes`: maps each emitted primitive node to its caller
     *  composition block key, e.g. `textBlock_3`. Multi-node primitives repeat
     *  the same key for every emitted node. */
    nodeKeys: string[];
    /** Per-block overflow status, keyed by `${primitive}_${index}`. */
    overflows: Record<string, string>;
}
export declare function buildCompositionBlocks(blocks: CompositionBlock[], tokens: ResolvedTokens, canvas: CompositionCanvas): CompositionBuildResult;
export {};
//# sourceMappingURL=composition.d.ts.map