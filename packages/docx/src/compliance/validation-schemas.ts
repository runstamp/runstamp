/**
 * Compliance Validation Schemas
 * =============================
 * PRD-002 Section 3: Compliance Primitives Validation
 *
 * Zod schemas for validating compliance component inputs
 * before rendering to prevent non-compliant invoices.
 */

import { z } from "zod";

// ============================================================================
// India GST Validation (PRD-002 §3.1)
// ============================================================================

/**
 * GSTIN format: 2 state code + 10 PAN + 1 entity + 1 checksum
 * Example: 29AABCT1332L1ZZ
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * HSN Code: 4-8 digit code
 */
const HSN_REGEX = /^[0-9]{4,8}$/;

/**
 * IRN: 64 character alphanumeric hash
 */
const IRN_REGEX = /^[a-f0-9]{64}$/i;

/**
 * India GST QR Code validation schema
 * Validates input against e-invoice JSON Schema (INV-01)
 */
export const IndiaGSTQRSchema = z.object({
  gstinSupplier: z
    .string()
    .length(15, "Supplier GSTIN must be exactly 15 characters")
    .regex(GSTIN_REGEX, "Invalid Supplier GSTIN format"),

  gstinBuyer: z
    .string()
    .length(15, "Buyer GSTIN must be exactly 15 characters")
    .regex(GSTIN_REGEX, "Invalid Buyer GSTIN format"),

  invoiceNumber: z
    .string()
    .min(1, "Invoice number is required")
    .max(16, "Invoice number must be at most 16 characters"),

  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invoice date must be in YYYY-MM-DD format")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid invoice date"),

  totalValue: z
    .number()
    .positive("Total value must be positive")
    .max(999999999999.99, "Total value exceeds maximum allowed"),

  itemCount: z
    .number()
    .int("Item count must be an integer")
    .positive("Item count must be positive")
    .max(1000, "Item count exceeds maximum allowed"),

  hsnCode: z.string().regex(HSN_REGEX, "HSN code must be 4-8 digits"),

  irn: z
    .string()
    .regex(IRN_REGEX, "IRN must be a 64-character hexadecimal hash")
    .optional(),

  signedQRString: z.string().optional(),
});

export type IndiaGSTQRInput = z.infer<typeof IndiaGSTQRSchema>;

/**
 * Validation result for India GST
 */
export interface GSTValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: string[];
}

/**
 * Validate India GST QR input
 */
export function validateIndiaGSTQR(input: unknown): GSTValidationResult {
  const result = IndiaGSTQRSchema.safeParse(input);

  if (result.success) {
    const warnings: string[] = [];

    // Additional business rule warnings
    if (!result.data.irn) {
      warnings.push(
        "No IRN provided. QR code will not be valid for B2B invoices > ₹50L",
      );
    }

    // Check if GSTIN state codes match for intra-state
    const supplierState = result.data.gstinSupplier.substring(0, 2);
    const buyerState = result.data.gstinBuyer.substring(0, 2);

    if (supplierState === buyerState) {
      warnings.push(
        "Intra-state transaction detected. Verify CGST/SGST application.",
      );
    }

    return { valid: true, errors: [], warnings };
  }

  return {
    valid: false,
    errors: result.error.issues.map((err: z.ZodIssue) => ({
      field: err.path.join("."),
      message: err.message,
    })),
    warnings: [],
  };
}

// ============================================================================
// EU VAT Validation (PRD-002 §3.2)
// ============================================================================

/**
 * EU VAT number patterns by country
 */
const VAT_PATTERNS: Record<string, RegExp> = {
  AT: /^ATU\d{8}$/, // Austria
  BE: /^BE0?\d{9,10}$/, // Belgium
  BG: /^BG\d{9,10}$/, // Bulgaria
  CY: /^CY\d{8}[A-Z]$/, // Cyprus
  CZ: /^CZ\d{8,10}$/, // Czech Republic
  DE: /^DE\d{9}$/, // Germany
  DK: /^DK\d{8}$/, // Denmark
  EE: /^EE\d{9}$/, // Estonia
  EL: /^EL\d{9}$/, // Greece
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, // Spain
  FI: /^FI\d{8}$/, // Finland
  FR: /^FR[A-Z0-9]{2}\d{9}$/, // France
  HR: /^HR\d{11}$/, // Croatia
  HU: /^HU\d{8}$/, // Hungary
  IE: /^IE\d{7}[A-Z]{1,2}$|^IE\d[A-Z]\d{5}[A-Z]$/, // Ireland
  IT: /^IT\d{11}$/, // Italy
  LT: /^LT(\d{9}|\d{12})$/, // Lithuania
  LU: /^LU\d{8}$/, // Luxembourg
  LV: /^LV\d{11}$/, // Latvia
  MT: /^MT\d{8}$/, // Malta
  NL: /^NL\d{9}B\d{2}$/, // Netherlands
  PL: /^PL\d{10}$/, // Poland
  PT: /^PT\d{9}$/, // Portugal
  RO: /^RO\d{2,10}$/, // Romania
  SE: /^SE\d{12}$/, // Sweden
  SI: /^SI\d{8}$/, // Slovenia
  SK: /^SK\d{10}$/, // Slovakia
};

