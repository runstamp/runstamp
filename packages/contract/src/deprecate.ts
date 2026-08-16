/**
 * Runtime deprecation notices (OC-1 §9.5).
 *
 * §9.5 promises "a minimum of two minor versions with a runtime notice before
 * removal". A comment in a `.d.ts` is not a runtime notice: it reaches whoever
 * reads the source, not whoever runs the code, and the people who need warning
 * are precisely the ones who have not read it.
 *
 * Each notice fires **once per symbol per process**, on first use rather than on
 * import. Warning at import time would fire for anyone who merely pulls in the
 * package; warning per call would flood a loop. First-use is the point at which
 * the caller has actually depended on the thing being removed.
 */

const announced = new Set<string>();

function announce(name: string, replacement: string): void {
  if (announced.has(name)) return;
  announced.add(name);
  // Opt-out exists because a consumer mid-migration should be able to silence a
  // warning they have already acted on, without pinning an old version.
  if (globalThis.process?.env?.RUNSTAMP_SUPPRESS_DEPRECATION === "1") return;
  globalThis.console?.warn?.(
    `[runstamp] ${name} is deprecated and will be removed at the next major. ${replacement}`,
  );
}

/**
 * Wrap a value so its first use warns.
 *
 * Functions are wrapped; objects and arrays are proxied so a property read
 * counts as use. A primitive cannot be intercepted, so it is returned unchanged
 * — the `.d.ts` `@deprecated` tag is the only signal available for those.
 */
export function deprecate<T>(name: string, replacement: string, value: T): T {
  if (typeof value === "function") {
    const fn = value as unknown as (...args: unknown[]) => unknown;
    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      announce(name, replacement);
      return Reflect.apply(fn, this, args);
    };
    // Keep the shape a caller may reflect over: name, arity, and any statics.
    Object.defineProperty(wrapped, "name", { value: fn.name, configurable: true });
    Object.defineProperty(wrapped, "length", { value: fn.length, configurable: true });
    Object.assign(wrapped, fn);
    return wrapped as unknown as T;
  }

  if (typeof value === "object" && value !== null) {
    return new Proxy(value as unknown as object, {
      get(target, property, receiver) {
        announce(name, replacement);
        return Reflect.get(target, property, receiver);
      },
    }) as unknown as T;
  }

  return value;
}

/** Reset the announced set. Intended for tests. */
export function resetDeprecationNotices(): void {
  announced.clear();
}
