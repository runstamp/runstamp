import type { OperationDescriptor } from "../registry.js";
import type { OperationName } from "../types.js";
import type { ConformanceFixture } from "./types.js";

export type ConformanceFixtureSeed = Omit<ConformanceFixture, "operation" | "kind"> &
  Partial<Pick<ConformanceFixture, "operation" | "kind">>;

const KINDS = ["nominal", "hostile", "boundary"] as const;

function descriptorsFrom(module: Record<string, unknown>): readonly OperationDescriptor[] {
  const candidate = module.default ?? Object.values(module).find(Array.isArray);
  if (!Array.isArray(candidate)) throw new Error("Descriptor module does not export an operation descriptor array.");
  return candidate as readonly OperationDescriptor[];
}

function matches(descriptor: OperationDescriptor, fixture: ConformanceFixtureSeed): boolean {
  if (descriptor.verb !== fixture.verb) return false;
  if (!descriptor.qualifier) return true;
  return fixture.options?.[descriptor.qualifier.option] === descriptor.qualifier.value;
}

function qualifierOptions(descriptor: OperationDescriptor): ConformanceFixture["options"] {
  return descriptor.qualifier ? { [descriptor.qualifier.option]: descriptor.qualifier.value } : undefined;
}

/**
 * Complete the initial-GA operation corpus without weakening its executable
 * nature. Existing package-specific cases remain the nominal/loss evidence;
 * missing hostile and lower-boundary cases are real calls using a malformed
 * object and `null`, respectively. Both must return a typed failure.
 */
export async function completeFixtureCoverage(
  descriptorModule: string,
  seeds: readonly ConformanceFixtureSeed[],
): Promise<readonly ConformanceFixture[]> {
  const descriptors = descriptorsFrom((await import(descriptorModule)) as Record<string, unknown>);
  const result: ConformanceFixture[] = [];
  const kinds = new Map<OperationName, Set<ConformanceFixture["kind"]>>();

  for (const seed of seeds) {
    const candidates = descriptors.filter((descriptor) => matches(descriptor, seed));
    const claimed = seed.operation
      ? descriptors.find((descriptor) => descriptor.name === seed.operation)
      : undefined;
    const descriptor = claimed ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!descriptor || candidates.length !== 1 || candidates[0]?.name !== descriptor.name) {
      throw new Error(
        `Fixture ${seed.name} must resolve to exactly one descriptor; resolved ${candidates.map((item) => item.name).join(", ") || "none"}.`,
      );
    }
    const seen = kinds.get(descriptor.name) ?? new Set<ConformanceFixture["kind"]>();
    const kind = seed.kind ?? (seed.expect === "fail" ? "hostile" : seen.has("nominal") ? "boundary" : "nominal");
    seen.add(kind);
    kinds.set(descriptor.name, seen);
    result.push({ ...seed, operation: descriptor.name, kind } as ConformanceFixture);
  }

  const missingNominal = descriptors.filter((descriptor) => !kinds.get(descriptor.name)?.has("nominal"));
  if (missingNominal.length) {
    throw new Error(`Missing nominal fixtures for: ${missingNominal.map((item) => item.name).join(", ")}`);
  }

  for (const descriptor of descriptors) {
    const seen = kinds.get(descriptor.name) ?? new Set<ConformanceFixture["kind"]>();
    for (const kind of KINDS) {
      if (seen.has(kind)) continue;
      if (kind === "nominal") continue;
      const options = qualifierOptions(descriptor);
      result.push({
        name: `${descriptor.name}-${kind}`,
        operation: descriptor.name,
        kind,
        verb: descriptor.verb,
        input: kind === "boundary" ? null : { __runstampHostileFixture: true },
        ...(options ? { options } : {}),
        expect: "fail",
      });
    }
  }

  return result;
}
