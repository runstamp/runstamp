export interface RelaxedInputCoercion {
  code: string;
  path: string;
  description: string;
  legacyShape: string;
  modernShape: string;
}

export interface SpreadsheetInputWarning {
  code: string;
  message: string;
  path: string;
  from?: unknown;
  to?: unknown;
}

export interface SpreadsheetRelaxedInputOptions {
  onInputWarning?: (warning: SpreadsheetInputWarning) => void;
  relaxed?: boolean;
}

export const XLSX_RELAXED_INPUT_COERCIONS: RelaxedInputCoercion[] = [
  {
    code: "XLSX_RELAXED_MERGES",
    path: "sheets[].merges",
    description: "Promotes legacy `merges` arrays to `mergedCells`.",
    legacyShape: '{ "merges": ["A1:B1"] }',
    modernShape: '{ "mergedCells": ["A1:B1"] }',
  },
  {
    code: "XLSX_RELAXED_FREEZE_PANE",
    path: "sheets[].freezePane.column",
    description: "Renames legacy freezePane `column` to `col`.",
    legacyShape: '{ "freezePane": { "row": 1, "column": 1 } }',
    modernShape: '{ "freezePane": { "row": 1, "col": 1 } }',
  },
  {
    code: "XLSX_RELAXED_META_SUBJECT",
    path: "meta.subject",
    description: "Promotes legacy workbook `subject` to `description`.",
    legacyShape: '{ "meta": { "subject": "Pipeline review" } }',
    modernShape: '{ "meta": { "description": "Pipeline review" } }',
  },
  {
    code: "XLSX_RELAXED_PRESET_NAME",
    path: "style",
    description: "Maps legacy preset aliases onto the canonical preset catalog.",
    legacyShape: '`"percent"` / `"alert"`',
    modernShape: '`"percentage"` / `"warning"`',
  },
];

const LEGACY_PRESET_MAP: Record<string, string> = {
  alert: "warning",
  percent: "percentage",
};

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
  warnings: SpreadsheetInputWarning[],
  options: SpreadsheetRelaxedInputOptions | undefined,
  warning: SpreadsheetInputWarning,
): void {
  warnings.push(warning);
  options?.onInputWarning?.(warning);
}

function mapLegacyPresetName(
  value: string,
  path: string,
  warnings: SpreadsheetInputWarning[],
  options: SpreadsheetRelaxedInputOptions | undefined,
): string {
  const mapped = LEGACY_PRESET_MAP[value];
  if (!mapped) {
    return value;
  }
  pushWarning(warnings, options, {
    code: "XLSX_RELAXED_PRESET_NAME",
    message: `Mapped legacy preset "${value}" to "${mapped}".`,
    path,
    from: value,
    to: mapped,
  });
  return mapped;
}

function normalizeStyleReferences(
  value: unknown,
  path: string,
  warnings: SpreadsheetInputWarning[],
  options: SpreadsheetRelaxedInputOptions | undefined,
): unknown {
  if (typeof value === "string") {
    return mapLegacyPresetName(value, path, warnings, options);
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => normalizeStyleReferences(entry, `${path}[${index}]`, warnings, options));
  }
  if (!isRecord(value)) {
    return value;
  }

  if (typeof value.preset === "string") {
    value.preset = mapLegacyPresetName(value.preset, `${path}.preset`, warnings, options);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "style" || key === "headerRow" || key === "odd" || key === "even") {
      value[key] = normalizeStyleReferences(child, `${path}.${key}`, warnings, options);
      continue;
    }
    if (isRecord(child) || Array.isArray(child)) {
      normalizeStyleReferences(child, `${path}.${key}`, warnings, options);
    }
  }

  return value;
}

export function preprocessSpreadsheetDocumentInput(
  input: unknown,
  options?: SpreadsheetRelaxedInputOptions,
): { value: unknown; warnings: SpreadsheetInputWarning[] } {
  if (!options?.relaxed || !isRecord(input)) {
    return { value: input, warnings: [] };
  }

  const warnings: SpreadsheetInputWarning[] = [];
  const workbook = cloneInput(input) as Record<string, unknown>;

  if (isRecord(workbook.meta) && typeof workbook.meta.subject === "string" && typeof workbook.meta.description !== "string") {
    const subject = workbook.meta.subject;
    workbook.meta.description = subject;
    delete workbook.meta.subject;
    pushWarning(warnings, options, {
      code: "XLSX_RELAXED_META_SUBJECT",
      message: "Promoted legacy meta.subject into meta.description.",
      path: "meta.subject",
      from: subject,
      to: workbook.meta.description,
    });
  }

  if (Array.isArray(workbook.sheets)) {
    for (let index = 0; index < workbook.sheets.length; index += 1) {
      const sheet = workbook.sheets[index];
      if (!isRecord(sheet)) {
        continue;
      }

      if (!Array.isArray(sheet.mergedCells) && Array.isArray(sheet.merges)) {
        sheet.mergedCells = sheet.merges;
        delete sheet.merges;
        pushWarning(warnings, options, {
          code: "XLSX_RELAXED_MERGES",
          message: "Promoted legacy merges into mergedCells.",
          path: `sheets[${index}].merges`,
        });
      }

      if (isRecord(sheet.freezePane) && !("col" in sheet.freezePane) && "column" in sheet.freezePane) {
        const column = sheet.freezePane.column;
        sheet.freezePane.col = column;
        delete sheet.freezePane.column;
        pushWarning(warnings, options, {
          code: "XLSX_RELAXED_FREEZE_PANE",
          message: "Renamed legacy freezePane.column to freezePane.col.",
          path: `sheets[${index}].freezePane.column`,
          from: column,
          to: sheet.freezePane.col,
        });
      }
    }
  }

  normalizeStyleReferences(workbook, "workbook", warnings, options);
  return { value: workbook, warnings };
}
