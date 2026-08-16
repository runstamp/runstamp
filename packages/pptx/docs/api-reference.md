# API Reference

Complete reference for the `@runstamp/pptx` public API.

The hosted runtime uses `sourceSchema: "protocol_v2"`. This package is the local PPTX renderer and also keeps the legacy `AgentDocument` helpers for older integrations.

---

## Engine

### `PaperEngine.render(doc, options?)`

Renders a `PaperDocument` to a `.pptx` file buffer.

```typescript docs-verify=render
import { PaperEngine } from "@runstamp/pptx";

const buffer: Buffer = await PaperEngine.render(doc);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `doc` | `PaperDocument` | The document AST to render. |
| `options.signal` | `AbortSignal` | Optional abort signal to cancel rendering. |
| `options.onProgress` | `(slideIndex: number, totalSlides: number) => void` | Optional progress callback, invoked after each slide is processed. |

**Returns:** `Promise<Buffer>` -- a valid `.pptx` file as a Node.js Buffer.

**Throws:** `PaperError` with structured error codes (see Error Handling below).

---

## Legacy Semantic Compatibility

### `compileAgentDocument(agentDoc)`

Compiles a legacy semantic `AgentDocument` into a `PaperDocument` that `@runstamp/pptx` can render locally.

```typescript docs-verify=render
import { compileAgentDocument, PaperEngine } from "@runstamp/pptx";

const paperDoc = compileAgentDocument({
  version: "1.0",
  presentationTitle: "Board Update",
  slides: [
    {
      pattern: "bullets",
      content: {
        title: "Executive Summary",
        bulletPoints: ["Revenue accelerated in Q2."],
      },
    },
  ],
});

const buffer = await PaperEngine.render(paperDoc);
```

This compatibility layer exists for older integrations. New public integrations should prefer the hosted `protocol_v2` contract and keep this package for local PPTX rendering.
Pass `compileAgentDocument(agentDoc, { layoutValidation: "warn" | "error" | "off" })` to enable the synchronous layout sanity pass, and use top-level `designTokens.scale`, `designTokens.density`, and `designTokens.shape` for broad preset-level steering before atomic overrides.

---

### `PaperEngine.renderStream(doc, options?)`

Streaming variant of `render`. Returns a readable stream instead of buffering the entire file in memory. Useful for large presentations or HTTP response piping.

```typescript docs-verify=render
import { PaperEngine } from "@runstamp/pptx";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const stream = await PaperEngine.renderStream(doc);
await pipeline(stream, createWriteStream("output.pptx"));
```

**Parameters:** Same as `PaperEngine.render`.

**Returns:** `Promise<Readable>` -- a Node.js readable stream of the `.pptx` file.

---

### `compileAgentDocument(agentDoc, options?)`

Compiles a semantic `AgentDocument` into a `PaperDocument`.

```typescript docs-verify=parse
import { compileAgentDocument } from "@runstamp/pptx";

