import type {
  CellValue,
  SpreadsheetDocument,
  SpreadsheetPivotChart,
  SpreadsheetPivotDimension,
  SpreadsheetPivotSubtotal,
  SpreadsheetPivotTable,
  SpreadsheetSheet,
} from "../types/spreadsheet-ast.js";
import { isErrorValue, isRichTextValue } from "../types/spreadsheet-ast.js";
import { cellRef, parseCellRef, parseRangeRef, rangeRef } from "../utils/cell-ref.js";
import { dateToSerialString, type ExcelDateSystem } from "../utils/date.js";
import { escapeXml, XML_DECLARATION } from "../utils/xml.js";

export interface WorksheetPivotTableBinding {
  tableId: number;
  cacheId: number;
  partName: string;
  cacheDefinitionPartName: string;
  cacheRecordsPartName: string;
  definition: SpreadsheetPivotTable;
}

export interface SerializedPivotPart {
  path: string;
  xml: string;
}

export interface WorkbookPivotCacheBinding {
  cacheId: number;
  relationshipId: string;
  partName: string;
}

export interface PivotChartPart {
  path: string;
  xml: string;
  sheetIndex: number;
  definition: SpreadsheetPivotChart;
}

export interface PivotArtifacts {
  bindingsBySheet: WorksheetPivotTableBinding[][];
  workbookPivotCaches: WorkbookPivotCacheBinding[];
  pivotTableParts: SerializedPivotPart[];
  pivotCacheDefinitionParts: SerializedPivotPart[];
  pivotCacheDefinitionRelationshipParts: SerializedPivotPart[];
  pivotCacheRecordParts: SerializedPivotPart[];
  pivotChartParts: PivotChartPart[];
}

interface PivotSourceField {
  name: string;
  values: CellValue[];
}

interface ResolvedPivotSource {
  sheet: SpreadsheetSheet;
  range: ReturnType<typeof parseRangeRef>;
  sourceFields: PivotSourceField[];
  fieldIndexByName: Map<string, number>;
  dataRowCount: number;
}

const SUBTOTAL_ATTRIBUTE_BY_KIND: Record<SpreadsheetPivotSubtotal, string> = {
  sum: "sumSubtotal",
  count: "countASubtotal",
  average: "avgSubtotal",
  max: "maxSubtotal",
  min: "minSubtotal",
  product: "productSubtotal",
  countNums: "countSubtotal",
  stdDev: "stdDevSubtotal",
  stdDevP: "stdDevPSubtotal",
  var: "varSubtotal",
  varP: "varPSubtotal",
};

const DATA_FIELD_SUBTOTAL: Record<SpreadsheetPivotSubtotal, string> = {
  sum: "sum",
  count: "countA",
  average: "avg",
  max: "max",
  min: "min",
  product: "product",
  countNums: "count",
  stdDev: "stdDev",
  stdDevP: "stdDevP",
  var: "var",
  varP: "varP",
};

function displayValue(value: CellValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (isRichTextValue(value)) {
    return value.map((run) => run.text).join("");
  }
  if (isErrorValue(value)) {
    return value.error;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function normalizeUniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name, index) => {
    const baseName = name.trim() || `Column${index + 1}`;
    const key = baseName.toLowerCase();
    const nextCount = (seen.get(key) ?? 0) + 1;
    seen.set(key, nextCount);
    return nextCount === 1 ? baseName : `${baseName}_${nextCount}`;
  });
}

function normalizePivotDimension(field: string | SpreadsheetPivotDimension): SpreadsheetPivotDimension {
  return typeof field === "string" ? { name: field } : field;
}

function resolvePivotSource(document: SpreadsheetDocument, pivotTable: SpreadsheetPivotTable): ResolvedPivotSource {
  const sourceSheet = document.sheets.find((sheet) => sheet.name === pivotTable.sourceSheet);
  if (!sourceSheet) {
    throw new Error(`Pivot table ${pivotTable.name} references unknown sheet ${pivotTable.sourceSheet}`);
  }

  const range = parseRangeRef(pivotTable.sourceRef);
  const headerRow = sourceSheet.rows[range.startRow];
  const rawFieldNames: string[] = [];
  for (let column = range.startCol; column <= range.endCol; column += 1) {
    rawFieldNames.push(displayValue(headerRow?.cells[column]?.value) || `Column${column - range.startCol + 1}`);
  }
  const fieldNames = normalizeUniqueNames(rawFieldNames);
  const sourceFields = fieldNames.map((name) => ({ name, values: [] as CellValue[] }));

  for (let row = range.startRow + 1; row <= range.endRow; row += 1) {
    const sourceRow = sourceSheet.rows[row];
    for (let column = range.startCol; column <= range.endCol; column += 1) {
      sourceFields[column - range.startCol]!.values.push(sourceRow?.cells[column]?.value ?? null);
    }
  }

  return {
    sheet: sourceSheet,
    range,
    sourceFields,
    fieldIndexByName: new Map(sourceFields.map((field, index) => [field.name, index])),
    dataRowCount: Math.max(0, range.endRow - range.startRow),
  };
}

