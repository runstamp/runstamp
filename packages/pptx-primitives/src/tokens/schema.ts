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

// ---------------------------------------------------------------------------
// Primitive value validators (hex, unit, rule pattern)
// ---------------------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u, "must be #RGB, #RRGGBB, or #RRGGBBAA");

/** Positive px value. We emit absolute pixel positions so this is the canonical unit. */
const pxValue = z.number().nonnegative();

/** Letter-spacing in px; positive (tracked out) or negative (tightened). */
const letterSpacing = z.number();

/** Compound rule pattern string — parsed by rulePattern.ts at resolve time.
 *
 *   Examples:
 *     "1px solid #E5E5E5"                             (minimal hairline)
 *     "3px solid #DA291C + 1px solid #CCCCCC gap:1"   (Bain bar)
 *     "2px solid #000"                                 (LG title rule)
 *     "none"                                           (no rule)
 */
const rulePattern = z.string();

const autoNumSchemeSchema = z.enum([
  "arabicPeriod", "arabicParenR",
  "romanUcPeriod", "romanLcPeriod",
  "alphaUcPeriod", "alphaLcPeriod",
  "alphaLcParenR", "alphaUcParenR",
]);

// ---------------------------------------------------------------------------
// CANVAS
// ---------------------------------------------------------------------------
const canvasSchema = z.object({
  /** Aspect ratio; widescreen 16:9 or classic 4:3. */
  ratio: z.enum(["16:9", "4:3"]).default("16:9"),
  /** Outer margin (px) from slide edge to content gutter. */
  margin: pxValue.default(56),
  /** Global density multiplier applied to vertical gaps and padding.
   *  1.0 = neutral. <1 = dense (Bain matrix pages). >1 = airy (editorial). */
  density: z.number().min(0.6).max(1.6).default(1.0),
  /** Slide background color, as a hex. Photography treatments live under
   *  `photo` — this is the fallback/paper surface only. */
  surface: hexColor.default("#FFFFFF"),
}).strict();

// ---------------------------------------------------------------------------
// PALETTE — color roles, not free hex
// ---------------------------------------------------------------------------
const paletteSchema = z.object({
  /** Primary text color, load-bearing. */
  foreground: hexColor.default("#0A0A0A"),
  /** Secondary text color (subtitles, metadata). */
  muted: hexColor.default("#6B6B6B"),
  /** Tertiary text color (timestamps, captions). */
  faint: hexColor.default("#A8A8A8"),
  /** Default rule/hairline color. */
  rule: hexColor.default("#E5E5E5"),
  /** The one accent. Used sparingly. */
  accent: hexColor.default("#0A0A0A"),
  /** Text color to use *on* accent (e.g., filled chips, ribbon overlays). */
  accentInverse: hexColor.default("#FFFFFF"),
  /** Optional second accent for charts / secondary emphasis. Null = unused. */
  accentSecondary: hexColor.nullable().default(null),
}).strict();

// ---------------------------------------------------------------------------
// TYPE — role-based scale, six roles
// ---------------------------------------------------------------------------
const typeRoleSchema = z.object({
  /** Font family name. Substituted via font resolver if unavailable. */
  family: z.string().min(1),
  /** CSS weight (100–900). */
  weight: z.number().int().min(100).max(900).default(400),
  /** Font size in points (PPTX convention). */
  size: z.number().positive(),
  /** Letter-spacing in px. Applied in OOXML via `spc` attribute. */
  letterSpacing: letterSpacing.default(0),
  /** Line-height in points (absolute), not multiplier. */
  lineHeight: z.number().positive().optional(),
  /** Italic. */
  italic: z.boolean().default(false),
  /** Content transform. `upper` uppercases at render (not CSS). */
  transform: z.enum(["none", "upper", "lower", "title"]).default("none"),
}).strict();

const typeSchema = z.object({
  /** Oversized headline, used for editorial / title slides. */
  display: typeRoleSchema,
  /** Slide titles. */
  title: typeRoleSchema,
  /** Running body text. */
  body: typeRoleSchema,
  /** Small annotations, footnotes. */
  caption: typeRoleSchema,
  /** Tracked caps above a title. */
  eyebrow: typeRoleSchema,
  /** Header ribbon / nav labels. */
  nav: typeRoleSchema,
}).strict();

