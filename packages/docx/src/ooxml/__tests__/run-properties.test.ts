import { describe, expect, it } from 'vitest';
import { serializeXmlFragment } from '../ordered-builder.js';
import { buildRunProperties } from '../builders/run-properties.js';
import { DOCXErrorCode } from '../../errors.js';

describe('native run properties', () => {
  it('emits explicit false booleans and theme color hex fallback', () => {
    const xml = serializeXmlFragment([
      buildRunProperties({
        noProof: false,
        color: '112233',
        themeColor: 'accent1',
        fontFamily: 'Consolas',
        fontSize: 10,
      })!,
    ]);

    expect(xml).toContain('<w:noProof w:val="false"/>');
    expect(xml).toContain('w:val="112233"');
    expect(xml).toContain('w:themeColor="accent1"');
    expect(xml).toContain('w:rFonts');
  });

  it('accepts strict OOXML colors', () => {
    const hexXml = serializeXmlFragment([
      buildRunProperties({ color: 'ff0000' })!,
    ]);
    const autoXml = serializeXmlFragment([
      buildRunProperties({ color: 'auto' })!,
    ]);

    expect(hexXml).toContain('w:val="FF0000"');
    expect(autoXml).toContain('w:val="auto"');
  });

  it('accepts CSS hex colors by default', () => {
    const cssHexXml = serializeXmlFragment([
      buildRunProperties({ color: '#FF0000' })!,
    ]);

    expect(cssHexXml).toContain('w:val="FF0000"');
  });

  it.each(['red', 'FF', '000'])('rejects invalid DOCX color "%s"', (color) => {
    expect(() => buildRunProperties({ color })).toThrowError(
      expect.objectContaining({
        code: DOCXErrorCode.INVALID_COLOR,
        recovery: expect.stringContaining('CSS hex color'),
      }),
    );
  });

  it.each([Number.NaN, 0, -1, Number.POSITIVE_INFINITY])('rejects invalid font size %s', (fontSize) => {
    expect(() => buildRunProperties({ fontSize })).toThrowError(
      expect.objectContaining({
        code: DOCXErrorCode.INVALID_FONT_SIZE,
        recovery: expect.stringContaining('positive finite'),
      }),
    );
  });
});
