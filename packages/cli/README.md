# @runstamp/cli

Render Runstamp JSON specs from the command line.

Create and verify a repository-specific starter:

```bash
npx --yes @runstamp/cli init --format pptx,docx --framework nextjs --package-manager pnpm --tier pro
npx runstamp doctor
npx runstamp verify --private
# Or paste the one-time command issued by the dashboard:
npx runstamp verify --link pjsx_activate_…
```

Private verification renders and checks determinism without sending metadata.
Linked verification sends only format, SDK version, framework, validation
result, deterministic hash, and a random project identifier. It never sends
document content or source paths.

```bash
runstamp pdf --in spec.json --out out.pdf --validate
runstamp docx --in spec.json --out out.docx --validate
runstamp xlsx --in spec.json --out out.xlsx --validate
runstamp pptx --in spec.json --out out.pptx --validate
```

Use `--in -` to read the JSON spec from stdin. Strict mode is enabled by default; pass `--no-strict` only when migrating older permissive inputs.
