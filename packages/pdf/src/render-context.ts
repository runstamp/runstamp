/**
 * RenderContext — centralizes the object-numbering allocator and the
 * resource-registry maps used during PDF serialization.
 *
 * Background. Historically, `renderPdfPages` kept all of this state as
 * ad-hoc local variables and Maps inside one 1,000+ line function. That
 * made ordering invariants (object 1 = catalog, fonts before page, etc.)
 * implicit and made the file difficult to split into phase-specific
 * subsystems. `RenderContext` gathers the state into a single object so
 * the eventual refactor of `renderPdfPages` and the Phase 6 widget
 * extraction can share a uniform handle.
 *
 * This module has no callers yet — see M2.b in
 * docs/audit-0422/4-pdf-refactor-plan.md for the integration plan.
 *
 * Contract notes:
 *  - `allocateRef()` returns monotonically increasing object numbers
 *    starting at 1. Generation numbers are always 0 for newly-written
 *    documents (PDF spec allows >0 only for incremental updates).
 *  - `addObject(ref, value)` preserves insertion order. The writer
 *    sorts by object number before emitting, so insertion order is
 *    not load-bearing for output — but it is load-bearing for our
 *    tests that snapshot the object stream.
 *  - Resource registries are opt-in: the renderer may allocate a ref
 *    via `allocateRef()` without also registering the resource if the
 *    object isn't in a lookup-by-key path.
 */

import type { PDFDictionary, PDFStream } from "./pdf-objects.js";
import { PDFRef } from "./pdf-objects.js";

export interface RenderContextObject {
  ref: PDFRef;
  value: PDFDictionary | PDFStream;
}

export interface RenderContextSnapshot {
  /** All registered objects in insertion order. */
  readonly objects: ReadonlyArray<RenderContextObject>;
  /** The next unallocated object number (= last allocated + 1). */
  readonly nextObjectNumber: number;
}

export class RenderContext {
  private nextObjectNumber = 1;
  private readonly objects: RenderContextObject[] = [];

  private readonly fontRefs = new Map<string, PDFRef>();
  private readonly imageRefs = new Map<string, PDFRef>();
  private readonly imageAliases = new Map<string, string>();
  private readonly formRefs = new Map<string, PDFRef>();
  private readonly formAliases = new Map<string, string>();
  private readonly extRefs = new Map<string, PDFRef>();
  private readonly extAliases = new Map<string, string>();
  private readonly shadingRefs = new Map<string, PDFRef>();
  private readonly shadingAliases = new Map<string, string>();

  allocateRef(): PDFRef {
    const ref = new PDFRef(this.nextObjectNumber);
    this.nextObjectNumber += 1;
    return ref;
  }

  /**
   * Allocate a contiguous run of object refs in a single call.
   *
   * Used for compound objects that need adjacent numbering (e.g. an
   * embedded font emits 6 related objects — Type0, CIDFont, descriptor,
   * font-file stream, CIDToGIDMap stream, ToUnicode CMap — and the
   * renderer wires them up by offset).
   */
  allocateRefBlock(count: number): PDFRef[] {
    if (!Number.isInteger(count) || count < 1) {
      throw new RangeError(`allocateRefBlock requires a positive integer count, got ${count}`);
    }
    const refs: PDFRef[] = [];
    for (let i = 0; i < count; i += 1) {
      refs.push(this.allocateRef());
    }
    return refs;
  }

  addObject(ref: PDFRef, value: PDFDictionary | PDFStream): void {
    this.objects.push({ ref, value });
  }

  registerFont(key: string, ref: PDFRef): void {
    this.fontRefs.set(key, ref);
  }

  getFontRef(key: string): PDFRef | undefined {
    return this.fontRefs.get(key);
  }

  registerImage(key: string, ref: PDFRef, alias: string): void {
    this.imageRefs.set(key, ref);
    this.imageAliases.set(key, alias);
  }

  getImageRef(key: string): PDFRef | undefined {
    return this.imageRefs.get(key);
  }

  getImageAlias(key: string): string | undefined {
    return this.imageAliases.get(key);
  }

  registerForm(key: string, ref: PDFRef, alias: string): void {
    this.formRefs.set(key, ref);
    this.formAliases.set(key, alias);
  }

  getFormRef(key: string): PDFRef | undefined {
    return this.formRefs.get(key);
  }

  getFormAlias(key: string): string | undefined {
    return this.formAliases.get(key);
  }

  registerExtGState(key: string, ref: PDFRef, alias: string): void {
    this.extRefs.set(key, ref);
    this.extAliases.set(key, alias);
  }

  getExtGStateRef(key: string): PDFRef | undefined {
    return this.extRefs.get(key);
  }

  getExtGStateAlias(key: string): string | undefined {
    return this.extAliases.get(key);
  }

  registerShading(key: string, ref: PDFRef, alias: string): void {
    this.shadingRefs.set(key, ref);
    this.shadingAliases.set(key, alias);
  }

  getShadingRef(key: string): PDFRef | undefined {
    return this.shadingRefs.get(key);
  }

  getShadingAlias(key: string): string | undefined {
    return this.shadingAliases.get(key);
  }

  /**
   * Returns a frozen, read-only view of the current state. Intended for
   * handoff to the writer at end-of-render; further mutations to the
   * context are still possible but won't be reflected in this snapshot.
   */
  snapshot(): RenderContextSnapshot {
    return Object.freeze({
      objects: Object.freeze(this.objects.slice()),
      nextObjectNumber: this.nextObjectNumber,
    });
  }

  /** Iterate registered objects without allocating a snapshot array. */
  *iterateObjects(): IterableIterator<RenderContextObject> {
    for (const entry of this.objects) {
      yield entry;
    }
  }

  /** Iterate font (key, ref) pairs in registration order. */
  *iterateFonts(): IterableIterator<[string, PDFRef]> {
    for (const entry of this.fontRefs.entries()) {
      yield entry;
    }
  }

  /** Iterate image (key, ref, alias) triples in registration order. */
  *iterateImages(): IterableIterator<[string, PDFRef, string]> {
    for (const [key, ref] of this.imageRefs.entries()) {
      const alias = this.imageAliases.get(key);
      if (alias !== undefined) {
        yield [key, ref, alias];
      }
    }
  }

  /** Iterate form (key, ref, alias) triples in registration order. */
  *iterateForms(): IterableIterator<[string, PDFRef, string]> {
    for (const [key, ref] of this.formRefs.entries()) {
      const alias = this.formAliases.get(key);
      if (alias !== undefined) {
        yield [key, ref, alias];
      }
    }
  }

  /** Iterate ExtGState (key, ref, alias) triples in registration order. */
  *iterateExtGStates(): IterableIterator<[string, PDFRef, string]> {
    for (const [key, ref] of this.extRefs.entries()) {
      const alias = this.extAliases.get(key);
      if (alias !== undefined) {
        yield [key, ref, alias];
      }
    }
  }

  /** Iterate shading (key, ref, alias) triples in registration order. */
  *iterateShadings(): IterableIterator<[string, PDFRef, string]> {
    for (const [key, ref] of this.shadingRefs.entries()) {
      const alias = this.shadingAliases.get(key);
      if (alias !== undefined) {
        yield [key, ref, alias];
      }
    }
  }

  get objectCount(): number {
    return this.objects.length;
  }
}
