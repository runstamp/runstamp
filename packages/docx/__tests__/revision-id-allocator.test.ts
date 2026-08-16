/**
 * Tests for RevisionIdAllocator (Phase 1.4).
 *
 * These exercise the state machine's invariants with hand-crafted scenarios
 * plus an exhaustive randomized sequence that would have caught every
 * regression class we've seen in the hand-rolled predecessor.
 */

import { describe, expect, it } from 'vitest';
import { RevisionIdAllocator } from '../src/ooxml/revision-id-allocator';

describe('RevisionIdAllocator', () => {
  describe('auto-allocation (no caller-supplied ids)', () => {
    it('starts at 1 and returns monotonically increasing ids', () => {
      const alloc = new RevisionIdAllocator();
      const ids = Array.from({ length: 10 }, () => alloc.allocate());
      expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('respects startFrom', () => {
      const alloc = new RevisionIdAllocator({ startFrom: 100 });
      expect(alloc.allocate()).toBe(100);
      expect(alloc.allocate()).toBe(101);
    });

    it('rejects non-integer startFrom', () => {
      expect(() => new RevisionIdAllocator({ startFrom: 0 })).toThrow(/positive integer/);
      expect(() => new RevisionIdAllocator({ startFrom: -1 })).toThrow(/positive integer/);
      expect(() => new RevisionIdAllocator({ startFrom: 1.5 })).toThrow(/positive integer/);
    });
  });

  describe('caller-supplied ids (reserved)', () => {
    it('skips reserved ids when auto-allocating', () => {
      const alloc = new RevisionIdAllocator({ reserved: [2, 4] });
      expect(alloc.allocate()).toBe(1);
      expect(alloc.allocate()).toBe(3);
      expect(alloc.allocate()).toBe(5);
      expect(alloc.allocate()).toBe(6);
    });

    it('skips contiguous reserved ranges', () => {
      const alloc = new RevisionIdAllocator({ reserved: [1, 2, 3, 4, 5] });
      expect(alloc.allocate()).toBe(6);
      expect(alloc.allocate()).toBe(7);
    });

    it('allocate({id}) returns the supplied id verbatim', () => {
      const alloc = new RevisionIdAllocator({ reserved: [2, 4] });
      expect(alloc.allocate({ id: 4 })).toBe(4);
      expect(alloc.allocate({ id: 2 })).toBe(2);
      // auto still skips both because now they're consumed
      expect(alloc.allocate()).toBe(1);
      expect(alloc.allocate()).toBe(3);
      expect(alloc.allocate()).toBe(5);
    });

    it('allocate({id: X}) can claim an id that was not reserved', () => {
      const alloc = new RevisionIdAllocator();
      expect(alloc.allocate({ id: 999 })).toBe(999);
      expect(alloc.allocate()).toBe(1);
    });

    it('rejects non-positive caller-supplied ids', () => {
      const alloc = new RevisionIdAllocator();
      expect(() => alloc.allocate({ id: 0 })).toThrow(/positive integer/);
      expect(() => alloc.allocate({ id: -1 })).toThrow(/positive integer/);
      expect(() => alloc.allocate({ id: 1.5 })).toThrow(/positive integer/);
    });

    it('rejects non-positive reserved ids', () => {
      expect(() => new RevisionIdAllocator({ reserved: [0] })).toThrow(/positive integer/);
      expect(() => new RevisionIdAllocator({ reserved: [-5] })).toThrow(/positive integer/);
      expect(() => new RevisionIdAllocator({ reserved: [1.5] })).toThrow(/positive integer/);
    });
  });

  describe('duplicate detection', () => {
    it('throws if caller-supplied id collides with a previous allocation', () => {
      const alloc = new RevisionIdAllocator();
      alloc.allocate({ id: 5 });
      expect(() => alloc.allocate({ id: 5 })).toThrow(/Duplicate DOCX revision id 5/);
    });

    it('throws if caller-supplied id collides with an auto-allocated id', () => {
      const alloc = new RevisionIdAllocator();
      alloc.allocate(); // 1
      alloc.allocate(); // 2
      expect(() => alloc.allocate({ id: 2 })).toThrow(/Duplicate DOCX revision id 2/);
    });

    it('allocate(undefined) is equivalent to allocate()', () => {
      const a = new RevisionIdAllocator();
      const b = new RevisionIdAllocator();
      expect(a.allocate()).toBe(b.allocate(undefined));
    });

    it('allocate({}) (no id property) auto-allocates', () => {
      const alloc = new RevisionIdAllocator();
      expect(alloc.allocate({})).toBe(1);
      expect(alloc.allocate({})).toBe(2);
    });
  });

  describe('inspection API', () => {
    it('peekNext does not consume', () => {
      const alloc = new RevisionIdAllocator();
      expect(alloc.peekNext()).toBe(1);
      expect(alloc.peekNext()).toBe(1);
      expect(alloc.allocate()).toBe(1);
      expect(alloc.peekNext()).toBe(2);
    });

    it('peekNext skips reserved+consumed', () => {
      const alloc = new RevisionIdAllocator({ reserved: [1, 2] });
      expect(alloc.peekNext()).toBe(3);
      alloc.allocate({ id: 3 });
      expect(alloc.peekNext()).toBe(4);
    });

    it('isConsumed reflects caller-supplied + auto', () => {
      const alloc = new RevisionIdAllocator({ reserved: [10] });
      expect(alloc.isConsumed(10)).toBe(false); // reserved but not yet consumed
      alloc.allocate({ id: 10 });
      expect(alloc.isConsumed(10)).toBe(true);
      const auto = alloc.allocate();
      expect(alloc.isConsumed(auto)).toBe(true);
    });

    it('isReserved reflects construction-time reservations', () => {
      const alloc = new RevisionIdAllocator({ reserved: [3, 7] });
      expect(alloc.isReserved(3)).toBe(true);
      expect(alloc.isReserved(7)).toBe(true);
      expect(alloc.isReserved(5)).toBe(false);
    });

    it('snapshotConsumed returns sorted ids', () => {
      const alloc = new RevisionIdAllocator();
      alloc.allocate({ id: 42 });
      alloc.allocate(); // 1
      alloc.allocate({ id: 5 });
      alloc.allocate(); // 2
      expect(alloc.snapshotConsumed()).toEqual([1, 2, 5, 42]);
    });
  });

  describe('invariants under randomized sequences', () => {
    it('every allocation is a positive integer, no duplicates, auto-allocations are strictly increasing', () => {
      const SEED_COUNT = 50;
      const OPS_PER_SEED = 200;

      for (let seed = 0; seed < SEED_COUNT; seed++) {
        // Deterministic PRNG (Mulberry32) — tests remain reproducible
        let state = (seed + 1) * 0x9e3779b1;
        const rand = (): number => {
          state = (state + 0x6d2b79f5) | 0;
          let t = state;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        // Random subset of ids to reserve upfront
        const reserved: number[] = [];
        const reservedCount = Math.floor(rand() * 10);
        for (let i = 0; i < reservedCount; i++) {
          reserved.push(1 + Math.floor(rand() * 100));
        }

        const alloc = new RevisionIdAllocator({ reserved });
        const emitted = new Set<number>();
        const autoSequence: number[] = [];

        for (let op = 0; op < OPS_PER_SEED; op++) {
          const supplyId = rand() < 0.3;
          if (supplyId) {
            // Try a random id up to 500. If it's already consumed we expect a throw.
            const id = 1 + Math.floor(rand() * 500);
            if (emitted.has(id)) {
              expect(() => alloc.allocate({ id })).toThrow(/Duplicate/);
            } else {
              expect(alloc.allocate({ id })).toBe(id);
              emitted.add(id);
            }
          } else {
            const id = alloc.allocate();
            expect(Number.isInteger(id)).toBe(true);
            expect(id).toBeGreaterThan(0);
            expect(emitted.has(id)).toBe(false);
            if (autoSequence.length > 0) {
              expect(id).toBeGreaterThan(autoSequence[autoSequence.length - 1]);
            }
            autoSequence.push(id);
            emitted.add(id);
            // Auto-allocated id must not be reserved (reserved ids can only enter
            // the consumed set via explicit allocate({id})).
            expect(alloc.isReserved(id)).toBe(false);
          }
        }
      }
    });
  });
});
