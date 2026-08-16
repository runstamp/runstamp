# @runstamp/xlsx Schema Reference

This file is generated from exported Zod schemas in the package source. Do not edit it by hand.

## SpreadsheetDocument

**Export:** `SpreadsheetDocumentSchema`
**Expansion depth:** 4 levels

Workbook document input with sheets, rows, styles, tables, and charts.

Deep recursive branches stay summarized on their nearest parent row so the generated reference remains navigable.

| Path | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `accessible` | boolean \| object | no | — | — |
| `accessible.level` | "A" \| "AA" \| "AAA" | yes | — | — |
| `accessible.language` | string | no | — | — |
| `accessible.title` | string | no | — | — |
| `accessible.autoAltText` | boolean | no | — | — |
| `accessible.enforceHeadingHierarchy` | boolean | no | — | — |
| `accessible.enforceTableHeaders` | boolean | no | — | — |
| `meta` | object | no | — | — |
| `meta.title` | string | no | — | — |
| `meta.language` | string | no | — | — |
| `meta.creator` | string | no | — | — |
| `meta.company` | string | no | — | — |
| `meta.created` | date | no | — | — |
| `meta.modified` | date | no | — | — |
| `meta.description` | string | no | — | — |
| `meta.category` | string | no | — | — |
| `meta.keywords` | array<string> | no | — | — |
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
| `defaults` | object | no | — | — |
| `defaults.font` | object | no | — | — |
| `defaults.font.family` | string | yes | — | — |
| `defaults.font.size` | number | yes | — | — |
| `defaults.columnWidth` | number | no | — | — |
| `defaults.rowHeight` | number | no | — | — |
| `date1904` | boolean | no | — | — |
| `namedRanges` | array<object> | no | — | — |
| `namedRanges[].name` | string | yes | — | — |
| `namedRanges[].ref` | string | yes | — | — |
| `namedRanges[].scope` | string | no | — | — |
| `sheets` | array<object> | yes | — | — |
| `sheets[].name` | string | yes | — | — |
| `sheets[].columns` | array<object> | no | — | — |
| `sheets[].columns[].width` | number | no | — | — |
| `sheets[].columns[].hidden` | boolean | no | — | — |
| `sheets[].columns[].bestFit` | boolean | no | — | — |
| `sheets[].rows` | array<object> | yes | — | — |
| `sheets[].rows[].height` | number | no | — | — |
| `sheets[].rows[].hidden` | boolean | no | — | — |
| `sheets[].rows[].cells` | array<object> | yes | — | — |
| `sheets[].mergedCells` | array<string> | no | — | — |
| `sheets[].freezePane` | object | no | — | — |
| `sheets[].freezePane.row` | number | yes | — | — |
| `sheets[].freezePane.col` | number | yes | — | — |
| `sheets[].autoFilter` | literal true \| object | no | — | — |
| `sheets[].autoFilter.ref` | string | yes | — | — |
| `sheets[].dataValidations` | array<object> | no | — | — |
| `sheets[].dataValidations[].ref` | string | yes | — | — |
| `sheets[].dataValidations[].type` | "whole" \| "decimal" \| "list" \| "date" \| "time" \| "textLength" \| ... (+1 more) | yes | — | — |
| `sheets[].dataValidations[].operator` | "between" \| "notBetween" \| "equal" \| "notEqual" \| "greaterThan" \| "lessThan" \| ... (+2 more) | no | — | — |
| `sheets[].dataValidations[].formula1` | string \| number \| array<string> | yes | — | — |
| `sheets[].dataValidations[].formula2` | string \| number | no | — | — |
| `sheets[].dataValidations[].allowBlank` | boolean | no | — | — |
| `sheets[].dataValidations[].showDropDown` | boolean | no | — | — |
| `sheets[].dataValidations[].showInputMessage` | boolean | no | — | — |
| `sheets[].dataValidations[].promptTitle` | string | no | — | — |
| `sheets[].dataValidations[].prompt` | string | no | — | — |
| `sheets[].dataValidations[].showErrorMessage` | boolean | no | — | — |
| `sheets[].dataValidations[].errorTitle` | string | no | — | — |
| `sheets[].dataValidations[].error` | string | no | — | — |
| `sheets[].dataValidations[].errorStyle` | "stop" \| "warning" \| "information" | no | — | — |
| `sheets[].pageSetup` | object | no | — | — |
| `sheets[].pageSetup.paperSize` | number | no | — | — |
| `sheets[].pageSetup.orientation` | "portrait" \| "landscape" | no | — | — |
| `sheets[].pageSetup.scale` | number | no | — | — |
| `sheets[].pageSetup.fitToWidth` | number | no | — | — |
| `sheets[].pageSetup.fitToHeight` | number | no | — | — |
| `sheets[].pageSetup.printArea` | string | no | — | — |
| `sheets[].pageSetup.printTitles` | object | no | — | — |
| `sheets[].pageSetup.printTitles.rows` | object | no | — | — |
| `sheets[].pageSetup.printTitles.columns` | object | no | — | — |
| `sheets[].pageSetup.options` | object | no | — | — |
| `sheets[].pageSetup.options.gridLines` | boolean | no | — | — |
| `sheets[].pageSetup.options.headings` | boolean | no | — | — |
| `sheets[].pageSetup.margins` | object | no | — | — |
| `sheets[].pageSetup.margins.left` | number | no | — | — |
| `sheets[].pageSetup.margins.right` | number | no | — | — |
| `sheets[].pageSetup.margins.top` | number | no | — | — |
| `sheets[].pageSetup.margins.bottom` | number | no | — | — |
| `sheets[].pageSetup.margins.header` | number | no | — | — |
| `sheets[].pageSetup.margins.footer` | number | no | — | — |
| `sheets[].state` | "visible" \| "hidden" \| "veryHidden" | no | — | — |
| `sheets[].tabColor` | string | no | — | — |
| `sheets[].rightToLeft` | boolean | no | — | — |
| `sheets[].styling` | object | no | — | — |
| `sheets[].styling.headerRow` | string \| object | no | — | — |
| `sheets[].styling.headerRow.preset` | string | no | — | — |
| `sheets[].styling.headerRow.numberFormat` | string | no | — | — |
| `sheets[].styling.headerRow.font` | object | no | — | — |
| `sheets[].styling.headerRow.fill` | object | no | — | — |
| `sheets[].styling.headerRow.border` | object | no | — | — |
| `sheets[].styling.headerRow.alignment` | object | no | — | — |
| `sheets[].styling.headerRow.protection` | object | no | — | — |
| `sheets[].styling.alternateRows` | object | no | — | — |
| `sheets[].styling.alternateRows.odd` | string \| object | no | — | — |
| `sheets[].styling.alternateRows.even` | string \| object | no | — | — |
| `sheets[].conditionalFormatting` | array<object> | no | — | — |
| `sheets[].conditionalFormatting[].ref` | string | yes | — | — |
| `sheets[].conditionalFormatting[].rules` | array<"cellIs" \| "colorScale" \| "dataBar" \| "top10" \| "duplicateValues" \| "uniqueValues" \| ... (+1 more)> | yes | — | — |
| `sheets[].tables` | array<object> | no | — | — |
| `sheets[].tables[].name` | string | yes | — | — |
| `sheets[].tables[].displayName` | string | no | — | — |
| `sheets[].tables[].ref` | string | yes | — | — |
| `sheets[].tables[].totalsRow` | boolean | no | — | — |
| `sheets[].tables[].columns` | array<object> | no | — | — |
| `sheets[].tables[].style` | object | no | — | — |
| `sheets[].protection` | object | no | — | — |
| `sheets[].protection.password` | string | no | — | — |
| `sheets[].protection.sheet` | boolean | no | — | — |
| `sheets[].protection.objects` | boolean | no | — | — |
| `sheets[].protection.scenarios` | boolean | no | — | — |
| `sheets[].protection.formatCells` | boolean | no | — | — |
| `sheets[].protection.formatColumns` | boolean | no | — | — |
| `sheets[].protection.formatRows` | boolean | no | — | — |
| `sheets[].protection.insertColumns` | boolean | no | — | — |
| `sheets[].protection.insertRows` | boolean | no | — | — |
| `sheets[].protection.insertHyperlinks` | boolean | no | — | — |
| `sheets[].protection.deleteColumns` | boolean | no | — | — |
| `sheets[].protection.deleteRows` | boolean | no | — | — |
| `sheets[].protection.selectLockedCells` | boolean | no | — | — |
| `sheets[].protection.sort` | boolean | no | — | — |
| `sheets[].protection.autoFilter` | boolean | no | — | — |
| `sheets[].protection.pivotTables` | boolean | no | — | — |
| `sheets[].protection.selectUnlockedCells` | boolean | no | — | — |
| `sheets[].images` | array<object> | no | — | — |
| `sheets[].images[].data` | custom | yes | — | — |
| `sheets[].images[].type` | "png" \| "jpeg" | yes | — | — |
| `sheets[].images[].anchor` | object | yes | — | — |
| `sheets[].images[].name` | string | no | — | — |
| `sheets[].images[].description` | string | no | — | — |
| `sheets[].images[].width` | number | no | — | — |
| `sheets[].images[].height` | number | no | — | — |
| `sheets[].charts` | array<object> | no | — | — |
| `sheets[].charts[].type` | "bar" \| "col" \| "line" \| "pie" \| "scatter" \| "area" \| ... (+5 more) | yes | — | — |
| `sheets[].charts[].title` | string | no | — | — |
| `sheets[].charts[].series` | array<object> | yes | — | — |
| `sheets[].charts[].anchor` | object | yes | — | — |
| `sheets[].charts[].width` | number | no | — | — |
| `sheets[].charts[].height` | number | no | — | — |
| `sheets[].charts[].style` | object | no | — | — |
| `sheets[].pivotTables` | array<object> | no | — | — |
| `sheets[].pivotTables[].name` | string | yes | — | — |
| `sheets[].pivotTables[].sourceSheet` | string | yes | — | — |
| `sheets[].pivotTables[].sourceRef` | string | yes | — | — |
| `sheets[].pivotTables[].targetCell` | string | yes | — | — |
| `sheets[].pivotTables[].rowFields` | array<string \| object> | no | — | — |
| `sheets[].pivotTables[].columnFields` | array<string \| object> | no | — | — |
| `sheets[].pivotTables[].filterFields` | array<string> | no | — | — |
| `sheets[].pivotTables[].valueFields` | array<object> | yes | — | — |
| `sheets[].pivotTables[].calculatedFields` | array<object> | no | — | — |
| `sheets[].pivotTables[].valuesAxis` | "row" \| "column" | no | — | — |
| `sheets[].pivotTables[].showRowGrandTotals` | boolean | no | — | — |
| `sheets[].pivotTables[].showColumnGrandTotals` | boolean | no | — | — |
| `sheets[].pivotTables[].style` | object | no | — | — |
| `sheets[].pivotCharts` | array<object> | no | — | — |
| `sheets[].pivotCharts[].pivotTable` | string | yes | — | — |
| `sheets[].pivotCharts[].type` | "bar" \| "col" \| "line" \| "pie" \| "scatter" \| "area" \| ... (+5 more) | yes | — | — |
| `sheets[].pivotCharts[].title` | string | no | — | — |
| `sheets[].pivotCharts[].anchor` | object | yes | — | — |
| `sheets[].pivotCharts[].width` | number | no | — | — |
| `sheets[].pivotCharts[].height` | number | no | — | — |
| `sheets[].pivotCharts[].style` | object | no | — | — |
