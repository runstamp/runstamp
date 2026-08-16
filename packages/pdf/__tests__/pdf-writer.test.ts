import { PDFArray, PDFDictionary, PDFName, PDFNumber, PDFRef, PDFString, serializePdfObject } from "../src/pdf-objects.js";
import { writePdfDocument } from "../src/pdf-writer.js";

describe("pdf writer primitives", () => {
  it("writes the PDF header and binary marker", () => {
    const buffer = writePdfDocument({
      info: new PDFRef(2),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: new PDFRef(2),
          value: new PDFDictionary({
            Producer: new PDFString("Runstamp"),
          }),
        },
      ],
    });

    expect(buffer.subarray(0, 9).toString("ascii")).toBe("%PDF-1.4\n");
    expect(buffer[9]).toBe(0x25);
    expect(buffer[10]).toBe(0xff);
  });

  it("serializes indirect object primitives deterministically", () => {
    const serialized = serializePdfObject(
      new PDFDictionary({
        Array: new PDFArray([new PDFNumber(42), new PDFName("Test"), new PDFRef(7)]),
        Flag: true,
        Nullish: null,
        Value: new PDFString("Hello"),
      }),
    );

    expect(serialized.toString("utf8")).toBe("<<\n/Array [42 /Test 7 0 R]\n/Flag true\n/Value (Hello)\n>>");
  });

  it("escapes literal strings for parens, slash, carriage return, and newline", () => {
    const serialized = serializePdfObject(new PDFString("A(B)\\C\rD\nE"));
    expect(serialized.toString("utf8")).toBe("(A\\(B\\)\\\\C\\rD\\nE)");
  });

  it("formats xref rows with fixed-width offsets", () => {
    const buffer = writePdfDocument({
      info: new PDFRef(2),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: new PDFRef(2),
          value: new PDFDictionary({
            Producer: new PDFString("Runstamp"),
          }),
        },
      ],
    }).toString("binary");

    expect(buffer).toMatch(/xref\n0 3\n0000000000 65535 f \n\d{10} 00000 n \n\d{10} 00000 n \n/);
  });

  it("writes an accurate startxref pointer", () => {
    const buffer = writePdfDocument({
      info: new PDFRef(2),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: new PDFRef(2),
          value: new PDFDictionary({
            Producer: new PDFString("Runstamp"),
          }),
        },
      ],
    });

    const content = buffer.toString("binary");
    const match = content.match(/startxref\n(\d+)\n%%EOF/);
    expect(match).not.toBeNull();

    const xrefOffset = Number(match?.[1]);
    expect(xrefOffset).toBe(content.indexOf("xref\n"));
  });

  it("emits an explicit trailer ID when provided", () => {
    const buffer = writePdfDocument({
      fileId: [Buffer.from("00112233445566778899AABBCCDDEEFF", "hex"), Buffer.from("FFEEDDCCBBAA99887766554433221100", "hex")],
      info: new PDFRef(2),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: new PDFRef(2),
          value: new PDFDictionary({
            Producer: new PDFString("Runstamp"),
          }),
        },
      ],
    }).toString("binary");

    expect(buffer).toContain("/ID [<00112233445566778899AABBCCDDEEFF> <FFEEDDCCBBAA99887766554433221100>]");
  });

  it("emits a structurally complete empty document skeleton", () => {
    const pagesRef = new PDFRef(2);
    const buffer = writePdfDocument({
      info: new PDFRef(3),
      root: new PDFRef(1),
      objects: [
        {
          ref: new PDFRef(1),
          value: new PDFDictionary({
            Pages: pagesRef,
            Type: new PDFName("Catalog"),
          }),
        },
        {
          ref: pagesRef,
          value: new PDFDictionary({
            Count: new PDFNumber(0),
            Kids: new PDFArray([]),
            Type: new PDFName("Pages"),
          }),
        },
        {
          ref: new PDFRef(3),
          value: new PDFDictionary({
            Producer: new PDFString("Runstamp"),
          }),
        },
      ],
    }).toString("binary");

    expect(buffer).toContain("/Type /Catalog");
    expect(buffer).toContain("/Type /Pages");
    expect(buffer).toContain("/Count 0");
    expect(buffer).toContain("trailer\n<<\n/Info 3 0 R\n/Root 1 0 R\n/Size 4\n>>");
  });
});
