import type { SpreadsheetRenderPlan } from "./render-plan.js";
import type { SpreadsheetRenderModeRecommendation, SpreadsheetStringStrategy } from "./preflight.js";

export interface SpreadsheetPartRenderMetrics {
  path: string;
  stage: "smallPart" | "worksheet" | "worksheetRelationship" | "trailingGlobal";
  byteLength: number;
}

export interface SpreadsheetSheetChunkMetrics {
  startRowNumber: number;
  endRowNumber: number;
  sourceRowCount: number;
  serializedRowCount: number;
  cellCount: number;
  byteLength: number;
}

export interface SpreadsheetSheetRenderMetrics {
  name: string;
  totalRowsWritten: number;
  totalSerializedRows: number;
  totalCellsWritten: number;
  chunkCount: number;
  chunkMetrics: SpreadsheetSheetChunkMetrics[];
}

export interface SpreadsheetRenderStageMetrics {
  worksheetSerializationTimeMs: number;
  stylesSerializationTimeMs: number;
  sharedStringsSerializationTimeMs: number;
  packageSerializationTimeMs: number;
  archiveFinalizationTimeMs: number;
}

export interface SpreadsheetRenderKeyPartBytes {
  sheet1XmlBytes: number;
  stylesXmlBytes: number;
  sharedStringsXmlBytes: number;
  zipBytes: number;
  sheet1XmlCompressedBytes?: number;
  stylesXmlCompressedBytes?: number;
  sharedStringsXmlCompressedBytes?: number;
  sheet1XmlZipContributionBytes?: number;
  stylesXmlZipContributionBytes?: number;
  sharedStringsXmlZipContributionBytes?: number;
  otherZipContributionBytes?: number;
}

export interface SpreadsheetRenderMetrics {
  renderMode: SpreadsheetRenderModeRecommendation;
  stringStrategy: SpreadsheetStringStrategy;
  totalRowsWritten: number;
  totalSerializedRows: number;
  totalCellsWritten: number;
  uniqueStringsCount: number;
  styleCount: number;
  estimatedZipSizeBytes: number;
  outputSizeBytes: number;
  outputSizeDeltaBytes: number;
  totalGenerationTimeMs: number;
  zipFinalizationTimeMs: number;
  stageMetrics: SpreadsheetRenderStageMetrics;
  keyPartBytes: SpreadsheetRenderKeyPartBytes;
  partMetrics: SpreadsheetPartRenderMetrics[];
  sheetMetrics: SpreadsheetSheetRenderMetrics[];
}

export interface SpreadsheetRenderResult {
  buffer: Buffer;
  plan: SpreadsheetRenderPlan;
  metrics: SpreadsheetRenderMetrics;
}
