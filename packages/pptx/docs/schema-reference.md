# @runstamp/pptx Schema Reference

This file is generated from exported Zod schemas in the package source. Do not edit it by hand.

## PaperDocument

**Export:** `PaperDocumentSchema`
**Expansion depth:** 3 levels

Full PPTX AST rendered directly by the layout engine.

Deep recursive branches stay summarized on their nearest parent row so the generated reference remains navigable.

| Path | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `version` | literal "1.0" | no | `"1.0"` | — |
| `type` | literal "Document" | yes | — | — |
| `meta` | object | yes | — | — |
| `meta.title` | string | no | — | — |
| `meta.author` | string | no | — | — |
| `meta.language` | string | no | — | — |
| `template` | custom | no | — | — |
| `slideSize` | object | no | — | — |
| `slideSize.width` | number | yes | — | — |
| `slideSize.height` | number | yes | — | — |
| `notesSize` | object | no | — | — |
| `notesSize.width` | number | yes | — | — |
| `notesSize.height` | number | yes | — | — |
| `theme` | object | no | — | — |
| `theme.name` | string | no | — | — |
| `theme.colorScheme` | object | no | — | — |
| `theme.colorScheme.dk1` | string | no | — | — |
| `theme.colorScheme.lt1` | string | no | — | — |
| `theme.colorScheme.dk2` | string | no | — | — |
| `theme.colorScheme.lt2` | string | no | — | — |
| `theme.colorScheme.accent1` | string | no | — | — |
| `theme.colorScheme.accent2` | string | no | — | — |
| `theme.colorScheme.accent3` | string | no | — | — |
| `theme.colorScheme.accent4` | string | no | — | — |
| `theme.colorScheme.accent5` | string | no | — | — |
| `theme.colorScheme.accent6` | string | no | — | — |
| `theme.colorScheme.hlink` | string | no | — | — |
| `theme.colorScheme.folHlink` | string | no | — | — |
| `theme.fontScheme` | object | no | — | — |
| `theme.fontScheme.majorLatin` | string | no | — | — |
| `theme.fontScheme.minorLatin` | string | no | — | — |
| `theme.fontScheme.majorEa` | string | no | — | — |
| `theme.fontScheme.minorEa` | string | no | — | — |
| `fontStrategy` | "portable" \| "system" \| "user-embedded" \| "named-with-fallback" \| "system-safe" \| "embedded" | no | — | — |
| `sections` | array<object> | no | — | — |
| `sections[].name` | string | yes | — | — |
| `sections[].slideIndices` | array<number> | yes | — | — |
| `masters` | array<object> | no | — | — |
| `masters[].name` | string | yes | — | — |
| `masters[].layouts` | array<object> | yes | — | — |
| `masters[].background` | "solid" \| "gradient" \| "pattern" \| "image" | no | — | — |
| `masters[].background.type [type="solid"]` | literal "solid" | yes | — | — |
| `masters[].background.color [type="solid"]` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | yes | — | — |
| `masters[].background.type [type="gradient"]` | literal "gradient" | yes | — | — |
| `masters[].background.angle [type="gradient"]` | number | no | — | — |
| `masters[].background.stops [type="gradient"]` | array<object> | yes | — | — |
| `masters[].background.type [type="pattern"]` | literal "pattern" | yes | — | — |
| `masters[].background.pattern [type="pattern"]` | "ltDnDiag" \| "ltUpDiag" \| "dkDnDiag" \| "dkUpDiag" \| "ltHorz" \| "ltVert" \| ... (+10 more) | yes | — | — |
| `masters[].background.foreground [type="pattern"]` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | yes | — | — |
| `masters[].background.background [type="pattern"]` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | yes | — | — |
| `masters[].background.type [type="image"]` | literal "image" | yes | — | — |
| `masters[].background.src [type="image"]` | string | yes | — | — |
| `masters[].background.tile [type="image"]` | boolean | no | — | — |
| `embeddedFonts` | array<object> | no | — | — |
| `embeddedFonts[].fontFamily` | string | yes | — | — |
| `embeddedFonts[].src` | string | yes | — | — |
| `embeddedFonts[].bold` | boolean | no | — | — |
| `embeddedFonts[].italic` | boolean | no | — | — |
| `protection` | object | no | — | — |
| `protection.modifyPassword` | string | no | — | — |
| `protection.readOnly` | boolean | no | — | — |
| `customShows` | array<object> | no | — | — |
| `customShows[].name` | string | yes | — | — |
| `customShows[].slideIndices` | array<number> | yes | — | — |
| `customProperties` | array<object> | no | — | — |
| `customProperties[].name` | string | yes | — | — |
| `customProperties[].value` | string \| number \| boolean \| date | yes | — | — |
| `handoutLayout` | "1" \| "2" \| "3" \| "4" \| "6" \| "9" | no | — | — |
| `printSettings` | object | no | — | — |
| `printSettings.colorMode` | "clr" \| "gray" \| "bw" | no | — | — |
| `printSettings.frameSlides` | boolean | no | — | — |
| `printSettings.scaleToFitPaper` | boolean | no | — | — |
| `chartFallbackImages` | boolean | no | — | — |
| `slides` | array<object> | yes | — | — |
| `slides[].type` | literal "Slide" | yes | — | — |
| `slides[].agentPattern` | "title" \| "statement" \| "dashboard" \| "comparison" \| "chart-focus" \| "bullets" | no | — | — |
| `slides[].style` | object | no | — | — |
| `slides[].style.flexDirection` | "row" \| "column" | no | — | — |
| `slides[].style.justifyContent` | "flex-start" \| "flex-end" \| "center" \| "space-between" \| "space-around" | no | — | — |
| `slides[].style.alignItems` | "flex-start" \| "flex-end" \| "center" \| "stretch" | no | — | — |
| `slides[].style.width` | number \| string | no | — | — |
| `slides[].style.height` | number \| string | no | — | — |
| `slides[].style.padding` | number | no | — | — |
| `slides[].style.paddingTop` | number | no | — | — |
| `slides[].style.paddingRight` | number | no | — | — |
| `slides[].style.paddingBottom` | number | no | — | — |
| `slides[].style.paddingLeft` | number | no | — | — |
| `slides[].style.margin` | number | no | — | — |
| `slides[].style.marginTop` | number | no | — | — |
| `slides[].style.marginRight` | number | no | — | — |
| `slides[].style.marginBottom` | number | no | — | — |
| `slides[].style.marginLeft` | number | no | — | — |
| `slides[].style.position` | "relative" \| "absolute" | no | — | — |
| `slides[].style.top` | number | no | — | — |
| `slides[].style.right` | number | no | — | — |
| `slides[].style.bottom` | number | no | — | — |
| `slides[].style.left` | number | no | — | — |
| `slides[].style.zIndex` | number | no | — | — |
| `slides[].style.backgroundColor` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | no | — | — |
| `slides[].style.flexWrap` | "nowrap" \| "wrap" \| "wrap-reverse" | no | — | — |
| `slides[].style.flexGrow` | number | no | — | — |
| `slides[].style.flexShrink` | number | no | — | — |
| `slides[].style.flexBasis` | number \| string | no | — | — |
| `slides[].style.gap` | number | no | — | — |
| `slides[].style.rowGap` | number | no | — | — |
| `slides[].style.columnGap` | number | no | — | — |
| `slides[].style.minWidth` | number \| string | no | — | — |
| `slides[].style.maxWidth` | number \| string | no | — | — |
| `slides[].style.minHeight` | number \| string | no | — | — |
| `slides[].style.maxHeight` | number \| string | no | — | — |
| `slides[].style.alignSelf` | "auto" \| "flex-start" \| "flex-end" \| "center" \| "stretch" | no | — | — |
| `slides[].style.aspectRatio` | number | no | — | — |
| `slides[].style.display` | "flex" \| "none" | no | — | — |
| `slides[].style.fill` | object | no | — | — |
| `slides[].style.borderRadius` | number | no | — | — |
| `slides[].style.borderWidth` | number | no | — | — |
| `slides[].style.borderColor` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | no | — | — |
| `slides[].style.borderStyle` | "solid" \| "dashed" \| "dotted" \| "dotDash" | no | — | — |
| `slides[].style.borderCap` | "flat" \| "round" \| "square" | no | — | — |
| `slides[].style.borderCompound` | "single" \| "double" \| "thickThin" \| "thinThick" \| "triple" | no | — | — |
| `slides[].style.effects` | object | no | — | — |
| `slides[].style.rotation` | number | no | — | — |
| `slides[].style.opacity` | number | no | — | — |
| `slides[].style.flipH` | boolean | no | — | — |
| `slides[].style.flipV` | boolean | no | — | — |
| `slides[].layoutName` | string | no | — | — |
| `slides[].masterName` | string | no | — | — |
| `slides[].transition` | object | no | — | — |
| `slides[].transition.type` | "fade" \| "push" \| "wipe" \| "cover" \| "zoom" \| "morph" \| ... (+5 more) | yes | — | — |
| `slides[].transition.duration` | number | no | — | — |
| `slides[].transition.direction` | "up" \| "down" \| "left" \| "right" | no | — | — |
| `slides[].transition.advanceOnClick` | boolean | no | — | — |
| `slides[].transition.advanceAfterTime` | number | no | — | — |
| `slides[].background` | "solid" \| "gradient" \| "pattern" \| "image" | no | — | — |
| `slides[].background.type [type="solid"]` | literal "solid" | yes | — | — |
| `slides[].background.color [type="solid"]` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | yes | — | — |
| `slides[].background.type [type="gradient"]` | literal "gradient" | yes | — | — |
| `slides[].background.angle [type="gradient"]` | number | no | — | — |
| `slides[].background.stops [type="gradient"]` | array<object> | yes | — | — |
| `slides[].background.type [type="pattern"]` | literal "pattern" | yes | — | — |
| `slides[].background.pattern [type="pattern"]` | "ltDnDiag" \| "ltUpDiag" \| "dkDnDiag" \| "dkUpDiag" \| "ltHorz" \| "ltVert" \| ... (+10 more) | yes | — | — |
| `slides[].background.foreground [type="pattern"]` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | yes | — | — |
| `slides[].background.background [type="pattern"]` | string \| "dk1" \| "lt1" \| "dk2" \| "lt2" \| "accent1" \| "accent2" \| ... (+10 more) \| object | yes | — | — |
| `slides[].background.type [type="image"]` | literal "image" | yes | — | — |
| `slides[].background.src [type="image"]` | string | yes | — | — |
| `slides[].background.tile [type="image"]` | boolean | no | — | — |
| `slides[].notes` | string \| array<object> | no | — | — |
| `slides[].headerFooter` | object | no | — | — |
| `slides[].headerFooter.slideNumber` | boolean | no | — | — |
| `slides[].headerFooter.footer` | string | no | — | — |
| `slides[].headerFooter.dateTime` | boolean | no | — | — |
| `slides[].comments` | array<object> | no | — | — |
| `slides[].children` | array<"View" \| "Text" \| "Image" \| "Table" \| "Chart" \| "Group" \| ... (+3 more)> | yes | — | — |
## AgentDocument

