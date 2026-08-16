# `@runstamp/react`

MIT-licensed React 18+ components for the cross-format Runstamp
`OperationResult` contract, plus the existing headless deck surface. The browser
entry is SSR-safe and contains no Node or rendering-engine imports. PPTX and PDF
generation live in the explicit `@runstamp/react/server` entry.

## Install

```sh
pnpm add @runstamp/react @runstamp/contract react react-dom
```

Load the zero-runtime theme once:

```tsx
import "@runstamp/react/styles.css";
```

Install `@runstamp/pptx` as well only when using the deck components or server
renderer.

## Review any operation result

```tsx
import { OperationResultView } from "@runstamp/react";
import "@runstamp/react/styles.css";

export function ResultReview({ result, artifacts, download }) {
  return (
    <OperationResultView
      result={result}
      artifacts={artifacts}
      onArtifactDownload={download}
      defaultExpanded={["artifacts", "losses", "diagnostics", "receipt"]}
    />
  );
}
```

`OperationResultView` renders success or typed failure, the complete loss and
diagnostic ledgers, the provenance receipt, and caller-supplied artifact
references. It performs no network requests and handles no credentials; the
application owns `onArtifactDownload`. The component can be used as a whole or
composed from `OperationStatus`, `OperationArtifacts`, `OperationLosses`,
`OperationDiagnostics`, and `OperationReceipt`.

## Render a real declarative deck

The document below is accepted by both `@runstamp/react` and the Runstamp
rendering engine. It contains intent, not drawing calls or slide coordinates.

```tsx
import {
  DeckThumbnails,
  DeckToolbar,
  DeckViewer,
  useDeck,
  type DeclarativeDocument,
} from "@runstamp/react";
import "@runstamp/react/styles.css";

const document: DeclarativeDocument = {
  version: "1.0",
  title: "Q2 review",
  slides: [
    {
      layout: "title",
      title: "Q2 moved the growth curve",
      subtitle: "Board review · 10 August 2026",
    },
    {
      layout: "kpi-row",
      title: "The operating system is compounding",
      metrics: [
        { label: "ARR", value: "$18.4m", delta: "+28% YoY" },
        { label: "Net retention", value: "121%", delta: "+6 pts" },
      ],
    },
  ],
};

export function Review() {
  const deck = useDeck(document);
  return (
    <>
      <DeckToolbar
        deck={deck}
        fileName="q2-review"
        pptx="/api/review.pptx"
        pdf="/api/review.pdf"
        fidelity={{ status: "passed", platform: "PowerPoint for Windows" }}
      />
      <div style={{ display: "flex", gap: 20 }}>
        <DeckThumbnails deck={deck} />
        <DeckViewer deck={deck} />
      </div>
    </>
  );
}
```

Use one controller for coordinated navigation. Passing a document directly to a
standalone component also works, but gives that component its own navigation
state.

## Headless hooks

`useDeck(document, options)` returns:

```ts
interface DeckController {
  document: DeckDocument;
  currentSlide: number;
  slideCount: number;
  canPrevious: boolean;
  canNext: boolean;
  setCurrentSlide(index: number): void;
  previous(): void;
  next(): void;
  first(): void;
  last(): void;
}
```

`useDeckRender(deck, slideIndex?)` derives the current slide and a normalized
`model` containing its title, bullets, metrics, chart, comparison, timeline, or
AST nodes.
Consumers can own all markup:

```tsx
function HeadlessTitle() {
  const { model } = useDeckRender();
  return <h1>{model.title}</h1>;
}

<DeckProvider deck={document}>
  <HeadlessTitle />
</DeckProvider>
```

Both hooks consume `DeckProvider` when their deck argument is omitted.

## Components

- `DeckViewer` renders a sharp 16:9 slide canvas. Override all slide markup with
  `renderSlide(state)`.
- `DeckThumbnails` renders an accessible left rail with a real gutter. Override
  thumbnail markup with `renderThumbnail(state)`.
- `DeckToolbar` provides page navigation and PPTX/PDF download actions. `pptx`
  and `pdf` accept a URL, `Blob`, `Uint8Array`, or an async function returning one.
- `FidelityBadge` accepts `passed`, `failed`, `pending`, or `unverified`. A result
  object can carry the actual Office platform, timestamp, and oracle message.

The badge never infers fidelity from render success. Pass only the result returned
by your real-Office validation service.

## Server adapter

Import this entry only from a server route, action, loader, or Node script:

```ts
import { createRunstampRenderer } from "@runstamp/react/server";

const renderer = createRunstampRenderer({
  pptx: { deterministic: true, validationMode: "structural" },
  pdf: { quality: "print" },
});

const pptx: Uint8Array = await renderer.renderPptx(document);
const pdf: Uint8Array = await renderer.renderPdf(document);
```

`renderDeckToPptx(document, options?)` and `renderDeckToPdf(document, options?)`
are one-shot conveniences. All methods wrap `@runstamp/pptx`; this package
does not reimplement the engine.

## Theme token contract

The default follows the
[`runstamp-identity.md`](https://github.com/runstamp/runstamp/blob/main/docs/design/runstamp-identity.md)
contract:
Satoshi 400/450/550/600, Geist Mono for machine values, cool marketing neutrals,
the single `210 27% 48%` blue-gray accent (`#86a9dc` in dark mode), sharp
rectangles, gap gutters, and hairline borders.

Every visual theme decision is a CSS custom property. Values are complete CSS
color or font-family values, not bare HSL channels:

| Property | Meaning |
| --- | --- |
| `--runstamp-accent` | Single interactive/data accent |
| `--runstamp-ground` | Viewer, rail, and toolbar ground |
| `--runstamp-surface` | Slide and control surface |
| `--runstamp-ink` | Primary text |
| `--runstamp-muted-ink` | Secondary text and metadata |
| `--runstamp-border` | Hairline border color, including alpha |
| `--runstamp-signal-green` | Passed Office validation |
| `--runstamp-signal-amber` | Pending Office validation |
| `--runstamp-signal-red` | Failed Office validation |
| `--runstamp-font-sans` | Human/editorial font stack |
| `--runstamp-font-mono` | Machine/data font stack |

Use `theme="dark"` for the shipped dark theme, or override tokens without
forking CSS:

```tsx
<DeckViewer
  deck={deck}
  theme={{
    mode: "light",
    tokens: {
      ground: "hsl(210 20% 97%)",
      border: "hsl(210 15% 15% / 0.14)",
    },
  }}
/>
```

For the exact house typography, expose Satoshi and Geist Mono through
`--font-satoshi` and `--font-geist-mono`; the package provides system fallbacks.

## SSR and Next.js

`DeckViewer`, the hooks, and all default components render with
`react-dom/server`. They do not read `window` or `document` during render.
Download browser APIs run only after a user clicks a toolbar action. Never import
`@runstamp/react/server` into a client component.

See [`examples/real-deck.tsx`](./examples/real-deck.tsx) for a three-slide,
renderable example.
