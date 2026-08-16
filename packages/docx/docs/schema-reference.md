# @runstamp/docx Schema Reference

This file is generated from exported Zod schemas in the package source. Do not edit it by hand.

## DocxDocument

**Export:** `DocxDocumentSchema`
**Expansion depth:** 4 levels

Structured DOCX document input for report, proposal, and contract rendering.

Deep recursive branches stay summarized on their nearest parent row so the generated reference remains navigable.

| Path | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `type` | literal "DocxDocument" | no | `"DocxDocument"` | — |
| `metadata` | object | no | — | — |
| `metadata.title` | string | no | — | — |
| `metadata.author` | string | no | — | — |
| `metadata.subject` | string | no | — | — |
| `metadata.keywords` | array<string> | no | — | — |
| `metadata.creator` | string | no | — | — |
| `metadata.custom` | record<string> | no | — | — |
| `metadata.language` | string | no | — | BCP 47 language tag (e.g. "en-US") — sets <w:lang> on all runs |
| `accessible` | boolean \| object | no | — | — |
| `accessible.level` | "A" \| "AA" \| "AAA" | no | `"AA"` | — |
| `accessible.language` | string | no | — | — |
| `accessible.title` | string | no | — | — |
| `accessible.enforceHeadingHierarchy` | boolean | no | — | — |
| `accessible.enforceTableHeaders` | boolean | no | — | — |
| `pageSize` | "a4" \| "letter" \| "legal" \| "a3" \| "a5" | no | `"a4"` | — |
| `orientation` | "portrait" \| "landscape" | no | `"portrait"` | — |
| `margins` | object | no | — | Points. Defaults: 72pt (1 inch) on all sides |
| `margins.top` | number | no | `0` | — |
| `margins.right` | number | no | `0` | — |
| `margins.bottom` | number | no | `0` | — |
| `margins.left` | number | no | `0` | — |
| `theme` | object | no | — | — |
| `theme.preset` | "corporate" \| "modern" \| "classic" \| "academic" \| "minimal" \| "dark" | no | — | — |
| `theme.colors` | object | no | — | — |
| `theme.colors.primary` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `theme.colors.secondary` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `theme.colors.accent` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `theme.colors.text` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `theme.colors.background` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `theme.fonts` | object | no | — | — |
| `theme.fonts.heading` | string | no | — | — |
| `theme.fonts.body` | string | no | — | — |
| `theme.fonts.monospace` | string | no | — | — |
| `template` | "blank" \| "letter" \| "report" \| "memo" \| "invoice" \| "proposal" \| ... (+4 more) | no | — | — |
| `tableOfContents` | boolean \| object | no | — | — |
| `tableOfContents.title` | string | no | — | — |
| `tableOfContents.maxLevel` | number | no | `3` | — |
| `tableOfContents.showPageNumbers` | boolean | no | — | — |
| `tableOfContents.hyperlinks` | boolean | no | — | — |
| `tableOfContents.leader` | "dot" \| "dash" \| "underscore" \| "none" | no | — | — |
| `tableOfContents.position` | "start" \| "after-cover" | no | — | — |
| `header` | object | no | — | Default header for all pages |
| `header.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `header.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `header.content[].level [type="heading"]` | number | yes | — | — |
| `header.content[].text [type="heading"]` | string | no | — | — |
| `header.content[].runs [type="heading"]` | array<object> | no | — | — |
| `header.content[].revision [type="heading"]` | object | no | — | — |
| `header.content[].revision.id [type="heading"]` | number | no | — | — |
| `header.content[].revision.author [type="heading"]` | string | no | — | — |
| `header.content[].revision.date [type="heading"]` | string | no | — | — |
| `header.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `header.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `header.content[].revision.before [type="heading"]` | object | no | — | — |
| `header.content[].comment [type="heading"]` | object | no | — | — |
| `header.content[].comment.id [type="heading"]` | number | no | — | — |
| `header.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `header.content[].comment.text [type="heading"]` | string | yes | — | — |
| `header.content[].comment.author [type="heading"]` | string | no | — | — |
| `header.content[].comment.initials [type="heading"]` | string | no | — | — |
| `header.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `header.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `header.content[].style [type="heading"]` | object | no | — | — |
| `header.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `header.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `header.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `header.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `header.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `header.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.content[].style.border [type="heading"]` | object | no | — | — |
| `header.content[].style.padding [type="heading"]` | object | no | — | — |
| `header.content[].style.margin [type="heading"]` | object | no | — | — |
| `header.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `header.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `header.content[].style.opacity [type="heading"]` | number | no | — | — |
| `header.content[].style.comment [type="heading"]` | object | no | — | — |
| `header.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `header.content[].footnote [type="heading"]` | string | no | — | — |
| `header.content[].endnote [type="heading"]` | string | no | — | — |
| `header.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `header.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `header.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `header.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `header.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `header.content[].indent [type="paragraph"]` | object | no | — | — |
| `header.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `header.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `header.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `header.content[].type [type="list"]` | literal "list" | yes | — | — |
| `header.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `header.content[].start [type="list"]` | number | no | `1` | — |
| `header.content[].items [type="list"]` | array<object> | yes | — | — |
| `header.content[].type [type="table"]` | literal "table" | yes | — | — |
| `header.content[].columns [type="table"]` | array<object> | no | — | — |
| `header.content[].rows [type="table"]` | array<object> | yes | — | — |
| `header.content[].caption [type="table"]` | string | no | — | — |
| `header.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `header.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `header.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `header.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `header.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `header.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `header.content[].type [type="image"]` | literal "image" | yes | — | — |
| `header.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `header.content[].alt [type="image"]` | string | no | — | — |
| `header.content[].width [type="image"]` | number | no | — | Points |
| `header.content[].height [type="image"]` | number | no | — | Points |
| `header.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `header.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `header.content[].floating [type="image"]` | object | no | — | — |
| `header.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `header.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `header.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `header.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `header.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `header.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `header.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `header.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `header.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `header.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `header.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `header.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `header.content[].title [type="chart"]` | string | no | — | — |
| `header.content[].series [type="chart"]` | array<object> | yes | — | — |
| `header.content[].categories [type="chart"]` | array<string> | no | — | — |
| `header.content[].legend [type="chart"]` | object | no | — | — |
| `header.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `header.content[].axes [type="chart"]` | object | no | — | — |
| `header.content[].axes.x [type="chart"]` | object | no | — | — |
| `header.content[].axes.y [type="chart"]` | object | no | — | — |
| `header.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `header.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `header.content[].width [type="shape"]` | number | yes | — | Points |
| `header.content[].height [type="shape"]` | number | yes | — | Points |
| `header.content[].fill [type="shape"]` | object | no | — | — |
| `header.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `header.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `header.content[].stroke [type="shape"]` | object | no | — | — |
| `header.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `header.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `header.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `header.content[].code [type="code-block"]` | string | yes | — | — |
| `header.content[].language [type="code-block"]` | string | no | — | — |
| `header.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `header.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `header.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `header.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `header.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.content[].thickness [type="divider"]` | number | no | — | — |
| `header.content[].type [type="container"]` | literal "container" | yes | — | — |
| `header.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `header.content[].columns [type="container"]` | number | no | — | For grid layout |
| `header.content[].gap [type="container"]` | number | no | — | Points between children |
| `header.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `header.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `header.text` | string | no | — | Simple text shorthand |
| `header.style` | object | no | — | — |
| `header.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.style.fontFamily` | string | no | — | — |
| `header.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `header.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `header.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `header.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `header.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.style.border` | object | no | — | — |
| `header.style.border.width` | number | no | `1` | — |
| `header.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `header.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `header.style.padding` | object | no | — | — |
| `header.style.padding.top` | number | no | `0` | — |
| `header.style.padding.right` | number | no | `0` | — |
| `header.style.padding.bottom` | number | no | `0` | — |
| `header.style.padding.left` | number | no | `0` | — |
| `header.style.margin` | object | no | — | — |
| `header.style.margin.top` | number | no | `0` | — |
| `header.style.margin.right` | number | no | `0` | — |
| `header.style.margin.bottom` | number | no | `0` | — |
| `header.style.margin.left` | number | no | `0` | — |
| `header.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `header.style.lineHeight` | number | no | — | — |
| `header.style.opacity` | number | no | — | — |
| `header.style.comment` | object | no | — | — |
| `header.style.comment.id` | number | no | — | — |
| `header.style.comment.parentId` | number | no | — | — |
| `header.style.comment.text` | string | yes | — | — |
| `header.style.comment.author` | string | no | — | — |
| `header.style.comment.initials` | string | no | — | — |
| `header.style.comment.date` | string \| date | no | — | — |
| `header.style.comment.done` | boolean | no | — | — |
| `header.includePageNumber` | boolean | no | — | — |
| `header.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `footer` | object | no | — | Default footer for all pages |
| `footer.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `footer.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `footer.content[].level [type="heading"]` | number | yes | — | — |
| `footer.content[].text [type="heading"]` | string | no | — | — |
| `footer.content[].runs [type="heading"]` | array<object> | no | — | — |
| `footer.content[].revision [type="heading"]` | object | no | — | — |
| `footer.content[].revision.id [type="heading"]` | number | no | — | — |
| `footer.content[].revision.author [type="heading"]` | string | no | — | — |
| `footer.content[].revision.date [type="heading"]` | string | no | — | — |
| `footer.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `footer.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `footer.content[].revision.before [type="heading"]` | object | no | — | — |
| `footer.content[].comment [type="heading"]` | object | no | — | — |
| `footer.content[].comment.id [type="heading"]` | number | no | — | — |
| `footer.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `footer.content[].comment.text [type="heading"]` | string | yes | — | — |
| `footer.content[].comment.author [type="heading"]` | string | no | — | — |
| `footer.content[].comment.initials [type="heading"]` | string | no | — | — |
| `footer.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `footer.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `footer.content[].style [type="heading"]` | object | no | — | — |
| `footer.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `footer.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `footer.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `footer.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `footer.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `footer.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.content[].style.border [type="heading"]` | object | no | — | — |
| `footer.content[].style.padding [type="heading"]` | object | no | — | — |
| `footer.content[].style.margin [type="heading"]` | object | no | — | — |
| `footer.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `footer.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `footer.content[].style.opacity [type="heading"]` | number | no | — | — |
| `footer.content[].style.comment [type="heading"]` | object | no | — | — |
| `footer.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `footer.content[].footnote [type="heading"]` | string | no | — | — |
| `footer.content[].endnote [type="heading"]` | string | no | — | — |
| `footer.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `footer.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `footer.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `footer.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `footer.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `footer.content[].indent [type="paragraph"]` | object | no | — | — |
| `footer.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `footer.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `footer.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `footer.content[].type [type="list"]` | literal "list" | yes | — | — |
| `footer.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `footer.content[].start [type="list"]` | number | no | `1` | — |
| `footer.content[].items [type="list"]` | array<object> | yes | — | — |
| `footer.content[].type [type="table"]` | literal "table" | yes | — | — |
| `footer.content[].columns [type="table"]` | array<object> | no | — | — |
| `footer.content[].rows [type="table"]` | array<object> | yes | — | — |
| `footer.content[].caption [type="table"]` | string | no | — | — |
| `footer.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `footer.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `footer.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `footer.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `footer.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `footer.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `footer.content[].type [type="image"]` | literal "image" | yes | — | — |
| `footer.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `footer.content[].alt [type="image"]` | string | no | — | — |
| `footer.content[].width [type="image"]` | number | no | — | Points |
| `footer.content[].height [type="image"]` | number | no | — | Points |
| `footer.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `footer.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `footer.content[].floating [type="image"]` | object | no | — | — |
| `footer.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `footer.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `footer.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `footer.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `footer.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `footer.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `footer.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `footer.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `footer.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `footer.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `footer.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `footer.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `footer.content[].title [type="chart"]` | string | no | — | — |
| `footer.content[].series [type="chart"]` | array<object> | yes | — | — |
| `footer.content[].categories [type="chart"]` | array<string> | no | — | — |
| `footer.content[].legend [type="chart"]` | object | no | — | — |
| `footer.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `footer.content[].axes [type="chart"]` | object | no | — | — |
| `footer.content[].axes.x [type="chart"]` | object | no | — | — |
| `footer.content[].axes.y [type="chart"]` | object | no | — | — |
| `footer.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `footer.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `footer.content[].width [type="shape"]` | number | yes | — | Points |
| `footer.content[].height [type="shape"]` | number | yes | — | Points |
| `footer.content[].fill [type="shape"]` | object | no | — | — |
| `footer.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `footer.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `footer.content[].stroke [type="shape"]` | object | no | — | — |
| `footer.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `footer.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `footer.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `footer.content[].code [type="code-block"]` | string | yes | — | — |
| `footer.content[].language [type="code-block"]` | string | no | — | — |
| `footer.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `footer.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `footer.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `footer.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `footer.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.content[].thickness [type="divider"]` | number | no | — | — |
| `footer.content[].type [type="container"]` | literal "container" | yes | — | — |
| `footer.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `footer.content[].columns [type="container"]` | number | no | — | For grid layout |
| `footer.content[].gap [type="container"]` | number | no | — | Points between children |
| `footer.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `footer.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `footer.text` | string | no | — | Simple text shorthand |
| `footer.style` | object | no | — | — |
| `footer.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.style.fontFamily` | string | no | — | — |
| `footer.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `footer.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `footer.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `footer.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `footer.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.style.border` | object | no | — | — |
| `footer.style.border.width` | number | no | `1` | — |
| `footer.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `footer.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `footer.style.padding` | object | no | — | — |
| `footer.style.padding.top` | number | no | `0` | — |
| `footer.style.padding.right` | number | no | `0` | — |
| `footer.style.padding.bottom` | number | no | `0` | — |
| `footer.style.padding.left` | number | no | `0` | — |
| `footer.style.margin` | object | no | — | — |
| `footer.style.margin.top` | number | no | `0` | — |
| `footer.style.margin.right` | number | no | `0` | — |
| `footer.style.margin.bottom` | number | no | `0` | — |
| `footer.style.margin.left` | number | no | `0` | — |
| `footer.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `footer.style.lineHeight` | number | no | — | — |
| `footer.style.opacity` | number | no | — | — |
| `footer.style.comment` | object | no | — | — |
| `footer.style.comment.id` | number | no | — | — |
| `footer.style.comment.parentId` | number | no | — | — |
| `footer.style.comment.text` | string | yes | — | — |
| `footer.style.comment.author` | string | no | — | — |
| `footer.style.comment.initials` | string | no | — | — |
| `footer.style.comment.date` | string \| date | no | — | — |
| `footer.style.comment.done` | boolean | no | — | — |
| `footer.includePageNumber` | boolean | no | — | — |
| `footer.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `differentFirstPage` | boolean | no | — | Use different header/footer on first page |
| `firstPageHeader` | object | no | — | — |
| `firstPageHeader.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `firstPageHeader.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `firstPageHeader.content[].level [type="heading"]` | number | yes | — | — |
| `firstPageHeader.content[].text [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].runs [type="heading"]` | array<object> | no | — | — |
| `firstPageHeader.content[].revision [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].revision.id [type="heading"]` | number | no | — | — |
| `firstPageHeader.content[].revision.author [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].revision.date [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `firstPageHeader.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].revision.before [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].comment [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].comment.id [type="heading"]` | number | no | — | — |
| `firstPageHeader.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `firstPageHeader.content[].comment.text [type="heading"]` | string | yes | — | — |
| `firstPageHeader.content[].comment.author [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].comment.initials [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `firstPageHeader.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `firstPageHeader.content[].style [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `firstPageHeader.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `firstPageHeader.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `firstPageHeader.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `firstPageHeader.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.content[].style.border [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].style.padding [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].style.margin [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `firstPageHeader.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `firstPageHeader.content[].style.opacity [type="heading"]` | number | no | — | — |
| `firstPageHeader.content[].style.comment [type="heading"]` | object | no | — | — |
| `firstPageHeader.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `firstPageHeader.content[].footnote [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].endnote [type="heading"]` | string | no | — | — |
| `firstPageHeader.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `firstPageHeader.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `firstPageHeader.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `firstPageHeader.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `firstPageHeader.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `firstPageHeader.content[].indent [type="paragraph"]` | object | no | — | — |
| `firstPageHeader.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `firstPageHeader.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `firstPageHeader.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `firstPageHeader.content[].type [type="list"]` | literal "list" | yes | — | — |
| `firstPageHeader.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `firstPageHeader.content[].start [type="list"]` | number | no | `1` | — |
| `firstPageHeader.content[].items [type="list"]` | array<object> | yes | — | — |
| `firstPageHeader.content[].type [type="table"]` | literal "table" | yes | — | — |
| `firstPageHeader.content[].columns [type="table"]` | array<object> | no | — | — |
| `firstPageHeader.content[].rows [type="table"]` | array<object> | yes | — | — |
| `firstPageHeader.content[].caption [type="table"]` | string | no | — | — |
| `firstPageHeader.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `firstPageHeader.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `firstPageHeader.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `firstPageHeader.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `firstPageHeader.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `firstPageHeader.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `firstPageHeader.content[].type [type="image"]` | literal "image" | yes | — | — |
| `firstPageHeader.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `firstPageHeader.content[].alt [type="image"]` | string | no | — | — |
| `firstPageHeader.content[].width [type="image"]` | number | no | — | Points |
| `firstPageHeader.content[].height [type="image"]` | number | no | — | Points |
| `firstPageHeader.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `firstPageHeader.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `firstPageHeader.content[].floating [type="image"]` | object | no | — | — |
| `firstPageHeader.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `firstPageHeader.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `firstPageHeader.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `firstPageHeader.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `firstPageHeader.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `firstPageHeader.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `firstPageHeader.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `firstPageHeader.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `firstPageHeader.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `firstPageHeader.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `firstPageHeader.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `firstPageHeader.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `firstPageHeader.content[].title [type="chart"]` | string | no | — | — |
| `firstPageHeader.content[].series [type="chart"]` | array<object> | yes | — | — |
| `firstPageHeader.content[].categories [type="chart"]` | array<string> | no | — | — |
| `firstPageHeader.content[].legend [type="chart"]` | object | no | — | — |
| `firstPageHeader.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `firstPageHeader.content[].axes [type="chart"]` | object | no | — | — |
| `firstPageHeader.content[].axes.x [type="chart"]` | object | no | — | — |
| `firstPageHeader.content[].axes.y [type="chart"]` | object | no | — | — |
| `firstPageHeader.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `firstPageHeader.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `firstPageHeader.content[].width [type="shape"]` | number | yes | — | Points |
| `firstPageHeader.content[].height [type="shape"]` | number | yes | — | Points |
| `firstPageHeader.content[].fill [type="shape"]` | object | no | — | — |
| `firstPageHeader.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `firstPageHeader.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `firstPageHeader.content[].stroke [type="shape"]` | object | no | — | — |
| `firstPageHeader.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `firstPageHeader.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `firstPageHeader.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `firstPageHeader.content[].code [type="code-block"]` | string | yes | — | — |
| `firstPageHeader.content[].language [type="code-block"]` | string | no | — | — |
| `firstPageHeader.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `firstPageHeader.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `firstPageHeader.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `firstPageHeader.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `firstPageHeader.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.content[].thickness [type="divider"]` | number | no | — | — |
| `firstPageHeader.content[].type [type="container"]` | literal "container" | yes | — | — |
| `firstPageHeader.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `firstPageHeader.content[].columns [type="container"]` | number | no | — | For grid layout |
| `firstPageHeader.content[].gap [type="container"]` | number | no | — | Points between children |
| `firstPageHeader.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `firstPageHeader.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `firstPageHeader.text` | string | no | — | Simple text shorthand |
| `firstPageHeader.style` | object | no | — | — |
| `firstPageHeader.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.style.fontFamily` | string | no | — | — |
| `firstPageHeader.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `firstPageHeader.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `firstPageHeader.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `firstPageHeader.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `firstPageHeader.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.style.border` | object | no | — | — |
| `firstPageHeader.style.border.width` | number | no | `1` | — |
| `firstPageHeader.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageHeader.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `firstPageHeader.style.padding` | object | no | — | — |
| `firstPageHeader.style.padding.top` | number | no | `0` | — |
| `firstPageHeader.style.padding.right` | number | no | `0` | — |
| `firstPageHeader.style.padding.bottom` | number | no | `0` | — |
| `firstPageHeader.style.padding.left` | number | no | `0` | — |
| `firstPageHeader.style.margin` | object | no | — | — |
| `firstPageHeader.style.margin.top` | number | no | `0` | — |
| `firstPageHeader.style.margin.right` | number | no | `0` | — |
| `firstPageHeader.style.margin.bottom` | number | no | `0` | — |
| `firstPageHeader.style.margin.left` | number | no | `0` | — |
| `firstPageHeader.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `firstPageHeader.style.lineHeight` | number | no | — | — |
| `firstPageHeader.style.opacity` | number | no | — | — |
| `firstPageHeader.style.comment` | object | no | — | — |
| `firstPageHeader.style.comment.id` | number | no | — | — |
| `firstPageHeader.style.comment.parentId` | number | no | — | — |
| `firstPageHeader.style.comment.text` | string | yes | — | — |
| `firstPageHeader.style.comment.author` | string | no | — | — |
| `firstPageHeader.style.comment.initials` | string | no | — | — |
| `firstPageHeader.style.comment.date` | string \| date | no | — | — |
| `firstPageHeader.style.comment.done` | boolean | no | — | — |
| `firstPageHeader.includePageNumber` | boolean | no | — | — |
| `firstPageHeader.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `firstPageFooter` | object | no | — | — |
| `firstPageFooter.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `firstPageFooter.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `firstPageFooter.content[].level [type="heading"]` | number | yes | — | — |
| `firstPageFooter.content[].text [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].runs [type="heading"]` | array<object> | no | — | — |
| `firstPageFooter.content[].revision [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].revision.id [type="heading"]` | number | no | — | — |
| `firstPageFooter.content[].revision.author [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].revision.date [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `firstPageFooter.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].revision.before [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].comment [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].comment.id [type="heading"]` | number | no | — | — |
| `firstPageFooter.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `firstPageFooter.content[].comment.text [type="heading"]` | string | yes | — | — |
| `firstPageFooter.content[].comment.author [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].comment.initials [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `firstPageFooter.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `firstPageFooter.content[].style [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `firstPageFooter.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `firstPageFooter.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `firstPageFooter.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `firstPageFooter.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.content[].style.border [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].style.padding [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].style.margin [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `firstPageFooter.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `firstPageFooter.content[].style.opacity [type="heading"]` | number | no | — | — |
| `firstPageFooter.content[].style.comment [type="heading"]` | object | no | — | — |
| `firstPageFooter.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `firstPageFooter.content[].footnote [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].endnote [type="heading"]` | string | no | — | — |
| `firstPageFooter.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `firstPageFooter.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `firstPageFooter.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `firstPageFooter.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `firstPageFooter.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `firstPageFooter.content[].indent [type="paragraph"]` | object | no | — | — |
| `firstPageFooter.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `firstPageFooter.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `firstPageFooter.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `firstPageFooter.content[].type [type="list"]` | literal "list" | yes | — | — |
| `firstPageFooter.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `firstPageFooter.content[].start [type="list"]` | number | no | `1` | — |
| `firstPageFooter.content[].items [type="list"]` | array<object> | yes | — | — |
| `firstPageFooter.content[].type [type="table"]` | literal "table" | yes | — | — |
| `firstPageFooter.content[].columns [type="table"]` | array<object> | no | — | — |
| `firstPageFooter.content[].rows [type="table"]` | array<object> | yes | — | — |
| `firstPageFooter.content[].caption [type="table"]` | string | no | — | — |
| `firstPageFooter.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `firstPageFooter.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `firstPageFooter.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `firstPageFooter.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `firstPageFooter.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `firstPageFooter.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `firstPageFooter.content[].type [type="image"]` | literal "image" | yes | — | — |
| `firstPageFooter.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `firstPageFooter.content[].alt [type="image"]` | string | no | — | — |
| `firstPageFooter.content[].width [type="image"]` | number | no | — | Points |
| `firstPageFooter.content[].height [type="image"]` | number | no | — | Points |
| `firstPageFooter.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `firstPageFooter.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `firstPageFooter.content[].floating [type="image"]` | object | no | — | — |
| `firstPageFooter.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `firstPageFooter.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `firstPageFooter.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `firstPageFooter.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `firstPageFooter.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `firstPageFooter.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `firstPageFooter.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `firstPageFooter.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `firstPageFooter.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `firstPageFooter.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `firstPageFooter.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `firstPageFooter.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `firstPageFooter.content[].title [type="chart"]` | string | no | — | — |
| `firstPageFooter.content[].series [type="chart"]` | array<object> | yes | — | — |
| `firstPageFooter.content[].categories [type="chart"]` | array<string> | no | — | — |
| `firstPageFooter.content[].legend [type="chart"]` | object | no | — | — |
| `firstPageFooter.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `firstPageFooter.content[].axes [type="chart"]` | object | no | — | — |
| `firstPageFooter.content[].axes.x [type="chart"]` | object | no | — | — |
| `firstPageFooter.content[].axes.y [type="chart"]` | object | no | — | — |
| `firstPageFooter.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `firstPageFooter.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `firstPageFooter.content[].width [type="shape"]` | number | yes | — | Points |
| `firstPageFooter.content[].height [type="shape"]` | number | yes | — | Points |
| `firstPageFooter.content[].fill [type="shape"]` | object | no | — | — |
| `firstPageFooter.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `firstPageFooter.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `firstPageFooter.content[].stroke [type="shape"]` | object | no | — | — |
| `firstPageFooter.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `firstPageFooter.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `firstPageFooter.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `firstPageFooter.content[].code [type="code-block"]` | string | yes | — | — |
| `firstPageFooter.content[].language [type="code-block"]` | string | no | — | — |
| `firstPageFooter.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `firstPageFooter.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `firstPageFooter.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `firstPageFooter.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `firstPageFooter.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.content[].thickness [type="divider"]` | number | no | — | — |
| `firstPageFooter.content[].type [type="container"]` | literal "container" | yes | — | — |
| `firstPageFooter.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `firstPageFooter.content[].columns [type="container"]` | number | no | — | For grid layout |
| `firstPageFooter.content[].gap [type="container"]` | number | no | — | Points between children |
| `firstPageFooter.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `firstPageFooter.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `firstPageFooter.text` | string | no | — | Simple text shorthand |
| `firstPageFooter.style` | object | no | — | — |
| `firstPageFooter.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.style.fontFamily` | string | no | — | — |
| `firstPageFooter.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `firstPageFooter.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `firstPageFooter.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `firstPageFooter.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `firstPageFooter.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.style.border` | object | no | — | — |
| `firstPageFooter.style.border.width` | number | no | `1` | — |
| `firstPageFooter.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `firstPageFooter.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `firstPageFooter.style.padding` | object | no | — | — |
| `firstPageFooter.style.padding.top` | number | no | `0` | — |
| `firstPageFooter.style.padding.right` | number | no | `0` | — |
| `firstPageFooter.style.padding.bottom` | number | no | `0` | — |
| `firstPageFooter.style.padding.left` | number | no | `0` | — |
| `firstPageFooter.style.margin` | object | no | — | — |
| `firstPageFooter.style.margin.top` | number | no | `0` | — |
| `firstPageFooter.style.margin.right` | number | no | `0` | — |
| `firstPageFooter.style.margin.bottom` | number | no | `0` | — |
| `firstPageFooter.style.margin.left` | number | no | `0` | — |
| `firstPageFooter.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `firstPageFooter.style.lineHeight` | number | no | — | — |
| `firstPageFooter.style.opacity` | number | no | — | — |
| `firstPageFooter.style.comment` | object | no | — | — |
| `firstPageFooter.style.comment.id` | number | no | — | — |
| `firstPageFooter.style.comment.parentId` | number | no | — | — |
| `firstPageFooter.style.comment.text` | string | yes | — | — |
| `firstPageFooter.style.comment.author` | string | no | — | — |
| `firstPageFooter.style.comment.initials` | string | no | — | — |
| `firstPageFooter.style.comment.date` | string \| date | no | — | — |
| `firstPageFooter.style.comment.done` | boolean | no | — | — |
| `firstPageFooter.includePageNumber` | boolean | no | — | — |
| `firstPageFooter.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `oddPageHeader` | object | no | — | — |
| `oddPageHeader.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `oddPageHeader.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `oddPageHeader.content[].level [type="heading"]` | number | yes | — | — |
| `oddPageHeader.content[].text [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].runs [type="heading"]` | array<object> | no | — | — |
| `oddPageHeader.content[].revision [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].revision.id [type="heading"]` | number | no | — | — |
| `oddPageHeader.content[].revision.author [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].revision.date [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `oddPageHeader.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].revision.before [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].comment [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].comment.id [type="heading"]` | number | no | — | — |
| `oddPageHeader.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `oddPageHeader.content[].comment.text [type="heading"]` | string | yes | — | — |
| `oddPageHeader.content[].comment.author [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].comment.initials [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `oddPageHeader.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `oddPageHeader.content[].style [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `oddPageHeader.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `oddPageHeader.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `oddPageHeader.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `oddPageHeader.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.content[].style.border [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].style.padding [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].style.margin [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `oddPageHeader.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `oddPageHeader.content[].style.opacity [type="heading"]` | number | no | — | — |
| `oddPageHeader.content[].style.comment [type="heading"]` | object | no | — | — |
| `oddPageHeader.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `oddPageHeader.content[].footnote [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].endnote [type="heading"]` | string | no | — | — |
| `oddPageHeader.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `oddPageHeader.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `oddPageHeader.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `oddPageHeader.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `oddPageHeader.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `oddPageHeader.content[].indent [type="paragraph"]` | object | no | — | — |
| `oddPageHeader.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `oddPageHeader.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `oddPageHeader.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `oddPageHeader.content[].type [type="list"]` | literal "list" | yes | — | — |
| `oddPageHeader.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `oddPageHeader.content[].start [type="list"]` | number | no | `1` | — |
| `oddPageHeader.content[].items [type="list"]` | array<object> | yes | — | — |
| `oddPageHeader.content[].type [type="table"]` | literal "table" | yes | — | — |
| `oddPageHeader.content[].columns [type="table"]` | array<object> | no | — | — |
| `oddPageHeader.content[].rows [type="table"]` | array<object> | yes | — | — |
| `oddPageHeader.content[].caption [type="table"]` | string | no | — | — |
| `oddPageHeader.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `oddPageHeader.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `oddPageHeader.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `oddPageHeader.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `oddPageHeader.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `oddPageHeader.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `oddPageHeader.content[].type [type="image"]` | literal "image" | yes | — | — |
| `oddPageHeader.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `oddPageHeader.content[].alt [type="image"]` | string | no | — | — |
| `oddPageHeader.content[].width [type="image"]` | number | no | — | Points |
| `oddPageHeader.content[].height [type="image"]` | number | no | — | Points |
| `oddPageHeader.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `oddPageHeader.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `oddPageHeader.content[].floating [type="image"]` | object | no | — | — |
| `oddPageHeader.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `oddPageHeader.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `oddPageHeader.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `oddPageHeader.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `oddPageHeader.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `oddPageHeader.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `oddPageHeader.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `oddPageHeader.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `oddPageHeader.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `oddPageHeader.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `oddPageHeader.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `oddPageHeader.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `oddPageHeader.content[].title [type="chart"]` | string | no | — | — |
| `oddPageHeader.content[].series [type="chart"]` | array<object> | yes | — | — |
| `oddPageHeader.content[].categories [type="chart"]` | array<string> | no | — | — |
| `oddPageHeader.content[].legend [type="chart"]` | object | no | — | — |
| `oddPageHeader.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `oddPageHeader.content[].axes [type="chart"]` | object | no | — | — |
| `oddPageHeader.content[].axes.x [type="chart"]` | object | no | — | — |
| `oddPageHeader.content[].axes.y [type="chart"]` | object | no | — | — |
| `oddPageHeader.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `oddPageHeader.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `oddPageHeader.content[].width [type="shape"]` | number | yes | — | Points |
| `oddPageHeader.content[].height [type="shape"]` | number | yes | — | Points |
| `oddPageHeader.content[].fill [type="shape"]` | object | no | — | — |
| `oddPageHeader.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `oddPageHeader.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `oddPageHeader.content[].stroke [type="shape"]` | object | no | — | — |
| `oddPageHeader.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `oddPageHeader.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `oddPageHeader.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `oddPageHeader.content[].code [type="code-block"]` | string | yes | — | — |
| `oddPageHeader.content[].language [type="code-block"]` | string | no | — | — |
| `oddPageHeader.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `oddPageHeader.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `oddPageHeader.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `oddPageHeader.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `oddPageHeader.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.content[].thickness [type="divider"]` | number | no | — | — |
| `oddPageHeader.content[].type [type="container"]` | literal "container" | yes | — | — |
| `oddPageHeader.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `oddPageHeader.content[].columns [type="container"]` | number | no | — | For grid layout |
| `oddPageHeader.content[].gap [type="container"]` | number | no | — | Points between children |
| `oddPageHeader.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `oddPageHeader.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `oddPageHeader.text` | string | no | — | Simple text shorthand |
| `oddPageHeader.style` | object | no | — | — |
| `oddPageHeader.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.style.fontFamily` | string | no | — | — |
| `oddPageHeader.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `oddPageHeader.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `oddPageHeader.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `oddPageHeader.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `oddPageHeader.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.style.border` | object | no | — | — |
| `oddPageHeader.style.border.width` | number | no | `1` | — |
| `oddPageHeader.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageHeader.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `oddPageHeader.style.padding` | object | no | — | — |
| `oddPageHeader.style.padding.top` | number | no | `0` | — |
| `oddPageHeader.style.padding.right` | number | no | `0` | — |
| `oddPageHeader.style.padding.bottom` | number | no | `0` | — |
| `oddPageHeader.style.padding.left` | number | no | `0` | — |
| `oddPageHeader.style.margin` | object | no | — | — |
| `oddPageHeader.style.margin.top` | number | no | `0` | — |
| `oddPageHeader.style.margin.right` | number | no | `0` | — |
| `oddPageHeader.style.margin.bottom` | number | no | `0` | — |
| `oddPageHeader.style.margin.left` | number | no | `0` | — |
| `oddPageHeader.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `oddPageHeader.style.lineHeight` | number | no | — | — |
| `oddPageHeader.style.opacity` | number | no | — | — |
| `oddPageHeader.style.comment` | object | no | — | — |
| `oddPageHeader.style.comment.id` | number | no | — | — |
| `oddPageHeader.style.comment.parentId` | number | no | — | — |
| `oddPageHeader.style.comment.text` | string | yes | — | — |
| `oddPageHeader.style.comment.author` | string | no | — | — |
| `oddPageHeader.style.comment.initials` | string | no | — | — |
| `oddPageHeader.style.comment.date` | string \| date | no | — | — |
| `oddPageHeader.style.comment.done` | boolean | no | — | — |
| `oddPageHeader.includePageNumber` | boolean | no | — | — |
| `oddPageHeader.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `oddPageFooter` | object | no | — | — |
| `oddPageFooter.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `oddPageFooter.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `oddPageFooter.content[].level [type="heading"]` | number | yes | — | — |
| `oddPageFooter.content[].text [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].runs [type="heading"]` | array<object> | no | — | — |
| `oddPageFooter.content[].revision [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].revision.id [type="heading"]` | number | no | — | — |
| `oddPageFooter.content[].revision.author [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].revision.date [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `oddPageFooter.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].revision.before [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].comment [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].comment.id [type="heading"]` | number | no | — | — |
| `oddPageFooter.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `oddPageFooter.content[].comment.text [type="heading"]` | string | yes | — | — |
| `oddPageFooter.content[].comment.author [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].comment.initials [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `oddPageFooter.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `oddPageFooter.content[].style [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `oddPageFooter.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `oddPageFooter.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `oddPageFooter.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `oddPageFooter.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.content[].style.border [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].style.padding [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].style.margin [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `oddPageFooter.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `oddPageFooter.content[].style.opacity [type="heading"]` | number | no | — | — |
| `oddPageFooter.content[].style.comment [type="heading"]` | object | no | — | — |
| `oddPageFooter.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `oddPageFooter.content[].footnote [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].endnote [type="heading"]` | string | no | — | — |
| `oddPageFooter.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `oddPageFooter.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `oddPageFooter.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `oddPageFooter.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `oddPageFooter.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `oddPageFooter.content[].indent [type="paragraph"]` | object | no | — | — |
| `oddPageFooter.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `oddPageFooter.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `oddPageFooter.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `oddPageFooter.content[].type [type="list"]` | literal "list" | yes | — | — |
| `oddPageFooter.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `oddPageFooter.content[].start [type="list"]` | number | no | `1` | — |
| `oddPageFooter.content[].items [type="list"]` | array<object> | yes | — | — |
| `oddPageFooter.content[].type [type="table"]` | literal "table" | yes | — | — |
| `oddPageFooter.content[].columns [type="table"]` | array<object> | no | — | — |
| `oddPageFooter.content[].rows [type="table"]` | array<object> | yes | — | — |
| `oddPageFooter.content[].caption [type="table"]` | string | no | — | — |
| `oddPageFooter.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `oddPageFooter.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `oddPageFooter.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `oddPageFooter.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `oddPageFooter.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `oddPageFooter.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `oddPageFooter.content[].type [type="image"]` | literal "image" | yes | — | — |
| `oddPageFooter.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `oddPageFooter.content[].alt [type="image"]` | string | no | — | — |
| `oddPageFooter.content[].width [type="image"]` | number | no | — | Points |
| `oddPageFooter.content[].height [type="image"]` | number | no | — | Points |
| `oddPageFooter.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `oddPageFooter.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `oddPageFooter.content[].floating [type="image"]` | object | no | — | — |
| `oddPageFooter.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `oddPageFooter.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `oddPageFooter.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `oddPageFooter.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `oddPageFooter.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `oddPageFooter.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `oddPageFooter.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `oddPageFooter.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `oddPageFooter.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `oddPageFooter.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `oddPageFooter.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `oddPageFooter.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `oddPageFooter.content[].title [type="chart"]` | string | no | — | — |
| `oddPageFooter.content[].series [type="chart"]` | array<object> | yes | — | — |
| `oddPageFooter.content[].categories [type="chart"]` | array<string> | no | — | — |
| `oddPageFooter.content[].legend [type="chart"]` | object | no | — | — |
| `oddPageFooter.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `oddPageFooter.content[].axes [type="chart"]` | object | no | — | — |
| `oddPageFooter.content[].axes.x [type="chart"]` | object | no | — | — |
| `oddPageFooter.content[].axes.y [type="chart"]` | object | no | — | — |
| `oddPageFooter.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `oddPageFooter.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `oddPageFooter.content[].width [type="shape"]` | number | yes | — | Points |
| `oddPageFooter.content[].height [type="shape"]` | number | yes | — | Points |
| `oddPageFooter.content[].fill [type="shape"]` | object | no | — | — |
| `oddPageFooter.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `oddPageFooter.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `oddPageFooter.content[].stroke [type="shape"]` | object | no | — | — |
| `oddPageFooter.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `oddPageFooter.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `oddPageFooter.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `oddPageFooter.content[].code [type="code-block"]` | string | yes | — | — |
| `oddPageFooter.content[].language [type="code-block"]` | string | no | — | — |
| `oddPageFooter.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `oddPageFooter.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `oddPageFooter.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `oddPageFooter.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `oddPageFooter.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.content[].thickness [type="divider"]` | number | no | — | — |
| `oddPageFooter.content[].type [type="container"]` | literal "container" | yes | — | — |
| `oddPageFooter.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `oddPageFooter.content[].columns [type="container"]` | number | no | — | For grid layout |
| `oddPageFooter.content[].gap [type="container"]` | number | no | — | Points between children |
| `oddPageFooter.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `oddPageFooter.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `oddPageFooter.text` | string | no | — | Simple text shorthand |
| `oddPageFooter.style` | object | no | — | — |
| `oddPageFooter.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.style.fontFamily` | string | no | — | — |
| `oddPageFooter.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `oddPageFooter.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `oddPageFooter.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `oddPageFooter.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `oddPageFooter.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.style.border` | object | no | — | — |
| `oddPageFooter.style.border.width` | number | no | `1` | — |
| `oddPageFooter.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `oddPageFooter.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `oddPageFooter.style.padding` | object | no | — | — |
| `oddPageFooter.style.padding.top` | number | no | `0` | — |
| `oddPageFooter.style.padding.right` | number | no | `0` | — |
| `oddPageFooter.style.padding.bottom` | number | no | `0` | — |
| `oddPageFooter.style.padding.left` | number | no | `0` | — |
| `oddPageFooter.style.margin` | object | no | — | — |
| `oddPageFooter.style.margin.top` | number | no | `0` | — |
| `oddPageFooter.style.margin.right` | number | no | `0` | — |
| `oddPageFooter.style.margin.bottom` | number | no | `0` | — |
| `oddPageFooter.style.margin.left` | number | no | `0` | — |
| `oddPageFooter.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `oddPageFooter.style.lineHeight` | number | no | — | — |
| `oddPageFooter.style.opacity` | number | no | — | — |
| `oddPageFooter.style.comment` | object | no | — | — |
| `oddPageFooter.style.comment.id` | number | no | — | — |
| `oddPageFooter.style.comment.parentId` | number | no | — | — |
| `oddPageFooter.style.comment.text` | string | yes | — | — |
| `oddPageFooter.style.comment.author` | string | no | — | — |
| `oddPageFooter.style.comment.initials` | string | no | — | — |
| `oddPageFooter.style.comment.date` | string \| date | no | — | — |
| `oddPageFooter.style.comment.done` | boolean | no | — | — |
| `oddPageFooter.includePageNumber` | boolean | no | — | — |
| `oddPageFooter.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `evenPageHeader` | object | no | — | — |
| `evenPageHeader.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `evenPageHeader.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `evenPageHeader.content[].level [type="heading"]` | number | yes | — | — |
| `evenPageHeader.content[].text [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].runs [type="heading"]` | array<object> | no | — | — |
| `evenPageHeader.content[].revision [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].revision.id [type="heading"]` | number | no | — | — |
| `evenPageHeader.content[].revision.author [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].revision.date [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `evenPageHeader.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].revision.before [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].comment [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].comment.id [type="heading"]` | number | no | — | — |
| `evenPageHeader.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `evenPageHeader.content[].comment.text [type="heading"]` | string | yes | — | — |
| `evenPageHeader.content[].comment.author [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].comment.initials [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `evenPageHeader.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `evenPageHeader.content[].style [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `evenPageHeader.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `evenPageHeader.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `evenPageHeader.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `evenPageHeader.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.content[].style.border [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].style.padding [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].style.margin [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `evenPageHeader.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `evenPageHeader.content[].style.opacity [type="heading"]` | number | no | — | — |
| `evenPageHeader.content[].style.comment [type="heading"]` | object | no | — | — |
| `evenPageHeader.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `evenPageHeader.content[].footnote [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].endnote [type="heading"]` | string | no | — | — |
| `evenPageHeader.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `evenPageHeader.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `evenPageHeader.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `evenPageHeader.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `evenPageHeader.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `evenPageHeader.content[].indent [type="paragraph"]` | object | no | — | — |
| `evenPageHeader.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `evenPageHeader.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `evenPageHeader.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `evenPageHeader.content[].type [type="list"]` | literal "list" | yes | — | — |
| `evenPageHeader.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `evenPageHeader.content[].start [type="list"]` | number | no | `1` | — |
| `evenPageHeader.content[].items [type="list"]` | array<object> | yes | — | — |
| `evenPageHeader.content[].type [type="table"]` | literal "table" | yes | — | — |
| `evenPageHeader.content[].columns [type="table"]` | array<object> | no | — | — |
| `evenPageHeader.content[].rows [type="table"]` | array<object> | yes | — | — |
| `evenPageHeader.content[].caption [type="table"]` | string | no | — | — |
| `evenPageHeader.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `evenPageHeader.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `evenPageHeader.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `evenPageHeader.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `evenPageHeader.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `evenPageHeader.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `evenPageHeader.content[].type [type="image"]` | literal "image" | yes | — | — |
| `evenPageHeader.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `evenPageHeader.content[].alt [type="image"]` | string | no | — | — |
| `evenPageHeader.content[].width [type="image"]` | number | no | — | Points |
| `evenPageHeader.content[].height [type="image"]` | number | no | — | Points |
| `evenPageHeader.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `evenPageHeader.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `evenPageHeader.content[].floating [type="image"]` | object | no | — | — |
| `evenPageHeader.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `evenPageHeader.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `evenPageHeader.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `evenPageHeader.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `evenPageHeader.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `evenPageHeader.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `evenPageHeader.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `evenPageHeader.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `evenPageHeader.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `evenPageHeader.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `evenPageHeader.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `evenPageHeader.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `evenPageHeader.content[].title [type="chart"]` | string | no | — | — |
| `evenPageHeader.content[].series [type="chart"]` | array<object> | yes | — | — |
| `evenPageHeader.content[].categories [type="chart"]` | array<string> | no | — | — |
| `evenPageHeader.content[].legend [type="chart"]` | object | no | — | — |
| `evenPageHeader.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `evenPageHeader.content[].axes [type="chart"]` | object | no | — | — |
| `evenPageHeader.content[].axes.x [type="chart"]` | object | no | — | — |
| `evenPageHeader.content[].axes.y [type="chart"]` | object | no | — | — |
| `evenPageHeader.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `evenPageHeader.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `evenPageHeader.content[].width [type="shape"]` | number | yes | — | Points |
| `evenPageHeader.content[].height [type="shape"]` | number | yes | — | Points |
| `evenPageHeader.content[].fill [type="shape"]` | object | no | — | — |
| `evenPageHeader.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `evenPageHeader.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `evenPageHeader.content[].stroke [type="shape"]` | object | no | — | — |
| `evenPageHeader.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `evenPageHeader.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `evenPageHeader.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `evenPageHeader.content[].code [type="code-block"]` | string | yes | — | — |
| `evenPageHeader.content[].language [type="code-block"]` | string | no | — | — |
| `evenPageHeader.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `evenPageHeader.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `evenPageHeader.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `evenPageHeader.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `evenPageHeader.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.content[].thickness [type="divider"]` | number | no | — | — |
| `evenPageHeader.content[].type [type="container"]` | literal "container" | yes | — | — |
| `evenPageHeader.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `evenPageHeader.content[].columns [type="container"]` | number | no | — | For grid layout |
| `evenPageHeader.content[].gap [type="container"]` | number | no | — | Points between children |
| `evenPageHeader.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `evenPageHeader.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `evenPageHeader.text` | string | no | — | Simple text shorthand |
| `evenPageHeader.style` | object | no | — | — |
| `evenPageHeader.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.style.fontFamily` | string | no | — | — |
| `evenPageHeader.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `evenPageHeader.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `evenPageHeader.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `evenPageHeader.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `evenPageHeader.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.style.border` | object | no | — | — |
| `evenPageHeader.style.border.width` | number | no | `1` | — |
| `evenPageHeader.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageHeader.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `evenPageHeader.style.padding` | object | no | — | — |
| `evenPageHeader.style.padding.top` | number | no | `0` | — |
| `evenPageHeader.style.padding.right` | number | no | `0` | — |
| `evenPageHeader.style.padding.bottom` | number | no | `0` | — |
| `evenPageHeader.style.padding.left` | number | no | `0` | — |
| `evenPageHeader.style.margin` | object | no | — | — |
| `evenPageHeader.style.margin.top` | number | no | `0` | — |
| `evenPageHeader.style.margin.right` | number | no | `0` | — |
| `evenPageHeader.style.margin.bottom` | number | no | `0` | — |
| `evenPageHeader.style.margin.left` | number | no | `0` | — |
| `evenPageHeader.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `evenPageHeader.style.lineHeight` | number | no | — | — |
| `evenPageHeader.style.opacity` | number | no | — | — |
| `evenPageHeader.style.comment` | object | no | — | — |
| `evenPageHeader.style.comment.id` | number | no | — | — |
| `evenPageHeader.style.comment.parentId` | number | no | — | — |
| `evenPageHeader.style.comment.text` | string | yes | — | — |
| `evenPageHeader.style.comment.author` | string | no | — | — |
| `evenPageHeader.style.comment.initials` | string | no | — | — |
| `evenPageHeader.style.comment.date` | string \| date | no | — | — |
| `evenPageHeader.style.comment.done` | boolean | no | — | — |
| `evenPageHeader.includePageNumber` | boolean | no | — | — |
| `evenPageHeader.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `evenPageFooter` | object | no | — | — |
| `evenPageFooter.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `evenPageFooter.content[].type [type="heading"]` | literal "heading" | yes | — | — |
| `evenPageFooter.content[].level [type="heading"]` | number | yes | — | — |
| `evenPageFooter.content[].text [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].runs [type="heading"]` | array<object> | no | — | — |
| `evenPageFooter.content[].revision [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].revision.id [type="heading"]` | number | no | — | — |
| `evenPageFooter.content[].revision.author [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].revision.date [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].revision.type [type="heading"]` | "insert" \| "delete" \| "property" \| "moveFrom" \| "moveTo" | yes | — | — |
| `evenPageFooter.content[].revision.moveName [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].revision.before [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].comment [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].comment.id [type="heading"]` | number | no | — | — |
| `evenPageFooter.content[].comment.parentId [type="heading"]` | number | no | — | — |
| `evenPageFooter.content[].comment.text [type="heading"]` | string | yes | — | — |
| `evenPageFooter.content[].comment.author [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].comment.initials [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].comment.date [type="heading"]` | string \| date | no | — | — |
| `evenPageFooter.content[].comment.done [type="heading"]` | boolean | no | — | — |
| `evenPageFooter.content[].style [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].style.color [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.content[].style.fontFamily [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].style.fontSize [type="heading"]` | custom | no | — | DOCX font size in positive finite points |
| `evenPageFooter.content[].style.fontWeight [type="heading"]` | "normal" \| "bold" \| number | no | — | — |
| `evenPageFooter.content[].style.fontStyle [type="heading"]` | "normal" \| "italic" | no | — | — |
| `evenPageFooter.content[].style.textDecoration [type="heading"]` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `evenPageFooter.content[].style.backgroundColor [type="heading"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.content[].style.border [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].style.padding [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].style.margin [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].style.textAlign [type="heading"]` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `evenPageFooter.content[].style.lineHeight [type="heading"]` | number | no | — | — |
| `evenPageFooter.content[].style.opacity [type="heading"]` | number | no | — | — |
| `evenPageFooter.content[].style.comment [type="heading"]` | object | no | — | — |
| `evenPageFooter.content[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `evenPageFooter.content[].footnote [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].endnote [type="heading"]` | string | no | — | — |
| `evenPageFooter.content[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `evenPageFooter.content[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `evenPageFooter.content[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `evenPageFooter.content[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `evenPageFooter.content[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `evenPageFooter.content[].indent [type="paragraph"]` | object | no | — | — |
| `evenPageFooter.content[].indent.firstLine [type="paragraph"]` | number | no | — | Points |
| `evenPageFooter.content[].indent.left [type="paragraph"]` | number | no | — | — |
| `evenPageFooter.content[].indent.right [type="paragraph"]` | number | no | — | — |
| `evenPageFooter.content[].type [type="list"]` | literal "list" | yes | — | — |
| `evenPageFooter.content[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `evenPageFooter.content[].start [type="list"]` | number | no | `1` | — |
| `evenPageFooter.content[].items [type="list"]` | array<object> | yes | — | — |
| `evenPageFooter.content[].type [type="table"]` | literal "table" | yes | — | — |
| `evenPageFooter.content[].columns [type="table"]` | array<object> | no | — | — |
| `evenPageFooter.content[].rows [type="table"]` | array<object> | yes | — | — |
| `evenPageFooter.content[].caption [type="table"]` | string | no | — | — |
| `evenPageFooter.content[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `evenPageFooter.content[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `evenPageFooter.content[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `evenPageFooter.content[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `evenPageFooter.content[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `evenPageFooter.content[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `evenPageFooter.content[].type [type="image"]` | literal "image" | yes | — | — |
| `evenPageFooter.content[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `evenPageFooter.content[].alt [type="image"]` | string | no | — | — |
| `evenPageFooter.content[].width [type="image"]` | number | no | — | Points |
| `evenPageFooter.content[].height [type="image"]` | number | no | — | Points |
| `evenPageFooter.content[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `evenPageFooter.content[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `evenPageFooter.content[].floating [type="image"]` | object | no | — | — |
| `evenPageFooter.content[].floating.wrap [type="image"]` | "square" \| "tight" \| "through" \| "topAndBottom" \| "behind" \| "inFront" | no | — | — |
| `evenPageFooter.content[].floating.position [type="image"]` | "left" \| "right" \| "center" | no | — | — |
| `evenPageFooter.content[].floating.horizontalAnchor [type="image"]` | "page" \| "margin" \| "column" \| "character" | no | — | — |
| `evenPageFooter.content[].floating.verticalAnchor [type="image"]` | "page" \| "margin" \| "paragraph" \| "line" | no | — | — |
| `evenPageFooter.content[].floating.horizontalPosition [type="image"]` | "left" \| "center" \| "right" \| "inside" \| "outside" \| number | no | — | — |
| `evenPageFooter.content[].floating.verticalPosition [type="image"]` | "top" \| "center" \| "bottom" \| "inside" \| "outside" \| number | no | — | — |
| `evenPageFooter.content[].floating.distanceFromText [type="image"]` | object | no | — | — |
| `evenPageFooter.content[].floating.allowOverlap [type="image"]` | boolean | no | — | — |
| `evenPageFooter.content[].floating.lockAnchor [type="image"]` | boolean | no | — | — |
| `evenPageFooter.content[].floating.layoutInCell [type="image"]` | boolean | no | — | — |
| `evenPageFooter.content[].type [type="chart"]` | literal "chart" | yes | — | — |
| `evenPageFooter.content[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `evenPageFooter.content[].title [type="chart"]` | string | no | — | — |
| `evenPageFooter.content[].series [type="chart"]` | array<object> | yes | — | — |
| `evenPageFooter.content[].categories [type="chart"]` | array<string> | no | — | — |
| `evenPageFooter.content[].legend [type="chart"]` | object | no | — | — |
| `evenPageFooter.content[].legend.position [type="chart"]` | "top" \| "bottom" \| "left" \| "right" \| "none" | no | `"bottom"` | — |
| `evenPageFooter.content[].axes [type="chart"]` | object | no | — | — |
| `evenPageFooter.content[].axes.x [type="chart"]` | object | no | — | — |
| `evenPageFooter.content[].axes.y [type="chart"]` | object | no | — | — |
| `evenPageFooter.content[].type [type="shape"]` | literal "shape" | yes | — | — |
| `evenPageFooter.content[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `evenPageFooter.content[].width [type="shape"]` | number | yes | — | Points |
| `evenPageFooter.content[].height [type="shape"]` | number | yes | — | Points |
| `evenPageFooter.content[].fill [type="shape"]` | object | no | — | — |
| `evenPageFooter.content[].fill.type [type="shape"]` | "solid" \| "gradient" | no | `"solid"` | — |
| `evenPageFooter.content[].fill.color [type="shape"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.content[].fill.gradient [type="shape"]` | object | no | — | — |
| `evenPageFooter.content[].stroke [type="shape"]` | object | no | — | — |
| `evenPageFooter.content[].stroke.width [type="shape"]` | number | no | `1` | — |
| `evenPageFooter.content[].stroke.color [type="shape"]` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.content[].stroke.style [type="shape"]` | "solid" \| "dashed" \| "dotted" | no | `"solid"` | — |
| `evenPageFooter.content[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `evenPageFooter.content[].code [type="code-block"]` | string | yes | — | — |
| `evenPageFooter.content[].language [type="code-block"]` | string | no | — | — |
| `evenPageFooter.content[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `evenPageFooter.content[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `evenPageFooter.content[].type [type="divider"]` | literal "divider" | yes | — | — |
| `evenPageFooter.content[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `evenPageFooter.content[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.content[].thickness [type="divider"]` | number | no | — | — |
| `evenPageFooter.content[].type [type="container"]` | literal "container" | yes | — | — |
| `evenPageFooter.content[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `evenPageFooter.content[].columns [type="container"]` | number | no | — | For grid layout |
| `evenPageFooter.content[].gap [type="container"]` | number | no | — | Points between children |
| `evenPageFooter.content[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `evenPageFooter.content[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `evenPageFooter.text` | string | no | — | Simple text shorthand |
| `evenPageFooter.style` | object | no | — | — |
| `evenPageFooter.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.style.fontFamily` | string | no | — | — |
| `evenPageFooter.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `evenPageFooter.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `evenPageFooter.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `evenPageFooter.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `evenPageFooter.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.style.border` | object | no | — | — |
| `evenPageFooter.style.border.width` | number | no | `1` | — |
| `evenPageFooter.style.border.color` | string | no | `"000000"` | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `evenPageFooter.style.border.style` | "solid" \| "dashed" \| "dotted" \| "double" \| "none" | no | `"solid"` | — |
| `evenPageFooter.style.padding` | object | no | — | — |
| `evenPageFooter.style.padding.top` | number | no | `0` | — |
| `evenPageFooter.style.padding.right` | number | no | `0` | — |
| `evenPageFooter.style.padding.bottom` | number | no | `0` | — |
| `evenPageFooter.style.padding.left` | number | no | `0` | — |
| `evenPageFooter.style.margin` | object | no | — | — |
| `evenPageFooter.style.margin.top` | number | no | `0` | — |
| `evenPageFooter.style.margin.right` | number | no | `0` | — |
| `evenPageFooter.style.margin.bottom` | number | no | `0` | — |
| `evenPageFooter.style.margin.left` | number | no | `0` | — |
| `evenPageFooter.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `evenPageFooter.style.lineHeight` | number | no | — | — |
| `evenPageFooter.style.opacity` | number | no | — | — |
| `evenPageFooter.style.comment` | object | no | — | — |
| `evenPageFooter.style.comment.id` | number | no | — | — |
| `evenPageFooter.style.comment.parentId` | number | no | — | — |
| `evenPageFooter.style.comment.text` | string | yes | — | — |
| `evenPageFooter.style.comment.author` | string | no | — | — |
| `evenPageFooter.style.comment.initials` | string | no | — | — |
| `evenPageFooter.style.comment.date` | string \| date | no | — | — |
| `evenPageFooter.style.comment.done` | boolean | no | — | — |
| `evenPageFooter.includePageNumber` | boolean | no | — | — |
| `evenPageFooter.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `watermark` | string \| object | no | — | — |
| `watermark.text` | string | no | — | — |
| `watermark.image` | string | no | — | URL or data URI |
| `watermark.opacity` | number | no | `0.25` | — |
| `watermark.rotation` | number | no | `-45` | — |
| `revisionInfo` | object | no | — | — |
| `revisionInfo.author` | string | no | — | — |
| `revisionInfo.date` | string | no | — | — |
| `revisionInfo.rsid` | string | no | — | Track changes session ID |
| `pages` | array<object> | yes | — | — |
| `pages[].elements` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `pages[].elements[].type [type="heading"]` | literal "heading" | yes | — | — |
| `pages[].elements[].level [type="heading"]` | number | yes | — | — |
| `pages[].elements[].text [type="heading"]` | string | no | — | — |
| `pages[].elements[].runs [type="heading"]` | array<object> | no | — | — |
| `pages[].elements[].revision [type="heading"]` | object | no | — | — |
| `pages[].elements[].comment [type="heading"]` | object | no | — | — |
| `pages[].elements[].style [type="heading"]` | object | no | — | — |
| `pages[].elements[].bookmarkId [type="heading"]` | string | no | — | Anchor for cross-references and TOC |
| `pages[].elements[].footnote [type="heading"]` | string | no | — | — |
| `pages[].elements[].endnote [type="heading"]` | string | no | — | — |
| `pages[].elements[].keepNext [type="heading"]` | boolean | no | — | Keep with next paragraph |
| `pages[].elements[].pageBreakBefore [type="heading"]` | boolean | no | — | — |
| `pages[].elements[].type [type="paragraph"]` | literal "paragraph" | yes | — | — |
| `pages[].elements[].keepLines [type="paragraph"]` | boolean | no | — | Keep all lines on same page |
| `pages[].elements[].keepNext [type="paragraph"]` | boolean | no | — | — |
| `pages[].elements[].indent [type="paragraph"]` | object | no | — | — |
| `pages[].elements[].type [type="list"]` | literal "list" | yes | — | — |
| `pages[].elements[].listType [type="list"]` | "bullet" \| "number" \| "letter" \| "roman" | no | `"bullet"` | — |
| `pages[].elements[].start [type="list"]` | number | no | `1` | — |
| `pages[].elements[].items [type="list"]` | array<object> | yes | — | — |
| `pages[].elements[].type [type="table"]` | literal "table" | yes | — | — |
| `pages[].elements[].columns [type="table"]` | array<object> | no | — | — |
| `pages[].elements[].rows [type="table"]` | array<object> | yes | — | — |
| `pages[].elements[].caption [type="table"]` | string | no | — | — |
| `pages[].elements[].tableDescription [type="table"]` | string | no | — | Accessibility description for the table (<w:tblDescription>) |
| `pages[].elements[].tableCaption [type="table"]` | string | no | — | Accessibility caption for the table (<w:tblCaption>) |
| `pages[].elements[].repeatHeaders [type="table"]` | boolean | no | `true` | Repeat header rows across pages |
| `pages[].elements[].keepTogether [type="table"]` | boolean | no | — | Keep a short table on one page when Word can do so |
| `pages[].elements[].keepWithNext [type="table"]` | boolean | no | — | Keep the final table row with the following block when Word can do so |
| `pages[].elements[].tableStyle [type="table"]` | "plain" \| "striped" \| "bordered" \| "modern" \| "minimal" \| "corporate" | no | — | — |
| `pages[].elements[].type [type="image"]` | literal "image" | yes | — | — |
| `pages[].elements[].src [type="image"]` | string \| custom | yes | — | HTTPS URL, data:image/... URI, or image Buffer |
| `pages[].elements[].alt [type="image"]` | string | no | — | — |
| `pages[].elements[].width [type="image"]` | number | no | — | Points |
| `pages[].elements[].height [type="image"]` | number | no | — | Points |
| `pages[].elements[].decorative [type="image"]` | boolean | no | — | Mark as decorative — screen readers skip this image |
| `pages[].elements[].alignment [type="image"]` | "left" \| "center" \| "right" \| "inline" | no | — | — |
| `pages[].elements[].floating [type="image"]` | object | no | — | — |
| `pages[].elements[].type [type="chart"]` | literal "chart" | yes | — | — |
| `pages[].elements[].chartType [type="chart"]` | "bar" \| "column" \| "line" \| "area" \| "pie" \| "doughnut" \| ... (+2 more) | yes | — | — |
| `pages[].elements[].title [type="chart"]` | string | no | — | — |
| `pages[].elements[].series [type="chart"]` | array<object> | yes | — | — |
| `pages[].elements[].categories [type="chart"]` | array<string> | no | — | — |
| `pages[].elements[].legend [type="chart"]` | object | no | — | — |
| `pages[].elements[].axes [type="chart"]` | object | no | — | — |
| `pages[].elements[].type [type="shape"]` | literal "shape" | yes | — | — |
| `pages[].elements[].shapeType [type="shape"]` | "rectangle" \| "ellipse" \| "triangle" \| "diamond" \| "line" \| "arrow" | yes | — | — |
| `pages[].elements[].width [type="shape"]` | number | yes | — | Points |
| `pages[].elements[].height [type="shape"]` | number | yes | — | Points |
| `pages[].elements[].fill [type="shape"]` | object | no | — | — |
| `pages[].elements[].stroke [type="shape"]` | object | no | — | — |
| `pages[].elements[].type [type="code-block"]` | literal "code-block" | yes | — | — |
| `pages[].elements[].code [type="code-block"]` | string | yes | — | — |
| `pages[].elements[].language [type="code-block"]` | string | no | — | — |
| `pages[].elements[].showLineNumbers [type="code-block"]` | boolean | no | — | — |
| `pages[].elements[].type [type="page-break"]` | literal "page-break" | yes | — | — |
| `pages[].elements[].type [type="divider"]` | literal "divider" | yes | — | — |
| `pages[].elements[].style [type="divider"]` | "solid" \| "dashed" \| "dotted" \| "double" | no | — | — |
| `pages[].elements[].color [type="divider"]` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `pages[].elements[].thickness [type="divider"]` | number | no | — | — |
| `pages[].elements[].type [type="container"]` | literal "container" | yes | — | — |
| `pages[].elements[].layout [type="container"]` | "vertical" \| "horizontal" \| "grid" | no | `"vertical"` | — |
| `pages[].elements[].columns [type="container"]` | number | no | — | For grid layout |
| `pages[].elements[].gap [type="container"]` | number | no | — | Points between children |
| `pages[].elements[].keepTogether [type="container"]` | boolean | no | — | Keep a bounded vertical group on one page when Word can do so |
| `pages[].elements[].children [type="container"]` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | yes | — | — |
| `pages[].sectionBreak` | "nextPage" \| "continuous" \| "evenPage" \| "oddPage" | no | — | — |
| `pages[].header` | object | no | — | — |
| `pages[].header.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `pages[].header.text` | string | no | — | Simple text shorthand |
| `pages[].header.style` | object | no | — | — |
| `pages[].header.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `pages[].header.style.fontFamily` | string | no | — | — |
| `pages[].header.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `pages[].header.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `pages[].header.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `pages[].header.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `pages[].header.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `pages[].header.style.border` | object | no | — | — |
| `pages[].header.style.padding` | object | no | — | — |
| `pages[].header.style.margin` | object | no | — | — |
| `pages[].header.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `pages[].header.style.lineHeight` | number | no | — | — |
| `pages[].header.style.opacity` | number | no | — | — |
| `pages[].header.style.comment` | object | no | — | — |
| `pages[].header.includePageNumber` | boolean | no | — | — |
| `pages[].header.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `pages[].footer` | object | no | — | — |
| `pages[].footer.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `pages[].footer.text` | string | no | — | Simple text shorthand |
| `pages[].footer.style` | object | no | — | — |
| `pages[].footer.style.color` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `pages[].footer.style.fontFamily` | string | no | — | — |
| `pages[].footer.style.fontSize` | custom | no | — | DOCX font size in positive finite points |
| `pages[].footer.style.fontWeight` | "normal" \| "bold" \| number | no | — | — |
| `pages[].footer.style.fontStyle` | "normal" \| "italic" | no | — | — |
| `pages[].footer.style.textDecoration` | "none" \| "underline" \| "line-through" \| "underline line-through" | no | — | — |
| `pages[].footer.style.backgroundColor` | string | no | — | DOCX color: 6-character OOXML hex without # (for example FF0000), or auto |
| `pages[].footer.style.border` | object | no | — | — |
| `pages[].footer.style.padding` | object | no | — | — |
| `pages[].footer.style.margin` | object | no | — | — |
| `pages[].footer.style.textAlign` | "left" \| "center" \| "right" \| "justify" | no | — | — |
| `pages[].footer.style.lineHeight` | number | no | — | — |
| `pages[].footer.style.opacity` | number | no | — | — |
| `pages[].footer.style.comment` | object | no | — | — |
| `pages[].footer.includePageNumber` | boolean | no | — | — |
| `pages[].footer.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `pages[].headerFooter` | object | no | — | Legacy shorthand for page header/footer |
| `pages[].headerFooter.header` | object | no | — | — |
| `pages[].headerFooter.header.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `pages[].headerFooter.header.text` | string | no | — | Simple text shorthand |
| `pages[].headerFooter.header.style` | object | no | — | — |
| `pages[].headerFooter.header.includePageNumber` | boolean | no | — | — |
| `pages[].headerFooter.header.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `pages[].headerFooter.footer` | object | no | — | — |
| `pages[].headerFooter.footer.content` | array<"heading" \| "paragraph" \| "list" \| "table" \| "image" \| "chart" \| ... (+5 more)> | no | — | — |
| `pages[].headerFooter.footer.text` | string | no | — | Simple text shorthand |
| `pages[].headerFooter.footer.style` | object | no | — | — |
| `pages[].headerFooter.footer.includePageNumber` | boolean | no | — | — |
| `pages[].headerFooter.footer.pageNumberFormat` | "decimal" \| "roman" \| "romanUpper" \| "letter" \| "letterUpper" | no | — | — |
| `pages[].dimensions` | object | no | — | Override document-level page size for this section |
| `pages[].dimensions.width` | number | no | — | Points |
| `pages[].dimensions.height` | number | no | — | Points |
| `pages[].dimensions.orientation` | "portrait" \| "landscape" | no | — | — |
| `options` | object | no | — | — |
| `options.trackChanges` | boolean | no | — | — |
| `options.columns` | number | no | — | Multi-column layout |
| `options.footnoteStyle` | "numeric" \| "alphabetic" \| "roman" | no | — | — |
| `options.pagination` | "preserve" \| "reflow" | no | — | Preserve authoring page groups as sections, or reflow compatible groups into the Word document flow |
