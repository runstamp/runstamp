import { createSign, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildCorpusFixture,
  getCorpusArtifactsDir,
  listCorpusEntries,
} from "../../tests/desktopValidation/helpers/corpus.js";
import { validateStructure } from "../../tests/launchMatrix/helpers/structuralValidator.js";
import {
  createNormalizedOracleEvidence,
  inspectPptx,
  sha256Buffer,
  type NormalizedOracleResult,
} from "./evidence.js";

const GOOGLE_PRESENTATION = "application/vnd.google-apps.presentation";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export function createServiceAccountAssertion(
  email: string,
  privateKey: string,
  issuedAt = Math.floor(Date.now() / 1000),
): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: DRIVE_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const normalizedKey = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
  return `${unsigned}.${signer.sign(normalizedKey, "base64url")}`;
}

export async function resolveGoogleAccessToken(options: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  issuedAt?: number;
} = {}): Promise<string> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  if (env.GOOGLE_SLIDES_ACCESS_TOKEN) return env.GOOGLE_SLIDES_ACCESS_TOKEN;
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new Error(
      "Google Slides oracle requires GOOGLE_SLIDES_ACCESS_TOKEN or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY",
    );
  }
  const assertion = createServiceAccountAssertion(email, privateKey, options.issuedAt);
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = await response.json().catch(() => null) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;
  if (!response.ok || !result?.access_token) {
    const reason = result?.error_description ?? result?.error ?? `HTTP ${response.status}`;
    throw new Error(`Google OAuth service-account token exchange failed: ${reason}`);
  }
  return result.access_token;
}

function parseArgs(args: string[]) {
  const fixtureIdx = args.indexOf("--fixture");
  const outIdx = args.indexOf("--out");
  return {
    fixtureId: fixtureIdx >= 0 ? args[fixtureIdx + 1] : "all",
    outDir: outIdx >= 0 ? args[outIdx + 1] : undefined,
  };
}

async function googleRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Google Drive API ${response.status}: ${await response.text()}`);
  }
  return response;
}

async function roundTrip(buffer: Buffer, title: string, token: string) {
  const boundary = `runstamp-${randomUUID()}`;
  const metadata = JSON.stringify({ name: title, mimeType: GOOGLE_PRESENTATION });
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${PPTX_MIME}\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([prefix, buffer, suffix]);
  const upload = await googleRequest(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType",
    token,
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body },
  );
  const file = await upload.json() as { id: string; name: string; mimeType: string };
  try {
    const exported = await googleRequest(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(PPTX_MIME)}`,
      token,
    );
    const bytes = Buffer.from(await exported.arrayBuffer());
    if (bytes.length < 1000) throw new Error(`Google Slides export was unexpectedly small (${bytes.length} bytes)`);
    return { file, bytes };
  } finally {
    await googleRequest(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`,
      token,
      { method: "DELETE" },
    );
  }
}

async function main() {
  const token = await resolveGoogleAccessToken();
  const { fixtureId, outDir } = parseArgs(process.argv.slice(2));
  const artifactRoot = getCorpusArtifactsDir(outDir);
  mkdirSync(artifactRoot, { recursive: true });
  const entries = await listCorpusEntries();
  const selected = fixtureId === "all"
    ? entries.filter((entry) => entry.validationModes.includes("desktop_open"))
    : entries.filter((entry) => entry.id === fixtureId);
  if (selected.length === 0) throw new Error(`No Google Slides corpus fixtures found for ${fixtureId}`);

  const results = [];
  const normalizedResults: NormalizedOracleResult[] = [];
  let failed = false;
  for (const entry of selected) {
    const fixtureDir = join(artifactRoot, entry.id);
    mkdirSync(fixtureDir, { recursive: true });
    const built = await buildCorpusFixture(entry);
    const inputStructural = await validateStructure(built.buffer);
    const inputInventory = await inspectPptx(built.buffer);
    let passed = false;
    let failure: string | null = null;
    const failures: string[] = [];
    let roundTripBytes: Buffer | null = null;
    let roundTripStructuralPassed = false;
    let roundTripSlideCount: number | null = null;
    try {
      const result = await roundTrip(built.buffer, `Runstamp oracle: ${entry.id}`, token);
      writeFileSync(join(fixtureDir, "google-slides-roundtrip.pptx"), result.bytes);
      roundTripBytes = result.bytes;
      const outputStructural = await validateStructure(result.bytes);
      const outputInventory = await inspectPptx(result.bytes);
      roundTripStructuralPassed = outputStructural.passed;
      roundTripSlideCount = outputInventory.slides;
      if (!inputStructural.passed) failures.push("input_structural_invalid");
      if (!outputStructural.passed) failures.push("roundtrip_structural_invalid");
      if (outputInventory.slides !== inputInventory.slides) failures.push("roundtrip_slide_count_mismatch");
      if (outputInventory.charts < inputInventory.charts) failures.push("roundtrip_chart_parts_lost");
      if (outputInventory.media < inputInventory.media) failures.push("roundtrip_media_parts_lost");
      if (inputInventory.charts > 0 && outputInventory.embeddings < inputInventory.charts) {
        failures.push("roundtrip_chart_workbooks_lost");
      }
      if (outputInventory.emptyRelationshipDirectories.length > 0) {
        failures.push("roundtrip_empty_relationship_directory");
      }
      passed = failures.length === 0;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      failures.push("google_import_or_export_failed");
    }
    const expected = entry.acceptance.expectDesktopOpenPass;
    if (passed !== expected) failed = true;
    const record = { fixtureId: entry.id, passed, expected, failures, failure };
    writeFileSync(join(fixtureDir, "google-slides-oracle.json"), JSON.stringify(record, null, 2));
    results.push(record);
    normalizedResults.push({
      fixtureId: entry.id,
      expectedPass: expected === true,
      inputSha256: sha256Buffer(built.buffer),
      inputByteLength: built.buffer.length,
      passed,
      // Drive/Slides has no PowerPoint-style repair dialog. Import/export and
      // structural failures are represented in `failures`, not fabricated as
      // a repair-prompt observation.
      repairPromptDetected: false,
      structuralPassed: roundTripStructuralPassed,
      roundTripSha256: roundTripBytes ? sha256Buffer(roundTripBytes) : null,
      roundTripByteLength: roundTripBytes?.length ?? null,
      failures,
      inputSlideCount: inputInventory.slides,
      roundTripSlideCount,
    });
  }
  const evidence = createNormalizedOracleEvidence(
    "googleSlides",
    normalizedResults,
    normalizedResults.some((result) => result.roundTripSha256 !== null),
  );
  const summary = {
    artifactRoot,
    corpusDecks: results.filter((entry) => entry.expected).length,
    repairPrompts: null,
    failedPositiveFixtures: results.filter((entry) => entry.expected && !entry.passed).length,
    results,
  };
  writeFileSync(join(artifactRoot, "google-slides-evidence.json"), JSON.stringify(evidence, null, 2));
  writeFileSync(join(artifactRoot, "google-slides-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ evidence, summary }, null, 2));
  if (failed) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
