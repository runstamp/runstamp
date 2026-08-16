import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, validateSpreadsheetDocument } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

function makeDoc(conditionalFormatting: SpreadsheetDocument["sheets"][0]["conditionalFormatting"]): SpreadsheetDocument {
  return {
    sheets: [
      {
        name: "Sheet1",
        rows: Array.from({ length: 10 }, (_unused, i) => ({
          cells: [{ value: i + 1 }, { value: (i + 1) * 10 }],
        })),
        conditionalFormatting,
      },
    ],
  };
}

describe("Advanced conditional formatting", () => {
  describe("Data bars", () => {
    it("serializes basic dataBar with defaults", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('<cfRule type="dataBar"');
      expect(xml).toContain("<dataBar>");
      expect(xml).toContain('<cfvo type="num" val="0"/>');
      expect(xml).toContain('<cfvo type="max"/>');
      // Nonnegative ranges use a zero baseline so the smallest positive value
      // still has a visible, proportional bar. No showValue or gradient
      // attributes are needed on defaults.
      expect(xml).not.toContain('showValue="0"');
      expect(xml).not.toContain("extLst");

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes custom min/max values", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "00FF00",
              min: { type: "num", value: 0 },
              max: { type: "num", value: 100 },
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('<cfvo type="num" val="0"/>');
      expect(xml).toContain('<cfvo type="num" val="100"/>');

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes showValue=false", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              showValue: false,
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('showValue="0"');

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes negativeColor with extLst", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              negativeColor: "FF0000",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain("<extLst>");
      expect(xml).toContain('<x14:negativeFillColor rgb="FFFF0000"/>');
      expect(xml).toContain('<x14:axisColor rgb="FF000000"/>');
      expect(xml).toContain("<xm:sqref>A1:A10</xm:sqref>");
    });

    it("serializes axisPosition middle", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              axisPosition: "middle",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain("<extLst>");
      expect(xml).toContain('axisPosition="middle"');
      expect(xml).toContain('<x14:axisColor rgb="FF000000"/>');
    });

    it("serializes axisPosition none without axisColor", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              axisPosition: "none",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain("<extLst>");
      expect(xml).toContain('axisPosition="none"');
      expect(xml).not.toContain("x14:axisColor");
    });

    it("serializes gradient=false", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              gradient: false,
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain("<extLst>");
      expect(xml).toContain('gradient="0"');
    });

    it("serializes direction", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              direction: "rightToLeft",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain("<extLst>");
      expect(xml).toContain('direction="rightToLeft"');
    });

    it("serializes all extended options combined", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              negativeColor: "FF0000",
              gradient: false,
              direction: "rightToLeft",
              axisPosition: "middle",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain("<extLst>");
      expect(xml).toContain('gradient="0"');
      expect(xml).toContain('direction="rightToLeft"');
      expect(xml).toContain('axisPosition="middle"');
      expect(xml).toContain('<x14:negativeFillColor rgb="FFFF0000"/>');
      expect(xml).toContain('<x14:axisColor rgb="FF000000"/>');
    });
  });

  describe("Icon sets", () => {
    it("serializes 3Arrows with defaults", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "3Arrows",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('<cfRule type="iconSet"');
      expect(xml).toContain('iconSet="3Arrows"');
      expect(xml).toContain('<cfvo type="percent" val="0"/>');
      expect(xml).toContain('<cfvo type="percent" val="33"/>');
      expect(xml).toContain('<cfvo type="percent" val="67"/>');

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes 5Rating with default thresholds", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "5Rating",
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('iconSet="5Rating"');
      expect(xml).toContain('<cfvo type="percent" val="0"/>');
      expect(xml).toContain('<cfvo type="percent" val="20"/>');
      expect(xml).toContain('<cfvo type="percent" val="40"/>');
      expect(xml).toContain('<cfvo type="percent" val="60"/>');
      expect(xml).toContain('<cfvo type="percent" val="80"/>');

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes custom thresholds", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "3Flags",
              thresholds: [
                { type: "percent", value: 0 },
                { type: "percent", value: 25 },
                { type: "percent", value: 75 },
              ],
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('iconSet="3Flags"');
      expect(xml).toContain('<cfvo type="percent" val="0"/>');
      expect(xml).toContain('<cfvo type="percent" val="25"/>');
      expect(xml).toContain('<cfvo type="percent" val="75"/>');

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes reverse=true", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "3Arrows",
              reverse: true,
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('reverse="1"');
    });

    it("serializes showValue=false", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "3Arrows",
              showValue: false,
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('showValue="0"');
    });
  });

  describe("Color scales (existing)", () => {
    it("serializes 2-color scale", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "colorScale",
              scale: {
                min: { type: "min", color: "FF0000" },
                max: { type: "max", color: "00FF00" },
              },
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('<cfRule type="colorScale"');
      // 2 cfvo elements
      const cfvoMatches = xml.match(/<cfvo type="(min|max)"/g);
      expect(cfvoMatches).toHaveLength(2);
      // 2 color elements
      const colorMatches = xml.match(/<color rgb="/g);
      expect(colorMatches?.length).toBeGreaterThanOrEqual(2);

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });

    it("serializes 3-color scale with percentile", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "colorScale",
              scale: {
                min: { type: "min", color: "FF0000" },
                mid: { type: "percentile", value: 50, color: "FFFF00" },
                max: { type: "max", color: "00FF00" },
              },
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('<cfvo type="percentile" val="50"/>');
      // 3 cfvo + 3 color elements
      const cfvoMatches = xml.match(/<cfvo /g);
      expect(cfvoMatches).toHaveLength(3);
      const colorMatches = xml.match(/<color rgb="/g);
      expect(colorMatches?.length).toBeGreaterThanOrEqual(3);

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });
  });

  describe("Multiple types on same range", () => {
    it("combines dataBar, iconSet, and colorScale", async () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
            },
            {
              type: "iconSet",
              iconSet: "3Arrows",
            },
            {
              type: "colorScale",
              scale: {
                min: { type: "min", color: "FF0000" },
                max: { type: "max", color: "00FF00" },
              },
            },
          ],
        },
      ]);

      const buffer = await SpreadsheetEngine.render(doc);
      const xml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

      expect(xml).toContain('type="dataBar"');
      expect(xml).toContain('type="iconSet"');
      expect(xml).toContain('type="colorScale"');

      const summary = await SpreadsheetEngine.validate(buffer);
      expect(summary.verdict).toBe("clean");
    });
  });

  describe("Validation", () => {
    it("rejects invalid icon set type", () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "99Invalid" as never,
            },
          ],
        },
      ]);

      expect(() => validateSpreadsheetDocument(doc)).toThrow();
    });

    it("rejects threshold count mismatch for icon set", () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "iconSet",
              iconSet: "3Arrows",
              thresholds: [
                { type: "percent", value: 0 },
                { type: "percent", value: 25 },
                { type: "percent", value: 50 },
                { type: "percent", value: 75 },
              ],
            },
          ],
        },
      ]);

      expect(() => validateSpreadsheetDocument(doc)).toThrow();
    });

    it("accepts valid dataBar with optional fields", () => {
      const doc = makeDoc([
        {
          ref: "A1:A10",
          rules: [
            {
              type: "dataBar",
              color: "0088FF",
              min: { type: "min" },
              max: { type: "max" },
              gradient: false,
              showValue: false,
              negativeColor: "FF0000",
              axisPosition: "middle",
              direction: "rightToLeft",
            },
          ],
        },
      ]);

      expect(() => validateSpreadsheetDocument(doc)).not.toThrow();
    });
  });
});
