import { describe, expect, it } from "vitest";
import {
  buildReportDocx,
  buildInvoiceDocx,
  buildContractDocx,
} from "../src/builders/index.js";
import { DOCXErrorCode } from "../src/errors.js";
import { renderToDocx } from "../src/render.js";

describe("WP3.5 — high-level builders", () => {
  it("buildReportDocx produces a renderable DocxDocument", async () => {
    const doc = buildReportDocx({
      title: "Test Report",
      subtitle: "A subtitle",
      author: "QA",
      date: "2026-04-28",
      sections: [
        { heading: "Intro", content: "Para 1.\n\nPara 2." },
        { heading: "Details", level: 2, content: "Detail body.", bullets: ["a", "b"] },
      ],
    });

    expect(doc.type).toBe("DocxDocument");
    expect(doc.theme).toEqual({ preset: "corporate" });
    expect(doc.tableOfContents).toBeTruthy();
    expect(doc.pages).toHaveLength(1);

    const result = await renderToDocx(doc as never);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("buildInvoiceDocx produces a renderable DocxDocument", async () => {
    const doc = buildInvoiceDocx({
      invoiceNumber: "INV-001",
      date: "2026-04-28",
      dueDate: "2026-05-28",
      sender: { name: "Sender Co", address: "123 St" },
      recipient: { name: "Recipient Co", address: "456 Ave" },
      items: [
        { description: "Service", quantity: 1, unitPrice: 100, amount: 100 },
        { description: "Misc", quantity: 2, unitPrice: 25, amount: 50 },
      ],
      subtotal: 150,
      taxRate: 0.1,
      taxAmount: 15,
      total: 165,
    });

    expect(doc.type).toBe("DocxDocument");
    expect(doc.metadata?.title).toBe("Invoice INV-001");

    const result = await renderToDocx(doc as never);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("buildContractDocx produces a renderable DocxDocument", async () => {
    const doc = buildContractDocx({
      title: "TEST AGREEMENT",
      effectiveDate: "April 28, 2026",
      parties: [
        { name: "Alpha Co", address: "1 Alpha St", role: "Provider" },
        { name: "Bravo Co", address: "2 Bravo St", role: "Client" },
      ],
      recitals: ["Provider provides services;", "Client wishes to engage Provider."],
      clauses: [
        { number: "1", title: "Engagement", content: "The Provider will provide services." },
        {
          number: "2",
          title: "Restrictions",
          content: "Client shall not:",
          subclauses: [
            { label: "a", content: "resell the services;" },
            { label: "b", content: "share credentials." },
          ],
        },
      ],
      signatures: [
        { name: "Alpha CEO", title: "CEO", party: "Alpha Co" },
        { name: "Bravo CEO", title: "CEO", party: "Bravo Co" },
      ],
    });

    expect(doc.type).toBe("DocxDocument");
    expect(doc.theme).toEqual({ preset: "classic" });

    const result = await renderToDocx(doc as never);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("buildContractDocx requires at least 2 parties", () => {
    let thrown: unknown;
    try {
      buildContractDocx({
        title: "X",
        effectiveDate: "today",
        parties: [{ name: "Solo", address: "addr", role: "Self" }],
        clauses: [{ number: "1", title: "t", content: "c" }],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      name: "DOCXError",
      code: DOCXErrorCode.DOC_INVALID,
      message: expect.stringContaining("at least 2 parties"),
    });
  });
});
