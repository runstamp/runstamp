# @runstamp/pdf Schema Reference

This file is generated from exported Zod schemas in the package source. Do not edit it by hand.

## PdfStructuredDocument

**Export:** `PdfStructuredDocumentSchema`
**Expansion depth:** 4 levels

Structured PDF document input with flow layout, tables, lists, and interactive extensions.

Deep recursive branches stay summarized on their nearest parent row so the generated reference remains navigable.

| Path | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `meta` | object | no | — | — |
| `meta.author` | string | no | — | — |
| `meta.creationDate` | string \| date | no | — | — |
| `meta.creator` | string | no | — | — |
| `meta.keywords` | array<string> | no | — | — |
| `meta.modDate` | string \| date | no | — | — |
| `meta.producer` | string | no | — | — |
| `meta.subject` | string | no | — | — |
| `meta.title` | string | no | — | — |
| `page` | object | no | — | — |
| `page.margin` | number \| object | no | — | — |
| `page.margin.top` | number | no | — | — |
| `page.margin.right` | number | no | — | — |
| `page.margin.bottom` | number | no | — | — |
| `page.margin.left` | number | no | — | — |
| `page.size` | "A4" \| "Letter" \| "a4" \| "letter" \| object | no | — | — |
| `page.size.width` | number | yes | — | — |
| `page.size.height` | number | yes | — | — |
| `children` | array<object> | no | — | — |
| `children[].type [type="figure"]` | literal "figure" | yes | — | — |
| `children[].alt [type="figure"]` | string | yes | — | — |
| `children[].format [type="figure"]` | "jpeg" \| "png" \| "svg" | no | — | — |
| `children[].height [type="figure"]` | number | yes | — | — |
| `children[].id [type="figure"]` | string | no | — | — |
| `children[].lang [type="figure"]` | string | no | — | — |
| `children[].source [type="figure"]` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `children[].style [type="figure"]` | object | no | — | — |
| `children[].style.alignItems [type="figure"]` | "center" \| "flex-end" \| "flex-start" \| "stretch" | no | — | — |
| `children[].style.alignSelf [type="figure"]` | "center" \| "flex-end" \| "flex-start" \| "stretch" | no | — | — |
| `children[].style.bottom [type="figure"]` | number | no | — | — |
| `children[].style.columnGap [type="figure"]` | number | no | — | — |
| `children[].style.flexBasis [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].style.flexDirection [type="figure"]` | "column" \| "row" | no | — | — |
| `children[].style.flexGrow [type="figure"]` | number | no | — | — |
| `children[].style.flexShrink [type="figure"]` | number | no | — | — |
| `children[].style.flexWrap [type="figure"]` | "nowrap" \| "wrap" | no | — | — |
| `children[].style.gap [type="figure"]` | number | no | — | — |
| `children[].style.height [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].style.justifyContent [type="figure"]` | "center" \| "flex-end" \| "flex-start" \| "space-around" \| "space-between" | no | — | — |
| `children[].style.left [type="figure"]` | number | no | — | — |
| `children[].style.margin [type="figure"]` | number | no | — | — |
| `children[].style.marginBottom [type="figure"]` | number | no | — | — |
| `children[].style.marginLeft [type="figure"]` | number | no | — | — |
| `children[].style.marginRight [type="figure"]` | number | no | — | — |
| `children[].style.marginTop [type="figure"]` | number | no | — | — |
| `children[].style.maxHeight [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].style.maxWidth [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].style.minHeight [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].style.minWidth [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].style.padding [type="figure"]` | number | no | — | — |
| `children[].style.paddingBottom [type="figure"]` | number | no | — | — |
| `children[].style.paddingLeft [type="figure"]` | number | no | — | — |
| `children[].style.paddingRight [type="figure"]` | number | no | — | — |
| `children[].style.paddingTop [type="figure"]` | number | no | — | — |
| `children[].style.position [type="figure"]` | "absolute" \| "relative" | no | — | — |
| `children[].style.right [type="figure"]` | number | no | — | — |
| `children[].style.rowGap [type="figure"]` | number | no | — | — |
| `children[].style.top [type="figure"]` | number | no | — | — |
| `children[].style.width [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `children[].width [type="figure"]` | number \| string | yes | — | Absolute points or percentage string such as `"50%"`. |
| `children[].type [type="graphic"]` | literal "graphic" | yes | — | — |
| `children[].alt [type="graphic"]` | string | no | — | — |
| `children[].graphic [type="graphic"]` | "image" \| "line" \| "path" \| "rect" \| "svg" | yes | — | — |
| `children[].graphic.type [type="image"]` | literal "image" | yes | — | — |
| `children[].graphic.source [type="image"]` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `children[].graphic.format [type="image"]` | "jpeg" \| "png" | no | — | — |
| `children[].graphic.x [type="image"]` | number | yes | — | — |
| `children[].graphic.y [type="image"]` | number | yes | — | — |
| `children[].graphic.width [type="image"]` | number | yes | — | — |
| `children[].graphic.height [type="image"]` | number | yes | — | — |
| `children[].graphic.opacity [type="image"]` | number | no | — | — |
| `children[].graphic.layer [type="image"]` | "background" \| "foreground" | no | — | — |
| `children[].graphic.type [type="line"]` | literal "line" | yes | — | — |
| `children[].graphic.x1 [type="line"]` | number | yes | — | — |
| `children[].graphic.y1 [type="line"]` | number | yes | — | — |
| `children[].graphic.x2 [type="line"]` | number | yes | — | — |
| `children[].graphic.y2 [type="line"]` | number | yes | — | — |
| `children[].graphic.stroke [type="line"]` | object | yes | — | — |
| `children[].graphic.stroke.color [type="line"]` | unknown | yes | — | RGB or CMYK color. Accepts hex strings (#RRGGBB / #RGB), rgb()/rgba(), named colors (black, white, red, green, blue, gray), or canonical { space: "rgb"\|"cmyk", ... } objects. All forms are normalized to the canonical 0..1 component shape. |
| `children[].graphic.stroke.dash [type="line"]` | array<number> | no | — | — |
| `children[].graphic.stroke.lineCap [type="line"]` | "butt" \| "round" \| "square" | no | — | — |
| `children[].graphic.stroke.opacity [type="line"]` | number | no | — | — |
| `children[].graphic.stroke.style [type="line"]` | "solid" \| "dashed" \| "dotted" | no | — | — |
| `children[].graphic.stroke.width [type="line"]` | number | no | — | — |
| `children[].graphic.type [type="path"]` | literal "path" | yes | — | — |
| `children[].graphic.d [type="path"]` | string | yes | — | — |
| `children[].graphic.fill [type="path"]` | "linear-gradient" \| "radial-gradient" \| "solid" | no | — | — |
| `children[].graphic.fill.space [space="linear-gradient"]` | literal "linear-gradient" | yes | — | — |
| `children[].graphic.fill.startX [space="linear-gradient"]` | number | yes | — | — |
| `children[].graphic.fill.startY [space="linear-gradient"]` | number | yes | — | — |
| `children[].graphic.fill.endX [space="linear-gradient"]` | number | yes | — | — |
| `children[].graphic.fill.endY [space="linear-gradient"]` | number | yes | — | — |
| `children[].graphic.fill.opacity [space="linear-gradient"]` | number | no | — | — |
| `children[].graphic.fill.stops [space="linear-gradient"]` | tuple<object, object> | yes | — | — |
| `children[].graphic.fill.space [space="radial-gradient"]` | literal "radial-gradient" | yes | — | — |
| `children[].graphic.fill.startRadius [space="radial-gradient"]` | number | yes | — | — |
| `children[].graphic.fill.endRadius [space="radial-gradient"]` | number | yes | — | — |
| `children[].graphic.fill.space [space="solid"]` | literal "solid" | yes | — | — |
| `children[].graphic.fill.color [space="solid"]` | unknown | yes | — | RGB or CMYK color. Accepts hex strings (#RRGGBB / #RGB), rgb()/rgba(), named colors (black, white, red, green, blue, gray), or canonical { space: "rgb"\|"cmyk", ... } objects. All forms are normalized to the canonical 0..1 component shape. |
| `children[].graphic.fillRule [type="path"]` | "evenodd" \| "nonzero" | no | — | — |
| `children[].graphic.scaleX [type="path"]` | number | no | — | — |
| `children[].graphic.scaleY [type="path"]` | number | no | — | — |
| `children[].graphic.stroke [type="path"]` | object | no | — | — |
| `children[].graphic.x [type="path"]` | number | no | — | — |
| `children[].graphic.y [type="path"]` | number | no | — | — |
| `children[].graphic.type [type="rect"]` | literal "rect" | yes | — | — |
| `children[].graphic.radius [type="rect"]` | number | no | — | — |
| `children[].graphic.type [type="svg"]` | literal "svg" | yes | — | — |
| `children[].type [type="list"]` | literal "list" | yes | — | — |
| `children[].items [type="list"]` | array<object> | yes | — | — |
| `children[].items[].id [type="list"]` | string | no | — | — |
| `children[].items[].lang [type="list"]` | string | no | — | — |
| `children[].items[].text [type="list"]` | string | yes | — | — |
| `children[].ordered [type="list"]` | boolean | no | — | — |
| `content` | array<object> | no | — | — |
| `content[].type [type="figure"]` | literal "figure" | yes | — | — |
| `content[].alt [type="figure"]` | string | yes | — | — |
| `content[].format [type="figure"]` | "jpeg" \| "png" \| "svg" | no | — | — |
| `content[].height [type="figure"]` | number | yes | — | — |
| `content[].id [type="figure"]` | string | no | — | — |
| `content[].lang [type="figure"]` | string | no | — | — |
| `content[].source [type="figure"]` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `content[].style [type="figure"]` | object | no | — | — |
| `content[].style.alignItems [type="figure"]` | "center" \| "flex-end" \| "flex-start" \| "stretch" | no | — | — |
| `content[].style.alignSelf [type="figure"]` | "center" \| "flex-end" \| "flex-start" \| "stretch" | no | — | — |
| `content[].style.bottom [type="figure"]` | number | no | — | — |
| `content[].style.columnGap [type="figure"]` | number | no | — | — |
| `content[].style.flexBasis [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].style.flexDirection [type="figure"]` | "column" \| "row" | no | — | — |
| `content[].style.flexGrow [type="figure"]` | number | no | — | — |
| `content[].style.flexShrink [type="figure"]` | number | no | — | — |
| `content[].style.flexWrap [type="figure"]` | "nowrap" \| "wrap" | no | — | — |
| `content[].style.gap [type="figure"]` | number | no | — | — |
| `content[].style.height [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].style.justifyContent [type="figure"]` | "center" \| "flex-end" \| "flex-start" \| "space-around" \| "space-between" | no | — | — |
| `content[].style.left [type="figure"]` | number | no | — | — |
| `content[].style.margin [type="figure"]` | number | no | — | — |
| `content[].style.marginBottom [type="figure"]` | number | no | — | — |
| `content[].style.marginLeft [type="figure"]` | number | no | — | — |
| `content[].style.marginRight [type="figure"]` | number | no | — | — |
| `content[].style.marginTop [type="figure"]` | number | no | — | — |
| `content[].style.maxHeight [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].style.maxWidth [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].style.minHeight [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].style.minWidth [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].style.padding [type="figure"]` | number | no | — | — |
| `content[].style.paddingBottom [type="figure"]` | number | no | — | — |
| `content[].style.paddingLeft [type="figure"]` | number | no | — | — |
| `content[].style.paddingRight [type="figure"]` | number | no | — | — |
| `content[].style.paddingTop [type="figure"]` | number | no | — | — |
| `content[].style.position [type="figure"]` | "absolute" \| "relative" | no | — | — |
| `content[].style.right [type="figure"]` | number | no | — | — |
| `content[].style.rowGap [type="figure"]` | number | no | — | — |
| `content[].style.top [type="figure"]` | number | no | — | — |
| `content[].style.width [type="figure"]` | number \| string | no | — | Absolute points or percentage string such as `"50%"`. |
| `content[].width [type="figure"]` | number \| string | yes | — | Absolute points or percentage string such as `"50%"`. |
| `content[].type [type="graphic"]` | literal "graphic" | yes | — | — |
| `content[].alt [type="graphic"]` | string | no | — | — |
| `content[].graphic [type="graphic"]` | "image" \| "line" \| "path" \| "rect" \| "svg" | yes | — | — |
| `content[].graphic.type [type="image"]` | literal "image" | yes | — | — |
| `content[].graphic.source [type="image"]` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `content[].graphic.format [type="image"]` | "jpeg" \| "png" | no | — | — |
| `content[].graphic.x [type="image"]` | number | yes | — | — |
| `content[].graphic.y [type="image"]` | number | yes | — | — |
| `content[].graphic.width [type="image"]` | number | yes | — | — |
| `content[].graphic.height [type="image"]` | number | yes | — | — |
| `content[].graphic.opacity [type="image"]` | number | no | — | — |
| `content[].graphic.layer [type="image"]` | "background" \| "foreground" | no | — | — |
| `content[].graphic.type [type="line"]` | literal "line" | yes | — | — |
| `content[].graphic.x1 [type="line"]` | number | yes | — | — |
| `content[].graphic.y1 [type="line"]` | number | yes | — | — |
| `content[].graphic.x2 [type="line"]` | number | yes | — | — |
| `content[].graphic.y2 [type="line"]` | number | yes | — | — |
| `content[].graphic.stroke [type="line"]` | object | yes | — | — |
| `content[].graphic.stroke.color [type="line"]` | unknown | yes | — | RGB or CMYK color. Accepts hex strings (#RRGGBB / #RGB), rgb()/rgba(), named colors (black, white, red, green, blue, gray), or canonical { space: "rgb"\|"cmyk", ... } objects. All forms are normalized to the canonical 0..1 component shape. |
| `content[].graphic.stroke.dash [type="line"]` | array<number> | no | — | — |
| `content[].graphic.stroke.lineCap [type="line"]` | "butt" \| "round" \| "square" | no | — | — |
| `content[].graphic.stroke.opacity [type="line"]` | number | no | — | — |
| `content[].graphic.stroke.style [type="line"]` | "solid" \| "dashed" \| "dotted" | no | — | — |
| `content[].graphic.stroke.width [type="line"]` | number | no | — | — |
| `content[].graphic.type [type="path"]` | literal "path" | yes | — | — |
| `content[].graphic.d [type="path"]` | string | yes | — | — |
| `content[].graphic.fill [type="path"]` | "linear-gradient" \| "radial-gradient" \| "solid" | no | — | — |
| `content[].graphic.fill.space [space="linear-gradient"]` | literal "linear-gradient" | yes | — | — |
| `content[].graphic.fill.startX [space="linear-gradient"]` | number | yes | — | — |
| `content[].graphic.fill.startY [space="linear-gradient"]` | number | yes | — | — |
| `content[].graphic.fill.endX [space="linear-gradient"]` | number | yes | — | — |
| `content[].graphic.fill.endY [space="linear-gradient"]` | number | yes | — | — |
| `content[].graphic.fill.opacity [space="linear-gradient"]` | number | no | — | — |
| `content[].graphic.fill.stops [space="linear-gradient"]` | tuple<object, object> | yes | — | — |
| `content[].graphic.fill.space [space="radial-gradient"]` | literal "radial-gradient" | yes | — | — |
| `content[].graphic.fill.startRadius [space="radial-gradient"]` | number | yes | — | — |
| `content[].graphic.fill.endRadius [space="radial-gradient"]` | number | yes | — | — |
| `content[].graphic.fill.space [space="solid"]` | literal "solid" | yes | — | — |
| `content[].graphic.fill.color [space="solid"]` | unknown | yes | — | RGB or CMYK color. Accepts hex strings (#RRGGBB / #RGB), rgb()/rgba(), named colors (black, white, red, green, blue, gray), or canonical { space: "rgb"\|"cmyk", ... } objects. All forms are normalized to the canonical 0..1 component shape. |
| `content[].graphic.fillRule [type="path"]` | "evenodd" \| "nonzero" | no | — | — |
| `content[].graphic.scaleX [type="path"]` | number | no | — | — |
| `content[].graphic.scaleY [type="path"]` | number | no | — | — |
| `content[].graphic.stroke [type="path"]` | object | no | — | — |
| `content[].graphic.x [type="path"]` | number | no | — | — |
| `content[].graphic.y [type="path"]` | number | no | — | — |
| `content[].graphic.type [type="rect"]` | literal "rect" | yes | — | — |
| `content[].graphic.radius [type="rect"]` | number | no | — | — |
| `content[].graphic.type [type="svg"]` | literal "svg" | yes | — | — |
| `content[].type [type="list"]` | literal "list" | yes | — | — |
| `content[].items [type="list"]` | array<object> | yes | — | — |
| `content[].items[].id [type="list"]` | string | no | — | — |
| `content[].items[].lang [type="list"]` | string | no | — | — |
| `content[].items[].text [type="list"]` | string | yes | — | — |
| `content[].ordered [type="list"]` | boolean | no | — | — |
| `bookmarks` | object | no | — | — |
| `bookmarks.fromHeadings` | boolean | no | — | — |
| `dynamicHeader` | object | no | — | — |
| `dynamicHeader.content` | string \| array<object> \| object | yes | — | — |
| `dynamicHeader.content.center` | string | no | — | — |
| `dynamicHeader.content.left` | string | no | — | — |
| `dynamicHeader.content.right` | string | no | — | — |
| `dynamicHeader.fontSize` | number | no | — | — |
| `dynamicHeader.height` | number | no | — | — |
| `dynamicHeader.skipFirstPage` | boolean | no | — | — |
| `dynamicHeader.width` | number | no | — | — |
| `dynamicHeader.x` | number | no | — | — |
| `dynamicHeader.y` | number | no | — | — |
| `dynamicFooter` | object | no | — | — |
| `dynamicFooter.content` | string \| array<object> \| object | yes | — | — |
| `dynamicFooter.content.center` | string | no | — | — |
| `dynamicFooter.content.left` | string | no | — | — |
| `dynamicFooter.content.right` | string | no | — | — |
| `dynamicFooter.fontSize` | number | no | — | — |
| `dynamicFooter.height` | number | no | — | — |
| `dynamicFooter.skipFirstPage` | boolean | no | — | — |
| `dynamicFooter.width` | number | no | — | — |
| `dynamicFooter.x` | number | no | — | — |
| `dynamicFooter.y` | number | no | — | — |
| `pageLabels` | array<object> | no | — | — |
| `pageLabels[].prefix` | string | no | — | — |
| `pageLabels[].startNumber` | number | no | — | — |
| `pageLabels[].startPage` | number | yes | — | — |
| `pageLabels[].style` | "arabic" \| "roman-lower" \| "roman-upper" | yes | — | — |
| `pageNumber` | object | no | — | — |
| `pageNumber.fontSize` | number | no | — | — |
| `pageNumber.format` | string | no | — | — |
| `pageNumber.x` | number | no | — | — |
| `pageNumber.y` | number | no | — | — |
| `accessibility` | object | no | — | — |
| `accessibility.lang` | string | no | — | — |
| `accessibility.tagged` | boolean | no | — | — |
| `pdfa` | object | no | — | — |
| `pdfa.conformance` | "1b" \| "2a" \| "2b" | no | — | — |
| `pdfa.enabled` | boolean | no | — | — |
| `pdfa.fallbackFont` | object | no | — | — |
| `pdfa.fallbackFont.family` | string | yes | — | Logical family name used inside the document. |
| `pdfa.fallbackFont.postscriptName` | string | no | — | Optional font face name inside a font collection. |
| `pdfa.fallbackFont.source` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `pdfa.fallbackFonts` | array<object> | no | — | — |
| `pdfa.fallbackFonts[].family` | string | yes | — | Logical family name used inside the document. |
| `pdfa.fallbackFonts[].postscriptName` | string | no | — | Optional font face name inside a font collection. |
| `pdfa.fallbackFonts[].source` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `pdfa.iccProfile` | string \| custom | no | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `pdfa.outputConditionIdentifier` | string | no | — | — |
## PdfRawDocument

**Export:** `PdfRawDocumentSchema`
**Expansion depth:** 4 levels

Low-level PDF page/text/graphics input used for direct PDF drawing.

Deep recursive branches stay summarized on their nearest parent row so the generated reference remains navigable.

| Path | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `meta` | object | no | — | — |
| `meta.author` | string | no | — | — |
| `meta.creationDate` | string \| date | no | — | — |
| `meta.creator` | string | no | — | — |
| `meta.keywords` | array<string> | no | — | — |
| `meta.modDate` | string \| date | no | — | — |
| `meta.producer` | string | no | — | — |
| `meta.subject` | string | no | — | — |
| `meta.title` | string | no | — | — |
| `pages` | array<object> | yes | — | — |
| `pages[].graphics` | array<"image" \| "line" \| "path" \| "rect" \| "svg"> | no | — | — |
| `pages[].graphics[].type [type="image"]` | literal "image" | yes | — | — |
| `pages[].graphics[].source [type="image"]` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `pages[].graphics[].format [type="image"]` | "jpeg" \| "png" | no | — | — |
| `pages[].graphics[].x [type="image"]` | number | yes | — | — |
| `pages[].graphics[].y [type="image"]` | number | yes | — | — |
| `pages[].graphics[].width [type="image"]` | number | yes | — | — |
| `pages[].graphics[].height [type="image"]` | number | yes | — | — |
| `pages[].graphics[].opacity [type="image"]` | number | no | — | — |
| `pages[].graphics[].layer [type="image"]` | "background" \| "foreground" | no | — | — |
| `pages[].graphics[].type [type="line"]` | literal "line" | yes | — | — |
| `pages[].graphics[].x1 [type="line"]` | number | yes | — | — |
| `pages[].graphics[].y1 [type="line"]` | number | yes | — | — |
| `pages[].graphics[].x2 [type="line"]` | number | yes | — | — |
| `pages[].graphics[].y2 [type="line"]` | number | yes | — | — |
| `pages[].graphics[].stroke [type="line"]` | object | yes | — | — |
| `pages[].graphics[].type [type="path"]` | literal "path" | yes | — | — |
| `pages[].graphics[].d [type="path"]` | string | yes | — | — |
| `pages[].graphics[].fill [type="path"]` | "linear-gradient" \| "radial-gradient" \| "solid" | no | — | — |
| `pages[].graphics[].fillRule [type="path"]` | "evenodd" \| "nonzero" | no | — | — |
| `pages[].graphics[].scaleX [type="path"]` | number | no | — | — |
| `pages[].graphics[].scaleY [type="path"]` | number | no | — | — |
| `pages[].graphics[].stroke [type="path"]` | object | no | — | — |
| `pages[].graphics[].x [type="path"]` | number | no | — | — |
| `pages[].graphics[].y [type="path"]` | number | no | — | — |
| `pages[].graphics[].type [type="rect"]` | literal "rect" | yes | — | — |
| `pages[].graphics[].radius [type="rect"]` | number | no | — | — |
| `pages[].graphics[].type [type="svg"]` | literal "svg" | yes | — | — |
| `pages[].height` | number | no | — | — |
| `pages[].text` | object | no | — | — |
| `pages[].text.direction` | "auto" \| "ltr" \| "rtl" | no | — | — |
| `pages[].text.fallbackFonts` | array<object> | no | — | — |
| `pages[].text.font` | literal "Helvetica" \| literal "Helvetica-Bold" \| object | no | — | Either a built-in Helvetica face or an embedded font descriptor. |
| `pages[].text.font.family` | string | yes | — | Logical family name used inside the document. |
| `pages[].text.font.postscriptName` | string | no | — | Optional font face name inside a font collection. |
| `pages[].text.font.source` | string \| custom | yes | — | Binary source accepted by PDF image, SVG, and font inputs. Strings are explicit policy-controlled sources: local file paths and data URLs are enabled by default; http(s) sources require render option assetPolicy.allowRemoteSources. |
| `pages[].text.fontSize` | number | no | — | — |
| `pages[].text.value` | string | yes | — | — |
| `pages[].text.x` | number | no | — | — |
| `pages[].text.y` | number | no | — | — |
| `pages[].texts` | array<object> | no | — | — |
| `pages[].texts[].direction` | "auto" \| "ltr" \| "rtl" | no | — | — |
| `pages[].texts[].fallbackFonts` | array<object> | no | — | — |
| `pages[].texts[].font` | literal "Helvetica" \| literal "Helvetica-Bold" \| object | no | — | Either a built-in Helvetica face or an embedded font descriptor. |
| `pages[].texts[].fontSize` | number | no | — | — |
| `pages[].texts[].value` | string | yes | — | — |
| `pages[].texts[].x` | number | no | — | — |
| `pages[].texts[].y` | number | no | — | — |
| `pages[].width` | number | no | — | — |