// ---------------------------------------------------------------------------
// RULES — compound rule patterns per structural role
// ---------------------------------------------------------------------------
const rulesSchema = z.object({
  /** Rule drawn under a slide title. Bain's "bar" lives here. */
  title: rulePattern.default("none"),
  /** Rule drawn under a section header / section ribbon. */
  section: rulePattern.default("none"),
  /** Rule separating body content (bullet groups, table rows, etc.). */
  divider: rulePattern.default("1px solid token:rule"),
  /** Rule along a slide edge / footer top. */
  edge: rulePattern.default("none"),
}).strict();

// ---------------------------------------------------------------------------
// ORNAMENTS — decorative markers
// ---------------------------------------------------------------------------
const ornamentSchema = z.object({
  /** Bullet marker style. `none` means prose without markers. */
  bullet: z.object({
    marker: z.enum(["filledDot", "openDot", "enDash", "square", "chevron", "none", "autoNum"]).default("filledDot"),
    /** Native PowerPoint numbering scheme when marker is `autoNum`. */
    scheme: autoNumSchemeSchema.optional(),
    /** Color role for the marker. */
    color: z.enum(["foreground", "muted", "faint", "accent"]).default("foreground"),
    /** Marker size relative to surrounding body text (multiplier). */
    sizeRatio: z.number().positive().default(0.9),
    /** Space from marker to text (px). */
    gap: pxValue.default(10),
    /** Indent for nested levels (px). */
    indent: pxValue.default(16),
    /** Style for nested (level 2+) markers. */
    nestedMarker: z.enum(["filledDot", "openDot", "enDash", "square", "chevron", "none", "autoNum"]).default("enDash"),
  }).strict(),
  /** Step / sequence marker style. */
  stepMarker: z.object({
    style: z.enum(["circleNumeric", "serifCircled", "plain", "none"]).default("circleNumeric"),
    /** Color role for the marker background. */
    fill: z.enum(["foreground", "accent", "muted", "surface"]).default("accent"),
  }).strict(),
  /** Page-number style in footer. */
  pageNumber: z.object({
    style: z.enum(["plain", "circledAccent", "boxedAccent", "none"]).default("plain"),
    prefix: z.string().default(""),
  }).strict(),
}).strict();

// ---------------------------------------------------------------------------
// CHROME — persistent on-slide elements (ribbon, footer)
// ---------------------------------------------------------------------------
const chromeSchema = z.object({
  headerRibbon: z.object({
    enabled: z.boolean().default(false),
    /** Height in px. */
    height: pxValue.default(28),
    /** Fill color role. */
    fill: z.enum(["foreground", "accent", "muted", "surface"]).default("foreground"),
    /** Role from `type` used for the ribbon label. */
    type: z.enum(["nav", "eyebrow", "caption"]).default("nav"),
    /** Horizontal alignment of the label. */
    align: z.enum(["left", "center", "right"]).default("center"),
  }).strict(),
  footer: z.object({
    enabled: z.boolean().default(true),
    /** Content order from left → right. */
    layout: z.array(z.enum(["disclaimer", "projectCode", "watermark", "pageNumber", "spacer"]))
      .default(["spacer", "pageNumber"]),
    /** Reserved height in px. */
    height: pxValue.default(32),
    /** Edge rule above the footer (nullable → no rule). */
    topRule: rulePattern.default("none"),
    /** Disclaimer text (empty → hidden even if in layout). */
    disclaimer: z.string().default(""),
    /** Project / deck code (empty → hidden). */
    projectCode: z.string().default(""),
    /** Watermark text or logomark URL (data: or https:). */
    watermark: z.string().default(""),
  }).strict(),
}).strict();

// ---------------------------------------------------------------------------
// PHOTOGRAPHY
// ---------------------------------------------------------------------------
const photoSchema = z.object({
  /** Whether photography is a first-class content type for this bundle.
   *  When false, image-bleed primitives degrade to empty regions or
   *  fall back to typography-only layouts (Bain-style). */
  enabled: z.boolean().default(false),
  /** Default bleed treatment when a slide calls for imagery. */
  defaultBleed: z.enum(["full", "half", "quarter", "inline", "none"]).default("none"),
  /** Overlay scrim when text sits on top of photography.
   *  `none` — no scrim; `light` — translucent white; `dark` — translucent black;
   *  `gradientSuppressed` is deliberately absent. */
  scrim: z.enum(["none", "light", "dark"]).default("none"),
  /** Scrim opacity 0–1. */
  scrimOpacity: z.number().min(0).max(1).default(0.35),
}).strict();

