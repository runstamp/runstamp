import type { PdfBinarySource } from "./phase4-types.js";

export type PdfQualityVerdict = "PASS" | "WARN" | "FAIL";
export type PdfValidationVerdict = "clean" | "warnings" | "errors";
export type PdfFindingSeverity = "info" | "warning" | "error";
export type PdfFindingCategory =
  | "signature"
  | "xref"
  | "stream"
  | "font"
  | "image"
  | "pageTree"
  | "tagging"
  | "metadata"
  | "compliance"
  | "operational";
export type PdfComplianceLevel =
  | "base"
  | "interactive"
  | "tagged"
  | "pdfa"
  | "signed"
  | "signed_timestamped";
export type PdfFindingCode =
  | "SIGNATURE_INVALID"
  | "SIGNATURE_MISSING"
  | "TIMESTAMP_MISSING"
  | "TIMESTAMP_INVALID"
  | "XREF_OFFSET_MISMATCH"
  | "XREF_ENTRY_ZERO_OFFSET"
  | "XREF_MISSING"
  | "STREAM_LENGTH_MISMATCH"
  | "EOF_MARKER_MISSING"
  | "ROOT_OBJECT_INVALID"
  | "FONT_SUBSET_INCOMPLETE"
  | "OBJECT_NUMBER_REUSE"
  | "FONT_REFERENCE_MISSING"
  | "FONT_NOT_EMBEDDED"
  | "IMAGE_REFERENCE_MISSING"
  | "PAGE_TREE_COUNT_MISMATCH"
  | "MCID_GAP"
  | "SELF_REFERENCE"
  | "INFO_XMP_MISMATCH";

export interface PdfP12CertificateSource {
  format: "p12";
  passphrase?: string;
  source: PdfBinarySource;
}

export interface PdfPemCertificateSource {
  cert: PdfBinarySource;
  format: "pem";
  key: PdfBinarySource;
  passphrase?: string;
}

export type PdfCertificateSource = PdfP12CertificateSource | PdfPemCertificateSource;

export interface PdfTimestampAuthorityOptions {
  certificate: PdfCertificateSource;
  fieldName?: string;
  placeholderBytes?: number;
  policyOid?: string;
}

export interface PdfSignOptions {
  certificate: PdfCertificateSource;
  contactInfo?: string;
  fieldName?: string;
  location?: string;
  placeholderBytes?: number;
  reason?: string;
  signerName?: string;
  signingDate?: Date | string;
  timestamp?: false | PdfTimestampAuthorityOptions;
}

export interface PdfValidationCheck {
  id: string;
  message: string;
  passed: boolean;
  severity: PdfFindingSeverity;
}

export interface PdfQualityFinding {
  category: PdfFindingCategory;
  code: PdfFindingCode;
  message: string;
  metadata?: Record<string, boolean | number | string>;
  objectNumber?: number;
  repairable: boolean;
  repaired?: boolean;
  severity: PdfFindingSeverity;
}

export interface PdfValidationSummary {
  checks: PdfValidationCheck[];
  complianceLevel: PdfComplianceLevel;
  findings: PdfQualityFinding[];
  fontCount: number;
  imageCount: number;
  pageCount: number;
  signatureCount: number;
  verdict: PdfValidationVerdict;
}

export interface PdfRepairAction {
  code: string;
  description: string;
  objectNumber?: number;
}

export interface PdfRepairOptions {
  deterministic?: boolean;
  recalculateStreamLengths?: boolean;
  rebuildXref?: boolean;
  repairPageTreeCount?: boolean;
  syncMetadata?: boolean;
}

export interface PdfRepairResult {
  actions: PdfRepairAction[];
  buffer: Buffer;
  findings: PdfQualityFinding[];
  repaired: boolean;
  riskyTransformations: boolean;
}

export interface PdfRepairValidationResult {
  original: PdfValidationSummary;
  repair: PdfRepairResult;
  repaired: PdfValidationSummary;
}

export interface PdfQualityReport {
  complianceLevel: PdfComplianceLevel;
  findings: PdfQualityFinding[];
  fontCount: number;
  imageCount: number;
  pageCount: number;
  projectedFileSizeBytes: number;
  signatureCount: number;
  validation: PdfValidationSummary;
  verdict: PdfQualityVerdict;
}

export interface PdfExtractedSignature {
  byteRange: [number, number, number, number];
  contents: Buffer;
  fieldName?: string;
  kind: "signature" | "timestamp";
  objectNumber?: number;
  subFilter: string;
}
