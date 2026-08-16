# Acrobat Manual-Check Checklist

`qpdf --check` and `verapdf` are necessary but not sufficient for any PR
that touches widgets, accessibility tagging, PDF/A, signatures, or
encryption. Adobe Acrobat is the only mainstream consumer that
exercises the full reader stack — its tagged-tree viewer, form-fill
dialogs, and Preflight panel catch issues nothing else does.

This checklist applies whenever a PR touches files in any of:

- `src/phases/phase6-*.ts` or `src/pdf-form-fill.ts` (widgets / forms)
- `src/phases/phase7-*.ts` or any tagging / `/StructTreeRoot` code
- `src/phases/phase8-*.ts` or `src/pdfa/*` (PDF/A conformance)
- `src/encryption/*` or signature / `phase10-*` code
- `src/pdf-writer.ts` xref-stream / ObjStm branches
- Anything in `src/pdf-renderer.ts` that emits `/Annot`, `/AcroForm`,
  `/StructParent`, `/MarkInfo`, or `/Encrypt`

If you only touched layout / table / Phase 2 text code, you can skip
this — the `qpdf --qdf` round-trip in `__tests__/render-oracle.test.ts`
is sufficient coverage.

---

## How to run

1. Build a Pro release for the affected fixture: `pnpm exec vitest run __tests__/<test>` will write the PDF to `output/` (or use `examples/` to render manually).
2. Open the PDF in Adobe Acrobat (Pro or Reader DC, version 2024 or
   newer). Acrobat behaves differently on macOS vs Windows for some
   tagged-tree features — both are nice-to-have, but macOS Acrobat is
   the minimum bar.
3. Walk through the relevant section below.
4. Note any warnings or errors in the PR description. A warning is
   not necessarily a blocker, but it must be acknowledged with a
   one-line justification.

---

## A. Forms / widgets (Phase 6)

After `pnpm exec vitest run __tests__/phase6-*.test.ts` and any custom
fixture you authored:

- [ ] Open the PDF. Acrobat shows the "This document contains form
      fields" prompt — accept it.
- [ ] Each text field accepts keyboard input. Tab order matches the
      visual reading order.
- [ ] Each checkbox toggles between checked / unchecked on click.
      Verify both states render correctly (the appearance stream for
      the off state is the silently-missing one in most engines).
- [ ] Each radio group: clicking one option deselects the others in
      the same group. Different groups stay independent.
- [ ] Each dropdown opens, lists the expected options, and stores the
      selection on tab-out.
- [ ] If the doc has a JavaScript action: trigger it (open / focus /
      blur as appropriate) and verify Acrobat doesn't show a
      "JavaScript window" warning when JavaScript is allowed in
      preferences.
- [ ] **File → Save As → Save**. Reopen the saved file. All field
      values persist. (This catches `/V` vs `/DV` mistakes that don't
      show in qpdf.)
- [ ] **Tools → Prepare Form**. Acrobat enumerates each field. The
      list matches what the source document declared. No "fix
      automatically" prompts.

## B. Tagged accessibility (Phase 7)

After `pnpm exec vitest run __tests__/phase7-*.test.ts`:

- [ ] **View → Show/Hide → Navigation Panes → Tags**. The tag tree
      opens. The root is `<Document>`.
- [ ] The tree structure matches the source: headings nest correctly,
      list items are inside `<L>`, table cells are inside
      `<TR>`/`<TD>`/`<TH>`.
- [ ] Click a tag — the corresponding content highlights in the page
      view. (Tests `/StructParents` ↔ `/StructParent` linkage.)
- [ ] Right-click any tag → **Properties**. The "Actual Text" /
      "Alternate Text" fields populate where the source set them.
- [ ] **Tools → Accessibility → Reading Order**. Click "Show Order
      Panel". The order matches the visual flow.
- [ ] **Tools → Accessibility → Accessibility Check** (Acrobat Pro
      only). Run the full check. The only acceptable failures are:
      - "Logical reading order" — needs human judgment.
      - "Color contrast" — needs human judgment.
      Anything else (missing alt text, empty tags, untagged content)
      is a regression.

