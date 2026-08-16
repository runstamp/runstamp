/**
 * Error Handler Edge Case Tests
 * ==============================
 * Comprehensive edge case validation for error collection and reporting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolyglotErrorCollector } from '../../src/core/error-handler';
import type { RenderError, ValidationError } from '../../src/core/error-handler';

describe('PolyglotErrorCollector', () => {
  let collector: PolyglotErrorCollector;

  beforeEach(() => {
    collector = new PolyglotErrorCollector();
  });

  describe('addError', () => {
    it('should add a single error', () => {
      const error: RenderError = {
        phase: 'parse',
        message: 'Test error',
        recoverable: false,
      };

      collector.addError(error);
      expect(collector.getErrors()).toHaveLength(1);
      expect(collector.getErrors()[0]).toEqual(error);
    });

    it('should add multiple errors', () => {
      const error1: RenderError = {
        phase: 'parse',
        message: 'Error 1',
        recoverable: true,
      };
      const error2: RenderError = {
        phase: 'layout',
        message: 'Error 2',
        recoverable: false,
      };

      collector.addError(error1);
      collector.addError(error2);

      expect(collector.getErrors()).toHaveLength(2);
      expect(collector.getErrors()[0]).toEqual(error1);
      expect(collector.getErrors()[1]).toEqual(error2);
    });

    it('should preserve error order', () => {
      for (let i = 0; i < 10; i++) {
        collector.addError({
          phase: 'parse',
          message: `Error ${i}`,
          recoverable: true,
        });
      }

      const errors = collector.getErrors();
      expect(errors).toHaveLength(10);
      errors.forEach((error, index) => {
        expect(error.message).toBe(`Error ${index}`);
      });
    });

    it('should handle errors with all optional fields', () => {
      const error: RenderError = {
        phase: 'serialize',
        nodeId: 'node123',
        nodeType: 'text',
        message: 'Full error',
        stack: 'Error stack trace',
        recoverable: false,
      };

      collector.addError(error);
      expect(collector.getErrors()[0]).toEqual(error);
    });

    it('should handle errors without optional fields', () => {
      const error: RenderError = {
        phase: 'paginate',
        message: 'Minimal error',
        recoverable: true,
      };

      collector.addError(error);
      expect(collector.getErrors()[0]).toEqual(error);
      expect(collector.getErrors()[0].nodeId).toBeUndefined();
      expect(collector.getErrors()[0].stack).toBeUndefined();
    });

    it('should handle all render phases', () => {
      const phases: RenderError['phase'][] = ['parse', 'layout', 'paginate', 'serialize'];

      phases.forEach(phase => {
        collector.addError({
          phase,
          message: `Error in ${phase}`,
          recoverable: false,
        });
      });

      expect(collector.getErrors()).toHaveLength(4);
      phases.forEach((phase, index) => {
        expect(collector.getErrors()[index].phase).toBe(phase);
      });
    });
  });

  describe('addWarning', () => {
    it('should add a single warning', () => {
      collector.addWarning('Test warning');
      expect(collector.getWarnings()).toHaveLength(1);
      expect(collector.getWarnings()[0]).toBe('Test warning');
    });

    it('should add multiple warnings', () => {
      collector.addWarning('Warning 1');
      collector.addWarning('Warning 2');
      collector.addWarning('Warning 3');

      expect(collector.getWarnings()).toHaveLength(3);
      expect(collector.getWarnings()).toEqual(['Warning 1', 'Warning 2', 'Warning 3']);
    });

    it('should preserve warning order', () => {
      for (let i = 0; i < 20; i++) {
        collector.addWarning(`Warning ${i}`);
      }

      const warnings = collector.getWarnings();
      expect(warnings).toHaveLength(20);
      warnings.forEach((warning, index) => {
        expect(warning).toBe(`Warning ${index}`);
      });
    });

    it('should handle empty warning messages', () => {
      collector.addWarning('');
      expect(collector.getWarnings()).toEqual(['']);
    });

    it('should handle long warning messages', () => {
      const longMessage = 'x'.repeat(10000);
      collector.addWarning(longMessage);
      expect(collector.getWarnings()[0]).toBe(longMessage);
    });
  });

  describe('addValidationError', () => {
    it('should add a single validation error', () => {
      const error: ValidationError = {
        field: 'width',
        message: 'Width must be positive',
      };

      collector.addValidationError(error);
      expect(collector.getValidationErrors()).toHaveLength(1);
      expect(collector.getValidationErrors()[0]).toEqual(error);
    });

    it('should add multiple validation errors', () => {
      const error1: ValidationError = {
        field: 'width',
        message: 'Width required',
      };
      const error2: ValidationError = {
        field: 'height',
        message: 'Height required',
      };

      collector.addValidationError(error1);
      collector.addValidationError(error2);

      expect(collector.getValidationErrors()).toHaveLength(2);
    });

    it('should handle validation errors with value', () => {
      const error: ValidationError = {
        field: 'fontSize',
        message: 'Invalid font size',
        value: -10,
      };

      collector.addValidationError(error);
      expect(collector.getValidationErrors()[0].value).toBe(-10);
    });

    it('should handle various value types', () => {
      collector.addValidationError({ field: 'str', message: 'error', value: 'string' });
      collector.addValidationError({ field: 'num', message: 'error', value: 123 });
      collector.addValidationError({ field: 'bool', message: 'error', value: true });
      collector.addValidationError({ field: 'null', message: 'error', value: null });
      collector.addValidationError({ field: 'undef', message: 'error', value: undefined });
      collector.addValidationError({ field: 'obj', message: 'error', value: { a: 1 } });

      expect(collector.getValidationErrors()).toHaveLength(6);
    });
  });

  describe('hasErrors', () => {
    it('should return false initially', () => {
      expect(collector.hasErrors()).toBe(false);
    });

    it('should return true after adding render error', () => {
      collector.addError({
        phase: 'parse',
        message: 'Error',
        recoverable: true,
      });
      expect(collector.hasErrors()).toBe(true);
    });

    it('should return true after adding validation error', () => {
      collector.addValidationError({
        field: 'test',
        message: 'Validation error',
      });
      expect(collector.hasErrors()).toBe(true);
    });

    it('should return false when only warnings exist', () => {
      collector.addWarning('Just a warning');
      expect(collector.hasErrors()).toBe(false);
    });

    it('should return true with both render and validation errors', () => {
      collector.addError({ phase: 'parse', message: 'Error', recoverable: false });
      collector.addValidationError({ field: 'test', message: 'Invalid' });
      expect(collector.hasErrors()).toBe(true);
    });
  });

  describe('hasFatalErrors', () => {
    it('should return false initially', () => {
      expect(collector.hasFatalErrors()).toBe(false);
    });

    it('should return true for non-recoverable errors', () => {
      collector.addError({
        phase: 'parse',
        message: 'Fatal error',
        recoverable: false,
      });
      expect(collector.hasFatalErrors()).toBe(true);
    });

    it('should return false for recoverable errors only', () => {
      collector.addError({
        phase: 'parse',
        message: 'Recoverable error',
        recoverable: true,
      });
      expect(collector.hasFatalErrors()).toBe(false);
    });

    it('should return true if any error is non-recoverable', () => {
      collector.addError({ phase: 'parse', message: 'E1', recoverable: true });
      collector.addError({ phase: 'layout', message: 'E2', recoverable: true });
      collector.addError({ phase: 'serialize', message: 'Fatal', recoverable: false });
      expect(collector.hasFatalErrors()).toBe(true);
    });

    it('should return false for validation errors (not render errors)', () => {
      collector.addValidationError({ field: 'test', message: 'Invalid' });
      expect(collector.hasFatalErrors()).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true initially', () => {
      expect(collector.isValid()).toBe(true);
    });

    it('should return false after adding validation error', () => {
      collector.addValidationError({
        field: 'test',
        message: 'Invalid',
      });
      expect(collector.isValid()).toBe(false);
    });

    it('should return true with only render errors', () => {
      collector.addError({ phase: 'parse', message: 'Error', recoverable: false });
      expect(collector.isValid()).toBe(true);
    });

    it('should return true with only warnings', () => {
      collector.addWarning('Warning');
      expect(collector.isValid()).toBe(true);
    });

    it('should return false with any validation errors', () => {
      collector.addWarning('Warning');
      collector.addError({ phase: 'parse', message: 'Error', recoverable: true });
      collector.addValidationError({ field: 'test', message: 'Invalid' });
      expect(collector.isValid()).toBe(false);
    });
  });

  describe('getErrors/getWarnings/getValidationErrors', () => {
    it('should return copies, not references', () => {
      collector.addError({ phase: 'parse', message: 'E1', recoverable: true });
      collector.addWarning('W1');
      collector.addValidationError({ field: 'f1', message: 'V1' });

      const errors = collector.getErrors();
      const warnings = collector.getWarnings();
      const validationErrors = collector.getValidationErrors();

      // Modify returned arrays
      errors.push({ phase: 'layout', message: 'E2', recoverable: false });
      warnings.push('W2');
      validationErrors.push({ field: 'f2', message: 'V2' });

      // Original should be unchanged
      expect(collector.getErrors()).toHaveLength(1);
      expect(collector.getWarnings()).toHaveLength(1);
      expect(collector.getValidationErrors()).toHaveLength(1);
    });
  });

  describe('getReport', () => {
    it('should return valid report with no errors', () => {
      const report = collector.getReport();
      expect(report.valid).toBe(true);
      expect(report.errors).toEqual([]);
      expect(report.warnings).toEqual([]);
      expect(report.validationErrors).toEqual([]);
    });

    it('should include all error types in report', () => {
      collector.addError({ phase: 'parse', message: 'E1', recoverable: true });
      collector.addWarning('W1');
      collector.addValidationError({ field: 'f1', message: 'V1' });

      const report = collector.getReport();
      expect(report.valid).toBe(false);
      expect(report.errors).toHaveLength(1);
      expect(report.warnings).toHaveLength(1);
      expect(report.validationErrors).toHaveLength(1);
    });

    it('should mark as invalid if validation errors exist', () => {
      collector.addValidationError({ field: 'test', message: 'Invalid' });
      const report = collector.getReport();
      expect(report.valid).toBe(false);
    });

    it('should mark as invalid with fatal errors', () => {
      collector.addError({ phase: 'parse', message: 'Fatal', recoverable: false });
      const report = collector.getReport();
      expect(report.valid).toBe(false);
    });

    it('should mark as valid with only recoverable errors and warnings', () => {
      collector.addError({ phase: 'parse', message: 'Recoverable', recoverable: true });
      collector.addWarning('Warning');
      const report = collector.getReport();
      expect(report.valid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle hundreds of errors', () => {
      for (let i = 0; i < 500; i++) {
        collector.addError({
          phase: 'parse',
          message: `Error ${i}`,
          recoverable: i % 2 === 0,
        });
      }

      expect(collector.getErrors()).toHaveLength(500);
      expect(collector.hasErrors()).toBe(true);
      expect(collector.hasFatalErrors()).toBe(true);
    });

    it('should handle hundreds of warnings', () => {
      for (let i = 0; i < 500; i++) {
        collector.addWarning(`Warning ${i}`);
      }

      expect(collector.getWarnings()).toHaveLength(500);
      expect(collector.hasErrors()).toBe(false);
    });

    it('should handle mixed large volumes', () => {
      for (let i = 0; i < 100; i++) {
        collector.addError({ phase: 'parse', message: `E${i}`, recoverable: true });
        collector.addWarning(`W${i}`);
        collector.addValidationError({ field: `f${i}`, message: `V${i}` });
      }

      expect(collector.getErrors()).toHaveLength(100);
      expect(collector.getWarnings()).toHaveLength(100);
      expect(collector.getValidationErrors()).toHaveLength(100);
      expect(collector.hasErrors()).toBe(true);
      expect(collector.isValid()).toBe(false);
    });

    it('should handle special characters in messages', () => {
      collector.addError({
        phase: 'parse',
        message: 'Error with\nnewlines\r\nand\ttabs',
        recoverable: false,
      });
      collector.addWarning('Warning with "quotes" and \'apostrophes\'');
      collector.addValidationError({
        field: 'test',
        message: 'Error with <brackets> & ampersands',
      });

      expect(collector.getErrors()[0].message).toContain('\n');
      expect(collector.getWarnings()[0]).toContain('"quotes"');
      expect(collector.getValidationErrors()[0].message).toContain('&');
    });

    it('should handle Unicode in messages', () => {
      collector.addError({
        phase: 'parse',
        message: 'Error \u9519\u8BEF \u30A8\u30E9\u30FC \uD83D\uDD25',
        recoverable: false,
      });
      collector.addWarning('Warning \u26A0\uFE0F \u8B66\u544A');

      expect(collector.getErrors()[0].message).toContain('\u9519\u8BEF');
      expect(collector.getWarnings()[0]).toContain('\u26A0\uFE0F');
    });
  });
});
