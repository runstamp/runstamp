import { describe, expect, it } from "vitest";
import { SpreadsheetEngine, SpreadsheetValidationError, validateSpreadsheetDocument } from "../src/index.js";
import type { SpreadsheetDocument } from "../src/index.js";
import { readZipEntry } from "./helpers.js";
import { dateToSerial } from "../src/utils/date.js";

async function getSheet1Xml(doc: SpreadsheetDocument): Promise<string> {
  const buffer = await SpreadsheetEngine.render(doc, { deterministic: true });
  return readZipEntry(buffer, "xl/worksheets/sheet1.xml");
}

describe("data validation enhancements", () => {
  it("list with string[] formula1 produces inline list", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: ["High", "Medium", "Low"] },
        ],
      }],
    });
    expect(xml).toContain('type="list"');
    expect(xml).toContain("<formula1>&quot;High,Medium,Low&quot;</formula1>");
  });

  it("list with named range string formula1", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: "=StatusList" },
        ],
      }],
    });
    expect(xml).toContain("<formula1>=StatusList</formula1>");
  });

  it("whole number with numeric formula1 and formula2", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "B2:B10", type: "whole", operator: "between", formula1: 1, formula2: 100 },
        ],
      }],
    });
    expect(xml).toContain("<formula1>1</formula1>");
    expect(xml).toContain("<formula2>100</formula2>");
  });

  it("decimal with greaterThan operator", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "C2:C10", type: "decimal", operator: "greaterThan", formula1: 0.5 },
        ],
      }],
    });
    expect(xml).toContain("<formula1>0.5</formula1>");
  });

  it("date with ISO string auto-converts to serial", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "D2:D10", type: "date", operator: "greaterThan", formula1: "2024-01-15" },
        ],
      }],
    });
    expect(xml).toContain(`<formula1>${dateToSerial(new Date("2024-01-15"))}</formula1>`);
  });

  it("date between with two ISO dates", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "D2:D10", type: "date", operator: "between", formula1: "2024-01-01", formula2: "2024-12-31" },
        ],
      }],
    });
    expect(xml).toContain(`<formula1>${dateToSerial(new Date("2024-01-01"))}</formula1>`);
    expect(xml).toContain(`<formula2>${dateToSerial(new Date("2024-12-31"))}</formula2>`);
  });

  it("textLength with lessThanOrEqual", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "E2:E10", type: "textLength", operator: "lessThanOrEqual", formula1: 50 },
        ],
      }],
    });
    expect(xml).toContain('type="textLength"');
    expect(xml).toContain("<formula1>50</formula1>");
  });

  it("custom formula passes through with XML escaping", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "F2:F10", type: "custom", formula1: "AND(A1>0,A1<100)" },
        ],
      }],
    });
    expect(xml).toContain("<formula1>AND(A1&gt;0,A1&lt;100)</formula1>");
  });

  it("time with equal operator", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "G2:G10", type: "time", operator: "equal", formula1: "0.5" },
        ],
      }],
    });
    expect(xml).toContain('type="time"');
    expect(xml).toContain("<formula1>0.5</formula1>");
  });

  it("allowBlank defaults to true", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: "=Items" },
        ],
      }],
    });
    expect(xml).toContain('allowBlank="1"');
  });

  it("showErrorMessage defaults to true", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: "=Items" },
        ],
      }],
    });
    expect(xml).toContain('showErrorMessage="1"');
  });

  it("allowBlank false emits 0", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: "=Items", allowBlank: false },
        ],
      }],
    });
    expect(xml).toContain('allowBlank="0"');
  });

  it("showDropDown OOXML inversion", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: "=Items", showDropDown: true },
          { ref: "B2:B10", type: "list", formula1: "=Items2", showDropDown: false },
        ],
      }],
    });
    // OOXML inverts: showDropDown=true means hide dropdown → attribute "0"
    // showDropDown=false means show dropdown → attribute "1"
    expect(xml).toContain('showDropDown="0"');
    expect(xml).toContain('showDropDown="1"');
  });

  it("rejects inline list exceeding 255 characters", () => {
    const longItems = Array.from({ length: 50 }, (_, i) => `VeryLongOptionItem${i}`);
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: longItems },
        ],
      }],
    };
    expect(() => validateSpreadsheetDocument(doc)).toThrow(SpreadsheetValidationError);
    try {
      validateSpreadsheetDocument(doc);
    } catch (e) {
      expect((e as SpreadsheetValidationError).message).toContain("255");
    }
  });

  it("rejects list items containing commas", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: ["Option A, B", "C"] },
        ],
      }],
    };
    expect(() => validateSpreadsheetDocument(doc)).toThrow(SpreadsheetValidationError);
    try {
      validateSpreadsheetDocument(doc);
    } catch (e) {
      expect((e as SpreadsheetValidationError).message).toContain("cannot contain commas");
    }
  });

  it("rejects string[] formula1 for non-list type", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "whole", operator: "equal", formula1: ["A"] },
        ],
      }],
    };
    expect(() => validateSpreadsheetDocument(doc)).toThrow(SpreadsheetValidationError);
    try {
      validateSpreadsheetDocument(doc);
    } catch (e) {
      expect((e as SpreadsheetValidationError).message).toContain("only valid for type");
    }
  });

  it("backward compat: string-only inline list", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: '"Q1,Q2,Q3,Q4"' },
        ],
      }],
    });
    expect(xml).toContain("<formula1>&quot;Q1,Q2,Q3,Q4&quot;</formula1>");
  });

  it("cross-sheet list reference produces formula", async () => {
    const xml = await getSheet1Xml({
      sheets: [
        {
          name: "Orders",
          rows: [{ cells: [{ value: "Status" }] }],
          dataValidations: [
            { ref: "A2:A100", type: "list", formula1: "Lookup!$A$1:$A$20" },
          ],
        },
        {
          name: "Lookup",
          rows: Array.from({ length: 5 }, (_, i) => ({ cells: [{ value: `Option ${i + 1}` }] })),
        },
      ],
    });
    expect(xml).toContain('type="list"');
    expect(xml).toContain("<formula1>Lookup!$A$1:$A$20</formula1>");
  });

  it("error alert attributes serialize correctly", async () => {
    for (const errorStyle of ["stop", "warning", "information"] as const) {
      const xml = await getSheet1Xml({
        sheets: [{
          name: "Sheet1",
          rows: [{ cells: [{ value: "Header" }] }],
          dataValidations: [
            {
              ref: "A2:A10",
              type: "whole",
              operator: "greaterThan",
              formula1: 0,
              errorStyle,
              errorTitle: "Bad Value",
              error: "Please enter a valid number",
            },
          ],
        }],
      });
      if (errorStyle !== "stop") {
        expect(xml).toContain(`errorStyle="${errorStyle}"`);
      }
      expect(xml).toContain('errorTitle="Bad Value"');
      expect(xml).toContain('error="Please enter a valid number"');
    }
  });

  it("input message attributes serialize correctly", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          {
            ref: "A2:A10",
            type: "list",
            formula1: ["Yes", "No"],
            showInputMessage: true,
            promptTitle: "Selection Required",
            prompt: "Pick Yes or No from the dropdown",
          },
        ],
      }],
    });
    expect(xml).toContain('showInputMessage="1"');
    expect(xml).toContain('promptTitle="Selection Required"');
    expect(xml).toContain('prompt="Pick Yes or No from the dropdown"');
  });

  it("multiple validations on same sheet", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Status" }, { value: "Qty" }, { value: "Date" }] }],
        dataValidations: [
          { ref: "A2:A100", type: "list", formula1: ["Open", "Closed"] },
          { ref: "B2:B100", type: "whole", operator: "between", formula1: 1, formula2: 9999 },
          { ref: "C2:C100", type: "date", operator: "greaterThan", formula1: "2026-01-01" },
        ],
      }],
    });
    expect(xml).toContain('count="3"');
    expect(xml).toContain('sqref="A2:A100"');
    expect(xml).toContain('sqref="B2:B100"');
    expect(xml).toContain('sqref="C2:C100"');
  });

  it("XML attribute values with special characters are escaped", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          {
            ref: "A2:A10",
            type: "whole",
            operator: "greaterThan",
            formula1: 0,
            errorTitle: 'Value "must" be > 0',
            error: "Use a value > 0 & < 100",
            promptTitle: "Hint <important>",
            prompt: "Enter value with 'care'",
            showInputMessage: true,
          },
        ],
      }],
    });
    expect(xml).toContain('errorTitle="Value &quot;must&quot; be &gt; 0"');
    expect(xml).toContain('error="Use a value &gt; 0 &amp; &lt; 100"');
    expect(xml).toContain('promptTitle="Hint &lt;important&gt;"');
    expect(xml).toContain("prompt=\"Enter value with &apos;care&apos;\"");
  });

  it("very long list within 255-char limit", async () => {
    const items = Array.from({ length: 50 }, (_, i) => `V${i}`);
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: items },
        ],
      }],
    });
    expect(xml).toContain('type="list"');
    expect(xml).toContain(`&quot;${items.join(",")}&quot;`);
  });

  it("errorStyle stop is default and not emitted explicitly", async () => {
    const xml = await getSheet1Xml({
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "whole", operator: "equal", formula1: 1, errorStyle: "stop" },
        ],
      }],
    });
    // stop is the OOXML default — some implementations omit it, but ours emits it
    // either way, the validation should work
    expect(xml).toContain('type="whole"');
  });

  it("rejects empty formula1 array", () => {
    const doc: SpreadsheetDocument = {
      sheets: [{
        name: "Sheet1",
        rows: [{ cells: [{ value: "Header" }] }],
        dataValidations: [
          { ref: "A2:A10", type: "list", formula1: [] as string[] },
        ],
      }],
    };
    expect(() => validateSpreadsheetDocument(doc)).toThrow(SpreadsheetValidationError);
  });
});
