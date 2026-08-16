# Runstamp stability policy

This is a customer-facing commitment, not an internal note. It is the direct
answer to "open-source packages are unstable."

**Published at `/docs/references/stability`.** This file is the source; the
page is what a customer reads. Keep them in step — the commitment is only worth
anything where a prospect can see it.

It applies to every package that ships an `./ops` surface, and to
`@runstamp/contract` itself. The [conformance matrix](conformance-matrix.md) is
the evidence: it is generated from real gate runs against built artifacts, and
its known gaps are listed rather than hidden. It is published at
`/docs/references/conformance`.

## 1. Error codes are semver-major

A code is never removed or repurposed within a major version. Adding one is a
minor. Branch on `code`, never on message text.

## 2. Messages are not contractual

Any message may be reworded in any release. If your code parses a message
string, it will break, and that break is not a regression on our side.

## 3. Locator strings are stable

A locator addressing the same logical position in the same bytes produces the
same string, across processes and platforms, for the lifetime of a major
version. Locators carry the artifact hash, so a locator from one version of a
document never silently resolves against another.

## 4. Determinism is a guarantee, not best-effort

Same input, same options, same version ⇒ byte-identical output, and a receipt
that says so. A determinism regression is a P0.

`deterministic: true` in a receipt is a falsifiable claim: gate C7 re-runs the
operation in a clean process and compares the output hash, and C8 fails the
build if a receipt asserts determinism that C7 disproves. This is not decorative
— the docx→PDF path shipped claiming determinism while stamping a wall-clock
timestamp into every file, and C8 is what caught it.

## 5. Deprecation window

A minimum of two minor versions carrying a runtime notice before anything is
removed. Breaking changes land only at a major, with a migration guide.

Exports currently inside that window are visible as `warn` on gate C13 in the
conformance matrix.

## 6. The contract version is independent

`CONTRACT_VERSION` appears in every receipt and moves independently of package
versions, so you can pin behavior across package upgrades and detect a contract
change without diffing release notes.

## 7. The conformance matrix is public and continuously updated

Per package, per gate, with known losses and known gaps listed. A gate that
passes vacuously is reported as a warning rather than a pass — a formality that
always succeeds is worse than no gate, because it converts an unknown into a
false assurance.

This sentence was false from the day it was written until 2026-08-13: the matrix
existed only as `ga/conformance.json` and `docs/conformance-matrix.md`, neither
of which is served. It is now generated to `/docs/references/conformance` by
`scripts/generate-conformance-page.mts`.

## 8. Promotion from experimental to stable

The criteria are stated in full on the published page. In short: two minor
releases with an unchanged contract, every applicable gate passing (not skipped,
not warned), complete code and loss declarations under C5 and C11, fixture
coverage including a hostile and a boundary case under C18, and — for any
operation producing an Office or PDF artifact — that artifact opened in the real
target application rather than only validated structurally.

Demotion back to `experimental` is possible only at a major version, because the
promise attached to `stable` is what a caller relied on.

### One-time initial-GA certification

The first frozen `1.0.0` catalog may substitute committed initial-GA evidence
for the two-shipped-minor history requirement. This exception applies once, to
exactly the operations frozen into that first catalog, and cannot be reused for
an operation added or promoted later.

Initial-GA evidence must bind each operation's descriptor, schemas, executable
implementation and loss declarations to deterministic hashes; show every
applicable conformance gate passing without warnings or skips; include nominal,
hostile and boundary fixtures for the exact operation identity; complete three
120-document judge runs with every run and every format aggregate at or above
**3.6/5**; bind one explicit approval by the release owner over the hash-bound
12-module HTML review bundle covering all 79 operations and all 120 rendered
documents; and bind current real-application results for any Office or PDF
artifacts. The owner review is a veto, not a score override: a release-blocking
defect keeps GA held even when the automated mean passes. A committed verifier
rejects missing operations, `experimental` labels, stale hashes, incomplete
fixtures, warned or skipped gates, stale application evidence, a stale review
bundle, or missing/non-owner human approval. After `1.0.0`, the ordinary two
shipped minor releases rule applies without exception.

---

## What is not gated by payment

Every rendering capability ships in the open-source packages: font embedding,
complex-script shaping, validation, repair, accessibility auditing, template
assembly, formula evaluation, PDF/A, tagging and digital signatures.

Correctness is not a paid feature. Until 2026-08-12 some of it was, and the
consequence was concrete: the published PDF package could not embed a fallback
font, so every character outside Latin-1 became `?` — and the validation and
repair APIs a caller would have needed to *detect* that damage were themselves
behind the same paywall. A conformance matrix would have needed a tier axis,
which would have meant the contract guaranteed nothing on its own.

Paid tiers buy hosted operation, agent actions, and governance — audit trails,
data residency, provenance receipts, SSO and SLAs — never fidelity.