const paperDoc = compileAgentDocument({
  version: "1.0",
  presentationTitle: "My Deck",
  slides: [
    {
      pattern: "title",
      content: { title: "Welcome", subtitle: "A presentation" },
    },
  ],
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentDoc` | `AgentDocument` | Legacy semantic document description. Validated against `AgentDocumentSchema` (Zod). |
| `options.layoutValidation` | `"off" \| "warn" \| "error"` | Optional synchronous sanity pass for likely overflow, clipping, and absolute-position collisions. Defaults to `"warn"`. |
| `options.onLayoutWarning` | `(warning) => void` | Optional callback for each emitted `AgentLayoutWarning`. |

**Returns:** `PaperDocument`

---

### `applyElasticPagination(doc, options?)`

Automatically splits slides that exceed the available space into multiple slides. Useful when content length is unpredictable (for example, LLM-generated bullet lists).

```typescript docs-verify=parse
import { applyElasticPagination } from "@runstamp/pptx";

const paginated = applyElasticPagination(paperDoc);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `doc` | `PaperDocument` | Document to paginate. |
| `options` | `SlideSplitOptions` | Optional configuration for split behavior. |

**Returns:** `PaperDocument` with slides split as needed.

---

### Pattern Builders

Individual pattern builders for constructing slides programmatically:

| Function | Description |
|----------|-------------|
| `buildTitleLayout(slide)` | Title slide with centered title and subtitle. |
| `buildStatementLayout(slide)` | Full-bleed statement or quote slide. |
| `buildDashboardLayout(slide)` | KPI dashboard with metrics and optional chart. |
| `buildComparisonLayout(slide)` | Side-by-side comparison layout. |
| `buildChartFocusLayout(slide)` | Chart-centered layout with title. |
| `buildBulletsLayout(slide)` | Bullet point list layout. |
| `agentChartToChartData(chart)` | Converts an AgentDocument chart definition to `ChartData`. |

---

## Typography

### `loadFont(family, buffer)`

Registers a font file for text measurement. Call before `PaperEngine.render` to enable accurate line breaking and text sizing for that font family.

```typescript docs-verify=skip docs-verify-reason="font registration side-effect example"
import { loadFont } from "@runstamp/pptx";
import { readFileSync } from "node:fs";

loadFont("Inter", readFileSync("./fonts/Inter-Regular.ttf"));
```

The engine detects bold, italic, and bold-italic variants automatically from the font metadata.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `family` | `string` | Font family name (e.g., `"Inter"`, `"Roboto"`). |
| `buffer` | `Buffer` | Raw font file contents (TTF or OTF). |

---

### `getFont(family)`

Returns the fontkit font object for a previously loaded family. Throws if the font has not been loaded.

---

### `clearFontCache()`

Removes all loaded fonts from memory. Call this to release resources in long-running processes.

---

### `calculateTextMetrics(text, style)`

Measures text dimensions using loaded fonts (or fallback metrics if no matching font is loaded).

**Returns:** `TextMetrics` with `width` and `height` in pixels.

---

## Diagrams

### `generateDiagram(config)`

Generates a SmartArt-like diagram as a `PaperGroup` node that can be placed on any slide.

```typescript docs-verify=parse
import { generateDiagram } from "@runstamp/pptx";

const diagram = generateDiagram({
  type: "process",
  items: [
    { label: "Step 1", description: "Gather requirements" },
    { label: "Step 2", description: "Design system" },
    { label: "Step 3", description: "Implement" },
  ],
  style: { primaryColor: "#2563EB" },
});
```

**Supported diagram types:** `process`, `hierarchy`, `cycle`, `matrix`, `pyramid`, `list`

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.type` | `string` | Diagram type (see above). |
| `config.items` | `DiagramItem[]` | Array of items with `label` and optional `description`. |
| `config.style` | `DiagramStyle` | Optional styling (colors, dimensions). |

**Returns:** `PaperGroup` -- a group node containing the diagram shapes and text.

> **Note:** This API is experimental and subject to change.

---

## Validation

### `PaperDocumentSchema`

Zod schema for validating a `PaperDocument`. Use it to validate input before rendering:

```typescript docs-verify=parse
import { PaperDocumentSchema } from "@runstamp/pptx";

const result = PaperDocumentSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.issues);
}
```

Also exported: `PaperSlideSchema`, `PaperNodeSchema`.

---

## Document Types

### `PaperDocument`

The top-level document object.

```typescript docs-verify=skip docs-verify-reason="interface definition"
interface PaperDocument {
  slides: PaperSlide[];
  slideSize?: SlideSize;          // { width, height } in pixels (default: 1280x720)
  metadata?: {
    title?: string;
    subject?: string;
    creator?: string;
    description?: string;
    lastModifiedBy?: string;
    revision?: number;
    category?: string;
    keywords?: string;
  };
  theme?: ThemeConfig;
  protection?: DocumentProtection;
  customShows?: CustomShow[];
  sections?: SlideSection[];
  printSettings?: PrintSettings;
  customProperties?: CustomProperty[];
  fontEmbed?: FontEmbedConfig;
}
```

### `PaperSlide`

A single slide within the document.

```typescript docs-verify=skip docs-verify-reason="interface definition"
interface PaperSlide {
  children: PaperNode[];
  background?: SlideBackground;
  speakerNotes?: string;
  hidden?: boolean;
  transition?: SlideTransition;
  headerFooter?: HeaderFooter;
  comments?: SlideComment[];
}
```

### `PaperNode`

Union of all node types that can appear as slide children:

```
PaperNode = PaperView | PaperText | PaperImage | PaperTable
          | PaperChart | PaperGroup | PaperConnector
          | PaperVideo | PaperAudio