function cellValueRecord(value: CellValue | undefined, dateSystem: ExcelDateSystem): string {
  if (value === undefined || value === null || displayValue(value) === "") {
    return "<m/>";
  }
  if (typeof value === "number") {
    return `<n v="${value}"/>`;
  }
  if (typeof value === "boolean") {
    return `<b v="${value ? 1 : 0}"/>`;
  }
  if (value instanceof Date) {
    return `<n v="${dateToSerialString(value, dateSystem)}"/>`;
  }
  return `<s v="${escapeXml(displayValue(value))}"/>`;
}

function serializeSharedItems(values: CellValue[]): string {
  const visibleValues = values.filter((value) => displayValue(value) !== "");
  if (visibleValues.length === 0) {
    return `<sharedItems count="0"/>`;
  }

  const allNumeric = visibleValues.every((value) => typeof value === "number" || value instanceof Date);
  if (allNumeric) {
    return `<sharedItems containsNumber="1" count="0"/>`;
  }

  const uniqueStrings = [...new Set(visibleValues.map((value) => displayValue(value)))];
  return `<sharedItems count="${uniqueStrings.length}">${uniqueStrings.map((value) => `<s v="${escapeXml(value)}"/>`).join("")}</sharedItems>`;
}

function serializePivotCacheDefinition(
  pivotTable: SpreadsheetPivotTable,
  binding: WorksheetPivotTableBinding,
  source: ResolvedPivotSource,
): string {
  const calculatedFields = pivotTable.calculatedFields ?? [];
  const cacheFields = [
    ...source.sourceFields.map((field) => `<cacheField name="${escapeXml(field.name)}" numFmtId="0">${serializeSharedItems(field.values)}</cacheField>`),
    ...calculatedFields.map((field) => `<cacheField name="${escapeXml(field.name)}" numFmtId="0" formula="${escapeXml(field.formula)}"><sharedItems containsNumber="1" count="0"/></cacheField>`),
  ];

  return [
    XML_DECLARATION,
    `<pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" refreshedBy="Runstamp" refreshedDateIso="2026-01-01T00:00:00Z" refreshOnLoad="1" saveData="1" recordCount="${source.dataRowCount}" r:id="rId1">`,
    `<cacheSource type="worksheet"><worksheetSource sheet="${escapeXml(source.sheet.name)}" ref="${escapeXml(pivotTable.sourceRef)}"/></cacheSource>`,
    `<cacheFields count="${cacheFields.length}">${cacheFields.join("")}</cacheFields>`,
    `</pivotCacheDefinition>`,
  ].join("");
}

function serializePivotCacheDefinitionRelationships(binding: WorksheetPivotTableBinding): string {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheRecords" Target="${escapeXml(binding.cacheRecordsPartName)}"/>`,
    `</Relationships>`,
  ].join("");
}

export function serializePivotTableRelationships(binding: WorksheetPivotTableBinding): string {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="../pivotCache/${escapeXml(binding.cacheDefinitionPartName)}"/>`,
    `</Relationships>`,
  ].join("");
}

function serializePivotCacheRecords(
  pivotTable: SpreadsheetPivotTable,
  source: ResolvedPivotSource,
  dateSystem: ExcelDateSystem,
): string {
  const recordRows: string[] = [];
  for (let rowOffset = 0; rowOffset < source.dataRowCount; rowOffset += 1) {
    const rowValues = source.sourceFields.map((field) => cellValueRecord(field.values[rowOffset], dateSystem));
    for (const _calculatedField of pivotTable.calculatedFields ?? []) {
      rowValues.push("<m/>");
    }
    recordRows.push(`<r>${rowValues.join("")}</r>`);
  }

  return [
    XML_DECLARATION,
    `<pivotCacheRecords xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${source.dataRowCount}">`,
    ...recordRows,
    `</pivotCacheRecords>`,
  ].join("");
}

