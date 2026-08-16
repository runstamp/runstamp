# Lite Examples

Runnable examples for `@runstamp/pptx`.

- `basic-deck.ts` — minimal single-slide hello world
- `chart-slide.ts` — editable chart example
- `multi-slide.ts` — small multi-slide `PaperDocument`
- `full-report.ts` — larger business-report example
- `agent-document.ts` — legacy semantic compiler example
- `agent-theme-presets.ts` — renders one sample deck per built-in Agent preset, including `midnight`, `terminal`, and `editorial-wide`
- `modern-deck-paperdoc/` — canonical hand-rolled modern deck baseline with reusable helpers

Run any example from `packages/lite` after `pnpm build`, for example:

```bash
npx tsx examples/modern-deck-paperdoc/index.ts
```
