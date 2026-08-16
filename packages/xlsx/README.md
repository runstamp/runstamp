# @runstamp/xlsx

Generate native Excel `.xlsx` workbooks from JSON or TypeScript. Multi-sheet output with real cells, formulas, styles, merges, conditional formatting, tables, data validation, charts, comments, and images — emitted as genuine OOXML, not CSV.

[![npm](https://img.shields.io/npm/v/@runstamp/xlsx)](https://www.npmjs.com/package/@runstamp/xlsx)
[![license](https://img.shields.io/npm/l/@runstamp/xlsx)](./LICENSE)

```bash
npm install @runstamp/xlsx
```

Requires Node.js `>=18`. This package is ESM-only.

## Quick Start

```ts
import { SpreadsheetEngine } from "@runstamp/xlsx";
import { writeFileSync } from "node:fs";

const buffer = await SpreadsheetEngine.render({
  meta: { title: "Revenue Report", creator: "Runstamp" },
  sheets: [
    {
      name: "Revenue",
      rows: [
        { cells: [{ value: "Quarter" }, { value: "Revenue" }] },
        { cells: [{ value: "Q1 2026" }, { value: 420000 }] },
        { cells: [{ value: "Q2 2026" }, { value: 465000 }] },
      ],
    },
  ],
});

writeFileSync("revenue.xlsx", buffer);
```

Output is native OOXML designed for Excel, Numbers, Google Sheets, and LibreOffice Calc — no compatibility layer.

## What You Get

- **Native `.xlsx`** — real ECMA-376 OOXML with multiple sheets, real cells (not stringified), and full style fidelity.
- **Formulas** — declarative `F.sum()`, `F.if()`, `F.vlookup()`, and 40+ helpers that compile to proper A1 / R1C1 references.
- **Style dedup** — fonts, fills, borders, and number formats are deduplicated via a style registry before serialization. No bloat.
- **17 style presets** — ready-made named styles (`currency`, `percentage`, `header`, `warning`, etc.).
- **Conditional formatting** — color scales, data bars, icon sets, expression rules.
- **Tables** — real Excel tables with filters and banded rows.
- **Charts** — native editable bar, column, line, pie, and scatter charts linked to sheet data. Pro adds advanced chart families.
- **Comments, images, merges, data validation** — first-class support.
- **Streaming output** — `renderStream()` chunks large sheets to keep memory bounded.
- **Excel compliance** — 1,048,576-row / 16,384-column limits enforced; the Lotus 1-2-3 phantom Feb 29, 1900 leap-year bug is handled; sheet name validation matches Excel exactly (no `[]:*?/\\`, no leading/trailing apostrophes).
- **Deterministic output** — same input, byte-identical workbook.

## Verified Schema

The canonical workbook surface is generated from the exported Zod schema instead of being maintained by hand:

- Schema reference: [`docs/schema-reference.md`](./docs/schema-reference.md)
- Verified examples: [`docs/examples.md`](./docs/examples.md)

Validate untrusted input before rendering:

```ts
import { SpreadsheetEngine } from "@runstamp/xlsx";

const parsed = SpreadsheetEngine.validateDocument(input); // throws ZodError if invalid
const buffer = await SpreadsheetEngine.renderValidated(parsed);
```

## Formulas

Build formulas declaratively with the `F` helpers — they produce the exact A1 string Excel expects, including reference shifting when you copy a formula across a range:

```ts
import { F } from "@runstamp/xlsx";

{
  cells: [
    { value: "Total" },
    { formula: F.sum("B2:B5") },              // =SUM(B2:B5)
    { formula: F.if(F.gt("C2", 1000), "High", "Low") }, // =IF(C2>1000,"High","Low")
    { formula: F.vlookup("A2", "Lookup!$A$2:$B$100", 2, false) },
  ],
}
```

40+ builders cover math, lookup, logical, text, date/time, statistical, and financial functions. In the pro tier, `evaluator.ts` computes cached results server-side so cells display values in Excel immediately (without requiring F9 to recalculate).

## Style Presets

```ts
{ value: 15678, style: "currency" }        // $15,678.00 right-aligned
{ value: 0.342, style: "percentage" }      // 34.2%
{ value: "Region", style: "header" }       // bold, background fill, border
```

All 17 presets are named and composable; you can also define ad-hoc styles inline:

```ts
{
  value: "Q1",
  style: {
    font: { bold: true, color: "#FFFFFF" },
    fill: { type: "solid", color: "#0F172A" },
    alignment: { horizontal: "center" },
    border: { bottom: { style: "thin", color: "#94A3B8" } },
  },
}
```

## Conditional Formatting

```ts
{
  name: "Sales",
  rows: [ /* ... */ ],
  conditionalFormatting: [
    {
      ref: "B2:B100",
      rules: [
        {
          type: "colorScale",
          scale: {
            min: { type: "min", color: "#FEE2E2" },
            max: { type: "max", color: "#BBF7D0" },
          },
        },
      ],
    },
    {
      ref: "C2:C100",
      rules: [
        {
          type: "cellIs",
          operator: "greaterThan",
          formula: "100000",
          style: { font: { bold: true, color: "#166534" } },
        },
        {
          type: "cellIs",
          operator: "between",
          // `between` and `notBetween` require a [lower, upper] tuple.
          formula: ["50000", "100000"],
          style: { fill: { type: "pattern", pattern: "solid", color: "#FEF3C7" } },
        },
      ],
    },
  ],
}
```

### Evaluation order

Excel evaluates rules in **`priority` ascending order** (1 first) and stops at
the first match unless a rule is marked `stopIfTrue: false`. Runstamp assigns
priorities sequentially in the order rules appear in `rules[]`, so put the
**most specific** rule first.

Worked example — given a single cell holding `75000`:

```
rules: [
  { type: "cellIs", operator: "greaterThan", formula: "100000", ... },  // priority 1, no match
  { type: "cellIs", operator: "between",    formula: ["50000","100000"], ... },  // priority 2, matches → applies
  { type: "cellIs", operator: "greaterThan", formula: "0",      ... },  // priority 3, never reached
]
```

The "between" rule wins. Reorder to `[greaterThan 0, between, greaterThan 100000]`
and Excel would apply the `greaterThan 0` style instead.

## Streaming

```ts
import { SpreadsheetEngine } from "@runstamp/xlsx";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const out = createWriteStream("large.xlsx");

const stream = await SpreadsheetEngine.renderStream(doc, {
  rowChunkSize: 2000,                // 100–10,000, default 1,000
});

await pipeline(stream, out);
```

## Public API

```ts
SpreadsheetEngine.render(doc, options?)              // Buffer
SpreadsheetEngine.renderStream(doc, options?)         // Node.js Readable stream
SpreadsheetEngine.validateDocument(doc)               // throws ZodError if invalid
SpreadsheetEngine.renderValidated(validated, opts?)   // skip re-validation
SpreadsheetEngine.lint(doc)                           // soft structural issues

// Formula builder
F.sum, F.if, F.and, F.or, F.not, F.vlookup, F.hlookup, F.xlookup,
F.index, F.match, F.countif, F.sumif, F.average, F.min, F.max,
F.round, F.concat, F.text, F.date, F.today, F.now, /* 40+ total */

// Utilities
cellRef.parse("B7")    // { column: 2, row: 7 }
cellRef.format(2, 7)   // "B7"
excelSerialDate(date)  // Excel date serial number

// Errors
SpreadsheetValidationError
```

Rendering is strict by default: schema failures and workbook invariants throw before a file is written. Pass `relaxed: true` only when you want documented legacy-shape coercions before the same strict validation pass.

Full type surface in `dist/index.d.ts`.

## Structured workbook workflow

Use the A02 workflow when an existing customer workbook—not a newly rendered document—is the
handoff contract. Locators are tied to an artifact id and use an explicit sheet plus A1 reference;
defined names and native tables can be mapped to the same locator form before a user confirms a
write.

```ts
import {
  exportXlsxWorkflow,
  importXlsxWorkflow,
  mapXlsxWorkflow,
  verifyXlsxWorkflow,
  writeXlsxWorkflow,
} from "@runstamp/xlsx";

const source = await importXlsxWorkflow(uploadBytes, {
  artifactId: "customer-questionnaire-42",
});
const [answer] = mapXlsxWorkflow(source, [
  { id: "encryption-answer", kind: "namedRange", name: "ConfirmedAnswer" },
]);

const updated = await writeXlsxWorkflow(source, [{
  locator: answer.locator,
  value: "Yes",
  comment: { author: "Workflow", text: "Confirmed by the customer" },
}]);
const fidelity = verifyXlsxWorkflow(source, updated, {
  allowedCells: [answer.locator],
});
if (fidelity.status !== "PASS") throw new Error(JSON.stringify(fidelity.issues));
const outputBytes = await exportXlsxWorkflow(updated);
```

Untrusted strings beginning with `=`, `+`, `-`, or `@` are rejected. Trusted formula writes must use
the separate `formula` field. Formula caches are preserved or explicitly supplied; this workflow does
not evaluate arbitrary formulas. VBA projects and safe unsupported OOXML parts are preserved as opaque
bytes, reported with typed diagnostics, and never executed or fetched.

## Determinism

```ts
import { setDeterministicMode } from "@runstamp/xlsx";
setDeterministicMode(true);
```

Freezes timestamps, relationship IDs, and style indices so the same input produces byte-identical output.

## Error Handling

```ts
import { SpreadsheetValidationError } from "@runstamp/xlsx";

try {
  await SpreadsheetEngine.render(doc);
} catch (err) {
  if (err instanceof SpreadsheetValidationError) {
    console.error(err.issues);
  }
  throw err;
}
```

Validation errors include the offending cell reference (e.g. `Sheet1!C7`, not `rows[5].cells[2]`) so debugging large sheets is practical.

## Excel Compliance Notes

- Rows capped at 1,048,576; columns at 16,384.
- Sheet names limited to 31 chars, cannot start or end with `'`, cannot contain `[]:*?/\\`.
- Dates before Dec 31, 1899 produce negative serials and have undefined Excel behavior — validate upstream if your data may include them.
- CJK column width uses a 1.8× multiplier heuristic. Override with explicit `columns[i].width` for pixel-exact layout.

## Upgrade to Pro

`@runstamp/xlsx-pro` adds:

- commercial / self-hosted production license
- server-side formula evaluation (cached results so Excel renders without F9)
- workbook repair (corrupted `.xlsx` → valid `.xlsx`)
- quality reporting (`preflight()` with memory estimation + issue surface)
- template parsing and injection (ingest existing `.xlsx` files as templates)
- advanced chart features, pivot tables

The API is identical — swap the import and provide `RUNSTAMP_LICENSE_KEY`.

## Links

- Docs: [runstamp.com/docs](https://runstamp.com/docs)
- Playground: [runstamp.com/playground](https://runstamp.com/playground)
- Pricing: [runstamp.com/pricing](https://runstamp.com/pricing)

## License

Apache-2.0. See `LICENSE`.