function buildPivotFieldAttributes(
  dimension: SpreadsheetPivotDimension | undefined,
  axis: "axisRow" | "axisCol" | "axisPage" | null,
  isDataField: boolean,
): string {
  const attributes: string[] = [];
  if (axis) {
    attributes.push(`axis="${axis}"`);
  }
  if (isDataField) {
    attributes.push(`dataField="1"`);
  }
  if (dimension?.subtotals === false) {
    attributes.push(`defaultSubtotal="0"`);
  } else if (Array.isArray(dimension?.subtotals) && dimension.subtotals.length > 0) {
    attributes.push(`defaultSubtotal="0"`);
    dimension.subtotals.forEach((subtotal) => {
      attributes.push(`${SUBTOTAL_ATTRIBUTE_BY_KIND[subtotal]}="1"`);
    });
  }
  return attributes.join(" ");
}

function serializePivotTableDefinition(
  pivotTable: SpreadsheetPivotTable,
  binding: WorksheetPivotTableBinding,
  source: ResolvedPivotSource,
): string {
  const rowFields = (pivotTable.rowFields ?? []).map(normalizePivotDimension);
  const columnFields = (pivotTable.columnFields ?? []).map(normalizePivotDimension);
  const filterFields = (pivotTable.filterFields ?? []).map((name) => ({ name }));
  const dataFieldNames = new Set(pivotTable.valueFields.map((field) => field.name));
  const calculatedFields = pivotTable.calculatedFields ?? [];
  const allFieldNames = [
    ...source.sourceFields.map((field) => field.name),
    ...calculatedFields.map((field) => field.name),
  ];
  const fieldIndexByName = new Map(allFieldNames.map((name, index) => [name, index]));
  const hasMultipleValues = pivotTable.valueFields.length > 1 && (rowFields.length > 0 || columnFields.length > 0);
  const valuesAxis = hasMultipleValues ? (pivotTable.valuesAxis ?? (columnFields.length > 0 ? "column" : "row")) : undefined;

  const pivotFieldsXml = allFieldNames.map((fieldName) => {
    const dimension = rowFields.find((field) => field.name === fieldName)
      ?? columnFields.find((field) => field.name === fieldName)
      ?? filterFields.find((field) => field.name === fieldName);
    const axis = rowFields.some((field) => field.name === fieldName)
      ? "axisRow"
      : (columnFields.some((field) => field.name === fieldName)
        ? "axisCol"
        : (filterFields.some((field) => field.name === fieldName) ? "axisPage" : null));
    const attributes = buildPivotFieldAttributes(dimension, axis, dataFieldNames.has(fieldName));
    return `<pivotField${attributes ? ` ${attributes}` : ""}/>`;
  }).join("");

  const rowFieldIndexes = rowFields.map((field) => fieldIndexByName.get(field.name) ?? -1);
  const columnFieldIndexes = columnFields.map((field) => fieldIndexByName.get(field.name) ?? -1);
  if (hasMultipleValues) {
    if (valuesAxis === "row") {
      rowFieldIndexes.push(-2);
    } else {
      columnFieldIndexes.push(-2);
    }
  }
  const filterFieldIndexes = filterFields.map((field) => fieldIndexByName.get(field.name) ?? -1);

  const dataFieldsXml = pivotTable.valueFields.map((field) => {
    const fieldIndex = fieldIndexByName.get(field.name);
    if (fieldIndex === undefined) {
      throw new Error(`Pivot table ${pivotTable.name} references unknown value field ${field.name}`);
    }
    return `<dataField fld="${fieldIndex}" subtotal="${DATA_FIELD_SUBTOTAL[field.summarizeBy ?? "sum"]}" name="${escapeXml(field.title ?? `${field.summarizeBy ?? "sum"} of ${field.name}`)}"/>`;
  }).join("");

  const target = parseCellRef(pivotTable.targetCell);
  const locationWidth = Math.max(2, rowFields.length + pivotTable.valueFields.length + (pivotTable.showRowGrandTotals === false ? 0 : 1));
  const locationHeight = Math.max(3, columnFields.length + 3 + (pivotTable.showColumnGrandTotals === false ? 0 : 1));
  const locationRef = rangeRef(
    target.row,
    target.col,
    target.row + locationHeight,
    target.col + locationWidth,
  );

  return [
    XML_DECLARATION,
    `<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" name="${escapeXml(pivotTable.name)}" cacheId="${binding.cacheId}" dataCaption="Values" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataOnRows="${valuesAxis === "row" ? 1 : 0}" rowGrandTotals="${pivotTable.showRowGrandTotals === false ? 0 : 1}" colGrandTotals="${pivotTable.showColumnGrandTotals === false ? 0 : 1}">`,
    `<location ref="${locationRef}" firstHeaderRow="1" firstDataRow="${Math.max(1, columnFields.length + 1)}" firstDataCol="${Math.max(1, rowFields.length)}"/>`,
    `<pivotFields count="${allFieldNames.length}">${pivotFieldsXml}</pivotFields>`,
    rowFieldIndexes.length > 0 ? `<rowFields count="${rowFieldIndexes.length}">${rowFieldIndexes.map((index) => `<field x="${index}"/>`).join("")}</rowFields>` : "",
    columnFieldIndexes.length > 0 ? `<colFields count="${columnFieldIndexes.length}">${columnFieldIndexes.map((index) => `<field x="${index}"/>`).join("")}</colFields>` : "",
    filterFieldIndexes.length > 0 ? `<pageFields count="${filterFieldIndexes.length}">${filterFieldIndexes.map((index) => `<pageField fld="${index}" item="0"/>`).join("")}</pageFields>` : "",
    `<dataFields count="${pivotTable.valueFields.length}">${dataFieldsXml}</dataFields>`,
    `<pivotTableStyleInfo name="${escapeXml(pivotTable.style?.name ?? "PivotStyleLight16")}" showRowHeaders="${pivotTable.style?.showRowHeaders === false ? 0 : 1}" showColHeaders="${pivotTable.style?.showColumnHeaders === false ? 0 : 1}" showRowStripes="${pivotTable.style?.showRowStripes ? 1 : 0}" showColStripes="${pivotTable.style?.showColumnStripes ? 1 : 0}" showLastColumn="${pivotTable.style?.showLastColumn ? 1 : 0}"/>`,
    `</pivotTableDefinition>`,
  ].filter(Boolean).join("");
}

