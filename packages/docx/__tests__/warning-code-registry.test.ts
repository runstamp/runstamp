import { describe, expect, it } from 'vitest';
import {
  WARNING_CODES,
  isDocxWarningCode,
  resolveDocxWarningCode,
  type DocxWarningCode,
} from '../src/errors/warning-codes';

describe('warning-codes registry', () => {
  it('enumerates only canonical DOCX_*-prefixed codes', () => {
    for (const code of WARNING_CODES) {
      expect(code.startsWith('DOCX_')).toBe(true);
    }
  });

  it('codes are unique', () => {
    const set = new Set<string>(WARNING_CODES);
    expect(set.size).toBe(WARNING_CODES.length);
  });

  it('isDocxWarningCode accepts every registered code', () => {
    for (const code of WARNING_CODES) {
      expect(isDocxWarningCode(code)).toBe(true);
    }
  });

  it('isDocxWarningCode rejects unknown codes', () => {
    expect(isDocxWarningCode('MADE_UP_CODE')).toBe(false);
    expect(isDocxWarningCode('docx_validate_schema')).toBe(false);
    expect(isDocxWarningCode('')).toBe(false);
  });

  it('resolveDocxWarningCode passes canonical codes through', () => {
    for (const code of WARNING_CODES) {
      expect(resolveDocxWarningCode(code)).toBe(code);
    }
  });

  it('resolveDocxWarningCode remaps known legacy codes', () => {
    const remaps: Array<[string, DocxWarningCode]> = [
      ['SCHEMA_VALIDATION', 'DOCX_VALIDATE_SCHEMA'],
      ['IMAGE_NO_SRC', 'DOCX_VALIDATE_IMAGE_NO_SRC'],
      ['TABLE_EMPTY', 'DOCX_VALIDATE_TABLE_EMPTY'],
      ['CHART_NO_DATA', 'DOCX_VALIDATE_CHART_NO_DATA'],
      ['HEADING_EMPTY', 'DOCX_VALIDATE_HEADING_EMPTY'],
      ['SERIALIZER_WARNING', 'DOCX_SERIALIZER_WARNING'],
      ['HTML_CONVERSION_WARNING', 'DOCX_HTML_CONVERSION_WARNING'],
      ['PDF_BRIDGE_FALLBACK', 'DOCX_PDF_BRIDGE_FALLBACK'],
    ];
    for (const [legacy, canonical] of remaps) {
      expect(resolveDocxWarningCode(legacy)).toBe(canonical);
    }
  });

  it('resolveDocxWarningCode throws for truly unknown codes', () => {
    expect(() => resolveDocxWarningCode('NOT_A_REAL_CODE')).toThrow(
      /unknown warning code "NOT_A_REAL_CODE"/,
    );
    expect(() => resolveDocxWarningCode('DOCX_FUTURE_CODE')).toThrow(
      /unknown warning code/,
    );
  });

  it('relaxed-input coercion table uses registered codes', async () => {
    const { DOCX_RELAXED_INPUT_COERCIONS } = await import('../src/relaxed-input');
    for (const coercion of DOCX_RELAXED_INPUT_COERCIONS) {
      expect(isDocxWarningCode(coercion.code)).toBe(true);
    }
  });
});
