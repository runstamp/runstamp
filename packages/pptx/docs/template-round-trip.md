# PPTX template round trip

`@runstamp/pptx-pro` can inspect an existing editable PPTX, bind stable locators to slides
and designated objects, mutate approved text/brand slots, export deterministically, and verify OPC
relationships and semantic counts.

Designate a text shape by naming it `runstamp:slot:<id>` in PowerPoint's Selection Pane. Import the
template, apply `textSlots` or six-digit `themeColors`, and export the returned document. Shapes,
tables, charts, media, notes, comments, masters, layouts, themes, and inactive unknown parts outside
the mutation are retained as package parts rather than flattened.

The parser rejects encrypted packages, VBA, ActiveX, executable/OLE payloads, archive traversal,
dangling relationships, and configured resource limits. It never dereferences external
relationships. Unchanged timing XML is retained, but the API reports
`PPTX_ANIMATION_PRESERVATION_UNVERIFIED`; this is not a claim that arbitrary animations survive every
PowerPoint version.

```ts
import {
  exportPptxTemplate,
  importPptxTemplate,
  mutatePptxTemplate,
  verifyPptxTemplate,
} from "@runstamp/pptx-pro";

const imported = await importPptxTemplate(templateBytes);
const changed = await mutatePptxTemplate(imported, {
  textSlots: { executive_summary: "Approved narrative" },
  themeColors: { "0057B8": "003B73" },
});
const output = await exportPptxTemplate(changed);
const verdict = await verifyPptxTemplate(output.buffer, imported.inspection);
```
