/**
 * Error System Tests
 * ==================
 * Tests for the structured error and warning system.
 */

import {
  DOCXError,
  DOCXErrorCode,
  DOCXWarningCode,
  Errors,
  Warnings,
  createWarning,
  formatWarning,
  isDOCXError,
  toDOCXError,
  WarningCollector,
  type DOCXWarning,
} from '../src/errors';

// =============================================================================
// DOCX ERROR TESTS
// =============================================================================

describe('DOCXError', () => {
  it('should create error with code and message', () => {
    const error = new DOCXError(
      DOCXErrorCode.DOC_INVALID,
      'Test error message'
    );

    expect(error.code).toBe(DOCXErrorCode.DOC_INVALID);
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('DOCXError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include recovery suggestion', () => {
    const error = new DOCXError(
      DOCXErrorCode.IMAGE_TOO_LARGE,
      'Image too large',
      { recovery: 'Reduce image size' }
    );

    expect(error.recovery).toBe('Reduce image size');
  });

  it('should include context', () => {
    const error = new DOCXError(
      DOCXErrorCode.IMAGE_FETCH_FAILED,
      'Fetch failed',
      { context: { url: 'https://example.com/image.png' } }
    );

    expect(error.context).toEqual({ url: 'https://example.com/image.png' });
  });

  it('should include cause', () => {
    const cause = new Error('Network error');
    const error = new DOCXError(
      DOCXErrorCode.IMAGE_FETCH_FAILED,
      'Fetch failed',
      { cause }
    );

    expect(error.originalCause).toBe(cause);
  });

  it('should format detailed string', () => {
    const error = new DOCXError(
      DOCXErrorCode.DOC_NO_PAGES,
      'No pages',
      { recovery: 'Add pages' }
    );

    const detailed = error.toDetailedString();

    expect(detailed).toContain('[DOCX_DOC_NO_PAGES]');
    expect(detailed).toContain('No pages');
    expect(detailed).toContain('Recovery: Add pages');
  });

  it('should convert to JSON', () => {
    const error = new DOCXError(
      DOCXErrorCode.ELEMENT_UNKNOWN,
      'Unknown element',
      { recovery: 'Check type', context: { type: 'foo' } }
    );

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'DOCXError',
      code: DOCXErrorCode.ELEMENT_UNKNOWN,
      message: 'Unknown element',
      recovery: 'Check type',
      context: { type: 'foo' },
    });
  });
});

// =============================================================================
// ERROR FACTORY TESTS
// =============================================================================

describe('Errors factory', () => {
  it('should create invalidDocument error', () => {
    const error = Errors.invalidDocument('missing pages');

    expect(error.code).toBe(DOCXErrorCode.DOC_INVALID);
    expect(error.message).toContain('missing pages');
    expect(error.recovery).toBeDefined();
  });

  it('should create noPages error', () => {
    const error = Errors.noPages();

    expect(error.code).toBe(DOCXErrorCode.DOC_NO_PAGES);
    expect(error.message).toContain('no pages');
  });

  it('should create imageFetchFailed error', () => {
    const error = Errors.imageFetchFailed('https://example.com/img.png', 'Network timeout');

    expect(error.code).toBe(DOCXErrorCode.IMAGE_FETCH_FAILED);
    expect(error.message).toContain('Network timeout');
    expect(error.context?.url).toBe('https://example.com/img.png');
  });

  it('should create imageTimeout error', () => {
    const error = Errors.imageTimeout('https://example.com/img.png', 5000);

    expect(error.code).toBe(DOCXErrorCode.IMAGE_TIMEOUT);
    expect(error.message).toContain('5000ms');
    expect(error.context?.timeoutMs).toBe(5000);
  });

  it('should create imageTooLarge error', () => {
    const error = Errors.imageTooLarge('test.png', 15 * 1024 * 1024, 10 * 1024 * 1024);

    expect(error.code).toBe(DOCXErrorCode.IMAGE_TOO_LARGE);
    expect(error.message).toContain('15.00MB'); // 15MB formatted
    expect(error.message).toContain('10.00MB'); // 10MB formatted
  });

  it('should create dependencyMissing error', () => {
    const error = Errors.dependencyMissing('sharp', 'image processing');

    expect(error.code).toBe(DOCXErrorCode.DEPENDENCY_MISSING);
    expect(error.message).toContain('sharp');
    expect(error.recovery).toContain('npm install sharp');
  });

  it('should create internal error with cause', () => {
    const cause = new Error('Original error');
    const error = Errors.internal('Something went wrong', cause);

    expect(error.code).toBe(DOCXErrorCode.INTERNAL_ERROR);
    expect(error.originalCause).toBe(cause);
    expect(error.recovery).toContain('bug');
  });
});

