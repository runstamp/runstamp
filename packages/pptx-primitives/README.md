# @runstamp/pptx-primitives

> **FROZEN (2026-07-13).** Ship-or-freeze decision: frozen. This is a speculative
> composition-primitive layer (33 primitives, token system, layout engine, AST
> converter) built in a 4-day burst in April 2026; its only consumer is protocol's
> composition module, which itself has no production consumer. It is experimental,
> not part of the supported contract, and carries no compatibility promises. No new
> primitives or investment until a shipping surface consumes it (see
> PLAN_pptx-primitives.md). Freezing is not deleting: the code typechecks and is
> coherent — it stays as-is. Still to land with the protocol restructuring: remove
> from protocol's typecheck/build hot path and drop the `presets`/`minRegionFor`
> re-exports from core's public barrel at the next minor.
