import { create as createJsonDiffPatch } from "jsondiffpatch";

export * from "./semantic.js";
export * from "./extension.js";
export * from "./adapters.js";

export type ChangeKind = "added" | "removed" | "modified" | "moved";
export type ChangeSeverity = "major" | "minor" | "cosmetic";
export type DiffPathSegment = string | number;

export interface Change {
  type: ChangeKind;
  path: string;
  description: string;
  before?: unknown;
  after?: unknown;
  severity: ChangeSeverity;
}

export interface DiffStatistics {
  added: number;
  removed: number;
  modified: number;
  moved: number;
}

export interface ChangeSet {
  changes: Change[];
  summary: string;
  statistics: DiffStatistics;
}

export interface DiffOptions {
  includeSummary?: boolean;
}

export interface DiffInterpretContext<TNormalized = unknown> {
  type: ChangeKind;
  path: DiffPathSegment[];
  pathString: string;
  fromPath?: DiffPathSegment[];
  fromPathString?: string;
  before?: unknown;
  after?: unknown;
  normalizedBefore: TNormalized;
  normalizedAfter: TNormalized;
}

export interface DiffInterpretResult {
  description?: string;
  severity?: ChangeSeverity;
  summaryLabel?: string;
}

export interface DiffPlugin<TNormalized = unknown> {
  normalize(document: unknown): TNormalized;
  interpretChange?(context: DiffInterpretContext<TNormalized>): DiffInterpretResult | null;
  shouldSuppress?(context: DiffInterpretContext<TNormalized>): boolean;
}

interface RawDiffChange {
  type: ChangeKind;
  path: DiffPathSegment[];
  fromPath?: DiffPathSegment[];
}

interface AnnotatedNode {
  __diffKey?: string;
}

const INTERNAL_FIELD_PREFIX = "__diff";

function compareJsonDiffKeys(left: string, right: string): number {
  const normalize = (value: string): [number, string] => {
    if (value.startsWith("_")) {
      return [1, value.slice(1)];
    }
    return [0, value];
  };

  const [leftPrefix, leftValue] = normalize(left);
  const [rightPrefix, rightValue] = normalize(right);
  if (leftPrefix !== rightPrefix) {
    return leftPrefix - rightPrefix;
  }

  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function classifyArrayDelta(delta: unknown[]): ChangeKind {
  if (delta.length === 1) {
    return "added";
  }
  if (delta.length >= 3 && delta[1] === 0 && delta[2] === 0) {
    return "removed";
  }
  if (delta.length >= 3 && delta[2] === 3) {
    return "moved";
  }
  return "modified";
}

function flattenDelta(delta: unknown, path: DiffPathSegment[] = []): RawDiffChange[] {
  if (!delta || typeof delta !== "object") {
    return [];
  }

  if (Array.isArray(delta)) {
    return [{ type: classifyArrayDelta(delta), path }];
  }

  const deltaRecord = delta as Record<string, unknown>;
  if (deltaRecord._t === "a") {
    const changes: RawDiffChange[] = [];
    for (const key of Object.keys(deltaRecord).filter((candidate) => candidate !== "_t").sort(compareJsonDiffKeys)) {
      const child = deltaRecord[key];
      if (key.startsWith("_")) {
        const oldIndex = Number(key.slice(1));
        if (Array.isArray(child)) {
          const childKind = classifyArrayDelta(child);
          if (childKind === "moved") {
            changes.push({
              type: "moved",
              path: [...path, Number(child[1])],
              fromPath: [...path, oldIndex],
            });
          } else if (childKind === "removed") {
            changes.push({
              type: "removed",
              path: [...path, oldIndex],
            });
          } else {
            changes.push({
              type: childKind,
              path: [...path, oldIndex],
            });
          }
          continue;
        }

        changes.push(...flattenDelta(child, [...path, oldIndex]));
        continue;
      }

      const newIndex = Number(key);
      if (Array.isArray(child) && classifyArrayDelta(child) === "added") {
        changes.push({
          type: "added",
          path: [...path, newIndex],
        });
        continue;
      }

      changes.push(...flattenDelta(child, [...path, newIndex]));
    }
    return changes;
  }

  const changes: RawDiffChange[] = [];
  for (const key of Object.keys(deltaRecord).sort()) {
    const child = deltaRecord[key];
    if (Array.isArray(child)) {
      changes.push({
        type: classifyArrayDelta(child),
        path: [...path, key],
      });
      continue;
    }

    changes.push(...flattenDelta(child, [...path, key]));
  }

  return changes;
}

function getValueAtPath(value: unknown, path: DiffPathSegment[]): unknown {
  let current = value;
  for (const segment of path) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
      continue;
    }

    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function formatPath(path: DiffPathSegment[]): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }

    if (result.length === 0) {
      return segment;
    }

    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      return `${result}.${segment}`;
    }

    return `${result}[${JSON.stringify(segment)}]`;
  }, "");
}