## C. PDF/A (Phase 8)

After `pnpm exec vitest run __tests__/phase8-*.test.ts`:

- [ ] Acrobat shows the "PDF/A View" blue banner at the top.
- [ ] **Tools → Print Production → Preflight** (Acrobat Pro). Pick
      the "Verify compliance with PDF/A-2b" (or 1b / 3b as
      appropriate) profile. Run. Zero errors. Warnings about
      annotations are acceptable only if the doc has form fields.
- [ ] The XMP packet is intact: **File → Properties → Description**
      shows the title / author / subject as set by the source.
- [ ] No external font references: **File → Properties → Fonts**
      lists every font as `(Embedded Subset)`.
- [ ] Confirm verapdf agrees: `verapdf -f 2b path/to/file.pdf`
      returns a `<validationReport isCompliant="true">`.

## D. Encryption (M6.b interaction)

After `pnpm exec vitest run __tests__/encryption*.test.ts`:

- [ ] Acrobat prompts for the password on open. The user password
      from the source unlocks it.
- [ ] If an owner password was set: opening with it allows printing /
      copying; opening with the user password only respects the
      `/P` permission flags.
- [ ] **File → Properties → Security**. The encryption method
      matches what was requested (`AES-128` shows as "128-bit AES",
      `AES-256` shows as "256-bit AES").
- [ ] AES-256 docs: header reads `%PDF-1.7` (verify in a text editor).
      AES-128 docs: header reads `%PDF-1.6`.

## E. Signatures (Phase 10)

After `pnpm exec vitest run __tests__/phase10-*.test.ts`:

- [ ] **Signature panel** appears in the left sidebar. It lists each
      signature field present.
- [ ] Each visible signature widget renders its appearance (signer
      name + timestamp text) at the declared coordinates.
- [ ] Click each signature → **Validate Signature**. Acrobat reports
      "Signature is VALID" (or "Validity is UNKNOWN" if the cert
      chain isn't trusted, but never "INVALID — document has been
      altered since signing").
- [ ] **File → Save As**. Reopen. Re-validate. Validity status
      survives the round-trip.

## F. Xref streams + ObjStm (M6.b/c)

For any doc rendered with `pdfVersion: "1.5"` or higher:

- [ ] Acrobat opens it without the "this PDF may not display
      correctly" warning.
- [ ] **File → Properties → Description**. PDF Version shows the
      requested version (1.5 / 1.6 / 1.7 / 2.0).
- [ ] Open the file in a text editor. Verify either:
      - `/Type /XRef` appears (xref stream); OR
      - `/Type /ObjStm` appears (ObjStm packing); OR
      - both (the common case for plain rendered docs).
- [ ] Cross-check with `qpdf --check` — must report
      "No syntax or stream encoding errors".

## G. Repair / validate / quality report (Phase 10 read paths)

For any change to `phase10-validate.ts`, `phase10-repair.ts`, or
`phase10-quality.ts`:

- [ ] Hand-corrupt a known-good PDF (truncate the trailer, flip a
      stream byte) and feed it to `validateAndRepairPdfBuffer`. The
      `repaired` output opens in Acrobat without complaint.
- [ ] Use a `verapdf`-flagged file as input. The quality report's
      findings should match (or strictly subset) verapdf's output.

---

## When the checklist fails

1. Capture a screenshot of the Acrobat error / warning, not just a
   text description — Acrobat's exact wording matters for searching.
2. If the failure reproduces with the previous release, it's a
   pre-existing issue: file a bug, don't block the PR.
3. If it's a new regression: do not merge. Reduce the failing case
   to the smallest fixture and add it to `__tests__/` so future PRs
   catch the same class of issue programmatically.

---

## Why we don't automate this

Adobe Acrobat doesn't have a CLI. Foxit / Sumatra / pdf.js have
their own quirks but none of them implement the full tagged-tree
spec, the AcroForm fill experience, or the Preflight engine. The
ecosystem-wide consensus is that "ships in Acrobat" is the only
contract that matters for compliance-grade output, and that contract
is verified by humans. The cost is real — that's why the trigger
list above is narrow.
