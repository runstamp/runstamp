import type { DocxWarning, DocxInputWarning } from "./types.js";
import type { DocxWarningCode } from "./errors/warning-codes.js";

export type { DocxInputWarning };

export interface RelaxedInputCoercion {
  code: DocxWarningCode;
  path: string;
  description: string;
  legacyShape: string;
  modernShape: string;
}

export interface DocxRelaxedInputOptions {
  onInputWarning?: (warning: DocxInputWarning) => void;
  relaxed?: boolean;
}

export const DOCX_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[] = [
  {
    code: "DOCX_RELAXED_THEME_STRING",
    path: "theme",
    description: "Wraps legacy string themes in the modern `{ preset }` object shape.",
    legacyShape: '{ "theme": "corporate" }',
    modernShape: '{ "theme": { "preset": "corporate" } }',
  },
  {
    code: "DOCX_RELAXED_CODE_BLOCK",
    path: "pages[].elements[].value",
    description: "Moves legacy code-block `value` into the supported `code` field.",
    legacyShape: '{ "type": "code-block", "value": "const x = 1;" }',
    modernShape: '{ "type": "code-block", "code": "const x = 1;" }',
  },
  {
    code: "DOCX_RELAXED_MARGIN_TWIPS",
    path: "margins",
    description: "Treats unusually large margin numbers as twips and converts them to points.",
    legacyShape: '{ "margins": { "top": 1440 } }',
    modernShape: '{ "margins": { "top": 72 } }',
  },
  {
    code: "DOCX_RELAXED_PAGE_NUMBERS",
    path: "footer.pageNumbers",
    description: "Maps legacy `pageNumbers` booleans onto `includePageNumber`.",
    legacyShape: '{ "footer": { "pageNumbers": true } }',
    modernShape: '{ "footer": { "includePageNumber": true } }',
  },
  {
    code: "DOCX_RELAXED_META_KEY",
    path: "meta",
    description: "Promotes legacy top-level `meta` into `metadata`.",
    legacyShape: '{ "meta": { "title": "Report" } }',
    modernShape: '{ "metadata": { "title": "Report" } }',
  },
  {
    code: "DOCX_RELAXED_CHART_POINTS",
    path: "pages[].elements[].series[].dataPoints",
    description: "Converts PPTX-style chart point arrays into the DOCX chart `values[]` shape.",
    legacyShape: '{ "series": [{ "dataPoints": [{ "category": "Q1", "value": 42 }] }] }',
    modernShape: '{ "categories": ["Q1"], "series": [{ "values": [42] }] }',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneInput<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function pushWarning(
  warnings: DocxInputWarning[],
  options: DocxRelaxedInputOptions | undefined,
  warning: DocxInputWarning,
): void {
  warnings.push(warning);
  options?.onInputWarning?.(warning);
}

// Per-side coercion mixed units when only one side exceeded the heuristic
// threshold (the directive at docs/0428-claude-test-based-directive2.md
// §"@runstamp/docx" calls out `margins: { top: 1080 }` flowing through
// inconsistently). Treat the margins object as a single unit choice: if any
// provided side reads as twips, coerce every provided side together so all
// downstream math runs on the same unit.
function maybeConvertTwipsMargins(
  margins: Record<string, unknown>,
  path: string,
  warnings: DocxInputWarning[],
  options: DocxRelaxedInputOptions | undefined,
): void {
  const sides = ["top", "right", "bottom", "left"] as const;
  const numericSides = sides.filter((side) => typeof margins[side] === "number") as readonly (typeof sides)[number][];
  if (numericSides.length === 0) {
    return;
  }
  const looksLikeTwips = numericSides.some((side) => (margins[side] as number) > 500);
  if (!looksLikeTwips) {
    return;
  }

  for (const side of numericSides) {
    const value = margins[side] as number;
    const converted = value / 20;
    margins[side] = converted;
    pushWarning(warnings, options, {
      code: "DOCX_RELAXED_MARGIN_TWIPS",
      message: `Converted legacy ${side} margin from twips to points.`,
      path: `${path}.${side}`,
      from: value,
      to: converted,
    });
  }
}

function normalizeHeaderFooter(
  value: unknown,
  path: string,
  warnings: DocxInputWarning[],
  options: DocxRelaxedInputOptions | undefined,
): void {
  if (!isRecord(value) || !("pageNumbers" in value) || "includePageNumber" in value) {
    return;
  }
  const pageNumbers = value.pageNumbers;
  value.includePageNumber = pageNumbers;
  delete value.pageNumbers;
  pushWarning(warnings, options, {
    code: "DOCX_RELAXED_PAGE_NUMBERS",
    message: "Mapped legacy pageNumbers to includePageNumber.",
    path: `${path}.pageNumbers`,
    from: pageNumbers,
    to: value.includePageNumber,
  });
}

function normalizeElements(
  elements: unknown,
  basePath: string,
  warnings: DocxInputWarning[],
  options: DocxRelaxedInputOptions | undefined,
): void {
  if (!Array.isArray(elements)) {
    return;
  }

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    if (!isRecord(element)) {
      continue;
    }
    const path = `${basePath}[${index}]`;

    if (element.type === "code-block" && "value" in element && !("code" in element)) {
      element.code = typeof element.value === "string" ? element.value : String(element.value ?? "");
      delete element.value;
      pushWarning(warnings, options, {
        code: "DOCX_RELAXED_CODE_BLOCK",
        message: "Moved legacy code-block value into code.",
        path: `${path}.value`,
        to: element.code,
      });
    }

    if (element.type === "chart" && Array.isArray(element.series)) {
      let categories = Array.isArray(element.categories)
        ? element.categories.map((entry) => String(entry))
        : undefined;

      element.series = element.series.map((series, seriesIndex) => {
        if (!isRecord(series) || !Array.isArray(series.dataPoints) || "values" in series) {
          return series;
        }

        const dataPoints = series.dataPoints.filter(isRecord);
        if (!categories) {
          categories = dataPoints.map((point, pointIndex) => String(point.category ?? `Point ${pointIndex + 1}`));
        }
        const values = dataPoints.map((point) => typeof point.value === "number" ? point.value : Number(point.value));
        const { dataPoints: _legacyDataPoints, ...rest } = series;
        void _legacyDataPoints;
        const nextSeries = { ...rest, values };
        pushWarning(warnings, options, {
          code: "DOCX_RELAXED_CHART_POINTS",
          message: "Converted PPTX-style chart dataPoints to DOCX values[].",
          path: `${path}.series[${seriesIndex}].dataPoints`,
        });
        return nextSeries;
      });

      if (categories && !Array.isArray(element.categories)) {
        element.categories = categories;
      }
    }

    if (Array.isArray(element.children)) {
      normalizeElements(element.children, `${path}.children`, warnings, options);
    }
  }
}

export function toDocxResultWarning(warning: DocxInputWarning): DocxWarning {
  return {
    code: warning.code,
    message: warning.message,
    location: warning.path,
    context: {
      from: warning.from,
      to: warning.to,
    },
  };
}

export function preprocessDocxDocumentInput(
  input: unknown,
  options?: DocxRelaxedInputOptions,
): { value: unknown; warnings: DocxInputWarning[] } {
  if (!options?.relaxed || !isRecord(input)) {
    return { value: input, warnings: [] };
  }

  const warnings: DocxInputWarning[] = [];
  const document = cloneInput(input) as Record<string, unknown>;

  if (typeof document.theme === "string") {
    const preset = document.theme;
    document.theme = { preset };
    pushWarning(warnings, options, {
      code: "DOCX_RELAXED_THEME_STRING",
      message: "Wrapped legacy string theme in a { preset } object.",
      path: "theme",
      from: preset,
      to: document.theme,
    });
  }

  if (!isRecord(document.metadata) && isRecord(document.meta)) {
    document.metadata = document.meta;
    delete document.meta;
    pushWarning(warnings, options, {
      code: "DOCX_RELAXED_META_KEY",
      message: "Promoted legacy meta into metadata.",
      path: "meta",
      to: document.metadata,
    });
  }

  if (isRecord(document.margins)) {
    maybeConvertTwipsMargins(document.margins, "margins", warnings, options);
  }

  for (const key of [
    "header",
    "footer",
    "firstPageHeader",
    "firstPageFooter",
    "oddPageHeader",
    "oddPageFooter",
    "evenPageHeader",
    "evenPageFooter",
  ] as const) {
    normalizeHeaderFooter(document[key], key, warnings, options);
  }

  if (Array.isArray(document.pages)) {
    for (let index = 0; index < document.pages.length; index += 1) {
      const page = document.pages[index];
      if (!isRecord(page)) {
        continue;
      }
      normalizeElements(page.elements, `pages[${index}].elements`, warnings, options);
      normalizeHeaderFooter(page.header, `pages[${index}].header`, warnings, options);
      normalizeHeaderFooter(page.footer, `pages[${index}].footer`, warnings, options);
      if (isRecord(page.headerFooter)) {
        normalizeHeaderFooter(page.headerFooter.header, `pages[${index}].headerFooter.header`, warnings, options);
        normalizeHeaderFooter(page.headerFooter.footer, `pages[${index}].headerFooter.footer`, warnings, options);
      }
    }
  }

  return { value: document, warnings };
}