/**
 * EU Reverse Charge validation schema
 */
export const EUReverseChargeSchema = z.object({
  supplierCountry: z
    .string()
    .length(2, "Country code must be 2 characters")
    .transform((v) => v.toUpperCase()),

  customerCountry: z
    .string()
    .length(2, "Country code must be 2 characters")
    .transform((v) => v.toUpperCase()),

  isVatRegistered: z.boolean(),

  vatNumber: z.string().optional(),

  language: z.enum(["en", "de", "fr", "es", "it", "nl", "pt"]).default("en"),
});

export type EUReverseChargeInput = z.infer<typeof EUReverseChargeSchema>;

/**
 * Validation result for EU VAT
 */
export interface VATValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: string[];
  scenario: "reverse_charge" | "zero_rate_export" | "domestic" | "b2c" | "none";
  requiredText?: string;
}

const EU_MEMBER_STATES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

/**
 * Validate EU reverse charge input
 */
export function validateEUReverseCharge(input: unknown): VATValidationResult {
  const result = EUReverseChargeSchema.safeParse(input);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        message: err.message,
      })),
      warnings: [],
      scenario: "none",
    };
  }

  const data = result.data;
  const warnings: string[] = [];
  const errors: Array<{ field: string; message: string }> = [];

  const supplierIsEU = EU_MEMBER_STATES.has(data.supplierCountry);
  const customerIsEU = EU_MEMBER_STATES.has(data.customerCountry);
  const isCrossBorder = data.supplierCountry !== data.customerCountry;

  // Validate VAT number format if provided
  if (data.vatNumber) {
    const countryPrefix = data.vatNumber.substring(0, 2).toUpperCase();
    const pattern = VAT_PATTERNS[countryPrefix];

    if (pattern && !pattern.test(data.vatNumber.toUpperCase())) {
      warnings.push(`VAT number format may be invalid for ${countryPrefix}`);
    }
  }

  // Determine scenario
  let scenario: VATValidationResult["scenario"] = "none";
  let requiredText: string | undefined;

  if (supplierIsEU && customerIsEU && isCrossBorder && data.isVatRegistered) {
    scenario = "reverse_charge";
    requiredText =
      "VAT Reverse Charge - Art. 196 Council Directive 2006/112/EC";

    if (!data.vatNumber) {
      errors.push({
        field: "vatNumber",
        message: "VAT number required for reverse charge transactions",
      });
    }
  } else if (supplierIsEU && !customerIsEU) {
    scenario = "zero_rate_export";
    requiredText = "Export of goods/services - Zero-rated for VAT purposes";
  } else if (!isCrossBorder && data.isVatRegistered) {
    scenario = "domestic";
  } else if (!data.isVatRegistered) {
    scenario = "b2c";
    warnings.push("B2C transaction - Standard VAT rates apply");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    scenario,
    requiredText,
  };
}

// ============================================================================
// Brazilian DANFE Validation
// ============================================================================

/**
 * CNPJ format: 14 digits
 */
const CNPJ_REGEX = /^\d{14}$/;

/**
 * CPF format: 11 digits
 */
const CPF_REGEX = /^\d{11}$/;

/**
 * NF-e access key: 44 digits
 */
const NFE_KEY_REGEX = /^\d{44}$/;

/**
 * Brazilian DANFE validation schema
 */
export const BrazilianDanfeSchema = z.object({
  nfeKey: z.string().regex(NFE_KEY_REGEX, "NF-e access key must be 44 digits"),

  issuerCnpj: z.string().regex(CNPJ_REGEX, "Issuer CNPJ must be 14 digits"),

  recipientDocument: z
    .string()
    .refine(
      (val) => CNPJ_REGEX.test(val) || CPF_REGEX.test(val),
      "Recipient document must be valid CNPJ (14 digits) or CPF (11 digits)",
    ),

  nfeNumber: z
    .number()
    .int()
    .positive()
    .max(999999999, "NF-e number exceeds maximum"),

  series: z.number().int().min(0).max(999, "Series must be 0-999"),

  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format"),

  totalValue: z.number().positive("Total value must be positive"),
});

export type BrazilianDanfeInput = z.infer<typeof BrazilianDanfeSchema>;

/**
 * Validate Brazilian DANFE input
 */
export function validateBrazilianDanfe(input: unknown): {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: string[];
} {
  const result = BrazilianDanfeSchema.safeParse(input);

  if (result.success) {
    const warnings: string[] = [];

    // Validate NF-e key structure
    const key = result.data.nfeKey;
    const keyIssuerCnpj = key.substring(6, 20);

    if (keyIssuerCnpj !== result.data.issuerCnpj) {
      warnings.push("NF-e key CNPJ does not match issuer CNPJ");
    }

    return { valid: true, errors: [], warnings };
  }

  return {
    valid: false,
    errors: result.error.issues.map((err: z.ZodIssue) => ({
      field: err.path.join("."),
      message: err.message,
    })),
    warnings: [],
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  GSTIN_REGEX,
  HSN_REGEX,
  IRN_REGEX,
  VAT_PATTERNS,
  CNPJ_REGEX,
  CPF_REGEX,
  NFE_KEY_REGEX,
};
