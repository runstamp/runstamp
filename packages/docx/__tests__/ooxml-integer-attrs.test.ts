/**
 * Regression: OOXML integer attribute emissions.
 *
 * ECMA-376 declares attributes like `<w:sz w:val="...">`,
 * `<wp:extent cx=".." cy="..">`, `<a:off x=".." y="..">` and
 * `<a:ext cx=".." cy="..">` as integer-typed (`xsd:int`,
 * `xsd:long`, `xsd:nonNegativeInteger`).
 *
 * Microsoft Word/PowerPoint trip a "repair-on-open" dialog when these
 * attributes carry float values (e.g. `3999.9999999999995`). Such
 * floats arise from common pt → px → ooxml-units round-trips:
 * `40 * 96/72 * 75 = 3999.999...`.
 *
 * This test pins down the four DOCX emission sites that bypassed the
 * canonical Math.round helpers and fed caller-supplied floats straight
 * into the XML.
 */
import { describe, expect, it } from 'vitest';

import { generateRichFootnoteEntry } from '../src/features/footnotes-raw';
import { generateChartDrawingXml } from '../src/core/chart-transpiler';
import { valueToOoxml } from '../src/hydration/ooxml-injector';

const FP_DRIFT_HALF_POINTS = 19.999999999999996; // ~10pt as half-points
const FP_DRIFT_PX = 100.5;
const FP_DRIFT_EMU = 914399.9999999999; // ~1 inch with FP noise

const SZ_REGEX = /<w:sz\b[^>]*w:val="([^"]*)"/g;
const SZ_CS_REGEX = /<w:szCs\b[^>]*w:val="([^"]*)"/g;
const EMU_ATTR_REGEX = /\b(?:cx|cy)="([^"]*)"|<a:off\s+x="([^"]*)"\s+y="([^"]*)"/g;

function extractSimpleAttr(xml: string, regex: RegExp): string[] {
  const out: string[] = [];
  const local = new RegExp(regex.source, regex.flags);
  let m: RegExpExecArray | null;
  while ((m = local.exec(xml)) !== null) {
    for (let i = 1; i < m.length; i++) {
      if (m[i] !== undefined) out.push(m[i]);
    }
  }
  return out;
}

function assertAllIntegers(values: string[], label: string): void {
  for (const v of values) {
    expect(
      /^-?\d+$/.test(v),
      `${label} attr should be integer; got "${v}"`,
    ).toBe(true);
  }
}

describe('OOXML integer-attribute emissions', () => {
  describe('footnotes-raw: <w:sz>/<w:szCs>', () => {
    it('rounds float fontSize to integer half-points', () => {
      const xml = generateRichFootnoteEntry(1, [
        { text: 'note', fontSize: FP_DRIFT_HALF_POINTS },
      ]);
      const sz = extractSimpleAttr(xml, SZ_REGEX);
      const szCs = extractSimpleAttr(xml, SZ_CS_REGEX);
      expect(sz.length).toBeGreaterThan(0);
      expect(szCs.length).toBeGreaterThan(0);
      assertAllIntegers(sz, 'w:sz');
      assertAllIntegers(szCs, 'w:szCs');
    });

    it('survives accumulated FP-drift on small half-point values', () => {
      const xml = generateRichFootnoteEntry(2, [
        { text: 'check', fontSize: 20 * (1 + 1e-13) },
      ]);
      assertAllIntegers(extractSimpleAttr(xml, SZ_REGEX), 'w:sz');
      assertAllIntegers(extractSimpleAttr(xml, SZ_CS_REGEX), 'w:szCs');
    });
  });

  describe('chart-transpiler: <a:off>/<a:ext>', () => {
    it('rounds float x/y/width/height to integer EMU', () => {
      const xml = generateChartDrawingXml(
        'rId7',
        FP_DRIFT_EMU,
        FP_DRIFT_EMU,
        FP_DRIFT_EMU * 5,
        FP_DRIFT_EMU * 3,
      );
      const attrs = extractSimpleAttr(xml, EMU_ATTR_REGEX);
      expect(attrs.length).toBeGreaterThanOrEqual(4);
      assertAllIntegers(attrs, 'a:off/a:ext EMU');
    });
  });

  describe('hydration ooxml-injector: <wp:extent>/<a:ext>', () => {
    it('rounds float image width/height to integer EMU', () => {
      const xml = valueToOoxml({
        type: 'image',
        src: 'about:blank',
        alt: 'fp drift image',
        width: FP_DRIFT_PX,
        height: FP_DRIFT_PX * 0.5,
      });
      const attrs = extractSimpleAttr(xml, EMU_ATTR_REGEX);
      expect(attrs.length).toBeGreaterThan(0);
      assertAllIntegers(attrs, 'wp:extent/a:ext EMU');
    });
  });
});