```

---

## Node Types

### `PaperText`

A text element with rich formatting.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Text",
  text?: string,              // Simple text content
  paragraphs?: Paragraph[],   // Rich text with multiple runs
  style?: FlexStyle & TextStyle,
}
```

Use `text` for simple strings. Use `paragraphs` for mixed formatting (bold, italic, colors, hyperlinks) within the same text box.

### `PaperView`

A rectangle or shape container. Supports fills, borders, effects, and child nodes for flexbox layout.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "View",
  style?: FlexStyle,
  shape?: ShapeType,           // "rect", "ellipse", "roundRect", etc.
  children?: PaperNode[],
  fill?: Fill,
  effects?: Effects,
}
```

### `PaperImage`

An image element. Accepts base64 data URLs or HTTPS URLs.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Image",
  src: string,
  style?: FlexStyle,
  altText?: string,
  crop?: ImageCrop,
  imageEffects?: ImageEffects,
}
```

### `PaperChart`

An editable chart with an embedded Excel workbook. See [chart-types.md](chart-types.md) for full details.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Chart",
  chartData: ChartData,
  style?: FlexStyle,
}
```

### `PaperTable`

A table with header styling, alternating row colors, and borders.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Table",
  tableData: TableData,
  style?: FlexStyle,
}
```

### `PaperGroup`

A group container for composing multiple shapes into a single unit.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Group",
  children: PaperNode[],
  style?: FlexStyle,
}
```

### `PaperConnector`

A connector line between two shapes.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Connector",
  style?: FlexStyle,
  connectorType?: ConnectorShape,
  startArrow?: ArrowHeadConfig,
  endArrow?: ArrowHeadConfig,
}
```

### `PaperVideo` / `PaperAudio`

Embedded media elements.

```typescript docs-verify=skip docs-verify-reason="type-shape snippet"
{
  type: "Video",  // or "Audio"
  src: string,
  style?: FlexStyle,
  poster?: string,    // Video only: poster image URL
}
```

---

## FlexStyle

All nodes accept a `style` object based on Yoga flexbox layout:

```typescript docs-verify=skip docs-verify-reason="interface definition"
interface FlexStyle {
  x?: number;              // Absolute left position (pixels)
  y?: number;              // Absolute top position (pixels)
  width?: Dimension;       // Width in pixels or percentage
  height?: Dimension;      // Height in pixels or percentage
  flexDirection?: "row" | "column";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  padding?: number;
  margin?: number;
  gap?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  backgroundColor?: string;
  opacity?: number;
  rotation?: number;       // Degrees
  zIndex?: number;
  // ... and more (see TypeScript definitions for full list)
}
```

---

## Error Handling

All engine errors throw `PaperError` with structured metadata:

```typescript docs-verify=skip docs-verify-reason="control-flow example"
import { PaperError } from "@runstamp/pptx";

try {
  await PaperEngine.render(doc);
} catch (err) {
  if (err instanceof PaperError) {
    console.error(err.code);   // e.g., "RENDER_CANCELLED", "VALIDATION_ERROR"
    console.error(err.phase);  // "validation" | "layout" | "render" | "zip"
  }
}
```

---

## Configuration

### `setDeterministicMode(enabled)`

Enables deterministic output (stable timestamps, UUIDs). Useful for testing and snapshot comparisons.

### `setLogger(logger)`

Replaces the default logger. The logger interface requires `info`, `warn`, and `error` methods.

### `withContext(options, fn)`

Runs a render operation with isolated per-request state (font cache, logger, configuration). Required for concurrent rendering in server environments.

```typescript docs-verify=render
import { withContext, PaperEngine } from "@runstamp/pptx";

const buffer = await withContext({ deterministic: true }, () =>
  PaperEngine.render(doc)
);
```
