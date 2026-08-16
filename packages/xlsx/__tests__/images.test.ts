import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/types/spreadsheet-ast.js";
import { openZip, parseZipXml, readZipEntry } from "./helpers.js";

const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const PIXEL_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/RFhHRUYnJCk6NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AD8A",
  "base64",
);

function singleImageWorkbook(): SpreadsheetDocument {
  return {
    sheets: [{
      name: "Sheet1",
      rows: [{ cells: [{ value: "Hello" }] }],
      images: [{
        data: PIXEL_PNG,
        type: "png",
        anchor: {
          from: { col: 0, row: 0 },
          to: { col: 5, row: 10 },
        },
        name: "TestImage",
        description: "A test image",
        width: 200,
        height: 150,
      }],
    }],
  };
}

describe("Image insertion", () => {
  it("should insert a PNG and produce drawing + media entries in ZIP", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const zip = await openZip(buffer);

    expect(zip.file("xl/media/image1.png")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing1.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/_rels/drawing1.xml.rels")).not.toBeNull();
  });

  it("should produce correct twoCellAnchor drawing XML", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");

    expect(drawingXml).toContain("<xdr:twoCellAnchor>");
    expect(drawingXml).toContain("<xdr:col>0</xdr:col>");
    expect(drawingXml).toContain("<xdr:col>5</xdr:col>");
    expect(drawingXml).toContain("<xdr:row>0</xdr:row>");
    expect(drawingXml).toContain("<xdr:row>10</xdr:row>");
    expect(drawingXml).toContain('name="TestImage"');
    expect(drawingXml).toContain('descr="A test image"');
    // 200px * 9525 = 1905000 EMU
    expect(drawingXml).toContain('cx="1905000"');
    // 150px * 9525 = 1428750 EMU
    expect(drawingXml).toContain('cy="1428750"');
  });

  it("should produce correct drawing relationships linking to image", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const relsXml = await readZipEntry(buffer, "xl/drawings/_rels/drawing1.xml.rels");

    expect(relsXml).toContain('Id="rId1"');
    expect(relsXml).toContain("Target=\"../media/image1.png\"");
    expect(relsXml).toContain("relationships/image");
  });

  it("should support two images in one sheet", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        images: [
          {
            data: PIXEL_PNG,
            type: "png",
            anchor: { from: { col: 0, row: 0 }, to: { col: 3, row: 3 } },
          },
          {
            data: PIXEL_JPEG,
            type: "jpeg",
            anchor: { from: { col: 5, row: 0 }, to: { col: 8, row: 3 } },
          },
        ],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await openZip(buffer);

    expect(zip.file("xl/media/image1.png")).not.toBeNull();
    expect(zip.file("xl/media/image2.jpeg")).not.toBeNull();

    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");
    expect(drawingXml).toContain('r:embed="rId1"');
    expect(drawingXml).toContain('r:embed="rId2"');

    const relsXml = await readZipEntry(buffer, "xl/drawings/_rels/drawing1.xml.rels");
    expect(relsXml).toContain("image1.png");
    expect(relsXml).toContain("image2.jpeg");
  });

  it("should support images in multiple sheets", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [
        {
          name: "Sheet1",
          rows: [{ cells: [{ value: "A" }] }],
          images: [{
            data: PIXEL_PNG,
            type: "png",
            anchor: { from: { col: 0, row: 0 }, to: { col: 3, row: 3 } },
          }],
        },
        {
          name: "Sheet2",
          rows: [{ cells: [{ value: "B" }] }],
          images: [{
            data: PIXEL_PNG,
            type: "png",
            anchor: { from: { col: 1, row: 1 }, to: { col: 4, row: 4 } },
          }],
        },
      ],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const zip = await openZip(buffer);

    expect(zip.file("xl/drawings/drawing1.xml")).not.toBeNull();
    expect(zip.file("xl/drawings/drawing2.xml")).not.toBeNull();
    expect(zip.file("xl/media/image1.png")).not.toBeNull();
    expect(zip.file("xl/media/image2.png")).not.toBeNull();
  });

  it("should include PNG extension in content types", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const contentTypes = await readZipEntry(buffer, "[Content_Types].xml");

    expect(contentTypes).toContain('Extension="png" ContentType="image/png"');
    expect(contentTypes).toContain('PartName="/xl/drawings/drawing1.xml"');
    expect(contentTypes).toContain("drawing+xml");
  });

  it("should use oneCellAnchor when to is omitted", async () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "A" }] }],
        images: [{
          data: PIXEL_PNG,
          type: "png",
          anchor: { from: { col: 2, row: 3 } },
          width: 100,
          height: 100,
        }],
      }],
    };

    const buffer = await SpreadsheetEngine.render(doc);
    const drawingXml = await readZipEntry(buffer, "xl/drawings/drawing1.xml");

    expect(drawingXml).toContain("<xdr:oneCellAnchor>");
    expect(drawingXml).not.toContain("<xdr:twoCellAnchor>");
    // 100px * 9525 = 952500 EMU
    expect(drawingXml).toContain('cx="952500"');
    expect(drawingXml).toContain('cy="952500"');
  });

  it("should accept images field in validation", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Hello" }] }],
        images: [{
          data: PIXEL_PNG,
          type: "png",
          anchor: { from: { col: 0, row: 0 } },
        }],
      }],
    };

    expect(() => SpreadsheetEngine.validateDocument(doc)).not.toThrow();
  });

  it("rejects image dimensions and offsets that exceed drawing bounds", () => {
    expect(() => SpreadsheetEngine.validateDocument({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Hello" }] }],
        images: [{
          data: PIXEL_PNG,
          type: "png",
          anchor: { from: { col: 0, row: 0, colOffset: 5_000 } },
          width: 5_000,
          height: 64,
        }],
      }],
    })).toThrow(/Drawing/);
  });

  it("should include worksheet drawing relationship", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const sheetRels = await readZipEntry(buffer, "xl/worksheets/_rels/sheet1.xml.rels");

    expect(sheetRels).toContain("relationships/drawing");
    expect(sheetRels).toContain("drawing1.xml");
  });

  it("should include drawing element in worksheet XML", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(sheetXml).toContain("<drawing ");
    expect(sheetXml).toContain('r:id="');
  });

  it("should store correct binary data for media", async () => {
    const buffer = await SpreadsheetEngine.render(singleImageWorkbook());
    const zip = await openZip(buffer);
    const imageFile = zip.file("xl/media/image1.png");
    expect(imageFile).not.toBeNull();

    const imageData = await imageFile!.async("nodebuffer");
    expect(imageData.equals(PIXEL_PNG)).toBe(true);
  });
});
