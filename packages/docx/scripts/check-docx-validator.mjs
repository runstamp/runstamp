#!/usr/bin/env node

import { access, constants, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { validateFile } from "@xarsh/ooxml-validator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(__dirname, "..");

function fail(message, details = "") {
  console.error(`[check-docx-validator] FAIL: ${message}`);
  if (details) {
    console.error(details);
  }
  console.error(
    "Remediation: run `pnpm --filter @runstamp/docx install` or `pnpm install` with postinstall scripts enabled so @xarsh/ooxml-validator can install its platform binary. If CI blocks scripts, cache or vendor the validator binary and set OOXML_VALIDATOR_CLI.",
  );
  process.exit(1);
}

async function assertExecutable(path) {
  try {
    await access(path, constants.X_OK);
  } catch {
    fail(`OOXML validator CLI is not executable at ${path}`);
  }
}

async function createMinimalDocx(path) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const stableDate = new Date("2000-01-01T00:00:00.000Z");
  const file = (name, content) => zip.file(name, content, { date: stableDate });

  file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>validator bootstrap</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );

  await writeFile(path, await zip.generateAsync({ type: "nodebuffer", compression: "STORE" }));
}

const wrapperPath = resolve(packageDir, "node_modules/.bin/ooxml-validator");
await assertExecutable(wrapperPath);

const usageProbe = spawnSync(wrapperPath, [], {
  cwd: packageDir,
  encoding: "utf8",
});
if (usageProbe.status !== 2 || !usageProbe.stderr.includes("Usage: ooxml-validator")) {
  fail(
    "OOXML validator wrapper did not respond with its usage contract.",
    `status=${usageProbe.status}\nstdout=${usageProbe.stdout}\nstderr=${usageProbe.stderr}`,
  );
}

const tmpRoot = await mkdtemp(join(tmpdir(), "runstamp-docx-validator-"));
try {
  const fixturePath = join(tmpRoot, "bootstrap.docx");
  await createMinimalDocx(fixturePath);
  const result = await validateFile(fixturePath, { officeVersion: "Microsoft365" });
  if (!result.ok) {
    fail(
      "OOXML validator binary ran but rejected the bootstrap DOCX fixture.",
      JSON.stringify(result.errors ?? result, null, 2),
    );
  }
  console.log("[check-docx-validator] OK: @xarsh/ooxml-validator wrapper and embedded binary are available.");
} catch (error) {
  fail(
    "OOXML validator binary is missing or cannot execute.",
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
} finally {
  await rm(tmpRoot, { recursive: true, force: true });
}
