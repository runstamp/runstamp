export type LazyModuleImporter<TModule> = () => Promise<TModule>;

/**
 * Memoizes a dynamic import for optional/heavy engine modules.
 *
 * Failed imports clear the cache so a transient loader problem does not pin a
 * rejected promise for the lifetime of a server process.
 */
export function createLazyModuleLoader<TModule>(
  importModule: LazyModuleImporter<TModule>,
): LazyModuleImporter<TModule> {
  let modulePromise: Promise<TModule> | undefined;

  return () => {
    if (!modulePromise) {
      modulePromise = importModule().catch((error: unknown) => {
        modulePromise = undefined;
        throw error;
      });
    }

    return modulePromise;
  };
}