function serializePivotChartSeries(seriesNames: string[]): string {
  return seriesNames.map((name, index) => [
    `<c:ser>`,
    `<c:idx val="${index}"/>`,
    `<c:order val="${index}"/>`,
    `<c:tx><c:v>${escapeXml(name)}</c:v></c:tx>`,
    `</c:ser>`,
  ].join("")).join("");
}

function serializePivotChartPlotArea(chart: SpreadsheetPivotChart, seriesNames: string[]): string {
  const series = serializePivotChartSeries(seriesNames);
  switch (chart.type) {
    case "bar":
    case "col":
      return [
        `<c:plotArea><c:layout/>`,
        `<c:barChart><c:barDir val="${chart.type === "bar" ? "bar" : "col"}"/><c:grouping val="clustered"/>${series}<c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>`,
        `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="${chart.type === "bar" ? "l" : "b"}"/><c:crossAx val="222222222"/></c:catAx>`,
        `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="${chart.type === "bar" ? "b" : "l"}"/><c:crossAx val="111111111"/></c:valAx>`,
        `</c:plotArea>`,
      ].join("");
    case "line":
      return `<c:plotArea><c:layout/><c:lineChart><c:grouping val="standard"/>${series}<c:axId val="111111111"/><c:axId val="222222222"/></c:lineChart><c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx><c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx></c:plotArea>`;
    case "pie":
    case "doughnut":
      return `<c:plotArea><c:layout/><c:${chart.type === "pie" ? "pieChart" : "doughnutChart"}>${series}${chart.type === "doughnut" ? `<c:holeSize val="50"/>` : ""}</c:${chart.type === "pie" ? "pieChart" : "doughnutChart"}></c:plotArea>`;
    default:
      return `<c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>${series}<c:axId val="111111111"/><c:axId val="222222222"/></c:barChart><c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx><c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx></c:plotArea>`;
  }
}

