import { XML_DECLARATION } from "../utils/xml.js";

export function serializeContentTypes(
  sheetCount: number,
  options?: {
    includeSharedStrings?: boolean;
    tableCount?: number;
    commentSheetIndices?: number[];
    drawingSheetIndices?: number[];
    imageTypes?: Array<"png" | "jpeg">;
    chartCount?: number;
    pivotTableCount?: number;
    pivotCacheDefinitionCount?: number;
    pivotCacheRecordCount?: number;
  },
): string {
  const parts: string[] = [
    XML_DECLARATION,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
  ];

  const commentSheetIndices = options?.commentSheetIndices ?? [];
  if (commentSheetIndices.length > 0) {
    parts.push(`<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>`);
  }

  const imageTypes = options?.imageTypes ?? [];
  if (imageTypes.includes("png")) {
    parts.push(`<Default Extension="png" ContentType="image/png"/>`);
  }
  if (imageTypes.includes("jpeg")) {
    parts.push(`<Default Extension="jpeg" ContentType="image/jpeg"/>`);
  }

  parts.push(
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
  );

  for (let index = 0; index < sheetCount; index += 1) {
    parts.push(
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
  }

  for (let index = 0; index < (options?.tableCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/tables/table${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`,
    );
  }

  for (const sheetIndex of commentSheetIndices) {
    parts.push(
      `<Override PartName="/xl/comments${sheetIndex + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>`,
    );
  }

  const drawingSheetIndices = options?.drawingSheetIndices ?? [];
  for (const sheetIndex of drawingSheetIndices) {
    parts.push(
      `<Override PartName="/xl/drawings/drawing${sheetIndex + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    );
  }

  const chartCount = options?.chartCount ?? 0;
  for (let index = 0; index < chartCount; index += 1) {
    parts.push(
      `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
    );
  }

  for (let index = 0; index < (options?.pivotTableCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/pivotTables/pivotTable${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml"/>`,
    );
  }

  for (let index = 0; index < (options?.pivotCacheDefinitionCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/pivotCache/pivotCacheDefinition${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml"/>`,
    );
  }

  for (let index = 0; index < (options?.pivotCacheRecordCount ?? 0); index += 1) {
    parts.push(
      `<Override PartName="/xl/pivotCache/pivotCacheRecords${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml"/>`,
    );
  }

  parts.push(
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`,
  );
  if (options?.includeSharedStrings !== false) {
    parts.push(`<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`);
  }
  parts.push(`</Types>`);

  return parts.join("");
}

export function serializePackageRels(): string {
  return [
    XML_DECLARATION,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`,
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>`,
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>`,
    `</Relationships>`,
  ].join("");
}
