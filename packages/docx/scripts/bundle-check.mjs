#!/usr/bin/env node
/**
 * Bundle-size + pro-leak gate (Phase 0.4).
 *
 * Asserts:
 *   1. The free build (dist/index.js) exists and is under the declared
 *      size ceiling. Prevents silent bundle-size growth (e.g. a new dep
 *      accidentally bundled via noExternal). The plan default is 1.0 MB;
 *      any larger ceiling must be declared in the bundle budget manifest.
 *   2. Symbol count for known pro-only code paths stays below a ceiling.
 *      Prevents pro features silently leaking into the free bundle
 *      when tree-shake breaks.
 *
 * The ceilings are intentionally tight but not zero: the stable entry still
 * exposes typed quality, PDF bridge, and experimental/pro-gated surfaces.
 * Splitting those optional surfaces should let this return to the plan
 * default.
 *
 * Exit code is non-zero on failure; stdout reports counts either way.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");

const FREE_BUNDLE_PATH = resolve(pkgDir, "dist/index.js");

const PLAN_DEFAULT_FREE_BYTES = 1 * 1024 * 1024;
const BUDGET_MANIFEST_PATH = resolve(pkgDir, "fixtures/docx-engine/bundle-budget-manifest.json");

// Current count is ~70 because pro symbol names appear in tree-shake-preserved
// interface shapes and experimental/pro-gated public surface objects.
const MAX_PRO_SYMBOLS = 75;

// String patterns that should NOT appear inside the free bundle. Each
// represents a pro-only code path. The count is the number of textual
// occurrences — interface types pulled through types.ts still count as
// one occurrence per reference.
const PRO_SYMBOL_PATTERNS = [
  "validateIndiaGSTQR",
  "validateEUReverseCharge",
  "validateBrazilianDanfe",
  "compileTrackedChangesDocument",
  "normalizeTrackedChangesDocument",
  "SecurePDF",
  "buildNativeCommentXmlParts",
  "DesignTokenManager",
  "BaselineGridCalculator",
  "ShadowFilterGenerator",
];

function fail(msg) {
  console.error(`\n\x1b[31m[bundle-check] FAIL\x1b[0m  ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m[bundle-check] OK\x1b[0m    ${msg}`);
}

function loadBundleBudget() {
  if (!existsSync(BUDGET_MANIFEST_PATH)) {
    return {
      maxFreeBytes: PLAN_DEFAULT_FREE_BYTES,
      source: "plan-default",
      rationale: "No manifest present; enforce the upgrade plan's 1.0 MB default.",
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(BUDGET_MANIFEST_PATH, "utf8"));
  } catch (error) {
    fail(
      `bundle budget manifest is not valid JSON at ${BUDGET_MANIFEST_PATH}: ` +
      `${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!manifest || typeof manifest !== "object") {
    fail(`bundle budget manifest must be a JSON object at ${BUDGET_MANIFEST_PATH}`);
  }
  if (!Number.isInteger(manifest.maxFreeBytes) || manifest.maxFreeBytes < PLAN_DEFAULT_FREE_BYTES) {
    fail("bundle budget manifest must declare integer maxFreeBytes >= 1.0 MB");
  }
  if (manifest.maxFreeBytes > PLAN_DEFAULT_FREE_BYTES) {
    for (const key of ["status", "rationale", "removalTrigger"]) {
      if (typeof manifest[key] !== "string" || manifest[key].trim().length === 0) {
        fail(`bundle budget manifest must include non-empty ${key} for budgets above 1.0 MB`);
      }
    }
  }

  return {
    maxFreeBytes: manifest.maxFreeBytes,
    source: BUDGET_MANIFEST_PATH,
    rationale: manifest.rationale,
    removalTrigger: manifest.removalTrigger,
  };
}

if (!existsSync(FREE_BUNDLE_PATH)) {
  fail(
    `free bundle not found at ${FREE_BUNDLE_PATH}. ` +
    `Run \`pnpm build:free\` before bundle-check.`,
  );
}

const bundleBudget = loadBundleBudget();
const stat = statSync(FREE_BUNDLE_PATH);
if (stat.size > bundleBudget.maxFreeBytes) {
  fail(
    `free bundle is ${stat.size.toLocaleString()} bytes; ceiling is ${bundleBudget.maxFreeBytes.toLocaleString()} ` +
    `from ${bundleBudget.source}. Investigate recent changes to noExternal in scripts/build-free.mjs or new imports in src/index.ts.`,
  );
}
ok(
  `free bundle size: ${stat.size.toLocaleString()} bytes (< ${bundleBudget.maxFreeBytes.toLocaleString()}) ` +
  `via ${bundleBudget.source}`,
);
if (bundleBudget.maxFreeBytes > PLAN_DEFAULT_FREE_BYTES) {
  ok(`temporary bundle-budget exception: ${bundleBudget.rationale}`);
}

const contents = readFileSync(FREE_BUNDLE_PATH, "utf8");
let totalProSymbols = 0;
const breakdown = [];
for (const pattern of PRO_SYMBOL_PATTERNS) {
  const count = contents.split(pattern).length - 1;
  totalProSymbols += count;
  if (count > 0) {
    breakdown.push(`${pattern}=${count}`);
  }
}

if (totalProSymbols > MAX_PRO_SYMBOLS) {
  fail(
    `free bundle references ${totalProSymbols} pro-only symbol occurrences; ceiling is ${MAX_PRO_SYMBOLS}. ` +
    `Breakdown: ${breakdown.join(", ")}. ` +
    `Either tree-shake the new reference, or move the symbol behind a dynamic import.`,
  );
}
ok(
  `pro-symbol occurrences: ${totalProSymbols} (< ${MAX_PRO_SYMBOLS})` +
  (breakdown.length > 0 ? ` — ${breakdown.join(", ")}` : ""),
);

console.log(`\n\x1b[32m[bundle-check] PASS\x1b[0m`);