**Export:** `AgentDocumentSchema`
**Expansion depth:** 4 levels

Semantic PPTX document compiled into the full PPTX AST.

Deep recursive branches stay summarized on their nearest parent row so the generated reference remains navigable.

| Path | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `type` | literal "presentation" | no | `"presentation"` | Document discriminator for the hosted presentation agent contract. |
| `version` | literal "1.0" | no | `"1.0"` | Schema version for migration support |
| `presentationTitle` | string | yes | — | — |
| `companyName` | string | no | — | — |
| `accentColor` | string | no | — | Primary accent hex color |
| `theme` | "default-navy" \| "editorial-serif" \| "monochrome" \| "dark-punch" \| "midnight" \| "terminal" \| ... (+1 more) | no | — | Built-in slide-design preset. |
| `designTokens` | object | no | — | Optional slide-design token overrides applied on top of the selected theme preset. |
| `designTokens.scale` | "sm" \| "md" \| "lg" \| "xl" | no | — | — |
| `designTokens.density` | "compact" \| "balanced" \| "spacious" | no | — | — |
| `designTokens.shape` | "sharp" \| "soft" \| "round" | no | — | — |
| `designTokens.colors` | object | no | — | — |
| `designTokens.colors.accent` | string | no | — | Primary accent color for rules, dividers, and the first chart series. |
| `designTokens.colors.themeDark1` | string | no | — | Theme dark slot 1 for the PPTX theme definition. |
| `designTokens.colors.themeDark2` | string | no | — | Theme dark slot 2 for the PPTX theme definition. |
| `designTokens.colors.themeLight1` | string | no | — | Theme light slot 1 for the PPTX theme definition. |
| `designTokens.colors.themeLight2` | string | no | — | Theme light slot 2 for the PPTX theme definition. |
| `designTokens.colors.slideBackground` | string | no | — | Default background color for non-title slides. |
| `designTokens.colors.titleBackgroundStart` | string | no | — | Start color for the title-slide background gradient. |
| `designTokens.colors.titleBackgroundEnd` | string | no | — | End color for the title-slide background gradient. |
| `designTokens.colors.titleText` | string | no | — | Primary text color on title slides. |
| `designTokens.colors.titleSubtitleText` | string | no | — | Secondary text color on title slides. |
| `designTokens.colors.headingText` | string | no | — | Primary heading color for non-title slides. |
| `designTokens.colors.bodyText` | string | no | — | Primary body copy color for non-title slides. |
| `designTokens.colors.mutedText` | string | no | — | Muted supporting text color for subheaders, labels, and footers. |
| `designTokens.colors.cardBackground` | string | no | — | Background color for light KPI cards and chart plot areas. |
| `designTokens.colors.darkCardBackground` | string | no | — | Background color for dark KPI cards. |
| `designTokens.colors.darkCardText` | string | no | — | Primary text color inside dark KPI cards. |
| `designTokens.colors.darkCardMutedText` | string | no | — | Muted text color inside dark KPI cards. |
| `designTokens.colors.cardBorder` | string | no | — | Border color for outline KPI cards. |
| `designTokens.colors.chartPalette` | array<string> | no | — | Chart series palette in priority order. |
| `designTokens.typography` | object | no | — | — |
| `designTokens.typography.fontStrategy` | "portable" \| "system" \| "user-embedded" \| "embedded" \| "system-safe" \| "named-with-fallback" | no | — | Font handling mode: portable open assets, explicit nonportable system fonts, or caller-supplied embedded fonts. |
| `designTokens.typography.titleFontFamily` | string | no | — | Font family for slide titles and major headings. |
| `designTokens.typography.bodyFontFamily` | string | no | — | Font family for subtitles, body copy, labels, and chart text. |
| `designTokens.typography.heroTitleSize` | number | no | — | Title-slide headline font size. |
| `designTokens.typography.heroSubtitleSize` | number | no | — | Title-slide subtitle font size. |
| `designTokens.typography.headerSize` | number | no | — | Section header font size. |
| `designTokens.typography.subheaderSize` | number | no | — | Section subheader font size. |
| `designTokens.typography.footerSize` | number | no | — | Footer font size. |
| `designTokens.typography.sectionTitleSize` | number | no | — | Statement-slide title size. |
| `designTokens.typography.sectionSubtitleSize` | number | no | — | Statement-slide subtitle size. |
| `designTokens.typography.statementBodySize` | number | no | — | Statement-slide prose size. |
| `designTokens.typography.bulletListSize` | number | no | — | Bullets-slide bullet font size. |
| `designTokens.typography.bulletsProseSize` | number | no | — | Bullets-slide prose font size. |
| `designTokens.typography.comparisonBodySize` | number | no | — | Comparison-slide bullet font size. |
| `designTokens.typography.kpiGradientLabelSize` | number | no | — | Label size for gradient KPI cards. |
| `designTokens.typography.kpiLabelSize` | number | no | — | Label size for dark and outline KPI cards. |
| `designTokens.typography.kpiValueSize` | number | no | — | Value size for KPI cards. |
| `designTokens.typography.kpiSublabelSize` | number | no | — | Sublabel size for KPI cards. |
| `designTokens.typography.chartTitleSize` | number | no | — | Chart title size. |
| `designTokens.typography.chartLegendSize` | number | no | — | Chart legend and axis label size. |
| `designTokens.typography.chartDataLabelSize` | number | no | — | Default chart data-label size. |
| `designTokens.typography.chartPieDataLabelSize` | number | no | — | Pie/doughnut data-label size. |
| `designTokens.layout` | object | no | — | — |
| `designTokens.layout.accentBarHeight` | number | no | — | Accent bar height across the top of a slide. |
| `designTokens.layout.paddingX` | number | no | — | Global horizontal padding fallback for slide content regions. |
| `designTokens.layout.paddingTop` | number | no | — | Global top padding fallback for slide content regions. |
| `designTokens.layout.paddingBottom` | number | no | — | Global bottom padding fallback for slide content regions. |
| `designTokens.layout.headerTop` | number | no | — | Top offset for section headers. |
| `designTokens.layout.subheaderTop` | number | no | — | Top offset for section subheaders. |
| `designTokens.layout.footerBottom` | number | no | — | Bottom offset for footer text. |
| `designTokens.layout.headerLeft` | number | no | — | Left inset for header/footer anchored content. |
| `designTokens.layout.contentWidth` | number | no | — | Maximum width for header/footer anchored content. |
| `designTokens.layout.titlePaddingX` | number | no | — | Horizontal padding on title slides. |
| `designTokens.layout.titlePaddingTop` | number | no | — | Top padding on title slides. |
| `designTokens.layout.titlePaddingBottom` | number | no | — | Bottom padding on title slides. |
| `designTokens.layout.contentPaddingX` | number | no | — | Horizontal padding on content-heavy slides. |
| `designTokens.layout.contentPaddingTop` | number | no | — | Top padding on content-heavy slides. |
| `designTokens.layout.contentPaddingBottom` | number | no | — | Bottom padding on content-heavy slides. |
| `designTokens.layout.titleDividerWidth` | number | no | — | Accent divider width on title slides. |
| `designTokens.layout.titleDividerHeight` | number | no | — | Accent divider height on title slides. |
| `designTokens.layout.titleDividerMarginTop` | number | no | — | Top spacing before the title-slide divider. |
| `designTokens.layout.titleDividerMarginBottom` | number | no | — | Bottom spacing after the title-slide divider. |
| `designTokens.layout.sectionDividerWidth` | number | no | — | Accent divider width on statement slides. |
| `designTokens.layout.sectionDividerHeight` | number | no | — | Accent divider height on statement slides. |
| `designTokens.layout.sectionDividerMarginTop` | number | no | — | Top spacing before the statement divider. |
| `designTokens.layout.sectionDividerMarginBottom` | number | no | — | Bottom spacing after the statement divider. |
| `designTokens.layout.statementParagraphGap` | number | no | — | Top spacing between statement-slide paragraphs. |
| `designTokens.layout.bodyTopWithSubtitle` | number | no | — | Top offset for main content areas when a subheader is present. |
| `designTokens.layout.bodyTopWithoutSubtitle` | number | no | — | Top offset for main content areas without a subheader. |
| `designTokens.layout.bodyHeight` | number | no | — | Default content area height for dashboard/comparison layouts. |
| `designTokens.layout.chartHeight` | number | no | — | Chart area height. |
| `designTokens.layout.dashboardGap` | number | no | — | Gap between KPI cards in dashboard layouts. |
| `designTokens.layout.comparisonGap` | number | no | — | Gap between left and right comparison columns. |
| `designTokens.layout.comparisonColumnWidth` | number | no | — | Width of each comparison column. |
| `designTokens.layout.comparisonColumnGap` | number | no | — | Gap between stacked items inside comparison columns. |
| `designTokens.layout.kpiCardHeight` | number | no | — | Height of KPI cards. |
| `designTokens.layout.kpiCardPadding` | number | no | — | Internal padding of KPI cards. |
| `designTokens.layout.dashboardKpiPanelWidthWithChart` | number | no | — | Dashboard KPI panel width when a chart is present. |
| `designTokens.layout.dashboardPanelWidthFull` | number | no | — | Dashboard KPI panel width when no chart is present. |
| `designTokens.layout.dashboardChartWidthWithKpis` | number | no | — | Dashboard chart width when KPI cards are present. |
| `designTokens.layout.chartFocusSidebarWidth` | number | no | — | Width of the KPI sidebar on chart-focus slides. |
| `designTokens.layout.chartFocusSidebarLeft` | number | no | — | Legacy left offset of the KPI sidebar on chart-focus slides. |
| `designTokens.layout.chartFocusChartWidthWithSidebar` | number | no | — | Chart width on chart-focus slides with a KPI sidebar. |
| `designTokens.layout.chartFocusChartWidthFull` | number | no | — | Chart width on chart-focus slides without a KPI sidebar. |
| `designTokens.layout.bulletsBottomMargin` | number | no | — | Bottom margin on bullets slides. |
| `designTokens.layout.bulletsHeightWithProse` | number | no | — | Bullet block height when prose follows on a bullets slide. |
| `designTokens.layout.proseOffsetAfterBullets` | number | no | — | Vertical offset applied before prose after a bullet block. |
| `designTokens.effects` | object | no | — | — |
| `designTokens.effects.titleGradientAngle` | number | no | — | Angle for the title-slide background gradient. |
| `designTokens.effects.kpiGradientAngle` | number | no | — | Angle for gradient KPI cards. |
| `designTokens.effects.kpiGradientDarkenPercent` | number | no | — | Darkening strength for gradient KPI cards. |
| `designTokens.effects.kpiGradientLabelLightenPercent` | number | no | — | Lightening strength for the gradient KPI label color. |
| `designTokens.effects.kpiGradientSublabelLightenPercent` | number | no | — | Lightening strength for the gradient KPI sublabel color. |
| `designTokens.effects.kpiShapeAdjustment` | number | no | — | Round-rectangle adjustment for KPI cards. |
| `designTokens.effects.outlineBorderWidth` | number | no | — | Border width for outline KPI cards. |
| `designTokens.effects.chartBarGapWidth` | number | no | — | Gap width used for bar charts. |
| `designTokens.effects.chartDoughnutHoleSize` | number | no | — | Hole size for doughnut charts. |
| `slides` | array<object> | yes | — | — |
| `slides[].pattern` | "title" \| "statement" \| "dashboard" \| "comparison" \| "chart-focus" \| "bullets" | yes | — | The semantic layout template to use for this slide. |
| `slides[].content` | object | yes | — | — |
| `slides[].content.title` | string | yes | — | — |
| `slides[].content.subtitle` | string | no | — | — |
| `slides[].content.prose` | array<string> | no | — | Paragraphs of text |
| `slides[].content.bulletPoints` | array<string> | no | — | — |
| `slides[].content.comparison` | object | no | — | Explicit left/right comparison semantics. Use instead of bulletPoints on comparison slides. |
| `slides[].content.comparison.leftLabel` | string | yes | — | Label for the left comparison field |
| `slides[].content.comparison.rightLabel` | string | yes | — | Label for the right comparison field |
| `slides[].content.comparison.rows` | array<object> | yes | — | — |
| `slides[].content.kpis` | array<object> | no | — | — |
| `slides[].content.chart` | object | no | — | — |
| `slides[].content.chart.type` | "bar" \| "line" \| "pie" \| "area" \| "doughnut" \| "radar" | yes | — | Chart type. Supported: bar, line, pie, area, doughnut, radar. |
| `slides[].content.chart.areaGrouping` | "standard" \| "stacked" \| "percentStacked" | no | — | Area-chart grouping mode. Ignored for non-area charts. |
| `slides[].content.chart.title` | string | no | — | — |
| `slides[].content.chart.series` | array<object> | yes | — | — |
