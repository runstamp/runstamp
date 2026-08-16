# @runstamp/contract

The **Runstamp Operation Contract (OC-1)** — one shape for every document operation.

Specification: [`docs/architecture/operation-contract.md`](../../docs/architecture/operation-contract.md).

Every Runstamp capability, in every package, on every surface (SDK, hosted API, MCP agent tools,
embedded UI), returns the same envelope, raises the same error type, records losses the same way, and
addresses positions with the same locator. You calibrate once.

This package is **zero-dependency** and never imports another `@runstamp/*` package.

## The envelope

```ts
import { isOk, unwrap } from "@runstamp/contract";
import * as docx from "@runstamp/docx/ops";

const result = await docx.render(document, { deterministic: true });

if (isOk(result)) {
  result.value;        // ArtifactBytes — bytes + mediaType + byteLength + hash
  result.losses;       // [] means the output is fully faithful. Never undefined.
  result.diagnostics;  // non-fatal observations
  result.receipt;      // proof of what was produced, from what, reproducibly
} else {
  result.error.code;        // "docx/IMAGE_TIMEOUT" — stable, namespaced, greppable
  result.error.remediation; // one imperative sentence naming the fix
  result.error.retryable;   // transient vs. deterministic failure
}
```

**Operations never throw for a document condition.** Invalid input, an unsupported feature, a
conformance violation or a resource limit all arrive as `{ ok: false }`. Throwing is reserved for
programmer error and host failure — so an agent can call any operation without a try/catch, and branch
on `code` rather than parsing prose. Prefer exceptions at your own boundary? `unwrap(result)`.

## Losses: nothing fails silently

A `Loss` records something the operation could not faithfully preserve. The governing rule is **no
silent loss**: any transformation that departs from its source must say so.

```ts
{
  code: "pdf/VECTOR_RASTERIZED",
  severity: "degraded",          // "substituted" | "degraded" | "dropped"
  subject: "vector artwork on page 3",
  message: "Vector artwork was rasterized at 300dpi.",
  locator: { /* exactly where */ },
  avoidable: true,
  remediation: "Set rasterizeVectors to false."
}
```

An empty `losses` array is therefore a positive, testable claim of full fidelity — not an absence of
information. Set `lossPolicy: "failOnDropped"` to demand it.

## Locators

A universal address into an artifact, bound to its bytes, with a bijective string form:

```
sha256:ab12…/pptx:slide[2]/shape[0]/run[3]
sha256:cd34…/xlsx:sheet[id=Sheet1]/cell[id=R4C7]
sha256:ef56…/pdf:page[11]/paragraph[4]#120-168
```

`parseLocator(formatLocator(l))` round-trips exactly, and the same position in the same bytes always
produces the same string. This is the substrate for citation resolution, redaction plans, privilege
logs and provenance.

## Receipts

```ts
result.receipt.deterministic;           // a falsifiable claim, gated by a two-process byte-identity test
result.receipt.inputHash;               // sha256:…
result.receipt.optionsHash;             // canonical-JSON hash of the *effective* options
result.receipt.outputHash;              // sha256:…
result.receipt.nondeterminismSources;   // non-empty whenever deterministic is false
```

`producedAt` is omitted entirely under determinism — a timestamp would break byte-identity.

## Stability

- **Error codes are semver-major.** Never removed or repurposed within a major; new codes are minor.
- **Messages are not contractual.** Branch on `code`.
- **Locator strings are stable** for the lifetime of a major.
- **Determinism is a guarantee**, not best-effort. A regression is a P0.
- `CONTRACT_VERSION` appears in every receipt so you can pin behavior across package upgrades.

## License

Apache-2.0
