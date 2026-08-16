# Runstamp

Public source and exact release artifacts for Runstamp's document operation
contract, PPTX, DOCX, PDF and XLSX engines, catalog, CLI, MCP adapter, and React
result surface.

## Verify

```bash
corepack enable
pnpm install
pnpm check
```

The acceptance gate runs every exported package's build, typecheck, lint, and
test scripts. It also checks every exported byte against
`PUBLIC_SOURCE_MANIFEST.json`, rejects private workspace dependencies, loads the
public catalog, and smoke-imports every package artifact.

## Source boundary

This repository intentionally excludes the hosted application, private
implementation registry, operation bridge, extension kit, licensing/control
plane, factory state, credentials, and customer data. Package `src/` trees are
published for inspection alongside the exact `dist` artifacts consumers install.

The five small OSS-safe build-support packages are included as private workspace
packages. The public engines bundle them, so published package manifests expose
only public runtime dependencies. The complete exported workspace builds,
typechecks, lints, tests, and verifies its generated artifacts without the
private registry, operation bridge, extension kit, licensing/control plane,
application, or customer state.
