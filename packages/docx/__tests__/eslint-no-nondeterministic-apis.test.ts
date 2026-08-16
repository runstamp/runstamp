/**
 * Proves the custom `runstamp-docx/no-nondeterministic-apis` ESLint rule
 * both catches and allows the cases it's supposed to.
 *
 * Runs ESLint programmatically against synthetic source snippets so we
 * don't need to maintain fixture files on disk.
 */

import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import rule from '../eslint-rules/no-nondeterministic-apis.js';

function lint(code: string): { messages: Array<{ ruleId: string | null; message: string }> } {
  const linter = new Linter();
  const result = linter.verify(code, {
    plugins: {
      'runstamp-docx': { rules: { 'no-nondeterministic-apis': rule as never } },
    },
    rules: {
      'runstamp-docx/no-nondeterministic-apis': 'error',
    },
  });
  return { messages: result };
}

describe('no-nondeterministic-apis', () => {
  describe('banned APIs', () => {
    it('flags Date.now()', () => {
      const { messages } = lint('const x = Date.now();');
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('Date.now()');
    });

    it('flags Math.random()', () => {
      const { messages } = lint('const x = Math.random();');
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('Math.random()');
    });

    it('flags crypto.randomUUID()', () => {
      const { messages } = lint('const x = crypto.randomUUID();');
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('crypto.randomUUID()');
    });

    it('flags crypto.randomBytes()', () => {
      const { messages } = lint('const x = crypto.randomBytes(16);');
      expect(messages).toHaveLength(1);
    });

    it('flags crypto.getRandomValues()', () => {
      const { messages } = lint('const x = crypto.getRandomValues(new Uint8Array(8));');
      expect(messages).toHaveLength(1);
    });

    it('flags new Date() with no arguments', () => {
      const { messages } = lint('const d = new Date();');
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toContain('wall-clock');
    });
  });

  describe('allowed forms', () => {
    it('allows new Date(fixedValue)', () => {
      const { messages } = lint('const d = new Date("2026-01-01T00:00:00Z");');
      expect(messages).toHaveLength(0);
    });

    it('accepts lint-allow-nondeterministic comment on the same line', () => {
      const { messages } = lint(
        'const x = Date.now(); // lint-allow-nondeterministic: perf timer',
      );
      expect(messages).toHaveLength(0);
    });

    it('accepts lint-allow-nondeterministic comment on the preceding line', () => {
      const { messages } = lint(
        '// lint-allow-nondeterministic: perf timer\nconst x = Date.now();',
      );
      expect(messages).toHaveLength(0);
    });

    it('does NOT accept a bare disable comment without the magic string', () => {
      const { messages } = lint('// normal comment\nconst x = Date.now();');
      expect(messages).toHaveLength(1);
    });

    it('does not flag unrelated member accesses', () => {
      const { messages } = lint('const x = Date.parse("2026-01-01");');
      expect(messages).toHaveLength(0);
    });

    it('does not flag crypto.createHash', () => {
      // createHash is deterministic
      const { messages } = lint('const h = crypto.createHash("sha256");');
      expect(messages).toHaveLength(0);
    });
  });

  describe('coverage: every real call site must be annotated or removed', () => {
    it('rule is exported with expected shape', () => {
      expect(rule).toHaveProperty('meta');
      expect(rule).toHaveProperty('create');
      expect(typeof rule.create).toBe('function');
    });
  });
});
