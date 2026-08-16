import { PdfEngine } from "../src/engine.js";
import { ensurePhase2FontFixtures } from "../scripts/phase2-font-fixtures.js";
import { createPhase10SignOptions, ensurePhase10CertificateFixtures } from "../scripts/phase10-fixtures.js";
import {
  createCheckboxDocument,
  createDropdownDocument,
  createRadioDocument,
  createTextFieldDocument,
} from "../scripts/phase6-fixtures.js";
import type { PdfDocumentPhase8 } from "../src/engine.js";

describe("Phase 6 forms", () => {
  it("emits an AcroForm text field with flags and metadata", async () => {
    const buffer = await PdfEngine.render(createTextFieldDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/AcroForm");
    expect(text).toContain("/FT /Tx");
    expect(text).toContain("/T (full_name)");
    expect(text).toContain("/MaxLen 64");
    expect(text).toContain("/Ff 4099");
    expect(text).toContain("/TU (Enter the attendee's legal name)");
    expect(text).toContain("/V (Ada Lovelace)");
  });

  it("emits checkbox widgets with on and off appearance states", async () => {
    const buffer = await PdfEngine.render(createCheckboxDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/FT /Btn");
    expect(text).toContain("/AS /Off");
    expect(text).toContain("/Ff 3");
    expect(text).toContain("/TU (Required before submission)");
  });

  it("emits dropdown widgets with option arrays and flags", async () => {
    const buffer = await PdfEngine.render(createDropdownDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/FT /Ch");
    expect(text).toContain("/Opt [(Design) (Engineering) (Operations)]");
    expect(text).toContain("/V (Engineering)");
    expect(text).toContain("/Ff 131075");
    expect(text).toContain("/TU (Choose the delivery team)");
  });

  it("emits radio groups with one selected export value", async () => {
    const buffer = await PdfEngine.render(createRadioDocument());
    const text = buffer.toString("latin1");
    const parentMatch = text.match(/(\d+)\s+0\s+obj\s*<<[\s\S]*?\/FT \/Btn[\s\S]*?\/Kids \[([^\]]+)\][\s\S]*?\/T \(delivery\)[\s\S]*?\/V \/Annual[\s\S]*?>>/);

    expect(parentMatch).toBeTruthy();
    const parentObjectNumber = parentMatch?.[1] ?? "";
    const kidRefs = parentMatch?.[2]?.match(/\d+ 0 R/g) ?? [];

    expect(kidRefs).toHaveLength(2);
    expect(text).toContain("/Ff 32771");
    expect(text).toContain("/AS /Annual");
    expect(text).toContain("/AS /Off");
    expect(text).toContain("/TU (Billed once per year)");
    expect(text).not.toContain("/V /Monthly");
    expect((text.match(/\/Subtype \/Widget/g) ?? [])).toHaveLength(2);
    expect(text).toMatch(/\/Parent \d+ 0 R/);
  });

  it("renders radio groups in PDF/A mode when a fallback font is supplied", async () => {
    const fonts = await ensurePhase2FontFixtures();
    const document: PdfDocumentPhase8 = {
      children: [
        {
          group: "billing",
          name: "billing-monthly",
          type: "form-radio",
          value: "Monthly",
        },
        {
          checked: true,
          group: "billing",
          name: "billing-annual",
          type: "form-radio",
          value: "Annual",
        },
      ],
      meta: {
        title: "Radio PDF/A",
      },
      pdfa: {
        conformance: "2b",
        enabled: true,
        fallbackFont: {
          family: "Lato",
          source: fonts.lato,
        },
      },
    };

    const buffer = await PdfEngine.render(document);
    const text = buffer.toString("latin1");
    expect(buffer.subarray(0, 10).toString("ascii")).toMatch(/^%PDF-1\.7/);
    expect(text).toContain("/T (billing)");
    expect(text).toContain("/V /Annual");
  });

  it("emits calculation JavaScript actions for calculated fields", async () => {
    const buffer = await PdfEngine.render({
      children: [
        {
          calculate: "event.value = '42';",
          name: "answer",
          type: "form-text",
          value: "42",
        },
      ],
    });
    const text = buffer.toString("latin1");

    expect(text).toContain("/S /JavaScript");
    expect(text).toContain("/JS (event.value = '42';)");
    expect(text).toContain("/AA <<");
  });

  it("uses annotation tab order when explicit tabOrder metadata is supplied", async () => {
    const buffer = await PdfEngine.render({
      children: [
        {
          name: "first",
          tabOrder: 2,
          type: "form-text",
          value: "First",
        },
        {
          name: "second",
          tabOrder: 1,
          type: "form-text",
          value: "Second",
        },
      ],
    });
    const text = buffer.toString("latin1");

    expect(text).toContain("/Tabs /A");
  });

  it("defaults form pages to structural tab order when explicit ordering is absent", async () => {
    const buffer = await PdfEngine.render({
      children: [
        {
          name: "alpha",
          type: "form-text",
          value: "Alpha",
        },
        {
          name: "beta",
          type: "form-text",
          value: "Beta",
        },
      ],
    });
    const text = buffer.toString("latin1");

    expect(text).toContain("/Tabs /S");
  });

  it("renders visual signature nodes as static placeholders rather than interactive signature fields", async () => {
    const buffer = await PdfEngine.render({
      children: [
        {
          fieldName: "VisualOnly",
          label: "Signature",
          mode: "visual",
          type: "form-signature",
          width: 180,
        },
      ],
    });
    const text = buffer.toString("latin1");

    expect(text).not.toContain("/FT /Sig");
    expect(text).not.toContain("/AcroForm");
  });

  it("binds signed output to authored digital signature fields and keeps the widget visible", async () => {
    const fixtures = await ensurePhase10CertificateFixtures();
    const buffer = await PdfEngine.sign({
      children: [
        {
          fieldName: "ApprovalSignature",
          height: 28,
          label: "Approval Signature",
          type: "form-signature",
          width: 180,
        },
      ],
    }, {
      ...createPhase10SignOptions(fixtures),
      fieldName: "ApprovalSignature",
      timestamp: false,
    });
    const text = buffer.toString("latin1");

    expect(text).toContain("/T (ApprovalSignature)");
    expect(text).toMatch(/\/FT \/Sig[\s\S]*?\/Rect \[72 692 252 720\]/);
    expect(text).not.toContain("/Rect [0 0 0 0]");
  });

  it("flattens form widgets into static page content and omits AcroForm output", async () => {
    const buffer = await PdfEngine.render({
      children: [
        {
          name: "flattened-name",
          type: "form-text",
          value: "Flat",
          width: 180,
        },
        {
          checked: true,
          name: "flattened-check",
          type: "form-checkbox",
        },
      ],
    }, { flattenForms: true });
    const text = buffer.toString("latin1");

    expect(text).not.toContain("/AcroForm");
    expect(text).not.toContain("/Subtype /Widget");
  });

  it("rejects flattening when signing is requested", async () => {
    await expect(PdfEngine.render({
      children: [
        {
          fieldName: "ApprovalSignature",
          type: "form-signature",
        },
      ],
    }, {
      flattenForms: true,
      signature: {
        certificate: {
          cert: Buffer.from("cert"),
          format: "pem",
          key: Buffer.from("key"),
        },
      },
    })).rejects.toThrow(/flattenForms/i);
  });
});
