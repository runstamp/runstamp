/**
 * Branded unit types (Phase 1.1).
 *
 * These tests have two goals:
 *
 * 1. Runtime: prove branded numbers are indistinguishable from `number`
 *    at runtime — no performance or arithmetic surprises.
 * 2. Type-level: prove the compiler catches unit confusion. Because we
 *    can't write compile-error assertions in Vitest directly, we use
 *    the `expectError` helper pattern: a function that must NOT
 *    typecheck. We mark those calls with `@ts-expect-error` so that
 *    if the type system later allows them (regression), the test file
 *    fails to compile.
 */

import { describe, expect, it } from 'vitest';
import {
  pxToTwips,
  pointsToHalfPoints,
  inchesToEmu,
  pxToEmu,
  mmToTwips,
  lineHeightToDocx,
  asTwips,
  asHalfPoints,
  asEmu,
  type Twips,
  type HalfPoints,
  type EMU,
} from '../src/utils/units';
import type { NativeTableModel, NativeTableRowModel } from '../src/ooxml/builders/table';

describe('branded units: runtime transparency', () => {
  it('branded numbers behave like numbers', () => {
    const t: Twips = pxToTwips(96); // 96 px @ 96 DPI = 1 inch = 1440 twips
    expect(t).toBe(1440);
    expect(typeof t).toBe('number');
    expect(t + 1).toBe(1441);
    expect(t * 2).toBe(2880);
  });

  it('conversion functions return correct numeric values', () => {
    expect(pxToTwips(96)).toBe(1440);
    expect(pointsToHalfPoints(12)).toBe(24);
    expect(inchesToEmu(1)).toBe(914400);
    expect(pxToEmu(96)).toBe(914400);
    expect(mmToTwips(25.4)).toBe(1440);
    expect(lineHeightToDocx(1.5)).toBe(360);
  });

  it('escape hatches tag plain numbers without mutation', () => {
    const n = 1440;
    const branded: Twips = asTwips(n);
    expect(branded).toBe(n);
    expect(branded === 1440).toBe(true);
  });

  it('zero and NaN inputs return tagged zero', () => {
    expect(pxToTwips(0)).toBe(0);
    expect(pxToTwips(NaN)).toBe(0);
    expect(pointsToHalfPoints(0)).toBe(0);
    expect(pointsToHalfPoints(NaN)).toBe(0);
  });
});

describe('branded units: type-level safety', () => {
  it('Twips is assignable to number (subtype)', () => {
    // This should compile — branded types ARE numbers at runtime.
    const t: Twips = pxToTwips(96);
    const n: number = t;
    expect(n).toBe(1440);
  });

  it('HalfPoints cannot be passed where Twips is expected', () => {
    function requiresTwips(_value: Twips): void { /* noop */ }
    const hp: HalfPoints = pointsToHalfPoints(12);
    // @ts-expect-error -- HalfPoints is not assignable to Twips (branded)
    requiresTwips(hp);
    // Use the value so TypeScript doesn't warn about unused
    expect(hp).toBe(24);
  });

  it('EMU cannot be passed where Twips is expected', () => {
    function requiresTwips(_value: Twips): void { /* noop */ }
    const emu: EMU = pxToEmu(100);
    // @ts-expect-error -- EMU is not assignable to Twips (branded)
    requiresTwips(emu);
    expect(emu).toBeGreaterThan(0);
  });

  it('Twips cannot be passed where HalfPoints is expected', () => {
    function requiresHalfPoints(_value: HalfPoints): void { /* noop */ }
    const t: Twips = pxToTwips(96);
    // @ts-expect-error -- Twips is not assignable to HalfPoints (branded)
    requiresHalfPoints(t);
    expect(t).toBe(1440);
  });

  it('plain number cannot be assigned to Twips without an escape hatch', () => {
    // @ts-expect-error -- plain number requires asTwips() cast
    const t: Twips = 1440;
    expect(t).toBe(1440);
  });

  it('asTwips tags a plain number', () => {
    // No error: asTwips is the explicit escape hatch.
    const t: Twips = asTwips(1440);
    expect(t).toBe(1440);
  });

  it('asHalfPoints does not accept a Twips (different brand)', () => {
    const t: Twips = pxToTwips(96);
    // Escape hatches are plain `(n: number) => Branded` — passing a Twips
    // is allowed because Twips is-a number. The brand doesn't cross over,
    // so the downstream `HalfPoints` claim is trust-the-caller.
    const hp: HalfPoints = asHalfPoints(t);
    expect(hp).toBe(1440);
  });

  it('EMU return type is preserved through arithmetic only when re-branded', () => {
    const emu: EMU = pxToEmu(96);
    // Arithmetic on branded numbers widens back to `number` — the brand
    // is lost unless re-tagged. This is the expected TS behaviour.
    const doubled = emu * 2;
    // Narrow-brand accessor required to get back to EMU:
    const backToEmu: EMU = asEmu(doubled);
    expect(backToEmu).toBe(emu * 2);
  });

  it('native table OOXML boundary requires twips for widths and row heights', () => {
    const model: Pick<NativeTableModel, 'columns' | 'rows'> = {
      columns: [pxToTwips(320)],
      rows: [{
        index: 0,
        isHeader: false,
        height: pxToTwips(20),
        cells: [],
      }],
    };

    // @ts-expect-error -- plain pixels cannot cross the native table column boundary.
    const badColumns: NativeTableModel['columns'] = [320];
    // @ts-expect-error -- row height must be converted to twips first.
    const badHeight: NativeTableRowModel['height'] = 20;

    expect(model.columns[0]).toBe(4800);
    expect(model.rows[0]!.height).toBe(300);
    expect(badColumns[0]).toBe(320);
    expect(badHeight).toBe(20);
  });
});