function defaultDescription(type: ChangeKind, pathString: string): string {
  if (type === "added") {
    return `${pathString} added`;
  }
  if (type === "removed") {
    return `${pathString} removed`;
  }
  if (type === "moved") {
    return `${pathString} moved`;
  }
  return `${pathString} modified`;
}

function defaultSeverity(type: ChangeKind): ChangeSeverity {
  if (type === "modified") {
    return "minor";
  }
  return "major";
}

function createEmptyStatistics(): DiffStatistics {
  return {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0,
  };
}

function buildStatistics(changes: Change[]): DiffStatistics {
  const statistics = createEmptyStatistics();
  for (const change of changes) {
    statistics[change.type] += 1;
  }
  return statistics;
}

function buildSummary(changes: Change[], summaryLabels: string[], options?: DiffOptions): string {
  if (options?.includeSummary === false) {
    return "";
  }

  if (changes.length === 0) {
    return "No changes";
  }

  const grouped = new Map<string, number>();
  for (const label of summaryLabels) {
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }

  const fragments = [...grouped.entries()].map(([label, count]) => `${count} ${label}`);
  const noun = changes.length === 1 ? "change" : "changes";
  return `${changes.length} ${noun}: ${fragments.join(", ")}`;
}

function shouldSuppressInternalPath(path: DiffPathSegment[], fromPath?: DiffPathSegment[]): boolean {
  const includesInternalField = (segments: DiffPathSegment[] | undefined): boolean => (
    Boolean(segments?.some((segment) => typeof segment === "string" && segment.startsWith(INTERNAL_FIELD_PREFIX)))
  );
  return includesInternalField(path) || includesInternalField(fromPath);
}

function defaultSummaryLabel(type: ChangeKind): string {
  if (type === "added") {
    return "item added";
  }
  if (type === "removed") {
    return "item removed";
  }
  if (type === "moved") {
    return "item moved";
  }
  return "item modified";
}

function defaultObjectHash(value: unknown, index?: number): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as AnnotatedNode).__diffKey ?? (typeof index === "number" ? `__index:${index}` : undefined);
}

export function diffDocuments<TNormalized = unknown>(
  before: unknown,
  after: unknown,
  plugin: DiffPlugin<TNormalized>,
  options?: DiffOptions,
): ChangeSet {
  const normalizedBefore = plugin.normalize(before);
  const normalizedAfter = plugin.normalize(after);
  const diffPatch = createJsonDiffPatch({
    objectHash: defaultObjectHash,
    arrays: {
      detectMove: true,
      includeValueOnMove: false,
    },
  });

  const delta = diffPatch.diff(normalizedBefore, normalizedAfter);
  if (!delta) {
    return {
      changes: [],
      summary: options?.includeSummary === false ? "" : "No changes",
      statistics: createEmptyStatistics(),
    };
  }

  const rawChanges = flattenDelta(delta);
  const changes: Change[] = [];
  const summaryLabels: string[] = [];

  for (const rawChange of rawChanges) {
    const pathString = formatPath(rawChange.path);
    const fromPathString = rawChange.fromPath ? formatPath(rawChange.fromPath) : undefined;
    const context: DiffInterpretContext<TNormalized> = {
      type: rawChange.type,
      path: rawChange.path,
      pathString,
      fromPath: rawChange.fromPath,
      fromPathString,
      before: rawChange.fromPath
        ? getValueAtPath(normalizedBefore, rawChange.fromPath)
        : getValueAtPath(normalizedBefore, rawChange.path),
      after: getValueAtPath(normalizedAfter, rawChange.path),
      normalizedBefore,
      normalizedAfter,
    };

    if (shouldSuppressInternalPath(rawChange.path, rawChange.fromPath) || plugin.shouldSuppress?.(context)) {
      continue;
    }

    const interpreted = plugin.interpretChange?.(context);
    if (interpreted === null) {
      continue;
    }

    changes.push({
      type: rawChange.type,
      path: pathString,
      description: interpreted?.description ?? defaultDescription(rawChange.type, pathString),
      before: context.before,
      after: context.after,
      severity: interpreted?.severity ?? defaultSeverity(rawChange.type),
    });
    summaryLabels.push(interpreted?.summaryLabel ?? defaultSummaryLabel(rawChange.type));
  }

  const statistics = buildStatistics(changes);
  return {
    changes,
    summary: buildSummary(changes, summaryLabels, options),
    statistics,
  };
}

export function createDiffKey(...parts: Array<string | number | undefined | null>): string {
  return parts.filter((part) => part !== undefined && part !== null && part !== "").join(":");
}

export function isInternalDiffField(segment: DiffPathSegment): boolean {
  return typeof segment === "string" && segment.startsWith(INTERNAL_FIELD_PREFIX);
}
