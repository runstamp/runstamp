# PDF evidence processing

The A03 API is a deliberately bounded evidence and sanitized-derivative surface. It is not a general
purpose arbitrary-PDF editor and it never executes document actions.

```ts
import {
  extractPdfEvidence,
  findPdfEvidence,
  previewPdfRedactions,
  redactPdfEvidence,
  verifyPdfRedaction,
} from "@runstamp/pdf";

const extraction = await extractPdfEvidence(sourcePdf, {
  maxInputBytes: 32 * 1024 * 1024,
  maxObjects: 5_000,
  maxPages: 2_000,
  signal: abortController.signal,
});

const matches = findPdfEvidence(extraction, "998-12-3456");
const preview = previewPdfRedactions(matches); // page rectangles; source bytes unchanged
const sanitized = await redactPdfEvidence(sourcePdf, matches);
const proof = await verifyPdfRedaction(sanitized.buffer, ["998-12-3456"]);

if (proof.status !== "PASS") throw new Error("residual content remains");
console.log(preview.rectangles, sanitized.sha256, sanitized.losses);
```

## Stable locators

Text locators use the `pdf.text` scheme and contain:

```text
[pageIndex, xMillionths, yMillionths, widthMillionths, heightMillionths, readingOrder]
```

The locator also binds to the exact source artifact SHA-256. A locator from another revision is rejected.
Geometry is canonical and stable for the same input; v1 does not claim exact source font metrics.

## OCR routing

`routePdfOcr` classifies each page as `native`, `mixed`, or `scanned`. The package performs no network
call and bundles no OCR model. Supply a `PdfOcrAdapter` to recognize routed pages. The adapter receives
the exact source bytes, page locator, and abort signal, and must return text rectangles and confidence.
Without an adapter, incomplete coverage is retained as `PDF_OCR_REQUIRED` rather than silently ignored.

## Redaction semantics and losses

`redactPdfEvidence` rebuilds supported extracted text through the existing deterministic PDF engine and
omits only explicitly selected ranges. It then runs parser and residual byte/text checks. This prevents
the known-bad “black rectangle over live text” pattern.

The sanitized v1 derivative does not preserve arbitrary graphics. It also strips source metadata,
annotations, attachments, form interactivity, and signatures when present. Every applicable limitation
is emitted as a stable `PDF_*` loss. Use the original artifact hash plus the returned sanitized hash for
chain-of-custody records.

## Safety and resource behavior

- Encrypted/protected input is rejected; no password or decrypt path exists.
- `/JavaScript` and `/JS` active content is rejected and never evaluated.
- PDF header, EOF, xref/trailer, object graph, stream, page, input, and extracted-run budgets fail closed.
- Unsupported content filters produce a typed undecodable-text loss; redaction does not copy the stream.
- Search regular expressions reject backreferences, lookbehind, nested quantifiers, and excessive size.
- Cancellation is checked before parsing, per page, per stream, and around OCR calls.

## Reference validation

For a generated sanitized artifact, use locally installed validators rather than inferring compatibility:

```bash
qpdf --check sanitized.pdf
pdfinfo sanitized.pdf
pdftotext sanitized.pdf -
pdftoppm -png -singlefile -f 1 -l 1 sanitized.pdf page
```

`qpdf` establishes syntax/xref integrity. Poppler independently parses metadata, extracts text for the
residual scan, and rasterizes a page. An installed viewer without an automated open/repair result is
advisory only.
