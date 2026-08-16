import { PdfEngine } from "../src/engine.js";
import { createMetadataDocument } from "../scripts/phase6-fixtures.js";

describe("Phase 6 metadata", () => {
  it("keeps info dictionary and XMP metadata in sync", async () => {
    const buffer = await PdfEngine.render(createMetadataDocument());
    const text = buffer.toString("latin1");
    expect(text).toContain("/Title (Phase 6 Metadata)");
    expect(text).toContain("/Author (Runstamp)");
    expect(text).toContain("/Subject (Metadata verification)");
    expect(text).toContain("/Metadata");
    expect(text).toContain("<dc:title>");
    expect(text).toContain("<xmp:CreateDate>2026-03-29T09:15:00.000Z</xmp:CreateDate>");
    expect(text).toContain("<xmp:ModifyDate>2026-03-29T11:30:00.000Z</xmp:ModifyDate>");
  });
});
