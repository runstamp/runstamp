function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, stableNormalize(entry)]));
  }

  return value;
}

export function stableStringify<T>(value: T): string {
  return JSON.stringify(stableNormalize(value));
}

export type ComponentKeyFn<T> = (value: T) => string;

export class ComponentRegistry<T> {
  private readonly entries: T[] = [];
  private readonly keyMap = new Map<string, number>();
  private readonly refMap = new WeakMap<object, number>();

  constructor(
    seedEntries: T[] = [],
    private readonly keyFn: ComponentKeyFn<T> = stableStringify,
  ) {
    for (const entry of seedEntries) {
      this.register(entry);
    }
  }

  register(entry: T): number {
    if (entry && typeof entry === "object") {
      const cached = this.refMap.get(entry as object);
      if (cached !== undefined) {
        return cached;
      }
    }

    const key = this.keyFn(entry);
    const existing = this.keyMap.get(key);
    if (existing !== undefined) {
      if (entry && typeof entry === "object") {
        this.refMap.set(entry as object, existing);
      }
      return existing;
    }
    const index = this.entries.length;
    this.entries.push(entry);
    this.keyMap.set(key, index);
    if (entry && typeof entry === "object") {
      this.refMap.set(entry as object, index);
    }
    return index;
  }

  get size(): number {
    return this.entries.length;
  }

  get values(): readonly T[] {
    return this.entries;
  }
}