// ---------------------------------------------------------------------------
// FONTS — embedded fonts supplied by the caller
// ---------------------------------------------------------------------------
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
const embeddedFontSchema = z.object({
  /** Family name, exactly as referenced by type.X.family. */
  family: z.string().min(1),
  /** Font file source. https://, data:, or absolute path the engine can
   *  resolve on the server. */
  src: z.string().min(1),
  /** True for bold variant. */
  bold: z.boolean().optional(),
  /** True for italic variant. */
  italic: z.boolean().optional(),
}).strict();

export type EmbeddedFont = z.infer<typeof embeddedFontSchema>;

// ---------------------------------------------------------------------------
// SPACING — semantic spacing scale
// ---------------------------------------------------------------------------
const spacingSchema = z.object({
  /** xs/sm/md/lg/xl/2xl — step values in px.
   *  Primitives ask for a semantic step; bundles tune the scale globally. */
  xs: pxValue.default(4),
  sm: pxValue.default(8),
  md: pxValue.default(16),
  lg: pxValue.default(24),
  xl: pxValue.default(40),
  xxl: pxValue.default(72),
}).strict();

// ---------------------------------------------------------------------------
// BUNDLE — the full, partial-valid input shape
// ---------------------------------------------------------------------------
/**
 * TokenBundleSchema is the strict validator for a caller-supplied token file.
 *
 * All top-level keys optional (resolver merges with defaults). Unknown keys
 * at any level are a hard error (strict). Under-specification is allowed
 * and produces no warning — defaults exist for a reason; the warning policy
 * is for unknown keys, not for omissions.
 */
export const TokenBundleSchema = z.object({
  /** Schema version pin. Lets callers declare they targeted a specific shape. */
  version: z.literal("1.0").default("1.0"),
  canvas: canvasSchema.partial().optional(),
  palette: paletteSchema.partial().optional(),
  type: z.object({
    display: typeRoleSchema.partial().optional(),
    title: typeRoleSchema.partial().optional(),
    body: typeRoleSchema.partial().optional(),
    caption: typeRoleSchema.partial().optional(),
    eyebrow: typeRoleSchema.partial().optional(),
    nav: typeRoleSchema.partial().optional(),
  }).strict().optional(),
  rules: rulesSchema.partial().optional(),
  ornament: z.object({
    bullet: ornamentSchema.shape.bullet.partial().optional(),
    stepMarker: ornamentSchema.shape.stepMarker.partial().optional(),
    pageNumber: ornamentSchema.shape.pageNumber.partial().optional(),
  }).strict().optional(),
  chrome: z.object({
    headerRibbon: chromeSchema.shape.headerRibbon.partial().optional(),
    footer: chromeSchema.shape.footer.partial().optional(),
  }).strict().optional(),
  photo: photoSchema.partial().optional(),
  spacing: spacingSchema.partial().optional(),
  /** Caller-supplied fonts. Each entry registers a family the engine would
   *  otherwise substitute. Optional; absent → only bundled families work. */
  embeddedFonts: z.array(embeddedFontSchema).optional(),
}).strict();

export type TokenBundle = z.input<typeof TokenBundleSchema>;

// ---------------------------------------------------------------------------
// RESOLVED — the fully-specified shape primitives consume
// ---------------------------------------------------------------------------
/**
 * ResolvedTokens is the post-resolver shape. Every key present. Rule patterns
 * still strings at this stage; they're parsed at render-site inside primitives
 * via `renderRule()` from rulePattern.ts. This lets primitives cache parsed
 * rules per-invocation instead of mutating the token object.
 */
export const ResolvedTokensSchema = z.object({
  version: z.literal("1.0"),
  canvas: canvasSchema,
  palette: paletteSchema,
  type: typeSchema,
  rules: rulesSchema,
  ornament: ornamentSchema,
  chrome: chromeSchema,
  photo: photoSchema,
  spacing: spacingSchema,
  /** Always an array at resolved time (possibly empty). */
  embeddedFonts: z.array(embeddedFontSchema),
}).strict();

export type ResolvedTokens = z.infer<typeof ResolvedTokensSchema>;

// ---------------------------------------------------------------------------
// ROLE NAME TYPE HELPERS
// ---------------------------------------------------------------------------
export type ColorRole = keyof z.infer<typeof paletteSchema> | "surface";
export type TypeRole = keyof z.infer<typeof typeSchema>;
export type SpacingStep = keyof z.infer<typeof spacingSchema>;