function serializePivotChart(chart: SpreadsheetPivotChart, pivotTableName: string, seriesNames: string[]): string {
  return [
    XML_DECLARATION,
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">`,
    `<c:pivotSource><c:name>${escapeXml(pivotTableName)}</c:name><c:fmtId val="0"/></c:pivotSource>`,
    `<c:chart>`,
    chart.title
      ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
      : `<c:autoTitleDeleted val="1"/>`,
    serializePivotChartPlotArea(chart, seriesNames),
    chart.style?.showLegend === false ? "" : `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>`,
    `<c:plotVisOnly val="1"/>`,
    `</c:chart>`,
    `</c:chartSpace>`,
  ].join("");
}

export function buildPivotArtifacts(
  document: SpreadsheetDocument,
  startingChartIndex = 0,
  dateSystem: ExcelDateSystem = "1900",
): PivotArtifacts {
  let nextPivotId = 1;
  let nextChartIndex = startingChartIndex;
  const bindingsBySheet: WorksheetPivotTableBinding[][] = document.sheets.map(() => []);
  const workbookPivotCaches: WorkbookPivotCacheBinding[] = [];
  const pivotTableParts: SerializedPivotPart[] = [];
  const pivotCacheDefinitionParts: SerializedPivotPart[] = [];
  const pivotCacheDefinitionRelationshipParts: SerializedPivotPart[] = [];
  const pivotCacheRecordParts: SerializedPivotPart[] = [];
  const pivotChartParts: PivotChartPart[] = [];
  const pivotNameLookup = new Map<string, { binding: WorksheetPivotTableBinding; source: ResolvedPivotSource; valueFieldTitles: string[] }>();

  document.sheets.forEach((sheet, sheetIndex) => {
    for (const pivotTable of sheet.pivotTables ?? []) {
      const binding: WorksheetPivotTableBinding = {
        tableId: nextPivotId,
        cacheId: nextPivotId,
        partName: `pivotTable${nextPivotId}.xml`,
        cacheDefinitionPartName: `pivotCacheDefinition${nextPivotId}.xml`,
        cacheRecordsPartName: `pivotCacheRecords${nextPivotId}.xml`,
        definition: pivotTable,
      };
      const source = resolvePivotSource(document, pivotTable);
      const valueFieldTitles = pivotTable.valueFields.map((field) => field.title ?? `${field.summarizeBy ?? "sum"} of ${field.name}`);

      bindingsBySheet[sheetIndex]!.push(binding);
      workbookPivotCaches.push({
        cacheId: binding.cacheId,
        relationshipId: `rIdPivotCache${binding.cacheId}`,
        partName: binding.cacheDefinitionPartName,
      });
      pivotTableParts.push({
        path: `xl/pivotTables/${binding.partName}`,
        xml: serializePivotTableDefinition(pivotTable, binding, source),
      });
      pivotCacheDefinitionParts.push({
        path: `xl/pivotCache/${binding.cacheDefinitionPartName}`,
        xml: serializePivotCacheDefinition(pivotTable, binding, source),
      });
      pivotCacheDefinitionRelationshipParts.push({
        path: `xl/pivotCache/_rels/${binding.cacheDefinitionPartName}.rels`,
        xml: serializePivotCacheDefinitionRelationships(binding),
      });
      pivotCacheRecordParts.push({
        path: `xl/pivotCache/${binding.cacheRecordsPartName}`,
        xml: serializePivotCacheRecords(pivotTable, source, dateSystem),
      });
      pivotNameLookup.set(pivotTable.name, {
        binding,
        source,
        valueFieldTitles,
      });
      nextPivotId += 1;
    }
  });

  document.sheets.forEach((sheet, sheetIndex) => {
    for (const pivotChart of sheet.pivotCharts ?? []) {
      const target = pivotNameLookup.get(pivotChart.pivotTable);
      if (!target) {
        throw new Error(`Pivot chart references unknown pivot table ${pivotChart.pivotTable}`);
      }
      nextChartIndex += 1;
      pivotChartParts.push({
        path: `xl/charts/chart${nextChartIndex}.xml`,
        xml: serializePivotChart(pivotChart, pivotChart.pivotTable, target.valueFieldTitles),
        sheetIndex,
        definition: pivotChart,
      });
    }
  });

  return {
    bindingsBySheet,
    workbookPivotCaches,
    pivotTableParts,
    pivotCacheDefinitionParts,
    pivotCacheDefinitionRelationshipParts,
    pivotCacheRecordParts,
    pivotChartParts,
  };
}
