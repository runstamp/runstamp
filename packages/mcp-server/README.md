# @runstamp/mcp-server

A thin MCP adapter for the stable Runstamp operation catalog. It exposes only
three progressively disclosed tools:

- `runstamp_list_operations`
- `runstamp_describe_operation`
- `runstamp_invoke_operation`

```bash
npx -y @runstamp/mcp-server
```

Execution defaults to `auto`. Install any of the optional `@runstamp/pptx`,
`@runstamp/docx`, `@runstamp/pdf`, or `@runstamp/xlsx` peers to run their public
operations locally. Managed operations and missing local peers fall back to the
hosted API when both variables are present:

```bash
RUNSTAMP_API_BASE_URL=https://your-approved-preview.example \
RUNSTAMP_API_KEY=your-key \
npx -y @runstamp/mcp-server
```

`RUNSTAMP_EXECUTION_MODE` may be `auto`, `local`, or `hosted`. This preview-only
release deliberately has no production URL default. Configuration failures are
returned as typed `common/CONFIGURATION_REQUIRED` results.

Requires Node.js 18 or newer.
