import { PdfEngine } from "../src/engine.js";
import { createLinearGradientDocument, createRadialGradientDocument } from "../scripts/phase4-fixtures.js";

describe("Phase 4 gradient resources", () => {
  it("writes axial shading dictionaries for linear gradients", async () => {
    const pdf = await PdfEngine.render(createLinearGradientDocument());
    const content = pdf.toString("binary");

    expect(content).toContain("/ShadingType 2");
    expect(content).toContain("/ColorSpace /DeviceRGB");
    expect(content).toContain("/Extend [true true]");
  });

  it("writes radial shading dictionaries for radial gradients", async () => {
    const pdf = await PdfEngine.render(createRadialGradientDocument());
    const content = pdf.toString("binary");

    expect(content).toContain("/ShadingType 3");
    expect(content).toContain("/ColorSpace /DeviceRGB");
    expect(content).toContain("/Extend [true true]");
  });
});
