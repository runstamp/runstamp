import { z } from "zod";
import type { PresentationSpec } from "./index.js";
export declare const DeclarativeMetricSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
    delta: z.ZodOptional<z.ZodString>;
    trend: z.ZodOptional<z.ZodEnum<{
        up: "up";
        down: "down";
        flat: "flat";
        none: "none";
    }>>;
}, z.core.$strict>;
export declare const DeclarativeChartSeriesSchema: z.ZodObject<{
    name: z.ZodString;
    dataPoints: z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        value: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const DeclarativeChartSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        bar: "bar";
        line: "line";
        pie: "pie";
        area: "area";
        doughnut: "doughnut";
    }>;
    title: z.ZodOptional<z.ZodString>;
    series: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        dataPoints: z.ZodArray<z.ZodObject<{
            category: z.ZodString;
            value: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const DeclarativeLayoutSchema: z.ZodEnum<{
    title: "title";
    chart: "chart";
    timeline: "timeline";
    "kpi-row": "kpi-row";
    bullets: "bullets";
    comparison: "comparison";
}>;
export declare const DeclarativeSlideSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layout: z.ZodLiteral<"title">;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    eyebrow: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layout: z.ZodLiteral<"kpi-row">;
    title: z.ZodOptional<z.ZodString>;
    metrics: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        delta: z.ZodOptional<z.ZodString>;
        trend: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
            none: "none";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layout: z.ZodLiteral<"chart">;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    chart: z.ZodObject<{
        kind: z.ZodEnum<{
            bar: "bar";
            line: "line";
            pie: "pie";
            area: "area";
            doughnut: "doughnut";
        }>;
        title: z.ZodOptional<z.ZodString>;
        series: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            dataPoints: z.ZodArray<z.ZodObject<{
                category: z.ZodString;
                value: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layout: z.ZodLiteral<"bullets">;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    bullets: z.ZodArray<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layout: z.ZodLiteral<"comparison">;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    columns: z.ZodArray<z.ZodString>;
    rows: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        values: z.ZodArray<z.ZodString>;
        highlight: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    layout: z.ZodLiteral<"timeline">;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    events: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        date: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>], "layout">;
export declare const DeclarativeDocumentSchema: z.ZodObject<{
    version: z.ZodOptional<z.ZodLiteral<"1.0">>;
    deckId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    tokens: z.ZodOptional<z.ZodObject<{
        version: z.ZodDefault<z.ZodLiteral<"1.0">>;
        canvas: z.ZodOptional<z.ZodObject<{
            ratio: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                "16:9": "16:9";
                "4:3": "4:3";
            }>>>;
            margin: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            density: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            surface: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        }, z.core.$strict>>;
        palette: z.ZodOptional<z.ZodObject<{
            foreground: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            muted: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            faint: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            rule: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            accent: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            accentInverse: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            accentSecondary: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
        }, z.core.$strict>>;
        type: z.ZodOptional<z.ZodObject<{
            display: z.ZodOptional<z.ZodObject<{
                family: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                size: z.ZodOptional<z.ZodNumber>;
                letterSpacing: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                lineHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                italic: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                transform: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    upper: "upper";
                    lower: "lower";
                    title: "title";
                }>>>;
            }, z.core.$strict>>;
            title: z.ZodOptional<z.ZodObject<{
                family: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                size: z.ZodOptional<z.ZodNumber>;
                letterSpacing: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                lineHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                italic: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                transform: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    upper: "upper";
                    lower: "lower";
                    title: "title";
                }>>>;
            }, z.core.$strict>>;
            body: z.ZodOptional<z.ZodObject<{
                family: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                size: z.ZodOptional<z.ZodNumber>;
                letterSpacing: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                lineHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                italic: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                transform: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    upper: "upper";
                    lower: "lower";
                    title: "title";
                }>>>;
            }, z.core.$strict>>;
            caption: z.ZodOptional<z.ZodObject<{
                family: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                size: z.ZodOptional<z.ZodNumber>;
                letterSpacing: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                lineHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                italic: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                transform: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    upper: "upper";
                    lower: "lower";
                    title: "title";
                }>>>;
            }, z.core.$strict>>;
            eyebrow: z.ZodOptional<z.ZodObject<{
                family: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                size: z.ZodOptional<z.ZodNumber>;
                letterSpacing: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                lineHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                italic: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                transform: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    upper: "upper";
                    lower: "lower";
                    title: "title";
                }>>>;
            }, z.core.$strict>>;
            nav: z.ZodOptional<z.ZodObject<{
                family: z.ZodOptional<z.ZodString>;
                weight: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                size: z.ZodOptional<z.ZodNumber>;
                letterSpacing: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                lineHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
                italic: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                transform: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    upper: "upper";
                    lower: "lower";
                    title: "title";
                }>>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        rules: z.ZodOptional<z.ZodObject<{
            title: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            section: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            divider: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            edge: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        }, z.core.$strict>>;
        ornament: z.ZodOptional<z.ZodObject<{
            bullet: z.ZodOptional<z.ZodObject<{
                marker: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    filledDot: "filledDot";
                    openDot: "openDot";
                    enDash: "enDash";
                    square: "square";
                    chevron: "chevron";
                    autoNum: "autoNum";
                }>>>;
                scheme: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
                    arabicPeriod: "arabicPeriod";
                    arabicParenR: "arabicParenR";
                    romanUcPeriod: "romanUcPeriod";
                    romanLcPeriod: "romanLcPeriod";
                    alphaUcPeriod: "alphaUcPeriod";
                    alphaLcPeriod: "alphaLcPeriod";
                    alphaLcParenR: "alphaLcParenR";
                    alphaUcParenR: "alphaUcParenR";
                }>>>;
                color: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    faint: "faint";
                    accent: "accent";
                }>>>;
                sizeRatio: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                gap: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                indent: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                nestedMarker: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    filledDot: "filledDot";
                    openDot: "openDot";
                    enDash: "enDash";
                    square: "square";
                    chevron: "chevron";
                    autoNum: "autoNum";
                }>>>;
            }, z.core.$strict>>;
            stepMarker: z.ZodOptional<z.ZodObject<{
                style: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    circleNumeric: "circleNumeric";
                    serifCircled: "serifCircled";
                    plain: "plain";
                }>>>;
                fill: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    surface: "surface";
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                }>>>;
            }, z.core.$strict>>;
            pageNumber: z.ZodOptional<z.ZodObject<{
                style: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    none: "none";
                    plain: "plain";
                    circledAccent: "circledAccent";
                    boxedAccent: "boxedAccent";
                }>>>;
                prefix: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                height: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                fill: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    surface: "surface";
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                }>>>;
                type: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    caption: "caption";
                    eyebrow: "eyebrow";
                    nav: "nav";
                }>>>;
                align: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                    left: "left";
                    center: "center";
                    right: "right";
                }>>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                layout: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEnum<{
                    pageNumber: "pageNumber";
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    spacer: "spacer";
                }>>>>;
                height: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
                topRule: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                disclaimer: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                projectCode: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                watermark: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        photo: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            defaultBleed: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                none: "none";
                full: "full";
                half: "half";
                quarter: "quarter";
                inline: "inline";
            }>>>;
            scrim: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
                none: "none";
                light: "light";
                dark: "dark";
            }>>>;
            scrimOpacity: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        }, z.core.$strict>>;
        spacing: z.ZodOptional<z.ZodObject<{
            xs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            sm: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            md: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            lg: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            xl: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            xxl: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        }, z.core.$strict>>;
        embeddedFonts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            family: z.ZodString;
            src: z.ZodString;
            bold: z.ZodOptional<z.ZodBoolean>;
            italic: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    slides: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        layout: z.ZodLiteral<"title">;
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        eyebrow: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        layout: z.ZodLiteral<"kpi-row">;
        title: z.ZodOptional<z.ZodString>;
        metrics: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            delta: z.ZodOptional<z.ZodString>;
            trend: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
                none: "none";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        layout: z.ZodLiteral<"chart">;
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        chart: z.ZodObject<{
            kind: z.ZodEnum<{
                bar: "bar";
                line: "line";
                pie: "pie";
                area: "area";
                doughnut: "doughnut";
            }>;
            title: z.ZodOptional<z.ZodString>;
            series: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                dataPoints: z.ZodArray<z.ZodObject<{
                    category: z.ZodString;
                    value: z.ZodNumber;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        layout: z.ZodLiteral<"bullets">;
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        bullets: z.ZodArray<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        layout: z.ZodLiteral<"comparison">;
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            highlight: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        layout: z.ZodLiteral<"timeline">;
        title: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        events: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            date: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "layout">>;
}, z.core.$strict>;
export type DeclarativeLayout = z.infer<typeof DeclarativeLayoutSchema>;
export type DeclarativeMetric = z.infer<typeof DeclarativeMetricSchema>;
export type DeclarativeChartSeries = z.infer<typeof DeclarativeChartSeriesSchema>;
export type DeclarativeChart = z.infer<typeof DeclarativeChartSchema>;
export type DeclarativeSlide = z.infer<typeof DeclarativeSlideSchema>;
export type DeclarativeDocument = z.infer<typeof DeclarativeDocumentSchema>;
export interface ValidationIssue {
    /** Exact schema path segments. Numeric array indexes remain numeric. */
    path: Array<string | number>;
    code: string;
    severity: "error" | "warning";
    fix: string;
}
export interface ValidationResult {
    ok: boolean;
    issues: ValidationIssue[];
}
export declare class DeclarativeValidationError extends Error {
    readonly issues: ValidationIssue[];
    constructor(issues: ValidationIssue[]);
}
/** Normalize the coordinate-free authoring facade to the existing protocol. */
export declare function toPresentationSpec(doc: DeclarativeDocument): PresentationSpec;
/**
 * Validate declarative input without rendering. Schema errors keep their exact
 * paths. Engine-specific layout preflight belongs to the consuming renderer.
 */
export declare function validate(input: unknown): ValidationResult;
//# sourceMappingURL=declarative.d.ts.map