// =============================================================================
// WARNING TESTS
// =============================================================================

describe('Warnings', () => {
  describe('createWarning', () => {
    it('should create basic warning', () => {
      const warning = createWarning(
        DOCXWarningCode.DOC_NO_METADATA,
        'No metadata found'
      );

      expect(warning.code).toBe(DOCXWarningCode.DOC_NO_METADATA);
      expect(warning.message).toBe('No metadata found');
    });

    it('should include optional fields', () => {
      const warning = createWarning(
        DOCXWarningCode.ELEMENT_FALLBACK,
        'Element skipped',
        {
          recovery: 'Fix the element',
          location: 'page 1, element 3',
          context: { elementType: 'unknown' },
        }
      );

      expect(warning.recovery).toBe('Fix the element');
      expect(warning.location).toBe('page 1, element 3');
      expect(warning.context).toEqual({ elementType: 'unknown' });
    });
  });

  describe('formatWarning', () => {
    it('should format basic warning', () => {
      const warning: DOCXWarning = {
        code: DOCXWarningCode.IMAGE_PLACEHOLDER,
        message: 'Image not found',
      };

      expect(formatWarning(warning)).toBe('Image not found');
    });

    it('should include location', () => {
      const warning: DOCXWarning = {
        code: DOCXWarningCode.IMAGE_PLACEHOLDER,
        message: 'Image not found',
        location: 'page 2',
      };

      expect(formatWarning(warning)).toBe('[page 2] Image not found');
    });

    it('should include recovery suggestion', () => {
      const warning: DOCXWarning = {
        code: DOCXWarningCode.IMAGE_PLACEHOLDER,
        message: 'Image not found',
        recovery: 'Check the URL',
      };

      expect(formatWarning(warning)).toContain('Suggestion: Check the URL');
    });
  });
});

// =============================================================================
// WARNING FACTORY TESTS
// =============================================================================

