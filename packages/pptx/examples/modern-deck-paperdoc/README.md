# modern-deck-paperdoc

Canonical modern deck example built directly with `PaperDocument`.

Run it from `packages/lite` after building the workspace bundle:

```bash
npx tsx examples/modern-deck-paperdoc/index.ts
```

This example is the escape-hatch baseline for the Agent preset roadmap. It demonstrates:

- rounded `View` cards via `shapeType: "roundRect"` and `shapeAdjustments`
- card shadows through `style.effects.dropShadow`
- gradient accent treatments on KPI cards and slide chrome
- editable `Chart` nodes paired with hand-built card shells
- reusable helpers for KPI cards, bullets, rules, and footers

Use `deck.ts` when you want the reusable `PaperDocument` builder, `tokens.ts` for the shared visual system, and `helpers.ts` for small composition primitives.
