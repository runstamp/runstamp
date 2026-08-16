import { PdfEngine } from "../src/engine.js";
import { extractPdfSignatures } from "../src/phase10-validate.js";
import {
  createPhase10SignOptions,
  createPhase10SigningDocument,
  createPhase10TimestampedSignOptions,
  ensurePhase10CertificateFixtures,
  verifyDetachedCms,
  verifyTimestampToken,
} from "../scripts/phase10-fixtures.js";

describe("Phase 10 signatures", () => {
  it("renders a valid PKCS#7 signed PDF", async () => {
    const fixtures = await ensurePhase10CertificateFixtures();
    const buffer = await PdfEngine.sign(createPhase10SigningDocument(), createPhase10SignOptions(fixtures));
    const signatures = extractPdfSignatures(buffer);

    expect(signatures.some((entry) => entry.kind === "signature")).toBe(true);
    expect(buffer.toString("latin1")).toContain("/SubFilter /adbe.pkcs7.detached");
    expect(verifyDetachedCms(buffer)).toBe(true);
  });

  it("renders a PDF document timestamp token that verifies", async () => {
    const fixtures = await ensurePhase10CertificateFixtures();
    const buffer = await PdfEngine.sign(createPhase10SigningDocument(), createPhase10TimestampedSignOptions(fixtures));
    const signatures = extractPdfSignatures(buffer);

    expect(signatures.some((entry) => entry.kind === "timestamp")).toBe(true);
    expect(buffer.toString("latin1")).toContain("/SubFilter /ETSI.RFC3161");
    expect(verifyTimestampToken(buffer, fixtures)).toBe(true);
  });
});
