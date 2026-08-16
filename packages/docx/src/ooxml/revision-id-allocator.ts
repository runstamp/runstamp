/**
 * RevisionIdAllocator
 * ===================
 *
 * Encapsulates the state machine for assigning unique OOXML revision IDs
 * during serialization.
 *
 * ## Contract
 *
 * 1. **Caller-supplied IDs are sacred.** If a StructuredDocument carries
 *    revision IDs (e.g., because it was built by `revision-tracker`), the
 *    allocator preserves them: `allocate({ id: N })` returns N and marks
 *    N as consumed. A second attempt to consume N throws.
 *
 * 2. **Reserved IDs are skipped.** Call sites that know about caller-
 *    supplied IDs up front pass them to the constructor as `reserved`.
 *    The auto-allocator (`allocate()` / `allocate(undefined)`) steps past
 *    every reserved ID, never colliding with a future `allocate({ id })`
 *    for a reserved value.
 *
 * 3. **Auto-allocation is monotonic.** Each successive `allocate()` call
 *    returns a strictly greater ID than the previous auto-allocation,
 *    starting at 1 and skipping reserved + consumed IDs.
 *
 * ## State diagram
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  reservedIds  (fixed at construction)                       │
 *   │  consumedIds  (grows monotonically)                         │
 *   │  nextAutoId   (pointer; monotonic; skips reserved+consumed) │
 *   └─────────────────────────────────────────────────────────────┘
 *
 *   allocate({ id: N }):
 *     if N ∈ consumedIds  → throw
 *     consumedIds += {N}
 *     return N
 *
 *   allocate():
 *     while nextAutoId ∈ reservedIds ∪ consumedIds:
 *       nextAutoId += 1
 *     result = nextAutoId
 *     consumedIds += {result}
 *     nextAutoId += 1
 *     return result
 *
 * ## Invariants (enforced by property tests)
 *
 *   - Every allocated ID is a positive integer
 *   - No two allocations return the same ID
 *   - Auto-allocations form a strictly increasing sequence
 *   - Caller-supplied IDs are preserved exactly
 */

import { Errors } from '../errors.js';

export interface RevisionIdAllocatorOptions {
  /** IDs already claimed by caller content; auto-allocator skips them. */
  reserved?: Iterable<number>;
  /** First candidate ID for auto-allocation (default: 1). */
  startFrom?: number;
}

export class RevisionIdAllocator {
  private readonly reservedIds: ReadonlySet<number>;
  private readonly consumedIds: Set<number>;
  private nextAutoId: number;

  constructor(options: RevisionIdAllocatorOptions = {}) {
    const reserved = new Set<number>();
    for (const id of options.reserved ?? []) {
      if (!Number.isInteger(id) || id <= 0) {
        throw Errors.internal(
          `RevisionIdAllocator: reserved id ${id} must be a positive integer`,
        );
      }
      reserved.add(id);
    }
    this.reservedIds = reserved;
    this.consumedIds = new Set<number>();

    const start = options.startFrom ?? 1;
    if (!Number.isInteger(start) || start <= 0) {
      throw Errors.internal(
        `RevisionIdAllocator: startFrom ${start} must be a positive integer`,
      );
    }
    this.nextAutoId = start;
  }

  /**
   * Allocate an ID for a revision. Preserves caller-supplied IDs;
   * otherwise returns the next available auto-allocated ID.
   */
  allocate(revision?: { id?: number }): number {
    if (revision?.id !== undefined) {
      const id = revision.id;
      if (!Number.isInteger(id) || id <= 0) {
        throw Errors.internal(
          `RevisionIdAllocator: caller-supplied revision id ${id} must be a positive integer`,
        );
      }
      if (this.consumedIds.has(id)) {
        throw Errors.internal(
          `Duplicate DOCX revision id ${id}. Revision IDs must be unique within a render.`,
        );
      }
      this.consumedIds.add(id);
      return id;
    }

    while (this.reservedIds.has(this.nextAutoId) || this.consumedIds.has(this.nextAutoId)) {
      this.nextAutoId += 1;
    }
    const allocated = this.nextAutoId;
    this.consumedIds.add(allocated);
    this.nextAutoId += 1;
    return allocated;
  }

  /** Observe the next candidate auto-allocation ID without consuming. */
  peekNext(): number {
    let candidate = this.nextAutoId;
    while (this.reservedIds.has(candidate) || this.consumedIds.has(candidate)) {
      candidate += 1;
    }
    return candidate;
  }

  /** True if `id` has been allocated through this allocator. */
  isConsumed(id: number): boolean {
    return this.consumedIds.has(id);
  }

  /** True if `id` was registered as reserved at construction. */
  isReserved(id: number): boolean {
    return this.reservedIds.has(id);
  }

  /** Snapshot of consumed IDs (sorted ascending). */
  snapshotConsumed(): number[] {
    return [...this.consumedIds].sort((a, b) => a - b);
  }
}
