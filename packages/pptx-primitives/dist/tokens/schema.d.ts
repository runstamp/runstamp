/**
 * Open token schema. This IS the aesthetic API.
 *
 * No named themes. No preset bundles. Callers supply their own partial
 * TokenBundle; the resolver merges it with the single bootstrap default and
 * returns ResolvedTokens that every primitive reads from.
 *
 * Design rules (enforced by validators below and by primitive implementations):
 *
 *   - No gradients. No drop shadows. No rounded-card-with-border as a
 *     default composition. These are deliberately absent from the schema
 *     because their presence at the aesthetic layer signals 2010-era PPT.
 *     A customer that truly needs a gradient can author a custom primitive;
 *     token-driven aesthetics will not produce one.
 *
 *   - Colors are roles, not free hex. Hex is only valid at the *bundle*
 *     level; primitives consume roles (`foreground`, `accent`, etc.). This
 *     is what enables rebranding by swapping one file.
 *
 *   - Rule styling is a compound pattern grammar, not a single width/color.
 *     Bain's "thick red over thin gray" is a pattern; LG's "single 2px
 *     black" is a pattern. See `src/tokens/rulePattern.ts` for grammar.
 *
 *   - Type is a *role-based scale*. Six roles: display, title, body,
 *     caption, eyebrow, nav. Each role resolves to family + weight + size
 *     + letterSpacing + lineHeight + transform. Primitives ask for a role;
 *     they never hard-code font size.
 */
