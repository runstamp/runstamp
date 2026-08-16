import { describe, expect, it } from "vitest";
import { dateToSerial, dateToSerialString, EXCEL_EPOCH_UTC, serialToDate } from "../src/utils/date.js";
import { SpreadsheetEngine, SpreadsheetValidationError } from "../src/index.js";
import { readZipEntry } from "./helpers.js";

describe("dateToSerial", () => {
  it("Jan 1, 1900 -> serial 1", () => {
    expect(dateToSerial(new Date(Date.UTC(1900, 0, 1)))).toBe(1);
  });

  it("Feb 28, 1900 -> serial 59", () => {
    expect(dateToSerial(new Date(Date.UTC(1900, 1, 28)))).toBe(59);
  });

  it("Mar 1, 1900 -> serial 61 (skipping phantom Feb 29 = 60)", () => {
    expect(dateToSerial(new Date(Date.UTC(1900, 2, 1)))).toBe(61);
  });

  it("Jan 1, 2000 -> serial 36526", () => {
    expect(dateToSerial(new Date(Date.UTC(2000, 0, 1)))).toBe(36526);
  });

  it("supports the 1904 date system without the Lotus 1900 adjustment", () => {
    expect(dateToSerial(new Date(Date.UTC(1904, 0, 1)), "1904")).toBe(0);
    expect(dateToSerial(new Date(Date.UTC(2024, 5, 15)), "1904")).toBe(43996);
    expect(dateToSerialString(new Date(Date.UTC(2024, 5, 15)), "1904")).toBe("43996");
    expect(serialToDate(43996, "1904").getTime()).toBe(Date.UTC(2024, 5, 15));
  });

  it("Dec 31, 1899 -> serial 0", () => {
    expect(dateToSerial(new Date(Date.UTC(1899, 11, 31)))).toBe(0);
  });

  it("rejects dates before Dec 31, 1899", () => {
    expect(() => dateToSerial(new Date(EXCEL_EPOCH_UTC))).toThrow(/1899-12-31/);
    expect(() => dateToSerialString(new Date(EXCEL_EPOCH_UTC))).toThrow(/1899-12-31/);
  });

  it("round-trip: serialToDate(dateToSerial(date)) for dates >= Mar 1, 1900", () => {
    const dates = [
      new Date(Date.UTC(1900, 2, 1)),   // Mar 1, 1900
      new Date(Date.UTC(2000, 0, 1)),   // Jan 1, 2000
      new Date(Date.UTC(2026, 2, 27)),  // Mar 27, 2026
      new Date(Date.UTC(1950, 5, 15)),  // Jun 15, 1950
      new Date(Date.UTC(2099, 11, 31)), // Dec 31, 2099
    ];

    for (const date of dates) {
      const serial = dateToSerial(date);
      const roundTripped = serialToDate(serial);
      expect(roundTripped.getTime()).toBe(date.getTime());
    }
  });

  it("EXCEL_EPOCH_UTC is Dec 30, 1899", () => {
    const epoch = new Date(EXCEL_EPOCH_UTC);
    expect(epoch.getUTCFullYear()).toBe(1899);
    expect(epoch.getUTCMonth()).toBe(11);
    expect(epoch.getUTCDate()).toBe(30);
  });

  it("dateToSerialString returns formatted string", () => {
    const result = dateToSerialString(new Date(Date.UTC(1900, 0, 1)));
    expect(result).toBe("1");
  });

  it("renders a workbook with date cells containing correct serial values", async () => {
    const testDate = new Date(Date.UTC(2026, 2, 27));
    const expectedSerial = dateToSerialString(testDate);

    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Dates",
          rows: [
            {
              cells: [
                { value: testDate },
                { value: new Date(Date.UTC(1900, 0, 1)) },
              ],
            },
          ],
        },
      ],
    });

    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");
    expect(sheetXml).toContain(`<v>${expectedSerial}</v>`);
    // Jan 1, 1900 = serial 1
    expect(sheetXml).toContain(`<v>1</v>`);
  });

  it("renders date1904 workbooks with workbookPr and 1904-relative date serials", async () => {
    const buffer = await SpreadsheetEngine.render({
      date1904: true,
      sheets: [
        {
          name: "Dates",
          rows: [{ cells: [{ value: new Date(Date.UTC(2024, 5, 15)) }] }],
          dataValidations: [
            {
              ref: "B1:B1",
              type: "date",
              operator: "equal",
              formula1: "2024-06-15",
            },
          ],
        },
      ],
    });

    const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");
    const sheetXml = await readZipEntry(buffer, "xl/worksheets/sheet1.xml");

    expect(workbookXml).toContain('<workbookPr date1904="1"/>');
    expect(sheetXml).toContain("<v>43996</v>");
    expect(sheetXml).toContain("<formula1>43996</formula1>");
  });

  it("omits date1904 workbookPr by default", async () => {
    const buffer = await SpreadsheetEngine.render({
      sheets: [
        {
          name: "Dates",
          rows: [{ cells: [{ value: new Date(Date.UTC(2024, 5, 15)) }] }],
        },
      ],
    });

    const workbookXml = await readZipEntry(buffer, "xl/workbook.xml");

    expect(workbookXml).not.toContain("date1904");
  });

  it("accepts date1904 at the document root while still rejecting unknown root keys", () => {
    expect(() => SpreadsheetEngine.validateDocument({
      date1904: true,
      sheets: [{ name: "Dates", rows: [{ cells: [] }] }],
    })).not.toThrow();

    expect(() => SpreadsheetEngine.validateDocument({
      date1904Typo: true,
      sheets: [{ name: "Dates", rows: [{ cells: [] }] }],
    })).toThrow(SpreadsheetValidationError);
  });

  it("rejects workbook cells with dates before Dec 31, 1899", () => {
    expect(() => SpreadsheetEngine.validateDocument({
      sheets: [
        {
          name: "Dates",
          rows: [{ cells: [{ value: new Date(EXCEL_EPOCH_UTC) }] }],
        },
      ],
    })).toThrow(SpreadsheetValidationError);
  });
});
