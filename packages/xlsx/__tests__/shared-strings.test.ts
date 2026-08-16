import { describe, expect, it } from "vitest";
import { SharedStringTable } from "../src/index.js";

describe("SharedStringTable", () => {
  it("deduplicates strings while tracking total reference count", () => {
    const table = new SharedStringTable();

    expect(table.register("Revenue")).toBe(0);
    expect(table.register("Revenue")).toBe(0);
    expect(table.register("Growth")).toBe(1);
    expect(table.count).toBe(3);
    expect(table.uniqueCount).toBe(2);
  });

  it("preserves whitespace and strips forbidden control characters", () => {
    const table = new SharedStringTable();
    table.register("  padded  ");
    table.register("\u0001bad\u0008text\u000B");

    const xml = table.toXml();
    expect(xml).toContain('<t xml:space="preserve">  padded  </t>');
    expect(xml).toContain("<t>badtext</t>");
    expect(xml).not.toContain("\u0001");
    expect(xml).not.toContain("\u0008");
    expect(xml).not.toContain("\u000B");
  });

  it("escapes XML-hostile characters", () => {
    const table = new SharedStringTable();
    table.register("<tag>&\"'");

    const xml = table.toXml();
    expect(xml).toContain("&lt;tag&gt;&amp;&quot;&apos;");
  });

});
