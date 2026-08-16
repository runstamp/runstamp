/**
 * RenderContext unit tests — verify the allocator, registries, and
 * snapshot contract. The class has no callers yet (M2.a); these tests
 * freeze the behavior before M2.b swaps renderPdfPages to use it.
 */
import { describe, it, expect } from "vitest";
import { PDFDictionary, PDFName, PDFRef, PDFStream } from "../src/pdf-objects.js";
import { RenderContext } from "../src/render-context.js";

describe("RenderContext allocator", () => {
  it("allocateRef returns sequential object numbers starting at 1", () => {
    const ctx = new RenderContext();
    const a = ctx.allocateRef();
    const b = ctx.allocateRef();
    const c = ctx.allocateRef();
    expect(a.objectNumber).toBe(1);
    expect(b.objectNumber).toBe(2);
    expect(c.objectNumber).toBe(3);
    expect(a.generationNumber).toBe(0);
  });

  it("allocateRefBlock returns a contiguous run", () => {
    const ctx = new RenderContext();
    const [first, second, third] = ctx.allocateRefBlock(3);
    expect(first.objectNumber).toBe(1);
    expect(second.objectNumber).toBe(2);
    expect(third.objectNumber).toBe(3);
  });

  it("allocateRefBlock composes correctly with allocateRef", () => {
    const ctx = new RenderContext();
    const solo = ctx.allocateRef();
    const [a, b] = ctx.allocateRefBlock(2);
    const after = ctx.allocateRef();
    expect(solo.objectNumber).toBe(1);
    expect(a.objectNumber).toBe(2);
    expect(b.objectNumber).toBe(3);
    expect(after.objectNumber).toBe(4);
  });

  it("allocateRefBlock rejects non-positive counts", () => {
    const ctx = new RenderContext();
    expect(() => ctx.allocateRefBlock(0)).toThrow(RangeError);
    expect(() => ctx.allocateRefBlock(-1)).toThrow(RangeError);
    expect(() => ctx.allocateRefBlock(1.5)).toThrow(RangeError);
  });
});

describe("RenderContext objects", () => {
  it("addObject preserves insertion order", () => {
    const ctx = new RenderContext();
    const r1 = ctx.allocateRef();
    const r2 = ctx.allocateRef();
    const r3 = ctx.allocateRef();
    ctx.addObject(r2, new PDFDictionary({ Type: new PDFName("Middle") }));
    ctx.addObject(r1, new PDFDictionary({ Type: new PDFName("First") }));
    ctx.addObject(r3, new PDFDictionary({ Type: new PDFName("Last") }));

    const list = [...ctx.iterateObjects()];
    expect(list.map((o) => o.ref.objectNumber)).toEqual([2, 1, 3]);
  });

  it("objectCount tracks registrations", () => {
    const ctx = new RenderContext();
    expect(ctx.objectCount).toBe(0);
    ctx.addObject(ctx.allocateRef(), new PDFDictionary({}));
    ctx.addObject(ctx.allocateRef(), new PDFStream(new PDFDictionary({}), Buffer.from("x")));
    expect(ctx.objectCount).toBe(2);
  });
});

describe("RenderContext resource registries", () => {
  it("registerFont then getFontRef round-trips", () => {
    const ctx = new RenderContext();
    const ref = ctx.allocateRef();
    ctx.registerFont("Helvetica", ref);
    expect(ctx.getFontRef("Helvetica")).toBe(ref);
    expect(ctx.getFontRef("unknown")).toBeUndefined();
  });

  it("registerImage stores ref and alias together", () => {
    const ctx = new RenderContext();
    const ref = ctx.allocateRef();
    ctx.registerImage("sha:abc", ref, "Im1");
    expect(ctx.getImageRef("sha:abc")).toBe(ref);
    expect(ctx.getImageAlias("sha:abc")).toBe("Im1");
  });

  it("registerForm / registerExtGState / registerShading all round-trip", () => {
    const ctx = new RenderContext();
    const formRef = ctx.allocateRef();
    const extRef = ctx.allocateRef();
    const shadingRef = ctx.allocateRef();
    ctx.registerForm("form-a", formRef, "Fm1");
    ctx.registerExtGState("ext-a", extRef, "GS1");
    ctx.registerShading("shade-a", shadingRef, "Sh1");

    expect(ctx.getFormRef("form-a")).toBe(formRef);
    expect(ctx.getFormAlias("form-a")).toBe("Fm1");
    expect(ctx.getExtGStateRef("ext-a")).toBe(extRef);
    expect(ctx.getExtGStateAlias("ext-a")).toBe("GS1");
    expect(ctx.getShadingRef("shade-a")).toBe(shadingRef);
    expect(ctx.getShadingAlias("shade-a")).toBe("Sh1");
  });

  it("re-registering a key overwrites the previous entry", () => {
    const ctx = new RenderContext();
    const first = ctx.allocateRef();
    const second = ctx.allocateRef();
    ctx.registerFont("X", first);
    ctx.registerFont("X", second);
    expect(ctx.getFontRef("X")).toBe(second);
  });
});

describe("RenderContext snapshot", () => {
  it("snapshot returns a frozen, read-only view", () => {
    const ctx = new RenderContext();
    const ref = ctx.allocateRef();
    ctx.addObject(ref, new PDFDictionary({ Type: new PDFName("X") }));
    const snap = ctx.snapshot();
    expect(snap.nextObjectNumber).toBe(2);
    expect(snap.objects).toHaveLength(1);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.objects)).toBe(true);
    expect(() => {
      (snap.objects as unknown as RenderContext[]).push({} as never);
    }).toThrow();
  });

  it("snapshot is a point-in-time view; later mutations do not affect it", () => {
    const ctx = new RenderContext();
    const r1 = ctx.allocateRef();
    ctx.addObject(r1, new PDFDictionary({}));
    const snap = ctx.snapshot();

    const r2 = ctx.allocateRef();
    ctx.addObject(r2, new PDFDictionary({}));

    expect(snap.objects).toHaveLength(1);
    expect(snap.nextObjectNumber).toBe(2);
    expect(ctx.objectCount).toBe(2);
  });

  it("snapshot object numbers are monotonically non-decreasing in insertion order when allocations are sequential", () => {
    const ctx = new RenderContext();
    for (let i = 0; i < 10; i += 1) {
      const ref = ctx.allocateRef();
      ctx.addObject(ref, new PDFDictionary({}));
    }
    const snap = ctx.snapshot();
    for (let i = 1; i < snap.objects.length; i += 1) {
      expect(snap.objects[i].ref.objectNumber).toBeGreaterThan(
        snap.objects[i - 1].ref.objectNumber,
      );
    }
  });
});

describe("RenderContext holds PDFRef identity", () => {
  it("allocateRef returns the real PDFRef class", () => {
    const ctx = new RenderContext();
    const ref = ctx.allocateRef();
    expect(ref).toBeInstanceOf(PDFRef);
  });
});
