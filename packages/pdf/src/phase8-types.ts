import type { PdfEmbeddedFontInput } from "./font-embedding.js";
import type { PdfBinarySource } from "./phase4-types.js";
import type { PdfDocumentPhase7 } from "./phase7-types.js";

export type PdfaConformanceLevel = "1b" | "2a" | "2b";

export interface PdfPhase8PdfaOptions {
  conformance?: PdfaConformanceLevel;
  enabled?: boolean;
  fallbackFont?: PdfEmbeddedFontInput;
  fallbackFonts?: PdfEmbeddedFontInput[];
  iccProfile?: PdfBinarySource;
  outputConditionIdentifier?: string;
}

export interface PdfDocumentPhase8 extends PdfDocumentPhase7 {
  pdfa?: PdfPhase8PdfaOptions;
}
