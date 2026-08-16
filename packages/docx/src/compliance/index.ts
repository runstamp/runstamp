/**
 * Compliance Validation Schemas
 * =============================
 * Pure validation logic for global compliance requirements.
 * No React/DOM dependencies.
 *
 * Pro feature — requires @runstamp/docx-pro.
 */


export {
  IndiaGSTQRSchema,
  EUReverseChargeSchema,
  BrazilianDanfeSchema,
} from "./validation-schemas";

import {
  validateIndiaGSTQR as _validateIndiaGSTQR,
  validateEUReverseCharge as _validateEUReverseCharge,
  validateBrazilianDanfe as _validateBrazilianDanfe,
} from "./validation-schemas";

export function validateIndiaGSTQR(input: unknown) {
  return _validateIndiaGSTQR(input);
}

export function validateEUReverseCharge(input: unknown) {
  return _validateEUReverseCharge(input);
}

export function validateBrazilianDanfe(input: unknown) {
  return _validateBrazilianDanfe(input);
}
