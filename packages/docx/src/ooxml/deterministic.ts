const DEFAULT_SEED = 'runstamp-docx-native-phase1';
const DEFAULT_TIMESTAMP = '2026-04-10T00:00:00.000Z';

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toHex(input: string, length: number): string {
  const hex = hashString(input).toString(16).toUpperCase();
  return hex.padStart(length, '0').slice(0, length);
}

export interface DeterministicContext {
  readonly seed: string;
  readonly fixedDate: Date;
  readonly documentId: string;
  readonly rsidRoot: string;
  randomHex(length: number): string;
  nextId(namespace: string): number;
  nextRelationshipId(): string;
  nextRsid(): string;
}

export function createDeterministicContext(seed = DEFAULT_SEED): DeterministicContext {
  const fixedDate = new Date(DEFAULT_TIMESTAMP);
  let rsidCounter = 0;
  const idCounters = new Map<string, number>();
  let randomCounter = 0;

  return {
    seed,
    fixedDate,
    documentId: toHex(`${seed}:document`, 8),
    rsidRoot: toHex(`${seed}:rsid-root`, 8),
    randomHex(length: number) {
      const minLength = Math.max(1, Math.ceil(length));
      const chunks: string[] = [];

      while (chunks.join('').length < minLength) {
        chunks.push(toHex(`${seed}:random:${randomCounter}`, 8));
        randomCounter += 1;
      }

      return chunks.join('').slice(0, minLength);
    },
    nextId(namespace: string) {
      const current = idCounters.get(namespace) ?? 0;
      const next = current + 1;
      idCounters.set(namespace, next);
      return next;
    },
    nextRelationshipId() {
      return `rId${this.nextId('relationship')}`;
    },
    nextRsid() {
      const value = toHex(`${seed}:rsid:${rsidCounter}`, 8);
      rsidCounter += 1;
      return value;
    },
  };
}
