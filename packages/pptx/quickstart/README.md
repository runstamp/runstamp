# Declarative PPTX quickstart

From the repository root:

```bash
pnpm --filter @runstamp/pptx build
node packages/lite/quickstart/pptx.mjs ./board-review.pptx
```

The script calls the high-level `render(document, options?)` API, which validates
coordinate-free JSON, compiles it through the existing `PresentationSpec` and
primitive pipeline, and writes a native editable PPTX.
