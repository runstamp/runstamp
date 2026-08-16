import { z } from "zod";
export * from "./accessibility.js";
export * from "./extension-v1.js";
export * from "./extension-runtime.js";
export * from "./operation-projection.js";
export { COMPOSITION_PRIMITIVE_NAMES, CompositionBlockSchema, buildCompositionBlocks, type CompositionBlock, type CompositionCanvas, type CompositionPrimitiveName, type CompositionRegion, } from "./composition.js";
export { MIN_REGION_STATIC, MIN_REGION_VARIABLE, minRegionFor, remediationFor, type RegionSize, } from "./minRegion.js";
export declare const ProtocolVersionSchema: z.ZodLiteral<"2.0">;
export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;
export declare const LayoutFamilySchema: z.ZodEnum<{
    editorial: "editorial";
    board: "board";
    product: "product";
    immersive: "immersive";
}>;
export type LayoutFamily = z.infer<typeof LayoutFamilySchema>;
export declare const BrandRefSchema: z.ZodObject<{
    brandPackId: z.ZodOptional<z.ZodString>;
    brandPackVersionId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BrandRef = z.infer<typeof BrandRefSchema>;
export declare const ProtocolLineageSchema: z.ZodObject<{
    sourceType: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
    workflowId: z.ZodOptional<z.ZodString>;
    workflowRunId: z.ZodOptional<z.ZodString>;
    releaseId: z.ZodOptional<z.ZodString>;
    labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export type ProtocolLineage = z.infer<typeof ProtocolLineageSchema>;
export declare const ProtocolBindingSchema: z.ZodObject<{
    bindingKey: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    path: z.ZodString;
    targetPath: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    transform: z.ZodOptional<z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<{
            string: "string";
            number: "number";
            boolean: "boolean";
            identity: "identity";
            json: "json";
        }>>;
        fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ProtocolBinding = z.infer<typeof ProtocolBindingSchema>;
export declare const ProtocolKpiSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
    trend: z.ZodDefault<z.ZodEnum<{
        up: "up";
        down: "down";
        flat: "flat";
        none: "none";
    }>>;
    sublabel: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ComparisonRowSchema: z.ZodObject<{
    label: z.ZodString;
    values: z.ZodArray<z.ZodString>;
    highlight: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const MarketMapCompanySchema: z.ZodObject<{
    name: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    emphasis: z.ZodDefault<z.ZodEnum<{
        primary: "primary";
        secondary: "secondary";
    }>>;
}, z.core.$strip>;
export declare const TimelineEventSchema: z.ZodObject<{
    label: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const OrgChartNodeSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const WaterfallEntrySchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodNumber;
    type: z.ZodEnum<{
        total: "total";
        increase: "increase";
        decrease: "decrease";
    }>;
}, z.core.$strip>;
export declare const TombstoneItemSchema: z.ZodObject<{
    name: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    metrics: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ProtocolAnimationSchema: z.ZodOptional<z.ZodEnum<{
    none: "none";
    buildByPoint: "buildByPoint";
    fadeIn: "fadeIn";
}>>;
export type ProtocolAnimation = z.infer<typeof ProtocolAnimationSchema>;
export declare const TitleBodySlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"title-body">;
    title: z.ZodString;
    eyebrow: z.ZodOptional<z.ZodString>;
    body: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const KpiGridSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"kpi-grid">;
    title: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        trend: z.ZodDefault<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
            none: "none";
        }>>;
        sublabel: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ComparisonTableSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"comparison-table">;
    title: z.ZodString;
    columns: z.ZodArray<z.ZodString>;
    rows: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        values: z.ZodArray<z.ZodString>;
        highlight: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const MarketMapSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"market-map">;
    title: z.ZodString;
    xAxisLabel: z.ZodOptional<z.ZodString>;
    yAxisLabel: z.ZodOptional<z.ZodString>;
    quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
    companies: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        emphasis: z.ZodDefault<z.ZodEnum<{
            primary: "primary";
            secondary: "secondary";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const TimelineSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"timeline">;
    title: z.ZodString;
    events: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        date: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const OrgChartSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"org-chart">;
    title: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        parentId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const WaterfallSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"waterfall">;
    title: z.ZodString;
    entries: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodNumber;
        type: z.ZodEnum<{
            total: "total";
            increase: "increase";
            decrease: "decrease";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const TombstoneGridSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"tombstone-grid">;
    title: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Composition slide — caller-supplied primitive layout.
 *
 * Escape hatch for callers that need layouts beyond the eight
 * slideType templates. Each block places a primitive on a 12×12 grid
 * carved from the usable canvas (slide minus margins and footer
 * reserve). Title chrome is NOT auto-emitted — the caller composes
 * their own header via a titleBlock block when needed.
 *
 * Footer chrome (when tokens.chrome.footer.enabled) is still
 * automatically emitted below the composition canvas.
 */
export declare const CompositionSlideSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"composition">;
    title: z.ZodString;
    blocks: z.ZodArray<z.ZodType<import("./composition.js").CompositionBlock, unknown, z.core.$ZodTypeInternals<import("./composition.js").CompositionBlock, unknown>>>;
    gap: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const SlideSpecSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"title-body">;
    title: z.ZodString;
    eyebrow: z.ZodOptional<z.ZodString>;
    body: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"kpi-grid">;
    title: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        trend: z.ZodDefault<z.ZodEnum<{
            up: "up";
            down: "down";
            flat: "flat";
            none: "none";
        }>>;
        sublabel: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"comparison-table">;
    title: z.ZodString;
    columns: z.ZodArray<z.ZodString>;
    rows: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        values: z.ZodArray<z.ZodString>;
        highlight: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"market-map">;
    title: z.ZodString;
    xAxisLabel: z.ZodOptional<z.ZodString>;
    yAxisLabel: z.ZodOptional<z.ZodString>;
    quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
    companies: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        emphasis: z.ZodDefault<z.ZodEnum<{
            primary: "primary";
            secondary: "secondary";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"timeline">;
    title: z.ZodString;
    events: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        date: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"org-chart">;
    title: z.ZodString;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        parentId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"waterfall">;
    title: z.ZodString;
    entries: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodNumber;
        type: z.ZodEnum<{
            total: "total";
            increase: "increase";
            decrease: "decrease";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"tombstone-grid">;
    title: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        subtitle: z.ZodOptional<z.ZodString>;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slideId: z.ZodOptional<z.ZodString>;
    componentId: z.ZodOptional<z.ZodString>;
    subtitle: z.ZodOptional<z.ZodString>;
    insight: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            none: "none";
            push: "push";
            split: "split";
            morph: "morph";
            fade: "fade";
            wipe: "wipe";
            cover: "cover";
            zoom: "zoom";
        }>;
        speed: z.ZodOptional<z.ZodEnum<{
            slow: "slow";
            med: "med";
            fast: "fast";
        }>>;
        advanceOnClick: z.ZodOptional<z.ZodBoolean>;
        advanceAfterMs: z.ZodOptional<z.ZodNumber>;
        morphOption: z.ZodOptional<z.ZodEnum<{
            byObject: "byObject";
            byWord: "byWord";
            byChar: "byChar";
        }>>;
    }, z.core.$strip>>;
    animation: z.ZodOptional<z.ZodEnum<{
        none: "none";
        buildByPoint: "buildByPoint";
        fadeIn: "fadeIn";
    }>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    chrome: z.ZodOptional<z.ZodObject<{
        headerRibbon: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            height: z.ZodOptional<z.ZodNumber>;
            fill: z.ZodOptional<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
                surface: "surface";
            }>>;
            type: z.ZodOptional<z.ZodEnum<{
                eyebrow: "eyebrow";
                caption: "caption";
                nav: "nav";
            }>>;
            align: z.ZodOptional<z.ZodEnum<{
                left: "left";
                right: "right";
                center: "center";
            }>>;
        }, z.core.$strict>>;
        footer: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                pageNumber: "pageNumber";
                spacer: "spacer";
            }>>>;
            height: z.ZodOptional<z.ZodNumber>;
            topRule: z.ZodOptional<z.ZodString>;
            disclaimer: z.ZodOptional<z.ZodString>;
            projectCode: z.ZodOptional<z.ZodString>;
            watermark: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    slideType: z.ZodLiteral<"composition">;
    title: z.ZodString;
    blocks: z.ZodArray<z.ZodType<import("./composition.js").CompositionBlock, unknown, z.core.$ZodTypeInternals<import("./composition.js").CompositionBlock, unknown>>>;
    gap: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "slideType">;
export declare const PresentationSpecSchema: z.ZodObject<{
    version: z.ZodLiteral<"2.0">;
    deckId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    layoutFamily: z.ZodOptional<z.ZodEnum<{
        editorial: "editorial";
        board: "board";
        product: "product";
        immersive: "immersive";
    }>>;
    accentColor: z.ZodOptional<z.ZodString>;
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
    brand: z.ZodOptional<z.ZodObject<{
        brandPackId: z.ZodOptional<z.ZodString>;
        brandPackVersionId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
    bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        bindingKey: z.ZodString;
        sourceId: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        transform: z.ZodOptional<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                string: "string";
                number: "number";
                boolean: "boolean";
                identity: "identity";
                json: "json";
            }>>;
            fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    lineage: z.ZodOptional<z.ZodObject<{
        sourceType: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        workflowId: z.ZodOptional<z.ZodString>;
        workflowRunId: z.ZodOptional<z.ZodString>;
        releaseId: z.ZodOptional<z.ZodString>;
        labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>;
    slides: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"title-body">;
        title: z.ZodString;
        eyebrow: z.ZodOptional<z.ZodString>;
        body: z.ZodArray<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"kpi-grid">;
        title: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            trend: z.ZodDefault<z.ZodEnum<{
                up: "up";
                down: "down";
                flat: "flat";
                none: "none";
            }>>;
            sublabel: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"comparison-table">;
        title: z.ZodString;
        columns: z.ZodArray<z.ZodString>;
        rows: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            values: z.ZodArray<z.ZodString>;
            highlight: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"market-map">;
        title: z.ZodString;
        xAxisLabel: z.ZodOptional<z.ZodString>;
        yAxisLabel: z.ZodOptional<z.ZodString>;
        quadrants: z.ZodOptional<z.ZodArray<z.ZodString>>;
        companies: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            emphasis: z.ZodDefault<z.ZodEnum<{
                primary: "primary";
                secondary: "secondary";
            }>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"timeline">;
        title: z.ZodString;
        events: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            date: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"org-chart">;
        title: z.ZodString;
        nodes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            role: z.ZodOptional<z.ZodString>;
            parentId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"waterfall">;
        title: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodNumber;
            type: z.ZodEnum<{
                total: "total";
                increase: "increase";
                decrease: "decrease";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"tombstone-grid">;
        title: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            subtitle: z.ZodOptional<z.ZodString>;
            metrics: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        slideId: z.ZodOptional<z.ZodString>;
        componentId: z.ZodOptional<z.ZodString>;
        subtitle: z.ZodOptional<z.ZodString>;
        insight: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                none: "none";
                push: "push";
                split: "split";
                morph: "morph";
                fade: "fade";
                wipe: "wipe";
                cover: "cover";
                zoom: "zoom";
            }>;
            speed: z.ZodOptional<z.ZodEnum<{
                slow: "slow";
                med: "med";
                fast: "fast";
            }>>;
            advanceOnClick: z.ZodOptional<z.ZodBoolean>;
            advanceAfterMs: z.ZodOptional<z.ZodNumber>;
            morphOption: z.ZodOptional<z.ZodEnum<{
                byObject: "byObject";
                byWord: "byWord";
                byChar: "byChar";
            }>>;
        }, z.core.$strip>>;
        animation: z.ZodOptional<z.ZodEnum<{
            none: "none";
            buildByPoint: "buildByPoint";
            fadeIn: "fadeIn";
        }>>;
        bindings: z.ZodOptional<z.ZodArray<z.ZodObject<{
            bindingKey: z.ZodString;
            sourceId: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            targetPath: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            defaultValue: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            transform: z.ZodOptional<z.ZodObject<{
                type: z.ZodDefault<z.ZodEnum<{
                    string: "string";
                    number: "number";
                    boolean: "boolean";
                    identity: "identity";
                    json: "json";
                }>>;
                fallback: z.ZodOptional<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        lineage: z.ZodOptional<z.ZodObject<{
            sourceType: z.ZodOptional<z.ZodString>;
            sourceId: z.ZodOptional<z.ZodString>;
            workflowId: z.ZodOptional<z.ZodString>;
            workflowRunId: z.ZodOptional<z.ZodString>;
            releaseId: z.ZodOptional<z.ZodString>;
            labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>>;
        chrome: z.ZodOptional<z.ZodObject<{
            headerRibbon: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                height: z.ZodOptional<z.ZodNumber>;
                fill: z.ZodOptional<z.ZodEnum<{
                    foreground: "foreground";
                    muted: "muted";
                    accent: "accent";
                    surface: "surface";
                }>>;
                type: z.ZodOptional<z.ZodEnum<{
                    eyebrow: "eyebrow";
                    caption: "caption";
                    nav: "nav";
                }>>;
                align: z.ZodOptional<z.ZodEnum<{
                    left: "left";
                    right: "right";
                    center: "center";
                }>>;
            }, z.core.$strict>>;
            footer: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                layout: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    disclaimer: "disclaimer";
                    projectCode: "projectCode";
                    watermark: "watermark";
                    pageNumber: "pageNumber";
                    spacer: "spacer";
                }>>>;
                height: z.ZodOptional<z.ZodNumber>;
                topRule: z.ZodOptional<z.ZodString>;
                disclaimer: z.ZodOptional<z.ZodString>;
                projectCode: z.ZodOptional<z.ZodString>;
                watermark: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        slideType: z.ZodLiteral<"composition">;
        title: z.ZodString;
        blocks: z.ZodArray<z.ZodType<import("./composition.js").CompositionBlock, unknown, z.core.$ZodTypeInternals<import("./composition.js").CompositionBlock, unknown>>>;
        gap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>], "slideType">>;
}, z.core.$strip>;
export type ProtocolKpi = z.infer<typeof ProtocolKpiSchema>;
export type ComparisonRow = z.infer<typeof ComparisonRowSchema>;
export type MarketMapCompany = z.infer<typeof MarketMapCompanySchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type OrgChartNode = z.infer<typeof OrgChartNodeSchema>;
export type WaterfallEntry = z.infer<typeof WaterfallEntrySchema>;
export type TombstoneItem = z.infer<typeof TombstoneItemSchema>;
export type TitleBodySlide = z.infer<typeof TitleBodySlideSchema>;
export type KpiGridSlide = z.infer<typeof KpiGridSlideSchema>;
export type ComparisonTableSlide = z.infer<typeof ComparisonTableSlideSchema>;
export type MarketMapSlide = z.infer<typeof MarketMapSlideSchema>;
export type TimelineSlide = z.infer<typeof TimelineSlideSchema>;
export type OrgChartSlide = z.infer<typeof OrgChartSlideSchema>;
export type WaterfallSlide = z.infer<typeof WaterfallSlideSchema>;
export type TombstoneGridSlide = z.infer<typeof TombstoneGridSlideSchema>;
export type CompositionSlide = z.infer<typeof CompositionSlideSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;
export type PresentationSpec = z.infer<typeof PresentationSpecSchema>;
export declare const presentationSpecJsonSchema: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://runstamp.com/schema/protocol/v2/presentation-spec.json";
    readonly title: "Runstamp PresentationSpec";
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["version", "title", "slides"];
    readonly properties: {
        readonly version: {
            readonly const: "2.0";
        };
        readonly deckId: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly title: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly tokens: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly layoutFamily: {
            readonly type: "string";
            readonly enum: readonly ["editorial", "board", "product", "immersive"];
            readonly deprecated: true;
            readonly description: "Retired. Omit this field; tokens drive PPTX styling.";
        };
        readonly accentColor: {
            readonly type: "string";
            readonly pattern: "^#[0-9A-Fa-f]{6}$";
            readonly deprecated: true;
            readonly description: "Retired. Use tokens.palette.accent instead.";
        };
        readonly brand: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly brandPackId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly brandPackVersionId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
            readonly anyOf: readonly [{
                readonly required: readonly ["brandPackId"];
            }, {
                readonly required: readonly ["brandPackVersionId"];
            }];
        };
        readonly variables: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
        readonly bindings: {
            readonly type: "array";
            readonly maxItems: 200;
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly required: readonly ["bindingKey", "path"];
                readonly properties: {
                    readonly bindingKey: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly sourceId: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly path: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly targetPath: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly required: {
                        readonly type: "boolean";
                    };
                    readonly defaultValue: {};
                    readonly transform: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly type: {
                                readonly enum: readonly ["identity", "number", "string", "boolean", "json"];
                            };
                            readonly fallback: {};
                        };
                    };
                };
            };
        };
        readonly lineage: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly sourceType: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly sourceId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly workflowId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly workflowRunId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly releaseId: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly labels: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly slides: {
            readonly type: "array";
            readonly minItems: 1;
            readonly maxItems: 200;
            readonly items: {
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "body"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "title-body";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "items"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "kpi-grid";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "columns", "rows"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "comparison-table";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "companies"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "market-map";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "events"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "timeline";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "nodes"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "org-chart";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "entries"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "waterfall";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "items"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "tombstone-grid";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }, {
                    readonly type: "object";
                    readonly required: readonly ["slideType", "title", "blocks"];
                    readonly properties: {
                        readonly slideType: {
                            readonly const: "composition";
                        };
                        readonly animation: {
                            readonly type: "string";
                            readonly enum: readonly ["buildByPoint", "fadeIn", "none"];
                        };
                    };
                }];
            };
        };
    };
};
export { DeclarativeChartSchema, DeclarativeChartSeriesSchema, DeclarativeDocumentSchema, DeclarativeLayoutSchema, DeclarativeMetricSchema, DeclarativeSlideSchema, DeclarativeValidationError, toPresentationSpec, validate, } from "./declarative.js";
export type { DeclarativeChart, DeclarativeChartSeries, DeclarativeDocument, DeclarativeLayout, DeclarativeMetric, DeclarativeSlide, ValidationIssue, ValidationResult, } from "./declarative.js";
export { presets } from "./presets.js";
export type { CoverInput, ExecutiveSummaryInput, DecisionAskInput, MarketSizeInput, CompetitiveLandscapeInput, UnitEconomicsInput, AccountTargetsInput, GtmComparisonInput, RoadmapInput, } from "./presets.js";
//# sourceMappingURL=index.d.ts.map