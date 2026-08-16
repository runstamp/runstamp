import { describe, it, expect } from "vitest";
import { PdfEngine } from "../src/engine.js";
import { computePermissionFlags } from "../src/encryption/permissions.js";
import { createEncryption } from "../src/encryption/pdf-encrypt.js";

describe("PDF Encryption", () => {
  // Helper: simple Phase 2 document
  const simpleDoc = { pages: [{ texts: [{ value: "Hello encrypted world", x: 72, y: 700 }] }] };

  describe("AES-128 (Free tier)", () => {
    it("produces encrypted PDF with /Encrypt dict and /ID array", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "secret123" },
      });
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/Encrypt");
      expect(pdf).toContain("/ID");
      expect(pdf).toContain("%PDF-");
    });

    it("sets V=4, R=4, CFM=AESV2", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "test" },
      });
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/V 4");
      expect(pdf).toContain("/R 4");
      expect(pdf).toContain("/CFM /AESV2");
    });

    it("uses PDF version 1.6 or higher", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "test" },
      });
      const header = buffer.subarray(0, 10).toString("ascii");
      expect(header).toMatch(/^%PDF-1\.[6-9]/);
    });

    it("encrypts stream data so plaintext content is absent", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "test" },
      });
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/Filter /Standard");
      // Without encryption, "Hello encrypted world" would appear in a content stream as a Tj operand.
      // With encryption, stream bytes are AES-CBC ciphertext — the plaintext must not appear.
      expect(pdf).not.toContain("Hello encrypted world");
    });

    it("handles empty string password", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "" },
      });
      expect(buffer.length).toBeGreaterThan(0);
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/Encrypt");
    });
  });

  describe("AES-256 (Pro tier)", () => {
    it("produces V=5, R=6, CFM=AESV3 with OE/UE/Perms", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "user", ownerPassword: "owner", algorithm: "aes-256" },
      });
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/V 5");
      expect(pdf).toContain("/R 6");
      expect(pdf).toContain("/CFM /AESV3");
      expect(pdf).toContain("/OE");
      expect(pdf).toContain("/UE");
      expect(pdf).toContain("/Perms");
    });

    it("uses PDF version 1.7", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "user", ownerPassword: "owner", algorithm: "aes-256" },
      });
      const header = buffer.subarray(0, 10).toString("ascii");
      expect(header).toMatch(/^%PDF-1\.7/);
    });

    it("includes Extensions dict in catalog", async () => {
      const buffer = await PdfEngine.render(simpleDoc, {
        encryption: { userPassword: "user", ownerPassword: "owner", algorithm: "aes-256" },
      });
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/ExtensionLevel 3");
    });
  });


  describe("Permission flags", () => {
    it("returns all-allowed when undefined", () => {
      const flags = computePermissionFlags(undefined);
      // All permissions set: 0xFFFFFFFC as signed 32-bit
      expect(flags).toBe(-4); // 0xFFFFFFFC as signed 32-bit
    });

    it("computes correct value for print-only", () => {
      const flags = computePermissionFlags({ print: true, copy: false, modify: false });
      // bit 3 (print) set, bits 7-8 set, bit 12 (printHighQuality) set by default, bits 13-32 set
      expect(flags & 0x4).toBe(0x4);   // print set
      expect(flags & 0x8).toBe(0);     // modify not set
      expect(flags & 0x10).toBe(0);    // copy not set
      expect(flags & 0xC0).toBe(0xC0); // reserved bits 7-8 set
    });

    it("sets reserved bits correctly", () => {
      const flags = computePermissionFlags({});
      expect(flags & 0xC0).toBe(0xC0);       // bits 7-8
      expect((flags >>> 12) & 0xFFFFF).toBe(0xFFFFF); // bits 13-32
    });
  });

  describe("PDF/A + encryption conflict", () => {
    it("rejects encryption when pdfA option is set", async () => {
      await expect(
        PdfEngine.render(simpleDoc, {
          encryption: { userPassword: "test" },
          pdfA: "PDF/A-2b",
        }),
      ).rejects.toThrow(/PDF\/A.*encryption/i);
    });

    it("rejects encryption when document has pdfa.enabled", async () => {
      const doc = {
        children: [{ type: "paragraph" as const, value: "Hello" }],
        pdfa: { enabled: true },
      };
      await expect(
        PdfEngine.render(doc as any, {
          encryption: { userPassword: "test" },
        }),
      ).rejects.toThrow(/PDF\/A.*encryption/i);
    });
  });

  describe("Encryption with Phase 3 documents", () => {
    it("encrypts Phase 3 (layout) documents", async () => {
      const doc = {
        children: [
          { type: "heading" as const, level: 1 as const, value: "Confidential Report" },
          { type: "paragraph" as const, value: "This is confidential content." },
        ],
      };
      const buffer = await PdfEngine.render(doc, {
        encryption: { userPassword: "secret" },
      });
      const pdf = buffer.toString("latin1");
      expect(pdf).toContain("/Encrypt");
      expect(pdf).toContain("/V 4");
    });
  });

  describe("createEncryption unit tests", () => {
    it("creates AES-128 encryption result with correct structure", () => {
      const result = createEncryption({ userPassword: "test" });
      expect(result.fileId).toHaveLength(2);
      expect(result.fileId[0]).toBeInstanceOf(Buffer);
      expect(result.fileId[1]).toBeInstanceOf(Buffer);
      expect(result.fileId[0].length).toBe(16);
      expect(result.fileId[1].length).toBe(16);
      expect(typeof result.encryptString).toBe("function");
      expect(typeof result.encryptStream).toBe("function");
      expect(result.encryptDict).toBeDefined();
    });

    it("creates AES-256 encryption result with correct structure", () => {
      const result = createEncryption({ userPassword: "test", algorithm: "aes-256" });
      expect(result.fileId[0].length).toBe(16);
      expect(result.encryptDict).toBeDefined();
    });

    it("encrypts data (output differs from input)", () => {
      const result = createEncryption({ userPassword: "test" });
      const plaintext = Buffer.from("Hello World", "utf8");
      const encrypted = result.encryptString(plaintext, 1, 0);
      // Encrypted data should be longer (IV + padding) and different
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
      expect(encrypted.equals(plaintext)).toBe(false);
    });
  });
});
