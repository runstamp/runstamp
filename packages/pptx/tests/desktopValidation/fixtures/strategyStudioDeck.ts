import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function strategyStudioDeck() {
  const fixtureDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(fixtureDir, "../../../../../");
  const strategyDeckModulePath = resolve(repoRoot, "app", "app", "lib", "strategyDeck.ts");
  const mod = await import(pathToFileURL(strategyDeckModulePath).href);
  const deck = (mod as { strategyDeck?: unknown }).strategyDeck;
  if (!deck) {
    throw new Error("app/app/lib/strategyDeck.ts did not yield strategyDeck");
  }
  return deck;
}
