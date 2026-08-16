# Upgrading from @runstamp/pptx to @runstamp/pptx-pro

`@runstamp/pptx-pro` is the paid PPTX package for production workloads. The core API stays aligned with `@runstamp/pptx`, so most upgrades are a package-name change plus commercial licensing.

## When to Upgrade

Consider upgrading when you need any of the following:

- **Template-based rendering** -- apply your slides to an existing `.pptx` template with master slides, layouts, and branding.
- **Advanced chart types** -- waterfall, combo, treemap, sunburst, funnel, radar, bubble, stock, histogram, box-whisker.
- **HarfBuzz text shaping** -- WASM-powered text shaping for complex scripts (Arabic, Devanagari, Thai, CJK vertical text).
- **Knuth-Plass line breaking** -- typographically optimal paragraph layout instead of greedy line breaking.
- **Auto-fit text** -- automatically shrink or grow text to fit its container, matching PowerPoint's native auto-fit behavior.
- **Merged table cells** -- `rowSpan` and `colSpan` support for complex table layouts.
- **Ghost grid layout** -- automatic slide grid layout for dashboard-style content.
- **Canvas preview rendering** -- server-side slide preview images (PNG/JPEG) via `@napi-rs/canvas`.
- **Per-request isolation** -- `RenderContext` with full `AsyncLocalStorage` support for concurrent server rendering.

## Installation

```bash
npm uninstall @runstamp/pptx
npm install @runstamp/pptx-pro
```

## Migration

Change your imports. No other code changes are required.

```diff
- import { PaperEngine, loadFont, compileAgentDocument } from "@runstamp/pptx";
+ import { PaperEngine, loadFont, compileAgentDocument } from "@runstamp/pptx-pro";
```

All types, functions, and behaviors from `@runstamp/pptx` are present in `@runstamp/pptx-pro`. Your existing code will work without modification.

## Feature Comparison

| Feature | @runstamp/pptx | @runstamp/pptx-pro |
|---------|---------------|----------------|
| Declarative JSON API | Yes | Yes |
| Flexbox layout (Yoga WASM) | Yes | Yes |
| Text with rich formatting | Yes | Yes |
| 40+ OOXML preset shapes | Yes | Yes |
| Tables with styling | Yes | Yes (+ merged cells) |
| Bar, line, pie, doughnut, scatter, area charts | Yes | Yes |
| Waterfall, combo, treemap, funnel, radar, bubble, stock, histogram | -- | Yes |
| Embedded Excel in charts | Yes | Yes |
| Images (base64 and HTTPS) | Yes | Yes |
| Video and audio embedding | Yes | Yes |
| Connectors | Yes | Yes |
| SmartArt-like diagrams (6 types) | Yes | Yes |
| AgentDocument (AI-friendly format) | Yes | Yes |
| Elastic pagination | Yes | Yes |
| Zod schema validation | Yes | Yes |
| Speaker notes, comments | Yes | Yes |
| Transitions and animations | Yes | Yes |
| Font-aware text measurement (fontkit) | Yes | Yes |
| HarfBuzz WASM text shaping | -- | Yes |
| Knuth-Plass line breaking | -- | Yes |
| Auto-fit text sizing | -- | Yes |
| Template-based rendering | -- | Yes |
| Multi-master/multi-theme templates | -- | Yes |
| Ghost grid layout | -- | Yes |
| Canvas preview rendering | -- | Yes |
| Per-request RenderContext | Basic | Full |
| License | Apache-2.0 | Commercial |

## Pricing

See [https://runstamp.com/pricing](https://runstamp.com/pricing) for current plans and pricing.
