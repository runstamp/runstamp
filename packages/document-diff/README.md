# @runstamp/document-diff

Plugin-driven JSON document diffing for Runstamp engines — produces a typed `ChangeSet` (added / removed / modified / moved) with human-readable paths and severity, suitable for review UIs, redlines, and audit logs.

It also provides the O03 semantic compare contract for exact, version-bound DOCX/PPTX node trees.

[![npm](https://img.shields.io/npm/v/@runstamp/document-diff)](https://www.npmjs.com/package/@runstamp/document-diff)
[![license](https://img.shields.io/npm/l/@runstamp/document-diff)](./LICENSE)

## Why

`jsondiffpatch` produces compact deltas optimized for patching, not reading. Review tooling needs the opposite: stable paths, semantic descriptions ("Slide 2 title changed"), and a severity scale so UIs can highlight material edits. `@runstamp/document-diff` wraps `jsondiffpatch` with a plugin hook that lets each Runstamp engine contribute domain-specific interpretation while sharing the core walker, path formatter, and move detection.

## Install

```bash
npm install @runstamp/document-diff
```

Requires Node.js `>=18`. Single runtime dependency: `jsondiffpatch`.

## Quick Start

```ts
import { diffDocuments, type DiffPlugin } from "@runstamp/document-diff";

const plugin: DiffPlugin = {
  normalize: (doc) => doc,
};

const result = diffDocuments(
  { title: "Q1 Review", slides: [{ heading: "Revenue" }] },
  { title: "Q1 Review", slides: [{ heading: "Revenue growth" }] },
  plugin,
);

// result.changes:
// [{ type: "modified", path: "slides[0].heading", severity: "minor",
//    before: "Revenue", after: "Revenue growth", description: "slides[0].heading modified" }]
//
// result.summary: "1 change: 1 item modified"
// result.statistics: { added: 0, removed: 0, modified: 1, moved: 0 }
```

## API

### Semantic compare/redline

`adaptSemanticArtifact()` and `compareArtifactSources()` accept exact source bytes plus an inspection
output. The built-in `docxInspectionAdapter` maps the actual A01 `ControlledDocxDocument` inspection
and searchable parts. The built-in `pptxInspectionAdapter` maps actual A04 `PptxTemplateInspection`
slides and objects, retaining slide indexes as semantic data while using part/object-derived stable
IDs. Source bytes are SHA-256 hashed locally and must match all
declared and inspection bindings before output is trusted. Declared inspection metadata is preserved
under node `data`; unknown adapter fields and direct semantic-node properties reject. DOCX raw XML is
represented by a hash rather than exposed as user diff content.

`compareSemanticDocuments(before, after, options?)` aligns only explicit stable node IDs and emits
insert/delete/move/text/style/data/comment/structure changes. Every change carries an Extension Kit
source locator; the change set binds both source version IDs and SHA-256 hashes. Duplicate IDs,
cross-artifact locators, stale version bindings, oversized/deep inputs, and cancellation fail closed.

`createRedlinePayload()` produces an undecided viewer payload and `decideRedlineChanges()` records
explicit accept/reject/defer decisions without mutating either source. `exportRedline()` accepts a
neutral A01/A04/A03 renderer callback plus an independently supplied output inspector for native or
PDF output. The inspector receives an operation-owned abort signal and is raced against caller
cancellation plus a bounded `inspectorTimeoutMs` (30 seconds by default). The inspector must prove
exact change/source hashes, changed node IDs, byte hash/length,
format, counts, and required text. A reference envelope must emit `RENDERER_LIMITATION`; the package
does not pretend that envelope is an Office or PDF artifact.

`semanticCompareExtension` exposes the compare operation through the offline Extension Kit runner,
including its budgets and cancellation signal. V1 supports `docx` and `pptx`; it never infers moves
from similar text and never auto-accepts changes.

```ts
const changes = await compareSemanticDocuments(contractV1, contractV2, {
  ignoreStyleProperties: ["renderCacheKey"],
});
const review = createRedlinePayload(changes);
```

The legacy plugin API remains available:

### `diffDocuments(before, after, plugin, options?) => ChangeSet`

Computes a diff between two JSON-serializable documents.

- `before`, `after` — the two document snapshots to compare.
- `plugin` — a `DiffPlugin` that normalizes inputs and optionally annotates each change.
- `options.includeSummary` — set to `false` to skip generating the human summary string (default `true`).

Returns a `ChangeSet`:

```ts
interface ChangeSet {
  changes: Change[];        // ordered list of non-suppressed changes
  summary: string;          // e.g. "3 changes: 2 slides added, 1 title modified"
  statistics: DiffStatistics; // counts by change kind
}

interface Change {
  type: "added" | "removed" | "modified" | "moved";
  path: string;             // e.g. "slides[0].text[2].content"
  description: string;
  before?: unknown;
  after?: unknown;
  severity: "major" | "minor" | "cosmetic";
}
```

### `DiffPlugin<TNormalized>`

```ts
interface DiffPlugin<TNormalized = unknown> {
  // Transform the raw input before diffing (strip render metadata,
  // sort stable keys, attach __diffKey identities for move detection, etc.)
  normalize(document: unknown): TNormalized;

  // Override description / severity / summary label for a specific change.
  // Return `null` to drop the change entirely.
  interpretChange?(ctx: DiffInterpretContext<TNormalized>): DiffInterpretResult | null;

  // Cheap predicate to suppress a change before any interpretation runs.
  shouldSuppress?(ctx: DiffInterpretContext<TNormalized>): boolean;
}
```

`DiffInterpretContext` exposes `type`, `path`, `pathString`, `fromPath` (for moves), `before`, `after`, and the normalized documents so plugins can consult sibling context when classifying a change.

### Helpers

- `createDiffKey(...parts)` — joins non-empty, non-null parts with `:` to build stable `__diffKey` identities for array items (used by the default `objectHash` for move detection).
- `isInternalDiffField(segment)` — `true` if the path segment starts with the reserved `__diff` prefix (these paths are suppressed automatically).

## Move Detection

Array items are matched by `__diffKey` when present, falling back to positional index. Attach `__diffKey` inside your `normalize()` so reordered items surface as a single `moved` change instead of an `added` + `removed` pair:

```ts
const plugin: DiffPlugin = {
  normalize: (doc) => ({
    ...doc,
    slides: doc.slides.map((slide, i) => ({
      ...slide,
      __diffKey: createDiffKey("slide", slide.id ?? i),
    })),
  }),
};
```

`__diffKey` and any other `__diff*` field is stripped from the reported `path` automatically.

## Semantic Interpretation

Plugins can upgrade generic diffs into domain-aware descriptions:

```ts
const pptxPlugin: DiffPlugin = {
  normalize: (doc) => doc,
  interpretChange: (ctx) => {
    if (ctx.path[0] === "slides" && ctx.type === "added") {
      return {
        description: `Slide ${Number(ctx.path[1]) + 1} added`,
        severity: "major",
        summaryLabel: "slide added",
      };
    }
    if (/^slides\[\d+\]\.notes$/.test(ctx.pathString)) {
      return { severity: "cosmetic", summaryLabel: "speaker note edited" };
    }
    return null; // fall back to defaults
  },
  shouldSuppress: (ctx) =>
    ctx.pathString.endsWith(".renderedAt") || ctx.pathString.endsWith(".cacheKey"),
};
```

`shouldSuppress` runs before `interpretChange` and is the right place to drop non-semantic render metadata. Returning `null` from `interpretChange` keeps the change with default formatting; returning the explicit object overrides any or all of `description` / `severity` / `summaryLabel`.

## Path Format

Paths use dotted property access for identifier-safe keys, bracketed JSON strings for other keys, and `[n]` for array indices:

```
title
slides[0].heading
meta["content-type"]
```

This format is stable across runs and safe to surface in UI.

## License

Apache-2.0. See `LICENSE`.
