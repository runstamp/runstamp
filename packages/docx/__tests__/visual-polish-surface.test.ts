import { describe, expect, it } from 'vitest';
import { DOCXErrorCode } from '../src/errors';
import * as docx from '../src/index';
import { hexToRgb, parsePT } from '../src/visual-polish/design-tokens';

describe('visual polish public surface', () => {
  it('keeps visual-polish APIs behind the experimental namespace', () => {
    expect('visualPolish' in docx).toBe(false);
    expect(docx.experimental.visualPolish).toBeDefined();
  });

  it('reports invalid token values as structured DOCX errors', () => {
    expect(() => parsePT('large')).toThrow(/Invalid PT value/);
    try {
      parsePT('large');
    } catch (error) {
      expect(error).toMatchObject({
        name: 'DOCXError',
        code: DOCXErrorCode.STYLE_INVALID,
        context: { value: 'large' },
      });
    }

    expect(() => hexToRgb('not-a-color' as any)).toThrow(/Invalid hex color/);
    try {
      hexToRgb('not-a-color' as any);
    } catch (error) {
      expect(error).toMatchObject({
        name: 'DOCXError',
        code: DOCXErrorCode.INVALID_COLOR,
        context: { hex: 'not-a-color' },
      });
    }
  });
});