describe('Warnings factory', () => {
  it('should create noMetadata warning', () => {
    const warning = Warnings.noMetadata();

    expect(warning.code).toBe(DOCXWarningCode.DOC_NO_METADATA);
    expect(warning.message).toContain('metadata');
  });

  it('should create emptyPage warning', () => {
    const warning = Warnings.emptyPage(3);

    expect(warning.code).toBe(DOCXWarningCode.DOC_EMPTY_PAGE);
    expect(warning.message).toContain('Page 3');
    expect(warning.location).toBe('page 3');
  });

  it('should create imagePlaceholder warning', () => {
    const warning = Warnings.imagePlaceholder('URL not accessible', 'page 1');

    expect(warning.code).toBe(DOCXWarningCode.IMAGE_PLACEHOLDER);
    expect(warning.message).toContain('URL not accessible');
    expect(warning.location).toBe('page 1');
  });

  it('should create imageResized warning', () => {
    const warning = Warnings.imageResized(
      { width: 2000, height: 1500 },
      { width: 800, height: 600 }
    );

    expect(warning.code).toBe(DOCXWarningCode.IMAGE_RESIZED);
    expect(warning.message).toContain('2000x1500');
    expect(warning.message).toContain('800x600');
  });

  it('should create imageConverted warning', () => {
    const warning = Warnings.imageConverted('webp', 'png');

    expect(warning.code).toBe(DOCXWarningCode.IMAGE_CONVERTED);
    expect(warning.message).toContain('webp');
    expect(warning.message).toContain('png');
  });

  it('should create shapePlaceholder warning', () => {
    const warning = Warnings.shapePlaceholder('ellipse');

    expect(warning.code).toBe(DOCXWarningCode.SHAPE_PLACEHOLDER);
    expect(warning.message).toContain('ellipse');
    expect(warning.recovery).toContain('sharp');
  });

  it('should create largeDocument warning', () => {
    const warning = Warnings.largeDocument(50, 1000);

    expect(warning.code).toBe(DOCXWarningCode.PERF_LARGE_DOCUMENT);
    expect(warning.message).toContain('50 pages');
    expect(warning.message).toContain('1000 elements');
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('isDOCXError', () => {
  it('should return true for DOCXError', () => {
    const error = new DOCXError(DOCXErrorCode.DOC_INVALID, 'test');
    expect(isDOCXError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('test');
    expect(isDOCXError(error)).toBe(false);
  });

  it('should return false for non-errors', () => {
    expect(isDOCXError('string')).toBe(false);
    expect(isDOCXError(null)).toBe(false);
    expect(isDOCXError(undefined)).toBe(false);
    expect(isDOCXError({})).toBe(false);
  });
});

describe('toDOCXError', () => {
  it('should return DOCXError unchanged', () => {
    const original = new DOCXError(DOCXErrorCode.DOC_INVALID, 'test');
    const result = toDOCXError(original);

    expect(result).toBe(original);
  });

  it('should wrap regular Error', () => {
    const original = new Error('Original message');
    const result = toDOCXError(original);

    expect(result).toBeInstanceOf(DOCXError);
    expect(result.code).toBe(DOCXErrorCode.INTERNAL_ERROR);
    expect(result.message).toBe('Original message');
    expect(result.originalCause).toBe(original);
  });

  it('should wrap string', () => {
    const result = toDOCXError('Something went wrong');

    expect(result).toBeInstanceOf(DOCXError);
    expect(result.message).toBe('Something went wrong');
  });
});

// =============================================================================
// WARNING COLLECTOR TESTS
// =============================================================================

describe('WarningCollector', () => {
  it('should start empty', () => {
    const collector = new WarningCollector();

    expect(collector.hasWarnings()).toBe(false);
    expect(collector.getWarnings()).toEqual([]);
  });

  it('should add warnings', () => {
    const collector = new WarningCollector();
    const warning = Warnings.noMetadata();

    collector.add(warning);

    expect(collector.hasWarnings()).toBe(true);
    expect(collector.getWarnings()).toHaveLength(1);
    expect(collector.getWarnings()[0]).toEqual(warning);
  });

  it('should add legacy string warnings', () => {
    const collector = new WarningCollector();

    collector.addLegacy('Old style warning', 'page 1');

    expect(collector.hasWarnings()).toBe(true);
    const warnings = collector.getWarnings();
    expect(warnings[0].message).toBe('Old style warning');
    expect(warnings[0].location).toBe('page 1');
  });

  it('should add multiple warnings at once', () => {
    const collector = new WarningCollector();
    const warnings = [
      Warnings.noMetadata(),
      Warnings.emptyPage(1),
    ];

    collector.addAll(warnings);

    expect(collector.getWarnings()).toHaveLength(2);
  });

  it('should get formatted messages', () => {
    const collector = new WarningCollector();
    collector.add(Warnings.emptyPage(2));

    const messages = collector.getMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('Page 2');
  });

  it('should clear warnings', () => {
    const collector = new WarningCollector();
    collector.add(Warnings.noMetadata());
    expect(collector.hasWarnings()).toBe(true);

    collector.clear();

    expect(collector.hasWarnings()).toBe(false);
  });

  it('should return copy of warnings array', () => {
    const collector = new WarningCollector();
    collector.add(Warnings.noMetadata());

    const warnings1 = collector.getWarnings();
    const warnings2 = collector.getWarnings();

    expect(warnings1).not.toBe(warnings2);
    expect(warnings1).toEqual(warnings2);
  });
});
