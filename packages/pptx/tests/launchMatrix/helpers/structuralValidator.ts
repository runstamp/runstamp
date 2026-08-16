/**
 * Launch-matrix structural validator adapter.
 *
 * The runtime validator in src/quality/structuralValidation.ts is the
 * authoritative implementation. This helper preserves the historical
 * launch-matrix report shape so older tests and scripts can keep asking for
 * named check groups without carrying a second validation engine.
 */

import {
  validatePptxStructure,
} from "../../../src/quality/structuralValidation.js";
import type {
  StructuralValidationCheck,
  StructuralValidationSummary,
} from "../../../src/quality/report.js";

export interface StructuralCheckResult {
  name: string;
  passed: boolean;
  errors: string[];
}

export interface StructuralReport {
  checks: StructuralCheckResult[];
  passed: boolean;
  critical: StructuralCheckResult[];
  runtime: StructuralValidationSummary;
}

type GroupMatcher = (check: StructuralValidationCheck) => boolean;

const GROUPS: Array<{ name: string; match: GroupMatcher }> = [
  {
    name: "duplicateContentTypes",
    match: (check) => check.id.startsWith("content-types.default.")
      || check.id.startsWith("content-types.override."),
  },
  {
    name: "contentTypesCoverage",
    match: (check) => check.id.startsWith("package.content-type."),
  },
  {
    name: "relationshipTargetExistence",
    match: (check) => check.id.endsWith(".target") || /\.ref\./.test(check.id),
  },
  {
    name: "duplicateRelationshipIds",
    match: (check) => /\.rid\./.test(check.id),
  },
  {
    name: "duplicateShapeIds",
    match: (check) => /\.shape-id\./.test(check.id),
  },
  {
    name: "reachableRelationshipParts",
    match: (check) => check.id.startsWith("package.reachable."),
  },
  {
    name: "chartManualLayoutBounds",
    match: (check) => /\.manual-layout\./.test(check.id),
  },
  {
    name: "presentationElementOrder",
    match: (check) => check.id.startsWith("presentation.order."),
  },
  {
    name: "requiredAttributes",
    match: (check) => /\.required-attribute\./.test(check.id),
  },
  {
    name: "themeSchema",
    match: (check) => check.id.startsWith("theme."),
  },
  {
    name: "slideLayoutMasterChain",
    match: (check) => /\.layout-chain\./.test(check.id),
  },
  {
    name: "namespaceConsistency",
    match: (check) => check.id.startsWith("namespace."),
  },
];

function aggregateGroup(
  name: string,
  checks: StructuralValidationCheck[],
  match: GroupMatcher,
): StructuralCheckResult {
  const matched = checks.filter(match);
  const failures = matched.filter((check) => !check.passed && check.severity === "error");
  return {
    name,
    passed: failures.length === 0,
    errors: failures.map((check) => check.message),
  };
}

export async function validateStructure(buffer: Buffer): Promise<StructuralReport> {
  const runtime = await validatePptxStructure(buffer);
  const checks = GROUPS.map((group) => aggregateGroup(group.name, runtime.checks, group.match));
  const groupedFailures = new Set(
    GROUPS.flatMap((group) => runtime.checks.filter((check) => group.match(check)).map((check) => check.id)),
  );
  const ungroupedFailures = runtime.checks
    .filter((check) => !check.passed && check.severity === "error" && !groupedFailures.has(check.id));

  if (ungroupedFailures.length > 0) {
    checks.push({
      name: "runtimeStructuralValidation",
      passed: false,
      errors: ungroupedFailures.map((check) => check.message),
    });
  }

  const critical = checks.filter((check) => !check.passed);
  return {
    checks,
    passed: runtime.status === "passed" && critical.length === 0,
    critical,
    runtime,
  };
}