import { z } from "zod";
declare const paletteSchema: z.ZodObject<{
    foreground: z.ZodDefault<z.ZodString>;
    muted: z.ZodDefault<z.ZodString>;
    faint: z.ZodDefault<z.ZodString>;
    rule: z.ZodDefault<z.ZodString>;
    accent: z.ZodDefault<z.ZodString>;
    accentInverse: z.ZodDefault<z.ZodString>;
    accentSecondary: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
declare const typeSchema: z.ZodObject<{
    display: z.ZodObject<{
        family: z.ZodString;
        weight: z.ZodDefault<z.ZodNumber>;
        size: z.ZodNumber;
        letterSpacing: z.ZodDefault<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        italic: z.ZodDefault<z.ZodBoolean>;
        transform: z.ZodDefault<z.ZodEnum<{
            none: "none";
            upper: "upper";
            lower: "lower";
            title: "title";
        }>>;
    }, z.core.$strict>;
    title: z.ZodObject<{
        family: z.ZodString;
        weight: z.ZodDefault<z.ZodNumber>;
        size: z.ZodNumber;
        letterSpacing: z.ZodDefault<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        italic: z.ZodDefault<z.ZodBoolean>;
        transform: z.ZodDefault<z.ZodEnum<{
            none: "none";
            upper: "upper";
            lower: "lower";
            title: "title";
        }>>;
    }, z.core.$strict>;
    body: z.ZodObject<{
        family: z.ZodString;
        weight: z.ZodDefault<z.ZodNumber>;
        size: z.ZodNumber;
        letterSpacing: z.ZodDefault<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        italic: z.ZodDefault<z.ZodBoolean>;
        transform: z.ZodDefault<z.ZodEnum<{
            none: "none";
            upper: "upper";
            lower: "lower";
            title: "title";
        }>>;
    }, z.core.$strict>;
    caption: z.ZodObject<{
        family: z.ZodString;
        weight: z.ZodDefault<z.ZodNumber>;
        size: z.ZodNumber;
        letterSpacing: z.ZodDefault<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        italic: z.ZodDefault<z.ZodBoolean>;
        transform: z.ZodDefault<z.ZodEnum<{
            none: "none";
            upper: "upper";
            lower: "lower";
            title: "title";
        }>>;
    }, z.core.$strict>;
    eyebrow: z.ZodObject<{
        family: z.ZodString;
        weight: z.ZodDefault<z.ZodNumber>;
        size: z.ZodNumber;
        letterSpacing: z.ZodDefault<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        italic: z.ZodDefault<z.ZodBoolean>;
        transform: z.ZodDefault<z.ZodEnum<{
            none: "none";
            upper: "upper";
            lower: "lower";
            title: "title";
        }>>;
    }, z.core.$strict>;
    nav: z.ZodObject<{
        family: z.ZodString;
        weight: z.ZodDefault<z.ZodNumber>;
        size: z.ZodNumber;
        letterSpacing: z.ZodDefault<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        italic: z.ZodDefault<z.ZodBoolean>;
        transform: z.ZodDefault<z.ZodEnum<{
            none: "none";
            upper: "upper";
            lower: "lower";
            title: "title";
        }>>;
    }, z.core.$strict>;
}, z.core.$strict>;
/**
 * An embedded font entry the caller supplies so type roles can reference
 * families beyond the engine's bundled pool (Noto family).
 *
 * Each entry pairs a family name with a URL or data: URI of a font file
 * (.ttf, .otf, .woff2). The engine downloads / decodes the font and
 * registers it under the declared family name; runs that request that
 * family resolve to the embedded font instead of substituting.
 *
 * Bold / italic variants are separate entries. If you supply a regular
 * weight + a bold weight, the engine picks the right one based on the
 * `type.X.weight` requested by a primitive.
 */
declare const embeddedFontSchema: z.ZodObject<{
    family: z.ZodString;
    src: z.ZodString;
    bold: z.ZodOptional<z.ZodBoolean>;
    italic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type EmbeddedFont = z.infer<typeof embeddedFontSchema>;
declare const spacingSchema: z.ZodObject<{
    xs: z.ZodDefault<z.ZodNumber>;
    sm: z.ZodDefault<z.ZodNumber>;
    md: z.ZodDefault<z.ZodNumber>;
    lg: z.ZodDefault<z.ZodNumber>;
    xl: z.ZodDefault<z.ZodNumber>;
    xxl: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>;
/**
 * TokenBundleSchema is the strict validator for a caller-supplied token file.
 *
 * All top-level keys optional (resolver merges with defaults). Unknown keys
 * at any level are a hard error (strict). Under-specification is allowed
 * and produces no warning — defaults exist for a reason; the warning policy
 * is for unknown keys, not for omissions.
 */
export declare const TokenBundleSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type TokenBundle = z.input<typeof TokenBundleSchema>;
/**
 * ResolvedTokens is the post-resolver shape. Every key present. Rule patterns
 * still strings at this stage; they're parsed at render-site inside primitives
 * via `renderRule()` from rulePattern.ts. This lets primitives cache parsed
 * rules per-invocation instead of mutating the token object.
 */
export declare const ResolvedTokensSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    canvas: z.ZodObject<{
        ratio: z.ZodDefault<z.ZodEnum<{
            "16:9": "16:9";
            "4:3": "4:3";
        }>>;
        margin: z.ZodDefault<z.ZodNumber>;
        density: z.ZodDefault<z.ZodNumber>;
        surface: z.ZodDefault<z.ZodString>;
    }, z.core.$strict>;
    palette: z.ZodObject<{
        foreground: z.ZodDefault<z.ZodString>;
        muted: z.ZodDefault<z.ZodString>;
        faint: z.ZodDefault<z.ZodString>;
        rule: z.ZodDefault<z.ZodString>;
        accent: z.ZodDefault<z.ZodString>;
        accentInverse: z.ZodDefault<z.ZodString>;
        accentSecondary: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>;
    type: z.ZodObject<{
        display: z.ZodObject<{
            family: z.ZodString;
            weight: z.ZodDefault<z.ZodNumber>;
            size: z.ZodNumber;
            letterSpacing: z.ZodDefault<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            italic: z.ZodDefault<z.ZodBoolean>;
            transform: z.ZodDefault<z.ZodEnum<{
                none: "none";
                upper: "upper";
                lower: "lower";
                title: "title";
            }>>;
        }, z.core.$strict>;
        title: z.ZodObject<{
            family: z.ZodString;
            weight: z.ZodDefault<z.ZodNumber>;
            size: z.ZodNumber;
            letterSpacing: z.ZodDefault<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            italic: z.ZodDefault<z.ZodBoolean>;
            transform: z.ZodDefault<z.ZodEnum<{
                none: "none";
                upper: "upper";
                lower: "lower";
                title: "title";
            }>>;
        }, z.core.$strict>;
        body: z.ZodObject<{
            family: z.ZodString;
            weight: z.ZodDefault<z.ZodNumber>;
            size: z.ZodNumber;
            letterSpacing: z.ZodDefault<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            italic: z.ZodDefault<z.ZodBoolean>;
            transform: z.ZodDefault<z.ZodEnum<{
                none: "none";
                upper: "upper";
                lower: "lower";
                title: "title";
            }>>;
        }, z.core.$strict>;
        caption: z.ZodObject<{
            family: z.ZodString;
            weight: z.ZodDefault<z.ZodNumber>;
            size: z.ZodNumber;
            letterSpacing: z.ZodDefault<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            italic: z.ZodDefault<z.ZodBoolean>;
            transform: z.ZodDefault<z.ZodEnum<{
                none: "none";
                upper: "upper";
                lower: "lower";
                title: "title";
            }>>;
        }, z.core.$strict>;
        eyebrow: z.ZodObject<{
            family: z.ZodString;
            weight: z.ZodDefault<z.ZodNumber>;
            size: z.ZodNumber;
            letterSpacing: z.ZodDefault<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            italic: z.ZodDefault<z.ZodBoolean>;
            transform: z.ZodDefault<z.ZodEnum<{
                none: "none";
                upper: "upper";
                lower: "lower";
                title: "title";
            }>>;
        }, z.core.$strict>;
        nav: z.ZodObject<{
            family: z.ZodString;
            weight: z.ZodDefault<z.ZodNumber>;
            size: z.ZodNumber;
            letterSpacing: z.ZodDefault<z.ZodNumber>;
            lineHeight: z.ZodOptional<z.ZodNumber>;
            italic: z.ZodDefault<z.ZodBoolean>;
            transform: z.ZodDefault<z.ZodEnum<{
                none: "none";
                upper: "upper";
                lower: "lower";
                title: "title";
            }>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    rules: z.ZodObject<{
        title: z.ZodDefault<z.ZodString>;
        section: z.ZodDefault<z.ZodString>;
        divider: z.ZodDefault<z.ZodString>;
        edge: z.ZodDefault<z.ZodString>;
    }, z.core.$strict>;
    ornament: z.ZodObject<{
        bullet: z.ZodObject<{
            marker: z.ZodDefault<z.ZodEnum<{
                none: "none";
                filledDot: "filledDot";
                openDot: "openDot";
                enDash: "enDash";
                square: "square";
                chevron: "chevron";
                autoNum: "autoNum";
            }>>;
            scheme: z.ZodOptional<z.ZodEnum<{
                arabicPeriod: "arabicPeriod";
                arabicParenR: "arabicParenR";
                romanUcPeriod: "romanUcPeriod";
                romanLcPeriod: "romanLcPeriod";
                alphaUcPeriod: "alphaUcPeriod";
                alphaLcPeriod: "alphaLcPeriod";
                alphaLcParenR: "alphaLcParenR";
                alphaUcParenR: "alphaUcParenR";
            }>>;
            color: z.ZodDefault<z.ZodEnum<{
                foreground: "foreground";
                muted: "muted";
                faint: "faint";
                accent: "accent";
            }>>;
            sizeRatio: z.ZodDefault<z.ZodNumber>;
            gap: z.ZodDefault<z.ZodNumber>;
            indent: z.ZodDefault<z.ZodNumber>;
            nestedMarker: z.ZodDefault<z.ZodEnum<{
                none: "none";
                filledDot: "filledDot";
                openDot: "openDot";
                enDash: "enDash";
                square: "square";
                chevron: "chevron";
                autoNum: "autoNum";
            }>>;
        }, z.core.$strict>;
        stepMarker: z.ZodObject<{
            style: z.ZodDefault<z.ZodEnum<{
                none: "none";
                circleNumeric: "circleNumeric";
                serifCircled: "serifCircled";
                plain: "plain";
            }>>;
            fill: z.ZodDefault<z.ZodEnum<{
                surface: "surface";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
            }>>;
        }, z.core.$strict>;
        pageNumber: z.ZodObject<{
            style: z.ZodDefault<z.ZodEnum<{
                none: "none";
                plain: "plain";
                circledAccent: "circledAccent";
                boxedAccent: "boxedAccent";
            }>>;
            prefix: z.ZodDefault<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    chrome: z.ZodObject<{
        headerRibbon: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            height: z.ZodDefault<z.ZodNumber>;
            fill: z.ZodDefault<z.ZodEnum<{
                surface: "surface";
                foreground: "foreground";
                muted: "muted";
                accent: "accent";
            }>>;
            type: z.ZodDefault<z.ZodEnum<{
                caption: "caption";
                eyebrow: "eyebrow";
                nav: "nav";
            }>>;
            align: z.ZodDefault<z.ZodEnum<{
                left: "left";
                center: "center";
                right: "right";
            }>>;
        }, z.core.$strict>;
        footer: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            layout: z.ZodDefault<z.ZodArray<z.ZodEnum<{
                pageNumber: "pageNumber";
                disclaimer: "disclaimer";
                projectCode: "projectCode";
                watermark: "watermark";
                spacer: "spacer";
            }>>>;
            height: z.ZodDefault<z.ZodNumber>;
            topRule: z.ZodDefault<z.ZodString>;
            disclaimer: z.ZodDefault<z.ZodString>;
            projectCode: z.ZodDefault<z.ZodString>;
            watermark: z.ZodDefault<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>;
    photo: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        defaultBleed: z.ZodDefault<z.ZodEnum<{
            none: "none";
            full: "full";
            half: "half";
            quarter: "quarter";
            inline: "inline";
        }>>;
        scrim: z.ZodDefault<z.ZodEnum<{
            none: "none";
            light: "light";
            dark: "dark";
        }>>;
        scrimOpacity: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>;
    spacing: z.ZodObject<{
        xs: z.ZodDefault<z.ZodNumber>;
        sm: z.ZodDefault<z.ZodNumber>;
        md: z.ZodDefault<z.ZodNumber>;
        lg: z.ZodDefault<z.ZodNumber>;
        xl: z.ZodDefault<z.ZodNumber>;
        xxl: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strict>;
    embeddedFonts: z.ZodArray<z.ZodObject<{
        family: z.ZodString;
        src: z.ZodString;
        bold: z.ZodOptional<z.ZodBoolean>;
        italic: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ResolvedTokens = z.infer<typeof ResolvedTokensSchema>;
export type ColorRole = keyof z.infer<typeof paletteSchema> | "surface";
export type TypeRole = keyof z.infer<typeof typeSchema>;
export type SpacingStep = keyof z.infer<typeof spacingSchema>;
export {};
//# sourceMappingURL=schema.d.ts.map